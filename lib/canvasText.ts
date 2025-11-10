import { createCanvas, registerFont } from "canvas";

export type MonoBuffer = { data: Uint8Array; width: number; height: number };

function setPixelBlackPacked(data: Uint8Array, width: number, height: number, x: number, y: number) {
	if (x < 0 || x >= width || y < 0 || y >= height) return;
	const bytesPerRow = Math.ceil(width / 8);
	const byteIndex = y * bytesPerRow + (x >> 3);
	const mask = 0x80 >> (x & 7);
	data[byteIndex] |= mask;
}

export type CanvasTextOptions = {
	fontFamily?: string; // e.g. "DejaVu Sans Mono"
	fontSize?: number; // px
	fontWeight?: string; // e.g. "normal" | "bold"
	fontPathToRegister?: string; // optional .ttf to register
	letterSpacing?: number; // px extra spacing between glyphs
	thresholdAlpha?: number; // 0..255
	color?: string; // fill color
};

function makeFontString(opts: CanvasTextOptions): string {
	const weight = opts.fontWeight ?? "normal";
	const size = Math.max(1, Math.floor(opts.fontSize ?? 24));
	const family = opts.fontFamily ?? "sans-serif";
	return `${weight} ${size}px ${family}`;
}

export function measureCanvasText(text: string, opts: CanvasTextOptions = {}) {
	const canvas = createCanvas(1, 1);
	const ctx = canvas.getContext("2d");
	ctx.font = makeFontString(opts);
	ctx.textBaseline = "alphabetic";
	const m = ctx.measureText(text);
	const ascent = m.actualBoundingBoxAscent ?? (opts.fontSize ?? 24) * 0.8;
	const descent = m.actualBoundingBoxDescent ?? (opts.fontSize ?? 24) * 0.2;
	const width = Math.ceil(m.width + (opts.letterSpacing ?? 0) * Math.max(0, text.length - 1));
	const height = Math.ceil(ascent + descent);
	return { width, height, ascent, descent };
}

export function drawCanvasTextToBuffer(
	buffer: MonoBuffer,
	text: string,
	x: number,
	yTop: number,
	opts: CanvasTextOptions = {},
) {
	if (opts.fontPathToRegister && opts.fontFamily) {
		try {
			registerFont(opts.fontPathToRegister, { family: opts.fontFamily });
		} catch {
			// ignore double registration or missing path
		}
	}
	const { width: tw, height: th, ascent } = measureCanvasText(text, opts);
	const canvas = createCanvas(Math.max(1, tw), Math.max(1, th));
	const ctx = canvas.getContext("2d");
	ctx.font = makeFontString(opts);
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = opts.color ?? "#000";

	if (opts.letterSpacing && opts.letterSpacing !== 0) {
		let cursor = 0;
		for (const ch of text) {
			ctx.fillText(ch, cursor, ascent);
			const m = ctx.measureText(ch);
			cursor += m.width + opts.letterSpacing;
		}
	} else {
		ctx.fillText(text, 0, ascent);
	}

	const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const { data, width, height } = buffer;
	const aThresh = opts.thresholdAlpha ?? 64;
	for (let py = 0; py < img.height; py++) {
		for (let px = 0; px < img.width; px++) {
			const i = (py * img.width + px) * 4;
			const a = img.data[i + 3];
			if (a >= aThresh) {
				setPixelBlackPacked(data, width, height, x + px, yTop + py);
			}
		}
	}
	return { width: tw, height: th };
}


