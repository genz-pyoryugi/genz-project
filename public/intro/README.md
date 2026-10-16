# 젠지 표류기 — 스크롤 인트로

아티팩트 버전과 디자인·인터랙션이 같은 정적 파일 묶음입니다.
Next.js 프로젝트의 `public/intro/` 폴더에 그대로 넣어 쓰면 되고, 모든 파일은 상대경로로 연결되어 있습니다.

## 폴더 구조

```
public/intro/
├─ index.html          ← 페이지 구조 (인트로 / 본 웹 iframe)
├─ css/intro.css       ← 전체 스타일
├─ js/intro.js         ← 스크롤 연출 (canvas 바다, 책, 끈)
├─ assets/
│  ├─ fonts/           ← (선택) 폰트를 직접 호스팅할 때
│  ├─ images/          ← sea.png (인트로 바다 사진)
│  ├─ video/           ← (예비) 나중에 파도·남성 영상을 쓸 때
│  └─ audio/           ← (예비) 나중에 파도 소리를 쓸 때
└─ README.md
```

## 에셋 경로

| 종류 | 현재 사용 | 경로 |
|---|---|---|
| 스타일 | 사용 | `css/intro.css` |
| 스크립트 | 사용 | `js/intro.js` |
| 이미지 | 사용 | `assets/images/sea.png` — 바다 사진(360×360, 이어 붙여도 이음새가 없는 타일). `js/intro.js` 의 `SEA_IMG`·`SEA_TILE`(타일 한 장 크기)로 바꿀 수 있습니다. 반복 무늬가 티 나지 않게 같은 사진을 회전·확대해 반투명으로 한 번 더 겹치고 큰 명암 얼룩을 얹은 2048px 텍스처를 처음 한 번만 만들어 둡니다 (매 프레임에는 한 번만 칠함). 사람, 튜브, 로프, 해변, 책은 canvas·CSS·SVG로 그립니다. |
| 영상 | **없음** | 실사 버전으로 바꿀 때 `assets/video/` 에 넣으세요 (예: `assets/video/wave.mp4`, `assets/video/wave_man.mp4`). |
| 소리 | **없음** | 소리를 넣을 때 `assets/audio/` 에 넣으세요 (예: `assets/audio/wave_audio.mp3`). |
| 폰트 | Google Fonts (외부) | Nanum Myeongjo 400/700/800 · IBM Plex Sans KR 400/500/600 · IBM Plex Mono 500 |

### 폰트를 직접 호스팅하려면

1. 위 폰트의 `.woff2` 파일을 `assets/fonts/` 에 넣습니다.
2. `index.html` 의 Google Fonts `<link>` 3줄을 지웁니다.
3. `css/intro.css` 맨 위에 아래처럼 `@font-face` 를 추가합니다 (경로는 CSS 파일 기준 `../assets/fonts/`).

```css
@font-face { font-family: "Nanum Myeongjo"; font-weight: 800; font-display: swap;
  src: url("../assets/fonts/NanumMyeongjo-ExtraBold.woff2") format("woff2"); }
/* 나머지 굵기·폰트도 같은 방식으로 */
```

## Next.js에서 열기

`public/intro/index.html` 은 **`/intro/index.html`** 주소로 열어야 합니다.
주소가 `/intro` 처럼 슬래시 없이 끝나면 상대경로 `css/intro.css` 가 `/css/intro.css` 로 잘못 해석됩니다.

`/intro` 로도 열고 싶다면 `next.config.js` 에 리다이렉트를 추가하세요.

```js
async redirects() {
  return [{ source: '/intro', destination: '/intro/index.html', permanent: false }];
}
```

## 페이지 구조 (index.html)

| 영역 | 선택자 | 설명 |
|---|---|---|
| 인트로 스크롤 트랙 | `#intro` | 높이(`1320vh`)만큼 스크롤하는 동안 `.stage` 가 화면에 고정됩니다. |
| 스토리 | `.stage` 안 `canvas#sea`, `#world` | 바다 → 점 → 남성 → 로프 → 튜브 → 육지 → 책갈피 반전 → 책 펼침 |
| 본 웹 | `section#main-web` | 인트로가 끝나면 바로 이어지는 본 웹(`/web/home.html`)을 iframe으로 붙입니다. |

| 연결 책갈피 | `.rib2wrap > #rib2` | 본 웹이 올라오는 동안 화면 위에 고정되어, 펼친 페이지의 책갈피를 본 웹 채팅 책(`.chatbook__ribbon`)까지 이어 줍니다. |

인트로는 책이 펼쳐진 페이지에서 끝나고, 그대로 스크롤하면 본 웹 첫 화면(목차)이 아래에서 올라옵니다.
그 전에 펼친 페이지에 머문 채 책갈피가 채팅 책 책갈피 굵기로 천천히 가늘어지고, 본 웹이 올라오는 동안 위에서부터 짧아져 채팅 책의 책갈피와 딱 겹친 뒤 그 책갈피에 자리를 넘깁니다.
(예전 버전의 인트로 속 가짜 목차 화면은 본 웹 첫 화면과 겹쳐서 지웠습니다.)

- 채팅 책의 위치는 iframe 안에서 매 프레임 직접 재기 때문에, 본 웹에서 책 위치·크기를 바꿔도 따라갑니다.
- iframe 안의 `100vh` 는 iframe 전체 높이라서, `index.html` 이 본 웹의 `.hero` 높이와 채팅 책 아래 여백을 실제 화면 높이로 맞춰 줍니다 (`fitHeroToScreen`).

### 이벤트

호스트 페이지(Next.js 등)에서 인트로가 끝난 시점을 알 수 있습니다.

```js
window.addEventListener('genz-intro:complete', () => { /* 인트로 끝까지 도착 */ });
window.addEventListener('genz-intro:reset',    () => { /* 다시 위로 스크롤함 */ });
```

## 조정할 수 있는 값 (js/intro.js)

| 상수 | 기본값 | 의미 |
|---|---|---|
| `TUBES` | `true` | 튜브(구명환)와 지그재그 움직임. `false` 면 튜브가 사라지고 움직임이 잔잔해집니다. |
| `SC` | `.84` | 전체 스크롤 중 스토리(바다 → 책 펼침)가 차지하는 비율 |
| `THIN` | `[.87, 1]` | 펼친 페이지에 머문 채 책갈피가 채팅 책 책갈피 굵기로 가늘어지는 구간 (이게 끝나야 본 웹이 올라옴) |
| 연결 구간 (`hq`) | `sm(.15, 1, hq)` | 본 웹이 올라오는 동안 책갈피가 위에서부터 짧아져 채팅 책으로 들어가는 구간 |
| `capWin` | – | 자막 6개가 나타나고 사라지는 구간 (스토리 진행도 기준) |

전체 스크롤 길이는 `css/intro.css` 의 `#intro { height: 1320vh }` 로 조절합니다.
