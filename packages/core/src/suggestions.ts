import type { DailyLog, Meal } from "./types";

/**
 * 자주 먹는 음식 버튼. 식사 설명의 줄 단위("밥 200g", "쿠키 1개")로 세어
 * 많이 먹은 순, 같으면 최근 순으로 돌려준다. logs는 날짜순(오래된 → 최근)이라고 가정한다.
 */
export function frequentFoods(logs: DailyLog[], limit = 8): string[] {
  const stats = new Map<string, { count: number; last: number }>();
  let order = 0;
  for (const log of logs) {
    for (const meal of log.meals) {
      for (const line of meal.description.split("\n")) {
        const food = line.trim().replace(/^\+\s*/, "");
        if (!food) continue;
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
