import type { Orientation, Plugin } from "../types";
import type { UserSettings } from "@/lib/settings";
import { create as createQr } from "qrcode";

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
	outputSize: { width: 800, height: 480 },
	defaultSettings: {
		orientation: "landscape",
		marginModules: 4,
	},
	validate,
	async render(_user: UserSettings, device: RegistrationSettings, ctx: { deviceId: string | null; baseUrl: string }) {
		const width = registration.outputSize.width;
		const height = registration.outputSize.height;
		const data = createMonochromeBuffer(width, height);

		// Формируем ссылку: {baseUrl}/settings/{deviceId}
		const base = (ctx.baseUrl || "").replace(/\/+$/, "");
		const idPath = ctx.deviceId ? `/${ctx.deviceId}` : "";
		const url = `${base}/settings${idPath}`;

		// Генерация QR матрицы
		type QRModel = { modules: { size: number; data: Uint8Array | boolean[] } };
		const qr = createQr(url, { errorCorrectionLevel: "M" }) as unknown as QRModel;
		const size = qr.modules.size;
		const modules = qr.modules.data as Uint8Array | boolean[];
		const getModuleDark = (idx: number): boolean =>
			Array.isArray(modules) ? Boolean((modules as boolean[])[idx]) : (modules as Uint8Array)[idx] !== 0;

		// Рассчитываем масштаб (квадрат наибольшего размера, центрируем)
		const marginModules = typeof device.marginModules === "number" ? Math.max(0, device.marginModules) : 4;
		const totalModules = size + marginModules * 2;
		const scaleX = Math.floor(width / totalModules);
		const scaleY = Math.floor(height / totalModules);
		const scale = Math.max(1, Math.min(scaleX, scaleY));
		const drawSizePx = totalModules * scale;
		const offsetX = Math.floor((width - drawSizePx) / 2) + marginModules * scale;
		const offsetY = Math.floor((height - drawSizePx) / 2) + marginModules * scale;

		const putPixel = (x: number, y: number) => {
			if (device.orientation === "portrait") {
				const p = rotatePointForPortrait(x, y, width, height);
				setPixelBlackPacked(data, width, height, p.x, p.y);
			} else {
				setPixelBlackPacked(data, width, height, x, y);
			}
		};

		// Рисуем QR модули
		for (let my = 0; my < size; my++) {
			for (let mx = 0; mx < size; mx++) {
				const isDark = getModuleDark(my * size + mx);
				if (!isDark) continue;
				const startX = offsetX + mx * scale;
				const startY = offsetY + my * scale;
				for (let sy = 0; sy < scale; sy++) {
					for (let sx = 0; sx < scale; sx++) {
						putPixel(startX + sx, startY + sy);
					}
				}
			}
		}

		return { width, height, data };
	},
};

export default registration;


