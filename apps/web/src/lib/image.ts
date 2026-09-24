import { readExifDate, type DiaryRepository } from "@diet/core";

const MAX_SIDE = 1280;

/**
 * 폰 사진은 용량이 크므로 긴 변 1280px JPEG로 줄여서 저장한다.
 * 아이폰 Safari에서도 잘 되도록 createImageBitmap 대신 <img>로 읽는다.
 */
export async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ?? file;
  } catch {
    return file; // 브라우저가 해석하지 못하는 형식은 원본 그대로
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 어느 단계에서 실패했는지 알려주기 위한 오류 */
class PhotoStepError extends Error {
  constructor(
    readonly step: string,
    readonly cause: unknown,
  ) {
    super(step);
  }
}

async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new PhotoStepError(name, error);
  }
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
  const compressed = await step("줄이기", () => compressImage(file));
  const id = await step("저장", () => repo.savePhoto(compressed));
  return { id, takenAt };
}

/** 사진 저장 실패 원인을 고객이 알 수 있게 (문제 신고 시 그대로 전달받기 위해 원문도 붙인다) */
export function photoErrorMessage(error: unknown): string {
  const stepName = error instanceof PhotoStepError ? error.step : "처리";
  const cause = error instanceof PhotoStepError ? error.cause : error;
  const detail =
    cause instanceof Error ? `${cause.name}: ${cause.message}` : cause == null ? "원인 정보 없음" : String(cause);
  return `사진 ${stepName} 단계에서 실패했어요. (${detail}) 이 화면을 캡처해서 알려주세요.`;
}
