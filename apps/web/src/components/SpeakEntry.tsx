"use client";

import { useState } from "react";
import {
  EXERCISE_SLOT_LABELS,
  formatAmount,
  formatDuration,
  parseSpokenLog,
  sleepMinutes,
  type Exercise,
  type SpokenLog,
} from "@diet/core";
import { inputClass } from "./ui";

const EXAMPLE =
  "예) 어젯밤 12시 반에 자서 7시에 일어났어. 체중 73.4, 허리 92, 화장실 한 번. " +
  "9시 스무디, 12시 반 비빔밥 포만 8, 저녁 7시 제육볶음 포만 9. 굿모닝 10개 5세트, 걷기 30분";

/**
 * 말로 기록: 키보드 받아쓰기(🎤)로 하루를 말하면 칸별로 나눠 보여주고, 확인한 뒤 저장한다.
 * AI 없이 정해진 말 패턴으로 읽으므로, 알아듣지 못한 말은 따로 보여준다.
 */
export function SpeakEntry({
  knownExercises,
  onSave,
  onClose,
}: {
  knownExercises: Pick<Exercise, "name" | "kind" | "method">[];
  onSave: (parsed: SpokenLog) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const parsed = parseSpokenLog(text, knownExercises);
  const { morning } = parsed;
  const morningFacts = [
    morning.sleepStart && `잠든 시각 ${morning.sleepStart}`,
    morning.sleepEnd && `일어난 시각 ${morning.sleepEnd}`,
    morning.sleepStart && morning.sleepEnd && `총 수면 ${formatDuration(sleepMinutes(morning.sleepStart, morning.sleepEnd))}`,
    morning.weightKg !== undefined && `체중 ${morning.weightKg}kg`,
    morning.waistCm !== undefined && `허리 ${morning.waistCm}cm`,
    morning.bowelCount !== undefined && `화장실 ${morning.bowelCount}번`,
  ].filter(Boolean);
  const count = morningFacts.length + parsed.meals.length + parsed.exercises.length;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="말로 기록"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">🎤 말로 기록</h2>
        <p className="mb-3 mt-1 text-sm leading-relaxed text-ink-soft">
          아래 칸을 누르고 키보드의 🎤를 눌러 말하세요. 수면, 체중, 허리, 화장실, 식사, 운동을 칸별로 나눠 드려요.
        </p>
        <textarea
          aria-label="하루 이야기"
          rows={6}
          className={inputClass}
          placeholder={EXAMPLE}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {text.trim() && (
          <div className="mt-4 grid gap-3 text-sm" aria-label="나눈 결과">
            {morningFacts.length > 0 && (
              <Section title="아침 체크">
                <p>{morningFacts.join(" · ")}</p>
              </Section>
            )}
            {parsed.meals.length > 0 && (
              <Section title="식사">
                <ul className="grid gap-1">
                  {parsed.meals.map((m, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-12 shrink-0 font-bold">{m.time}</span>
                      <span className="flex-1 text-pen">{m.description ? m.description.split("\n").join(" · ") : "–"}</span>
                      {m.fullness && <span className="shrink-0 font-bold text-pen-blue">포만 {m.fullness}</span>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {parsed.exercises.length > 0 && (
              <Section title="운동">
                <ul className="grid gap-1">
                  {parsed.exercises.map((e, i) => (
                    <li key={i}>
                      {e.name} <b className="text-pen">{formatAmount(e)}</b>
                      {e.slot && <span className="text-ink-soft"> ({EXERCISE_SLOT_LABELS[e.slot]})</span>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {parsed.unparsed.length > 0 && (
              <Section title="알아듣지 못한 말">
                <ul className="grid gap-1 text-ink-soft">
                  {parsed.unparsed.map((u, i) => (
                    <li key={i}>“{u}”</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-ink-soft">
                  시각(9시, 12시 반)이나 “체중”, “허리”, “세트”, “분” 같은 말을 넣으면 알아들어요. 저장해도 이 말은
                  빠져요.
                </p>
              </Section>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="ml-auto rounded-xl border border-line px-5 py-3 text-sm">
            취소
          </button>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => {
              onSave(parsed);
              onClose();
            }}
            className="rounded-xl bg-pen px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            기록하기
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-paper p-3">
      <h3 className="mb-1 text-xs font-bold text-ink-soft">{title}</h3>
      {children}
    </section>
  );
}
