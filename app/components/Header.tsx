"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/plugins", label: "Список плагинов" },
  { href: "/auth", label: "Вход/Выход" },
  { href: "/devices", label: "Устройства" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  return (
    <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="TRMNL"
                width={28}
                height={28}
                priority
                className="h-7 w-7"
              />
              <span className="hidden sm:inline">TRMNL</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-4 text-sm">
            {navItems.map((item) => {
              const href = item.href === "/auth" ? (session ? "/profile" : "/auth") : item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={[
                    "px-3 py-1.5 rounded-md transition-colors",
                    isActive(href)
                      ? "bg-foreground/10"
                      : "hover:bg-foreground/10",
                  ].join(" ")}
                >
                  {item.href === "/auth" ? (session ? "Профиль" : "Вход") : item.label}
                </Link>
              );
            })}
          </nav>

          <button
            aria-label="Открыть меню"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-foreground/10 transition-colors"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {open ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-3">
            <nav className="grid gap-1">
              {navItems.map((item) => {
                const href = item.href === "/auth" ? (session ? "/profile" : "/auth") : item.href;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={[
                      "px-3 py-2 rounded-md text-sm transition-colors",
                      isActive(href)
                        ? "bg-foreground/10"
                        : "hover:bg-foreground/10",
                    ].join(" ")}
                  >
                    {item.href === "/auth" ? (session ? "Профиль" : "Вход") : item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}


