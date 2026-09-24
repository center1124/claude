"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", match: "/day", label: "하루 기록", icon: "✎" },
  { href: "/week", match: "/week", label: "주간 보기", icon: "▦" },
  { href: "/settings", match: "/settings", label: "설정", icon: "⚙" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-5xl">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.match);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs ${
                  active ? "font-bold text-pen" : "text-ink-soft"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
