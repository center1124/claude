import type { DailyLog } from "./types";

/** 운동 종류 */
export type ExerciseKind = "cardio" | "strength" | "flexibility" | "other";
/** 운동 방식: 양을 무엇으로 재는지 */
export type ExerciseMethod = "time" | "sets" | "distance" | "steps";
/** 운동한 때 (선택) */
export type ExerciseSlot = "morning" | "lunch" | "evening";

export const EXERCISE_KIND_LABELS: Record<ExerciseKind, string> = {
  cardio: "유산소",
  strength: "근력",
  flexibility: "스트레칭",
  other: "기타",
};

export const EXERCISE_METHOD_LABELS: Record<ExerciseMethod, string> = {
  time: "시간",
  sets: "세트×횟수",
  distance: "거리",
  steps: "걸음 수",
};

export const EXERCISE_SLOT_LABELS: Record<ExerciseSlot, string> = {
  morning: "아침",
  lunch: "점심",
  evening: "저녁",
};

export interface ExerciseAmount {
  minutes?: number;
  sets?: number;
  reps?: number;
  /** 중량 (세트×횟수 운동, 선택) */
  weightKg?: number;
  km?: number;
  steps?: number;
}

/** 운동 한 가지. 루틴 항목(해야 할 운동)과 그날 한 운동이 같은 모양이다 */
export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  method: ExerciseMethod;
  amount: ExerciseAmount;
  slot?: ExerciseSlot;
}

export interface DailyExercise {
  items: Exercise[];
  /** "오늘은 쉬었어요" (기록을 잊은 날과 구분) */
  rest?: boolean;
}

/** 방식마다 처음 넣을 양 */
export const DEFAULT_AMOUNT: Record<ExerciseMethod, ExerciseAmount> = {
  time: { minutes: 30 },
  sets: { sets: 3, reps: 15 },
  distance: { km: 3 },
  steps: { steps: 8000 },
};

/** "30분", "3세트 × 15회", "5km", "8,000보" */
export function formatAmount(exercise: Pick<Exercise, "method" | "amount">): string {
  const { minutes, sets, reps, km, steps } = exercise.amount;
  switch (exercise.method) {
    case "time":
      return minutes ? `${minutes}분` : "";
    case "sets":
      return [
        [sets && `${sets}세트`, reps && `${reps}회`].filter(Boolean).join(" × "),
        exercise.amount.weightKg && `${exercise.amount.weightKg}kg`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "distance":
      return km ? `${km}km` : "";
    case "steps":
      return steps ? `${steps.toLocaleString("ko-KR")}보` : "";
  }
}

/** 양의 각 항목과 ±버튼 한 번에 바뀌는 크기·최소값 */
export type AmountField = keyof ExerciseAmount;

export const AMOUNT_FIELDS: Record<AmountField, { label: string; unit: string; step: number; min: number }> = {
  minutes: { label: "시간", unit: "분", step: 10, min: 5 },
  sets: { label: "세트", unit: "세트", step: 1, min: 1 },
  reps: { label: "횟수", unit: "회", step: 1, min: 1 },
  weightKg: { label: "중량", unit: "kg", step: 1, min: 0 },
  km: { label: "거리", unit: "km", step: 0.5, min: 0.5 },
  steps: { label: "걸음", unit: "보", step: 1000, min: 1000 },
};

/** 방식마다 ±로 고칠 수 있는 항목 */
export const METHOD_FIELDS: Record<ExerciseMethod, AmountField[]> = {
  time: ["minutes"],
  sets: ["sets", "reps", "weightKg"],
  distance: ["km"],
  steps: ["steps"],
};

/** 한 항목을 ±버튼 한 번만큼 바꾼다 (최소값 아래로 내려가지 않음, 0kg이면 중량을 뺀다) */
export function stepField(amount: ExerciseAmount, field: AmountField, direction: 1 | -1): ExerciseAmount {
  const { step, min } = AMOUNT_FIELDS[field];
  const next = Math.max(min, Math.round(((amount[field] ?? 0) + step * direction) * 10) / 10);
  return { ...amount, [field]: field === "weightKg" && next === 0 ? undefined : next };
}

/**
 * "어제와 같아요": 가장 최근(최대 7일 전까지) 운동한 날의 운동.
 * 쉰 날은 건너뛴다. logs는 날짜순(오래된 → 최근)이며, 오늘 기록은 넣지 않는다.
 */
export function previousExercise(logs: DailyLog[], maxDays = 7): Exercise[] | null {
  for (const log of logs.slice(-maxDays).reverse()) {
    if (log.exercise?.items.length) return log.exercise.items;
  }
  return null;
}

/**
 * "+ 다른 운동" 버튼: 최근 days일 안에 한 운동 중 루틴에 없는 것을 많이 한 순서로 limit개.
 * 모든 기록을 늘어놓지 않고 최근에 자주 한 것만 보여준다.
 */
export function recentExtraExercises(logs: DailyLog[], routine: Exercise[], days = 14, limit = 5): Exercise[] {
  const inRoutine = new Set(routine.map((r) => r.name));
  const stats = new Map<string, { exercise: Exercise; count: number; last: number }>();
  logs.slice(-days).forEach((log, dayIndex) => {
    for (const item of log.exercise?.items ?? []) {
      if (inRoutine.has(item.name)) continue;
      const s = stats.get(item.name);
      // 가장 최근에 한 양을 기억해 둔다
      stats.set(item.name, { exercise: item, count: (s?.count ?? 0) + 1, last: dayIndex });
    }
  });
  return [...stats.values()]
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map((s) => s.exercise);
}
