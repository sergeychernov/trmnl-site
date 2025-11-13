export const metadata = {
  title: "Добавить устройство",
};

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AddDeviceClient from "./ConnectDeviceClient";

export default async function AddDevicePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session) {
    // Собираем исходный путь с query, чтобы вернуться после логина
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (typeof value === "string") {
          params.append(key, value);
        } else if (Array.isArray(value)) {
          for (const v of value) {
            params.append(key, v);
          }
        }
      }
    }
    const originalPath = `/profile/devices/connect${params.toString() ? `?${params.toString()}` : ""}`;
    const url = `/auth?callbackUrl=${encodeURIComponent(originalPath)}`;
    redirect(url);
  }
  return <AddDeviceClient />;
}



