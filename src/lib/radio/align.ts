// 대화 전체를 한 번에 녹음한 음성(WAV)에서 "대사별 시작·끝 시간"을 찾는다. (서버 전용)
//
// 1) 쉼 구간 찾기: 소리가 0.16초 이상 작아지는 곳 = 문장 또는 대사가 끝나는 후보
// 2) 화자 구분: 쉼과 쉼 사이 구간의 음높이(피치)를 재서 낮은 목소리(하루) / 높은 목소리(새봄)로 나눈다
//    → 화자가 바뀌는 지점 = 대사 경계 (가장 확실한 기준)
// 3) 같은 DJ가 연달아 말한 대사들은 글자 수 비율로 예상한 위치에서 가장 가까운 쉼으로 나눈다
// 화자 구분 결과가 대본과 맞지 않으면, 전체를 글자 수 비율 + 쉼 위치로 나누는 방식으로 대신한다.

import { RadioSpeaker } from '@/types/radio';

export interface LineTiming {
  start: number;
  duration: number;
}

interface Pcm {
  samples: Float32Array;
  sampleRate: number;
}

interface Gap {
  start: number; // 쉼이 시작되는 시간(초)
  end: number; // 쉼이 끝나는 시간(초)
}

const FRAME = 0.02; // 소리 크기 측정 단위(초)
const MIN_GAP = 0.16; // 이 이상 조용하면 쉼으로 본다

export function readWavPcm(wav: Buffer): Pcm {
  let offset = 12;
  let dataStart = 44;
  let dataSize = wav.length - 44;
  while (offset + 8 <= wav.length) {
    const id = wav.subarray(offset, offset + 4).toString('ascii');
    const size = wav.readUInt32LE(offset + 4);
    if (id === 'data') {
      dataStart = offset + 8;
      dataSize = Math.min(size, wav.length - dataStart);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  const sampleRate = wav.readUInt32LE(24);
  const n = dataSize >> 1;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = wav.readInt16LE(dataStart + 2 * i) / 32768;
  return { samples, sampleRate };
}

function findGaps({ samples, sampleRate }: Pcm): { gaps: Gap[]; speechStart: number; speechEnd: number } {
  const win = Math.round(sampleRate * FRAME);
  const rms: number[] = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let s = 0;
    for (let k = 0; k < win; k++) s += samples[i + k] * samples[i + k];
    rms.push(Math.sqrt(s / win));
  }
  const peak = Math.max(...rms, 1e-6);
  const loud = rms.map((v) => v >= peak * 0.04);
  const first = loud.indexOf(true);
  const last = loud.lastIndexOf(true);

  const gaps: Gap[] = [];
  let runStart = -1;
  for (let i = Math.max(first, 0); i <= last; i++) {
    if (!loud[i]) {
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      if ((i - runStart) * FRAME >= MIN_GAP) gaps.push({ start: runStart * FRAME, end: i * FRAME });
      runStart = -1;
    }
  }
  return { gaps, speechStart: Math.max(first, 0) * FRAME, speechEnd: (last + 1) * FRAME };
}

/** 구간의 대표 음높이(Hz). 목소리가 거의 없으면 0 */
function medianPitch({ samples, sampleRate }: Pcm, from: number, to: number): { pitch: number; voiced: number } {
  const F = Math.round(sampleRate * 0.04);
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.floor(sampleRate / 70);
  const pitches: number[] = [];
  for (let s = Math.floor(from * sampleRate); s + F <= Math.min(samples.length, to * sampleRate); s += F) {
    let e = 0;
    for (let k = 0; k < F; k++) e += samples[s + k] * samples[s + k];
    if (Math.sqrt(e / F) < 0.02) continue;
    let best = 0;
    let bestLag = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0;
      for (let k = 0; k + lag < F; k++) c += samples[s + k] * samples[s + k + lag];
      if (c > best) {
        best = c;
        bestLag = lag;
      }
    }
    if (bestLag && best / e > 0.3) pitches.push(sampleRate / bestLag);
  }
  if (!pitches.length) return { pitch: 0, voiced: 0 };
  pitches.sort((a, b) => a - b);
  return { pitch: pitches[pitches.length >> 1], voiced: pitches.length };
}

