import { createStore, del, get, getMany, set, type UseStore } from "idb-keyval";
import {
  addDays,
  daysBetween,
  emptyLog,
  type ClientProfile,
  type DailyLog,
  type DiaryRepository,
  type ISODate,
} from "@diet/core";

/**
 * 브라우저(IndexedDB)에 저장하는 저장소. 로그인 없이 바로 써볼 수 있는 체험용이며,
 * Supabase 연결 후에는 같은 DiaryRepository를 구현한 서버 저장소로 교체한다.
 */
export class LocalDiaryRepository implements DiaryRepository {
  private store: UseStore;

  constructor() {
    this.store = createStore("diet-design", "kv");
  }

  async getProfile(): Promise<ClientProfile> {
    return (await get<ClientProfile>("profile", this.store)) ?? { name: "" };
  }

  async saveProfile(profile: ClientProfile): Promise<void> {
    await set("profile", profile, this.store);
  }

  async getLog(date: ISODate): Promise<DailyLog> {
    return (await get<DailyLog>(logKey(date), this.store)) ?? emptyLog(date);
  }

  async getLogs(from: ISODate, to: ISODate): Promise<DailyLog[]> {
    const dates = Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i));
    const logs = await getMany<DailyLog | undefined>(dates.map(logKey), this.store);
    return dates.map((date, i) => logs[i] ?? emptyLog(date));
  }

  async saveLog(log: DailyLog): Promise<void> {
    await set(logKey(log.date), log, this.store);
  }

  async savePhoto(file: Blob): Promise<string> {
    const id = crypto.randomUUID();
    // 아이폰 Safari는 Blob을 IndexedDB에 넣다가 실패하는 경우가 있어 바이트 배열로 저장한다
    const stored: StoredPhoto = { type: file.type || "image/jpeg", data: await file.arrayBuffer() };
    await set(photoKey(id), stored, this.store);
    return id;
  }

  async getPhotoUrl(photoId: string): Promise<string | null> {
    const stored = await get<StoredPhoto | Blob>(photoKey(photoId), this.store);
    if (!stored) return null;
    const blob = stored instanceof Blob ? stored : new Blob([stored.data], { type: stored.type });
    return URL.createObjectURL(blob);
  }

  async deletePhoto(photoId: string): Promise<void> {
    await del(photoKey(photoId), this.store);
  }
}

/** 사진 저장 형식. 예전 버전은 Blob을 그대로 저장했으므로 읽을 때 둘 다 받는다 */
interface StoredPhoto {
  type: string;
  data: ArrayBuffer;
}

const logKey = (date: ISODate) => `log:${date}`;
const photoKey = (id: string) => `photo:${id}`;
