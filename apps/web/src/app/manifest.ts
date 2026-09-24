import type { MetadataRoute } from "next";

/** 폰 홈 화면에 앱처럼 설치할 때 쓰는 정보 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Diet Design",
    short_name: "Diet Design",
    description: "다이어트 디자인 — 하루 기록과 코칭",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#37332f",
    theme_color: "#fbf8f3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
