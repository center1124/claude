"use client";

import { useEffect, useState } from "react";
import { useAccount, useRepository } from "@/lib/repository";
import { SupabaseDiaryRepository } from "@/lib/supabase-repository";
import { localLogsToUpload, uploadLocalRecords } from "@/lib/upload-local";
import { Card } from "./ui";

/** 설정: 로그인한 계정, 로그아웃, 체험판으로 이 폰에 적어 둔 기록 올리기 */
export function AccountCard() {
  const account = useAccount();
  const repo = useRepository();
  const [localDays, setLocalDays] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (account.mode === "server") localLogsToUpload().then((logs) => setLocalDays(logs.length));
  }, [account.mode]);

  if (account.mode === "local") {
    return (
      <p className="rounded-2xl bg-card p-4 text-xs leading-relaxed text-ink-soft">
        지금은 체험판이라 기록이 이 기기의 브라우저에만 저장돼요. 로그인과 서버 저장이 연결되면 코치와 기록이
        공유됩니다.
      </p>
    );
  }

  async function upload() {
    if (!(repo instanceof SupabaseDiaryRepository)) return;
    setBusy(true);
    setMessage(null);
    try {
      const { uploaded, skipped } = await uploadLocalRecords(repo);
      setLocalDays(0);
      setMessage(
        `${uploaded}일 기록을 올렸어요.` + (skipped ? ` 이미 기록이 있던 ${skipped}일은 서버 기록을 그대로 뒀어요.` : ""),
      );
    } catch (error) {
      console.error(error);
      setMessage("올리다가 멈췄어요. 인터넷 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="계정">
      <div className="grid gap-3 text-sm">
        <p className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">{account.email}</span>
          <span className="shrink-0 text-xs text-ink-soft">
            {account.saveStatus === "saving" ? "저장 중…" : account.saveStatus === "error" ? "저장 안 됨" : "저장됨"}
          </span>
        </p>
        {localDays > 0 && (
          <div className="grid gap-2 rounded-xl bg-paper p-3">
            <p>
              로그인 전에 이 폰에 적어 둔 기록이 <b>{localDays}일</b> 있어요. 올리면 코치와 공유되고, 이 폰의 체험
              기록은 지워져요.
            </p>
            <button
              type="button"
              onClick={upload}
              disabled={busy}
              className="justify-self-start rounded-lg bg-pen px-4 py-2 font-bold text-white disabled:opacity-40"
            >
              {busy ? "올리는 중…" : "이 폰에 있던 기록 올리기"}
            </button>
          </div>
        )}
        {message && (
          <p role="status" className="text-pen">
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={() => confirm("로그아웃할까요?") && void account.signOut()}
          className="justify-self-start text-ink-soft underline"
        >
          로그아웃
        </button>
      </div>
    </Card>
  );
}
