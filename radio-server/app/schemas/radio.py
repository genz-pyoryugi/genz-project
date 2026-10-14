from typing import Literal, Optional

from pydantic import BaseModel, Field


class RadioRequest(BaseModel):
    """프론트에서 받는 입력값"""
    category: str = Field(..., examples=["업무 커뮤니케이션"])
    sub_category: str = Field(..., examples=["전화"])
    keywords: str = Field(..., examples=["업무 전화 무서워요, 전화 받기 전 긴장"])
    article_title: str
    article_date: str
    article_summary: str
    ncs_rules: str


class Line(BaseModel):
    """대본 한 줄"""
    speaker: Literal["senior", "junior"]          # senior = 선배 DJ 하루, junior = 신입 DJ 새봄
    segment: Literal["opening", "story", "talk", "tip", "practice", "closing"]
    line: str
    caption: Optional[str] = None                   # 화면 하단 자막
    basis: Optional[str] = None                     # 근거 (tip 줄은 필수)


class RadioResponse(BaseModel):
    """AI가 돌려준 JSON을 검증해서 프론트로 보내는 출력값"""
    title: str
    script: list[Line]
    practice_line: str
    sources: list[str]
    safety_flag: bool = False


class RadioEpisode(RadioResponse):
    """예시 에피소드 (카테고리 정보 포함)"""
    id: int
    category: str
    sub_category: str


class TTSRequest(BaseModel):
    """대사 한 줄을 음성으로 바꿀 때의 입력값"""
    text: str = Field(..., max_length=600, examples=["오피스 라디오, 오늘도 무사히 출근하셨나요?"])
    speaker: Literal["senior", "junior"] = "senior"
