import { ImageResponse } from "next/og";
import type React from "react";
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

export async function normalizeOgFonts(fonts: OgFontSpec[] | undefined): Promise<CompatibleFontOption[]> {
	if (!fonts || fonts.length === 0) return [];
	const out: CompatibleFontOption[] = [];
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
				weight: f.weight ?? 400,
				style: (f.style ?? "normal"),
			});
		} else {
			const arr = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
			out.push({
				name: f.name,
				data: toArrayBufferStrict(arr),
				weight: f.weight ?? 400,
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
		scale?: number; // 1 | 2 для «doubleSizeForSharperText»
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
		// Приведение для совместимости с типами next/og разных версий
		fonts: ogFonts as unknown as any,
		debug: false,
	}).arrayBuffer();

	const packed = await pngBufferToPacked1bppAtkinson(Buffer.from(png), width, height, { gamma: options.gamma ?? 1.8 });
	const bmp = toMonochromeBmp({ width, height, data: packed }, { topDown: false, invert: false });
	return bmp;
}


