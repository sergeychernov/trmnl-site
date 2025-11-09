import type { Orientation, Plugin } from "../types";
import type { UserSettings } from "@/lib/settings";

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

// 5x7 моноширинный шрифт (цифры и дефис)
const FONT_5x7: Record<string, number[]> = {
	"0": [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
	"1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
	"2": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
	"3": [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
	"4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
	"5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
	"6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
	"7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
	"8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
	"9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
	"A": [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
	"B": [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
	"C": [0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111],
	"D": [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
	"E": [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
	"F": [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
	"-": [0b00000, 0b00000, 0b00000, 0b01110, 0b00000, 0b00000, 0b00000],
	" ": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
};

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

function drawGlyph(
	data: Uint8Array,
	width: number,
	height: number,
	glyph: number[],
	x: number,
	yTop: number,
	scale: number,
) {
	const glyphHeight = 7;
	const glyphWidth = 5;
	for (let gy = 0; gy < glyphHeight; gy++) {
		const rowBits = glyph[gy] ?? 0;
		for (let gx = 0; gx < glyphWidth; gx++) {
			const bitOn = (rowBits & (1 << (glyphWidth - 1 - gx))) !== 0;
			if (!bitOn) continue;
			for (let sy = 0; sy < scale; sy++) {
				for (let sx = 0; sx < scale; sx++) {
					setPixelBlackPacked(data, width, height, x + gx * scale + sx, yTop + gy * scale + sy);
				}
			}
		}
	}
}

function drawText(
	data: Uint8Array,
	width: number,
	height: number,
	text: string,
	x: number,
	yTop: number,
	scale: number,
) {
	const glyphAdvance = 5 * scale;
	const letterSpacing = scale;
	let cursorX = x;
	for (const ch of text) {
		const g = FONT_5x7[ch] ?? FONT_5x7[" "];
		drawGlyph(data, width, height, g, cursorX, yTop, scale);
		cursorX += glyphAdvance + letterSpacing;
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
	outputSize: { width: 800, height: 480 },
	defaultSettings: { orientation: "landscape", drawBorder: true, showMac: true },
	validate,
	async render(_user: UserSettings, device: CalendarSettings, _ctx: { deviceId: string | null; baseUrl: string }) {
		const width = calendar.outputSize.width;
		const height = calendar.outputSize.height;
		const data = createMonochromeBuffer(width, height);

		// Фон — белый (массив уже заполнен нулями)
		if (device.drawBorder) {
			drawBorder(data, width, height);
		}

		// Дата YYYY-MM-DD
		const now = new Date();
		const yyyy = String(now.getFullYear());
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");
		const dateText = `${yyyy}-${mm}-${dd}`;

		// Рассчёт в landscape, с возможным маппингом координат под portrait
		const scale = 6; // 5x7 -> 30x42
		const glyphAdvance = 5 * scale + scale;
		const textWidth = dateText.length * glyphAdvance - scale;
		const textHeight = 7 * scale;
		const startX = Math.max(2, Math.floor((width - textWidth) / 2));
		const startY = Math.max(2, Math.floor((height - textHeight) / 2));

		if (device.orientation === "portrait") {
			// Рисуем в портретном виде: маппим каждую точку
			// Рендерим по символу, но пиксели ставим с поворотом
			let cursorX = startX;
			const text = dateText;
			for (const ch of text) {
				const g = FONT_5x7[ch] ?? FONT_5x7[" "];
				for (let gy = 0; gy < 7; gy++) {
					const rowBits = g[gy] ?? 0;
					for (let gx = 0; gx < 5; gx++) {
						const bitOn = (rowBits & (1 << (5 - 1 - gx))) !== 0;
						if (!bitOn) continue;
						for (let sy = 0; sy < scale; sy++) {
							for (let sx = 0; sx < scale; sx++) {
								const x = cursorX + gx * scale + sx;
								const y = startY + gy * scale + sy;
								const p = rotatePointForPortrait(x, y, width, height);
								setPixelBlackPacked(data, width, height, p.x, p.y);
							}
						}
					}
				}
				cursorX += glyphAdvance;
			}
		} else {
			// Обычный landscape
			drawText(data, width, height, dateText, startX, startY, scale);
		}

		// MAC снизу по центру (если доступен)
		if (device.showMac && device.macHex && device.macHex.length === 12) {
			const groups = device.macHex.match(/.{1,2}/g) as string[];
			const macText = groups.join("-");
			const macScale = 4;
			const macAdvance = 5 * macScale + macScale;
			const macWidth = macText.length * macAdvance - macScale;
			const macHeight = 7 * macScale;
			const macX = Math.max(2, Math.floor((width - macWidth) / 2));
			const macY = Math.max(2, height - macHeight - 8);

			if (device.orientation === "portrait") {
				let cursorX = macX;
				for (const ch of macText) {
					const g = FONT_5x7[ch] ?? FONT_5x7[" "];
					for (let gy = 0; gy < 7; gy++) {
						const rowBits = g[gy] ?? 0;
						for (let gx = 0; gx < 5; gx++) {
							const bitOn = (rowBits & (1 << (5 - 1 - gx))) !== 0;
							if (!bitOn) continue;
							for (let sy = 0; sy < macScale; sy++) {
								for (let sx = 0; sx < macScale; sx++) {
                                    const x = cursorX + gx * macScale + sx;
                                    const y = macY + gy * macScale + sy;
                                    const p = rotatePointForPortrait(x, y, width, height);
                                    setPixelBlackPacked(data, width, height, p.x, p.y);
								}
							}
						}
					}
					cursorX += macAdvance;
				}
			} else {
				drawText(data, width, height, macText, macX, macY, macScale);
			}
		}

		return { width, height, data };
	},
};

export default calendar;


