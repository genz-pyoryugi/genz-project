# 카드뉴스 콘텐츠 컴포넌트

이 브랜치(`content`)는 신입사원 치명적 실수 TOP 3 카드뉴스를 개발합니다.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에 접속하면 카드뉴스 컴포넌트만 표시됩니다.

## 구성

- TOP 3 카드 3장과 원문보기 카드 1장
- 1080 × 1350px 기준, 세로 4:5
- Pretendard 로컬 폰트, #fdf9f2 베이지 배경
- 세 카드 하단에 동일한 전구 아이콘 팁 박스
- 카드 내부 하단 점 표시, 외부 이전·다음 버튼
- 출처 문구와 이미지 저장 버튼은 표시하지 않음

## 파일

- `public/web/js/components/cardnews.js`: 카드 렌더링 및 슬라이드 동작
- `public/web/js/components/cardnews-preview.js`: 컴포넌트 등록 및 단독 화면 연결
- `public/web/js/components/util.js`: DOM 생성 공통 도구
- `public/web/js/data/articles.js`: 원문 기사 데이터
- `public/web/css/cardnews-preview.css`: 단독 실행 화면 스타일
- `public/web/css/components.css`: 컴포넌트 스타일
- `public/web/assets/picture/*-beige.png`: 삽화
- `public/web/assets/fonts/`: Pretendard 파일 및 라이선스
