from fastapi import APIRouter, HTTPException, Response
from pydantic import ValidationError

from app.schemas.radio import RadioEpisode, RadioRequest, RadioResponse, TTSRequest
from app.services.radio_service import make_radio
from app.services.tts_service import make_speech

router = APIRouter(prefix="/radio", tags=["보이는 라디오"])


@router.post("/generate", response_model=RadioResponse)
def generate_radio(req: RadioRequest):
    try:
        return make_radio(req)
    except ValidationError:
        raise HTTPException(status_code=502, detail="AI 응답 형식이 올바르지 않습니다. 다시 생성해 주세요.")
    except Exception:
        raise HTTPException(status_code=500, detail="라디오 생성 중 오류가 발생했습니다.")


# ---- 예시 에피소드 (API 키 없이도 화면 개발·시연 가능) ----
import json
from pathlib import Path

SAMPLE_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_episodes.json"


@router.get("/samples", response_model=list[RadioEpisode])
def get_samples(category: str | None = None):
    """예시 에피소드 목록. ?category=근태 처럼 카테고리로 거를 수 있다."""
    episodes = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))
    if category:
        episodes = [e for e in episodes if e["category"] == category]
    return episodes



# ---- 음성(TTS): 대사 한 줄 → mp3 ----
@router.post("/tts", response_class=Response)
def text_to_speech(req: TTSRequest):
    try:
        audio = make_speech(req.text, req.speaker)
    except Exception:
        raise HTTPException(status_code=500, detail="음성 생성 중 오류가 발생했습니다. 서버의 인터넷 연결을 확인해 주세요.")
    return Response(content=audio, media_type="audio/mpeg")
