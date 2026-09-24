import {
  DEFAULT_AMOUNT,
  type Exercise,
  type ExerciseAmount,
  type ExerciseKind,
  type ExerciseMethod,
  type ExerciseSlot,
} from "./exercise";
import { compareTimelineTime, MEAL_TIME_PRESETS, timelineMinutes, toHHMM } from "./time";
import type { HHMM, MorningCheck } from "./types";

/**
 * "말로 기록": 받아쓰기(또는 직접 쓴) 하루 이야기를 칸별로 나눈다. AI 없이 정해진 말 패턴을 읽는다.
 *
 *   "어젯밤 12시 반에 자서 7시에 일어났어. 체중 73.4, 허리 92, 화장실 한 번.
 *    9시 스무디, 12시 반 비빔밥 포만 8, 저녁 7시 제육볶음 포만 9. 굿모닝 10개 5세트, 걷기 30분"
 *
 * 한 문장(절)씩 수면 → 몸 → 운동 → 식사 순으로 맞춰 보고, 시각 없는 말은 바로 앞 식사에 이어 붙인다.
 * 어디에도 맞지 않는 말은 unparsed로 돌려줘서 저장 전에 고객이 확인하게 한다.
 */
export interface ParsedMeal {
  time: HHMM;
  description: string;
  fullness?: number;
}

export type ParsedExercise = Omit<Exercise, "id">;

export interface SpokenLog {
  /** 말한 항목만 채워진다 */
  morning: MorningCheck;
  meals: ParsedMeal[];
  exercises: ParsedExercise[];
  /** 알아듣지 못한 말 */
  unparsed: string[];
}

export function parseSpokenLog(text: string, knownExercises: Pick<Exercise, "name" | "kind" | "method">[] = []): SpokenLog {
  const result: SpokenLog = { morning: {}, meals: [], exercises: [], unparsed: [] };
  let previousMeal = -Infinity;
  let lastWasMeal = false;

  for (const clause of splitClauses(normalizeNumbers(text))) {
    if (readSleep(clause, result.morning)) {
      lastWasMeal = false;
      continue;
    }
    if (readBody(clause, result.morning)) {
      lastWasMeal = false;
      continue;
    }
    const exercise = readExercise(clause, knownExercises);
    if (exercise) {
      result.exercises.push(exercise);
      lastWasMeal = false;
      continue;
    }
    const meal = readMeal(clause, previousMeal);
    if (meal) {
      result.meals.push(meal);
      previousMeal = timelineMinutes(meal.time);
      lastWasMeal = true;
      continue;
    }
    const last = result.meals.at(-1);
    if (lastWasMeal && last) {
      const { text: rest, fullness } = takeFullness(clause);
      if (fullness) last.fullness = fullness;
      if (rest) last.description = last.description ? `${last.description}\n${rest}` : rest;
      continue;
    }
    result.unparsed.push(clause);
  }
  return result;
}

// ── 문장 나누기 ──

/** "한 번", "세 세트", "열두 시"처럼 우리말 수를 숫자로 */
const NATIVE_NUMBERS: [string, number][] = [
  ["열두", 12],
  ["열한", 11],
  ["다섯", 5],
  ["여섯", 6],
  ["일곱", 7],
  ["여덟", 8],
  ["아홉", 9],
  ["하나", 1],
  ["한", 1],
  ["두", 2],
  ["세", 3],
  ["네", 4],
  ["열", 10],
];

function normalizeNumbers(text: string): string {
  let out = text;
  for (const [word, n] of NATIVE_NUMBERS) {
    out = out.replace(new RegExp(`(^|\\s)${word}\\s*(시간|시|번|개|세트|회|바퀴)`, "g"), `$1${n}$2`);
  }
  return out;
}

/** 이어지는 말("먹고", "자고")에서도 끊는다. 숫자 사이의 점·쉼표(73.4, 8,000)는 끊지 않는다 */
function splitClauses(text: string): string[] {
  return text
    .replace(/(먹고|먹었고|마시고|마셨고|했고|하고|자고|잤고|걷고|걸었고|그리고)\s+/g, "$1\n")
    .split(/\n|[.!?](?!\d)|,(?!\d{3})/)
    .map((c) => c.trim().replace(/^그리고\s*/, ""))
    .filter(Boolean);
}

// ── 시각 ──

const TIME = /(오전|오후|아침|저녁|밤|새벽|낮)?\s*(\d{1,2})\s*(?:[:：]\s*(\d{2})|시(?!간)(?:\s*(\d{1,2})\s*분|\s*(반))?)/g;

interface FoundTime {
  period?: string;
  hour: number;
  minute: number;
  index: number;
  length: number;
}

function findTimes(clause: string): FoundTime[] {
  return [...clause.matchAll(TIME)]
    .map((m) => ({
      period: m[1],
      hour: Number(m[2]),
      minute: Number(m[3] ?? m[4] ?? (m[5] ? 30 : 0)),
      index: m.index!,
      length: m[0].length,
    }))
    .filter((t) => t.hour <= 24 && t.minute <= 59);
}

