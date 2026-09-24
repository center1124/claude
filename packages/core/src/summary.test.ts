import { describe, expect, it } from "vitest";
import { emptyLog, formatClock, summarizeWeek, type DailyLog, type Meal } from "./index";

const meal = (time: string, fullness?: number): Meal => ({ id: time, time, description: "x", photoIds: [], fullness });
const day = (date: string, morning: DailyLog["morning"], meals: Meal[] = []): DailyLog => ({
  ...emptyLog(date),
  morning,
  meals,
});

describe("한 주 요약", () => {
  const logs = [
    day("2026-09-21", { sleepStart: "23:30", sleepEnd: "07:00", weightKg: 73.4, waistCm: 92.2 }, [
      meal("09:00", 6),
      meal("12:30", 8),
      meal("21:30", 9),
    ]),
    day("2026-09-22", { sleepStart: "00:30", sleepEnd: "07:30", weightKg: 73.2 }, [meal("08:30"), meal("19:00", 7)]),
    ...["23", "24", "25", "26", "27"].map((d) => emptyLog(`2026-09-${d}`)),
    day("2026-09-28", { sleepStart: "01:00" }), // 다음 주 월요일: 일요일 밤 취침
  ];
  const s = summarizeWeek(logs);

  it("수면과 기상·취침", () => {
    expect(s.avgSleep).toBe(435); // (7:30 + 7:00) / 2 = 7:15
    expect(formatClock(s.avgWake!)).toBe("07:15");
    // 월요일 밤 00:30(화 기록), 일요일 밤 01:00(다음 월 기록) → 평균 00:45
    expect(formatClock(s.avgBed!)).toBe("00:45");
  });

  it("식사 시각·횟수·야식·포만감", () => {
    expect(formatClock(s.avgFirstMeal!)).toBe("08:45");
    expect(formatClock(s.avgLastMeal!)).toBe("20:15");
    expect(s.mealsPerDay).toBe(2.5);
    expect(s.lateMeals).toBe(1);
    expect(s.avgFullness).toBe(7.5);
  });

  it("체중·허리는 주의 처음과 마지막", () => {
    expect(s.weight).toEqual({ first: 73.4, last: 73.2 });
    expect(s.waist).toEqual({ first: 92.2, last: 92.2 });
    expect(s.loggedDays).toBe(2);
  });

  it("빈 주", () => {
    const empty = summarizeWeek(["21", "22", "23", "24", "25", "26", "27"].map((d) => emptyLog(`2026-09-${d}`)));
    expect(empty).toMatchObject({ loggedDays: 0, avgSleep: null, lateMeals: 0, weight: null });
  });
});
