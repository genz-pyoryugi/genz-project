// Gemini API 연결 (서버 전용) — 대본 작성 + 대사 한 줄씩 음성 합성
// API 키는 .env.local 의 GEMINI_API_KEY 에서 읽는다. (Google AI Studio에서 발급)

import { RadioScriptLine, RadioSegment, RadioSpeaker } from '@/types/radio';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// 앞 모델이 붐비거나(503) 사용량을 넘으면(429) 다음 모델로 자동 전환한다.
// .env.local 에서 쉼표로 바꿀 수 있다. 예) GEMINI_SCRIPT_MODELS=gemini-3.8-flash,gemini-3.6-flash
const modelList = (env: string | undefined, fallback: string[]) =>
  env ? env.split(',').map((m) => m.trim()).filter(Boolean) : fallback;

const SCRIPT_MODELS = modelList(process.env.GEMINI_SCRIPT_MODELS, [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
]);
const TTS_MODELS = modelList(process.env.GEMINI_TTS_MODELS, [
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.1-flash-tts-preview', // 이전 세대(미리보기) — 위 모델들의 무료 하루 한도(모델별 10회)를 다 썼을 때 대신 사용
]);

// 두 DJ의 목소리 (Gemini 기본 음성 이름). .env.local 에서 바꿀 수 있다.
export const DJ_VOICES: Record<RadioSpeaker, string> = {
  senior: process.env.GEMINI_VOICE_SENIOR || 'Charon', // 선배 DJ 하루: 차분하고 정보 전달형
  junior: process.env.GEMINI_VOICE_JUNIOR || 'Leda', // 신입 DJ 새봄: 밝고 젊은 톤
};

export type GeminiErrorCode = 'NO_API_KEY' | 'BUSY' | 'API_ERROR' | 'BAD_RESPONSE';

export class GeminiError extends Error {
  constructor(message: string, public status: number, public code: GeminiErrorCode = 'API_ERROR') {
    super(message);
  }
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError(
      'GEMINI_API_KEY가 설정되지 않았어요. .env.local 파일에 Google AI Studio에서 발급한 키를 넣고 개발 서버를 다시 켜 주세요.',
      503,
      'NO_API_KEY'
    );
  }
  return key;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 다른 모델로 바꿔 볼 만한 오류: 사용량 초과, 과부하, 모델 없음/종료
const SWITCHABLE = new Set([404, 429, 500, 503]);

/** 모델 목록을 앞에서부터 시도한다. 붐비는 모델은 건너뛰고 다음 모델로. */
async function callGeminiWithFallback(
  models: string[],
  body: unknown | ((model: string) => unknown) // 모델마다 요청 형식이 다르면 함수로 넘긴다
): Promise<GeminiResponse & { model: string }> {
  const failures: string[] = [];
  for (const model of models) {
    try {
      const data = await callGemini(model, typeof body === 'function' ? body(model) : body);
      return { ...data, model }; // 실제로 응답한 모델 이름도 함께
    } catch (e) {
      if (!(e instanceof GeminiError) || !SWITCHABLE.has(e.status)) throw e;
      failures.push(`${model}(${e.status})`);
    }
  }
  throw new GeminiError(
    `지금 Gemini 서버가 붐벼서 방송을 만들지 못했어요. 잠시 후 다시 시도해 주세요. [시도한 모델: ${failures.join(', ')}]`,
    503,
    'BUSY'
  );
}

/** generateContent 호출. 429(사용량 초과)·503(과부하)는 잠깐 기다렸다가 한 번 더 시도한다. */
async function callGemini(model: string, body: unknown, retries = 1): Promise<GeminiResponse> {
  const key = getApiKey();

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });

    if (res.ok) return (await res.json()) as GeminiResponse;

    const text = await res.text();
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 3000);
      continue;
    }

    let message = text;
    try {
      message = JSON.parse(text)?.error?.message ?? text;
    } catch {}
    throw new GeminiError(`Gemini API 오류 (${model}, ${res.status}): ${message}`, res.status);
  }
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] };
  }[];
}

// ---------------------------------------------------------------------------
// 1) 대본 작성
// ---------------------------------------------------------------------------

export interface RadioScript {
  title: string;
  script: RadioScriptLine[];
  practice_line: string;
  sources: string[];
  safety_flag: boolean;
}

const SPEAKERS: RadioSpeaker[] = ['senior', 'junior'];
const SEGMENTS: RadioSegment[] = ['opening', 'story', 'talk', 'tip', 'practice', 'closing'];

