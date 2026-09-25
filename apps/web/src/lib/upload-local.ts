import { hasContent, type ClientProfile, type DailyLog } from "@diet/core";
import { LocalDiaryRepository } from "./local-repository";
import type { SupabaseDiaryRepository } from "./supabase-repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 체험판으로 이 기기에 적어 둔 기록 (내용이 있는 날만) */
export async function localLogsToUpload(): Promise<DailyLog[]> {
  return (await new LocalDiaryRepository().allLogs()).filter(hasContent);
}

/**
 * 이 기기의 체험 기록을 서버로 올린다. 서버에 이미 적힌 날은 건너뛴다.
 * 다 올리면 이 기기의 체험 기록은 지운다 (설정은 서버에 비어 있는 칸만 채운다).
 */
export async function uploadLocalRecords(server: SupabaseDiaryRepository) {
  const local = new LocalDiaryRepository();
  const logs = await localLogsToUpload();
  let uploaded = 0;
  let skipped = 0;

  for (const log of logs) {
    if (hasContent(await server.getLog(log.date))) {
      skipped++;
      continue;
    }
    const meals = [];
    for (const meal of log.meals) {
      const photoIds = [];
      for (const id of meal.photoIds) {
        const url = await local.getPhotoUrl(id);
        if (!url) continue;
        photoIds.push(await server.savePhoto(await (await fetch(url)).blob()));
      }
      meals.push({ ...meal, id: UUID.test(meal.id) ? meal.id : crypto.randomUUID(), photoIds });
    }
    await server.saveLogNow({ ...log, meals });
    uploaded++;
  }

  const [mine, theirs] = await Promise.all([local.getProfile(), server.getProfile()]);
  const merged: ClientProfile = {
    ...theirs,
    name: theirs.name || mine.name,
    routine: theirs.routine?.length ? theirs.routine : mine.routine,
    hiddenFoods: [...new Set([...(theirs.hiddenFoods ?? []), ...(mine.hiddenFoods ?? [])])],
    periodExpectedDate: theirs.periodExpectedDate ?? mine.periodExpectedDate,
  };
  await server.saveProfile(merged);
  await server.flush();

  await local.deleteAllLogs();
  return { uploaded, skipped };
}
