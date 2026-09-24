"use client";

import { useState } from "react";
import {
  EXERCISE_KIND_LABELS,
  EXERCISE_SLOT_LABELS,
  formatAmount,
  previousExercise,
  recentExtraExercises,
  stepAmount,
  type DailyExercise,
  type DailyLog,
  type Exercise,
  type ExerciseSlot,
} from "@diet/core";
import { ExerciseEditor } from "./ExerciseEditor";
import { Card } from "./ui";

const SLOTS = Object.entries(EXERCISE_SLOT_LABELS) as [ExerciseSlot, string][];

interface Props {
  exercise: DailyExercise | undefined;
  routine: Exercise[];
  /** 오늘 이전 기록 (어제와 같아요, 최근 운동) */
  pastLogs: DailyLog[];
  onChange: (exercise: DailyExercise) => void;
  onAddToRoutine: (exercise: Exercise) => void;
}

/**
 * 운동: 내 루틴을 체크 목록으로 보여주고, 한 것만 눌러서 체크한다.
 * 양이 달랐으면 ±버튼, 루틴에 없는 운동은 최근에 한 것(최대 5개)에서 고르거나 새로 만든다.
 */
export function ExerciseCard({ exercise, routine, pastLogs, onChange, onAddToRoutine }: Props) {
  const items = exercise?.items ?? [];
  const [editing, setEditing] = useState<{ exercise?: Exercise } | null>(null);
  const [picking, setPicking] = useState(false);

  const previous = previousExercise(pastLogs);
  const extras = recentExtraExercises(pastLogs, routine).filter((e) => !items.some((i) => i.name === e.name));
  const others = items.filter((i) => !routine.some((r) => r.name === i.name));

  const save = (next: Exercise[]) => onChange({ items: next });
  const add = (e: Exercise) => save([...items, { ...e, id: crypto.randomUUID() }]);
  const update = (e: Exercise) => save(items.map((i) => (i.id === e.id ? e : i)));
  const remove = (id: string) => save(items.filter((i) => i.id !== id));

  if (exercise?.rest) {
    return (
      <Card title="운동">
        <div className="flex items-center justify-between rounded-xl bg-paper px-3 py-3 text-sm">
          <span>😌 오늘은 쉬었어요</span>
          <button type="button" onClick={() => onChange({ items: [] })} className="text-xs text-ink-soft underline">
            취소
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="운동">
      <div className="grid gap-2">
        {items.length === 0 && (previous || routine.length === 0) && (
          <div className="grid grid-cols-2 gap-2">
            {previous && (
              <button
                type="button"
                onClick={() => save(previous.map((e) => ({ ...e, id: crypto.randomUUID() })))}
                className="rounded-xl bg-ink py-2.5 text-sm font-bold text-white"
              >
                어제와 같아요
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange({ items: [], rest: true })}
              className={`rounded-xl border border-line py-2.5 text-sm ${previous ? "" : "col-span-2"}`}
            >
              오늘은 쉬었어요
            </button>
          </div>
        )}
        {previous && items.length === 0 && (
          <p className="text-xs text-ink-soft">지난번: {previous.map((e) => `${e.name} ${formatAmount(e)}`).join(", ")}</p>
        )}

        {routine.length > 0 && (
          <ul className="grid gap-1.5" aria-label="내 운동 루틴">
            {routine.map((r) => {
              const done = items.find((i) => i.name === r.name);
              return done ? (
                <ExerciseRow
                  key={r.id}
                  exercise={done}
                  onChange={update}
                  onRemove={() => remove(done.id)}
                  onEdit={() => setEditing({ exercise: done })}
                />
              ) : (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => add(r)}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-left"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-line" aria-hidden />
                    <span className="flex-1">
                      {r.name} <span className="text-sm text-ink-soft">{formatAmount(r)}</span>
                    </span>
                    <span className="text-xs text-ink-soft">했어요</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {routine.length > 0 && items.length === 0 && !previous && (
          <button
            type="button"
            onClick={() => onChange({ items: [], rest: true })}
            className="justify-self-start text-xs text-ink-soft underline"
          >
            오늘은 쉬었어요
          </button>
        )}

        {others.length > 0 && (
          <ul className="grid gap-1.5">
            {others.map((e) => (
              <ExerciseRow
                key={e.id}
                exercise={e}
                onChange={update}
                onRemove={() => remove(e.id)}
                onEdit={() => setEditing({ exercise: e })}
              />
            ))}
          </ul>
        )}

        {picking ? (
          <div className="grid gap-2 rounded-xl bg-paper p-3">
            {extras.length > 0 && (
              <>
                <span className="text-xs text-ink-soft">최근에 한 운동</span>
                <div className="flex flex-wrap gap-1.5">
                  {extras.map((e) => (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => {
                        add(e);
                        setPicking(false);
                      }}
                      className="rounded-full border border-line bg-card px-3 py-1.5 text-sm"
                    >
                      + {e.name} <span className="text-ink-soft">{formatAmount(e)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPicking(false);
                  setEditing({});
                }}
                className="flex-1 rounded-lg border border-pen py-2 text-sm font-bold text-pen"
              >
                새 운동 적기
              </button>
              <button type="button" onClick={() => setPicking(false)} className="rounded-lg px-3 text-sm text-ink-soft">
                닫기
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (extras.length ? setPicking(true) : setEditing({}))}
            className="justify-self-start rounded-full border border-pen px-4 py-1.5 text-sm font-bold text-pen"
          >
            + 다른 운동
          </button>
        )}
      </div>

      {editing && (
        <ExerciseEditor
          title={editing.exercise ? "운동 고치기" : "새 운동"}
          exercise={editing.exercise}
          offerRoutine={!editing.exercise}
          onSave={(e, toRoutine) => {
            if (editing.exercise) update(e);
            else add(e);
            if (toRoutine) onAddToRoutine({ ...e, id: crypto.randomUUID(), slot: undefined });
          }}
          onDelete={editing.exercise ? () => remove(editing.exercise!.id) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

/** 한 운동: 이름·양(±), 한 때(아침·점심·저녁, 선택), 지우기 */
function ExerciseRow({
  exercise,
  onChange,
  onRemove,
  onEdit,
}: {
  exercise: Exercise;
  onChange: (exercise: Exercise) => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const small = "grid h-8 w-8 place-items-center rounded-full border border-line bg-card text-base";
  return (
    <li className="grid gap-2 rounded-xl border border-line px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-pen text-sm text-white" aria-hidden>
          ✓
        </span>
        <button type="button" onClick={onEdit} className="flex-1 text-left">
          <span className="font-medium">{exercise.name}</span>
          <span className="ml-1.5 text-xs text-ink-soft">{EXERCISE_KIND_LABELS[exercise.kind]}</span>
        </button>
        <button
          type="button"
          aria-label={`${exercise.name} 지우기`}
          onClick={onRemove}
          className="px-1 text-ink-soft"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`${exercise.name} 줄이기`}
            onClick={() => onChange({ ...exercise, amount: stepAmount(exercise, -1) })}
            className={small}
          >
            −
          </button>
          <span className="min-w-16 whitespace-nowrap text-center font-bold text-pen">{formatAmount(exercise)}</span>
          <button
            type="button"
            aria-label={`${exercise.name} 늘리기`}
            onClick={() => onChange({ ...exercise, amount: stepAmount(exercise, 1) })}
            className={small}
          >
            +
          </button>
        </span>
        <span className="ml-auto flex gap-1">
          {SLOTS.map(([slot, label]) => (
            <button
              key={slot}
              type="button"
              aria-pressed={exercise.slot === slot}
              onClick={() => onChange({ ...exercise, slot: exercise.slot === slot ? undefined : slot })}
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${
                exercise.slot === slot ? "border-ink bg-ink text-white" : "border-line text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </span>
      </div>
    </li>
  );
}
