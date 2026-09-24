import type { ClientProfile, DailyLog, ISODate } from "./types";

/**
 * 기록 저장소. 웹(브라우저 저장소 / Supabase)과 나중의 모바일 앱이
 * 같은 인터페이스를 구현해 화면 코드가 저장 방식을 몰라도 되게 한다.
 */
export interface DiaryRepository {
  getProfile(): Promise<ClientProfile>;
  saveProfile(profile: ClientProfile): Promise<void>;

  /** 기록이 없으면 빈 기록을 돌려준다 */
  getLog(date: ISODate): Promise<DailyLog>;
  /** from ~ to (양 끝 포함), 날짜순. 기록이 없는 날은 빈 기록으로 채운다 */
  getLogs(from: ISODate, to: ISODate): Promise<DailyLog[]>;
  saveLog(log: DailyLog): Promise<void>;
  /** 하루 기록과 그 날 사진을 지운다 */
  deleteLog(date: ISODate): Promise<void>;
  /** 모든 하루 기록과 사진을 지운다 (설정·루틴은 남긴다) */
  deleteAllLogs(): Promise<void>;

  savePhoto(file: Blob): Promise<string>;
  /** 사진을 화면에 띄울 수 있는 URL */
  getPhotoUrl(photoId: string): Promise<string | null>;
  deletePhoto(photoId: string): Promise<void>;
}
