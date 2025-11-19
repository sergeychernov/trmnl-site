import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { RenderArgs } from "../types";
import type { TelegramSettings } from "./index";

// Плагин Telegram: показывает последнее сообщение, которое внешний код передал через `data`,
// и аккуратно обрабатывает случай, когда Telegram ещё не привязан или сообщений нет.
export default function Render({
  data,
  dataCreatedAt,
  context,
  width,
  height,
  settings,
}: RenderArgs<TelegramSettings, string>) {
  const telegramId = context?.telegramId ?? null;
  const message = typeof data === "string" && data.trim().length > 0 ? data.trim() : null;
  const createdAt =
    dataCreatedAt instanceof Date ? dataCreatedAt : dataCreatedAt ? new Date(dataCreatedAt) : null;
  const createdAtLabel = createdAt
    ? createdAt.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : null;

  const fontScale = settings?.fontScale ?? 0;
  const contentFontSize = Math.max(12, 18 + fontScale * 2);

  const baseStyle = {
    width,
    height,
    backgroundColor: "white",
    color: "black",
    // Для тестов шрифтов: первым указан PT Sans, затем Rubik / Open Sans, потом Noto Sans как фолбэк.
    fontFamily: '"Noto Sans", "Open Sans", "Rubik", "PT Sans", sans-serif',
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
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "left",
          fontSize: contentFontSize,
          lineHeight: 1.4,
          gap: 2,
        }}
      >
        {message ? (
          // Разбиваем исходный текст по переводам строк Telegram,
          // и каждую строку рендерим отдельно.
          message.split(/\r?\n/).map((line, index) => {
            const trimmed = line.trimEnd();
            const isEmpty = trimmed.trim().length === 0;

            if (isEmpty) {
              return <div key={index} style={{ height: 8 }} />;
            }

            const isBullet = trimmed.trimStart().startsWith("- ");
            const content = isBullet ? trimmed.trimStart().replace(/^-\s+/, "") : trimmed;

            const InlineMarkdown = (
              <ReactMarkdown
                key={`md-${index}`}
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
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
                {content}
              </ReactMarkdown>
            );

            if (isBullet) {
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                  }}
                >
                  <span style={{ marginRight: 6 }}>•</span>
                  {InlineMarkdown}
                </div>
              );
            }

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                {InlineMarkdown}
              </div>
            );
          })
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: 0.7 }}>
            <span>Пока нет сообщений.</span>
            <span>
              Отправьте сообщение боту <strong>@trmnlmsgbot</strong>, чтобы увидеть его здесь.
            </span>
          </div>
        )}
      </div>

      {createdAtLabel && (
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <span>{createdAtLabel}</span>
        </div>
      )}
    </div>
  );
}


