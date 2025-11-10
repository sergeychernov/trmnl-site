"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthClient() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isYandexLinked, setIsYandexLinked] = useState<boolean | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = useMemo(() => {
    const err = searchParams?.get("error");
    if (!err) return null;
    if (err === "OAuthAccountNotLinked") {
      return "Этот аккаунт Яндекс уже привязан к другому пользователю. Войдите под тем пользователем и отвяжите, затем повторите привязку.";
    }
    return "Ошибка при входе через провайдера.";
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
      });
      if (res?.error) {
        setError("Неверный email или пароль");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let aborted = false;
    async function loadLinked() {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/auth/linked/yandex", { cache: "no-store" });
        if (!aborted && res.ok) {
          const data = await res.json();
          setIsYandexLinked(Boolean(data?.linked));
        }
      } catch {
        // ignore
      }
    }
    loadLinked();
    return () => {
      aborted = true;
    };
  }, [status]);

  // Ошибки OAuth берём напрямую из query через useSearchParams,
  // чтобы SSR/CSR разметка совпадала и не было hydration mismatch.

  async function handleUnlink() {
    setLinkLoading(true);
    try {
      const res = await fetch("/api/auth/unlink/yandex", { method: "POST" });
      if (res.ok) {
        setIsYandexLinked(false);
      }
    } finally {
      setLinkLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Вход</h1>

      {oauthError ? (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm mb-4">
          {oauthError}
        </div>
      ) : null}

      {status === "authenticated" ? (
        <div className="space-y-4">
          <div className="rounded-md bg-gray-100 dark:bg-neutral-800 p-4">
            <div className="text-sm opacity-80">Вы вошли как</div>
            <div className="font-medium">{session?.user?.name || session?.user?.email}</div>
          </div>
          {isYandexLinked === false && (
            <button
              onClick={() => signIn("yandex", { callbackUrl: "/auth" })}
              className="w-full rounded-md border py-2.5"
              disabled={linkLoading}
            >
              Привязать Яндекс
            </button>
          )}
          {isYandexLinked === true && (
            <button
              onClick={handleUnlink}
              className="w-full rounded-md border py-2.5"
              disabled={linkLoading}
            >
              Отвязать Яндекс
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="w-full rounded-md bg-gray-800 text-white py-2.5 hover:bg-black transition"
          >
            Выйти
          </button>
        </div>
      ) : (
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
            onClick={() => signIn("yandex", { callbackUrl: "/auth" })}
            className="w-full rounded-md border py-2.5"
          >
            Войти через Яндекс
          </button>
        </>
      )}
    </div>
  );
}
