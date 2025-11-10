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

### Рендер текста (canvasText)
- Используем только `@lib/canvasText` для вывода текста в монохромный буфер:
  - Измерение: `measureCanvasText(text, opts)` вернёт `{ width, height }`.
  - Рендер: `drawCanvasTextToBuffer({ data, width, height }, text, x, yTop, opts)`.
  - Тип буфера: `{ data: Uint8Array; width: number; height: number }` (1 бит/пиксель, MSB→LSB).
- Параметры `opts`:
  - `fontFamily` (рекомендуется `"monospace"` для стабильной верстки),
  - `fontSize` (px), `fontWeight`, `letterSpacing` (px), `thresholdAlpha` (порог альфа для бинаризации),
  - опционально `fontPathToRegister` + `fontFamily` — для подключения кастомного TTF.
- Подбор размера:
  - Сначала измерить текст `measureCanvasText`, при необходимости уменьшать `fontSize`, пока он укладывается в рамки.
  - Центрирование: вычислить `x = (width - measured.width)/2`, `y = (height - measured.height)/2` (с запасом по полям).
- Портретная ориентация:
  - Рендерить во временный буфер тем же API, затем переносить пиксели с поворотом (см. `plugins/calendar/index.ts`).
- Нельзя:
  - использовать старые утилиты bitmap‑шрифтов или собственные битовые маски глифов,
  - напрямую писать текст в буфер, минуя `canvasText`.