/** 글자 수 비율로 예상 위치를 잡고, 각 경계를 가장 가까운 쉼에 맞춘다 (순서 유지) */
function splitByLength(texts: string[], from: number, to: number, gaps: Gap[]): number[] {
  const weights = texts.map((t) => Math.max(1, t.replace(/\s/g, '').length));
  const total = weights.reduce((a, b) => a + b, 0);
  const inside = gaps.filter((g) => g.start > from && g.end < to);
  const bounds: number[] = [];
  let acc = 0;
  let minIdx = 0;
  for (let i = 0; i < texts.length - 1; i++) {
    acc += weights[i];
    const expected = from + ((to - from) * acc) / total;
    const remaining = texts.length - 2 - i; // 뒤에 남은 경계 수만큼 쉼을 남겨 둔다
    let best = -1;
    let bestScore = Infinity;
    for (let g = minIdx; g < inside.length - remaining; g++) {
      const mid = (inside[g].start + inside[g].end) / 2;
      // 가까울수록, 쉼이 길수록 대사 경계일 가능성이 높다
      const score = Math.abs(mid - expected) - (inside[g].end - inside[g].start) * 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = g;
      }
    }
    if (best >= 0) {
      bounds.push((inside[best].start + inside[best].end) / 2);
      minIdx = best + 1;
    } else {
      bounds.push(expected);
    }
  }
  return bounds;
}

/**
 * 대본(화자·대사 목록)과 녹음 음성으로 대사별 시간을 계산한다.
 * seniorIsLower: 선배 DJ 목소리가 신입 DJ보다 낮은지 (기본 음성 Charon/Leda 기준 true)
 */
