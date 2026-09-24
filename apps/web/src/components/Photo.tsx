"use client";

import { usePhotoUrl } from "@/lib/repository";

export function Photo({ id, className = "" }: { id: string; className?: string }) {
  const url = usePhotoUrl(id);
  if (!url) return <div className={`animate-pulse bg-line ${className}`} />;
  // blob: URL이라 next/image 최적화 대상이 아니다
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="음식 사진" className={`object-cover ${className}`} />;
}
