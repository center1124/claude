"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  addDays,
  bedtimeLogDate,
  compareTimelineTime,
  COMPANION_LABELS,
  formatDateKo,
  frequentFoods,
  hasContent,
  MEAL_SLOT_LABELS,
  mealTimeFromPhoto,
  missingMealSlots,
  nowHHMM,
  recentMeals,
  submissionState,
  type DailyLog,
  type HHMM,
  type ISODate,
  type Meal,
  type MealSlot,
} from "@diet/core";
import { importPhoto } from "@/lib/image";
import { useDailyLog, useLogs, useProfile, useRepository } from "@/lib/repository";
import { useToday } from "@/lib/use-today";
import { Logo } from "./Logo";
import { MealEditor } from "./MealEditor";
import { MorningCheckCard } from "./MorningCheckCard";
import { Photo } from "./Photo";
import { Timeline } from "./Timeline";
import { Card, Loading } from "./ui";

type Editing = { meal?: Meal; seed?: { photoIds: string[]; time?: HHMM } } | null;

export function DayView({ date }: { date: ISODate }) {
  const repo = useRepository();
  const today = useToday();
  const isToday = date === today;
  const { log, update } = useDailyLog(date);
  const { log: nextLog, update: updateNext } = useDailyLog(addDays(date, 1));
  const { log: prevLog } = useDailyLog(addDays(date, -1));
  const pastLogs = useLogs(addDays(date, -30), addDays(date, -1));
  const { profile } = useProfile();
  const [editing, setEditing] = useState<Editing>(null);
  const [importing, setImporting] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  if (!log || !nextLog || !profile || !pastLogs) return <Loading />;

  const meals = [...log.meals].sort((a, b) => compareTimelineTime(a.time, b.time));
  const historyLogs = [...pastLogs, log];
  const previous = {
    weightKg: pastLogs.findLast((l) => l.morning.weightKg !== undefined)?.morning.weightKg,
    waistCm: pastLogs.findLast((l) => l.morning.waistCm !== undefined)?.morning.waistCm,
  };

  function saveMeal(meal: Meal) {
    if (!log) return;
    const exists = log.meals.some((m) => m.id === meal.id);
    update({ ...log, meals: exists ? log.meals.map((m) => (m.id === meal.id ? meal : m)) : [...log.meals, meal] });
  }

  function deleteMeal(id: string) {
    if (!log) return;
    update({ ...log, meals: log.meals.filter((m) => m.id !== id) });
  }

  /** 사진부터 고르면 저장해 두고, 촬영 시각을 채운 식사 입력 창을 연다 */
  async function startWithPhotos(files: FileList | null) {
    if (!files?.length) return;
    setImporting(true);
    try {
      const imported = await Promise.all(Array.from(files).map((f) => importPhoto(repo, f)));
      const time = imported.map((p) => mealTimeFromPhoto(p.takenAt, date)).find(Boolean) ?? undefined;
      setEditing({ seed: { photoIds: imported.map((p) => p.id), time } });
    } finally {
      setImporting(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  const showYesterdayReminder =
    isToday && prevLog && submissionState(prevLog).kind === "draft" && hasContent(prevLog);

  return (
    <div className="grid grid-cols-1 gap-4">
      <header className="flex items-center justify-between">
        <DateNavLink date={addDays(date, -1)} label="이전 날" icon="‹" />
        <div className="text-center">
          <Logo className="block text-2xl" />
          <h1 className="font-bold">
            {formatDateKo(date)}
            {isToday && <span className="ml-1.5 text-sm font-normal text-pen">오늘</span>}
          </h1>
        </div>
        <DateNavLink date={addDays(date, 1)} label="다음 날" icon="›" />
      </header>

      {showYesterdayReminder && (
        <Link href={`/day/${addDays(date, -1)}`} className="rounded-2xl bg-pen/10 px-4 py-3 text-sm text-pen">
          어제 기록은 오늘 오전 9시에 코치에게 자동으로 보내져요. <b>빠진 게 없는지 확인하기 ›</b>
        </Link>
      )}

      <MorningCheckCard
        date={date}
        isToday={isToday}
        morning={log.morning}
        previous={previous}
        periodTracking={profile.periodTracking !== false}
        periodExpectedDate={profile.periodExpectedDate}
        onChange={(morning) => update({ ...log, morning })}
      />

      <Card
        title="식사 기록"
        action={
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={importing}
              className="rounded-full bg-pen px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {importing ? "올리는 중…" : "📷 사진으로"}
            </button>
            <button
              type="button"
              onClick={() => setEditing({})}
              className="rounded-full border border-pen px-3 py-1.5 text-sm font-bold text-pen"
            >
              + 글로
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              aria-label="식사 사진 고르기"
              onChange={(e) => startWithPhotos(e.target.files)}
            />
          </div>
        }
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="min-w-[720px]">
            <Timeline
              meals={log.meals}
              wakeTime={log.morning.sleepEnd}
              bedTime={nextLog.morning.sleepStart}
              onMealClick={(meal) => setEditing({ meal })}
            />
          </div>
        </div>

        {meals.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            먹을 때 사진만 찍어 두세요.
            <br />
            찍은 시각이 자동으로 기록돼요.
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
                    {meal.companion && (
                      <span className="text-xs text-ink-soft">
                        함께: {COMPANION_LABELS[meal.companion]}
                        {meal.myPortion && ` · 내가 먹은 양 ${meal.myPortion}`}
                      </span>
                    )}
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

      {isToday && (
        <BedtimeCard
          date={date}
          log={log}
          nextLog={nextLog}
          onSet={(target, time) =>
            target === "today"
              ? update({ ...log, morning: { ...log.morning, sleepStart: time } })
              : updateNext({ ...nextLog, morning: { ...nextLog.morning, sleepStart: time } })
          }
        />
      )}

      <SubmitPanel
        log={log}
        onSkip={(slot) => update({ ...log, skippedMeals: [...(log.skippedMeals ?? []), slot] })}
        onSubmit={() => update({ ...log, submittedAt: new Date().toISOString() }, { stamp: false })}
      />

      {editing && (
        <MealEditor
          date={date}
          isToday={isToday}
          meal={editing.meal}
          seed={editing.seed}
          frequentFoods={frequentFoods(historyLogs)}
          recentMeals={recentMeals(historyLogs)}
          onSave={saveMeal}
          onDelete={editing.meal ? () => deleteMeal(editing.meal!.id) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/**
 * 잠들기 전에 누르는 버튼. 잠든 시각은 "다음 날 아침 기록"에 속하므로,
 * 밤에 누르면 내일 기록에, 자정 넘어 누르면 오늘 기록에 들어간다.
 */
function BedtimeCard({
  date,
  log,
  nextLog,
  onSet,
}: {
  date: ISODate;
  log: DailyLog;
  nextLog: DailyLog;
  onSet: (target: "today" | "next", time: HHMM) => void;
}) {
  const target = bedtimeLogDate() === date ? "today" : "next";
  const recorded = (target === "today" ? log : nextLog).morning.sleepStart;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
      <p className="text-sm">
        {recorded ? (
          <>
            🌙 <b>{recorded}</b>에 잠들었어요
          </>
        ) : (
          <span className="text-ink-soft">잠들기 전에 눌러주세요</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => onSet(target, nowHHMM())}
        className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white"
      >
        {recorded ? "다시 누르기" : "🌙 잘게요"}
      </button>
    </div>
  );
}

function SubmitPanel({
  log,
  onSkip,
  onSubmit,
}: {
  log: DailyLog;
  onSkip: (slot: MealSlot) => void;
  onSubmit: () => void;
}) {
  const now = new Date();
  const state = submissionState(log, now);
  const missing = missingMealSlots(log, now);
  const format = (d: Date) => d.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

  if (state.kind === "empty") return null;

  return (
    <div className="grid gap-2 text-center">
      {missing.map((slot) => (
        <div
          key={slot}
          className="flex items-center justify-between gap-2 rounded-2xl bg-highlight/40 px-4 py-2.5 text-left text-sm"
        >
          <span>{MEAL_SLOT_LABELS[slot]} 기록이 없어요. 안 드셨나요?</span>
          <button
            type="button"
            onClick={() => onSkip(slot)}
            className="shrink-0 rounded-full border border-ink/20 bg-card px-3 py-1 text-xs font-bold"
          >
            안 먹었어요
          </button>
        </div>
      ))}

      {state.kind === "draft" ? (
        <>
          <p className="text-sm text-ink-soft">
            <b className="text-ink">{format(state.deadline)}</b>에 코치에게 자동으로 보내져요.
          </p>
          <button type="button" onClick={onSubmit} className="rounded-2xl border border-line bg-card py-3.5 font-bold">
            지금 바로 보내기
          </button>
        </>
      ) : (
        <p className="rounded-2xl bg-card px-4 py-3 text-sm">
          ✓ {format(state.sentAt)}에 코치에게 {state.auto ? "자동으로 " : ""}보냈어요
          {state.editedAfter && (
            <span className="mt-1 block text-xs text-ink-soft">보낸 뒤 고친 내용은 코치에게 “수정됨”으로 표시돼요.</span>
          )}
        </p>
      )}
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
