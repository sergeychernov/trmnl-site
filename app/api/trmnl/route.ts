import { NextResponse } from "next/server";
import { getPlugin } from "@/plugins";
import type { Settings, UserSettings } from "@/lib/settings";
import { getDb } from "@/lib/mongodb";
import { hashMacAddress } from "@lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl(request: Request): string {
	const envOverride = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
	if (envOverride) {
		return envOverride.replace(/\/+$/, "");
	}
	const headers = request.headers;
	const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
	const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
	const vercelHost = headers.get("x-vercel-deployment-url")?.trim();
	const host = forwardedHost || vercelHost || headers.get("host") || "";
	let protocol = forwardedProto || (vercelHost ? "https" : "");
	if (!protocol) {
		try {
			protocol = new URL(request.url).protocol.replace(":", "");
		} catch {
			protocol = "https";
		}
	}
	if (!host) {
		try {
			return new URL(request.url).origin;
		} catch {
			return `${protocol}://localhost`;
		}
	}
	if (host.includes("://")) {
		return host.replace(/\/+$/, "");
	}
	return `${protocol}://${host}`.replace(/\/+$/, "");
}

// Возвращает монохромный BMP 800x480 (1 бит на пиксель) для Seed Studio TRMNL.
// Палитра: индекс 0 — белый, индекс 1 — чёрный. Контент генерирует плагин.
export async function GET(request: Request) {
	// Параметры совместимости:
	// - invert=1  -> инвертировать биты (чёрное/белое)
	// - rotate=180 -> повернуть содержимое на 180° (размеры остаются 800x480)
	// - topdown=1 -> записывать BMP в top-down (biHeight < 0)
	const url = new URL(request.url);
	const invertBits = url.searchParams.get("invert") === "1" || url.searchParams.get("invert") === "true";
	const rotate = url.searchParams.get("rotate") === "180" ? 180 : 0;
	const topDown = url.searchParams.get("topdown") === "1" || url.searchParams.get("topdown") === "true";
	const orientationParam = url.searchParams.get("orientation") === "portrait" ? "portrait" : "landscape";
	// Идентификатор устройства: в запросе к изображению заголовок ID обычно НЕ приходит,
	// поэтому читаем также query `id` (ожидается 12 HEX, без двоеточий).
	const idParam = url.searchParams.get("id")?.toUpperCase() ?? "";
	const idHeader = request.headers.get("ID")?.toUpperCase() ?? "";
	const macRaw = idParam || idHeader;
	const macHex = macRaw.replace(/[^A-F0-9]/g, "").slice(0, 12);

	// Обеспечиваем наличие коллекции settings и проверяем запись для устройства по id = hash(MAC)
	const db = await getDb();
	const collections = await db.listCollections({ name: "settings" }, { nameOnly: true }).toArray();
	if (collections.length === 0) {
		await db.createCollection("settings");
	}
	const deviceId = macHex ? await hashMacAddress(macHex) : null;
	const settingsCol = db.collection<Settings & { _id: string }>("settings");
	const settingsDoc = deviceId ? await settingsCol.findOne({ _id: deviceId }) : null;

	// Выбираем плагин: если нет настроек — показываем registration (QR на страницу настроек),
	// иначе берём плагин из settings.device.pluginId
	const useRegistration = !settingsDoc;
	const selectedPluginId = useRegistration ? "registration" : settingsDoc.device.pluginId;
	const plugin = getPlugin(selectedPluginId);
	if (!plugin) {
		return NextResponse.json({ error: "plugin not found" }, { status: 500 });
	}
	const user: UserSettings = { name: "", age: 0 };
	const origin = getBaseUrl(request);
	let deviceSettings: Record<string, unknown>;
	if (useRegistration) {
		deviceSettings = {
			orientation: orientationParam,
			baseUrl: origin,
			idHex: deviceId ?? undefined,
			marginModules: 4,
		};
	} else {
		// Берём сохранённые настройки плагина из БД
		const saved = (settingsDoc?.device?.pluginSettings as Record<string, unknown> | undefined) ?? {};
		// Для calendar добавим текущий macHex, если он есть и не задан
		if (selectedPluginId === "calendar" && macHex.length === 12 && saved.macHex == null) {
			saved.macHex = macHex;
		}
		// Позволим переопределить ориентацию через query-параметр
		deviceSettings = { ...saved, orientation: saved.orientation ?? orientationParam };
	}
	const pluginTyped = plugin as import("@/plugins").Plugin<Record<string, unknown>>;
	const context = { deviceId, baseUrl: origin };
	const image = await pluginTyped.render(user, deviceSettings, context);

	// Геометрия из результата плагина
	const width = image.width;
	const height = image.height;
	const bitsPerPixel = 1; // 1bpp, монохром
	// Локальная отладка (раскомментировать при необходимости)
	// console.log(request.headers);
	// console.log(url.searchParams);

	// Размер строки в байтах: выровнено к 4 байтам
	const rowSizeBytes = Math.ceil((width * bitsPerPixel) / 32) * 4; // формула BMP
	const pixelDataSize = rowSizeBytes * height;

	// Заголовки: 14 (BITMAPFILEHEADER) + 40 (BITMAPINFOHEADER) + 8 (2 записи палитры по 4 байта)
	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const colorTableSize = 8; // 2 * 4
	const pixelDataOffset = fileHeaderSize + infoHeaderSize + colorTableSize;
	const fileSize = pixelDataOffset + pixelDataSize;

	// Буфер файла BMP
	const buffer = new ArrayBuffer(fileSize);
	const view = new DataView(buffer);
	let offset = 0;

	// --- BITMAPFILEHEADER (14 байт) ---
	// bfType 'BM'
	view.setUint8(offset++, 0x42);
	view.setUint8(offset++, 0x4d);
	// bfSize
	view.setUint32(offset, fileSize, true);
	offset += 4;
	// bfReserved1, bfReserved2
	view.setUint16(offset, 0, true);
	offset += 2;
	view.setUint16(offset, 0, true);
	offset += 2;
	// bfOffBits
	view.setUint32(offset, pixelDataOffset, true);
	offset += 4;

	// --- BITMAPINFOHEADER (40 байт) ---
	view.setUint32(offset, infoHeaderSize, true); // biSize
	offset += 4;
	view.setInt32(offset, width, true); // biWidth
	offset += 4;
	const biHeight = topDown ? -height : height; // отрицательный — top-down
	view.setInt32(offset, biHeight, true); // biHeight
	offset += 4;
	view.setUint16(offset, 1, true); // biPlanes
	offset += 2;
	view.setUint16(offset, bitsPerPixel, true); // biBitCount
	offset += 2;
	view.setUint32(offset, 0, true); // biCompression = BI_RGB
	offset += 4;
	view.setUint32(offset, pixelDataSize, true); // biSizeImage
	offset += 4;
	// 72 DPI ≈ 2835 пикселей/метр
	view.setInt32(offset, 2835, true); // biXPelsPerMeter
	offset += 4;
	view.setInt32(offset, 2835, true); // biYPelsPerMeter
	offset += 4;
	view.setUint32(offset, 2, true); // biClrUsed (2 цвета)
	offset += 4;
	view.setUint32(offset, 2, true); // biClrImportant
	offset += 4;

	// --- Палитра (2 цвета, BGRA) ---
	// Индекс 0 — белый
	view.setUint8(offset++, 0xff); // B
	view.setUint8(offset++, 0xff); // G
	view.setUint8(offset++, 0xff); // R
	view.setUint8(offset++, 0x00); // A (зарезервировано)
	// Индекс 1 — чёрный
	view.setUint8(offset++, 0x00); // B
	view.setUint8(offset++, 0x00); // G
	view.setUint8(offset++, 0x00); // R
	view.setUint8(offset++, 0x00); // A

	// --- Данные пикселей ---
	// Фон — белый (индекс 0 -> биты = 0). Переносим биты из буфера плагина, учитывая rotate/topdown.
	const bytes = new Uint8Array(buffer);
	const startPixelData = pixelDataOffset;

	// Инициализация фоном (все нули = белый, т.к. индекс 0 — белый)
	bytes.fill(0x00, startPixelData, startPixelData + pixelDataSize);

	// Утилиты рисования с трансформацией координат
	const mapXY = (x: number, y: number) => {
		if (rotate === 180) {
			return { mx: width - 1 - x, my: height - 1 - y };
		}
		return { mx: x, my: y };
	};
	const setPixelBlack = (x: number, yTop: number) => {
		if (x < 0 || x >= width || yTop < 0 || yTop >= height) return;
		const { mx, my } = mapXY(x, yTop);
		const rowIndex = topDown ? my : height - 1 - my; // top-down или bottom-up
		const rowOffset = startPixelData + rowIndex * rowSizeBytes;
		const byteIndex = rowOffset + (mx >> 3);
		const mask = 0x80 >> (mx & 7);
		bytes[byteIndex] |= mask;
	};

	// Перенос данных из MonochromeImage в BMP-буфер
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

	// Инверсия бит (если требуется совместимость)
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


