import { addDays, todayISO } from "./date";
import { timelineMinutes, toHHMM } from "./time";
import type { DailyLog, HHMM, ISODate, MealSlot } from "./types";

/** 다음 날 이 시각(현지)에 자동으로 코치에게 보낸다 */
export const AUTO_SUBMIT_HOUR = 9;

export function autoSubmitAt(date: ISODate): Date {
  const [y, m, d] = addDays(date, 1).split("-").map(Number);
  return new Date(y, m - 1, d, AUTO_SUBMIT_HOUR);
}

export function hasContent(log: DailyLog): boolean {
  return (
    log.meals.length > 0 ||
    Object.values(log.morning).some((v) => v !== undefined) ||
    !!log.exercise?.items.length ||
    !!log.exercise?.rest
  );
}

export type SubmissionState =
  /** 아직 안 보냄. deadline에 자동으로 보낸다 */
  | { kind: "draft"; deadline: Date }
  /** 보냄 (직접 또는 자동). editedAfter: 보낸 뒤에 고쳤는지 */
  | { kind: "sent"; sentAt: Date; auto: boolean; editedAfter: boolean }
  /** 기록이 비어 있어 보낼 것이 없음 */
  | { kind: "empty"; deadline: Date };

export function submissionState(log: DailyLog, now: Date = new Date()): SubmissionState {
  const deadline = autoSubmitAt(log.date);
  const updatedAt = log.updatedAt ? new Date(log.updatedAt) : null;

  if (log.submittedAt) {
    const sentAt = new Date(log.submittedAt);
    return { kind: "sent", sentAt, auto: false, editedAfter: !!updatedAt && updatedAt > sentAt };
  }
  if (!hasContent(log)) return { kind: "empty", deadline };
  if (now >= deadline) {
    return { kind: "sent", sentAt: deadline, auto: true, editedAfter: !!updatedAt && updatedAt > deadline };
  }
  return { kind: "draft", deadline };
}

/** 끼니별 시간대 (타임라인 분). 저녁은 새벽 2시까지 */
const SLOTS: { slot: MealSlot; from: number; to: number }[] = [
  { slot: "breakfast", from: 6 * 60, to: 11 * 60 },
  { slot: "lunch", from: 11 * 60, to: 16 * 60 },
  { slot: "dinner", from: 16 * 60, to: 26 * 60 },
];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = { breakfast: "아침", lunch: "점심", dinner: "저녁" };

/**
 * 기록이 없고 "안 먹었어요"로 확인하지도 않은 끼니.
 * now를 주면 아직 시간대가 끝나지 않은 끼니(오늘 저녁 등)는 빼고 묻는다.
 */
export function missingMealSlots(log: DailyLog, now?: Date): MealSlot[] {
  const elapsed = now ? elapsedTimelineMinutes(log.date, now) : Infinity;
  return SLOTS.filter(({ slot, from, to }) => {
    if (to > elapsed) return false;
    if (log.skippedMeals?.includes(slot)) return false;
    return !log.meals.some((m) => {
      const t = timelineMinutes(m.time);
      return t >= from && t < to;
    });
  }).map((s) => s.slot);
}

/** now가 date의 타임라인에서 몇 분 지점인지 (지난 날이면 Infinity, 미래면 -Infinity) */
function elapsedTimelineMinutes(date: ISODate, now: Date): number {
  const today = todayISO(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (today === date) return minutes;
  if (today === addDays(date, 1)) return minutes < 6 * 60 ? minutes + 24 * 60 : Infinity;
  return today > date ? Infinity : -Infinity;
}

export function nowHHMM(now: Date = new Date()): HHMM {
  return toHHMM(now.getHours() * 60 + now.getMinutes());
}

/**
 * "잘게요"를 누른 시각이 어느 날 기록의 잠든 시각인지.
 * 잠든 시각은 다음 날 아침 기록에 속하므로, 낮 12시 이후면 내일, 새벽이면 오늘 기록이다.
 */
export function bedtimeLogDate(now: Date = new Date()): ISODate {
  const today = todayISO(now);
  return now.getHours() >= 12 ? addDays(today, 1) : today;
}
