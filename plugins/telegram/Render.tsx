import React from "react";
import ReactMarkdown from "react-markdown";
import type { RenderArgs } from "../types";
import type { TelegramSettings } from "./index";

// Плагин Telegram: показывает последнее сообщение, которое внешний код передал через `data`,
// и аккуратно обрабатывает случай, когда Telegram ещё не привязан или сообщений нет.
export default function Render({
  user,
  data,
  context,
  width,
  height,
}: RenderArgs<TelegramSettings, string>) {
  const telegramId = context?.telegramId ?? null;
  const message = typeof data === "string" && data.trim().length > 0 ? data.trim() : null;

  const baseStyle = {
    width,
    height,
    backgroundColor: "white",
    color: "black",
    fontFamily: "Noto Sans",
    display: "flex" as const,
    flexDirection: "column" as const,
    padding: 24,
  } as const;

  // Если Telegram не привязан — просим привязать аккаунт
  if (!telegramId) {
    return (
      <div style={baseStyle}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 60, marginBottom: 16 }}>⚠️</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.5,
            }}
          >
            <span>Для работы этого плагина</span>
            <span>привяжите Telegram аккаунт</span>
            <span>в профиле пользователя</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 12,
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>📨</span>
        <span style={{ fontSize: 24, fontWeight: "bold" }}>Сообщения из Telegram</span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "left",
          fontSize: 18,
          lineHeight: 1.4,
        }}
      >
        {message ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ opacity: 0.7 }}>Последнее сообщение:</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                whiteSpace: "pre-wrap",
                gap: 4,
              }}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }: { children?: React.ReactNode }) => (
                    // каждая параграфная строка — отдельный span для OG-совместимости
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      {children}
                    </span>
                  ),
                  strong: ({ children }: { children?: React.ReactNode }) => (
                    <span style={{ fontWeight: "bold" }}>{children}</span>
                  ),
                  em: ({ children }: { children?: React.ReactNode }) => (
                    <span style={{ fontStyle: "italic" }}>{children}</span>
                  ),
                  u: ({ children }: { children?: React.ReactNode }) => (
                    <span style={{ textDecoration: "underline" }}>{children}</span>
                  ),
                  del: ({ children }: { children?: React.ReactNode }) => (
                    <span style={{ textDecoration: "line-through" }}>{children}</span>
                  ),
                  code: ({ children }: { children?: React.ReactNode }) => (
                    <span
                      style={{
                        fontFamily: "Noto Sans Mono, monospace",
                        fontSize: 16,
                      }}
                    >
                      {children}
                    </span>
                  ),
                  a: ({
                    children,
                    href,
                  }: {
                    children?: React.ReactNode;
                    href?: string;
                  }) => (
                    <span style={{ textDecoration: "underline" }}>
                      {children}
                      {href ? ` (${href})` : null}
                    </span>
                  ),
                }}
              >
                {message}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: 0.7 }}>
            <span>Пока нет сообщений.</span>
            <span>
              Отправьте сообщение боту <strong>@trmnlmsgbot</strong>, чтобы увидеть его здесь.
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          fontSize: 14,
          opacity: 0.6,
          gap: 4,
        }}
      >
        <span>Telegram ID:</span>
        <span>{telegramId ?? "—"}</span>
        {user?.name && <span>· {user.name}</span>}
      </div>
    </div>
  );
}


