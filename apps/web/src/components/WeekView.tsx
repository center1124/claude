"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addDays,
  compareTimelineTime,
  EXERCISE_SLOT_LABELS,
  formatAmount,
  formatDuration,
  periodDday,
  sleepMinutes,
  startOfWeek,
  submissionState,
  summarizeWeek,
  weekdayEn,
  weekdayKo,
  type DailyLog,
  type ISODate,
} from "@diet/core";
import { useLogs, useProfile } from "@/lib/repository";
import { useToday } from "@/lib/use-today";
import { Logo } from "./Logo";
import { Photo } from "./Photo";
import { Timeline, TimelineHours } from "./Timeline";
import { WeekSummaryCard } from "./WeekSummaryCard";
import { Loading } from "./ui";

/**
 * 주간 보기: 한 주를 한눈에 보고 지난주와 비교한다.
 * 폰은 요일마다 한 줄짜리 흐름 그림, PC는 종이 주간 기록지 모양.
 */
export function WeekView({ date }: { date: ISODate }) {
  const router = useRouter();
  const today = useToday();
  const monday = startOfWeek(date);
  const sunday = addDays(monday, 6);
  // 지난주 월요일 ~ 다음 주 월요일 (일요일 밤 취침 시각은 다음 날 기록에 있다)
  const logs = useLogs(addDays(monday, -7), addDays(monday, 7));
  const { profile } = useProfile();
  const [compare, setCompare] = useState(false);
  const [openDate, setOpenDate] = useState<ISODate | null>(null);

  if (!logs || !profile) return <Loading />;

  const lastWeek = logs.slice(0, 8);
  const thisWeek = logs.slice(7, 15);
  const periodDate = profile.periodTracking === false ? undefined : profile.periodExpectedDate;
  const periodTracking = profile.periodTracking !== false;

  return (
    <div className="grid grid-cols-1 gap-4">
      <header className="flex items-center justify-between">
        <WeekNavLink date={addDays(monday, -7)} label="지난 주" icon="‹" />
        <div className="text-center">
          <Logo className="block text-3xl" />
          <h1 className="text-sm font-bold">
            {shortDate(monday)} – {shortDate(sunday)}
          </h1>
        </div>
        <WeekNavLink date={addDays(monday, 7)} label="다음 주" icon="›" />
      </header>

      <WeekSummaryCard current={summarizeWeek(thisWeek)} previous={summarizeWeek(lastWeek)} />

      {/* 폰: 요일마다 한 줄 */}
      <section className="grid gap-1.5 rounded-2xl border border-line bg-card p-3 md:hidden">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold">하루 흐름</h2>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--pen)]"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            지난주 겹쳐 보기
          </label>
        </div>
        <div className="grid grid-cols-[2.75rem_1fr] gap-x-1.5">
          <span />
          <TimelineHours small />
        </div>
        {thisWeek.slice(0, 7).map((log, i) => (
          <PhoneDayRow
            key={log.date}
            log={log}
            bedTime={thisWeek[i + 1].morning.sleepStart}
            lastWeek={compare ? { log: lastWeek[i], bedTime: lastWeek[i + 1].morning.sleepStart } : undefined}
            isToday={log.date === today}
            open={openDate === log.date}
            onToggle={() => setOpenDate(openDate === log.date ? null : log.date)}
            periodTracking={periodTracking}
            periodExpectedDate={periodDate}
          />
        ))}
        <p className="mt-1 flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full bg-highlight" /> 수면
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-1 rounded-full bg-pen" /> 식사
          </span>
          {compare && <span>아래 흐린 줄: 지난주 같은 요일</span>}
        </p>
      </section>

      {/* PC: 종이 주간 기록지 모양 */}
      <div className="hidden gap-3 md:grid">
        {thisWeek.slice(0, 7).map((log, i) => (
          <PaperDayRow
            key={log.date}
            log={log}
            bedTime={thisWeek[i + 1].morning.sleepStart}
            isToday={log.date === today}
            periodExpectedDate={periodDate}
            periodTracking={periodTracking}
            onOpen={() => router.push(`/day/${log.date}`)}
          />
        ))}
        <p className="text-center text-xs text-ink-soft">요일을 누르면 그날 기록을 적거나 고칠 수 있어요.</p>
      </div>
    </div>
  );
}

function PhoneDayRow({
  log,
  bedTime,
  lastWeek,
  isToday,
  open,
  onToggle,
  periodTracking,
  periodExpectedDate,
}: {
  log: DailyLog;
  bedTime?: string;
  lastWeek?: { log: DailyLog; bedTime?: string };
  isToday: boolean;
  open: boolean;
  onToggle: () => void;
  periodTracking: boolean;
  periodExpectedDate?: ISODate;
}) {
  const sent = submissionState(log).kind === "sent";
  return (
    <div className={`rounded-lg ${open ? "bg-paper" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${weekdayKo(log.date)}요일 자세히 보기`}
        className="grid w-full grid-cols-[2.75rem_1fr] items-center gap-x-1.5 text-left"
      >
        <span className={`text-center leading-tight ${isToday ? "font-bold text-pen" : "text-ink-soft"}`}>
          <span className="block text-xs">{weekdayKo(log.date)}</span>
          <span className="block text-xs">{shortDate(log.date)}</span>
          {sent && <span className="block text-xs text-pen">✓</span>}
          {log.exercise?.items.length ? (
            <span className="block text-xs" title="운동함">
              🏃
            </span>
          ) : null}
        </span>
        <span className="grid gap-0.5">
          <Timeline variant="mini" meals={log.meals} wakeTime={log.morning.sleepEnd} bedTime={bedTime} />
          {lastWeek && (
            <span className="opacity-40">
              <Timeline
                variant="mini"
                meals={lastWeek.log.meals}
                wakeTime={lastWeek.log.morning.sleepEnd}
                bedTime={lastWeek.bedTime}
              />
            </span>
          )}
        </span>
      </button>
      {open && (
        <DayDetail log={log} periodTracking={periodTracking} periodExpectedDate={periodExpectedDate} />
      )}
    </div>
  );
}