export function alignLines(
  wav: Buffer,
  lines: { speaker: RadioSpeaker; line: string }[],
  seniorIsLower = true
): { timings: LineTiming[]; total: number; method: 'speaker' | 'length' } {
  const pcm = readWavPcm(wav);
  const total = pcm.samples.length / pcm.sampleRate;
  const { gaps, speechStart, speechEnd } = findGaps(pcm);

  // 경계(대사 i와 i+1 사이 시간)들 → 시작·길이로 변환
  const toTimings = (bounds: number[]): LineTiming[] => {
    const edges = [0, ...bounds, total];
    return lines.map((_, i) => ({ start: edges[i], duration: Math.max(0.3, edges[i + 1] - edges[i]) }));
  };

  // 대본의 화자 차례(같은 화자 연속 대사 묶음)
  const turns: { speaker: RadioSpeaker; from: number; to: number }[] = [];
  lines.forEach((l, i) => {
    const last = turns[turns.length - 1];
    if (last && last.speaker === l.speaker) last.to = i;
    else turns.push({ speaker: l.speaker, from: i, to: i });
  });

  // 쉼 사이 구간마다 화자 판별
  const edges = [speechStart, ...gaps.flatMap((g) => [g.start, g.end]), speechEnd];
  const chunks: { from: number; to: number; pitch: number; voiced: number }[] = [];
  for (let i = 0; i < edges.length; i += 2) {
    const { pitch, voiced } = medianPitch(pcm, edges[i], edges[i + 1]);
    chunks.push({ from: edges[i], to: edges[i + 1], pitch, voiced });
  }
  const voicedPitches = chunks.filter((c) => c.voiced >= 5).map((c) => c.pitch);

  if (turns.length > 1 && voicedPitches.length >= 2) {
    // 두 목소리의 기준 음높이를 2-평균 군집으로 구한다
    let lo = Math.min(...voicedPitches);
    let hi = Math.max(...voicedPitches);
    for (let iter = 0; iter < 10; iter++) {
      const mid = (lo + hi) / 2;
      const a = voicedPitches.filter((p) => p < mid);
      const b = voicedPitches.filter((p) => p >= mid);
      if (!a.length || !b.length) break;
      lo = a.reduce((s, p) => s + p, 0) / a.length;
      hi = b.reduce((s, p) => s + p, 0) / b.length;
    }
    const threshold = (lo + hi) / 2;

    if (hi - lo > 40 && chunks.length >= turns.length) {
      // 구간마다 "높은 목소리일수록 +, 낮은 목소리일수록 -" 점수 (목소리가 많은 구간일수록 비중 큼)
      const highScore = chunks.map((c) =>
        c.voiced < 3 ? 0 : Math.min(c.voiced, 40) * Math.max(-1, Math.min(1, ((c.pitch - threshold) / (hi - lo)) * 2))
      );
      const isHigh = (sp: RadioSpeaker) => (seniorIsLower ? sp === 'junior' : sp === 'senior');

      // 글자 수 비율로 본 각 차례의 예상 길이(초)
      const charsOf = (t: (typeof turns)[number]) =>
        lines.slice(t.from, t.to + 1).reduce((s, l) => s + Math.max(1, l.line.replace(/\s/g, '').length), 0);
      const totalChars = turns.reduce((s, t) => s + charsOf(t), 0);
      const expectedLen = turns.map((t) => ((speechEnd - speechStart) * charsOf(t)) / totalChars);

      // 동적 계획법: 구간들을 대본의 화자 차례 수만큼 연속으로 나눠, 화자 점수 합이 가장 큰 나눔을 고른다.
      // 음높이를 한두 구간 잘못 읽어도(인사말의 높은 억양 등) 전체 흐름으로 바로잡힌다.
      const n = chunks.length;
      const K = turns.length;
      const LENGTH_WEIGHT = 3; // 예상 길이에서 1초 벗어날 때마다 감점
      const dp: number[][] = Array.from({ length: K + 1 }, () => new Array(n + 1).fill(-Infinity));
      const back: number[][] = Array.from({ length: K + 1 }, () => new Array(n + 1).fill(-1));
      dp[0][0] = 0;
      for (let k = 1; k <= K; k++) {
        const sign = isHigh(turns[k - 1].speaker) ? 1 : -1;
        for (let j = k; j <= n - (K - k); j++) {
          let seg = 0;
          for (let i = j - 1; i >= k - 1; i--) {
            seg += sign * highScore[i];
            if (dp[k - 1][i] === -Infinity) continue;
            const len = chunks[j - 1].to - chunks[i].from;
            const score = dp[k - 1][i] + seg - LENGTH_WEIGHT * Math.abs(len - expectedLen[k - 1]);
            if (score > dp[k][j]) {
              dp[k][j] = score;
              back[k][j] = i;
            }
          }
        }
      }

      if (dp[K][n] > -Infinity) {
        // 역추적 → 차례별 시작/끝 구간 번호
        const starts: number[] = new Array(K);
        for (let k = K, j = n; k > 0; k--) {
          starts[k - 1] = back[k][j];
          j = back[k][j];
        }
        const bounds: number[] = [];
        turns.forEach((turn, ti) => {
          const firstChunk = chunks[starts[ti]];
          const lastChunk = chunks[(ti < K - 1 ? starts[ti + 1] : n) - 1];
          const texts = lines.slice(turn.from, turn.to + 1).map((l) => l.line);
          // 같은 화자의 연속 대사는 그 차례 안에서 나눈다
          bounds.push(...splitByLength(texts, firstChunk.from, lastChunk.to, gaps));
          // 화자가 바뀌는 경계 = 두 차례 사이 쉼의 가운데
          if (ti < K - 1) bounds.push((lastChunk.to + chunks[starts[ti + 1]].from) / 2);
        });
        return { timings: toTimings(bounds), total, method: 'speaker' };
      }
    }
  }

  // 대신: 전체를 글자 수 비율 + 쉼 위치로 나누기
  return {
    timings: toTimings(splitByLength(lines.map((l) => l.line), speechStart, speechEnd, gaps)),
    total,
    method: 'length',
  };
}
