import { describe, expect, it } from "vitest";
import {
  emptyLog,
  groupPhotosIntoMeals,
  previousSleep,
  similarTimeMeal,
  splitFoods,
  foodHistory,
  matchFoods,
  foodsOf,
  joinFoods,
  shiftTime,
  type DailyLog,
  type Meal,
} from "./index";

const meal = (time: string, description: string): Meal => ({ id: time + description, time, description, photoIds: [] });
const log = (date: string, meals: Meal[]): DailyLog => ({ ...emptyLog(date), meals });

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

describe("±10분", () => {
  it("앞뒤로 옮기고 자정을 넘으면 돌아간다", () => {
    expect(shiftTime("12:30", 10)).toBe("12:40");
    expect(shiftTime("00:05", -10)).toBe("23:55");
  });
});

describe("어제처럼 잤어요", () => {
  const withSleep = (date: string, sleepStart?: string, sleepEnd?: string): DailyLog => ({
    ...emptyLog(date),
    morning: { sleepStart, sleepEnd },
  });
  it("가장 최근에 일어난 시각이 있는 날의 수면", () => {
    const logs = [withSleep("2026-09-21", "23:30", "07:00"), withSleep("2026-09-22", "00:30", "07:30"), emptyLog("2026-09-23")];
    expect(previousSleep(logs)).toEqual({ sleepStart: "00:30", sleepEnd: "07:30" });
  });
  it("일주일 넘게 기록이 없으면 null", () => {
    const logs = [withSleep("2026-09-10", "00:30", "07:30"), ...Array.from({ length: 7 }, (_, i) => emptyLog(`2026-09-1${i + 1}`))];
    expect(previousSleep(logs)).toBeNull();
  });
});

describe("자주 먹는 음식 버튼", () => {
  it("쉼표·+·줄바꿈으로 나누고, 끼니 이름은 떼고, 긴 문장은 빼기", () => {
    expect(splitFoods("점심 이마트 트레이더스 미트볼")).toEqual(["이마트 트레이더스 미트볼"]);
    expect(splitFoods("밥 200g, 제육볶음\n+ 밥 추가")).toEqual(["밥 200g", "제육볶음", "밥 추가"]);
    expect(splitFoods("컵라면 밥 콘 100g 단백질 파우더 40g")).toEqual(["컵라면 밥 콘 100g", "단백질 파우더 40g"]);
    expect(splitFoods("점심은 회사 앞 식당에서 먹은 돌솥비빔밥 정식")).toEqual([]);
  });

  it("음식 하나하나로: 양 뒤에서도 나눈다", () => {
    expect(foodsOf("밥 1공기 제육볶음 100g 김치")).toEqual(["밥 1공기", "제육볶음 100g", "김치"]);
    expect(foodsOf("샐러드 그리고 닭가슴살")).toEqual(["샐러드", "닭가슴살"]);
    expect(joinFoods([" 컵라면 ", "", "팝콘"])).toEqual("컵라면\n팝콘");
  });
});

describe("한 번이라도 먹은 음식", () => {
  const logs = [
    { ...emptyLog("2025-10-01"), meals: [meal("12:00", "점심은 회사 앞 식당에서 먹은 돌솥비빔밥 정식")] },
    log("2026-09-22", [meal("12:00", "김밥"), meal("19:00", "김치찌개\n밥 1공기")]),
    log("2026-09-23", [meal("12:00", "김밥")]),
  ];

  it("긴 이름까지 모두, 많이 먹은 순", () => {
    expect(foodHistory(logs)).toEqual(["김밥", "밥 1공기", "김치찌개", "회사 앞 식당에서 먹은 돌솥비빔밥 정식"]);
    expect(foodHistory(logs, ["김밥"])).not.toContain("김밥");
  });

  it("추천어: 앞부분이 맞는 것 먼저, 띄어쓰기 무시", () => {
    const foods = foodHistory(logs);
    expect(matchFoods(foods, "김")).toEqual(["김밥", "김치찌개"]);
    expect(matchFoods(foods, "밥1")).toEqual(["밥 1공기"]);
    expect(matchFoods(foods, "비빔")).toEqual(["회사 앞 식당에서 먹은 돌솥비빔밥 정식"]);
    expect(matchFoods(foods, "김밥")).toEqual([]); // 이미 다 쓴 말은 추천하지 않음
  });
});
