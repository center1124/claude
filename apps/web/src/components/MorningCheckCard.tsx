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
 * "어제와 같아요" 한 번으로 채운다. 자동으로 채우지는 않는다 (기록을 잊은 날과 구분되도록).
 * 시각은 아이폰 시간 휠 대신 가로 슬라이더(10분 단위)와 ±10분 버튼으로 고른다.
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
  const empty = !sleepStart && !sleepEnd;
  const total = sleepStart && sleepEnd ? formatDuration(sleepMinutes(sleepStart, sleepEnd)) : null;
  // 오늘 수면이 비어 있으면 지난번 수면을 흐리게 깔아 두고, 같으면 한 번에, 다르면 밀어서 고친다
  const ghost = empty && previous ? previous : undefined;

  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">수면</span>
        <span className="text-sm">
          {total ? (
            <>
              총 <b className="text-pen">{total}</b>
            </>
          ) : (
            <span className="text-xs text-ink-soft">🌙 ☀️ 손잡이를 밀어서 골라주세요</span>
          )}
        </span>
      </div>
      {ghost && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-highlight/40 px-3 py-2 text-sm">
          <span>
            지난번 <b>{ghost.sleepStart ?? "–"}</b> → <b>{ghost.sleepEnd}</b>
          </span>
          <button
            type="button"
            onClick={() => onChange({ sleepStart: ghost.sleepStart, sleepEnd: ghost.sleepEnd })}
            className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-sm font-bold text-white"
          >
            어제와 같아요
          </button>
        </div>
      )}
      <SleepRangeBar sleepStart={sleepStart} sleepEnd={sleepEnd} ghost={ghost} onChange={onChange} />
    </div>
  );
}

/**
 * 한 막대에 손잡이 두 개: 왼쪽은 잠든 시각, 오른쪽은 일어난 시각.
 * 막대는 저녁 8시 ~ 다음 날 오후 1시를 이어서 그리고, 두 손잡이 사이를 형광펜처럼 칠한다.
 */
const TRACK = { from: 20 * 60, to: 37 * 60 };
const DAY = 24 * 60;
const STEP = 10;

/** 시각 → 막대 위 분 (정오 전 시각은 다음 날로 본다) */
function toTrack(time: HHMM): number {
  const [h, m] = time.split(":").map(Number);
  const minutes = h * 60 + m;
  return minutes < 12 * 60 ? minutes + DAY : minutes;
}

