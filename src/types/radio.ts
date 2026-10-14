// 보이는 라디오 (오피스 라디오) Types
// 팀원 radio-server/app/schemas/radio.py 의 대본 형식을 그대로 따른다.

export type RadioSpeaker = 'senior' | 'junior'; // senior = 선배 DJ 하루, junior = 신입 DJ 새봄
export type RadioSegment = 'opening' | 'story' | 'talk' | 'tip' | 'practice' | 'closing';

/** AI가 써 준 대본 한 줄 */
export interface RadioScriptLine {
  speaker: RadioSpeaker;
  segment: RadioSegment;
  line: string;
  caption?: string; // 화면 하단 자막
  basis?: string; // 근거 (tip 줄은 필수)
}

/** 음성까지 입힌 대본 한 줄 — 방송 음성 안에서의 start/duration(초)으로 말풍선·자막·DJ 강조를 맞춘다 */
export interface RadioEpisodeLine extends RadioScriptLine {
  start: number;
  duration: number;
}

export interface RadioEpisode {
  id: string;
  postId: string;
  postTitle: string;
  title: string;
  lines: RadioEpisodeLine[];
  practice_line: string;
  sources: string[];
  safety_flag: boolean;
  totalDuration: number;
  audioUrl: string | null; // 두 DJ 대화 전체 음성 (null이면 음성 없이 대사 길이로 계산한 시간에 맞춰 진행)
  hasAudio: boolean;
  alignMethod?: 'speaker' | 'length'; // 대사 시간을 찾은 방법 (speaker = 목소리 높낮이로 화자 구분)
  audioError?: string;
  createdAt: string;
}
