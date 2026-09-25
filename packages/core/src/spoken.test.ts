import { describe, expect, it } from "vitest";
import { parseSpokenLog } from "./index";

const meals = (text: string) => parseSpokenLog(text).meals;

describe("말로 기록: 하루 한 번에", () => {
  it("수면·몸·식사·운동을 칸별로 나눈다", () => {
    const r = parseSpokenLog(
      "어젯밤 12시 반에 자서 7시에 일어났어. 체중 73.4, 허리 92, 화장실 한 번. " +
        "9시 스무디, 12시 반 비빔밥 포만 8, 저녁 7시 제육볶음 포만 9. 굿모닝 10개 5세트, 걷기 30분",
    );
    expect(r.morning).toEqual({ sleepStart: "00:30", sleepEnd: "07:00", weightKg: 73.4, waistCm: 92, bowelCount: 1 });
    expect(r.meals).toEqual([
      { time: "09:00", description: "스무디" },
      { time: "12:30", description: "비빔밥", fullness: 8 },
      { time: "19:00", description: "제육볶음", fullness: 9 },
    ]);
    expect(r.exercises).toEqual([
      { name: "굿모닝", kind: "strength", method: "sets", amount: { sets: 5, reps: 10 } },
      { name: "걷기", kind: "cardio", method: "time", amount: { minutes: 30 } },
    ]);
    expect(r.unparsed).toEqual([]);
  });

  it("수면을 따로 말해도", () => {
    expect(parseSpokenLog("11시 반에 잤고 6시 50분에 일어났어").morning).toEqual({
      sleepStart: "23:30",
      sleepEnd: "06:50",
    });
    expect(parseSpokenLog("새벽 2시에 잠들었어").morning).toEqual({ sleepStart: "02:00" });
  });

  it("화장실 못 갔어 / 두 번", () => {
    expect(parseSpokenLog("화장실 못 갔어").morning).toEqual({ bowelCount: 0 });
    expect(parseSpokenLog("화장실 두 번").morning).toEqual({ bowelCount: 2 });
  });

  it("끼니 이름으로 말한 식사, 먹고 나서 운동", () => {
    const r = parseSpokenLog("점심은 회사에서 비빔밥 먹었어. 저녁 먹고 30분 걸었어");
    expect(r.meals).toEqual([
      { time: "12:30", description: "회사에서 비빔밥" },
      { time: "19:00", description: "" },
    ]);
    expect(r.exercises).toEqual([{ name: "걷기", kind: "cardio", method: "time", amount: { minutes: 30 } }]);
  });

  it("운동: 중량, 시간, 거리, 걸음, 한 때", () => {
    const ex = (t: string) => parseSpokenLog(t).exercises[0];
    expect(ex("스쿼트 15개 3세트 10킬로")).toMatchObject({ method: "sets", amount: { sets: 3, reps: 15, weightKg: 10 } });
    expect(ex("요가 1시간")).toMatchObject({ name: "요가", amount: { minutes: 60 } });
    expect(ex("5킬로 달렸어")).toMatchObject({ name: "러닝", method: "distance", amount: { km: 5 } });
    expect(ex("8,000보 걸었어")).toMatchObject({ name: "걷기", method: "steps", amount: { steps: 8000 } });
    expect(ex("저녁 7시에 30분 걸었어")).toMatchObject({ amount: { minutes: 30 }, slot: "evening" });
  });

  it("코치와 정한 운동 이름을 먼저 알아듣는다", () => {
    const r = parseSpokenLog("물구나무 3세트", [{ name: "물구나무", kind: "other", method: "sets" }]);
    expect(r.exercises).toEqual([{ name: "물구나무", kind: "other", method: "sets", amount: { sets: 3 } }]);
  });

  it("알아듣지 못한 말은 따로 돌려준다", () => {
    expect(parseSpokenLog("오늘은 기분이 좋았다").unparsed).toEqual(["오늘은 기분이 좋았다"]);
  });
});

describe("말로 기록: 종이 기록지처럼 여러 줄 (이전 '한 번에 쓰기')", () => {
  it("시각 없는 줄은 앞 식사에 이어진다", () => {
    const text = `9:00 과채스무디
12:30 돌솥비빔밥
+ 밥 추가 포만 8
3:00 쿠키 1개
6:40 밥 200g
제육볶음 100g
포만감 9
12:30 야식 라면`;
    expect(meals(text)).toEqual([
      { time: "09:00", description: "과채스무디" },
      { time: "12:30", description: "돌솥비빔밥\n밥 추가", fullness: 8 },
      { time: "15:00", description: "쿠키 1개" },
      { time: "18:40", description: "밥 200g\n제육볶음 100g", fullness: 9 },
      { time: "00:30", description: "라면" },
    ]);
  });

  it("한국어 시각 표현", () => {
    expect(meals("아침 8시 반 토스트\n오후 3시 커피\n7시 20분 저녁").map((m) => m.time)).toEqual([
      "08:30",
      "15:00",
      "19:20",
    ]);
  });

  it("첫 식사의 1~5시는 오후, 24시간 표기는 그대로", () => {
    expect(meals("2:00 떡볶이").map((m) => m.time)).toEqual(["14:00"]);
    expect(meals("13:10 김밥\n21:00 과일").map((m) => m.time)).toEqual(["13:10", "21:00"]);
  });

  it("시각으로 시작하지 않는 첫 줄은 알아듣지 못한 말로", () => {
    const r = parseSpokenLog("오늘 기록\n9:00 스무디");
    expect(r.meals).toEqual([{ time: "09:00", description: "스무디" }]);
    expect(r.unparsed).toEqual(["오늘 기록"]);
  });
});

describe("말로 기록: 실제로 말한 문장", () => {
  it("쉼표 없이 이어 말한 점심·저녁을 나누고, 12시는 낮 12시", () => {
    const r = parseSpokenLog(
      "아침 7시 반에 일어났고 저녁은 12시 반에 잤어\n\n점심 열두시 미트볼 저녁 7시 30분 단백질 파우더 40 그람 컵라면 팝콘 100 그람",
    );
    expect(r.morning).toEqual({ sleepStart: "00:30", sleepEnd: "07:30" });
    expect(r.meals).toEqual([
      { time: "12:00", description: "미트볼" },
      { time: "19:30", description: "단백질 파우더 40g\n컵라면 팝콘 100g" },
    ]);
    expect(r.unparsed).toEqual([]);
  });

  it("12시 읽기: 첫 식사는 낮, 저녁 뒤는 밤, 점심 11시는 오전", () => {
    const times = (t: string) => parseSpokenLog(t).meals.map((m) => m.time);
    expect(times("12시 김밥")).toEqual(["12:00"]);
    expect(times("오후 12시 김밥")).toEqual(["12:00"]);
    expect(times("7시 저녁밥, 12시 라면")).toEqual(["07:00", "12:00"]);
    expect(times("19:00 저녁밥, 12시 라면")).toEqual(["19:00", "00:00"]);
    expect(times("밤 12시 라면")).toEqual(["00:00"]);
    expect(times("점심 11시 반 샐러드")).toEqual(["11:30"]);
    expect(times("점심 1시 국수")).toEqual(["13:00"]);
  });
});
