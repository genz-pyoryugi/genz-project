// 고민상담소 포스트잇 저장소 (브라우저 localStorage)
// 고민상담소 화면과 보이는 라디오 페이지가 같은 데이터를 쓰도록 한곳에 모아 둔다.
// (사용자가 붙인 스티커·남긴 조언이 인기 사연 선정에 똑같이 반영되게)

import { PostItPost } from '@/types/community';
import { INITIAL_POSTIT_POSTS } from '@/data/officeData';

export const COMMUNITY_STORAGE_KEY = 'genz_office_postits_v7';

/** 저장된 포스트잇을 읽는다. 저장본이 없으면 null (기본 포스트잇 그대로 쓰면 됨). 브라우저에서만 호출할 것 */
export function loadSavedPosts(): PostItPost[] | null {
  try {
    // Clean up older stale keys if present
    ['', '_v1', '_v2', '_v3', '_v4', '_v5', '_v6'].forEach((v) => localStorage.removeItem(`genz_office_postits${v}`));

    const saved = localStorage.getItem(COMMUNITY_STORAGE_KEY);
    const parsed: PostItPost[] = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Always ensure all initial posts exist in the set
    const parsedIds = new Set(parsed.map((p) => p.id));
    const missing = INITIAL_POSTIT_POSTS.filter((ip) => !parsedIds.has(ip.id));
    return [...missing, ...parsed];
  } catch {
    return null;
  }
}

export function savePosts(posts: PostItPost[]) {
  try {
    localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(posts));
  } catch {}
}