function fromTrack(minutes: number): HHMM {
  const m = ((minutes % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const clampTrack = (minutes: number) => Math.min(Math.max(minutes, TRACK.from), TRACK.to);
const trackPct = (minutes: number) => `${((minutes - TRACK.from) / (TRACK.to - TRACK.from)) * 100}%`;

function SleepRangeBar({
  sleepStart,
  sleepEnd,
  ghost,
  onChange: save,
}: {
  sleepStart?: HHMM;
  sleepEnd?: HHMM;
  /** 비어 있을 때 깔아 둘 지난번 수면. 한쪽만 밀어도 다른 쪽은 이 값으로 채운다 */
  ghost?: { sleepStart?: HHMM; sleepEnd: HHMM };
  onChange: (sleep: { sleepStart?: HHMM; sleepEnd?: HHMM }) => void;
}) {
  const onChange = (sleep: { sleepStart?: HHMM; sleepEnd?: HHMM }) =>
    save(ghost ? { sleepStart: ghost.sleepStart, sleepEnd: ghost.sleepEnd, ...sleep } : sleep);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [typing, setTyping] = useState(false);
  // 값이 없으면 손잡이를 흐리게 평소 자리에 둔다 (저장되지는 않는다)
  const start = toTrack(sleepStart ?? ghost?.sleepStart ?? "00:00");
  const end = toTrack(sleepEnd ?? ghost?.sleepEnd ?? "07:00");

  function minutesAt(e: React.PointerEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    return clampTrack(Math.round((TRACK.from + fraction * (TRACK.to - TRACK.from)) / STEP) * STEP);
  }

  function move(which: "start" | "end", minutes: number) {
    // 두 손잡이는 서로 넘지 않는다 (최소 10분 수면)
    if (which === "start") onChange({ sleepStart: fromTrack(Math.min(minutes, end - STEP)) });
    else onChange({ sleepEnd: fromTrack(Math.max(minutes, start + STEP)) });
  }

  const shift = (which: "start" | "end", delta: number) =>
    move(which, clampTrack((which === "start" ? start : end) + delta));

  const hours = Array.from({ length: 18 }, (_, i) => TRACK.from + i * 60);

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <EndControl
          label="잠든 시각"
          value={sleepStart}
          ghostValue={ghost?.sleepStart}
          onShift={(d) => shift("start", d)}
          onClear={() => onChange({ sleepStart: undefined })}
        />
        <EndControl
          label="일어난 시각"
          value={sleepEnd}
          ghostValue={ghost?.sleepEnd}
          onShift={(d) => shift("end", d)}
          onClear={() => onChange({ sleepEnd: undefined })}
          alignEnd
        />
      </div>

      {typing ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="잠든 시각 직접 입력"
            type="time"
            className={inputClass}
            value={sleepStart ?? ""}
            onChange={(e) => onChange({ sleepStart: e.target.value || undefined })}
          />
          <input
            aria-label="일어난 시각 직접 입력"
            type="time"
            className={inputClass}
            value={sleepEnd ?? ""}
            onChange={(e) => onChange({ sleepEnd: e.target.value || undefined })}
          />
        </div>
      ) : (
        <div className="px-3">
          <div
            className="relative h-11 touch-none select-none"
            data-testid="sleep-bar"
            onPointerDown={(e) => {
              const minutes = minutesAt(e);
              // 가까운 손잡이를 잡는다
              const which = Math.abs(minutes - start) <= Math.abs(minutes - end) ? "start" : "end";
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(which);
              move(which, minutes);
            }}
            onPointerMove={(e) => dragging && move(dragging, minutesAt(e))}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
          >
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line" />
            {hours.map((m) => (
              <div
                key={m}
                className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ink-soft/30"
                style={{ left: trackPct(m) }}
              />
            ))}
            <div
              className={`absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-highlight ${
                sleepStart && sleepEnd ? "" : "opacity-50"
              }`}
              style={{ left: trackPct(start), width: `calc(${trackPct(end)} - ${trackPct(start)})` }}
            />
            {(["start", "end"] as const).map((which) => {
              const value = which === "start" ? sleepStart : sleepEnd;
              return (
                <div
                  key={which}
                  role="slider"
                  aria-label={which === "start" ? "잠든 시각" : "일어난 시각"}
                  aria-valuetext={value ?? "없음"}
                  aria-valuemin={TRACK.from}
                  aria-valuemax={TRACK.to}
                  aria-valuenow={which === "start" ? start : end}
                  className={`absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-card text-sm shadow ${
                    value ? "bg-pen" : "bg-ink-soft/40"
                  }`}
                  style={{ left: trackPct(which === "start" ? start : end) }}
                >
                  {which === "start" ? "🌙" : "☀️"}
                </div>
              );
            })}
          </div>
          <div className="relative h-4 text-[11px] text-ink-soft">
            {[20, 24, 28, 32, 36].map((h) => (
              <span key={h} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: trackPct(h * 60) }}>
                {`${h % 24}시`}
              </span>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setTyping(!typing)} className="justify-self-center text-xs text-ink-soft underline">
        {typing ? "막대로 고르기" : "직접 입력"}
      </button>
    </div>
  );
}

function EndControl({
  label,
  value,
  ghostValue,
  onShift,
  onClear,
  alignEnd,
}: {
  label: string;
  value?: HHMM;
  /** 아직 저장되지 않은 지난번 값 (흐리게) */
  ghostValue?: HHMM;
  onShift: (delta: number) => void;
  onClear: () => void;
  alignEnd?: boolean;
}) {
  return (
    <div className={`grid gap-1 ${alignEnd ? "justify-items-end" : ""}`}>
      <span className="flex items-center gap-2 text-xs text-ink-soft">
        {label}
        {value && (
          <button type="button" aria-label={`${label} 지우기`} onClick={onClear} className="underline">
            지우기
          </button>
        )}
      </span>
      <span className={`text-xl font-bold ${value ? "text-pen" : "text-ink-soft/50"}`}>{value ?? ghostValue ?? "–"}</span>
      <span className="flex gap-1">
        <button type="button" aria-label={`${label} 10분 앞으로`} onClick={() => onShift(-STEP)} className={stepClass}>
          −10분
        </button>
        <button type="button" aria-label={`${label} 10분 뒤로`} onClick={() => onShift(STEP)} className={stepClass}>
          +10분
        </button>
      </span>
    </div>
  );
}

const stepClass = "rounded-full border border-line px-2.5 py-1 text-xs active:bg-paper";

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
              className="flex-1 rounded-full border border-line text-xs text-ink"
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
