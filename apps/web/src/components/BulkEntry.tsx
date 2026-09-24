"use client";

import { useState } from "react";
import { parseDayText, type ParsedMeal } from "@diet/core";
import { inputClass } from "./ui";

const PLACEHOLDER = `9:00 과채스무디
12:30 돌솥비빔밥
+ 밥 추가 포만 8
3:00 쿠키 1개
6:40 제육볶음, 샐러드 포만 9`;

/** 종이 기록지처럼 하루 식사를 여러 줄로 한 번에 쓰기 */
export function BulkEntry({ onSave, onClose }: { onSave: (meals: ParsedMeal[]) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const parsed = parseDayText(text);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="한 번에 쓰기"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">한 번에 쓰기</h2>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-ink-soft">
          종이에 쓰듯 <b>시각 + 먹은 것</b>을 한 줄씩 적어주세요. 시각이 없는 줄은 위 식사에 이어져요.
          <br />
          끝에 “포만 8”을 붙이면 포만감도 기록돼요.
        </p>
        <textarea
          aria-label="하루 식사"
          rows={7}
          className={inputClass}
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {parsed.length > 0 && (
          <ul className="mt-3 grid gap-1.5" aria-label="미리보기">
            {parsed.map((m, i) => (
              <li key={i} className="flex gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
                <span className="w-12 shrink-0 font-bold">{m.time}</span>
                <span className="flex-1 whitespace-pre-line text-pen">{m.description || "–"}</span>
                {m.fullness && <span className="shrink-0 font-bold text-pen-blue">포만 {m.fullness}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="ml-auto rounded-xl border border-line px-5 py-3 text-sm">
            취소
          </button>
          <button
            type="button"
            disabled={parsed.length === 0}
            onClick={() => {
              onSave(parsed);
              onClose();
            }}
            className="rounded-xl bg-pen px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {parsed.length ? `식사 ${parsed.length}개 기록하기` : "기록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
