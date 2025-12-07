import type { Plugin } from "../types";
import Render from "./Render";

// Настройки плагина Telegram:
// - fontScale: шаг изменения размера шрифта относительно базового (0 — обычный, -2/-1 — мельче, +1/+2 — крупнее).
export type TelegramSettings = {
	fontScale: -2 | -1 | 0 | 1 | 2;
};

// Плагин Telegram использует внешнее хранилище data_device_telegram с типом данных string (текст последнего/нового сообщения).
const telegram: Plugin<TelegramSettings, string> = {
	id: "telegram",
	name: "Telegram",
	refreshRate: 300,//5 минут до обновления
	outputSizes: [], // Поддерживает любые размеры (плагин сам подстраивается под width/height)
	defaultSettings: {
		fontScale: 0,
	},
	defaultData: "",
	validate: (value: unknown): value is TelegramSettings => {
		if (!value || typeof value !== "object") return false;
		const v = value as Partial<TelegramSettings>;
		return v.fontScale === -2 || v.fontScale === -1 || v.fontScale === 0 || v.fontScale === 1 || v.fontScale === 2;
	},
	// Плагин использует внешнее хранилище и сохраняет каждое сообщение в единственном документе
	// в коллекции data_device_telegram (стратегия "replace").
	dataStrategy: "replace",
	render: Render,
	editor: async () => (await import("./Editor")).default,
};

export default telegram;


