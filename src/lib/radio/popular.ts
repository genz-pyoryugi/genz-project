// 보이는 라디오에 나갈 "인기 사연" 고르기
// 7대 카테고리(챕터)마다, 공감 스티커 + 마스킹테이프 조언을 가장 많이 받은 포스트잇 1개씩을 라디오 사연으로 방송한다.
// (방송의 꿀팁은 테이프 조언에서 가져오므로, 조언이 하나도 없는 포스트잇은 제외)

import { PostItPost } from '@/types/community';
import { CHAPTER_LIST } from '@/data/officeData';
import { isHidden } from '@/lib/community/report';

export function popularityScore(post: PostItPost): number {
  return post.stickers.length + post.comments.length;
}

/** 챕터 순서(01 → 07)대로, 챕터별 최고 인기 사연 1개씩 (동점이면 조언이 많은 순, 그다음 먼저 올라온 순) */
export function getRadioPosts(posts: PostItPost[]): PostItPost[] {
  return CHAPTER_LIST.map((chapter) =>
    posts
      .filter((p) => p.chapterId === chapter.id && !isHidden(p) && p.comments.some((c) => !isHidden(c)))
      .reduce<PostItPost | null>((best, p) => {
        if (!best) return p;
        const diff = popularityScore(p) - popularityScore(best) || p.comments.length - best.comments.length;
        return diff > 0 ? p : best;
      }, null)
  ).filter((p): p is PostItPost => p !== null);
}
