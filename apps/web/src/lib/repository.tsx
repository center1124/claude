"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ClientProfile, DailyLog, DiaryRepository, ISODate } from "@diet/core";
import { AuthScreen, ConsentScreen } from "@/components/AuthScreens";
import { Loading } from "@/components/ui";
import { LocalDiaryRepository } from "./local-repository";
import { serverEnabled, supabase } from "./supabase";
import { SupabaseDiaryRepository, type SaveStatus } from "./supabase-repository";

const RepositoryContext = createContext<DiaryRepository | null>(null);

export type Account =
  | { mode: "local" }
  | { mode: "server"; email: string; userId: string; saveStatus: SaveStatus; signOut: () => Promise<void> };

const AccountContext = createContext<Account>({ mode: "local" });

export function useAccount(): Account {
  return useContext(AccountContext);
}

/**
 * 서버 주소가 설정되어 있으면 로그인한 뒤 서버에 저장하고,
 * 없으면 체험판으로 이 기기(브라우저)에만 저장한다.
 */
export function RepositoryProvider({ children }: { children: ReactNode }) {
  return serverEnabled ? <ServerProvider>{children}</ServerProvider> : <LocalProvider>{children}</LocalProvider>;
}

function LocalProvider({ children }: { children: ReactNode }) {
  const [repo] = useState<DiaryRepository>(() => new LocalDiaryRepository());
  return <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>;
}

function ServerProvider({ children }: { children: ReactNode }) {
  // undefined: 확인 중, null: 로그인 안 됨
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Loading />;
  if (!session) return <AuthScreen />;
  return (
    <SignedIn key={session.user.id} userId={session.user.id} email={session.user.email ?? ""}>
      {children}
    </SignedIn>
  );
}

function SignedIn({ userId, email, children }: { userId: string; email: string; children: ReactNode }) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [repo] = useState(() => new SupabaseDiaryRepository(supabase(), userId, setSaveStatus));
  // undefined: 확인 중
  const [consented, setConsented] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    supabase()
      .from("profiles")
      .select("sensitive_data_consented_at")
      .eq("id", userId)
      .single()
      .then(({ data }) => setConsented(Boolean(data?.sensitive_data_consented_at)));
  }, [userId]);

  // 화면을 닫거나 다른 앱으로 넘어갈 때 모아 둔 저장을 바로 보낸다
  useEffect(() => {
    const flush = () => document.visibilityState === "hidden" && void repo.flush();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [repo]);

  const signOut = useCallback(async () => {
    await repo.flush();
    await supabase().auth.signOut();
  }, [repo]);

  if (consented === undefined) return <Loading />;
  if (!consented) return <ConsentScreen userId={userId} onDone={() => setConsented(true)} onSignOut={signOut} />;

  return (
    <AccountContext.Provider value={{ mode: "server", email, userId, saveStatus, signOut }}>
      <RepositoryContext.Provider value={repo}>
        {saveStatus === "error" && (
          <p
            role="alert"
            className="fixed inset-x-0 top-0 z-50 bg-pen px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-sm font-medium text-white"
          >
            서버에 저장하지 못했어요. 인터넷이 연결되면 자동으로 다시 저장해요.
          </p>
        )}
        {children}
      </RepositoryContext.Provider>
    </AccountContext.Provider>
  );
}

export function useRepository(): DiaryRepository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error("RepositoryProvider 안에서만 사용할 수 있습니다");
  return repo;
}

/**
 * 하루 기록을 불러오고, 바뀔 때마다 바로 저장한다.
 * 내용을 고치면 updatedAt을 찍는다. 보내기처럼 내용이 그대로인 변경은 stamp: false.
 */
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
    (next: DailyLog, { stamp = true } = {}) => {
      const stamped = stamp ? { ...next, updatedAt: new Date().toISOString() } : next;
      setLog(stamped);
      void repo.saveLog(stamped);
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
