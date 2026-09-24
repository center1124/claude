"use client";

import Link from "next/link";
import { useState } from "react";
import {
  addDays,
  compareTimelineTime,
  formatDateKo,
  isCoachingDay,
  type DailyLog,
  type ISODate,
  type Meal,
} from "@diet/core";
import { useDailyLog, useProfile } from "@/lib/repository";
import { useToday } from "@/lib/use-today";
import { Logo } from "./Logo";
import { MealEditor } from "./MealEditor";
import { MorningCheckCard } from "./MorningCheckCard";
import { Photo } from "./Photo";
import { Timeline } from "./Timeline";
import { Card, Loading } from "./ui";

type Editing = { meal?: Meal } | null;

export function DayView({ date }: { date: ISODate }) {
  const today = useToday();
  const { log, update } = useDailyLog(date);
  const { log: nextLog } = useDailyLog(addDays(date, 1));
  const { log: prevLog } = useDailyLog(addDays(date, -1));
  const { profile } = useProfile();
  const [editing, setEditing] = useState<Editing>(null);

  if (!log || !profile) return <Loading />;

  const meals = [...log.meals].sort((a, b) => compareTimelineTime(a.time, b.time));

  function saveMeal(meal: Meal) {
    if (!log) return;
    const exists = log.meals.some((m) => m.id === meal.id);
    update({ ...log, meals: exists ? log.meals.map((m) => (m.id === meal.id ? meal : m)) : [...log.meals, meal] });
  }

  function deleteMeal(id: string) {
    if (!log) return;
    update({ ...log, meals: log.meals.filter((m) => m.id !== id) });
  }

  const showYesterdayReminder = date === today && prevLog && hasContent(prevLog) && !prevLog.submittedAt;

  return (
    <div className="grid grid-cols-1 gap-4">
      <header className="flex items-center justify-between">
        <DateNavLink date={addDays(date, -1)} label="이전 날" icon="‹" />
        <div className="text-center">
          <Logo className="block text-2xl" />
          <h1 className="font-bold">
            {formatDateKo(date)}
            {date === today && <span className="ml-1.5 text-sm font-normal text-pen">오늘</span>}
          </h1>
        </div>
        <DateNavLink date={addDays(date, 1)} label="다음 날" icon="›" />
      </header>

      {showYesterdayReminder && (
        <Link
          href={`/day/${addDays(date, -1)}`}
          className="rounded-2xl bg-pen/10 px-4 py-3 text-sm text-pen"
        >
          어제 기록을 아직 코치에게 보내지 않았어요. <b>어제 기록 보내기 ›</b>
        </Link>
      )}

      <MorningCheckCard
        date={date}
        morning={log.morning}
        periodExpectedDate={profile.periodExpectedDate}
        onChange={(morning) => update({ ...log, morning })}
      />

      <Card
        title="식사 기록"
        action={
          <button
            type="button"
            onClick={() => setEditing({})}
            className="rounded-full bg-pen px-4 py-1.5 text-sm font-bold text-white"
          >
            + 식사 추가
          </button>
        }
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="min-w-[720px]">
            <Timeline
              meals={log.meals}
              wakeTime={log.morning.sleepEnd}
              bedTime={nextLog?.morning.sleepStart}
              onMealClick={(meal) => setEditing({ meal })}
            />
          </div>
        </div>

        {meals.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            먹은 시각과 무엇을 먹었는지 기록해 주세요.
            <br />
            사진만 올려도 괜찮아요.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {meals.map((meal) => (
              <li key={meal.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ meal })}
                  className="flex w-full gap-3 rounded-xl border border-line p-3 text-left"
                >
                  <span className="w-12 shrink-0 pt-0.5 text-sm font-bold">{meal.time}</span>
                  <span className="grid flex-1 gap-2">
                    {meal.description && <span className="whitespace-pre-line text-pen">{meal.description}</span>}
                    {meal.photoIds.length > 0 && (
                      <span className="flex gap-1.5">
                        {meal.photoIds.map((id) => (
                          <Photo key={id} id={id} className="h-16 w-16 rounded-lg" />
                        ))}
                      </span>
                    )}
                  </span>
                  {meal.fullness && (
                    <span className="shrink-0 text-sm font-bold text-pen-blue">포만 {meal.fullness}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SubmitBar log={log} onSubmit={() => update({ ...log, submittedAt: new Date().toISOString() })} />

      {editing && (
        <MealEditor
          meal={editing.meal}
          onSave={saveMeal}
          onDelete={editing.meal ? () => deleteMeal(editing.meal!.id) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SubmitBar({ log, onSubmit }: { log: DailyLog; onSubmit: () => void }) {
  const empty = !hasContent(log);
  return (
    <div className="grid gap-2 text-center">
      {log.submittedAt && (
        <p className="text-sm text-ink-soft">
          ✓ {new Date(log.submittedAt).toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" })}에 코치에게
          보냈어요
        </p>
      )}
      <button
        type="button"
        disabled={empty}
        onClick={onSubmit}
        className={`rounded-2xl py-4 font-bold disabled:opacity-40 ${
          log.submittedAt ? "border border-line bg-card" : "bg-ink text-white"
        }`}
      >
        {log.submittedAt ? "수정한 내용 다시 보내기" : "코치에게 보내기"}
      </button>
      <p className="text-xs text-ink-soft">
        {isCoachingDay(log.date)
          ? "다음 날 오전에 보내주시면 코칭이 시작돼요."
          : "일요일 기록도 남겨두세요. 코칭은 월요일에 이어져요."}
      </p>
    </div>
  );
}

function DateNavLink({ date, label, icon }: { date: ISODate; label: string; icon: string }) {
  return (
    <Link
      href={`/day/${date}`}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-2xl leading-none"
    >
      {icon}
    </Link>
  );
}

function hasContent(log: DailyLog): boolean {
  return log.meals.length > 0 || Object.values(log.morning).some((v) => v !== undefined);
}