const PM = new Set(["오후", "저녁", "밤", "낮"]);
const AM = new Set(["오전", "아침", "새벽"]);

/** 잠든 시각: 저녁 6시 ~ 새벽 5시로 읽는다 ("12시 반" = 00:30, "11시" = 23:00) */
function bedTime({ period, hour, minute }: FoundTime): HHMM {
  let h = hour % 24;
  if (period && AM.has(period)) h = hour % 12;
  else if (h === 12) h = 0;
  else if ((period && PM.has(period)) || (h >= 6 && h < 12)) h = (h % 12) + 12;
  return toHHMM(h * 60 + minute);
}

/** 일어난 시각: 오전으로 읽는다 (오후/낮이라고 하면 오후) */
function wakeTime({ period, hour, minute }: FoundTime): HHMM {
  const h = period && PM.has(period) && hour < 12 ? hour + 12 : hour % 24;
  return toHHMM(h * 60 + minute);
}

/** 식사 시각: 오전/오후가 없으면 앞 식사 이후의 가장 가까운 시각 (첫 식사의 1~5시는 오후) */
function mealTime({ period, hour, minute }: FoundTime, previous: number): HHMM {
  if (period && AM.has(period)) return toHHMM((hour % 12) * 60 + minute);
  if (period && PM.has(period)) return toHHMM(((hour % 12) + 12) * 60 + minute);
  if (hour > 12 || hour === 0) return toHHMM((hour % 24) * 60 + minute);
  const am = toHHMM((hour % 12) * 60 + minute);
  const pm = toHHMM(((hour % 12) + 12) * 60 + minute);
  if (previous === -Infinity) return hour >= 1 && hour <= 5 ? pm : am;
  const later = [am, pm].filter((t) => timelineMinutes(t) >= previous).sort(compareTimelineTime);
  return later[0] ?? pm;
}

// ── 수면 ──

const BED_WORDS = /(잤|자서|자고|잠들|잠 들|잠에|취침|누웠)/;
const WAKE_WORDS = /(일어|기상|깼|깨서|깨고)/;

function readSleep(clause: string, morning: MorningCheck): boolean {
  const bed = BED_WORDS.exec(clause);
  const wake = WAKE_WORDS.exec(clause);
  if (!bed && !wake) return false;
  const times = findTimes(clause);
  if (!times.length) return false;

  if (bed && wake && times.length >= 2) {
    const [first, second] = bed.index < wake.index ? [times[0], times[1]] : [times[1], times[0]];
    morning.sleepStart = bedTime(first);
    morning.sleepEnd = wakeTime(second);
  } else if (bed) {
    morning.sleepStart = bedTime(times[0]);
  } else {
    morning.sleepEnd = wakeTime(times[0]);
  }
  return true;
}

// ── 체중·허리·화장실 ──

function readBody(clause: string, morning: MorningCheck): boolean {
  let found = false;
  const weight = /(체중|몸무게)\s*(?:은|는|이|가)?\s*(\d{2,3}(?:\.\d+)?)/.exec(clause);
  if (weight) {
    morning.weightKg = Number(weight[2]);
    found = true;
  }
  const waist = /허리\s*(?:둘레)?\s*(?:은|는|가)?\s*(\d{2,3}(?:\.\d+)?)/.exec(clause);
  if (waist) {
    morning.waistCm = Number(waist[1]);
    found = true;
  }
  if (/화장실/.test(clause)) {
    const count = /화장실\D*?(\d+)\s*(?:번|회)/.exec(clause);
    if (count) morning.bowelCount = Number(count[1]);
    else if (/화장실\s*(?:은|을|를)?\s*(?:못|안)/.test(clause)) morning.bowelCount = 0;
    else morning.bowelCount = 1;
    found = true;
  }
  return found;
}

// ── 운동 ──

interface KnownExercise {
  name: string;
  kind: ExerciseKind;
  method: ExerciseMethod;
  /** 이렇게 말해도 이 운동으로 본다 */
  words: RegExp;
}

