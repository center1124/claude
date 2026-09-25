import { timelineMinutes } from "./time";
import type { DailyLog, HHMM, Meal } from "./types";

/**
 * 자주 먹는 음식 버튼. 식사 설명의 줄 단위("밥 200g", "쿠키 1개")로 세어
 * 많이 먹은 순, 같으면 최근 순으로 돌려준다. logs는 날짜순(오래된 → 최근)이라고 가정한다.
 */
export function frequentFoods(logs: DailyLog[], limit = 8): string[] {
  const stats = new Map<string, { count: number; last: number }>();
  let order = 0;
  for (const log of logs) {
    for (const meal of log.meals) {
      for (const food of splitFoods(meal.description)) {
        const s = stats.get(food) ?? { count: 0, last: 0 };
        stats.set(food, { count: s.count + 1, last: ++order });
      }
    }
  }
  return [...stats.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map(([food]) => food);
}

/** 버튼으로 만들기에 너무 긴 말 (말로 기록한 한 끼 전체 같은 것) */
const MAX_FOOD_LENGTH = 14;

/**
 * 식사 설명을 음식 단위로: 줄바꿈·쉼표·"+"로 나누고, 앞의 끼니 이름("점심")은 뗀다.
 * 너무 긴 말은 음식 하나로 보지 않는다.
 */
export function splitFoods(description: string): string[] {
  return description
    .split(/\n|,|·|\+/)
    .map((f) => f.trim().replace(/^(아침|점심|저녁|간식|야식)\s*(?:은|는|에|으로)?\s+/, ""))
    .filter((f) => f && f.length <= MAX_FOOD_LENGTH);
}

/** "최근 식사 그대로" 목록: 설명이 겹치지 않는 최근 식사들 (최근 → 오래된) */
export function recentMeals(logs: DailyLog[], limit = 5): Meal[] {
  const seen = new Set<string>();
  const result: Meal[] = [];
  for (const log of [...logs].reverse()) {
    for (const meal of [...log.meals].reverse()) {
      const key = meal.description.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(meal);
      if (result.length === limit) return result;
    }
  }
  return result;
}

/**
 * 새 식사에 미리 채워 둘 예시: 가장 최근 날 중 비슷한 시각(±window분)에 먹은 식사.
 * logs는 날짜순(오래된 → 최근)이며, 오늘 기록은 넣지 않는다.
 */
export function similarTimeMeal(logs: DailyLog[], time: HHMM, window = 90): Meal | null {
  const target = timelineMinutes(time);
  for (const log of [...logs].reverse()) {
    let best: Meal | null = null;
    let bestDiff = Infinity;
    for (const meal of log.meals) {
      const diff = Math.abs(timelineMinutes(meal.time) - target);
      if (meal.description.trim() && diff <= window && diff < bestDiff) {
        best = meal;
        bestDiff = diff;
      }
    }
    if (best) return best;
  }
  return null;
}

export interface PhotoGroup<T> {
  /** 첫 사진의 촬영 시각. 시각을 모르는 사진 묶음이면 null */
  takenAt: Date | null;
  items: T[];
}

/**
 * 한꺼번에 고른 사진을 식사별로 나눈다: 촬영 시각 순으로 정렬해 gap분 이상 벌어지면 다른 식사.
 * 촬영 시각을 모르는 사진은 마지막에 하나로 묶는다.
 */
export function groupPhotosIntoMeals<T extends { takenAt: Date | null }>(items: T[], gap = 30): PhotoGroup<T>[] {
  const timed = items.filter((i) => i.takenAt).sort((a, b) => a.takenAt!.getTime() - b.takenAt!.getTime());
  const groups: PhotoGroup<T>[] = [];
  for (const item of timed) {
    const last = groups.at(-1);
    const prev = last?.items.at(-1)?.takenAt;
    if (last && prev && item.takenAt!.getTime() - prev.getTime() < gap * 60_000) last.items.push(item);
    else groups.push({ takenAt: item.takenAt, items: [item] });
  }
  const untimed = items.filter((i) => !i.takenAt);
  if (untimed.length) groups.push({ takenAt: null, items: untimed });
  return groups;
}

/**
 * "어제처럼" 수면: 가장 최근 날(최대 7일 전까지) 중 일어난 시각이 있는 기록의 잠든·일어난 시각.
 * logs는 날짜순(오래된 → 최근)이며, 오늘 기록은 넣지 않는다.
 */
export function previousSleep(logs: DailyLog[], maxDays = 7): { sleepStart?: HHMM; sleepEnd: HHMM } | null {
  for (const log of logs.slice(-maxDays).reverse()) {
    if (log.morning.sleepEnd) return { sleepStart: log.morning.sleepStart, sleepEnd: log.morning.sleepEnd };
  }
  return null;
}
