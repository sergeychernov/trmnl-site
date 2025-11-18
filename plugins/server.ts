import fs from "node:fs";
import { isValidElement } from "react";
import { renderOgElementToPacked1bpp } from "@lib/ogToBmp";
import type { OgFontSpec } from "@lib/ogToBmp";
import type { MonochromeImage, Plugin, RenderArgs } from "./types";
import { isSizeAllowed } from "./types";

async function filterExistingFonts(fonts: readonly OgFontSpec[]): Promise<OgFontSpec[]> {
	const results = await Promise.all(
		fonts.map(async (font) => {
			// Вариант с встроенными данными всегда считаем валидным
			if (!("dataPath" in font)) {
				return font;
			}
			try {
				const stat = await fs.promises.stat(font.dataPath);
				if (stat.isFile() && stat.size > 0) {
					return font;
				}
			} catch {
				// файл отсутствует — пропускаем
			}
			return null as OgFontSpec | null;
		}),
	);
	return results.filter((f): f is OgFontSpec => f !== null);
}

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
		const candidateFonts = [
			// Базовый шрифт проекта (пропорциональный Noto Sans)
			{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Regular.ttf`, weight: 400, style: "normal" as const },
			{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Bold.ttf`, weight: 700, style: "normal" as const },
			// Настоящие курсивы Noto Sans (если положить TTF в public/fonts)
			{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Italic.ttf`, weight: 400, style: "italic" as const },
			{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-BoldItalic.ttf`, weight: 700, style: "italic" as const },

			// Моноширинный для кода
			{
				name: "Noto Sans Mono",
				dataPath: `${fontBase}/NotoSansMono-Regular.ttf`,
				weight: 400,
				style: "normal" as const,
			},
			{
				name: "Noto Sans Mono",
				dataPath: `${fontBase}/NotoSansMono-Bold.ttf`,
				weight: 700,
				style: "normal" as const,
			},

			// Альтернативы для тестов с кириллицей (нужно положить TTF в public/fonts):
			// PT Sans (normal / bold / italic / bold italic)
			{ name: "PT Sans", dataPath: `${fontBase}/PTSans-Regular.ttf`, weight: 400, style: "normal" as const },
			{ name: "PT Sans", dataPath: `${fontBase}/PTSans-Bold.ttf`, weight: 700, style: "normal" as const },
			{ name: "PT Sans", dataPath: `${fontBase}/PTSans-Italic.ttf`, weight: 400, style: "italic" as const },
			{
				name: "PT Sans",
				dataPath: `${fontBase}/PTSans-BoldItalic.ttf`,
				weight: 700,
				style: "italic" as const,
			},

			// Rubik
			{ name: "Rubik", dataPath: `${fontBase}/Rubik-Regular.ttf`, weight: 400, style: "normal" as const },
			{ name: "Rubik", dataPath: `${fontBase}/Rubik-Bold.ttf`, weight: 700, style: "normal" as const },
			{ name: "Rubik", dataPath: `${fontBase}/Rubik-Italic.ttf`, weight: 400, style: "italic" as const },
			{
				name: "Rubik",
				dataPath: `${fontBase}/Rubik-BoldItalic.ttf`,
				weight: 700,
				style: "italic" as const,
			},

			// Open Sans
			{
				name: "Open Sans",
				dataPath: `${fontBase}/OpenSans-Regular.ttf`,
				weight: 400,
				style: "normal" as const,
			},
			{
				name: "Open Sans",
				dataPath: `${fontBase}/OpenSans-Bold.ttf`,
				weight: 700,
				style: "normal" as const,
			},
			{
				name: "Open Sans",
				dataPath: `${fontBase}/OpenSans-Italic.ttf`,
				weight: 400,
				style: "italic" as const,
			},
			{
				name: "Open Sans",
				dataPath: `${fontBase}/OpenSans-BoldItalic.ttf`,
				weight: 700,
				style: "italic" as const,
			},
		] as const;

		const fonts = await filterExistingFonts(candidateFonts);

		const packed = await renderOgElementToPacked1bpp(res, {
			width,
			height,
			scale: 1,
			gamma: 1.8,
			// Шрифты перечислены по приоритету; если часть файлов отсутствует, мы их заранее отфильтровали.
			fonts,
		});
		return { width, height, data: packed };
	}
	return res as MonochromeImage;
}


