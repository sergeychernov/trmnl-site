import type { Plugin } from "../types";
import Render from "./Render";

// Настройки плагина Telegram — сейчас пустой объект, вся динамика идёт через внешние данные (строка сообщения)
export type TelegramSettings = Record<string, unknown>;

// Плагин Telegram использует внешнее хранилище data_device_telegram с типом данных string (текст последнего/нового сообщения).
const telegram: Plugin<TelegramSettings, string> = {
	id: "telegram",
	name: "Telegram",
	outputSizes: [], // Поддерживает любые размеры (плагин сам подстраивается под width/height)
	defaultSettings: {},
	defaultData: "",
	validate: (value: unknown): value is TelegramSettings => {
		// Любой объект считаем валидной конфигурацией (конкретных полей пока нет)
		return !value || typeof value === "object";
	},
	// Плагин использует внешнее хранилище и сохраняет каждое сообщение в единственном документе
	// в коллекции data_device_telegram (стратегия "replace").
	dataStrategy: "replace",
	render: Render,
	editor: async () => (await import("./Editor")).default,
};

export default telegram;


