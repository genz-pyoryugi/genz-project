import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AIResponse = {
  status?: string;
  output?: {
    type: string;
    content?: { type: string; text?: string }[];
  }[];
};

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!url || !publicKey || !secretKey || !openaiKey) {
    return NextResponse.json(
      { error: "서버 연결 설정이 누락됐어요." },
      { status: 500 }
    );
  }

  // 화면에서 전달한 사용자 토큰을 실제로 검증합니다.
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];

  if (!token) {
    return NextResponse.json(
      { error: "익명 사용자 연결이 필요해요." },
      { status: 401 }
    );
  }

  const authClient = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } =
    await authClient.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "사용자 연결이 만료됐어요. 새로고침해 주세요." },
      { status: 401 }
    );
  }

  let body: { question?: unknown; sessionId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "질문 형식이 올바르지 않아요." },
      { status: 400 }
    );
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";

  if (!question || question.length > 4000) {
    return NextResponse.json(
      { error: "질문을 1~4,000자로 입력해 주세요." },
      { status: 400 }
    );
  }

  if (
    body.sessionId !== undefined &&
    (typeof body.sessionId !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
        body.sessionId
      ))
  ) {
    return NextResponse.json(
      { error: "대화 ID가 올바르지 않아요." },
      { status: 400 }
    );
  }

  const database = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = authData.user.id;
  let sessionId =
    typeof body.sessionId === "string" ? body.sessionId : null;

  try {
    // 서버용 키는 권한 제한을 우회하므로 소유자를 직접 확인합니다.
    if (sessionId) {
      const { data, error } = await database
        .from("sos_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          { error: "접근할 수 없는 대화예요." },
          { status: 403 }
        );
      }
    }

    let history: { role: "user" | "assistant"; content: string }[] = [];

    if (sessionId) {
      const { data, error } = await database
        .from("sos_messages")
        .select("role,content,created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;

      history = (data ?? []).reverse().map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions:
          "한국어로 직장 생활과 일상 질문에 친절하고 실용적으로 답하세요. " +
          "모르는 사실은 추측해서 단정하지 말고 필요한 정보를 물어보세요.",
        input: [...history, { role: "user", content: question }],
        max_output_tokens: 1500,
        store: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            response.status === 429
              ? "AI 요청 한도 또는 API 사용 잔액을 확인해 주세요."
              : "AI 답변 요청에 실패했어요. 잠시 후 다시 시도해 주세요.",
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const result = (await response.json()) as AIResponse;
    const answer = (result.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();

    if (result.status !== "completed" || !answer) {
      return NextResponse.json(
        { error: "AI 답변이 완성되지 않았어요. 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    if (!sessionId) {
      const { data, error } = await database
        .from("sos_sessions")
        .insert({
          user_id: userId,
          title: question.slice(0, 80),
        })
        .select("id")
        .single();

      if (error) throw error;
      sessionId = data.id;
    }

    // 두 메시지를 한 번에 저장합니다.
    const questionTime = new Date();
    const answerTime = new Date(questionTime.getTime() + 1);

    const { error } = await database.from("sos_messages").insert([
      {
        session_id: sessionId,
        role: "user",
        content: question,
        created_at: questionTime.toISOString(),
      },
      {
        session_id: sessionId,
        role: "assistant",
        content: answer,
        created_at: answerTime.toISOString(),
      },
    ]);

    if (error) {
      return NextResponse.json(
        {
          error: "AI 답변은 생성됐지만 데이터베이스 저장에 실패했어요.",
          sessionId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId, answer });
  } catch {
    return NextResponse.json(
      { error: "SOS 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
