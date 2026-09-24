import type { ReactNode } from "react";

export function Card({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Loading() {
  return <p className="py-16 text-center text-ink-soft">불러오는 중…</p>;
}

export const inputClass =
  "w-full min-w-0 rounded-lg border text-base border-line bg-paper px-3 py-2 text-pen placeholder:text-ink-soft/60 focus:border-pen focus:outline-none";
