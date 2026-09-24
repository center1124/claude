"use client";

import { notFound, useParams } from "next/navigation";
import { WeekView } from "@/components/WeekView";
import { isISODate } from "@/lib/route";

export default function WeekPage() {
  const { date } = useParams<{ date: string }>();
  if (!isISODate(date)) notFound();
  return <WeekView date={date} />;
}
