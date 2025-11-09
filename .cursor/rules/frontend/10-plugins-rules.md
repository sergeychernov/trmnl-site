## Правила Cursor — плагины отображения

### Цель
- Плагины генерируют монохромное изображение для TRMNL на основе настроек пользователя и устройства.
- Размер изображения у каждого плагина фиксирован через поле `outputSize`.

### Контракт плагина
- Файл: `plugins/${pluginName}/index.ts`, экспорт по умолчанию:
  - `id: string`, `name: string`
  - `outputSize: { width: number; height: number }` — фиксированный размер
  - `defaultSettings: TSettings` — значения по умолчанию
  - `validate(value): value is TSettings` — рантайм‑валидация
  - `render(user: UserSettings, device: TSettings, context: { deviceId: string | null; baseUrl: string }): Promise<MonochromeImage>`
- Регистрация плагина: `plugins/index.ts` (реестр и функции `listPlugins`, `getPlugin`)

### Формат изображения
- `MonochromeImage`:
  - `width`, `height` — пиксели
  - `data: Uint8Array` — 1 бит на пиксель, упакован побайтно (MSB→LSB), порядок: строка за строкой

### Настройки
- Общие настройки:
  - Пользователь: `{ name: string; age: number }`
  - Устройство: `{ pluginId: string; pluginSettings: unknown }`
- Рекомендуемые настройки плагина:
  - `orientation: "landscape" | "portrait"` — влияет на ориентацию контента
  - Дополнительные параметры (текст, источники данных и т.д.) — по задаче
 - Плагин не должен зависеть от `baseUrl`/`deviceId` через `device` — эти значения приходят в `context`.

### Ограничения и рекомендации
- Размер TRMNL: 800×480 (см. BYOS Next.js README `https://github.com/usetrmnl/byos_next/blob/main/README.md`).
- Производительность: избегать лишних аллокаций; сложность O(width × height).
- Детерминизм: `render` должен быть чистым относительно входных данных.
- Кросс‑платформенность: не использовать Node‑специфику в плагинах, если они вызываются в браузере.


