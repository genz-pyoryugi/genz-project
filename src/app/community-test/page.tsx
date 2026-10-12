"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function CommunityTestPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPosts() {
    const { data, error } = await supabase
      .from("community_posts")
      .select("id,title,content,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    setPosts(data ?? []);
  }

  useEffect(() => {
    loadPosts().catch((error: unknown) => {
      setMessage(
        error instanceof Error ? error.message : "게시글 조회 실패"
      );
    });
  }, []);

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      // 기존 사용자가 없을 때만 익명 사용자를 생성합니다.
      if (!data.session) {
        const result = await supabase.auth.signInAnonymously();
        if (result.error) throw result.error;
      }

      const result = await supabase
        .from("community_posts")
        .insert({
          title: title.trim(),
          content: content.trim(),
        });

      if (result.error) throw result.error;

      setTitle("");
      setContent("");
      setMessage("저장됐어요.");

      try {
        await loadPosts();
      } catch {
        setMessage("저장은 완료됐지만 목록을 불러오지 못했어요. 새로고침해 주세요.");
      }
    } catch (error: unknown) {
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === "object" &&
              error !== null &&
              "message" in error
            ? String(error.message)
            : "다시 시도해 주세요.";
      setMessage(`저장 실패: ${detail}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 20 }}>
      <h1>고민상담소 저장 테스트</h1>
      <p>게시글은 공개됩니다. 테스트 내용만 입력해 주세요.</p>

      <form onSubmit={savePost} style={{ display: "grid", gap: 12 }}>
        <input
          aria-label="제목"
          placeholder="제목"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
          disabled={busy}
          style={{ border: "1px solid #999", padding: 12 }}
        />
        <textarea
          aria-label="내용"
          placeholder="고민 내용"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={10000}
          rows={5}
          required
          disabled={busy}
          style={{ border: "1px solid #999", padding: 12 }}
        />
        <button
          type="submit"
          disabled={busy || !title.trim() || !content.trim()}
          style={{ background: "#2563eb", color: "white", padding: 12 }}
        >
          {busy ? "저장 중…" : "저장"}
        </button>
      </form>

      <p role="status">{message}</p>
      <h2>최근 게시글</h2>
      {posts.length === 0 && <p>아직 게시글이 없어요.</p>}
      {posts.map((post) => (
        <article
          key={post.id}
          style={{ borderBottom: "1px solid #ccc", padding: "16px 0" }}
        >
          <h3>{post.title}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{post.content}</p>
          <small>{new Date(post.created_at).toLocaleString("ko-KR")}</small>
        </article>
      ))}
    </main>
  );
}
