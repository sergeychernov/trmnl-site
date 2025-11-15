import type { Orientation, Plugin } from "../types";
import type { UserSettings, PluginRenderContext } from "@/plugins/types";
import { createQrMatrix, computeQrLayout, drawQrPacked } from "@/lib/qr";

type RegistrationSettings = {
	orientation: Orientation;
	marginModules?: number; // белая окантовка в модулях QR (по умолчанию 4)
};

function validate(value: unknown): value is RegistrationSettings {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<RegistrationSettings>;
	const orientationOk = v.orientation === "landscape" || v.orientation === "portrait";
	return orientationOk !== false;
}

function createMonochromeBuffer(width: number, height: number): Uint8Array {
	const bytesPerRow = Math.ceil(width / 8);
	return new Uint8Array(bytesPerRow * height);
}

function setPixelBlackPacked(data: Uint8Array, width: number, height: number, x: number, y: number) {
	if (x < 0 || x >= width || y < 0 || y >= height) return;
	const bytesPerRow = Math.ceil(width / 8);
	const byteIndex = y * bytesPerRow + (x >> 3);
	const mask = 0x80 >> (x & 7);
	data[byteIndex] |= mask;
}

function rotatePointForPortrait(x: number, y: number, width: number, height: number) {
	// 90° CW в пределах 800x480 canvas
	const nx = height - 1 - y;
	const ny = x;
	return { x: nx, y: ny };
}

const registration: Plugin<RegistrationSettings> = {
	id: "registration",
	name: "Registration QR",
	outputSizes: [{ width: 800, height: 480 }],
	defaultSettings: {
		orientation: "landscape",
		marginModules: 4,
	},
	validate,
	editor: async () => (await import("./Editor")).default,
	async render({ settings, context, width, height }: { user?: UserSettings; settings?: RegistrationSettings; context?: PluginRenderContext; width: number; height: number }) {
		const d = settings ?? registration.defaultSettings;
		const data = createMonochromeBuffer(width, height);

		// Формируем ссылку: {baseUrl}/settings/{deviceId}
		const base = (context?.baseUrl || "").replace(/\/+$/, "");
		const idPath = context?.deviceId ? `/${context.deviceId}` : "";
		const url = `${base}/settings${idPath}`;

		// Генерация QR матрицы
		const matrix = createQrMatrix(url, "M");
		const size = matrix.size;

		// Рассчитываем масштаб (квадрат наибольшего размера, центрируем)
		const marginModules = typeof d.marginModules === "number" ? Math.max(0, d.marginModules) : 4;
		const { scale, offsetX, offsetY } = computeQrLayout(width, height, size, marginModules);

		const putPixel = (x: number, y: number) => {
			if (d.orientation === "portrait") {
				const p = rotatePointForPortrait(x, y, width, height);
				setPixelBlackPacked(data, width, height, p.x, p.y);
			} else {
				setPixelBlackPacked(data, width, height, x, y);
			}
		};

		// Рисуем QR модули, учитывая ориентацию
		drawQrPacked(
			{ data, width, height },
			matrix,
			{ scale, offsetX, offsetY },
			(x, y) => putPixel(x, y),
		);

		return { width, height, data };
	},
};

export default registration;


