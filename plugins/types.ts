import type React from "react";
export type UserSettings = {
	name: string;
	age: number;
};

export type MonochromeImage = {
	width: number; // px
	height: number; // px
	// Плотность 1 бит на пиксель, упакованная побайтно: слева-направо, сверху-вниз.
	// В каждом байте биты от старшего к младшему соответствуют 8 пикселям (1 — чёрный, 0 — белый).
	// Длина массива = ceil(width/8) * height.
	data: Uint8Array;
};

export type Orientation = "landscape" | "portrait";

export type PluginRenderContext = {
	deviceId: string | null;
	baseUrl: string;
	telegramId?: string | null;
};

export type RenderArgs<TSettings extends object = Record<string, unknown>> = {
	user?: UserSettings;
	settings?: TSettings;
	context?: PluginRenderContext;
	// Обязательные геометрические параметры целевого изображения
	index: number;
	width: number;
	height: number;
};

export type PluginEditorProps<TSettings extends object = Record<string, unknown>> = {
	value: TSettings;
	onChange: (next: TSettings) => void;
};

export type Plugin<TSettings extends object = Record<string, unknown>> = {
	id: string;
	name: string;
	// Список поддерживаемых размеров.
	// - Если указан width, то ширина фиксируется этим значением, иначе ограничений по ширине нет.
	// - Если указана height, то высота фиксируется этим значением, иначе ограничений по высоте нет.
	// - Пустой массив означает отсутствие ограничений по размерам (любой width/height).
	outputSizes: Array<{ width?: number; height?: number }>;
	// Значения по умолчанию настроек плагина
	defaultSettings: TSettings;
	// Простая рантайм-валидация
	validate: (value: unknown) => value is TSettings;
	// Редактор настроек плагина (ленивая загрузка клиентского компонента)
	editor: () => Promise<React.ComponentType<PluginEditorProps<TSettings>>>;
	// Рендер монохромного изображения на основе настроек пользователя и плагина
	// Может вернуть уже готовое изображение (Promise<MonochromeImage>),
	// либо React-элемент, который будет отрисован в 1bpp через OG-пайплайн.
	render: (args: RenderArgs<TSettings>) => Promise<MonochromeImage> | React.ReactElement;
};

// Проверка, допустим ли запрошенный размер по правилам outputSizes
export function isSizeAllowed(
	outputSizes: Array<{ width?: number; height?: number }>,
	width: number,
	height: number,
): boolean {
	// Пустой список — без ограничений вообще
	if (!outputSizes || outputSizes.length === 0) return true;
	return outputSizes.some((p) => {
		const wOk = p.width == null || p.width === width;
		const hOk = p.height == null || p.height === height;
		// Пустой объект {} — без ограничений
		return wOk && hOk;
	});
}

// Выбор дефолтного целевого размера на основе outputSizes и указанного fallback
export function pickDefaultSize(
	outputSizes: Array<{ width?: number; height?: number }>,
	fallback: { width: number; height: number } = { width: 800, height: 480 },
): { width: number; height: number } {
	if (!outputSizes || outputSizes.length === 0) return fallback;
	const p = outputSizes[0] ?? {};
	const w = p.width ?? fallback.width;
	const h = p.height ?? fallback.height;
	return { width: w, height: h };
}

