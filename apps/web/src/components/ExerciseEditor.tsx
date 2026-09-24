"use client";

import { useState } from "react";
import {
  DEFAULT_AMOUNT,
  EXERCISE_KIND_LABELS,
  EXERCISE_METHOD_LABELS,
  type Exercise,
  type ExerciseAmount,
  type ExerciseKind,
  type ExerciseMethod,
} from "@diet/core";
import { inputClass } from "./ui";

const KINDS = Object.entries(EXERCISE_KIND_LABELS) as [ExerciseKind, string][];
const METHODS = Object.entries(EXERCISE_METHOD_LABELS) as [ExerciseMethod, string][];

/** 종류별로 흔한 방식 (종류를 고르면 방식을 먼저 맞춰 둔다) */
const METHOD_FOR_KIND: Record<ExerciseKind, ExerciseMethod> = {
  cardio: "time",
  strength: "sets",
  flexibility: "time",
  other: "time",
};

interface Props {
  exercise?: Exercise;
  title: string;
  /** 새 운동을 오늘 기록에 넣을 때: "내 루틴에도 추가" 선택지 */
  offerRoutine?: boolean;
  onSave: (exercise: Exercise, addToRoutine: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** 운동 하나 만들기·고치기: 이름, 종류, 방식, 양 */
export function ExerciseEditor({ exercise, title, offerRoutine, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Exercise>(
    () =>
      exercise ?? {
        id: crypto.randomUUID(),
        name: "",
        kind: "cardio",
        method: "time",
        amount: DEFAULT_AMOUNT.time,
      },
  );
  const [addToRoutine, setAddToRoutine] = useState(false);
  const setAmount = (patch: ExerciseAmount) => setDraft((d) => ({ ...d, amount: { ...d.amount, ...patch } }));
  const setMethod = (method: ExerciseMethod) =>
    setDraft((d) => ({ ...d, method, amount: d.method === method ? d.amount : DEFAULT_AMOUNT[method] }));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        <div className="grid grid-cols-1 gap-5">
          <label className="grid grid-cols-1 gap-1.5 text-sm font-medium">
            운동 이름
            <input
              className={inputClass}
              placeholder="예) 걷기, 스쿼트, 요가"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>

          <ChoiceRow
            legend="종류"
            options={KINDS}
            value={draft.kind}
            onChange={(kind) =>
              setDraft((d) => ({
                ...d,
                kind,
                method: METHOD_FOR_KIND[kind],
                amount: d.method === METHOD_FOR_KIND[kind] ? d.amount : DEFAULT_AMOUNT[METHOD_FOR_KIND[kind]],
              }))
            }
          />
          <ChoiceRow legend="방식" options={METHODS} value={draft.method} onChange={setMethod} />

          <div className="grid gap-1.5">
            <span className="text-sm font-medium">양</span>
            {draft.method === "time" && (
              <NumberInput label="분" value={draft.amount.minutes} onChange={(minutes) => setAmount({ minutes })} />
            )}
            {draft.method === "sets" && (
              <div className="grid grid-cols-3 gap-2">
                <NumberInput label="세트" value={draft.amount.sets} onChange={(sets) => setAmount({ sets })} />
                <NumberInput label="회" value={draft.amount.reps} onChange={(reps) => setAmount({ reps })} />
                <NumberInput
                  label="kg"
                  step="0.5"
                  value={draft.amount.weightKg}
                  onChange={(weightKg) => setAmount({ weightKg })}
                />
              </div>
            )}
            {draft.method === "distance" && (
              <NumberInput label="km" step="0.1" value={draft.amount.km} onChange={(km) => setAmount({ km })} />
            )}
            {draft.method === "steps" && (
              <NumberInput label="보" step="100" value={draft.amount.steps} onChange={(steps) => setAmount({ steps })} />
            )}
          </div>

          {offerRoutine && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--pen)]"
                checked={addToRoutine}
                onChange={(e) => setAddToRoutine(e.target.checked)}
              />
              내 운동 루틴에도 넣기 (매일 체크 목록에 나와요)
            </label>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="rounded-xl px-4 py-3 text-sm text-ink-soft"
            >
              삭제
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-xl border border-line px-5 py-3 text-sm">
            취소
          </button>
          <button
            type="button"
            disabled={!draft.name.trim()}
            onClick={() => {
              onSave({ ...draft, name: draft.name.trim() }, addToRoutine);
              onClose();
            }}
            className="rounded-xl bg-pen px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceRow<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              value === key ? "border-pen bg-pen text-white" : "border-line bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function NumberInput({
  label,
  value,
  step = "1",
  onChange,
}: {
  label: string;
  value?: number;
  step?: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="relative">
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        className={`${inputClass} pr-12`}
        value={value ?? ""}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          onChange(Number.isFinite(n) ? n : undefined);
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">{label}</span>
    </div>
  );
}
