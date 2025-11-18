import type { Plugin } from "../types";
import Render from "./Render";

// У этого плагина пока нет настраиваемых параметров
export type TelegramSettings = Record<string, never>;

const telegram: Plugin<TelegramSettings> = {
	id: "telegram",
	name: "Telegram",
	outputSizes: [], // Поддерживает любые размеры
	defaultSettings: {},
	validate: (value: unknown): value is TelegramSettings => {
		// Принимаем любой объект / отсутствие настроек как валидные
		return !value || typeof value === "object";
	},
	render: Render,
	editor: async () => (await import("./Editor")).default,
};

export default telegram;