/** 폰에서 요일을 누르면 펼쳐지는 그날 기록 */
function DayDetail({
  log,
  periodTracking,
  periodExpectedDate,
}: {
  log: DailyLog;
  periodTracking: boolean;
  periodExpectedDate?: ISODate;
}) {
  const { morning } = log;
  const facts = [
    morning.sleepStart && morning.sleepEnd && `수면 ${formatDuration(sleepMinutes(morning.sleepStart, morning.sleepEnd))}`,
    morning.weightKg !== undefined && `체중 ${morning.weightKg}kg`,
    morning.waistCm !== undefined && `허리 ${morning.waistCm}cm`,
    morning.bowelCount !== undefined && `화장실 ${morning.bowelCount}`,
    periodTracking && periodDday(log.date, periodExpectedDate),
  ].filter(Boolean);
  const meals = [...log.meals].sort((a, b) => compareTimelineTime(a.time, b.time));

  return (
    <div className="grid gap-2 px-2 pb-3 pt-2 text-sm">
      {facts.length > 0 && <p className="text-xs text-ink-soft">{facts.join(" · ")}</p>}
      {(log.exercise?.items.length || log.exercise?.rest) && (
        <p className="text-sm">
          🏃{" "}
          {log.exercise.rest
            ? "쉬었어요"
            : log.exercise.items
                .map((e) => `${e.name} ${formatAmount(e)}${e.slot ? ` (${EXERCISE_SLOT_LABELS[e.slot]})` : ""}`)
                .join(", ")}
        </p>
      )}
      {meals.length === 0 ? (
        <p className="text-xs text-ink-soft">식사 기록이 없어요.</p>
      ) : (
        <ul className="grid gap-1.5">
          {meals.map((meal) => (
            <li key={meal.id} className="flex gap-2">
              <span className="w-11 shrink-0 font-bold">{meal.time}</span>
              <span className="grid flex-1 gap-1">
                <span className="whitespace-pre-line text-pen">{meal.description || "사진"}</span>
                {meal.photoIds.length > 0 && (
                  <span className="flex gap-1">
                    {meal.photoIds.map((id) => (
                      <Photo key={id} id={id} className="h-12 w-12 rounded-md" />
                    ))}
                  </span>
                )}
              </span>
              {meal.fullness && <span className="shrink-0 font-bold text-pen-blue">포만 {meal.fullness}</span>}
            </li>
          ))}
        </ul>
      )}
      <Link href={`/day/${log.date}`} className="justify-self-end text-xs text-ink-soft underline">
        이 날 기록 고치기 ›
      </Link>
    </div>
  );
}

function PaperDayRow({
  log,
  bedTime,
  isToday,
  periodExpectedDate,
  periodTracking,
  onOpen,
}: {
  log: DailyLog;
  bedTime?: string;
  isToday: boolean;
  periodExpectedDate?: ISODate;
  periodTracking: boolean;
  onOpen: () => void;
}) {
  const { morning } = log;
  const stats: [string, string | undefined][] = [
    [
      "총 수면량",
      morning.sleepStart && morning.sleepEnd ? formatDuration(sleepMinutes(morning.sleepStart, morning.sleepEnd)) : undefined,
    ],
    ["체중", morning.weightKg?.toString()],
    ["허리 둘레", morning.waistCm?.toString()],
    ["화장실", morning.bowelCount?.toString()],
    ["운동", exerciseSummary(log)],
  ];
  if (periodTracking) stats.push(["생리", periodDday(log.date, periodExpectedDate) ?? undefined]);
  const sent = submissionState(log).kind === "sent";

  return (
    <div className="grid grid-cols-[3.5rem_9.5rem_1fr] items-start gap-2">
      <button
        type="button"
        onClick={onOpen}
        className={`mt-5 grid gap-0.5 rounded-lg py-3 text-center ${isToday ? "bg-pen/10 text-pen" : "text-ink-soft"}`}
      >
        <span className="font-medium">{weekdayEn(log.date)}</span>
        <span className="text-xs">{shortDate(log.date)}</span>
        {sent && <span className="text-xs text-pen">보냄 ✓</span>}
      </button>

      <table className="mt-5 w-full border-collapse overflow-hidden rounded bg-card text-xs">
        <tbody>
          {stats.map(([label, value]) => (
            <tr key={label} className="border border-line">
              <th className="w-20 border-r border-line py-1.5 font-normal">{label}</th>
              <td className="text-center text-pen">{value ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div onClick={onOpen} className="cursor-pointer">
        <Timeline meals={log.meals} wakeTime={morning.sleepEnd} bedTime={bedTime} />
      </div>
    </div>
  );
}

/** PC 표의 운동 칸: "걷기 외 1", "쉼" */
function exerciseSummary(log: DailyLog): string | undefined {
  if (log.exercise?.rest) return "쉼";
  const items = log.exercise?.items ?? [];
  if (!items.length) return undefined;
  return items.length === 1 ? items[0].name : `${items[0].name} 외 ${items.length - 1}`;
}

function WeekNavLink({ date, label, icon }: { date: ISODate; label: string; icon: string }) {
  return (
    <Link
      href={`/week/${date}`}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-2xl leading-none"
    >
      {icon}
    </Link>
  );
}

function shortDate(date: ISODate): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}
