"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDays,
  formatDuration,
  periodDday,
  sleepMinutes,
  startOfWeek,
  weekdayEn,
  type DailyLog,
  type ISODate,
} from "@diet/core";
import { useLogs, useProfile } from "@/lib/repository";
import { useToday } from "@/lib/use-today";
import { Logo } from "./Logo";
import { Timeline } from "./Timeline";
import { Loading } from "./ui";

/** 종이 주간 기록지와 같은 모양: 요일마다 아침 체크 표 + 하루 타임라인 */
export function WeekView({ date }: { date: ISODate }) {
  const router = useRouter();
  const today = useToday();
  const monday = startOfWeek(date);
  const sunday = addDays(monday, 6);
  // 일요일 밤 취침 시각은 다음 주 월요일 기록에 있으므로 하루 더 불러온다
  const logs = useLogs(monday, addDays(sunday, 1));
  const { profile } = useProfile();

  if (!logs || !profile) return <Loading />;

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

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="grid min-w-[960px] gap-3">
          {logs.slice(0, 7).map((log, i) => (
            <DayRow
              key={log.date}
              log={log}
              bedTime={logs[i + 1].morning.sleepStart}
              isToday={log.date === today}
              periodExpectedDate={profile.periodExpectedDate}
              onOpen={() => router.push(`/day/${log.date}`)}
            />
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-ink-soft">요일을 누르면 그날 기록을 적거나 고칠 수 있어요.</p>
    </div>
  );
}

function DayRow({
  log,
  bedTime,
  isToday,
  periodExpectedDate,
  onOpen,
}: {
  log: DailyLog;
  bedTime?: string;
  isToday: boolean;
  periodExpectedDate?: ISODate;
  onOpen: () => void;
}) {
  const { morning } = log;
  const stats: [string, string | undefined][] = [
    ["총 수면량", morning.sleepStart && morning.sleepEnd ? formatDuration(sleepMinutes(morning.sleepStart, morning.sleepEnd)) : undefined],
    ["체중", morning.weightKg?.toString()],
    ["허리 둘레", morning.waistCm?.toString()],
    ["화장실", morning.bowelCount?.toString()],
    ["생리", periodDday(log.date, periodExpectedDate) ?? undefined],
  ];

  return (
    <div className="grid grid-cols-[3.5rem_9.5rem_1fr] items-start gap-2">
      <button
        type="button"
        onClick={onOpen}
        className={`mt-5 grid gap-0.5 rounded-lg py-3 text-center ${isToday ? "bg-pen/10 text-pen" : "text-ink-soft"}`}
      >
        <span className="font-medium">{weekdayEn(log.date)}</span>
        <span className="text-xs">{shortDate(log.date)}</span>
        {log.submittedAt && <span className="text-[10px] text-pen">보냄 ✓</span>}
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
