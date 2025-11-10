"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProfileTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/profile", label: "Авторизация" },
    { href: "/profile/devices", label: "Устройства" },
  ];
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm">
      {tabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/profile" && pathname?.startsWith(tab.href));
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


