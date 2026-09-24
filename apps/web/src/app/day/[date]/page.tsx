"use client";

import { notFound, useParams } from "next/navigation";
import { DayView } from "@/components/DayView";
import { isISODate } from "@/lib/route";

export default function DayPage() {
  const { date } = useParams<{ date: string }>();
  if (!isISODate(date)) notFound();
  return <DayView date={date} />;
}
