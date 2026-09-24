/** 날짜: "YYYY-MM-DD" (고객의 현지 날짜) */
export type ISODate = string;
/** 시각: "HH:MM" 24시간제 */
export type HHMM = string;

/**
 * 아침 체크. date가 D인 기록의 수면은 "D-1일 밤에 잠들어 D일 아침에 깬" 수면이다.
 * (종이 기록지에서 월요일 칸의 총 수면량 = 일요일 밤 ~ 월요일 아침)
 */
export interface MorningCheck {
  sleepStart?: HHMM;
  sleepEnd?: HHMM;
  weightKg?: number;
  waistCm?: number;
  bowelCount?: number;
}

export interface Meal {
  id: string;
  time: HHMM;
  /** 무엇을 먹었는지. 예: "돌솥비빔밥", "과채스무디" (양은 적고 싶을 때만) */
  description: string;
  /** 포만감 1~10 (고객이 입력) */
  fullness?: number;
  /** 사진 참조 (저장소가 해석하는 키 또는 URL) */
  photoIds: string[];
}

export interface DailyLog {
  date: ISODate;
  morning: MorningCheck;
  meals: Meal[];
  /** 고객이 "지금 보내기"를 누른 시각 (ISO 8601). 없으면 다음 날 오전 9시에 자동으로 보낸다 */
  submittedAt?: string;
  /** 마지막으로 고친 시각 (ISO 8601). 보낸 뒤 고쳤는지 코치에게 알려줄 때 쓴다 */
  updatedAt?: string;
  /** "안 먹었어요"로 확인한 끼니 */
  skippedMeals?: MealSlot[];
}

export type MealSlot = "breakfast" | "lunch" | "dinner";

export interface ClientProfile {
  name: string;
  /** 생리 기록 사용 여부 (없으면 사용) */
  periodTracking?: boolean;
  /** 다음 생리 예정일 */
  periodExpectedDate?: ISODate;
}

export function emptyLog(date: ISODate): DailyLog {
  return { date, morning: {}, meals: [] };
}
