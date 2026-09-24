import type { HHMM } from "./types";

const DAY_MINUTES = 24 * 60;

export function parseHHMM(value: HHMM): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`잘못된 시각 형식: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`잘못된 시각: ${value}`);
  return hours * 60 + minutes;
}

export function toHHMM(totalMinutes: number): HHMM {
  const m = ((totalMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 잠든 시각 → 깬 시각 사이의 분. 자정을 넘기면 다음 날로 본다. */
export function sleepMinutes(start: HHMM, end: HHMM): number {
  const diff = parseHHMM(end) - parseHHMM(start);
  return diff <= 0 ? diff + DAY_MINUTES : diff;
}

/** 420 → "7:00" (기록지 표기 방식) */
export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * 하루 타임라인 축. 기록지처럼 아침 6시에 시작해 다음 날 새벽 2시에 끝난다.
 * 새벽 시각(00:00~05:59)은 전날 밤의 연장으로 본다.
 */
export const TIMELINE_START = 6 * 60;
export const TIMELINE_END = 26 * 60;

export function timelineMinutes(time: HHMM): number {
  const m = parseHHMM(time);
  return m < TIMELINE_START ? m + DAY_MINUTES : m;
}

/** 타임라인 위 위치 (0~1) */
export function timelinePosition(time: HHMM): number {
  const m = Math.min(Math.max(timelineMinutes(time), TIMELINE_START), TIMELINE_END);
  return (m - TIMELINE_START) / (TIMELINE_END - TIMELINE_START);
}

/** 식사를 타임라인 순서로 정렬할 때 쓰는 비교 함수 */
export function compareTimelineTime(a: HHMM, b: HHMM): number {
  return timelineMinutes(a) - timelineMinutes(b);
}

export interface Segment {
  /** 0~1 */
  from: number;
  to: number;
}

/**
 * 하루 타임라인에 칠할 수면 구간 (기록지의 형광펜).
 * - wakeTime: 그날 아침 일어난 시각 → 축 시작부터 기상까지
 * - bedTime: 그날 밤 잠든 시각(다음 날 기록의 sleepStart) → 취침부터 축 끝까지
 * 축 바깥(06:00 전 기상, 02:00 이후 취침)은 칠하지 않는다.
 */
export function sleepSegments(wakeTime?: HHMM, bedTime?: HHMM): Segment[] {
  const segments: Segment[] = [];
  if (wakeTime && parseHHMM(wakeTime) > TIMELINE_START) {
    segments.push({ from: 0, to: timelinePosition(wakeTime) });
  }
  if (bedTime && timelineMinutes(bedTime) < TIMELINE_END) {
    segments.push({ from: timelinePosition(bedTime), to: 1 });
  }
  return segments;
}

/** 축 위 정각 눈금: 7시 ~ 새벽 1시 (기록지와 같은 표기) */
export function timelineHours(): { label: string; position: number }[] {
  const hours: { label: string; position: number }[] = [];
  for (let h = TIMELINE_START / 60 + 1; h < TIMELINE_END / 60; h++) {
    hours.push({ label: String(h % 12 || 12), position: (h * 60 - TIMELINE_START) / (TIMELINE_END - TIMELINE_START) });
  }
  return hours;
}

/** 타임라인 위 위치(0~1)를 시각으로. step분 단위로 반올림한다 (타임라인을 눌러 기록할 때) */
export function timeFromTimelinePosition(fraction: number, step = 10): HHMM {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const minutes = TIMELINE_START + clamped * (TIMELINE_END - TIMELINE_START);
  return toHHMM(Math.round(minutes / step) * step);
}

/** 끼니 버튼: 누르면 대표 시각이 들어가고, 필요하면 고친다 */
export const MEAL_TIME_PRESETS: { label: string; time: HHMM }[] = [
  { label: "아침", time: "08:00" },
  { label: "점심", time: "12:30" },
  { label: "간식", time: "15:30" },
  { label: "저녁", time: "19:00" },
  { label: "야식", time: "22:30" },
];

/** 수면 줄을 눌렀을 때 이 시각 이전이면 일어난 시각, 이후면 잠든 시각으로 본다 */
export const SLEEP_TAP_SPLIT = 14 * 60;

export function sleepTapTarget(time: HHMM): "wake" | "bed" {
  return timelineMinutes(time) < SLEEP_TAP_SPLIT ? "wake" : "bed";
}
