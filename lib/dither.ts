import { createCanvas, loadImage } from "canvas";

// 0 = белый, 255 = чёрный для внутренних расчётов (интуитивнее для 1bpp)
function rgbaToLumaBlackOnWhite(r: number, g: number, b: number, a: number, gamma = 1.8): number {
	if (a <= 0) return 0; // полностью прозрачно => белый
	// стандартная luma (sRGB), затем инвертируем под «чёрный на белом»
	const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0..255 (белый 255)
	const inv = 255 - luma; // 0..255 где 0=белый, 255=чёрный
	// гамма-коррекция для лучшего поведения тонких штрихов
	const corrected = Math.pow(inv / 255, 1 / gamma) * 255;
	return corrected;
}

export function atkinsonDitherToPackedGray(gray: Float32Array | Uint8Array, width: number, height: number): Uint8Array {
	// Вход: 0..255, где 0=белый, 255=чёрный
	// Выход: packed, 1=чёрный бит
	const g = new Float32Array(gray.length);
	for (let i = 0; i < gray.length; i++) g[i] = gray[i];
	const packedBytesPerRow = Math.ceil(width / 8);
	const out = new Uint8Array(packedBytesPerRow * height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			const old = g[i];
			const newV = old < 128 ? 0 : 255;
			const err = old - newV;
			if (newV === 255) {
				// чёрный пиксель -> ставим bit=1
				const byteIndex = y * packedBytesPerRow + (x >> 3);
				out[byteIndex] |= (0x80 >> (x & 7));
			}
			const spread = err / 8;
			// распределение ошибки (Atkinson):
			// (x+1,y), (x+2,y), (x-1,y+1), (x,y+1), (x+1,y+1), (x,y+2)
			const add = (xx: number, yy: number) => {
				if (xx >= 0 && xx < width && yy >= 0 && yy < height) {
					g[yy * width + xx] += spread;
				}
			};
			add(x + 1, y);
			add(x + 2, y);
			add(x - 1, y + 1);
			add(x, y + 1);
			add(x + 1, y + 1);
			add(x, y + 2);
		}
	}
	return out;
}

export async function pngBufferToPacked1bppAtkinson(
	pngBuffer: Buffer,
	targetWidth: number,
	targetHeight: number,
	options: { downscaleFrom?: { width: number; height: number }; gamma?: number } = {},
): Promise<Uint8Array> {
	const gamma = options.gamma ?? 1.8;
	// Загружаем PNG и масштабируем в нужный размер node-canvas'ом
	const img = await loadImage(pngBuffer);
	const canvas = createCanvas(targetWidth, targetHeight);
	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = true;
	// node-canvas типы могут не содержать imageSmoothingQuality — выставляем опционально
	if ((ctx as unknown as { imageSmoothingQuality?: "low" | "medium" | "high" }).imageSmoothingQuality !== undefined) {
		(ctx as unknown as { imageSmoothingQuality?: "low" | "medium" | "high" }).imageSmoothingQuality = "high";
	}
	ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
	const { data } = ctx.getImageData(0, 0, targetWidth, targetHeight);
	const gray = new Float32Array(targetWidth * targetHeight);
	for (let y = 0; y < targetHeight; y++) {
		for (let x = 0; x < targetWidth; x++) {
			const idx = (y * targetWidth + x) * 4;
			const r = data[idx + 0];
			const g = data[idx + 1];
			const b = data[idx + 2];
			const a = data[idx + 3];
			gray[y * targetWidth + x] = rgbaToLumaBlackOnWhite(r, g, b, a, gamma);
		}
	}
	return atkinsonDitherToPackedGray(gray, targetWidth, targetHeight);
}


