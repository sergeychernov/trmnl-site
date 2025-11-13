import { NextResponse } from "next/server";
import { createElement } from "react";
import { getBaseUrl, parseRenderSearchParams } from "@/lib/parsers";
import { resolveLocalFont } from "@lib/fonts";
import { renderOgElementToBmp } from "@lib/ogToBmp";
import { RegistrationScreen } from "./RegistrationScreen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Рендер изображения регистрации (QR) как BMP 1bpp (800x480)
export async function GET(request: Request) {
	const url = new URL(request.url);
	const pin = url.searchParams.get("pin");
	const parsed = parseRenderSearchParams(request);
	if (!parsed) {
		return NextResponse.json({ error: "invalid or missing parameters (mac, ts, width, height, rotate)" }, { status: 400 });
	}
	const searchParams = { ...parsed, pin };

	// Базовый URL и ссылка для QR: {baseUrl}/settings/{deviceId?}
	const origin = getBaseUrl(request);
	const base = (origin || "").replace(/\/+$/, "");
	const addDeviceUrl = `${base}/profile/devices/add?pin=${pin}`;
	// Диагностика URL'ов
	try {
		console.log(`[registration] request.url=${request.url}`);
		console.log(`[registration] origin=${origin} base=${base}`);
		console.log(`[registration] addDeviceUrl=${addDeviceUrl}`);
	} catch { /* noop */ }

	// Параметры вывода
	const { width, height } = searchParams;

	const pad = 16;

	// Подключаем только Noto Sans из public/fonts
	const notoSans = await resolveLocalFont("Noto Sans", { regular: "NotoSans-Regular.ttf", bold: "NotoSans-Bold.ttf" });
	const ogFonts = [];
	if (notoSans.regular) ogFonts.push({ name: notoSans.family, dataPath: notoSans.regular, weight: 400 as const, style: "normal" as const });
	if (notoSans.bold) ogFonts.push({ name: notoSans.family, dataPath: notoSans.bold, weight: 700 as const, style: "normal" as const });

	// Тексты
	const siteLine = `${origin}`;
	const pinLine = `${pin ?? ""}`;

	// OG React-элемент полной сцены через компонент RegistrationScreen
	const element = createElement(RegistrationScreen, {
		width,
		height,
		pad,
		notoSans,
		qr: addDeviceUrl,
		siteLine,
		pinLine,
	});

	// Рендерим через OG→BMP с дизерингом Аткинсона; при ошибке шрифтов — фолбэк на canvas 1bpp
	try {
		console.log(`[registration] Render OG: size=${width}x${height} family="${notoSans.family}"`);
		const bmpBytes = await renderOgElementToBmp(element, {
			width,
			height,
			scale: 1,
			fonts: ogFonts,
			gamma: 1.8,
		});
		return new NextResponse(new Uint8Array(bmpBytes).buffer, {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": String(bmpBytes.length),
				"Cache-Control": "no-cache",
			},
		});
	} catch (err) {
		console.error("[registration] OG render failed:", err);
	}
}

