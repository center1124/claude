"use client";

import Link from "next/link";
import {
  formatDuration,
  periodDday,
  sleepMinutes,
  type ISODate,
  type MorningCheck,
} from "@diet/core";
import { Card, inputClass } from "./ui";

interface Props {
  date: ISODate;
  morning: MorningCheck;
  /** 가장 최근에 기록한 체중·허리 (빈칸을 채우는 출발점) */
  previous: { weightKg?: number; waistCm?: number };
  periodTracking: boolean;
  periodExpectedDate?: ISODate;
  onChange: (morning: MorningCheck) => void;
}

export function MorningCheckCard({
  date,
  morning,
  previous,
  periodTracking,
  periodExpectedDate,
  onChange,
}: Props) {
  const set = <K extends keyof MorningCheck>(key: K, value: MorningCheck[K]) =>
    onChange({ ...morning, [key]: value });

  const sleep =
    morning.sleepStart && morning.sleepEnd ? formatDuration(sleepMinutes(morning.sleepStart, morning.sleepEnd)) : null;
  const dday = periodDday(date, periodExpectedDate);

  return (
    <Card title="아침 체크" action={<span className="text-xs text-ink-soft">일어나서 바로 적어요</span>}>
      <div className="grid gap-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium">총 수면량</span>
            <span className="text-lg font-bold text-pen">{sleep ?? "–"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-1 gap-1 text-xs text-ink-soft">
              <span className="flex items-center justify-between">
                <label htmlFor="sleepStart">어젯밤 잠든 시각</label>
                {morning.sleepStart && (
                  <button
                    type="button"
                    aria-label="어젯밤 잠든 시각 지우기"
                    onClick={() => set("sleepStart", undefined)}
                    className="underline"
                  >
                    지우기
                  </button>
                )}
              </span>
              <input
                id="sleepStart"
                type="time"
                className={inputClass}
                value={morning.sleepStart ?? ""}
                onChange={(e) => set("sleepStart", e.target.value || undefined)}
              />
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs text-ink-soft">
              <span className="flex items-center justify-between">
                <label htmlFor="sleepEnd">오늘 일어난 시각</label>
                {morning.sleepEnd && (
                  <button
                    type="button"
                    aria-label="오늘 일어난 시각 지우기"
                    onClick={() => set("sleepEnd", undefined)}
                    className="underline"
                  >
                    지우기
                  </button>
                )}
              </span>
              <input
                id="sleepEnd"
                type="time"
                className={inputClass}
                value={morning.sleepEnd ?? ""}
                onChange={(e) => set("sleepEnd", e.target.value || undefined)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MeasureField
            label="체중"
            unit="kg"
            value={morning.weightKg}
            previous={previous.weightKg}
            onChange={(v) => set("weightKg", v)}
          />
          <MeasureField
            label="허리 둘레"
            unit="cm"
            value={morning.waistCm}
            previous={previous.waistCm}
            onChange={(v) => set("waistCm", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">화장실</span>
          <div className="flex items-center gap-3">
            <StepButton
              label="화장실 횟수 줄이기"
              onClick={() => set("bowelCount", Math.max(0, (morning.bowelCount ?? 0) - 1))}
            >
              −
            </StepButton>
            <span className="w-8 text-center text-lg font-bold text-pen">{morning.bowelCount ?? 0}</span>
            <StepButton label="화장실 횟수 늘리기" onClick={() => set("bowelCount", (morning.bowelCount ?? 0) + 1)}>
              +
            </StepButton>
          </div>
        </div>

        {periodTracking && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">생리</span>
            {dday ? (
              <span className="rounded-full bg-pen/10 px-3 py-1 text-sm font-bold text-pen">{dday}</span>
            ) : (
              <Link href="/settings" className="text-xs text-ink-soft underline">
                {periodExpectedDate ? "기록 기간 아님 (D-7 ~ D+7)" : "예정일 입력하기"}
              </Link>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/** 체중·허리: 직접 입력하거나, 지난 기록에서 ±0.1씩 조정 */
function MeasureField({
  label,
  unit,
  value,
  previous,
  onChange,
}: {
  label: string;
  unit: string;
  value?: number;
  previous?: number;
  onChange: (value: number | undefined) => void;
}) {
  const step = (delta: number) => {
    const base = value ?? previous;
    if (base === undefined) return;
    onChange(Math.round((base + delta) * 10) / 10);
  };

  return (
    <div className="grid content-start gap-1 text-xs text-ink-soft">
      <label htmlFor={`measure-${label}`}>{label}</label>
      <div className="relative">
        <input
          id={`measure-${label}`}
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          className={`${inputClass} pr-10`}
          placeholder={previous !== undefined ? String(previous) : undefined}
          value={value ?? ""}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            onChange(Number.isFinite(n) ? n : undefined);
          }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{unit}</span>
      </div>
      {previous !== undefined && (
        <div className="flex gap-1">
          <StepButton small label={`${label} 0.1 줄이기`} onClick={() => step(-0.1)}>
            −
          </StepButton>
          {value === undefined ? (
            <button
              type="button"
              onClick={() => onChange(previous)}
              className="flex-1 rounded-full border border-line text-[11px] text-ink"
            >
              지난번 {previous}
            </button>
          ) : (
            <span className="flex-1" />
          )}
          <StepButton small label={`${label} 0.1 늘리기`} onClick={() => step(0.1)}>
            +
          </StepButton>
        </div>
      )}
    </div>
  );
}

function StepButton({
  label,
  small,
  onClick,
  children,
}: {
  label: string;
  small?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid place-items-center rounded-full border border-line text-ink active:bg-paper ${
        small ? "h-7 w-7 text-base" : "h-9 w-9 text-lg"
      }`}
    >
      {children}
    </button>
  );
}
