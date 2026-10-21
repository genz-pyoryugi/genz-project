'use client';

// 보이는 라디오 단독 페이지 (/visible-radio)
// 메인 화면(사무실 책상)의 흰색 무선 이어폰을 누르면 사무실 위 팝업 안에 이 페이지가 열린다.
// 사연 목록을 읽고 고르는 단계 없이 곧바로 라디오 화면(첫 번째 사연)을 보여 주고,
// 닫기 버튼 왼쪽 토글로 7대 카테고리 인기 사연을 골라 들을 수 있다.
// 고민상담소와 같은 포스트잇 저장소를 읽어서 인기 사연을 똑같이 고른다.

import React, { useEffect, useMemo, useState } from 'react';
import { PostItPost } from '@/types/community';
import { INITIAL_POSTIT_POSTS } from '@/data/officeData';
import { loadSavedPosts } from '@/lib/community/storage';
import { getRadioPosts } from '@/lib/radio/popular';
import { VisibleRadioModal } from '@/components/radio/VisibleRadioModal';
import { RadioTutorial } from '@/components/radio/RadioTutorial';

/** 사무실 팝업 안(iframe)이면 사무실의 팝업 닫기 버튼을 누르고, 단독으로 열렸으면 이전 화면으로 */
function closeRadio() {
  try {
    const officeClose =
      window.parent !== window ? window.parent.document.getElementById('officeContentClose') : null;
    if (officeClose) return officeClose.click();
  } catch {}
  history.back();
}

export default function VisibleRadioPage() {
  // 첫 화면은 서버와 같은 기본 포스트잇으로 그리고, 화면이 뜬 뒤 저장된 포스트잇을 불러온다 (hydration 오류 방지)
  const [posts, setPosts] = useState<PostItPost[]>(INITIAL_POSTIT_POSTS);
  const [pickedId, setPickedId] = useState<string | null>(null); // 토글로 고른 사연 (없으면 첫 번째 사연)

  useEffect(() => {
    const saved = loadSavedPosts();
    if (saved) setPosts(saved);
  }, []);

  const radioPosts = useMemo(() => getRadioPosts(posts), [posts]);
  const current = radioPosts.find((p) => p.id === pickedId) ?? radioPosts[0];

  if (!current) {
    return (
      <p className="min-h-screen grid place-items-center p-6 text-center text-sm text-[#5E6F7C] bg-[#F6F4EC] font-ui">
        아직 라디오로 소개할 사연이 없어요. 고민상담소 포스트잇에 테이프 조언과 공감 스티커가 모이면 방송돼요!
      </p>
    );
  }

  return (<>
    <RadioTutorial />
    <VisibleRadioModal
      key={current.id}
      variant="page"
      post={current}
      stories={radioPosts}
      onSelectStory={(p) => setPickedId(p.id)}
      autoPlay={pickedId !== null}
      onClose={closeRadio}
    />
  </>);
}
