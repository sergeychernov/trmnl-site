import type { Orientation, Plugin } from "../types";
import type { UserSettings } from "@/lib/settings";
import { drawCanvasTextToBuffer, measureCanvasText } from "@lib/canvasText";

type SymbolsSettings = {
	orientation: Orientation;
};

function validate(value: unknown): value is SymbolsSettings {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<SymbolsSettings>;
	return v.orientation === "landscape" || v.orientation === "portrait";
}

function createMonochromeBuffer(width: number, height: number): Uint8Array {
	const bytesPerRow = Math.ceil(width / 8);
	return new Uint8Array(bytesPerRow * height);
}

// локальные пиксельные утилиты не нужны — используем drawText из @lib

const symbols: Plugin<SymbolsSettings> = {
	id: "supported-symbols",
	name: "Поддерживаемые символы",
	outputSize: { width: 800, height: 480 },
	defaultSettings: { orientation: "landscape" },
	validate,
	async render(_user: UserSettings, device: SymbolsSettings, _ctx: { deviceId: string | null; baseUrl: string }) {
		const width = symbols.outputSize.width;
		const height = symbols.outputSize.height;
		const data = createMonochromeBuffer(width, height);

		const scale = 24; // px

		// Формируем строки для вывода (портретный режим не используем)
		const rows = [
			"0123456789",
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
			"abcdefghijklmnopqrstuvwxyz",
			"АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
			"абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
			".,:;!?-—_()[]{}\"'\\/+*=<>@#%&^$|~`",
			"Hello, world!",
			"Привет, мир!",
		];
		const fontOpts = { fontFamily: "sans-serif", fontSize: scale, fontWeight: "normal", thresholdAlpha: 64 };
		const measurements = rows.map((t) => measureCanvasText(t, fontOpts));
		const rowHeight = measurements[0].height;
		const lineGap = Math.round(scale * 0.5);
		const totalHeight = rows.length * rowHeight + (rows.length - 1) * lineGap;
		let y = Math.max(0, Math.floor((height - totalHeight) / 2));
		for (let i = 0; i < rows.length; i++) {
			const text = rows[i];
			const { width: w } = measurements[i];
			const x = Math.max(0, Math.floor((width - w) / 2));
			drawCanvasTextToBuffer({ data, width, height }, text, x, y, fontOpts);
			y += rowHeight + lineGap;
		}

		return { width, height, data };
	},
};

export default symbols;


