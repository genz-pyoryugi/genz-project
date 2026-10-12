import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "신입사원 TOP 3 · 카드뉴스",
  description: "신입사원 치명적 실수 TOP 3 카드뉴스 컴포넌트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
