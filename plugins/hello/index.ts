import type { Orientation, Plugin } from "../types";
import type { UserSettings, PluginRenderContext } from "@/plugins/types";
import { hashString } from "@lib/hash";

type HelloSettings = {
	message: string;
	orientation: Orientation;
};

function validate(value: unknown): value is HelloSettings {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<HelloSettings>;
	return typeof v.message === "string" && (v.orientation === "landscape" || v.orientation === "portrait");
}

function patternFromHash(hashHex: string, width: number, height: number): Uint8Array {
	const bytesPerRow = Math.ceil(width / 8);
	const out = new Uint8Array(bytesPerRow * height);
	// Используем хеш как генератор псевдослучайных битов
	const bytes = new Uint8Array(hashHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
	let idx = 0;
	for (let y = 0; y < height; y++) {
		for (let xByte = 0; xByte < bytesPerRow; xByte++) {
			const a = bytes[idx++ % bytes.length];
			const b = bytes[idx++ % bytes.length];
			const c = bytes[idx++ % bytes.length];
			const d = bytes[idx++ % bytes.length];
			// Смешиваем для разнообразия узора
			let byte = ((a ^ (b << 1)) + (c ^ (d << 2))) & 0xff;
			// Убираем "хвост" за пределами ширины
			const bitsInThisByte = Math.min(8, width - xByte * 8);
			if (bitsInThisByte < 8) {
				const mask = 0xff << (8 - bitsInThisByte);
				byte = byte & mask;
			}
			out[y * bytesPerRow + xByte] = byte;
		}
	}
	return out;
}

const hello: Plugin<HelloSettings> = {
	id: "hello",
	name: "Hello (пример)",
	outputSizes: [{ width: 800, height: 480 }, { width: 200, height: 480 }], // TRMNL и узкий блок 200x480
	defaultSettings: { message: "Hello, TRMNL!", orientation: "landscape" },
	validate,
	editor: async () => (await import("./Editor")).default,
	async render({ user, settings, width, height }: { user?: UserSettings; settings?: HelloSettings; context?: PluginRenderContext; width: number; height: number }) {
		// Ориентация влияет на "посев", но размер остается фиксированным для плагина
		const u = user ?? { name: "", age: 0 };
		const d = settings ?? hello.defaultSettings;
		const seed = `${u.name}:${d.message}:${u.age}:${d.orientation}`;
		const hashHex = hashString(seed);
		const data = patternFromHash(hashHex, width, height);
		return {
			width,
			height,
			data,
		};
	},
};

export default hello;