export async function generateRadioScript(systemPrompt: string, userPrompt: string): Promise<RadioScript> {
  const data = await callGeminiWithFallback(SCRIPT_MODELS, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
  });

  const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let parsed: Partial<RadioScript>;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new GeminiError('AI 대본이 JSON 형식이 아니에요. 다시 만들어 주세요.', 502, 'BAD_RESPONSE');
  }

  // 형식 검증 (radio-server의 pydantic 검증과 같은 역할)
  const script = (Array.isArray(parsed.script) ? parsed.script : [])
    .filter(
      (l): l is RadioScriptLine =>
        !!l &&
        SPEAKERS.includes(l.speaker) &&
        SEGMENTS.includes(l.segment) &&
        typeof l.line === 'string' &&
        l.line.trim().length > 0
    )
    .map((l) => ({
      speaker: l.speaker,
      segment: l.segment,
      line: l.line.trim(),
      ...(l.caption ? { caption: String(l.caption) } : {}),
      ...(l.basis ? { basis: String(l.basis) } : {}),
    }));

  if (script.length < 4) {
    throw new GeminiError('AI 대본이 너무 짧거나 형식이 맞지 않아요. 다시 만들어 주세요.', 502, 'BAD_RESPONSE');
  }

  return {
    title: String(parsed.title || '오피스 라디오'),
    script,
    practice_line: String(parsed.practice_line || ''),
    sources: Array.isArray(parsed.sources) ? parsed.sources.map(String) : [],
    safety_flag: Boolean(parsed.safety_flag),
  };
}

// ---------------------------------------------------------------------------
// 2) 음성 합성 — 두 DJ의 대화 전체를 다중 화자 음성으로 한 번에 녹음
//    (대사별 시간은 align.ts 가 녹음을 분석해서 찾는다. 무료 한도: 음성 모델 분당 3회)
// ---------------------------------------------------------------------------

export interface SpeechResult {
  wav: Buffer;
  duration: number; // 초
  model?: string; // 녹음에 쓴 음성 모델
}

// 다중 화자 음성에서 쓰는 화자 이름
const TTS_SPEAKER_NAME: Record<RadioSpeaker, string> = { senior: '하루', junior: '새봄' };

export async function synthesizeDialogue(
  lines: { speaker: RadioSpeaker; line: string }[],
  models: string[] = TTS_MODELS // 목소리를 통일하려면 모델 하나만 지정 (대체 모델로 넘어가지 않음)
): Promise<SpeechResult> {
  const data = await callGeminiWithFallback(models, (model: string) => ({
    contents: [
      {
        role: 'user',
        parts: model.includes('preview')
          ? // 이전 세대(미리보기) 모델: "화자: 대사" 줄들로 된 대본 한 덩어리
            [{ text: lines.map((l) => `${TTS_SPEAKER_NAME[l.speaker]}: ${l.line}`).join('\n') }]
          : // 현재 모델: 대사마다 화자를 붙여 보낸다
            lines.map((l) => ({ text: l.line, speechMetadata: { speaker: TTS_SPEAKER_NAME[l.speaker] } })),
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: (['senior', 'junior'] as RadioSpeaker[]).map((sp) => ({
            speaker: TTS_SPEAKER_NAME[sp],
            voiceConfig: { prebuiltVoiceConfig: { voiceName: DJ_VOICES[sp] } },
          })),
        },
      },
    },
  }));

  const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) throw new GeminiError('음성 데이터가 비어 있어요.', 502, 'BAD_RESPONSE');

  return { ...toWav(Buffer.from(inline.data, 'base64'), inline.mimeType), model: data.model };
}

/** Gemini 음성은 WAV(RIFF) 또는 헤더 없는 PCM(audio/L16)으로 온다 → 항상 WAV로 맞추고 길이를 계산한다. */
function toWav(bytes: Buffer, mimeType = ''): SpeechResult {
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF') {
    const channels = bytes.readUInt16LE(22);
    const sampleRate = bytes.readUInt32LE(24);
    const bitsPerSample = bytes.readUInt16LE(34);
    // data 청크 찾기 (fmt 뒤에 다른 청크가 있을 수 있음)
    let offset = 12;
    let dataSize = bytes.length - 44;
    while (offset + 8 <= bytes.length) {
      const id = bytes.subarray(offset, offset + 4).toString('ascii');
      const size = bytes.readUInt32LE(offset + 4);
      if (id === 'data') {
        dataSize = Math.min(size, bytes.length - offset - 8);
        break;
      }
      offset += 8 + size + (size % 2);
    }
    return { wav: bytes, duration: dataSize / (sampleRate * channels * (bitsPerSample / 8)) };
  }

  const sampleRate = Number(/rate=(\d+)/.exec(mimeType)?.[1]) || 24000;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + bytes.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(bytes.length, 40);
  return { wav: Buffer.concat([header, bytes]), duration: bytes.length / (sampleRate * 2) };
}

/** 음성이 없을 때 쓰는 가상 재생 시간 (한국어 낭독 약 7자/초) */
export function estimateDuration(text: string): number {
  return Math.max(2, text.replace(/\s/g, '').length / 7 + 0.6);
}
