import type { Metadata, Viewport } from "next";
import { Great_Vibes, Noto_Sans_KR } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { RepositoryProvider } from "@/lib/repository";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  weight: ["400", "500", "700"],
  preload: false,
});

const script = Great_Vibes({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Diet Design",
  description: "다이어트 디자인 — 하루 기록과 코칭",
  // 아이폰 홈 화면에 추가했을 때 주소창 없이 앱처럼 열리게
  appleWebApp: { capable: true, title: "Diet Design", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${script.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <RepositoryProvider>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4">{children}</main>
          <BottomNav />
        </RepositoryProvider>
      </body>
    </html>
  );
}
