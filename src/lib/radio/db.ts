// 보이는 라디오 방송을 팀 DB(Supabase)의 radio_contents 테이블에 저장 (서버 전용)
// 저장 권한이 있는 관리자 키(SUPABASE_SECRET_KEY)가 .env.local 에 있을 때만 동작한다.
// 같은 방송(audio_url 이 같음)은 새로 넣지 않고 내용을 갱신한다.

import { createClient } from '@supabase/supabase-js';
import { PostItPost } from '@/types/community';
import { RadioEpisode } from '@/types/radio';
import { CHAPTER_LIST } from '@/data/officeData';

const TABLE = 'radio_contents';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** 방송 1편 → radio_contents 한 행 */
export function toRadioRow(episode: RadioEpisode, post: Pick<PostItPost, 'chapterId' | 'categoryTag'>) {
  const chapter = CHAPTER_LIST.find((c) => c.id === post.chapterId);
  return {
    category: chapter?.title ?? post.chapterId,
    sub_category: post.categoryTag,
    title: episode.title,
    script: episode.lines.map(({ speaker, segment, line, caption, basis, start, duration }) => ({
      speaker,
      segment,
      line,
      ...(caption ? { caption } : {}),
      ...(basis ? { basis } : {}),
      start: Math.round(start * 100) / 100,
      duration: Math.round(duration * 100) / 100,
    })),
    practice_line: episode.practice_line,
    sources: episode.sources,
    safety_flag: episode.safety_flag,
    audio_url: episode.audioUrl,
    status: '완료',
  };
}

/** 방송을 DB에 저장(있으면 갱신). 관리자 키가 없으면 아무것도 하지 않고 false */
export async function saveEpisodeToDb(
  episode: RadioEpisode,
  post: Pick<PostItPost, 'chapterId' | 'categoryTag'>
): Promise<boolean> {
  const db = adminClient();
  if (!db || !episode.audioUrl) return false;

  const row = toRadioRow(episode, post);
  const { data: existing, error: findError } = await db
    .from(TABLE)
    .select('id')
    .eq('audio_url', episode.audioUrl)
    .limit(1);
  if (findError) throw new Error(`radio_contents 조회 실패: ${findError.message}`);

  const { error } = existing?.length
    ? await db.from(TABLE).update(row).eq('id', existing[0].id)
    : await db.from(TABLE).insert(row);
  if (error) throw new Error(`radio_contents 저장 실패: ${error.message}`);
  return true;
}
