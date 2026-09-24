"use client";

import { compareTimelineTime, sleepSegments, timelineHours, timelinePosition, type HHMM, type Meal } from "@diet/core";

/** 라벨 하나가 차지하는 가로 폭 (타임라인 대비). 이보다 가까운 식사는 아랫줄로 내린다 */
const LABEL_WIDTH = 0.11;

interface Props {
  meals: Meal[];
  /** 그날 아침 일어난 시각 */
  wakeTime?: HHMM;
  /** 그날 밤 잠든 시각 (다음 날 기록의 잠든 시각) */
  bedTime?: HHMM;
  onMealClick?: (meal: Meal) => void;
}

/** 종이 기록지 한 줄: 정각 칸 + 수면 형광펜 + 먹은 시각에 화살표와 메모 */
export function Timeline({ meals, wakeTime, bedTime, onMealClick }: Props) {
  const hours = timelineHours();
  const placed = placeLabels(meals);
  // 누를 수 없는 타임라인(주간 보기)에서는 버튼 대신 div로 그려 클릭이 바깥으로 전달되게 한다
  const MarkerTag = onMealClick ? "button" : "div";
  const lanes = Math.max(1, ...placed.map((p) => p.lane + 1));

  return (
    <div className="relative select-none">
      <div className="relative h-5 text-[11px] text-ink-soft">
        {hours.map((h) => (
          <span key={h.position} className="absolute -translate-x-1/2" style={{ left: pct(h.position) }}>
            {h.label}
          </span>
        ))}
      </div>

      <div className="relative h-7 overflow-hidden rounded-t border border-line bg-card">
        {sleepSegments(wakeTime, bedTime).map((s) => (
          <div
            key={s.from}
            className="absolute inset-y-1 rounded-full bg-highlight"
            style={{ left: pct(s.from), width: pct(s.to - s.from) }}
          />
        ))}
        {hours.map((h) => (
          <div key={h.position} className="absolute inset-y-0 w-px bg-line" style={{ left: pct(h.position) }} />
        ))}
      </div>

      <div
        className="relative rounded-b border border-t-0 border-line bg-card"
        style={{ height: `${lanes * 5.25 + 0.75}rem` }}
      >
        {placed.map(({ meal, position, lane }) => (
          <MarkerTag
            key={meal.id}
            {...(onMealClick ? { type: "button" as const, onClick: () => onMealClick(meal) } : {})}
            className="absolute flex w-28 -translate-x-1/2 flex-col items-center text-center leading-tight"
            style={{ left: pct(position), top: `${lane * 5.25}rem` }}
          >
            <span className="h-3 w-px bg-pen" aria-hidden />
            <span className="-mt-1 text-[10px] text-pen" aria-hidden>
              ▼
            </span>
            <span className="text-[11px] text-ink-soft">{meal.time}</span>
            <span className="line-clamp-2 whitespace-pre-line text-xs text-pen">
              {meal.description || "사진"}
              {meal.photoIds.length > 0 && meal.description ? " 📷" : ""}
            </span>
            {meal.fullness && <span className="text-xs font-bold text-pen-blue">포만 {meal.fullness}</span>}
          </MarkerTag>
        ))}
      </div>
    </div>
  );
}

function placeLabels(meals: Meal[]) {
  const laneEnds: number[] = [];
  return [...meals]
    .sort((a, b) => compareTimelineTime(a.time, b.time))
    .map((meal) => {
      const position = timelinePosition(meal.time);
      let lane = laneEnds.findIndex((end) => end <= position);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = position + LABEL_WIDTH;
      return { meal, position, lane };
    });
}

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(3)}%`;
}
