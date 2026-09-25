"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Logo } from "./Logo";
import { inputClass } from "./ui";

const buttonClass = "rounded-lg bg-pen px-4 py-3 font-bold text-white disabled:opacity-40";

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-sm grid-cols-1 gap-5 pt-12">
      <header className="text-center">
        <Logo className="block text-4xl" />
        <h1 className="mt-2 font-bold">{title}</h1>
      </header>
      {children}
    </div>
  );
}

/**
 * 이메일로 받은 인증번호로 로그인한다. 처음이면 그대로 가입된다.
 * (메일 속 링크 방식은 홈 화면에 추가한 아이폰 앱에서 사파리로 열려 로그인이 풀리므로 번호를 쓴다)
 */
export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setError(authErrorMessage(error.message));
    setSentTo(address);
    setCode("");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(authErrorMessage(error.message));
  }

  if (sentTo) {
    return (
      <Screen title="인증번호 입력">
        <form onSubmit={verify} className="grid grid-cols-1 gap-3">
          <p className="text-sm text-ink-soft">
            <b className="text-ink">{sentTo}</b>로 보낸 메일의 숫자를 적어 주세요. 메일이 안 보이면 스팸함도 확인해
            주세요.
          </p>
          <input
            aria-label="인증번호"
            className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button type="submit" className={buttonClass} disabled={busy || code.length < 6}>
            로그인
          </button>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex justify-between text-sm text-ink-soft">
            <button type="button" className="underline" onClick={() => setSentTo(null)}>
              다른 이메일로
            </button>
            <button type="button" className="underline" disabled={busy} onClick={() => sendCode()}>
              번호 다시 받기
            </button>
          </div>
        </form>
      </Screen>
    );
  }

  return (
    <Screen title="로그인">
      <form onSubmit={sendCode} className="grid grid-cols-1 gap-3">
        <label className="grid gap-1 text-sm font-medium">
          이메일
          <input
            type="email"
            className={inputClass}
            autoComplete="email"
            placeholder="me@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" className={buttonClass} disabled={busy || !email.trim()}>
          인증번호 받기
        </button>
        {error && <ErrorText>{error}</ErrorText>}
        <p className="text-xs text-ink-soft">처음이면 이 이메일로 가입돼요. 비밀번호는 필요 없어요.</p>
      </form>
    </Screen>
  );
}

/** 처음 로그인하면 건강정보(민감정보) 수집에 따로 동의받고, 코치가 부를 이름을 정한다 */
export function ConsentScreen({
  userId,
  onDone,
  onSignOut,
}: {
  userId: string;
  onDone: () => void;
  onSignOut: () => void;
}) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase()
      .from("profiles")
      .update({ name: name.trim(), sensitive_data_consented_at: new Date().toISOString() })
      .eq("id", userId);
    setBusy(false);
    if (error) return setError("저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.");
    onDone();
  }

  return (
    <Screen title="시작하기 전에">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4">
        <label className="grid gap-1 text-sm font-medium">
          이름
          <input
            className={inputClass}
            placeholder="코치님이 부를 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <section className="grid gap-2 rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed">
          <h2 className="font-bold">건강정보 수집·이용 동의</h2>
          <ul className="list-disc pl-5 text-ink-soft">
            <li>모으는 것: 수면 시간, 체중, 허리 둘레, 화장실 횟수, 생리 예정일, 식사 기록과 사진, 포만감, 운동</li>
            <li>쓰는 곳: 식습관·생활 습관 코칭</li>
            <li>보는 사람: 나와 담당 코치</li>
            <li>보관: 탈퇴하거나 설정에서 지울 때까지</li>
          </ul>
          <p className="text-xs text-ink-soft">동의하지 않으면 기록을 저장할 수 없어요.</p>
          <label className="mt-1 flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--pen)]"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            위 건강정보 수집·이용에 동의해요
          </label>
        </section>
        <button type="submit" className={buttonClass} disabled={busy || !agreed}>
          시작하기
        </button>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="button" className="text-sm text-ink-soft underline" onClick={onSignOut}>
          로그아웃
        </button>
      </form>
    </Screen>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-pen">
      {children}
    </p>
  );
}

function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "메일을 너무 자주 요청했어요. 1분쯤 뒤에 다시 받아 주세요.";
  if (m.includes("expired") || m.includes("invalid")) return "번호가 맞지 않거나 시간이 지났어요. 번호를 다시 받아 주세요.";
  if (m.includes("email")) return "이메일 주소를 다시 확인해 주세요.";
  return "잠시 문제가 생겼어요. 인터넷 연결을 확인하고 다시 시도해 주세요.";
}
