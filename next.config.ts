import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ключевое: компактная standalone-сборка с готовым server.js
  output: "standalone",

  // Опционально (чуть аккуратнее с байтами по сети):
  compress: true,
  poweredByHeader: false,

  // Если используете новые фичи 15-й — оставьте как есть, тут ничего спец. не нужно.
  // Важно: никакие порты в конфиге не задаём — платформа пробрасывает PORT в env.
};

export default nextConfig;
