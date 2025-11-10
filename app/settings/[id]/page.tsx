/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadSettingsFromLocalStorage, saveSettingsToLocalStorage, parseSettings, type Settings } from "@lib/settings";
import { listPlugins, getPlugin } from "@/plugins";

type Params = { id?: string };

export default function SettingsPage() {
  const params = useParams<Params>();
  const idParam = useMemo(() => {
    // В динамическом сегменте [id] ожидаем уже хеш MAC
    const raw = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
    return raw ?? "";
  }, [params]);

  const plugins = useMemo(() => listPlugins(), []);
  const [userName, setUserName] = useState("");
  const [userAge, setUserAge] = useState<number | "">("");
  const [pluginId, setPluginId] = useState<string>(plugins[0]?.id ?? "");
  const [pluginSettingsText, setPluginSettingsText] = useState<string>("");
  const [pluginSettingsError, setPluginSettingsError] = useState<string>("");
  const [saved, setSaved] = useState<null | Settings>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!idParam) return;
      setInitializing(true);
      const existing = loadSettingsFromLocalStorage(idParam);
      if (existing) {
        if (cancelled) return;
        setUserName(existing.user.name);
        setUserAge(existing.user.age);
        setPluginId(existing.device.pluginId);
        setPluginSettingsText(JSON.stringify(existing.device.pluginSettings, null, 2));
        setSaved(existing);
        setInitializing(false);
        return;
      }
      // Пробуем подтянуть из БД
      try {
        const res = await fetch(`/api/settings/${encodeURIComponent(idParam)}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const parsed = data?.settings ? parseSettings(data.settings) : null;
          if (parsed) {
            setUserName(parsed.user.name);
            setUserAge(parsed.user.age);
            setPluginId(parsed.device.pluginId);
            setPluginSettingsText(JSON.stringify(parsed.device.pluginSettings, null, 2));
            setSaved(parsed);
            setInitializing(false);
            return;
          }
        }
      } catch {
        // игнорируем сетевые ошибки
      }
      // Фоллбек — настройки по умолчанию текущего плагина
      const p = getPlugin(pluginId) ?? plugins[0];
      if (p) {
        setPluginSettingsText(JSON.stringify(p.defaultSettings, null, 2));
      }
      setInitializing(false);
    }
    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam]);

  useEffect(() => {
    // Смена плагина пользователем -> подставим его настройки по умолчанию
    if (initializing) return;
    const p = getPlugin(pluginId);
    if (p) {
      setPluginSettingsText(JSON.stringify(p.defaultSettings, null, 2));
      setPluginSettingsError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginId, initializing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPluginSettingsError("");
    const plugin = getPlugin(pluginId);
    if (!plugin) {
      setPluginSettingsError("Не выбран плагин");
      return;
    }
    let parsedSettings: unknown;
    try {
      parsedSettings = JSON.parse(pluginSettingsText || "{}");
    } catch {
      setPluginSettingsError("Некорректный JSON настроек плагина");
      return;
    }
    if (!plugin.validate(parsedSettings)) {
      setPluginSettingsError("Настройки плагина не проходят валидацию");
      return;
    }
    const settings: Settings = {
      user: {
        name: userName.trim(),
        age: typeof userAge === "number" ? userAge : parseInt(String(userAge || "0"), 10) || 0,
      },
      device: {
        pluginId: plugin.id,
        pluginSettings: parsedSettings,
      },
    };
    saveSettingsToLocalStorage(idParam, settings);
    setSaved(settings);
    // Также сохраним в БД через API
    try {
      await fetch(`/api/settings/${encodeURIComponent(idParam)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {
      // игнорируем сетевые ошибки, локальное сохранение уже выполнено
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Настройки устройства</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        ID устройства (хеш MAC): <code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>{idParam || "—"}</code>
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <fieldset style={{ display: "grid", gap: 12 }}>
          <legend style={{ fontWeight: 600, marginBottom: 4 }}>Настройки пользователя</legend>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Имя</span>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Иван Иванов"
              required
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                outline: "none",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Возраст</span>
            <input
              type="number"
              min={0}
              value={userAge}
              onChange={(e) => setUserAge(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="30"
              required
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                outline: "none",
              }}
            />
          </label>
        </fieldset>

        <fieldset style={{ display: "grid", gap: 12 }}>
          <legend style={{ fontWeight: 600, marginBottom: 4 }}>Настройки устройства</legend>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Выбранный плагин</span>
            <select
              value={pluginId}
              onChange={(e) => setPluginId(e.target.value)}
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                outline: "none",
                background: "white",
              }}
            >
              {plugins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Настройки плагина (JSON)</span>
            <textarea
              value={pluginSettingsText}
              onChange={(e) => setPluginSettingsText(e.target.value)}
              rows={8}
              spellCheck={false}
              style={{
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                outline: "none",
                resize: "vertical",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            />
            {pluginSettingsError && (
              <span style={{ color: "#b91c1c" }}>{pluginSettingsError}</span>
            )}
          </label>
        </fieldset>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              background: "black",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Сохранить
          </button>
        </div>
      </form>

      {saved && (
        <p style={{ marginTop: 16, color: "#14834e" }}>
          Сохранено локально для ID <code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>{idParam}</code>.
        </p>
      )}
    </main>
  );
}


