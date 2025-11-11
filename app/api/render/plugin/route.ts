import { NextResponse } from "next/server";
import { getPlugin } from "@/plugins";
import type { UserSettings } from "@/lib/settings";
import { hashMacAddress } from "@lib/hash";
import { getBaseUrl } from "@lib/persers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Универсальный рендер BMP 1bpp для произвольного плагина (?plugin=id)
export async function GET(request: Request) {
	const url = new URL(request.url);
	const pluginId = url.searchParams.get("plugin") || url.searchParams.get("id");
	if (!pluginId) {
		return NextResponse.json({ error: "missing plugin parameter" }, { status: 400 });
	}

	const invertBits = url.searchParams.get("invert") === "1" || url.searchParams.get("invert") === "true";
	const rotate = url.searchParams.get("rotate") === "180" ? 180 : 0;
	const topDown = url.searchParams.get("topdown") === "1" || url.searchParams.get("topdown") === "true";
	const orientationParam = url.searchParams.get("orientation") === "portrait" ? "portrait" : "landscape";

	// MAC из ?id= или заголовка ID — нужен для некоторых плагинов (например, calendar.showMac)
	const idParam = url.searchParams.get("id")?.toUpperCase() ?? "";
	const idHeader = request.headers.get("ID")?.toUpperCase() ?? "";
	const macRaw = idParam || idHeader;
	const macHex = macRaw.replace(/[^A-F0-9]/g, "").slice(0, 12);
	const deviceId = macHex ? await hashMacAddress(macHex) : null;

	const plugin = getPlugin(pluginId);
	if (!plugin) {
		return NextResponse.json({ error: "plugin not found" }, { status: 404 });
	}

	const user: UserSettings = { name: "", age: 0 };
	const origin = getBaseUrl(request);

	// Базируемся на defaultSettings и мягко применяем overrides из query (минимально-универсально)
	const deviceSettings: Record<string, unknown> = { ...(plugin.defaultSettings as Record<string, unknown>) };
	// Общий override ориентации, если поддерживается плагином
	if ("orientation" in deviceSettings) {
		deviceSettings.orientation = orientationParam;
	}
	// Специфичная помощь для calendar (показывать MAC, если есть)
	if (plugin.id === "calendar" && macHex.length === 12) {
		deviceSettings.macHex = macHex;
		if (typeof deviceSettings.showMac !== "boolean") {
			deviceSettings.showMac = true;
		}
	}

	const pluginTyped = plugin as import("@/plugins").Plugin<Record<string, unknown>>;
	const context = { deviceId, baseUrl: origin };
	const image = await pluginTyped.render(user, deviceSettings, context);

	const width = image.width;
	const height = image.height;
	const bitsPerPixel = 1;

	const rowSizeBytes = Math.ceil((width * bitsPerPixel) / 32) * 4;
	const pixelDataSize = rowSizeBytes * height;

	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const colorTableSize = 8;
	const pixelDataOffset = fileHeaderSize + infoHeaderSize + colorTableSize;
	const fileSize = pixelDataOffset + pixelDataSize;

	const buffer = new ArrayBuffer(fileSize);
	const view = new DataView(buffer);
	let offset = 0;

	// BITMAPFILEHEADER
	view.setUint8(offset++, 0x42);
	view.setUint8(offset++, 0x4d);
	view.setUint32(offset, fileSize, true);
	offset += 4;
	view.setUint16(offset, 0, true);
	offset += 2;
	view.setUint16(offset, 0, true);
	offset += 2;
	view.setUint32(offset, pixelDataOffset, true);
	offset += 4;

	// BITMAPINFOHEADER
	view.setUint32(offset, infoHeaderSize, true);
	offset += 4;
	view.setInt32(offset, width, true);
	offset += 4;
	const biHeight = topDown ? -height : height;
	view.setInt32(offset, biHeight, true);
	offset += 4;
	view.setUint16(offset, 1, true);
	offset += 2;
	view.setUint16(offset, bitsPerPixel, true);
	offset += 2;
	view.setUint32(offset, 0, true);
	offset += 4;
	view.setUint32(offset, pixelDataSize, true);
	offset += 4;
	view.setInt32(offset, 2835, true);
	offset += 4;
	view.setInt32(offset, 2835, true);
	offset += 4;
	view.setUint32(offset, 2, true);
	offset += 4;
	view.setUint32(offset, 2, true);
	offset += 4;

	// Палитра (2 цвета, BGRA)
	view.setUint8(offset++, 0xff);
	view.setUint8(offset++, 0xff);
	view.setUint8(offset++, 0xff);
	view.setUint8(offset++, 0x00);
	view.setUint8(offset++, 0x00);
	view.setUint8(offset++, 0x00);
	view.setUint8(offset++, 0x00);
	view.setUint8(offset++, 0x00);

	// Пиксели
	const bytes = new Uint8Array(buffer);
	const startPixelData = pixelDataOffset;
	bytes.fill(0x00, startPixelData, startPixelData + pixelDataSize);

	const mapXY = (x: number, y: number) => {
		if (rotate === 180) {
			return { mx: width - 1 - x, my: height - 1 - y };
		}
		return { mx: x, my: y };
	};
	const setPixelBlack = (x: number, yTop: number) => {
		if (x < 0 || x >= width || yTop < 0 || yTop >= height) return;
		const { mx, my } = mapXY(x, yTop);
		const rowIndex = topDown ? my : height - 1 - my;
		const rowOffset = startPixelData + rowIndex * rowSizeBytes;
		const byteIndex = rowOffset + (mx >> 3);
		const mask = 0x80 >> (mx & 7);
		bytes[byteIndex] |= mask;
	};

	const bytesPerRowPacked = Math.ceil(width / 8);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const packedIndex = y * bytesPerRowPacked + (x >> 3);
			const bit = (image.data[packedIndex] >> (7 - (x & 7))) & 1;
			if (bit === 1) {
				setPixelBlack(x, y);
			}
		}
	}

	if (invertBits) {
		for (let i = startPixelData; i < startPixelData + pixelDataSize; i++) {
			bytes[i] ^= 0xff;
		}
	}

	return new NextResponse(bytes, {
		headers: {
			"Content-Type": "image/bmp",
			"Content-Length": String(fileSize),
			"Cache-Control": "no-cache",
		},
	});
}


