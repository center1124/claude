"use client";

import {
  compareTimelineTime,
  sleepSegments,
  timelineHours,
  timelinePosition,
  type HHMM,
  type Meal,
} from "@diet/core";

/**
 * 하루 흐름 그림 (보기용). 세 가지 모양:
 * - full(PC 주간 보기): 종이 기록지처럼 화살표 아래 시각·먹은 것·포만감까지
 * - compact(폰 하루 기록): 하루 전체를 폰 너비에. 화살표와 시각만
 * - mini(폰 주간 보기): 한 줄에 수면 막대와 식사 눈금만. 시간 숫자는 주간 머리에 한 번
 */
export type TimelineVariant = "full" | "compact" | "mini";

const LABEL_WIDTH = { full: 0.11, compact: 0.1, mini: 0 };
const LANE_REM = { full: 5.25, compact: 2.25, mini: 0 };

interface Props {
  meals: Meal[];
  /** 그날 아침 일어난 시각 */
  wakeTime?: HHMM;
  /** 그날 밤 잠든 시각 (다음 날 기록의 잠든 시각) */
  bedTime?: HHMM;
  onMealClick?: (meal: Meal) => void;
  variant?: TimelineVariant;
}

export function Timeline({ meals, wakeTime, bedTime, onMealClick, variant = "full" }: Props) {
  if (variant === "mini") return <MiniTimeline meals={meals} wakeTime={wakeTime} bedTime={bedTime} />;

  const compact = variant === "compact";
  const hours = timelineHours();
  const placed = placeLabels(meals, LABEL_WIDTH[variant]);
  const lanes = Math.max(1, ...placed.map((p) => p.lane + 1));
  // 누를 수 없는 타임라인(주간 보기)에서는 버튼 대신 div로 그려 클릭이 바깥으로 전달되게 한다
  const MarkerTag = onMealClick ? "button" : "div";

  return (
    <div className="relative select-none" data-testid="timeline">
      <TimelineHours small={compact} />

      <div className="relative h-7 overflow-hidden rounded-t border border-line bg-card">
        <SleepBars wakeTime={wakeTime} bedTime={bedTime} />
        {hours.map((h) => (
          <div key={h.position} className="absolute inset-y-0 w-px bg-line" style={{ left: pct(h.position) }} />
        ))}
      </div>

      <div
        className="relative rounded-b border border-t-0 border-line bg-card"
        style={{ height: `${Math.max(lanes * LANE_REM[variant] + 0.5, 3)}rem` }}
      >
        {placed.map(({ meal, position, lane }) => (
          <MarkerTag
            key={meal.id}
            {...(onMealClick ? { type: "button" as const, onClick: () => onMealClick(meal) } : {})}
            className={`absolute flex -translate-x-1/2 flex-col items-center text-center leading-tight ${
              compact ? "w-10" : "w-28"
            }`}
            style={{ left: pct(position), top: `${lane * LANE_REM[variant]}rem` }}
          >
            <span className="h-3 w-px bg-pen" aria-hidden />
            <span className="-mt-1 text-[10px] text-pen" aria-hidden>
              ▼
            </span>
            {compact ? (
              <span className="text-[10px] font-medium text-ink">{meal.time}</span>
            ) : (
              <>
                <span className="text-[11px] text-ink-soft">{meal.time}</span>
                <span className="line-clamp-2 whitespace-pre-line text-xs text-pen">
                  {meal.description || "사진"}
                  {meal.photoIds.length > 0 && meal.description ? " 📷" : ""}
                </span>
                {meal.fullness && <span className="text-xs font-bold text-pen-blue">포만 {meal.fullness}</span>}
              </>
            )}
          </MarkerTag>
        ))}
      </div>
    </div>
  );
}

/** 정각 숫자 줄: 7 8 9 … 12 1 */
export function TimelineHours({ small }: { small?: boolean }) {
  return (
    <div className={`relative h-5 text-ink-soft ${small ? "text-[9px]" : "text-[11px]"}`}>
      {timelineHours().map((h) => (
        <span key={h.position} className="absolute -translate-x-1/2" style={{ left: pct(h.position) }}>
          {h.label}
        </span>
      ))}
    </div>
  );
}

function SleepBars({ wakeTime, bedTime, thin }: { wakeTime?: HHMM; bedTime?: HHMM; thin?: boolean }) {
  return (
    <>
      {sleepSegments(wakeTime, bedTime).map((s) => (
        <div
          key={s.from}
          className={`absolute rounded-full bg-highlight ${thin ? "inset-y-0" : "inset-y-1"}`}
          style={{ left: pct(s.from), width: pct(s.to - s.from) }}
        />
      ))}
    </>
  );
}

/** 폰 주간 보기 한 줄: 수면 막대(위)와 식사 눈금(아래) */
function MiniTimeline({ meals, wakeTime, bedTime }: { meals: Meal[]; wakeTime?: HHMM; bedTime?: HHMM }) {
  const hours = timelineHours();
  return (
    <div className="relative h-9 overflow-hidden rounded border border-line bg-card" data-testid="timeline-mini">
      {hours.map((h) => (
        <div key={h.position} className="absolute inset-y-0 w-px bg-line/60" style={{ left: pct(h.position) }} />
      ))}
      <div className="absolute inset-x-0 top-1 h-2.5">
        <SleepBars wakeTime={wakeTime} bedTime={bedTime} thin />
      </div>
      {meals.map((meal) => (
        <div
          key={meal.id}
          className="absolute bottom-1 h-4 w-1 -translate-x-1/2 rounded-full bg-pen"
          style={{ left: pct(timelinePosition(meal.time)) }}
          title={`${meal.time} ${meal.description}`}
        />
      ))}
    </div>
  );
}

function placeLabels(meals: Meal[], labelWidth: number) {
  const laneEnds: number[] = [];
  return [...meals]
    .sort((a, b) => compareTimelineTime(a.time, b.time))
    .map((meal) => {
      const position = timelinePosition(meal.time);
      let lane = laneEnds.findIndex((end) => end <= position);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = position + labelWidth;
      return { meal, position, lane };
    });
}

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(3)}%`;
}
