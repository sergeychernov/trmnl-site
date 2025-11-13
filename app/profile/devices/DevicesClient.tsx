"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProfileTabs from "../Tabs";
import Link from "next/link";

export default function DevicesClient() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [status, router]);
  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Профиль</h1>
      <ProfileTabs />

      <div className="rounded-md bg-gray-100 dark:bg-neutral-800 p-4">
        <div className="text-sm opacity-80">Устройства</div>
        <div className="opacity-80">
          Здесь будет список ваших устройств и управление ими.
        </div>
      </div>
      <div className="mt-4">
        <Link
          href="/profile/device/connect"
          className="inline-block w-full rounded-md bg-gray-800 text-white py-2.5 text-center hover:bg-black transition"
        >
          Добавить устройство
        </Link>
      </div>
    </div>
  );
}


