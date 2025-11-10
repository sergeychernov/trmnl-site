"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProfileTabs from "../Tabs";

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
    </div>
  );
}


