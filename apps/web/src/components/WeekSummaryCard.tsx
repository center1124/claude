import { formatClock, formatDuration, type WeekSummary } from "@diet/core";

interface Row {
  label: string;
  current: number | null;
  previous: number | null;
  format: (value: number) => string;
  /** 지난주 대비 차이를 글로 */
  diff: (delta: number) => string;
}

const signed = (value: number, unit = "") => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value)}${unit}`;
const round1 = (value: number) => Math.round(value * 10) / 10;
/** 95 → "1시간 35분", 40 → "40분" */
function formatGap(minutes: number): string {
  const m = Math.abs(Math.round(minutes));
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return [hours && `${hours}시간`, rest && `${rest}분`].filter(Boolean).join(" ") || "0분";
}
const clockDiff = (delta: number) => (Math.abs(delta) < 5 ? "비슷" : `${formatGap(delta)} ${delta > 0 ? "늦게" : "일찍"}`);
const durationDiff = (delta: number) => (Math.abs(delta) < 5 ? "비슷" : `${delta > 0 ? "+" : "−"}${formatGap(delta)}`);

/** 한 주 요약과 지난주 비교 */
export function WeekSummaryCard({ current, previous }: { current: WeekSummary; previous: WeekSummary }) {
  const rows: Row[] = [
    { label: "평균 수면", current: current.avgSleep, previous: previous.avgSleep, format: formatDuration, diff: durationDiff },
    { label: "평균 기상", current: current.avgWake, previous: previous.avgWake, format: formatClock, diff: clockDiff },
    { label: "평균 취침", current: current.avgBed, previous: previous.avgBed, format: formatClock, diff: clockDiff },
    { label: "첫 식사", current: current.avgFirstMeal, previous: previous.avgFirstMeal, format: formatClock, diff: clockDiff },
    { label: "마지막 식사", current: current.avgLastMeal, previous: previous.avgLastMeal, format: formatClock, diff: clockDiff },
    {
      label: "하루 식사",
      current: current.mealsPerDay,
      previous: previous.mealsPerDay,
      format: (v) => `${v}회`,
      diff: (d) => signed(round1(d), "회"),
    },
    {
      label: "야식 (밤 9시~)",
      current: current.loggedDays ? current.lateMeals : null,
      previous: previous.loggedDays ? previous.lateMeals : null,
      format: (v) => `${v}회`,
      diff: (d) => signed(d, "회"),
    },
    {
      label: "평균 포만감",
      current: current.avgFullness,
      previous: previous.avgFullness,
      format: String,
      diff: (d) => signed(round1(d)),
    },
    {
      label: "체중",
      current: current.weight?.last ?? null,
      previous: previous.weight?.last ?? null,
      format: (v) => `${v}kg`,
      diff: (d) => signed(round1(d), "kg"),
    },
    {
      label: "허리",
      current: current.waist?.last ?? null,
      previous: previous.waist?.last ?? null,
      format: (v) => `${v}cm`,
      diff: (d) => signed(round1(d), "cm"),
    },
  ];

  return (
    <section
      className="w-full rounded-2xl border border-line bg-card p-3 md:mx-auto md:max-w-xl md:p-4"
      aria-label="한 주 요약"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-bold">한 주 요약</h2>
        <span className="text-xs text-ink-soft">기록한 날 {current.loggedDays}/7</span>
      </div>
      {current.loggedDays === 0 && previous.loggedDays === 0 ? (
        <p className="py-3 text-center text-xs text-ink-soft">아직 이번 주와 지난주 기록이 없어요.</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1 text-left font-normal" />
              <th className="py-1 text-right font-medium text-ink">이번 주</th>
              <th className="py-1 text-right font-normal">지난주</th>
              <th className="py-1 text-right font-normal">변화</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line/70">
                <th className="py-1.5 text-left font-normal">{row.label}</th>
                <td className="py-1.5 text-right font-bold text-pen">
                  {row.current !== null ? row.format(row.current) : "–"}
                </td>
                <td className="py-1.5 text-right text-ink-soft">
                  {row.previous !== null ? row.format(row.previous) : "–"}
                </td>
                <td className="py-1.5 text-right">
                  {row.current !== null && row.previous !== null ? row.diff(row.current - row.previous) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
