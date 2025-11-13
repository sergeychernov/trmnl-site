"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function AuthClient() {
  const { status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirectRaw = useMemo(() => {
    // Приоритет нашему параметру redirect; для совместимости поддержим и callbackUrl
    return searchParams?.get("callbackUrl") ?? null;
  }, [searchParams]);
  const safeRedirect = useMemo(() => {
    // Разрешаем только внутренние пути вида "/something", запрещаем схемы/протоколы/двойные слэши
    if (redirectRaw && redirectRaw.startsWith("/") && !redirectRaw.startsWith("//")) {
      return redirectRaw;
    }
    return "/profile";
  }, [redirectRaw]);
  const authError = useMemo(() => {
    const err = searchParams?.get("error");
    if (!err) return null;
    if (err === "OAuthAccountNotLinked") {
      return "Этот аккаунт Яндекс уже привязан к другому пользователю. Войдите под тем пользователем и отвяжите, затем повторите привязку.";
    }
    if (err === "CredentialsSignin") {
      return "Неверный email или пароль";
    }
    return "Ошибка при входе.";
  }, [searchParams]);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: safeRedirect,
      });
      // Если NextAuth вернул URL, переключимся сами, чтобы не терять текущий хост
      if (res && typeof res === "object" && "url" in res && typeof res.url === "string") {
        router.replace(safeRedirect);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(safeRedirect);
    }
  }, [status, router, safeRedirect]);

  // Ошибки берём напрямую из query через useSearchParams,
  // чтобы SSR/CSR разметка совпадала и не было hydration mismatch.

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Вход</h1>

      {authError ? (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm mb-4">
          {authError}
        </div>
      ) : null}

      <>
        <form className="space-y-3" onSubmit={handleCredentials}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
            minLength={6}
          />
          {error ? <div className="text-red-600 text-sm">{error}</div> : null}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 text-white py-2.5 disabled:opacity-60"
          >
            Войти / Зарегистрироваться
          </button>
        </form>

        <div className="my-6 h-px bg-gray-200 dark:bg-neutral-800" />

        <button
          onClick={() => signIn("yandex", { callbackUrl: safeRedirect })}
          className="w-full rounded-md border py-2.5"
        >
          Войти через Яндекс
        </button>
      </>
    </div>
  );
}
