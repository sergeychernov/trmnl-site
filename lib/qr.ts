import { create as createQr } from "qrcode";
import React from "react";

export type QrMatrix = {
	size: number;
	isDark: (index: number) => boolean;
};

export function createQrMatrix(text: string, errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M"): QrMatrix {
	type QRModel = { modules: { size: number; data: Uint8Array | boolean[] } };
	const qr = createQr(text, { errorCorrectionLevel }) as unknown as QRModel;
	const size = qr.modules.size;
	const modules = qr.modules.data as Uint8Array | boolean[];
	const isDark = (idx: number): boolean =>
		Array.isArray(modules) ? Boolean((modules as boolean[])[idx]) : (modules as Uint8Array)[idx] !== 0;
	return { size, isDark };
}

export function computeQrLayout(
	canvasWidth: number,
	canvasHeight: number,
	matrixSize: number,
	marginModules = 4,
): { scale: number; offsetX: number; offsetY: number; drawSizePx: number; totalModules: number } {
	const totalModules = matrixSize + marginModules * 2;
	const scaleX = Math.floor(canvasWidth / totalModules);
	const scaleY = Math.floor(canvasHeight / totalModules);
	const scale = Math.max(1, Math.min(scaleX, scaleY));
	const drawSizePx = totalModules * scale;
	const offsetX = Math.floor((canvasWidth - drawSizePx) / 2) + marginModules * scale;
	const offsetY = Math.floor((canvasHeight - drawSizePx) / 2) + marginModules * scale;
	return { scale, offsetX, offsetY, drawSizePx, totalModules };
}

export type PackedBuffer = { data: Uint8Array; width: number; height: number };

function setPixelBlackPacked(buf: PackedBuffer, x: number, y: number) {
	if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
	const bytesPerRow = Math.ceil(buf.width / 8);
	const byteIndex = y * bytesPerRow + (x >> 3);
	const mask = 0x80 >> (x & 7);
	buf.data[byteIndex] |= mask;
}

export function drawQrPacked(
	buffer: PackedBuffer,
	matrix: QrMatrix,
	layout: { scale: number; offsetX: number; offsetY: number },
	putPixel: (x: number, y: number) => void = (x, y) => setPixelBlackPacked(buffer, x, y),
) {
	const { size, isDark } = matrix;
	const { scale, offsetX, offsetY } = layout;
	for (let my = 0; my < size; my++) {
		for (let mx = 0; mx < size; mx++) {
			if (!isDark(my * size + mx)) continue;
			const startX = offsetX + mx * scale;
			const startY = offsetY + my * scale;
			for (let sy = 0; sy < scale; sy++) {
				for (let sx = 0; sx < scale; sx++) {
					putPixel(startX + sx, startY + sy);
				}
			}
		}
	}
}

// Упрощённый помощник: сгенерировать матрицу и сразу нарисовать в packed-буфер
export function drawQrTextToPackedBuffer(
	buffer: PackedBuffer,
	text: string,
	options?: { marginModules?: number; errorCorrectionLevel?: "L" | "M" | "Q" | "H" },
) {
	const matrix = createQrMatrix(text, options?.errorCorrectionLevel ?? "M");
	const layout = computeQrLayout(buffer.width, buffer.height, matrix.size, options?.marginModules ?? 4);
	drawQrPacked(buffer, matrix, layout);
	return { matrix, layout };
}

// Генерация React элементов для QR-кода в SVG формате
export function createQrSvgElements(
	text: string,
	size: number,
	options?: {
		marginModules?: number;
		errorCorrectionLevel?: "L" | "M" | "Q" | "H";
		fgColor?: string;
		bgColor?: string;
	},
): { elements: React.ReactNode[]; svgSize: number } {
	const matrix = createQrMatrix(text, options?.errorCorrectionLevel ?? "M");
	const marginModules = options?.marginModules ?? 4;
	const totalModules = matrix.size + marginModules * 2;
	const moduleSize = Math.max(1, Math.floor(size / totalModules));
	const qrDrawSize = totalModules * moduleSize;
	const qrOffsetX = Math.floor((size - qrDrawSize) / 2) + marginModules * moduleSize;
	const qrOffsetY = Math.floor((size - qrDrawSize) / 2) + marginModules * moduleSize;

	const fgColor = options?.fgColor ?? "#000000";
	const bgColor = options?.bgColor ?? "#FFFFFF";

	const elements: React.ReactNode[] = [
		React.createElement("rect", {
			key: "bg",
			x: 0,
			y: 0,
			width: size,
			height: size,
			fill: bgColor,
		}),
	];

	for (let y = 0; y < matrix.size; y++) {
		for (let x = 0; x < matrix.size; x++) {
			if (matrix.isDark(y * matrix.size + x)) {
				elements.push(
					React.createElement("rect", {
						key: `qr-${x}-${y}`,
						x: qrOffsetX + x * moduleSize,
						y: qrOffsetY + y * moduleSize,
						width: moduleSize,
						height: moduleSize,
						fill: fgColor,
					}),
				);
			}
		}
	}

	return { elements, svgSize: size };
}


