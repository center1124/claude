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

/** 파일 수정 시각이 이보다 최근이면 방금 카메라로 찍은 사진으로 본다 */
const JUST_TAKEN_MS = 2 * 60 * 1000;

/**
 * 사진을 줄여서 저장하고 촬영 시각을 돌려준다.
 * 줄이면 EXIF가 사라지므로 촬영 시각은 원본에서 먼저 읽는다.
 * EXIF가 없으면 방금 찍은 사진일 때만 지금 시각을 쓰고, 아니면(캡처·다운로드한 사진 등) null.
 */
export async function importPhoto(
  repo: DiaryRepository,
  file: File,
): Promise<{ id: string; takenAt: Date | null }> {
  let takenAt: Date | null = null;
  try {
    takenAt = readExifDate(await file.slice(0, 256 * 1024).arrayBuffer());
  } catch {
    // EXIF가 깨진 사진은 시각을 모르는 사진으로 다룬다
  }
  if (!takenAt && Date.now() - file.lastModified < JUST_TAKEN_MS) takenAt = new Date();
  const id = await repo.savePhoto(await compressImage(file));
  return { id, takenAt };
}
