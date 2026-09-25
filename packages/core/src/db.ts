import type { DailyExercise, Exercise } from "./exercise";
import type { ClientProfile, DailyLog, HHMM, ISODate, Meal, MealSlot } from "./types";

/**
 * 서버(Supabase) 표의 한 줄 ↔ 앱의 기록. supabase/migrations/0001_init.sql 과 맞춘다.
 * Postgres의 time은 "07:30:00", numeric은 문자열로 올 수 있어 여기서 맞춘다.
 */
export interface DailyLogRow {
  id?: string;
  client_id: string;
  date: ISODate;
  sleep_start: string | null;
  sleep_end: string | null;
  weight_kg: number | string | null;
  waist_cm: number | string | null;
  bowel_count: number | null;
  skipped_meals: string[];
  exercise: DailyExercise | null;
  submitted_at: string | null;
  updated_at?: string;
  meals?: MealRow[];
}

export interface MealRow {
  id: string;
  log_id?: string;
  time: string;
  description: string;
  fullness: number | null;
  /** 사진 저장소 안의 경로 */
  photo_paths: string[];
}

export interface ProfileRow {
  id: string;
  role: "client" | "coach";
  name: string;
  coach_id: string | null;
  period_tracking: boolean;
  period_expected_date: ISODate | null;
  routine: Exercise[] | null;
  hidden_foods: string[] | null;
  sensitive_data_consented_at: string | null;
}

const toTime = (value: string | null): HHMM | undefined => (value ? value.slice(0, 5) : undefined);
const toNumber = (value: number | string | null): number | undefined =>
  value === null || value === "" ? undefined : Number(value);

export function rowToLog(row: DailyLogRow): DailyLog {
  const log: DailyLog = {
    date: row.date,
    morning: {
      sleepStart: toTime(row.sleep_start),
      sleepEnd: toTime(row.sleep_end),
      weightKg: toNumber(row.weight_kg),
      waistCm: toNumber(row.waist_cm),
      bowelCount: row.bowel_count ?? undefined,
    },
    meals: (row.meals ?? []).map(rowToMeal),
  };
  // 값이 없는 칸은 아예 빼서, 브라우저 저장 기록과 모양을 같게 한다
  for (const key of Object.keys(log.morning) as (keyof typeof log.morning)[]) {
    if (log.morning[key] === undefined) delete log.morning[key];
  }
  if (row.submitted_at) log.submittedAt = row.submitted_at;
  if (row.updated_at) log.updatedAt = row.updated_at;
  if (row.skipped_meals?.length) log.skippedMeals = row.skipped_meals as MealSlot[];
  if (row.exercise) log.exercise = row.exercise;
  return log;
}

export function logToRow(log: DailyLog, clientId: string): Omit<DailyLogRow, "id" | "meals"> {
  const m = log.morning;
  return {
    client_id: clientId,
    date: log.date,
    sleep_start: m.sleepStart ?? null,
    sleep_end: m.sleepEnd ?? null,
    weight_kg: m.weightKg ?? null,
    waist_cm: m.waistCm ?? null,
    bowel_count: m.bowelCount ?? null,
    skipped_meals: log.skippedMeals ?? [],
    exercise: log.exercise ?? null,
    submitted_at: log.submittedAt ?? null,
    updated_at: log.updatedAt ?? new Date().toISOString(),
  };
}

export function rowToMeal(row: MealRow): Meal {
  const meal: Meal = { id: row.id, time: toTime(row.time)!, description: row.description, photoIds: row.photo_paths ?? [] };
  if (row.fullness) meal.fullness = row.fullness;
  return meal;
}

export function mealToRow(meal: Meal, logId: string): MealRow {
  return {
    id: meal.id,
    log_id: logId,
    time: meal.time,
    description: meal.description,
    fullness: meal.fullness ?? null,
    photo_paths: meal.photoIds,
  };
}

export function rowToProfile(row: ProfileRow): ClientProfile {
  const profile: ClientProfile = { name: row.name };
  if (!row.period_tracking) profile.periodTracking = false;
  if (row.period_expected_date) profile.periodExpectedDate = row.period_expected_date;
  if (row.routine?.length) profile.routine = row.routine;
  if (row.hidden_foods?.length) profile.hiddenFoods = row.hidden_foods;
  return profile;
}

/** 고객이 고칠 수 있는 칸만 (역할·담당 코치는 서버에서 막는다) */
export function profileToUpdate(profile: ClientProfile) {
  return {
    name: profile.name,
    period_tracking: profile.periodTracking !== false,
    period_expected_date: profile.periodExpectedDate ?? null,
    routine: profile.routine ?? [],
    hidden_foods: profile.hiddenFoods ?? [],
  };
}
