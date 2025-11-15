import type { Orientation, Plugin } from "../types";
import type { UserSettings, PluginRenderContext } from "@/plugins/types";
import { drawCanvasTextToBuffer, measureCanvasText } from "@lib/canvasText";

type CalendarSettings = {
	orientation: Orientation;
	drawBorder: boolean;
	showMac: boolean;
	macHex?: string;
};

function validate(value: unknown): value is CalendarSettings {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<CalendarSettings>;
	const orientationOk = v.orientation === "landscape" || v.orientation === "portrait";
	return orientationOk !== false && typeof v.drawBorder === "boolean" && typeof v.showMac === "boolean";
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

function drawBorder(data: Uint8Array, width: number, height: number) {
	for (let x = 0; x < width; x++) {
		setPixelBlackPacked(data, width, height, x, 0);
		setPixelBlackPacked(data, width, height, x, height - 1);
	}
	for (let y = 0; y < height; y++) {
		setPixelBlackPacked(data, width, height, 0, y);
		setPixelBlackPacked(data, width, height, width - 1, y);
	}
}

function rotatePointForPortrait(x: number, y: number, width: number, height: number) {
	// В портретной ориентации поворот контента на 90° по часовой стрелке в рамках того же canvas
	// (вывод остаётся 800x480; контент упакован повернутым)
	const nx = height - 1 - y;
	const ny = x;
	return { x: nx, y: ny };
}

const calendar: Plugin<CalendarSettings> = {
	id: "calendar",
	name: "Calendar",
	outputSizes: [{ width: 800, height: 480 }],
	defaultSettings: { orientation: "landscape", drawBorder: true, showMac: true },
	validate,
	editor: async () => (await import("./Editor")).default,
	// Параметры пользователя и контекста не используются
	async render({ settings, width, height }: { user?: UserSettings; settings?: CalendarSettings; context?: PluginRenderContext; width: number; height: number }) {
		const d = settings ?? calendar.defaultSettings;
		const data = createMonochromeBuffer(width, height);

		// Фон — белый (массив уже заполнен нулями)
		if (d.drawBorder) {
			drawBorder(data, width, height);
		}

		// Дата YYYY-MM-DD
		const now = new Date();
		const yyyy = String(now.getFullYear());
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");
		const dateText = `${yyyy}-${mm}-${dd}`;

		// Подбор размеров для canvas-шрифта
		const margin = 8;
		const maxTextW = width - margin * 2;
		const maxTextH = height - margin * 2;
		let fontSize = Math.floor(height * 0.25);
		let dateOpts = { fontFamily: "monospace", fontSize, fontWeight: "normal", thresholdAlpha: 64 };
		let dm = measureCanvasText(dateText, dateOpts);
		while ((dm.width > maxTextW || dm.height > maxTextH) && fontSize > 8) {
			fontSize -= 2;
			dateOpts = { ...dateOpts, fontSize };
			dm = measureCanvasText(dateText, dateOpts);
		}
		const startX = Math.max(2, Math.floor((width - dm.width) / 2));
		const startY = Math.max(2, Math.floor((height - dm.height) / 2));

		if (d.orientation === "portrait") {
			// Рендер в temp-буфер и поворот пикселей
			const temp = createMonochromeBuffer(width, height);
			drawCanvasTextToBuffer({ data: temp, width, height }, dateText, startX, startY, dateOpts);
			const bytesPerRow = Math.ceil(width / 8);
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const byteIndex = y * bytesPerRow + (x >> 3);
					const mask = 0x80 >> (x & 7);
					if ((temp[byteIndex] & mask) === 0) continue;
					const p = rotatePointForPortrait(x, y, width, height);
					setPixelBlackPacked(data, width, height, p.x, p.y);
				}
			}
		} else {
			// Обычный landscape
			drawCanvasTextToBuffer({ data, width, height }, dateText, startX, startY, dateOpts);
		}

		// MAC снизу по центру (если доступен)
		if (d.showMac && d.macHex && d.macHex.length === 12) {
			const groups = d.macHex.match(/.{1,2}/g) as string[];
			const macText = groups.join("-");
			let macFont = Math.max(8, Math.floor(height * 0.04));
			let macOpts = { fontFamily: "monospace", fontSize: macFont, fontWeight: "normal", thresholdAlpha: 64 };
			let mm = measureCanvasText(macText, macOpts);
			while (mm.width > maxTextW && macFont > 6) {
				macFont -= 1;
				macOpts = { ...macOpts, fontSize: macFont };
				mm = measureCanvasText(macText, macOpts);
			}
			const macX = Math.max(2, Math.floor((width - mm.width) / 2));
			const macY = Math.max(2, height - mm.height - 8);

			if (d.orientation === "portrait") {
				const temp = createMonochromeBuffer(width, height);
				drawCanvasTextToBuffer({ data: temp, width, height }, macText, macX, macY, macOpts);
				const bytesPerRow = Math.ceil(width / 8);
				for (let y = 0; y < height; y++) {
					for (let x = 0; x < width; x++) {
						const byteIndex = y * bytesPerRow + (x >> 3);
						const mask = 0x80 >> (x & 7);
						if ((temp[byteIndex] & mask) === 0) continue;
						const p = rotatePointForPortrait(x, y, width, height);
						setPixelBlackPacked(data, width, height, p.x, p.y);
					}
				}
			} else {
				drawCanvasTextToBuffer({ data, width, height }, macText, macX, macY, macOpts);
			}
		}

		return { width, height, data };
	},
};

export default calendar;


