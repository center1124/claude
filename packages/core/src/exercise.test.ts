import { describe, expect, it } from "vitest";
import {
  emptyLog,
  formatAmount,
  previousExercise,
  recentExtraExercises,
  stepAmount,
  summarizeWeek,
  type DailyLog,
  type Exercise,
} from "./index";

const ex = (name: string, method: Exercise["method"], amount: Exercise["amount"]): Exercise => ({
  id: name,
  name,
  kind: method === "sets" ? "strength" : "cardio",
  method,
  amount,
});
const day = (date: string, items: Exercise[] = [], rest = false): DailyLog => ({
  ...emptyLog(date),
  exercise: { items, rest },
});

describe("운동 양", () => {
  it("방식별 표시", () => {
    expect(formatAmount(ex("걷기", "time", { minutes: 30 }))).toBe("30분");
    expect(formatAmount(ex("스쿼트", "sets", { sets: 3, reps: 15 }))).toBe("3세트 × 15회");
    expect(formatAmount(ex("러닝", "distance", { km: 5 }))).toBe("5km");
    expect(formatAmount(ex("걸음", "steps", { steps: 8000 }))).toBe("8,000보");
  });

  it("±버튼: 시간 10분, 세트 1세트, 거리 0.5km, 걸음 1,000보 (최소값 아래로 안 내려감)", () => {
    expect(stepAmount(ex("걷기", "time", { minutes: 30 }), 1)).toEqual({ minutes: 40 });
    expect(stepAmount(ex("걷기", "time", { minutes: 10 }), -1)).toEqual({ minutes: 5 });
    expect(stepAmount(ex("스쿼트", "sets", { sets: 3, reps: 15 }), -1)).toEqual({ sets: 2, reps: 15 });
    expect(stepAmount(ex("러닝", "distance", { km: 3 }), 1)).toEqual({ km: 3.5 });
    expect(stepAmount(ex("걸음", "steps", { steps: 8000 }), 1)).toEqual({ steps: 9000 });
  });
});

describe("어제와 같아요", () => {
  it("쉰 날은 건너뛰고 가장 최근 운동한 날", () => {
    const logs = [day("2026-09-22", [ex("걷기", "time", { minutes: 30 })]), day("2026-09-23", [], true)];
    expect(previousExercise(logs)?.map((e) => e.name)).toEqual(["걷기"]);
    expect(previousExercise([day("2026-09-23", [], true)])).toBeNull();
  });
});

describe("최근 다른 운동", () => {
  it("루틴에 없는 운동을 많이 한 순서로 최대 5개, 2주 넘은 것은 빼기", () => {
    const routine = [ex("걷기", "time", { minutes: 30 })];
    const logs = [
      day("2026-09-01", [ex("수영", "time", { minutes: 40 })]), // 2주 넘음
      ...Array.from({ length: 13 }, (_, i) => emptyLog(`2026-09-${String(i + 2).padStart(2, "0")}`)),
      day("2026-09-15", [ex("걷기", "time", { minutes: 30 }), ex("요가", "time", { minutes: 20 })]),
      day("2026-09-16", [ex("요가", "time", { minutes: 30 }), ex("러닝", "distance", { km: 3 })]),
    ];
    const extras = recentExtraExercises(logs, routine);
    expect(extras.map((e) => e.name)).toEqual(["요가", "러닝"]);
    expect(extras[0].amount).toEqual({ minutes: 30 }); // 가장 최근에 한 양
  });
});

describe("주간 요약의 운동", () => {
  it("운동한 날과 시간 운동 합계", () => {
    const logs = [
      day("2026-09-21", [ex("걷기", "time", { minutes: 30 }), ex("스쿼트", "sets", { sets: 3, reps: 15 })]),
      day("2026-09-22", [], true),
      day("2026-09-23", [ex("걷기", "time", { minutes: 40 })]),
      ...["24", "25", "26", "27"].map((d) => emptyLog(`2026-09-${d}`)),
    ];
    const s = summarizeWeek(logs);
    expect(s.exerciseDays).toBe(2);
    expect(s.exerciseMinutes).toBe(70);
    expect(s.loggedDays).toBe(3); // 쉰 날도 기록한 날
  });
});
