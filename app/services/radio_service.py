import json
import os

from openai import OpenAI

from app.prompts.radio import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.schemas.radio import RadioRequest, RadioResponse

# API 키는 코드에 직접 쓰지 않고 .env 파일(환경변수)에서 읽는다.
# 클라이언트는 실제로 생성할 때 만든다 (API 키가 없어도 서버·예시·음성은 동작하도록)
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # 수업에서 쓰는 모델명으로 바꿔도 됨


def make_radio(req: RadioRequest) -> RadioResponse:
    user_prompt = USER_PROMPT_TEMPLATE.format(**req.model_dump())

    completion = OpenAI(api_key=os.getenv("OPENAI_API_KEY")).chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},   # 고정 규칙
            {"role": "user", "content": user_prompt},       # 이번 요청 내용
        ],
        response_format={"type": "json_object"},          # JSON으로만 답하게 강제
        temperature=0.8,
    )

    data = json.loads(completion.choices[0].message.content)
    return RadioResponse(**data)  # 형식이 틀리면 여기서 에러 → 라우터에서 처리
