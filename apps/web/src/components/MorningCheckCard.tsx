"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration, periodDday, sleepMinutes, type HHMM, type ISODate, type MorningCheck } from "@diet/core";
import { Card, inputClass } from "./ui";

interface Props {
  date: ISODate;
  morning: MorningCheck;
  /** 가장 최근에 기록한 체중·허리 (빈칸을 채우는 출발점) */
  previous: { weightKg?: number; waistCm?: number };
  /** 가장 최근 수면 (어제와 같으면 한 번에 채운다) */
  previousSleep: { sleepStart?: HHMM; sleepEnd: HHMM } | null;
  periodTracking: boolean;
  periodExpectedDate?: ISODate;
  onChange: (morning: MorningCheck) => void;
}

export function MorningCheckCard({
  date,
  morning,
  previous,
  previousSleep,
  periodTracking,
  periodExpectedDate,
  onChange,
}: Props) {
  const set = <K extends keyof MorningCheck>(key: K, value: MorningCheck[K]) =>
    onChange({ ...morning, [key]: value });

  const dday = periodDday(date, periodExpectedDate);

  return (
    <Card title="아침 체크" action={<span className="text-xs text-ink-soft">일어나서 바로 적어요</span>}>
      <div className="grid gap-4">
        <SleepField
          sleepStart={morning.sleepStart}
          sleepEnd={morning.sleepEnd}
          previous={previousSleep}
          onChange={(sleep) => onChange({ ...morning, ...sleep })}
        />

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

/**
 * 수면: 어젯밤 잠든 시각 → 오늘 일어난 시각. 비어 있으면 최근 수면을 제안하고
 * "맞아요" 한 번으로 채운다. 자동으로 채우지는 않는다 (기록을 잊은 날과 구분되도록).
 */
function SleepField({
  sleepStart,
  sleepEnd,
  previous,
  onChange,
}: {
  sleepStart?: HHMM;
  sleepEnd?: HHMM;
  previous: { sleepStart?: HHMM; sleepEnd: HHMM } | null;
  onChange: (sleep: { sleepStart?: HHMM; sleepEnd?: HHMM }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const empty = !sleepStart && !sleepEnd;
  const total = sleepStart && sleepEnd ? formatDuration(sleepMinutes(sleepStart, sleepEnd)) : null;

  if (empty && previous && !editing) {
    return (
      <div className="grid gap-2 rounded-xl bg-highlight/40 p-3">
        <p className="text-sm">
          😴 어젯밤 <b>{previous.sleepStart ?? "–"}</b> 잠 → <b>{previous.sleepEnd}</b> 기상
          <span className="ml-1 text-xs text-ink-soft">(지난번과 같게)</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ sleepStart: previous.sleepStart, sleepEnd: previous.sleepEnd })}
            className="flex-1 rounded-lg bg-ink py-2 text-sm font-bold text-white"
          >
            맞아요
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 rounded-lg border border-ink/20 bg-card py-2 text-sm"
          >
            다르게 입력
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">수면</span>
        <span className="text-sm">
          {total ? (
            <>
              총 <b className="text-pen">{total}</b>
            </>
          ) : (
            <span className="text-xs text-ink-soft">잠든 시각과 일어난 시각을 적어주세요</span>
          )}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <TimeField id="sleepStart" label="어젯밤 잠든 시각" value={sleepStart} onChange={(v) => onChange({ sleepStart: v })} />
        <span className="pb-2.5 text-ink-soft">→</span>
        <TimeField id="sleepEnd" label="오늘 일어난 시각" value={sleepEnd} onChange={(v) => onChange({ sleepEnd: v })} />
      </div>
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value?: HHMM;
  onChange: (value: HHMM | undefined) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1 text-xs text-ink-soft">
      <span className="flex items-center justify-between">
        <label htmlFor={id}>{label}</label>
        {value && (
          <button type="button" aria-label={`${label} 지우기`} onClick={() => onChange(undefined)} className="underline">
            지우기
          </button>
        )}
      </span>
      <input
        id={id}
        type="time"
        className={inputClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
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
