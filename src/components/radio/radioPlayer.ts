// 보이는 라디오 재생 엔진 (React 바깥)
// 두 DJ 대화 전체가 담긴 음성 하나를 재생하면서, 지금 몇 초인지 계속 알려 준다.
// 화면은 그 시간과 대사별 시작·끝 시간(episode.lines)을 비교해 말하는 DJ 강조·말풍선·자막을 대사 단위로 맞춘다.
// 음성이 없는 방송은 대사 길이로 계산한 가상 시계로 같은 방식으로 진행한다.

import { RadioEpisode, RadioEpisodeLine } from '@/types/radio';

export interface RadioPlayerCallbacks {
  onTime: (time: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onFinish: () => void;
  onReady?: () => void; // 음성을 다 내려받아 재생할 준비가 됐을 때
  onError?: (message: string) => void;
}

/** time(초)에 해당하는 대사 번호 */
export function lineIndexAt(lines: RadioEpisodeLine[], time: number): number {
  let idx = 0;
  for (let i = 0; i < lines.length; i++) if (lines[i].start <= time + 0.001) idx = i;
  return idx;
}

export class RadioPlayer {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private raf: number | null = null;
  private clockStart = 0;
  private time = 0;
  private playing = false;
  private disposed = false;
  // 목소리 크기 측정 (DJ 입 모양 애니메이션용)
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;
  ready: Promise<void>;

  constructor(private episode: RadioEpisode, private cb: RadioPlayerCallbacks) {
    this.ready = episode.audioUrl ? this.load(episode.audioUrl) : Promise.resolve();
    if (!episode.audioUrl) cb.onReady?.();
  }

  get isPlaying() {
    return this.playing;
  }

  /** 처음부터 또는 현재 위치부터 재생 */
  async play() {
    await this.ready;
    if (this.disposed) return;
    const t = this.time >= this.episode.totalDuration - 0.05 ? 0 : this.time;
    this.setPlaying(true);

    if (this.audio) {
      this.audio.currentTime = t;
      this.connectAnalyser();
      try {
        await this.audioCtx?.resume();
        await this.audio.play();
      } catch {
        this.setPlaying(false);
        return;
      }
    } else {
      this.clockStart = performance.now() - t * 1000;
    }
    this.emitTime(t);
    this.startLoop();
  }

  pause() {
    this.stopLoop();
    this.audio?.pause();
    this.setPlaying(false);
  }

  /** 원하는 시간(초)으로 이동. 재생 중이면 그 자리부터 이어서 재생 */
  seek(time: number) {
    const t = Math.max(0, Math.min(time, this.episode.totalDuration));
    if (this.audio) this.audio.currentTime = t;
    else this.clockStart = performance.now() - t * 1000;
    this.emitTime(t);
  }

  /** 특정 대사로 이동 */
  jumpToLine(i: number) {
    this.seek(this.episode.lines[i].start);
  }

  /** 지금 들리는 목소리 크기 (대략 0~0.3). 음성 없는 방송은 말하는 척 흉내 낸 값 */
  getLevel(): number {
    if (!this.playing) return 0;
    if (this.analyser && this.levelBuf) {
      this.analyser.getFloatTimeDomainData(this.levelBuf);
      let sum = 0;
      for (let i = 0; i < this.levelBuf.length; i++) sum += this.levelBuf[i] * this.levelBuf[i];
      return Math.sqrt(sum / this.levelBuf.length);
    }
    // 음성이 없으면 음절 박자(약 6Hz)로 입을 여닫는 흉내
    const t = this.time * 6;
    return 0.1 * Math.max(0, Math.sin(t * Math.PI) * (0.6 + 0.4 * Math.sin(t * 1.7)));
  }

  dispose() {
    this.disposed = true;
    this.stopLoop();
    if (this.audio) {
      this.audio.onended = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio = null;
    }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.analyser = null;
  }

  // ---- 내부 ----

  /** 재생 버튼을 누른 뒤(브라우저 자동재생 정책) 오디오 → 분석기 → 스피커로 연결 */
  private connectAnalyser() {
    if (this.audioCtx || !this.audio || typeof AudioContext === 'undefined') return;
    try {
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaElementSource(this.audio);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.levelBuf = new Float32Array(this.analyser.fftSize);
      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch {
      // 분석기를 못 만들어도 재생은 그대로 (입 모양만 흉내 모드)
      this.analyser = null;
    }
  }

  /** 음성을 통째로 내려받아 메모리에서 재생 → 어느 위치로든 바로 이동(seek) 가능 */
  private async load(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`음성을 불러오지 못했어요 (${res.status})`);
      const blob = await res.blob();
      if (this.disposed) return;
      this.objectUrl = URL.createObjectURL(blob);
      this.audio = new Audio(this.objectUrl);
      this.audio.preload = 'auto';
      this.audio.onended = () => this.finish();
      this.cb.onReady?.();
    } catch (e) {
      // 음성을 못 불러오면 가상 시계로 진행
      this.audio = null;
      this.cb.onError?.(e instanceof Error ? e.message : '음성을 불러오지 못했어요');
      this.cb.onReady?.();
    }
  }

  private startLoop() {
    this.stopLoop();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = () => {
    const t = this.audio ? this.audio.currentTime : (performance.now() - this.clockStart) / 1000;
    if (!this.audio && t >= this.episode.totalDuration) return this.finish();
    this.emitTime(t);
    this.raf = requestAnimationFrame(this.tick);
  };

  private finish() {
    this.stopLoop();
    this.audio?.pause();
    this.setPlaying(false);
    this.emitTime(this.episode.totalDuration);
    this.cb.onFinish();
  }

  private stopLoop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private emitTime(t: number) {
    this.time = t;
    this.cb.onTime(t);
  }

  private setPlaying(p: boolean) {
    if (this.playing === p) return;
    this.playing = p;
    this.cb.onPlayingChange(p);
  }
}
