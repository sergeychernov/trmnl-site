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
			fonts: [
				{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Regular.ttf`, weight: 400, style: "normal" },
				{ name: "Noto Sans", dataPath: `${fontBase}/NotoSans-Bold.ttf`, weight: 700, style: "normal" },
				{ name: "Noto Sans Mono", dataPath: `${fontBase}/NotoSansMono-Regular.ttf`, weight: 400, style: "normal" },
				{ name: "Noto Sans Mono", dataPath: `${fontBase}/NotoSansMono-Bold.ttf`, weight: 700, style: "normal" },
			],
		});
		return { width, height, data: packed };
	}
	return res as MonochromeImage;
}


