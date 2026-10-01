import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return <div>오류: {error.message}</div>;
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1>젠지 표류기 기사 아카이브</h1>

      <p>총 {data?.length ?? 0}개 기사</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {data?.map((article) => (
          <div
            key={article.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <p>{article.category}</p>

            <h2>{article.title}</h2>

            <p>{article.keyword}</p>

            {article.published_date && <p>{article.published_date}</p>}

            <a href={article.url} target="_blank" rel="noopener noreferrer">
              기사 원문 보기
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
