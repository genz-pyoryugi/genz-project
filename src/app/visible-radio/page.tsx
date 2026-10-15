'use client';

// 보이는 라디오 단독 페이지 (/visible-radio)
// 메인 화면(사무실 책상)의 흰색 무선 이어폰을 누르면 사무실 위 팝업 안에 이 페이지가 열린다.
// 고민상담소와 같은 포스트잇 저장소를 읽어서, 7대 카테고리별 인기 사연을 똑같이 보여 준다.

import React, { useEffect, useMemo, useState } from 'react';
import { PostItPost } from '@/types/community';
import { INITIAL_POSTIT_POSTS } from '@/data/officeData';
import { loadSavedPosts } from '@/lib/community/storage';
import { getRadioPosts } from '@/lib/radio/popular';
import { RadioHubModal } from '@/components/radio/RadioHubModal';
import { VisibleRadioModal } from '@/components/radio/VisibleRadioModal';

export default function VisibleRadioPage() {
  // 첫 화면은 서버와 같은 기본 포스트잇으로 그리고, 화면이 뜬 뒤 저장된 포스트잇을 불러온다 (hydration 오류 방지)
  const [posts, setPosts] = useState<PostItPost[]>(INITIAL_POSTIT_POSTS);
  const [radioPost, setRadioPost] = useState<PostItPost | null>(null);

  useEffect(() => {
    const saved = loadSavedPosts();
    if (saved) setPosts(saved);
  }, []);

  const radioPosts = useMemo(() => getRadioPosts(posts), [posts]);

  return (
    <>
      <RadioHubModal variant="page" posts={radioPosts} onSelect={setRadioPost} />
      {radioPost && <VisibleRadioModal key={radioPost.id} post={radioPost} onClose={() => setRadioPost(null)} />}
    </>
  );
}
