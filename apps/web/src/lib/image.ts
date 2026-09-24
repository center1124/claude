import { readExifDate, type DiaryRepository } from "@diet/core";

const MAX_SIDE = 1280;

/** 폰 사진은 용량이 크므로 긴 변 1280px JPEG로 줄여서 저장한다 */
export async function compressImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // 브라우저가 해석하지 못하는 형식(HEIC 등)은 원본 그대로
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  return blob ?? file;
}

/**
 * 사진을 줄여서 저장하고 촬영 시각을 돌려준다.
 * 줄이면 EXIF가 사라지므로 촬영 시각은 원본에서 먼저 읽는다. EXIF가 없으면 파일 수정 시각을 쓴다.
 */
export async function importPhoto(repo: DiaryRepository, file: File): Promise<{ id: string; takenAt: Date }> {
  let takenAt: Date | null = null;
  try {
    takenAt = readExifDate(await file.slice(0, 256 * 1024).arrayBuffer());
  } catch {
    // EXIF가 깨진 사진은 수정 시각으로 대신한다
  }
  const id = await repo.savePhoto(await compressImage(file));
  return { id, takenAt: takenAt ?? new Date(file.lastModified) };
}
