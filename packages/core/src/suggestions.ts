import { compareTimelineTime, timelineMinutes, toHHMM } from "./time";
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

export interface ParsedMeal {
  time: HHMM;
  description: string;
  fullness?: number;
}

/**
 * "한 번에 쓰기": 종이 기록지처럼 여러 줄로 쓴 하루 식사를 나눈다.
 *   9:00 과채스무디
 *   12:30 돌솥비빔밥 포만 8
 *   + 밥 추가            ← 시각 없는 줄은 앞 식사에 이어 붙인다
 *   오후 3시 쿠키 1개
 * 오전/오후가 없으면 앞 식사 이후의 가장 가까운 시각으로 본다 (첫 줄의 1~5시는 오후).
 */
export function parseDayText(text: string): ParsedMeal[] {
  const meals: ParsedMeal[] = [];
  let previous = -Infinity;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const match = /^(오전|오후|아침|저녁|밤)?\s*(\d{1,2})(?:\s*[:：.]\s*(\d{2})|\s*시(?:\s*(\d{1,2})\s*분|\s*반)?)\s*(.*)$/.exec(line);
    if (!match) {
      const last = meals.at(-1);
      if (last) Object.assign(last, withFullness(`${last.description}\n${line}`, last.fullness));
      continue;
    }
    const [, period, h, colonMinutes, koMinutes, rest] = match;
    const hour = Number(h);
    const minute = Number(colonMinutes ?? koMinutes ?? (/시\s*반/.test(line) ? 30 : 0));
    if (hour > 24 || minute > 59) continue;

    const time = resolveHour(hour % 24, minute, period, previous);
    previous = timelineMinutes(time);
    meals.push({ time, ...withFullness(rest.trim()) });
  }
  return meals;
}

function resolveHour(hour: number, minute: number, period: string | undefined, previous: number): HHMM {
  if (period === "오전" || period === "아침") return toHHMM((hour % 12) * 60 + minute);
  if (period === "오후" || period === "저녁" || period === "밤") return toHHMM(((hour % 12) + 12) * 60 + minute);
  if (hour > 12 || hour === 0) return toHHMM(hour * 60 + minute);

  const am = toHHMM((hour % 12) * 60 + minute);
  const pm = toHHMM(((hour % 12) + 12) * 60 + minute);
  if (previous === -Infinity) return hour >= 1 && hour <= 5 ? pm : am;
  const later = [am, pm].filter((t) => timelineMinutes(t) >= previous).sort(compareTimelineTime);
  return later[0] ?? pm;
}

/** "돌솥비빔밥 포만 8" → 설명 "돌솥비빔밥", 포만감 8 */
function withFullness(text: string, fullness?: number): { description: string; fullness?: number } {
  const match = /\s*포만감?\s*(10|[1-9])\s*$/.exec(text);
  if (!match) return { description: text, fullness };
  return { description: text.slice(0, match.index).trim(), fullness: Number(match[1]) };
}
