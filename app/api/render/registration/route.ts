import { NextResponse } from "next/server";
import { createElement } from "react";
import { getBaseUrl, parseRenderSearchParams } from "@lib/persers";
import { createQrMatrix } from "@lib/qr";
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

	// Генерируем QR-матрицу
	const matrix = createQrMatrix(addDeviceUrl, "M");
	const marginModules = 4;
	const totalModules = matrix.size + marginModules * 2;
	// Относительная раскладка: левая часть 40% (QR), правая 60% (текст)
	const leftRatio = 0.4;
	const rightRatio = 0.6;
	const pad = 16;

	// Подключаем только Noto Sans из public/fonts
	const notoSans = await resolveLocalFont("Noto Sans", { regular: "NotoSans-Regular.ttf", bold: "NotoSans-Bold.ttf" });
	const ogFonts = [];
	if (notoSans.regular) ogFonts.push({ name: notoSans.family, dataPath: notoSans.regular, weight: 400 as const, style: "normal" as const });
	if (notoSans.bold) ogFonts.push({ name: notoSans.family, dataPath: notoSans.bold, weight: 700 as const, style: "normal" as const });

	// Тексты
	const siteLine = `${origin}`;
	const pinLine = `${pin ?? ""}`;
	const baseFont = Math.floor(height * 0.055);
	const pinFont = Math.floor(height * 0.09);
	const lineGap = 6;

	// Рисуем QR как inline SVG (чёрные модули на белом фоне)
	const leftWidth = Math.floor(width * leftRatio);
	const leftHeight = height;
	// Максимальный размер QR в левой панели с отступами
	const availQrW = Math.max(0, leftWidth - pad * 2);
	const availQrH = Math.max(0, leftHeight - pad * 2);
	const moduleSize = Math.max(1, Math.min(Math.floor(availQrW / totalModules), Math.floor(availQrH / totalModules)));
	const qrDrawSize = totalModules * moduleSize;
	const qrOffsetX = pad + Math.floor((availQrW - qrDrawSize) / 2) + marginModules * moduleSize;
	const qrOffsetY = pad + Math.floor((availQrH - qrDrawSize) / 2) + marginModules * moduleSize;

	// Строим элементы <rect> для чёрных модулей
	const rects: React.ReactNode[] = [];
	for (let y = 0; y < matrix.size; y++) {
		for (let x = 0; x < matrix.size; x++) {
			if (matrix.isDark(y * matrix.size + x)) {
				rects.push(
					createElement("rect", {
						key: `${x}-${y}`,
						x: qrOffsetX + x * moduleSize,
						y: qrOffsetY + y * moduleSize,
						width: moduleSize,
						height: moduleSize,
						fill: "#000",
					} as unknown as React.SVGProps<SVGRectElement>),
				);
			}
		}
	}

	// OG React-элемент полной сцены через компонент RegistrationScreen
	const element = createElement(RegistrationScreen, {
		width,
		height,
		leftWidth,
		rightRatio,
		pad,
		lineGap,
		notoSans,
		rects,
		siteLine,
		pinLine,
		baseFont,
		pinFont,
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

