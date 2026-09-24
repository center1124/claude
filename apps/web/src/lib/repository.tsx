"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { ClientProfile, DailyLog, DiaryRepository, ISODate } from "@diet/core";
import { LocalDiaryRepository } from "./local-repository";

const RepositoryContext = createContext<DiaryRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [repo] = useState<DiaryRepository>(() => new LocalDiaryRepository());
  return <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): DiaryRepository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error("RepositoryProvider 안에서만 사용할 수 있습니다");
  return repo;
}

/** 하루 기록을 불러오고, 바뀔 때마다 바로 저장한다 */
export function useDailyLog(date: ISODate) {
  const repo = useRepository();
  const [log, setLog] = useState<DailyLog | null>(null);

  useEffect(() => {
    let active = true;
    repo.getLog(date).then((loaded) => active && setLog(loaded));
    return () => {
      active = false;
    };
  }, [repo, date]);

  const update = useCallback(
    (next: DailyLog) => {
      setLog(next);
      void repo.saveLog(next);
    },
    [repo],
  );

  return { log, update };
}

export function useProfile() {
  const repo = useRepository();
  const [profile, setProfile] = useState<ClientProfile | null>(null);

  useEffect(() => {
    let active = true;
    repo.getProfile().then((loaded) => active && setProfile(loaded));
    return () => {
      active = false;
    };
  }, [repo]);

  const update = useCallback(
    (next: ClientProfile) => {
      setProfile(next);
      void repo.saveProfile(next);
    },
    [repo],
  );

  return { profile, update };
}

export function useLogs(from: ISODate, to: ISODate) {
  const repo = useRepository();
  const [logs, setLogs] = useState<DailyLog[] | null>(null);

  useEffect(() => {
    let active = true;
    repo.getLogs(from, to).then((loaded) => active && setLogs(loaded));
    return () => {
      active = false;
    };
  }, [repo, from, to]);

  return logs;
}

/** 사진 ID를 화면에 띄울 URL로 바꾼다. 화면에서 사라지면 URL을 해제한다 */
export function usePhotoUrl(photoId: string): string | null {
  const repo = useRepository();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    repo.getPhotoUrl(photoId).then((u) => {
      created = u;
      if (active) setUrl(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      active = false;
      if (created?.startsWith("blob:")) URL.revokeObjectURL(created);
    };
  }, [repo, photoId]);

  return url;
}
