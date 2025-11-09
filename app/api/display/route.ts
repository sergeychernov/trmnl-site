import { NextResponse } from "next/server";

// Основной эндпоинт для TRMNL по BYOS-спецификации
// Всегда HTTP 200. Поля ответа:
// - status (0 = OK)
// - image_url (абсолютная ссылка на BMP 800x480 1bpp)
// - filename (имя файла для устройства)
// - refresh_rate (сек.)
// - reset_firmware, update_firmware (флаги)
export async function GET(request: Request) {
	const url = new URL(request.url);
	const intervalParam = url.searchParams.get("interval");
	const refresh_rate = Number.isFinite(Number(intervalParam)) ? Math.max(5, Number(intervalParam)) : 180;

	const host = request.headers.get("host") ?? url.host;
	const urlProto = url.protocol.replace(":", "");
	const proto = (request.headers.get("x-forwarded-proto") ?? urlProto) || "https";
	const base = `${proto}://${host}`;

	const mac = request.headers.get("ID")?.toUpperCase() ?? "UNKNOWN";
	const macClean = mac.replace(/[^A-F0-9]/g, "");
	const ts = Date.now();
	const filename = `${macClean || "DEVICE"}_${ts}.bmp`;

	// Можно управлять параметрами совместимости через query (?invert/topdown/rotate) при необходимости
	const image_url = `${base}/api/trmnl?ts=${ts}`;

	return NextResponse.json(
		{
			status: 0,
			image_url,
			filename,
			refresh_rate,
			reset_firmware: false,
			update_firmware: false,
		},
		{ status: 200 },
	);
}


