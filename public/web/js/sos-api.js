// ===== SOS 상담 백엔드 연결 (/api/sos) =====
// 백엔드는 Supabase 익명 사용자 토큰을 요구한다: 처음 질문할 때 익명 로그인 후 토큰을 붙여 보낸다.
// 대화는 서버가 sos_sessions / sos_messages 에 저장하고, 돌려준 sessionId로 이어서 묻는다.
const SosApi = (() => {
  let client = null;
  let sessionId = null;
  const history = [];   // 서버가 대화를 저장하지 않을 때 맥락을 잇기 위해 최근 대화를 함께 보낸다

  async function getClient() {
    if (client) return client;
    const config = await fetch("/api/public-config").then((r) => r.json());
    if (!config.supabaseUrl || !config.supabasePublishableKey) throw new Error("Supabase 설정이 없어요.");
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = createClient(config.supabaseUrl, config.supabasePublishableKey);
    return client;
  }

  async function accessToken() {
    const sb = await getClient();
    let { data } = await sb.auth.getSession();
    if (!data.session) {
      const result = await sb.auth.signInAnonymously();
      if (result.error) throw new Error("익명 사용자 연결에 실패했어요. (Supabase 익명 로그인 설정 확인)");
      data = result.data;
    }
    return data.session.access_token;
  }

  // 질문을 보내고 AI 답변 문자열을 돌려준다. 실패하면 서버가 준 안내 문구로 Error를 던진다.
  async function ask(question) {
    const token = await accessToken();
    const res = await fetch("/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, ...(sessionId ? { sessionId } : {}), history: history.slice(-12) }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.sessionId) sessionId = data.sessionId;
    if (!res.ok || !data.answer) throw new Error(data.error || "답변을 받지 못했어요.");
    history.push({ role: "user", content: question }, { role: "assistant", content: data.answer });
    return data.answer;
  }

  // accessToken: AI 팀장 시뮬레이션이 결과를 같은 익명 사용자로 저장할 때도 쓴다 (js/simulation.js)
  return { ask, accessToken };
})();
