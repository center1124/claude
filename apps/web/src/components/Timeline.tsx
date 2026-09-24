"use client";

import {
  compareTimelineTime,
  sleepSegments,
  timeFromTimelinePosition,
  timelineHours,
  timelinePosition,
  type HHMM,
  type Meal,
} from "@diet/core";

/**
 * 두 가지 모양:
 * - 기본(주간 보기): 넓은 화면용. 화살표 아래 시각·먹은 것·포만감까지 보여준다
 * - compact(폰 하루 기록): 하루 전체를 폰 너비에 넣는다. 화살표와 시각만 보이고,
 *   손가락으로 정확히 누르기 어려우므로 30분 단위로 잡는다 (입력 창에서 ±10분으로 맞춘다)
 */
const LAYOUT = {
  full: { labelWidth: 0.11, laneRem: 5.25, step: 10 },
  compact: { labelWidth: 0.1, laneRem: 2.25, step: 30 },
};

interface Props {
  meals: Meal[];
  /** 그날 아침 일어난 시각 */
  wakeTime?: HHMM;
  /** 그날 밤 잠든 시각 (다음 날 기록의 잠든 시각) */
  bedTime?: HHMM;
  onMealClick?: (meal: Meal) => void;
  /** 빈 곳을 누르면 그 시각으로 새 식사를 기록한다 */
  onTimeClick?: (time: HHMM) => void;
  /** 수면 줄(윗줄)을 누르면 그 시각을 일어난/잠든 시각으로 기록한다 */
  onSleepClick?: (time: HHMM) => void;
  compact?: boolean;
}

/** 종이 기록지 한 줄: 정각 칸 + 수면 형광펜 + 먹은 시각에 화살표와 메모 */
export function Timeline({ meals, wakeTime, bedTime, onMealClick, onTimeClick, onSleepClick, compact }: Props) {
  const layout = compact ? LAYOUT.compact : LAYOUT.full;
  const hours = timelineHours();
  const placed = placeLabels(meals, layout.labelWidth);
  const timeAt = (e: React.MouseEvent<HTMLElement>) => timeAtPointer(e, layout.step);
  // 누를 수 없는 타임라인(주간 보기)에서는 버튼 대신 div로 그려 클릭이 바깥으로 전달되게 한다
  const MarkerTag = onMealClick ? "button" : "div";
  const lanes = Math.max(1, ...placed.map((p) => p.lane + 1));

  return (
    <div
      className={`relative select-none ${onTimeClick ? "cursor-copy" : ""}`}
      // 시간 숫자와 아래 칸 어디를 눌러도 그 시각으로 식사를 기록한다 (수면 줄은 따로)
      onClick={onTimeClick && ((e) => onTimeClick(timeAt(e)))}
      data-testid="timeline"
    >
      <div className={`relative h-5 text-ink-soft ${compact ? "text-[9px]" : "text-[11px]"}`}>
        {hours.map((h) => (
          <span key={h.position} className="absolute -translate-x-1/2" style={{ left: pct(h.position) }}>
            {h.label}
          </span>
        ))}
      </div>

      <div
        className={`relative overflow-hidden rounded-t border border-line bg-card ${compact ? "h-10" : "h-7"} ${
          onSleepClick ? "cursor-pointer" : ""
        }`}
        onClick={
          onSleepClick &&
          ((e) => {
            e.stopPropagation();
            onSleepClick(timeAt(e));
          })
        }
        data-testid="timeline-sleep"
      >
        {onSleepClick && !wakeTime && !bedTime && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] text-ink-soft">
            {compact ? "😴 윗줄: 일어난·잠든 시각" : "😴 이 줄에서 일어난 시각과 잠든 시각을 누르세요"}
          </p>
        )}
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
        style={{ height: `${Math.max(lanes * layout.laneRem + 0.5, 3)}rem` }}
        data-testid="timeline-body"
      >
        {onTimeClick && meals.length === 0 && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-ink-soft">
            👆 먹은 시각쯤을 누르면 식사 기록
          </p>
        )}
        {placed.map(({ meal, position, lane }) => (
          <MarkerTag
            key={meal.id}
            {...(onMealClick
              ? {
                  type: "button" as const,
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    onMealClick(meal);
                  },
                }
              : {})}
            className={`absolute flex -translate-x-1/2 flex-col items-center text-center leading-tight ${
              compact ? "w-10" : "w-28"
            }`}
            style={{ left: pct(position), top: `${lane * layout.laneRem}rem` }}
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

/** 누른 위치의 시각. 타임라인 전체 너비 기준으로 계산한다 */
function timeAtPointer(e: React.MouseEvent<HTMLElement>, step: number): HHMM {
  const root = (e.currentTarget.closest("[data-testid=timeline]") ?? e.currentTarget) as HTMLElement;
  const rect = root.getBoundingClientRect();
  return timeFromTimelinePosition((e.clientX - rect.left) / rect.width, step);
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
