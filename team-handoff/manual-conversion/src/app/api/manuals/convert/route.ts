import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { manualSchema, manualInstructions, validateManual } from "@/lib/manual-conversion";

export const runtime = "nodejs";
export const maxDuration = 180;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 30;
class ConversionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function POST(req: NextRequest) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) throw new ConversionError("허용되지 않은 요청입니다.", 403);
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) throw new ConversionError("PDF 파일을 폼 데이터로 보내 주세요.");
    if (Number(req.headers.get("content-length") || 0) > MAX_BYTES + 65536) throw new ConversionError("10MB 이하의 PDF를 선택해 주세요.", 413);
    // content-length가 없거나 조작된 요청도 스트림을 읽으면서 제한한다.
    const reader = req.body?.getReader();
    if (!reader) throw new ConversionError("파일이 없습니다.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES + 65536) { await reader.cancel(); throw new ConversionError("10MB 이하의 PDF를 선택해 주세요.", 413); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": req.headers.get("content-type")! } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.pdf$/i.test(file.name)) throw new ConversionError("PDF 파일 하나를 선택해 주세요.");
    if (file.size === 0 || file.size > MAX_BYTES) throw new ConversionError("PDF는 0바이트보다 크고 10MB 이하여야 합니다.", 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new ConversionError("올바른 PDF 파일이 아닙니다.");
    let pdf;
    try { pdf = await PDFDocument.load(bytes); } catch { throw new ConversionError("손상되었거나 암호로 보호된 PDF는 처리할 수 없어요."); }
    const pageCount = pdf.getPageCount();
    if (!pageCount || pageCount > MAX_PAGES) throw new ConversionError("첫 버전은 1~30쪽 PDF를 지원합니다.");
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new ConversionError("서버의 .env.local에 OPENAI_API_KEY를 설정하고 재시작해 주세요.", 503);
    const result = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(150000),
      body: JSON.stringify({ model: process.env.OPENAI_MANUAL_MODEL || "gpt-4.1-mini", store: false,
        instructions: manualInstructions, max_output_tokens: 9000,
        input: [{ role: "user", content: [
          { type: "input_file", filename: "manual.pdf", file_data: `data:application/pdf;base64,${bytes.toString("base64")}` },
          { type: "input_text", text: `첨부한 ${pageCount}쪽 PDF에서 핵심 주제 하나를 학습 챕터로 만들어 주세요.` },
        ] }],
        text: { format: { type: "json_schema", name: "manual_learning", strict: true, schema: manualSchema } },
      }),
    });
    if (!result.ok) throw new ConversionError(result.status === 429 ? "AI 한도 또는 잔액을 확인한 뒤 다시 시도해 주세요."
      : result.status === 401 ? "서버의 OpenAI API 키를 확인해 주세요." : "PDF 분석에 실패했어요. 서버의 모델 설정과 PDF 내용을 확인해 주세요.", result.status === 429 ? 429 : 502);
    const response = await result.json();
    if (response.status !== "completed") throw new ConversionError("학습 자료 생성이 끝나지 않았어요. 더 짧은 PDF로 다시 시도해 주세요.", 502);
    const content = (response.output || []).flatMap((item: { content?: { type: string; text?: string }[] }) => item.content || []);
    if (content.some((item: { type: string }) => item.type === "refusal")) throw new ConversionError("문서에서 학습 자료를 만들지 못했어요. 읽을 수 있는 업무 문서인지 확인해 주세요.", 422);
    const output = content.filter((item: { type: string }) => item.type === "output_text").map((item: { text: string }) => item.text).join("");
    let learning;
    try { learning = JSON.parse(output); } catch { throw new ConversionError("생성 결과를 읽지 못했어요. 다시 시도해 주세요.", 502); }
    if (!validateManual(learning, pageCount)) throw new ConversionError("생성 결과의 형식 또는 근거 페이지가 올바르지 않아요. 다시 시도해 주세요.", 502);
    return reply({ learning, pageCount });
  } catch (error) {
    return reply({ error: error instanceof ConversionError ? error.message : "연결이 지연되거나 PDF 처리 오류가 발생했어요. 다시 시도해 주세요." }, error instanceof ConversionError ? error.status : 502);
  }
}
