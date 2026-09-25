"use client";

import { useState } from "react";
import { foodsOf } from "@diet/core";
import { inputClass } from "./ui";

/**
 * 한 끼의 음식들: 음식마다 따로 누를 수 있다. 누르면 그 음식만 고치고, ✕로 그 음식만 지운다.
 * 아래 칸에 쓰거나 말해서 추가한다 (쉼표로 여러 개를 한 번에).
 */
export function FoodList({
  foods,
  dimmed,
  adding,
  onAddingChange,
  onChange,
}: {
  foods: string[];
  /** 지난번 예시로 채워진 상태 */
  dimmed?: boolean;
  /** 추가 칸에 쓰고 있는 말 (저장을 바로 눌러도 빠지지 않도록 바깥에서 들고 있는다) */
  adding: string;
  onAddingChange: (text: string) => void;
  onChange: (foods: string[]) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const setAdding = onAddingChange;

  function commitEdit(index: number) {
    const replaced = foodsOf(draft);
    onChange([...foods.slice(0, index), ...replaced, ...foods.slice(index + 1)]);
    setEditing(null);
  }

  function add() {
    const added = foodsOf(adding);
    if (!added.length) return;
    onChange([...foods, ...added]);
    setAdding("");
  }

  return (
    <div className="grid gap-2">
      {foods.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="먹은 음식">
          {foods.map((food, i) =>
            editing === i ? (
              <li key={i} className="flex w-full gap-1.5">
                <input
                  autoFocus
                  aria-label="음식 고치기"
                  className={`${inputClass} flex-1`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitEdit(i))}
                />
                <button
                  type="button"
                  onClick={() => commitEdit(i)}
                  className="shrink-0 rounded-lg bg-pen px-3 text-sm font-bold text-white"
                >
                  확인
                </button>
              </li>
            ) : (
              <li
                key={i}
                className={`flex items-center rounded-full border border-pen/40 bg-paper text-pen ${
                  dimmed ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditing(i);
                    setDraft(food);
                  }}
                  className="py-1.5 pl-3 pr-1 text-left"
                >
                  {food}
                </button>
                <button
                  type="button"
                  aria-label={`${food} 지우기`}
                  onClick={() => onChange(foods.filter((_, j) => j !== i))}
                  className="px-2 py-1.5 text-ink-soft"
                >
                  ✕
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <div className="flex gap-1.5">
        <input
          id="meal-description"
          aria-label="음식 추가"
          className={`${inputClass} flex-1`}
          placeholder={foods.length ? "음식 추가" : "예) 돌솥비빔밥, 과채스무디"}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button
          type="button"
          onClick={add}
          disabled={!adding.trim()}
          className="shrink-0 rounded-lg border border-pen px-4 text-sm font-bold text-pen disabled:opacity-40"
        >
          추가
        </button>
      </div>
    </div>
  );
}
