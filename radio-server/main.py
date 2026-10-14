from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # .env 파일의 OPENAI_API_KEY를 불러온다 (라우터 import보다 먼저)

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routers import radio

app = FastAPI(title="젠지 오피스 가이드 API")
app.include_router(radio.router)

# 미리보기 화면: 서버를 켠 뒤 http://127.0.0.1:8000/static/radio_preview.html
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")
