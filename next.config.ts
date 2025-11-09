import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ключевое: компактная standalone-сборка с готовым server.js
  output: "standalone",

  // Опционально (чуть аккуратнее с байтами по сети):
  compress: true,
  poweredByHeader: false,

  // Если используете новые фичи 15-й — оставьте как есть, тут ничего спец. не нужно.
  // Важно: никакие порты в конфиге не задаём — платформа пробрасывает PORT в env.
  async rewrites() {
    // Переписываем запросы со слэшем в конце на канонические пути без редиректа (200 вместо 308)
    return [
      { source: "/api/setup/", destination: "/api/setup" },
      { source: "/api/display/", destination: "/api/display" },
      { source: "/api/trmnl.png/", destination: "/api/trmnl.png" },
      { source: "/api/trmnl/", destination: "/api/trmnl" },
    ];
  },
};

export default nextConfig;
