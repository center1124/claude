import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  daysBetween,
  emptyLog,
  logToRow,
  mealToRow,
  profileToUpdate,
  rowToLog,
  rowToProfile,
  type ClientProfile,
  type DailyLog,
  type DailyLogRow,
  type DiaryRepository,
  type ISODate,
  type ProfileRow,
} from "@diet/core";

const SAVE_DELAY = 700;
const RETRY_DELAY = 5000;
const PHOTO_BUCKET = "meal-photos";
/** 사진 주소는 1시간 동안 쓸 수 있고, 만료 5분 전에 새로 받는다 */
const SIGNED_URL_SECONDS = 3600;

export type SaveStatus = "saved" | "saving" | "error";

/**
 * 서버(Supabase)에 저장하는 저장소. 로그인한 고객 한 명의 기록만 다룬다.
 * 글자를 쓸 때마다 저장이 불리므로 잠깐 모았다가 한 번에 보낸다. 실패하면 다시 시도한다.
 */
export class SupabaseDiaryRepository implements DiaryRepository {
  private pendingLogs = new Map<ISODate, DailyLog>();
  private timers = new Map<ISODate | "profile", ReturnType<typeof setTimeout>>();
  private pendingProfile: ClientProfile | null = null;
  /** 같은 날 기록을 동시에 두 번 보내지 않도록 차례로 보낸다 */
  private queue: Promise<unknown> = Promise.resolve();
  private photoUrls = new Map<string, { url: string; expires: number }>();

  constructor(
    private sb: SupabaseClient,
    private userId: string,
    private onStatus: (status: SaveStatus) => void = () => {},
  ) {}

  async getProfile(): Promise<ClientProfile> {
    if (this.pendingProfile) return this.pendingProfile;
    const { data, error } = await this.sb.from("profiles").select("*").eq("id", this.userId).single<ProfileRow>();
    if (error) throw error;
    return rowToProfile(data);
  }

  async saveProfile(profile: ClientProfile): Promise<void> {
    this.pendingProfile = profile;
    this.schedule("profile");
  }

  async getLog(date: ISODate): Promise<DailyLog> {
    const pending = this.pendingLogs.get(date);
    if (pending) return pending;
    const { data, error } = await this.sb
      .from("daily_logs")
      .select("*, meals(*)")
      .eq("client_id", this.userId)
      .eq("date", date)
      .maybeSingle<DailyLogRow>();
    if (error) throw error;
    return data ? rowToLog(data) : emptyLog(date);
  }

