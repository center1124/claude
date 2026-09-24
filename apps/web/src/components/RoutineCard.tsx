"use client";

import { useState } from "react";
import { EXERCISE_KIND_LABELS, formatAmount, type Exercise } from "@diet/core";
import { ExerciseEditor } from "./ExerciseEditor";
import { Card } from "./ui";

/** 설정: 코치와 정한 운동. 하루 기록의 운동 체크 목록이 된다 */
export function RoutineCard({ routine, onChange }: { routine: Exercise[]; onChange: (routine: Exercise[]) => void }) {
  const [editing, setEditing] = useState<{ exercise?: Exercise } | null>(null);

  return (
    <Card
      title="코치와 정한 운동"
      action={
        <button
          type="button"
          onClick={() => setEditing({})}
          className="rounded-full border border-pen px-3 py-1 text-sm font-bold text-pen"
        >
          + 추가
        </button>
      }
    >
      {routine.length === 0 ? (
        <p className="text-sm text-ink-soft">
          코치와 정한 운동을 넣어 두세요. 하루 기록에서 체크만 하면 돼요.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {routine.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setEditing({ exercise: r })}
                className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left"
              >
                <span>
                  {r.name} <span className="text-xs text-ink-soft">{EXERCISE_KIND_LABELS[r.kind]}</span>
                </span>
                <span className="text-sm text-pen">{formatAmount(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ExerciseEditor
          title={editing.exercise ? "운동 고치기" : "코치와 정한 운동 추가"}
          exercise={editing.exercise}
          onSave={(e) =>
            onChange(editing.exercise ? routine.map((r) => (r.id === e.id ? e : r)) : [...routine, e])
          }
          onDelete={editing.exercise ? () => onChange(routine.filter((r) => r.id !== editing.exercise!.id)) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}
