import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEN Z QUIZ",
  description: "직장 생활 퀴즈와 나의 학습 기록",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
