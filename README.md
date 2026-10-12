This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 신입사원 TOP 3 카드뉴스 확인

프로젝트 폴더에서 `npm run dev`를 실행한 뒤 아래 주소를 엽니다.

http://localhost:3000

기존 프론트 화면 없이 TOP 3 카드와 원문보기 카드 컴포넌트,
총 4장만 표시합니다. 카드는 1080 × 1350px 기준이며,
출처 문구와 이미지 저장 버튼은 표시하지 않습니다. Pretendard 폰트는 프로젝트에 포함되어 있습니다.

PC 브라우저 검증 기록과 실제 캡처는 `artifacts/cardnews-qa/`에 있습니다.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
