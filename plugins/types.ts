import type React from "react";

// Общие типы для плагинов TRMNL

export type UserInternalInfo = {
	user?: {
		name?: string;
		age?: number;
		address?: string;
		room?: string;
	};
};

// Публичные пользовательские настройки, доступные в плагинах
export type UserSettings = {
	name: string;
	age: number;
};

// Монохромное изображение (1 бит на пиксель, упакованный по байтам)
export type MonochromeImage = {
	width: number; // px
	height: number; // px
	// Плотность 1 бит на пиксель, упакованная побайтно: слева-направо, сверху-вниз.
	// В каждом байте биты от старшего до младшего соответствуют 8 пикселям (1 — чёрный, 0 — белый).
	// Длина массива = ceil(width/8) * height.
	data: Uint8Array;
};

export type Orientation = "landscape" | "portrait";

// Контекст рендера, приходит от сервера
export type PluginRenderContext = {
	// Хэш-идентификатор устройства (hash(MAC))
	deviceId: string | null;
	// Базовый URL сервера (используется, например, для генерации ссылок/QR)
	baseUrl: string;
	// Опциональный Telegram ID, если устройство привязано к аккаунту
	telegramId?: string | null;
};

// Аргументы рендера плагина:
// - TSettings — конфигурация плагина (редактируется пользователем в Editor)
// - TData — опциональные данные из внешнего хранилища (например, сообщения плагина)
export type RenderArgs<TSettings extends object = Record<string, unknown>, TData = unknown> = {
	user?: UserSettings;
	settings?: TSettings;
	// Дополнительные данные для рендера, загружаемые внешним кодом (плагин сам НЕ ходит в БД).
	// Конкретный тип задаётся вторым дженериком Plugin/RenderArgs.
	data?: TData;
	// Метаинформация о данных плагина (например, дата последнего обновления).
	// Для стратегий хранения "append"/"replace" сюда попадает createdAt последней записи.
	dataCreatedAt?: Date;
	context?: PluginRenderContext;
	// Обязательные геометрические параметры целевого изображения
	index: number;
	width: number;
	height: number;
};

// Пропсы редактора настроек плагина
export type PluginEditorProps<TSettings extends object = Record<string, unknown>> = {
	value: TSettings;
	onChange: (next: TSettings) => void;
};

// Стратегия хранения данных плагина.
// Реализация (insert/update в БД) находится во внешнем коде (API/рендер),
// плагин только декларирует, нужна ли ему история и как её хранить.
export type PluginDataStrategy = "none" | "append" | "replace";

export type Plugin<TSettings extends object = Record<string, unknown>, TData = unknown> = {
	id: string;
	name: string;
	// Рекомендуемый интервал обновления данных в секундах
	refreshRate: number;
	// Список поддерживаемых размеров.
	// - Если указан width: ширина фиксируется этим значением, иначе ограничений по ширине нет.
	// - Если указана height: высота фиксируется этим значением, иначе ограничений по высоте нет.
	// - Пустой массив означает отсутствие ограничений по размерам (любой width/height).
	outputSizes: Array<{ width?: number; height?: number }>;
	// Значения по умолчанию настроек плагина
	defaultSettings: TSettings;
	// Опциональные значения по умолчанию для данных плагина (если плагин использует внешнее хранилище)
	defaultData?: TData;
	// Простая рантайм-валидация настроек
	validate: (value: unknown) => value is TSettings;
	// Стратегия хранения данных (по умолчанию — без отдельного хранилища)
	dataStrategy?: PluginDataStrategy;
	// Редактор настроек плагина (ленивая загрузка клиентского компонента)
	editor: () => Promise<React.ComponentType<PluginEditorProps<TSettings>>>;
	// Рендер монохромного изображения на основе настроек, данных и контекста
	// Может вернуть уже готовое MonochromeImage, либо ReactElement, который будет отрисован в 1bpp.
	render: (args: RenderArgs<TSettings, TData>) => Promise<MonochromeImage> | React.ReactElement;
};

// Проверка, допустим ли запрошенный размер по правилам outputSizes
export function isValidSize(
	outputSizes: Array<{ width?: number; height?: number }>,
	width: number,
	height: number,
): boolean {
	// Пустой список — без ограничений вообще
	if (!outputSizes || !outputSizes.length) return true;
	return outputSizes.some((p) => {
		const wOk = p.width == null || p.width === width;
		const hOk = p.height == null || p.height === height;
		// Пустой объект {} — без ограничений
		return wOk && hOk;
	});
}

// Обратная совместимость: старое имя функции
export const isSizeAllowed = isValidityProxy;

function isValidityProxy(
	outputSizes: Array<{ width?: number; height?: number }>,
	width: number,
	height: number,
): boolean {
	return isValidSize(outputSizes, width, height);
}

// Выбор дефолтного целевого размера на основе outputSizes и указанного fallback
export function pickDefaultSize(
	outputSizes: Array<{ width: number; height: number }>,
	fallback: { width: number; height: number } = { width: 800, height: 480 },
): { width: number; height: number } {
	if (!outputSizes || !outputSizes.length) return fallback;
	const p = outputSizes[0] ?? {};
	const w = p.width ?? fallback.width;
	const h = p.height ?? fallback.height;
	return { width: w, height: h };
}


