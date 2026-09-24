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
  /** 무엇을 얼마나 먹었는지. 예: "밥 200g, 제육볶음 100g" */
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
  /** 코치에게 제출한 시각 (ISO 8601) */
  submittedAt?: string;
}

export interface ClientProfile {
  name: string;
  /** 다음 생리 예정일 */
  periodExpectedDate?: ISODate;
}

export function emptyLog(date: ISODate): DailyLog {
  return { date, morning: {}, meals: [] };
}
