import { ImageResponse } from "next/og";
import React from "react";
import fs from "node:fs/promises";
import { pngBufferToPacked1bppAtkinson } from "@lib/dither";
import { toMonochromeBmp } from "@lib/bmp";

export type OgFontSpec =
	| { name: string; dataPath: string; weight?: number; style?: "normal" | "italic" }
	| { name: string; data: ArrayBuffer | Uint8Array; weight?: number; style?: "normal" | "italic" };

type CompatibleFontOption = {
	name: string;
	data: ArrayBuffer;
	weight?: number | string;
	style?: "normal" | "italic";
};

type MinimalFontOptions = {
	name: string;
	data: ArrayBuffer;
	// Совместимый набор значений веса: только допустимые CSS numeric weights
	weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
	style?: "normal" | "italic";
}[];

export async function normalizeOgFonts(fonts: OgFontSpec[] | undefined): Promise<CompatibleFontOption[]> {
	if (!fonts || fonts.length === 0) return [];
	const out: CompatibleFontOption[] = [];
	function normalizeWeight(w?: number | string): 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 {
		let num: number | null = null;
		if (typeof w === "number" && Number.isFinite(w)) num = w;
		else if (typeof w === "string") {
			const parsed = parseInt(w, 10);
			if (Number.isFinite(parsed)) num = parsed;
		}
		if (num == null) return 400;
		// округляем к ближайшим сотням и ограничиваем диапазон 100..900
		const rounded = Math.round(num / 100) * 100;
		const clamped = Math.min(900, Math.max(100, rounded));
		return (clamped as unknown) as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
	}
	function toArrayBufferStrict(src: Uint8Array | ArrayBuffer): ArrayBuffer {
		if (src instanceof ArrayBuffer) return src;
		const ab = new ArrayBuffer(src.byteLength);
		new Uint8Array(ab).set(src);
		return ab;
	}
	for (const f of fonts) {
		if ("dataPath" in f) {
			const buf = await fs.readFile(f.dataPath);
			out.push({
				name: f.name,
				data: toArrayBufferStrict(buf),
				weight: normalizeWeight(f.weight),
				style: (f.style ?? "normal"),
			});
		} else {
			const arr = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
			out.push({
				name: f.name,
				data: toArrayBufferStrict(arr),
				weight: normalizeWeight(f.weight),
				style: (f.style ?? "normal"),
			});
		}
	}
	return out;
}

export async function renderOgElementToBmp(
	element: React.ReactElement,
	options: {
		width: number;
		height: number;
		scale?: number; // для будущего использования (пока не реализовано)
		fonts?: OgFontSpec[];
		gamma?: number;
	},
): Promise<Uint8Array> {
	const width = Math.max(1, Math.floor(options.width));
	const height = Math.max(1, Math.floor(options.height));
	const scale = Math.max(1, Math.floor(options.scale ?? 1));

	const ogFonts = await normalizeOgFonts(options.fonts);
	const png = await new ImageResponse(element, {
		width: width * scale,
		height: height * scale,
		// Структурно совместимое приведение без использования any
		fonts: ogFonts as unknown as MinimalFontOptions,
		debug: false,
	}).arrayBuffer();

	const packed = await pngBufferToPacked1bppAtkinson(
		Buffer.from(png),
		width,
		height,
		{
			downscaleFrom: scale > 1 ? { width: width * scale, height: height * scale } : undefined,
			gamma: options.gamma ?? 1.8,
		},
	);
	const bmp = toMonochromeBmp({ width, height, data: packed }, { topDown: false, invert: false });
	return bmp;
}


