import type { ISODate } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toUTC(date: ISODate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`잘못된 날짜 형식: ${date}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 기기의 현지 시간 기준 오늘 날짜 */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

/** b - a (일) */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** 0=일요일 ... 6=토요일 */
export function dayOfWeek(date: ISODate): number {
  return new Date(toUTC(date)).getUTCDay();
}

/** 기록지처럼 월요일에 시작하는 주의 첫날 */
export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -((dayOfWeek(date) + 6) % 7));
}

export function weekDates(date: ISODate): ISODate[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayKo(date: ISODate): string {
  return WEEKDAY_KO[dayOfWeek(date)];
}

export function weekdayEn(date: ISODate): string {
  return WEEKDAY_EN[dayOfWeek(date)];
}

/** "9월 24일 (수)" */
export function formatDateKo(date: ISODate): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 (${weekdayKo(date)})`;
}

/** 일요일은 코칭이 쉬는 날 */
export function isCoachingDay(date: ISODate): boolean {
  return dayOfWeek(date) !== 0;
}
