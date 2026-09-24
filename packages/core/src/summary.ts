import { sleepMinutes, timelineMinutes, toHHMM } from "./time";
import type { DailyLog, HHMM } from "./types";

/** 이 시각 이후에 먹으면 야식으로 센다 */
export const LATE_MEAL_FROM = 21 * 60;

export interface WeekSummary {
  /** 기록이 하나라도 있는 날 수 */
  loggedDays: number;
  /** 평균 수면 (분) */
  avgSleep: number | null;
  /** 평균 기상·취침 시각 (타임라인 분: 자정 넘은 취침은 24시 이후로 센다) */
  avgWake: number | null;
  avgBed: number | null;
  avgFirstMeal: number | null;
  avgLastMeal: number | null;
  /** 식사를 기록한 날의 하루 평균 식사 횟수 */
  mealsPerDay: number | null;
  /** 밤 9시 이후 식사 횟수 */
  lateMeals: number;
  avgFullness: number | null;
  /** 주의 첫 기록과 마지막 기록 */
  weight: { first: number; last: number } | null;
  waist: { first: number; last: number } | null;
}

/**
 * 한 주 요약. logs는 월요일부터 날짜순이며, 일요일 밤 취침 시각을 알기 위해
 * 다음 주 월요일 기록까지 8개를 넘길 수 있다 (없으면 7개).
 */
export function summarizeWeek(logs: DailyLog[]): WeekSummary {
  const week = logs.slice(0, 7);
  const sleeps: number[] = [];
  const wakes: number[] = [];
  const beds: number[] = [];
  const firsts: number[] = [];
  const lasts: number[] = [];
  const mealCounts: number[] = [];
  const fullness: number[] = [];
  let lateMeals = 0;

  week.forEach((log, i) => {
    const { sleepStart, sleepEnd } = log.morning;
    if (sleepStart && sleepEnd) sleeps.push(sleepMinutes(sleepStart, sleepEnd));
    if (sleepEnd) wakes.push(timelineMinutes(sleepEnd));
    const bed = logs[i + 1]?.morning.sleepStart;
    if (bed) beds.push(timelineMinutes(bed));

    const times = log.meals.map((m) => timelineMinutes(m.time)).sort((a, b) => a - b);
    if (times.length) {
      firsts.push(times[0]);
      lasts.push(times[times.length - 1]);
      mealCounts.push(times.length);
    }
    lateMeals += times.filter((t) => t >= LATE_MEAL_FROM).length;
    log.meals.forEach((m) => m.fullness && fullness.push(m.fullness));
  });

  return {
    loggedDays: week.filter((l) => l.meals.length || Object.values(l.morning).some((v) => v !== undefined)).length,
    avgSleep: average(sleeps),
    avgWake: average(wakes),
    avgBed: average(beds),
    avgFirstMeal: average(firsts),
    avgLastMeal: average(lasts),
    mealsPerDay: average(mealCounts, 1),
    lateMeals,
    avgFullness: average(fullness, 1),
    weight: firstLast(week.map((l) => l.morning.weightKg)),
    waist: firstLast(week.map((l) => l.morning.waistCm)),
  };
}

function average(values: number[], digits = 0): number | null {
  if (!values.length) return null;
  const factor = 10 ** digits;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * factor) / factor;
}

function firstLast(values: (number | undefined)[]): { first: number; last: number } | null {
  const present = values.filter((v): v is number => v !== undefined);
  return present.length ? { first: present[0], last: present[present.length - 1] } : null;
}

/** 타임라인 분(자정 넘으면 24시 이후)을 시각으로 */
export function formatClock(timelineMinutes: number): HHMM {
  return toHHMM(Math.round(timelineMinutes));
}
