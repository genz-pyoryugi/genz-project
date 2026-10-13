import asyncio
import os

import edge_tts

# edge-tts: 마이크로소프트 엣지의 온라인 음성을 쓴다 (API 키 필요 없음, 인터넷 연결 필요)
# 두 DJ의 목소리. 한국어 음성 목록은 터미널에서 `edge-tts --list-voices` 로 볼 수 있다
VOICES = {
    "senior": os.getenv("TTS_VOICE_SENIOR", "ko-KR-InJoonNeural"),  # 선배 DJ 하루: 차분한 남성 톤
    "junior": os.getenv("TTS_VOICE_JUNIOR", "ko-KR-SunHiNeural"),   # 신입 DJ 새봄: 밝은 여성 톤
}


async def _synthesize(text: str, voice: str) -> bytes:
    audio = bytearray()
    async for chunk in edge_tts.Communicate(text, voice).stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)


def make_speech(text: str, speaker: str) -> bytes:
    """대사 한 줄을 mp3 음성으로 만든다."""
    return asyncio.run(_synthesize(text, VOICES.get(speaker, VOICES["senior"])))
