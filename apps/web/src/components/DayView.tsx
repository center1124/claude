"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  addDays,
  compareTimelineTime,
  formatDateKo,
  formatDuration,
  frequentFoods,
  groupPhotosIntoMeals,
  hasContent,
  MEAL_SLOT_LABELS,
  mealTimeFromPhoto,
  previousSleep,
  missingMealSlots,
  recentMeals,
  shiftTime,
  sleepMinutes,
  sleepTapTarget,
  submissionState,
  type DailyLog,
  type HHMM,
  type ParsedMeal,
  type ISODate,
  type Meal,
  type MealSlot,
} from "@diet/core";
import { importPhoto, photoErrorMessage } from "@/lib/image";
import { useDailyLog, useLogs, useProfile, useRepository } from "@/lib/repository";
import { useToday } from "@/lib/use-today";
import { Logo } from "./Logo";
import { BulkEntry } from "./BulkEntry";
import { MealEditor, type MealSeed } from "./MealEditor";
import { MorningCheckCard } from "./MorningCheckCard";
import { Photo } from "./Photo";
import { Timeline } from "./Timeline";
import { Card, Loading } from "./ui";

type Editing = { meal?: Meal; seed?: MealSeed } | null;

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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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

  /** 오늘 아침 일어난 시각 (이 날 기록) */
  function setWake(time: HHMM | undefined) {
    if (log) update({ ...log, morning: { ...log.morning, sleepEnd: time } });
  }

  /** 오늘 밤 잠든 시각 (수면이 끝나는 다음 날 기록에 저장) */
  function setBed(time: HHMM | undefined) {
    if (nextLog) updateNext({ ...nextLog, morning: { ...nextLog.morning, sleepStart: time } });
  }

  function deleteMeal(id: string) {
    if (!log) return;
    update({ ...log, meals: log.meals.filter((m) => m.id !== id) });
  }

  /**
   * 사진부터 고르면 저장해 두고 촬영 시각으로 식사를 나눈다.
   * 한 끼면 입력 창을 열고, 여러 끼면 시각이 있는 식사는 바로 만들어 두고
   * 시각을 모르는 사진(다른 날 사진 포함)만 입력 창에서 시각을 고르게 한다.
   */
  async function startWithPhotos(files: FileList | null) {
    if (!files?.length || !log) return;
    setImporting(true);
    setNotice(null);
    try {
      const imported = await Promise.all(Array.from(files).map((f) => importPhoto(repo, f)));
      const withTime = imported.map((p) => ({
        ...p,
        takenAt: p.takenAt && mealTimeFromPhoto(p.takenAt, date) ? p.takenAt : null,
      }));
      const groups = groupPhotosIntoMeals(withTime);
      const timed = groups.filter((g) => g.takenAt);
      const untimed = groups.find((g) => !g.takenAt);
      const seedOf = (g: (typeof groups)[number]): MealSeed => ({
        photoIds: g.items.map((i) => i.id),
        time: g.takenAt ? mealTimeFromPhoto(g.takenAt, date)! : undefined,
        timeSource: g.takenAt ? "photo" : "missing",
      });

      if (groups.length === 1) {
        setEditing({ seed: seedOf(groups[0]) });
        return;
      }
      const created: Meal[] = timed.map((g) => ({
        id: crypto.randomUUID(),
        time: seedOf(g).time!,
        description: "",
        photoIds: seedOf(g).photoIds!,
      }));
      update({ ...log, meals: [...log.meals, ...created] });
      setNotice(`사진을 찍은 시각별로 식사 ${created.length}개로 나눴어요. 눌러서 먹은 것을 적어주세요.`);
      if (untimed) setEditing({ seed: seedOf(untimed) });
    } catch (error) {
      setNotice(photoErrorMessage(error));
    } finally {
      setImporting(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  function saveBulk(parsed: ParsedMeal[]) {
    if (!log) return;
    const created = parsed.map((m) => ({ id: crypto.randomUUID(), photoIds: [], ...m }));
    update({ ...log, meals: [...log.meals, ...created] });
    setNotice(`식사 ${created.length}개를 기록했어요. 사진은 각 식사를 눌러 추가할 수 있어요.`);
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
        morning={log.morning}
        previous={previous}
        periodTracking={profile.periodTracking !== false}
        periodExpectedDate={profile.periodExpectedDate}
        onChange={(morning) => update({ ...log, morning })}
      />

      <Card title="식사 기록">
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            disabled={importing}
            className="rounded-xl bg-pen py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {importing ? "올리는 중…" : "📷 사진으로"}
          </button>
          <button
            type="button"
            onClick={() => setEditing({})}
            className="rounded-xl border border-pen py-2.5 text-sm font-bold text-pen"
          >
            ✎ 글로
          </button>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="rounded-xl border border-pen py-2.5 text-sm font-bold text-pen"
          >
            ☰ 한 번에
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

        {notice && (
          <p role="status" className="mb-3 flex items-start justify-between gap-2 rounded-xl bg-highlight/40 px-3 py-2 text-xs">
            {notice}
            <button type="button" aria-label="알림 닫기" onClick={() => setNotice(null)} className="shrink-0">
              ✕
            </button>
          </p>
        )}

        <p className="mb-2 text-xs leading-relaxed text-ink-soft">
          👆 <b>윗줄</b>을 누르면 일어난·잠든 시각, <b>아래 칸</b>을 누르면 그 시각의 식사가 기록돼요.
        </p>
        <Timeline
          compact
          meals={log.meals}
          wakeTime={log.morning.sleepEnd}
          bedTime={nextLog.morning.sleepStart}
          onMealClick={(meal) => setEditing({ meal })}
          onTimeClick={(time) => setEditing({ seed: { time, timeSource: "tap" } })}
          onSleepClick={(time) =>
            sleepTapTarget(time) === "wake"
              ? setWake(time)
              : setBed(time)
          }
        />
        <SleepCopyBanner
          current={log.morning}
          previous={previousSleep(pastLogs)}
          onApply={(sleep) =>
            update({
              ...log,
              morning: {
                ...log.morning,
                sleepStart: log.morning.sleepStart ?? sleep.sleepStart,
                sleepEnd: log.morning.sleepEnd ?? sleep.sleepEnd,
              },
            })
          }
        />
        <SleepSummary
          date={date}
          lastNightStart={log.morning.sleepStart}
          wakeTime={log.morning.sleepEnd}
          bedTime={nextLog.morning.sleepStart}
          onChangeWake={setWake}
          onChangeBed={setBed}
        />

        {meals.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            먹을 때 사진만 찍어 두면 찍은 시각이 자동으로 기록돼요.
            <br />
            타임라인에서 먹은 시각쯤을 눌러도 돼요.
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
                    {meal.description ? (
                      <span className="whitespace-pre-line text-pen">{meal.description}</span>
                    ) : (
                      <span className="text-sm text-ink-soft underline">눌러서 먹은 것 적기</span>
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

      <SubmitPanel
        log={log}
        onSkip={(slot) => update({ ...log, skippedMeals: [...(log.skippedMeals ?? []), slot] })}
        onSubmit={() => update({ ...log, submittedAt: new Date().toISOString() }, { stamp: false })}
      />

      {bulkOpen && <BulkEntry onSave={saveBulk} onClose={() => setBulkOpen(false)} />}

      {editing && (
        <MealEditor
          date={date}
          isToday={isToday}
          meal={editing.meal}
          seed={editing.seed}
          pastLogs={pastLogs}
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
 * 오늘 수면이 비어 있으면 가장 최근 수면(어젯밤 잠든 → 오늘 일어난)을 한 번에 채우는 제안.
 * 자동으로 채우지 않는다: 기록을 잊은 날과 실제로 같은 시각에 잔 날을 코치가 구분할 수 있게.
 */
function SleepCopyBanner({
  current,
  previous,
  onApply,
}: {
  current: { sleepStart?: HHMM; sleepEnd?: HHMM };
  previous: { sleepStart?: HHMM; sleepEnd: HHMM } | null;
  onApply: (sleep: { sleepStart?: HHMM; sleepEnd: HHMM }) => void;
}) {
  if (!previous || current.sleepEnd) return null;
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-highlight/40 px-3 py-2 text-xs">
      <span>
        😴 어제처럼 잤나요?{" "}
        <b>
          {previous.sleepStart && !current.sleepStart ? `어젯밤 ${previous.sleepStart} → ` : ""}
          {previous.sleepEnd} 일어남
        </b>
      </span>
      <button
        type="button"
        onClick={() => onApply(previous)}
        className="shrink-0 rounded-full border border-ink/20 bg-card px-3 py-1 font-bold"
      >
        그대로 쓰기
      </button>
    </div>
  );
}

/**
 * 타임라인 아래 수면 요약: 오늘 일어난 시각, 오늘 밤 잠든 시각(±10분, 지우기)과
 * 총 수면량(어젯밤 잠든 시각 → 오늘 일어난 시각).
 */
function SleepSummary({
  date,
  lastNightStart,
  wakeTime,
  bedTime,
  onChangeWake,
  onChangeBed,
}: {
  date: ISODate;
  lastNightStart?: HHMM;
  wakeTime?: HHMM;
  bedTime?: HHMM;
  onChangeWake: (time: HHMM | undefined) => void;
  onChangeBed: (time: HHMM | undefined) => void;
}) {
  if (!wakeTime && !bedTime) return null;
  return (
    <div className="mt-2 grid gap-1.5 text-xs">
      <div className="flex flex-wrap gap-1.5">
        {wakeTime && <SleepChip icon="☀️" label="일어남" time={wakeTime} onChange={onChangeWake} />}
        {bedTime && <SleepChip icon="🌙" label="잠듦" time={bedTime} onChange={onChangeBed} />}
      </div>
      {wakeTime &&
        (lastNightStart ? (
          <p className="text-ink-soft">
            총 수면 <b className="text-pen">{formatDuration(sleepMinutes(lastNightStart, wakeTime))}</b> (어젯밤{" "}
            {lastNightStart} 잠듦)
          </p>
        ) : (
          <Link href={`/day/${addDays(date, -1)}`} className="text-ink-soft underline">
            어젯밤 잠든 시각이 없어요. 어제 타임라인 윗줄에서 눌러주세요 ›
          </Link>
        ))}
    </div>
  );
}

function SleepChip({
  icon,
  label,
  time,
  onChange,
}: {
  icon: string;
  label: string;
  time: HHMM;
  onChange: (time: HHMM | undefined) => void;
}) {
  const small = "grid h-6 w-6 place-items-center rounded-full bg-card";
  return (
    <span className="flex items-center gap-1 rounded-full bg-highlight/50 py-1 pl-3 pr-1">
      {icon} {label} <b className="mr-1">{time}</b>
      <button type="button" aria-label={`${label} 10분 앞으로`} onClick={() => onChange(shiftTime(time, -10))} className={small}>
        −
      </button>
      <button type="button" aria-label={`${label} 10분 뒤로`} onClick={() => onChange(shiftTime(time, 10))} className={small}>
        +
      </button>
      <button type="button" aria-label={`${label} 시각 지우기`} onClick={() => onChange(undefined)} className="px-1.5">
        ✕
      </button>
    </span>
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

