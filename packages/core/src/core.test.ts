import { describe, expect, it } from "vitest";
import {
  addDays,
  compareTimelineTime,
  formatDuration,
  periodDday,
  sleepMinutes,
  sleepSegments,
  startOfWeek,
  timelineHours,
  timelinePosition,
  weekDates,
} from "./index";

describe("수면량", () => {
  it("자정을 넘긴 수면을 계산한다 (기록지 예시: 00:30 → 07:00 = 6:30)", () => {
    expect(formatDuration(sleepMinutes("00:30", "07:00"))).toBe("6:30");
  });

  it("자정 전에 잠든 경우", () => {
    expect(formatDuration(sleepMinutes("23:30", "07:30"))).toBe("8:00");
  });
});

describe("타임라인", () => {
  it("새벽 시각은 전날 밤의 연장으로 뒤에 놓인다", () => {
    const sorted = ["00:30", "21:00", "07:30"].sort(compareTimelineTime);
    expect(sorted).toEqual(["07:30", "21:00", "00:30"]);
  });

  it("06:00은 시작, 02:00은 끝", () => {
    expect(timelinePosition("06:00")).toBe(0);
    expect(timelinePosition("02:00")).toBe(1);
    expect(timelinePosition("16:00")).toBe(0.5);
  });
});

describe("주 단위 날짜", () => {
  it("월요일에 시작한다", () => {
    expect(startOfWeek("2026-09-24")).toBe("2026-09-21"); // 목 → 월
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21"); // 일 → 월
    expect(weekDates("2026-09-21")).toHaveLength(7);
  });

  it("달이 바뀌어도 날짜를 더한다", () => {
    expect(addDays("2026-09-29", 3)).toBe("2026-10-02");
  });
});

describe("생리 D-day", () => {
  const expected = "2026-10-01";
  it("예정일 전후 7일을 표시한다", () => {
    expect(periodDday("2026-09-24", expected)).toBe("D-7");
    expect(periodDday("2026-10-01", expected)).toBe("D-day");
    expect(periodDday("2026-10-08", expected)).toBe("D+7");
  });

  it("기간 밖이거나 예정일이 없으면 표시하지 않는다", () => {
    expect(periodDday("2026-09-23", expected)).toBeNull();
    expect(periodDday("2026-10-09", expected)).toBeNull();
    expect(periodDday("2026-09-24", undefined)).toBeNull();
  });
});

describe("수면 형광펜 구간", () => {
  it("아침 기상과 밤 취침을 칠한다 (기록지 예시: 07:30 기상, 00:30 취침)", () => {
    expect(sleepSegments("07:30", "00:30")).toEqual([
      { from: 0, to: 0.075 },
      { from: 0.925, to: 1 },
    ]);
  });

  it("축 바깥 시각은 칠하지 않는다", () => {
    expect(sleepSegments("05:30", "03:00")).toEqual([]);
  });

  it("정각 눈금은 7시부터 새벽 1시까지", () => {
    const hours = timelineHours();
    expect(hours[0].label).toBe("7");
    expect(hours.at(-1)?.label).toBe("1");
    expect(hours).toHaveLength(19);
  });
});
