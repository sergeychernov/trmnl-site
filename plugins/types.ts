import type { UserSettings } from "@/lib/settings";

export type MonochromeImage = {
	width: number; // px
	height: number; // px
	// Плотность 1 бит на пиксель, упакованная побайтно: слева-направо, сверху-вниз.
	// В каждом байте биты от старшего к младшему соответствуют 8 пикселям (1 — чёрный, 0 — белый).
	// Длина массива = ceil(width/8) * height.
	data: Uint8Array;
};

export type Orientation = "landscape" | "portrait";

export type Plugin<TSettings extends object = Record<string, unknown>> = {
	id: string;
	name: string;
	// Фиксированный размер изображения для данного плагина
	outputSize: { width: number; height: number };
	// Значения по умолчанию настроек плагина
	defaultSettings: TSettings;
	// Простая рантайм-валидация
	validate: (value: unknown) => value is TSettings;
	// Рендер монохромного изображения на основе настроек пользователя и плагина
	render: (
		user: UserSettings,
		device: TSettings,
		context: { deviceId: string | null; baseUrl: string },
	) => Promise<MonochromeImage>;
};


