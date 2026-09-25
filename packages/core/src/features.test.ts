import { describe, expect, it } from "vitest";
import {
  autoSubmitAt,
  bedtimeLogDate,
  emptyLog,
  frequentFoods,
  mealTimeFromPhoto,
  missingMealSlots,
  readExifDate,
  recentMeals,
  submissionState,
  type DailyLog,
  type Meal,
} from "./index";

const meal = (time: string, description: string): Meal => ({ id: time + description, time, description, photoIds: [] });
const log = (date: string, meals: Meal[] = [], extra: Partial<DailyLog> = {}): DailyLog => ({
  ...emptyLog(date),
  meals,
  ...extra,
});

describe("자동 보내기 (다음 날 오전 9시)", () => {
  const day = log("2026-09-24", [meal("12:30", "비빔밥")]);

  it("마감 전에는 초안", () => {
    const state = submissionState(day, new Date(2026, 8, 25, 8, 59));
    expect(state).toEqual({ kind: "draft", deadline: autoSubmitAt("2026-09-24") });
    expect(autoSubmitAt("2026-09-24")).toEqual(new Date(2026, 8, 25, 9, 0));
  });

  it("9시가 지나면 자동으로 보낸 것으로 본다", () => {
    const state = submissionState(day, new Date(2026, 8, 25, 9, 0));
    expect(state).toMatchObject({ kind: "sent", auto: true, editedAfter: false });
  });

  it("보낸 뒤 고치면 표시한다", () => {
    const edited = { ...day, submittedAt: "2026-09-25T00:00:00Z", updatedAt: "2026-09-25T01:00:00Z" };
    expect(submissionState(edited)).toMatchObject({ kind: "sent", auto: false, editedAfter: true });
  });

  it("빈 기록은 보내지 않는다", () => {
    expect(submissionState(log("2026-09-24"), new Date(2026, 8, 26)).kind).toBe("empty");
  });
});

describe("빠진 끼니", () => {
  it("기록도 없고 안 먹었다고 하지도 않은 끼니만", () => {
    const day = log("2026-09-24", [meal("09:00", "스무디"), meal("00:30", "야식")], { skippedMeals: ["lunch"] });
    expect(missingMealSlots(day)).toEqual([]);
    expect(missingMealSlots(log("2026-09-24", [meal("12:30", "비빔밥")]))).toEqual(["breakfast", "dinner"]);
  });
});

describe("잘게요 버튼", () => {
  it("밤에 누르면 내일 기록, 새벽에 누르면 오늘 기록의 잠든 시각", () => {
    expect(bedtimeLogDate(new Date(2026, 8, 24, 23, 30))).toBe("2026-09-25");
    expect(bedtimeLogDate(new Date(2026, 8, 25, 0, 30))).toBe("2026-09-25");
  });
});

describe("사진 촬영 시각", () => {
  function jpegWithExif(dateTime: string): ArrayBuffer {
    const tiff = new Uint8Array(64);
    const v = new DataView(tiff.buffer);
    tiff.set([0x49, 0x49, 0x2a, 0x00]); // "II", 42
    v.setUint32(4, 8, true); // IFD0
    v.setUint16(8, 1, true);
    v.setUint16(10, 0x8769, true); // Exif IFD 포인터
    v.setUint16(12, 4, true);
    v.setUint32(14, 1, true);
    v.setUint32(18, 26, true);
    v.setUint16(26, 1, true);
    v.setUint16(28, 0x9003, true); // DateTimeOriginal
    v.setUint16(30, 2, true);
    v.setUint32(32, 20, true);
    v.setUint32(36, 44, true);
    tiff.set([...dateTime].map((c) => c.charCodeAt(0)), 44);

    const header = [0xff, 0xd8, 0xff, 0xe1, 0, 8 + tiff.length, 0x45, 0x78, 0x69, 0x66, 0, 0];
    const out = new Uint8Array(header.length + tiff.length);
    out.set(header);
    out.set(tiff, header.length);
    return out.buffer;
  }

  it("EXIF 촬영 시각을 읽는다", () => {
    expect(readExifDate(jpegWithExif("2024:08:16 12:33:05"))).toEqual(new Date(2024, 7, 16, 12, 33, 5));
  });

  it("JPEG가 아니거나 EXIF가 없으면 null", () => {
    expect(readExifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(readExifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeNull();
  });

  it("그날 타임라인 안에서 찍은 사진만 식사 시각으로 쓴다", () => {
    expect(mealTimeFromPhoto(new Date(2026, 8, 24, 12, 33), "2026-09-24")).toBe("12:33");
    expect(mealTimeFromPhoto(new Date(2026, 8, 25, 0, 40), "2026-09-24")).toBe("00:40");
    expect(mealTimeFromPhoto(new Date(2026, 8, 23, 19, 0), "2026-09-24")).toBeNull();
  });
});

describe("자주 먹는 음식", () => {
  const logs = [
    log("2026-09-22", [meal("09:00", "과채스무디"), meal("15:00", "쿠키 1개")]),
    log("2026-09-23", [meal("09:00", "과채스무디"), meal("18:40", "밥 200g\n제육볶음 100g")]),
    log("2026-09-24", [meal("12:30", "돌솥비빔밥\n+ 밥 추가")]),
  ];

  it("줄 단위로 많이 먹은 순, 같으면 최근 순", () => {
    expect(frequentFoods(logs).slice(0, 3)).toEqual(["과채스무디", "밥 추가", "돌솥비빔밥"]);
  });

  it("숨긴 음식은 버튼에서 뺀다", () => {
    expect(frequentFoods(logs, 8, ["과채스무디", "밥 추가"]).slice(0, 2)).toEqual(["돌솥비빔밥", "제육볶음 100g"]);
  });

  it("최근 식사는 설명이 겹치지 않게 최근부터", () => {
    expect(recentMeals(logs).map((m) => m.description)).toEqual([
      "돌솥비빔밥\n+ 밥 추가",
      "밥 200g\n제육볶음 100g",
      "과채스무디",
      "쿠키 1개",
    ]);
  });
});

describe("빠진 끼니 - 시간대가 끝난 끼니만", () => {
  const day = log("2026-09-24", [meal("09:00", "스무디")]);
  it("오늘 오후 5시에는 점심만 묻는다", () => {
    expect(missingMealSlots(day, new Date(2026, 8, 24, 17, 0))).toEqual(["lunch"]);
  });
  it("다음 날 새벽 3시가 지나면 저녁도 묻는다", () => {
    expect(missingMealSlots(day, new Date(2026, 8, 25, 1, 0))).toEqual(["lunch"]);
    expect(missingMealSlots(day, new Date(2026, 8, 25, 3, 0))).toEqual(["lunch", "dinner"]);
  });
  it("미래 날짜는 묻지 않는다", () => {
    expect(missingMealSlots(day, new Date(2026, 8, 23, 23, 0))).toEqual([]);
  });
});
