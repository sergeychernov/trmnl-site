"use client";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);
      setResult(null);
      const res = await fetch("/api/test", { cache: "no-store" });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setResult(data.result ?? null);
    } catch {
      setResult("ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleClick}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
          disabled={loading}
        >
          {loading ? "Бросаю монетку..." : "Бросить монетку"}
        </button>
        {result && <div className="text-lg">Результат: {result}</div>}
      </div>
    </div>
  );
}