  async getLogs(from: ISODate, to: ISODate): Promise<DailyLog[]> {
    const { data, error } = await this.sb
      .from("daily_logs")
      .select("*, meals(*)")
      .eq("client_id", this.userId)
      .gte("date", from)
      .lte("date", to)
      .returns<DailyLogRow[]>();
    if (error) throw error;
    const byDate = new Map(data.map((row) => [row.date, rowToLog(row)]));
    return Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => {
      const date = addDays(from, i);
      return this.pendingLogs.get(date) ?? byDate.get(date) ?? emptyLog(date);
    });
  }

  async saveLog(log: DailyLog): Promise<void> {
    this.pendingLogs.set(log.date, log);
    this.schedule(log.date);
  }

  /** 모으지 않고 바로 보낸다 (이 기기 기록 올리기 등) */
  async saveLogNow(log: DailyLog): Promise<void> {
    await this.enqueue(() => this.writeLog(log));
  }

  async deleteLog(date: ISODate): Promise<void> {
    this.cancel(date);
    await this.enqueue(async () => {
      const { data, error } = await this.sb
        .from("daily_logs")
        .select("id, meals(photo_paths)")
        .eq("client_id", this.userId)
        .eq("date", date)
        .maybeSingle<{ id: string; meals: { photo_paths: string[] }[] }>();
      if (error) throw error;
      if (!data) return;
      await this.removePhotos(data.meals.flatMap((m) => m.photo_paths));
      const { error: deleteError } = await this.sb.from("daily_logs").delete().eq("id", data.id);
      if (deleteError) throw deleteError;
    });
  }

  async deleteAllLogs(): Promise<void> {
    for (const date of [...this.pendingLogs.keys()]) this.cancel(date);
    await this.enqueue(async () => {
      const { data, error } = await this.sb
        .from("daily_logs")
        .select("meals(photo_paths)")
        .eq("client_id", this.userId)
        .returns<{ meals: { photo_paths: string[] }[] }[]>();
      if (error) throw error;
      await this.removePhotos(data.flatMap((l) => l.meals.flatMap((m) => m.photo_paths)));
      const { error: deleteError } = await this.sb.from("daily_logs").delete().eq("client_id", this.userId);
      if (deleteError) throw deleteError;
    });
  }

  async savePhoto(file: Blob): Promise<string> {
    // 첫 폴더가 고객 id여야 서버가 올리기를 허락한다
    const path = `${this.userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await this.sb.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg" });
    if (error) throw error;
    return path;
  }

  async getPhotoUrl(photoId: string): Promise<string | null> {
    const cached = this.photoUrls.get(photoId);
    if (cached && cached.expires > Date.now()) return cached.url;
    const { data, error } = await this.sb.storage.from(PHOTO_BUCKET).createSignedUrl(photoId, SIGNED_URL_SECONDS);
    if (error || !data) return null;
    this.photoUrls.set(photoId, { url: data.signedUrl, expires: Date.now() + (SIGNED_URL_SECONDS - 300) * 1000 });
    return data.signedUrl;
  }

  async deletePhoto(photoId: string): Promise<void> {
    await this.removePhotos([photoId]);
  }

  /** 모아 둔 저장을 지금 보낸다 (로그아웃·화면 닫기 전) */
  async flush(): Promise<void> {
    const keys = [...this.timers.keys()];
    for (const key of keys) clearTimeout(this.timers.get(key));
    this.timers.clear();
    await Promise.all(keys.map((key) => this.write(key)));
  }

  private schedule(key: ISODate | "profile", delay = SAVE_DELAY) {
    clearTimeout(this.timers.get(key));
    this.onStatus("saving");
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        void this.write(key);
      }, delay),
    );
  }

  private cancel(date: ISODate) {
    clearTimeout(this.timers.get(date));
    this.timers.delete(date);
    this.pendingLogs.delete(date);
  }

  private async write(key: ISODate | "profile") {
    const value = key === "profile" ? this.pendingProfile : this.pendingLogs.get(key);
    if (!value) return;
    try {
      await this.enqueue(() =>
        key === "profile" ? this.writeProfile(value as ClientProfile) : this.writeLog(value as DailyLog),
      );
      // 보내는 동안 또 고쳤으면 그 내용은 남겨 둔다
      if (key === "profile") {
        if (this.pendingProfile === value) this.pendingProfile = null;
      } else if (this.pendingLogs.get(key) === value) {
        this.pendingLogs.delete(key);
      }
      if (this.timers.size === 0) this.onStatus("saved");
    } catch (error) {
      console.error("서버 저장 실패", error);
      if (!this.timers.has(key)) this.schedule(key, RETRY_DELAY);
      this.onStatus("error");
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => {});
    return run;
  }

  private async writeProfile(profile: ClientProfile) {
    const { error } = await this.sb.from("profiles").update(profileToUpdate(profile)).eq("id", this.userId);
    if (error) throw error;
  }

  private async writeLog(log: DailyLog) {
    const { data, error } = await this.sb
      .from("daily_logs")
      .upsert(logToRow(log, this.userId), { onConflict: "client_id,date" })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    const logId = data.id;

    if (log.meals.length) {
      const { error: mealError } = await this.sb.from("meals").upsert(log.meals.map((m) => mealToRow(m, logId)));
      if (mealError) throw mealError;
    }
    // 지운 식사는 서버에서도 지운다
    let removed = this.sb.from("meals").delete().eq("log_id", logId);
    if (log.meals.length) removed = removed.not("id", "in", `(${log.meals.map((m) => m.id).join(",")})`);
    const { error: removeError } = await removed;
    if (removeError) throw removeError;
  }

  private async removePhotos(paths: string[]) {
    for (const path of paths) this.photoUrls.delete(path);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await this.sb.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
  }
}
