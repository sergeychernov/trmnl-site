const name = "Вход/Регистрация";
export const metadata = {
  title: `TRMNL: ${name}`,
};

import { Suspense } from "react";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
      <Suspense fallback={<div className="text-sm opacity-70">Загрузка...</div>}>
        <AuthClient />
      </Suspense>
    </div>
  );
}