const COMMON_EXERCISES: KnownExercise[] = [
  { name: "걷기", kind: "cardio", method: "time", words: /걷기|걸었|걷고|걸음|산책/ },
  { name: "러닝", kind: "cardio", method: "time", words: /러닝|달리|달렸|뛰었|뛰고|조깅/ },
  { name: "굿모닝", kind: "strength", method: "sets", words: /굿모닝/ },
  { name: "스쿼트", kind: "strength", method: "sets", words: /스쿼트/ },
  { name: "데드리프트", kind: "strength", method: "sets", words: /데드리프트|데드/ },
  { name: "런지", kind: "strength", method: "sets", words: /런지/ },
  { name: "푸시업", kind: "strength", method: "sets", words: /푸시업|푸쉬업|팔굽혀펴기/ },
  { name: "플랭크", kind: "strength", method: "time", words: /플랭크/ },
  { name: "요가", kind: "flexibility", method: "time", words: /요가/ },
  { name: "필라테스", kind: "flexibility", method: "time", words: /필라테스/ },
  { name: "스트레칭", kind: "flexibility", method: "time", words: /스트레칭|폼롤러/ },
  { name: "자전거", kind: "cardio", method: "time", words: /자전거|사이클/ },
  { name: "수영", kind: "cardio", method: "time", words: /수영/ },
  { name: "등산", kind: "cardio", method: "time", words: /등산/ },
  { name: "계단", kind: "cardio", method: "time", words: /계단/ },
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function readExercise(
  clause: string,
  known: Pick<Exercise, "name" | "kind" | "method">[],
): ParsedExercise | null {
  // 고객이 쓰는 운동 이름이 먼저, 그다음 흔한 운동
  const candidates: KnownExercise[] = [
    ...known.map((k) => ({ ...k, words: new RegExp(escapeRegExp(k.name)) })),
    ...COMMON_EXERCISES,
  ];
  const match = candidates.find((c) => c.words.test(clause));
  if (!match) return null;

  // 시각("저녁 7시에")은 양으로 읽지 않도록 먼저 지운다
  const times = findTimes(clause);
  let rest = clause;
  for (const t of [...times].reverse()) rest = rest.slice(0, t.index) + " " + rest.slice(t.index + t.length);

  const num = (re: RegExp) => {
    const m = re.exec(rest);
    return m ? Number(m[1].replace(/,/g, "")) : undefined;
  };
  const amount: ExerciseAmount = {};
  const sets = num(/(\d+)\s*세트/);
  const reps = num(/(\d+)\s*(?:개|회|번)(?!\s*세트)/);
  const hours = num(/(\d+(?:\.\d+)?)\s*시간/);
  const minutes = num(/(\d+)\s*분/);
  const steps = num(/(\d[\d,]*)\s*(?:보|걸음)/);
  const km = num(/(\d+(?:\.\d+)?)\s*(?:km|키로미터|킬로미터|키로|킬로)(?!그램)/);
  const kg = num(/(\d+(?:\.\d+)?)\s*(?:kg|킬로그램|킬로|키로)/);

  let method = match.method;
  if (sets !== undefined || reps !== undefined) method = "sets";
  else if (steps !== undefined) method = "steps";
  else if (km !== undefined && match.kind === "cardio" && minutes === undefined && hours === undefined) method = "distance";
  else if (minutes !== undefined || hours !== undefined) method = "time";

  if (method === "sets") {
    amount.sets = sets ?? 1;
    if (reps !== undefined) amount.reps = reps;
    if (kg !== undefined) amount.weightKg = kg;
  } else if (method === "time") {
    amount.minutes = (hours ?? 0) * 60 + (minutes ?? 0) || DEFAULT_AMOUNT.time.minutes;
  } else if (method === "distance") {
    amount.km = km;
  } else {
    amount.steps = steps;
  }

  const slotWord = /(아침|점심|저녁|밤)/.exec(clause)?.[1];
  const slot: ExerciseSlot | undefined =
    slotWord === "아침" ? "morning" : slotWord === "점심" ? "lunch" : slotWord ? "evening" : undefined;

  return { name: match.name, kind: match.kind, method, amount, ...(slot ? { slot } : {}) };
}

// ── 식사 ──

const SLOT_TIMES: Record<string, HHMM> = Object.fromEntries(MEAL_TIME_PRESETS.map((p) => [p.label, p.time]));
const SLOT_WORD = /(아침|점심|간식|저녁|야식)\s*(?:은|는|에|엔|으로|으론|을|를)?/;
const EAT_WORDS = /(먹었어요|먹었어|먹었다|먹었고|먹고|먹음|마셨어요|마셨어|마셨고|마시고|마심)\s*$/;

function readMeal(clause: string, previous: number): ParsedMeal | null {
  const times = findTimes(clause);
  let text = clause;
  let time: HHMM | undefined;

  if (times.length) {
    const t = times[0];
    time = mealTime(t, previous);
    text = (text.slice(0, t.index) + " " + text.slice(t.index + t.length)).replace(/^\s*에\s*/, " ");
  } else {
    const slot = SLOT_WORD.exec(text);
    if (!slot) return null;
    time = SLOT_TIMES[slot[1]];
    text = text.slice(0, slot.index) + " " + text.slice(slot.index + slot[0].length);
  }

  const { text: rest, fullness } = takeFullness(text);
  const description = rest.replace(EAT_WORDS, "").replace(/^\s*에\s+/, "").trim();
  return { time, description, ...(fullness ? { fullness } : {}) };
}

/** "비빔밥 포만 8" → "비빔밥", 8 */
function takeFullness(text: string): { text: string; fullness?: number } {
  const m = /포만감?\s*(?:은|는|이)?\s*(10|[1-9])/.exec(text);
  if (!m) return { text: text.trim() };
  return { text: (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim(), fullness: Number(m[1]) };
}
