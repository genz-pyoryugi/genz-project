import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data, error } = await supabase.from("contents").select("*");

  if (error) {
    return <div>오류: {error.message}</div>;
  }

  return (
    <div>
      <h1>Supabase 연결 테스트</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
