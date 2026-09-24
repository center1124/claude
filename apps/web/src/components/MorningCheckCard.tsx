"use client";

import Link from "next/link";
import { formatDuration, periodDday, sleepMinutes, type ISODate, type MorningCheck } from "@diet/core";
import { Card, inputClass } from "./ui";

interface Props {
  date: ISODate;
  morning: MorningCheck;
  periodExpectedDate?: ISODate;
  onChange: (morning: MorningCheck) => void;
}

export function MorningCheckCard({ date, morning, periodExpectedDate, onChange }: Props) {
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
            <label className="grid gap-1 text-xs text-ink-soft">
              어젯밤 잠든 시각
              <input
                type="time"
                className={inputClass}
                value={morning.sleepStart ?? ""}
                onChange={(e) => set("sleepStart", e.target.value || undefined)}
              />
            </label>
            <label className="grid gap-1 text-xs text-ink-soft">
              오늘 일어난 시각
              <input
                type="time"
                className={inputClass}
                value={morning.sleepEnd ?? ""}
                onChange={(e) => set("sleepEnd", e.target.value || undefined)}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField label="체중" unit="kg" value={morning.weightKg} onChange={(v) => set("weightKg", v)} />
          <NumberField label="허리 둘레" unit="cm" value={morning.waistCm} onChange={(v) => set("waistCm", v)} />
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
      </div>
    </Card>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-ink-soft">
      {label}
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          className={`${inputClass} pr-10`}
          value={value ?? ""}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            onChange(Number.isFinite(n) ? n : undefined);
          }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{unit}</span>
      </div>
    </label>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg active:bg-paper"
    >
      {children}
    </button>
  );
}
