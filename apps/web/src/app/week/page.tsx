"use client";

import { Loading } from "@/components/ui";
import { WeekView } from "@/components/WeekView";
import { useToday } from "@/lib/use-today";

export default function ThisWeekPage() {
  const today = useToday();
  return today ? <WeekView date={today} /> : <Loading />;
}
