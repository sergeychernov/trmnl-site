import type { Plugin } from "../types";
import type { UserSettings, PluginRenderContext } from "@/plugins/types";
import { createElement } from "react";

type EmptySettings = Record<string, never>;

function validate(value: unknown): value is EmptySettings {
	return !!value && typeof value === "object";
}

const empty: Plugin<EmptySettings> = {
	id: "empty",
	name: "Пустой экран",
	refreshRate: 180,
	outputSizes: [],
	defaultSettings: {},
	validate,
	editor: async () => (await import("./Editor")).default,
	render({ width, height, index }: { user?: UserSettings; settings?: EmptySettings; context?: PluginRenderContext; index: number; width: number; height: number }) {
		// Возвращаем React-элемент: белый фон во весь кадр с текстом
		return createElement(
			"div",
			{
				style: {
					width: `${width}px`,
					height: `${height}px`,
					backgroundColor: index % 2 === 0 ? "#f3f4f6" : "#e5e7eb",
				},
			},
			`Блок ${index} — ${width}×${height}px`,
		);
	},
};

export default empty;



