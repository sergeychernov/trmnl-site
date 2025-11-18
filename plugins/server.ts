import { isValidElement } from "react";
import { renderOgElementToPacked1bpp } from "@lib/ogToBmp";
import type { MonochromeImage, Plugin, RenderArgs } from "./types";
import { isSizeAllowed } from "./types";

// Обёртка рендера с централизованной проверкой размеров (server-only)
export async function renderPlugin<TSettings extends object = Record<string, unknown>>(
	plugin: Plugin<TSettings>,
	args: RenderArgs<TSettings>,
): Promise<MonochromeImage | null> {
	const { width, height } = args;
	if (!isSizeAllowed(plugin.outputSizes, width, height)) {
		return null;
	}
	const res = await plugin.render(args);
	if (isValidElement(res)) {
		const fontBase = `${process.cwd()}/public/fonts`;
		const packed = await renderOgElementToPacked1bpp(res, {
			width,
			height,
			scale: 1,
			gamma: 1.8,
			// Шрифты перечислены по приоритету; если файла нет, OG просто пропустит его.
			fonts: [
				// Базовый шрифт проекта (пропорциональный Noto Sans)
				{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Regular.ttf`, weight: 400, style: "normal" },
				{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Bold.ttf`, weight: 700, style: "normal" },
				// Настоящие курсивы Noto Sans (если положить TTF в public/fonts)
				{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Italic.ttf`, weight: 400, style: "italic" },
				{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-BoldItalic.ttf`, weight: 700, style: "italic" },

				// Моноширинный для кода
				{ name: "Noto Sans Mono", dataPath: `${fontBase}/NotoSansMono-Regular.ttf`, weight: 400, style: "normal" },
				{ name: "Noto Sans Mono", dataPath: `${fontBase}/NotoSansMono-Bold.ttf`, weight: 700, style: "normal" },

				// Альтернативы для тестов с кириллицей (нужно положить TTF в public/fonts):
				// PT Sans (normal / bold / italic / bold italic)
				{ name: "PT Sans", dataPath: `${fontBase}/PTSans-Regular.ttf`, weight: 400, style: "normal" },
				{ name: "PT Sans", dataPath: `${fontBase}/PTSans-Bold.ttf`, weight: 700, style: "normal" },
				{ name: "PT Sans", dataPath: `${fontBase}/PTSans-Italic.ttf`, weight: 400, style: "italic" },
				{ name: "PT Sans", dataPath: `${fontBase}/PTSans-BoldItalic.ttf`, weight: 700, style: "italic" },

				// Rubik
				{ name: "Rubik", dataPath: `${fontBase}/Rubik-Regular.ttf`, weight: 400, style: "normal" },
				{ name: "Rubik", dataPath: `${fontBase}/Rubik-Bold.ttf`, weight: 700, style: "normal" },
				{ name: "Rubik", dataPath: `${fontBase}/Rubik-Italic.ttf`, weight: 400, style: "italic" },
				{ name: "Rubik", dataPath: `${fontBase}/Rubik-BoldItalic.ttf`, weight: 700, style: "italic" },

				// Open Sans
				{ name: "Open Sans", dataPath: `${fontBase}/OpenSans-Regular.ttf`, weight: 400, style: "normal" },
				{ name: "Open Sans", dataPath: `${fontBase}/OpenSans-Bold.ttf`, weight: 700, style: "normal" },
				{ name: "Open Sans", dataPath: `${fontBase}/OpenSans-Italic.ttf`, weight: 400, style: "italic" },
				{ name: "Open Sans", dataPath: `${fontBase}/OpenSans-BoldItalic.ttf`, weight: 700, style: "italic" },
			],
		});
		return { width, height, data: packed };
	}
	return res as MonochromeImage;
}


