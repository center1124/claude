import { describe, expect, it } from "vitest";
import {
  emptyLog,
  groupPhotosIntoMeals,
  parseDayText,
  similarTimeMeal,
  sleepTapTarget,
  timeFromTimelinePosition,
  type DailyLog,
  type Meal,
} from "./index";

const meal = (time: string, description: string): Meal => ({ id: time + description, time, description, photoIds: [] });
const log = (date: string, meals: Meal[]): DailyLog => ({ ...emptyLog(date), meals });

describe("타임라인을 눌러 기록", () => {
  it("누른 위치를 10분 단위 시각으로", () => {
    expect(timeFromTimelinePosition(0)).toBe("06:00");
    expect(timeFromTimelinePosition(0.5)).toBe("16:00");
    expect(timeFromTimelinePosition(0.326)).toBe("12:30"); // 12:31 → 12:30
    expect(timeFromTimelinePosition(1)).toBe("02:00");
  });
});

describe("수정 가능한 예시 (비슷한 시각에 먹은 것)", () => {
  const logs = [
    log("2026-09-22", [meal("08:50", "과채스무디"), meal("12:40", "샐러드")]),
    log("2026-09-23", [meal("12:10", "돌솥비빔밥"), meal("19:00", "제육볶음")]),
  ];
  it("가장 최근 날의 비슷한 시각 식사", () => {
    expect(similarTimeMeal(logs, "12:30")?.description).toBe("돌솥비빔밥");
    expect(similarTimeMeal(logs, "09:00")?.description).toBe("과채스무디");
  });
  it("비슷한 시각이 없으면 null", () => {
    expect(similarTimeMeal(logs, "16:00")).toBeNull();
  });
});

describe("사진 여러 장을 식사별로 나누기", () => {
  const at = (h: number, m: number) => new Date(2026, 8, 24, h, m);
  it("30분 이상 벌어지면 다른 식사, 시각 모르는 사진은 따로", () => {
    const groups = groupPhotosIntoMeals([
      { id: "c", takenAt: at(12, 45) },
      { id: "a", takenAt: at(12, 30) },
      { id: "x", takenAt: null },
      { id: "d", takenAt: at(18, 40) },
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([["a", "c"], ["d"], ["x"]]);
    expect(groups[2].takenAt).toBeNull();
  });
});

describe("한 번에 쓰기", () => {
  it("종이 기록지처럼 쓴 하루를 식사로 나눈다", () => {
    const text = `9:00 과채스무디
12:30 돌솥비빔밥
+ 밥 추가 포만 8
3:00 쿠키 1개
6:40 밥 200g
채소 100g
제육볶음 100g
포만감 9
12:30 야식 라면`;
    expect(parseDayText(text)).toEqual([
      { time: "09:00", description: "과채스무디" },
      { time: "12:30", description: "돌솥비빔밥\n+ 밥 추가", fullness: 8 },
      { time: "15:00", description: "쿠키 1개" },
      { time: "18:40", description: "밥 200g\n채소 100g\n제육볶음 100g", fullness: 9 },
      { time: "00:30", description: "야식 라면" },
    ]);
  });

  it("한국어 시각 표현", () => {
    expect(parseDayText("아침 8시 반 토스트\n오후 3시 커피\n7시 20분 저녁").map((m) => m.time)).toEqual([
      "08:30",
      "15:00",
      "19:20",
    ]);
  });

  it("첫 줄의 1~5시는 오후, 24시간 표기는 그대로", () => {
    expect(parseDayText("2:00 떡볶이").map((m) => m.time)).toEqual(["14:00"]);
    expect(parseDayText("13:10 김밥\n21:00 과일").map((m) => m.time)).toEqual(["13:10", "21:00"]);
  });

  it("시각으로 시작하지 않는 첫 줄은 무시", () => {
    expect(parseDayText("오늘 기록\n9:00 스무디")).toEqual([{ time: "09:00", description: "스무디" }]);
  });
});

describe("수면 줄 누르기", () => {
  it("오후 2시 전은 일어난 시각, 이후(새벽 포함)는 잠든 시각", () => {
    expect(sleepTapTarget("07:30")).toBe("wake");
    expect(sleepTapTarget("13:50")).toBe("wake");
    expect(sleepTapTarget("23:40")).toBe("bed");
    expect(sleepTapTarget("00:30")).toBe("bed");
  });
});
