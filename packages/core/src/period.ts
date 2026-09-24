import { daysBetween } from "./date";
import type { ISODate } from "./types";

/** 생리 예정일 전후로 기록하는 기간 (D-7 ~ D+7) */
export const PERIOD_WINDOW_DAYS = 7;

/**
 * 예정일 기준 D-day 표기. 기록 기간(D-7 ~ D+7) 밖이면 null.
 * 예: 예정일 3일 전 → "D-3", 당일 → "D-day", 2일 후 → "D+2"
 */
export function periodDday(date: ISODate, expectedDate?: ISODate): string | null {
  if (!expectedDate) return null;
  const diff = daysBetween(expectedDate, date);
  if (Math.abs(diff) > PERIOD_WINDOW_DAYS) return null;
  if (diff === 0) return "D-day";
  return diff < 0 ? `D${diff}` : `D+${diff}`;
}
