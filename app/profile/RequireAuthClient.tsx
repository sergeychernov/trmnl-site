"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RequireAuthClient({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "unauthenticated") {
      const query = searchParams?.toString() || "";
      const original = `${pathname}${query ? `?${query}` : ""}`;
      router.replace(`/auth?callbackUrl=${encodeURIComponent(original)}`);
    }
  }, [status, pathname, searchParams, router]);

  if (status !== "authenticated") {
    return <div className="mx-auto max-w-lg px-4 sm:px-6 py-10 text-sm opacity-70">Загрузка...</div>;
  }
  return <>{children}</>;
}


