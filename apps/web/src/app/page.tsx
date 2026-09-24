"use client";

import { DayView } from "@/components/DayView";
import { Loading } from "@/components/ui";
import { useToday } from "@/lib/use-today";

export default function TodayPage() {
  const today = useToday();
  return today ? <DayView date={today} /> : <Loading />;
}
