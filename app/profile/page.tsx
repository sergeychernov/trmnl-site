export const metadata = {
  title: "Профиль пользователя",
};

import { Suspense } from "react";
import ProfileClient from "./ProfileClient";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 sm:px-6 py-10 text-sm opacity-70">Загрузка...</div>}>
      <ProfileClient />
    </Suspense>
  );
}


