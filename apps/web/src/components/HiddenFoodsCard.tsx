"use client";

import { Card } from "./ui";

/** 설정: 자주 먹는 음식 버튼에서 뺀 음식. 되살리면 다시 버튼으로 나온다 */
export function HiddenFoodsCard({ foods, onChange }: { foods: string[]; onChange: (foods: string[]) => void }) {
  if (foods.length === 0) return null;
  return (
    <Card title="숨긴 음식">
      <p className="mb-2 text-xs text-ink-soft">자주 먹는 음식 버튼에서 뺀 음식이에요. 지난 기록은 그대로 있어요.</p>
      <ul className="flex flex-wrap gap-1.5">
        {foods.map((food) => (
          <li key={food} className="flex items-center rounded-full border border-line bg-paper text-sm">
            <span className="py-1.5 pl-3 pr-1 text-ink-soft line-through">{food}</span>
            <button
              type="button"
              onClick={() => onChange(foods.filter((f) => f !== food))}
              className="px-2.5 py-1.5 text-xs font-bold text-pen"
            >
              되살리기
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
