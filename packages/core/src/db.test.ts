import { describe, expect, it } from "vitest";
import {
  logToRow,
  mealToRow,
  profileToUpdate,
  rowToLog,
  rowToProfile,
  type DailyLog,
  type DailyLogRow,
  type ProfileRow,
} from "./index";

const log: DailyLog = {
  date: "2026-09-24",
  morning: { sleepStart: "00:30", sleepEnd: "07:00", weightKg: 73.4, bowelCount: 1 },
  meals: [{ id: "m1", time: "12:30", description: "비빔밥", fullness: 8, photoIds: ["u/1.jpg"] }],
  submittedAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T01:00:00.000Z",
  skippedMeals: ["breakfast"],
  exercise: { items: [{ id: "e1", name: "걷기", kind: "cardio", method: "time", amount: { minutes: 30 } }] },
};

describe("서버 표 ↔ 기록", () => {
  it("기록을 줄로 바꿨다가 되돌리면 같다", () => {
    const row: DailyLogRow = {
      ...logToRow(log, "client-1"),
      // Postgres가 돌려주는 모양: time은 초까지, numeric은 문자열
      sleep_start: "00:30:00",
      sleep_end: "07:00:00",
      weight_kg: "73.4",
      meals: log.meals.map((m) => ({ ...mealToRow(m, "log-1"), time: `${m.time}:00` })),
    };
    expect(rowToLog(row)).toEqual(log);
  });

  it("빈 칸은 null로 보내고, 받을 때는 칸을 뺀다", () => {
    const row = logToRow({ date: "2026-09-24", morning: {}, meals: [] }, "c");
    expect(row).toMatchObject({ sleep_start: null, weight_kg: null, exercise: null, skipped_meals: [] });
    expect(rowToLog({ ...row, meals: [] })).toMatchObject({ date: "2026-09-24", morning: {}, meals: [] });
  });

  it("프로필: 고칠 수 있는 칸만 보낸다", () => {
    const row: ProfileRow = {
      id: "u",
      role: "client",
      name: "먹보 네오",
      coach_id: null,
      period_tracking: false,
      period_expected_date: "2026-09-27",
      routine: [],
      hidden_foods: ["김밥"],
      sensitive_data_consented_at: null,
    };
    const profile = rowToProfile(row);
    expect(profile).toEqual({
      name: "먹보 네오",
      periodTracking: false,
      periodExpectedDate: "2026-09-27",
      hiddenFoods: ["김밥"],
    });
    expect(profileToUpdate(profile)).toEqual({
      name: "먹보 네오",
      period_tracking: false,
      period_expected_date: "2026-09-27",
      routine: [],
      hidden_foods: ["김밥"],
    });
  });
});
