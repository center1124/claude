"use client";

import { useSyncExternalStore } from "react";
import { todayISO, type ISODate } from "@diet/core";

const subscribe = () => () => {};

/**
 * 기기 기준 오늘 날짜. 서버에서 미리 그릴 때는 날짜를 알 수 없으므로 null을 돌려주고,
 * 브라우저에서 고객의 현지 날짜로 채운다.
 */
export function useToday(): ISODate | null {
  return useSyncExternalStore(subscribe, () => todayISO(), () => null);
}
