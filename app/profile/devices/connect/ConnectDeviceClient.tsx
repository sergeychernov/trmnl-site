"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileTabs from "../../ProfileTabs";
import { DeviceConnectErrorMessages } from "@/app/api/device/connect/errors";
import PageLayout from "@/app/components/layouts/PageLayout";

export default function ConnectDeviceClient() {
  const searchParams = useSearchParams();
  const pinFromQuery = useMemo(() => searchParams?.get("pin") ?? "", [searchParams]);
  const [pin, setPin] = useState<string>(pinFromQuery);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <PageLayout title="Профиль" tabs={<ProfileTabs />}>
      <div className="rounded-md bg-gray-100 dark:bg-neutral-800 p-4">
        <div className="text-sm opacity-80 mb-3">Добавить устройство</div>

        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\d{6}$/.test(pin)) {
              setError("Введите корректный PIN (6 цифр)");
              return;
            }
            setSubmitting(true);
            setError(null);
            try {
              const res = await fetch("/api/device/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
              });
              const data: { ok?: boolean; error?: keyof typeof DeviceConnectErrorMessages } = await res.json().catch(() => ({}));
              if (res.ok && data?.ok) {
                router.replace("/profile/devices");
                return;
              }
              const code = (data?.error as keyof typeof DeviceConnectErrorMessages) || "unknown_error";
              setError(DeviceConnectErrorMessages[code] ?? DeviceConnectErrorMessages.unknown_error);
            } catch {
              setError("Сетевая ошибка. Повторите попытку.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="PIN (6 цифр)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D+/g, "").slice(0, 6))}
            className="w-full border rounded-md px-3 py-2"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-gray-800 text-white py-2.5 disabled:opacity-60"
            disabled={!/^\d{6}$/.test(pin) || submitting}
            title={
              submitting
                ? "Выполняется…"
                : /^\d{6}$/.test(pin)
                  ? "Привязать"
                  : "Введите корректный PIN"
            }
          >
            {submitting ? "Привязка..." : "Привязать устройство"}
          </button>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </form>
      </div>
    </PageLayout>
  );
}



