"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProfileTabs from "../Tabs";
import Link from "next/link";

export default function DevicesClient() {
  const { status } = useSession();
  const router = useRouter();
  const [devices, setDevices] = useState<Array<{ id: string; name: string; friendly_id: string; hash: string; role: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status !== "authenticated") return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/devices", { cache: "no-store" });
        const data: { devices?: Array<{ id: string; name: string; friendly_id: string; hash: string; role: string | null }> } =
          await res.json().catch(() => ({}));
        if (!cancelled) {
          setDevices(data.devices ?? []);
        }
      } catch {
        if (!cancelled) setError("Не удалось загрузить устройства");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status]);
  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Профиль</h1>
      <ProfileTabs />

      <div className="rounded-md bg-gray-100 dark:bg-neutral-800 p-4">
        <div className="text-sm opacity-80">Устройства</div>
        {loading ? (
          <div className="opacity-80">Загрузка...</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : devices.length === 0 ? (
          <div className="opacity-80">У вас пока нет подключённых устройств</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="rounded border px-3 py-2 bg-white dark:bg-neutral-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                onClick={() => router.push(`/settings/${encodeURIComponent(d.hash)}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/settings/${encodeURIComponent(d.hash)}`);
                  }
                }}
                title="Открыть настройки устройства"
              >
                <div className="font-medium">{d.name || d.friendly_id}</div>
                <div className="text-xs opacity-70">
                  {d.friendly_id} {d.role ? `· ${d.role}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <Link
          href="/profile/devices/connect"
          className="inline-block w-full rounded-md bg-gray-800 text-white py-2.5 text-center hover:bg-black transition"
        >
          Добавить устройство
        </Link>
      </div>
    </div>
  );
}


