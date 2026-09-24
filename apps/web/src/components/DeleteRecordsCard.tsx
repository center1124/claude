"use client";

import { useState } from "react";
import { formatDateKo, type ISODate } from "@diet/core";
import { useRepository } from "@/lib/repository";
import { useToday } from "@/lib/use-today";
import { Card, inputClass } from "./ui";

/** 설정: 하루 기록 지우기 / 모든 기록 지우기 (체험하며 넣은 기록 정리용) */
export function DeleteRecordsCard() {
  const repo = useRepository();
  const today = useToday();
  const [date, setDate] = useState<ISODate | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const target = date || today;

  async function deleteDay() {
    if (!target || !confirm(`${formatDateKo(target)} 기록(아침 체크·식사·사진·운동)을 모두 지울까요?`)) return;
    await repo.deleteLog(target);
    setMessage(`${formatDateKo(target)} 기록을 지웠어요.`);
  }

  async function deleteAll() {
    if (!confirm("모든 날의 기록과 사진을 지울까요? 이름·생리 예정일·운동 루틴은 남아요.")) return;
    await repo.deleteAllLogs();
    setMessage("모든 기록을 지웠어요.");
  }

  return (
    <Card title="기록 지우기">
      <div className="grid gap-3">
        <div className="flex gap-2">
          <input
            type="date"
            aria-label="지울 날짜"
            className={`${inputClass} flex-1`}
            value={target ?? ""}
            onChange={(e) => {
              setDate(e.target.value);
              setMessage(null);
            }}
          />
          <button
            type="button"
            onClick={deleteDay}
            className="shrink-0 rounded-lg border border-pen px-4 text-sm font-bold text-pen"
          >
            이 날 지우기
          </button>
        </div>
        <button type="button" onClick={deleteAll} className="justify-self-start text-sm text-ink-soft underline">
          모든 기록 지우기
        </button>
        {message && (
          <p role="status" className="text-sm text-pen">
            {message}
          </p>
        )}
      </div>
    </Card>
  );
}
