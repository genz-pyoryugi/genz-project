// POST /api/radio/generate
// 포스트잇(고민) + 마스킹테이프 조언 → Gemini가 두 DJ 대본 작성 → 대화 전체를 다중 화자 음성으로 한 번에 녹음
// → 녹음을 분석해 대사별 시작·끝 시간을 찾는다 (화면의 DJ 강조·말풍선·자막을 대사 단위로 맞추기 위해)
// 만든 방송은 public/radio/episodes/<episodeId>/ 에 저장한다 (git에 함께 올려 팀원·배포 환경에서도 바로 재생).
// 같은 포스트잇(내용·조언이 그대로)이면 저장본을 그대로 쓰고 다시 만들지 않는다.

import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { PostItPost } from '@/types/community';
import { RadioEpisode, RadioEpisodeLine } from '@/types/radio';
import { RADIO_SYSTEM_PROMPT, buildRadioUserPrompt } from '@/lib/radio/prompt';
import { GeminiError, estimateDuration, generateRadioScript, synthesizeDialogue } from '@/lib/radio/gemini';
import { alignLines } from '@/lib/radio/align';
import { saveEpisodeToDb } from '@/lib/radio/db';

const EPISODES_DIR = path.join(process.cwd(), 'public', 'radio', 'episodes');
const LINE_GAP = 0.35; // 음성 없이 진행할 때 대사 사이 간격(초)

function episodeIdFor(post: PostItPost): string {
  const hash = createHash('sha1')
    .update(JSON.stringify([post.title, post.content, post.comments.map((c) => [c.id, c.content])]))
    .digest('hex')
    .slice(0, 10);
  return `${post.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${hash}`;
}

export async function POST(req: NextRequest) {
  // regenerate: 대본부터 새로 / revoice: 저장된 대본은 그대로 두고 음성만 다시 녹음
  let body: { post?: PostItPost; regenerate?: boolean; revoice?: boolean; voiceModel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
  }

  const post = body.post;
  if (!post?.id || !post.title || !post.content || !Array.isArray(post.comments)) {
    return NextResponse.json({ error: '포스트잇 정보가 부족해요.' }, { status: 400 });
  }

  const episodeId = episodeIdFor(post);
  const dir = path.join(EPISODES_DIR, episodeId);
  const episodePath = path.join(dir, 'episode.json');

  let saved: RadioEpisode | null = null;
  try {
    saved = JSON.parse(await readFile(episodePath, 'utf-8')) as RadioEpisode;
  } catch {}

  // 이미 만든 방송이 있으면 그대로 사용
  if (saved && !body.regenerate && !body.revoice) return NextResponse.json(saved);

  try {
    // 1) 대본: 음성만 다시 녹음할 때는 저장된 대본을 그대로 쓰고, 아니면 새로 작성
    const script =
      body.revoice && saved
        ? {
            title: saved.title,
            script: saved.lines.map(({ speaker, segment, line, caption, basis }) => ({
              speaker,
              segment,
              line,
              ...(caption ? { caption } : {}),
              ...(basis ? { basis } : {}),
            })),
            practice_line: saved.practice_line,
            sources: saved.sources,
            safety_flag: saved.safety_flag,
          }
        : await generateRadioScript(RADIO_SYSTEM_PROMPT, buildRadioUserPrompt(post));
    await mkdir(dir, { recursive: true });

    // 2) 대화 전체 녹음 + 대사별 시간 찾기 (실패하면 음성 없이 대사 길이로 진행)
    let lines: RadioEpisodeLine[];
    let totalDuration: number;
    let audioUrl: string | null = null;
    let alignMethod: RadioEpisode['alignMethod'];
    let audioError: string | undefined;
    let voiceModel: string | undefined;

    try {
      const { wav, model } = await synthesizeDialogue(
        script.script,
        body.voiceModel ? [body.voiceModel] : undefined // 지정하면 그 모델로만 녹음
      );
      voiceModel = model;
      await writeFile(path.join(dir, 'episode.wav'), wav);
      const aligned = alignLines(wav, script.script);
      lines = script.script.map((l, i) => ({ ...l, ...aligned.timings[i] }));
      totalDuration = aligned.total;
      alignMethod = aligned.method;
      audioUrl = `/radio/episodes/${episodeId}/episode.wav`;
    } catch (e) {
      audioError = e instanceof Error ? e.message : '음성 생성 실패';
      let t = 0;
      lines = script.script.map((l) => {
        const duration = estimateDuration(l.line);
        const line = { ...l, start: t, duration };
        t += duration + LINE_GAP;
        return line;
      });
      totalDuration = Math.max(0, t - LINE_GAP);
    }

    const episode: RadioEpisode = {
      id: episodeId,
      postId: post.id,
      postTitle: post.title,
      title: script.title,
      lines,
      practice_line: script.practice_line,
      sources: script.sources,
      safety_flag: script.safety_flag,
      totalDuration,
      audioUrl,
      hasAudio: audioUrl !== null,
      ...(alignMethod ? { alignMethod } : {}),
      ...(voiceModel ? { voiceModel } : {}),
      ...(audioError ? { audioError } : {}),
      createdAt: new Date().toISOString(),
    };

    // 음성까지 다 만든 방송만 저장 (음성 실패본은 다음에 다시 시도)
    if (audioUrl) {
      await writeFile(episodePath, JSON.stringify(episode, null, 2), 'utf-8');
      // 팀 DB(Supabase radio_contents)에도 저장 — 실패해도 방송은 그대로 보여 준다
      try {
        await saveEpisodeToDb(episode, post);
      } catch (e) {
        console.error(e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json(episode);
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    const code = e instanceof GeminiError ? e.code : 'API_ERROR';
    const message = e instanceof Error ? e.message : '라디오 생성 중 오류가 발생했어요.';
    return NextResponse.json({ error: message, code }, { status });
  }
}
