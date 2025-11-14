"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

export default function SettingsTabs() {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const tabs = [
    { href: `/settings/${encodeURIComponent(id)}`, label: "Плагин" },
    { href: `/settings/${encodeURIComponent(id)}/user`, label: "Пользователь" },
  ];

  return (
    <nav className="mb-6 flex items-center gap-2 text-sm">
      {tabs.map((tab) => {
        const active = pathname === tab.href || (tab.href.endsWith("/user") && pathname?.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "px-3 py-1.5 rounded-md transition-colors",
              active ? "bg-foreground/10" : "hover:bg-foreground/10",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}


