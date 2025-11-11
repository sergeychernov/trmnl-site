import { NextResponse } from "next/server";
import { toMonochromeBmp } from "@lib/bmp";
import { getBaseUrl, parseRenderSearchParams } from "@lib/persers";
import { drawCanvasTextToBuffer, measureCanvasText, wrapTextToLines } from "@lib/canvasText";
import { createQrMatrix, drawQrPacked } from "@lib/qr";

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
	// Параметры совместимости по умолчанию для регистрационного экрана
	const topDown = false;

	// Базовый URL и ссылка для QR: {baseUrl}/settings/{deviceId?}
	const origin = getBaseUrl(request);
	const base = (origin || "").replace(/\/+$/, "");
	const addDeviceUrl = `${base}/profile/devices/add?pin=${pin}`;

	// Параметры вывода и буфер 1bpp (packed)
	const { width, height } = searchParams;
	// Создаём packed-буфер (белый фон)
	const bytesPerRow = Math.ceil(width / 8);
	const packed = new Uint8Array(bytesPerRow * height); // заполнен нулями = белый

	// Левая половина: QR с полями 16px
	const leftWidth = Math.floor(width / 2);
	const qrMarginPx = 16;
	const availQrW = Math.max(0, leftWidth - qrMarginPx * 2);
	const availQrH = Math.max(0, height - qrMarginPx * 2);
	const matrix = createQrMatrix(addDeviceUrl, "M");
	const marginModules = 4;
	const totalModules = matrix.size + marginModules * 2;
	const scale = Math.max(1, Math.min(Math.floor(availQrW / totalModules), Math.floor(availQrH / totalModules)));
	const drawSizePx = totalModules * scale;
	const baseOffsetX = qrMarginPx + Math.floor((availQrW - drawSizePx) / 2);
	const baseOffsetY = qrMarginPx + Math.floor((availQrH - drawSizePx) / 2);
	// смещение начала модулей (учитывая белую окантовку в модулях)
	const layout = {
		scale,
		offsetX: baseOffsetX + marginModules * scale,
		offsetY: baseOffsetY + marginModules * scale,
	};
	drawQrPacked({ data: packed, width, height }, matrix, layout);
	// Текст-пояснение (правая половина, поля 16px)
	const instructionLines = [
		`Чтобы настройить устройство, перейдите по qrcode`,
		`или`,
		`перейдите по ссылке`,
	];
	const siteLine = `${origin}`;
	const action = `зарегистрируйтесь и добавьте устройство по следующему пинкоду:`;
	const pinLine = `${pin ?? ""}`;
	const rightX0 = leftWidth;
	const textMarginPx = 16;
	const innerTextX = rightX0 + textMarginPx;
	const innerTextW = Math.max(0, width - rightX0 - textMarginPx * 2);
	const innerTextY = textMarginPx;
	const innerTextH = Math.max(0, height - textMarginPx * 2);
	const textFontSize = Math.floor(height * 0.055); // крупнее шрифт
	const opts = { fontFamily: "monospace", fontSize: textFontSize, thresholdAlpha: 64, color: "#000" as const };
	// замер для единообразия метрик (может быть использован при будущих настройках)
	measureCanvasText("Ag", opts);
	const lineGap = 6;
	// Переносим каждую строку инструкции отдельно; сайт и пин — отдельные строки
	const wrappedInstrArr = instructionLines.map((line) =>
		wrapTextToLines(line, innerTextW, opts, { maxLines: 2, minFontSize: 10 }),
	);
	const instrFontSize = Math.min(...wrappedInstrArr.map((w) => w.fontSize));
	const wrappedAction = wrapTextToLines(action, innerTextW, { ...opts, fontSize: instrFontSize }, { maxLines: 3, minFontSize: 10 });
	const renderFontSize = Math.min(instrFontSize, wrappedAction.fontSize);
	// Формируем набор строк с разными стилями:
	// - instruction: переносимые строки, обычный стиль
	// - site: отдельная строка, жирный
	// - action: переносимые строки, обычный стиль
	// - pin: отдельная строка, увеличенный шрифт
	type LineMeta = { text: string; fontSize: number; fontWeight?: "normal" | "bold" };
	const linesMeta: LineMeta[] = [];
	for (const w of wrappedInstrArr) {
		for (const l of w.lines) linesMeta.push({ text: l, fontSize: renderFontSize, fontWeight: "normal" });
	}
	linesMeta.push({ text: siteLine, fontSize: renderFontSize, fontWeight: "bold" });
	for (const l of wrappedAction.lines) linesMeta.push({ text: l, fontSize: renderFontSize, fontWeight: "normal" });
	const pinFontSize = Math.floor(height * 0.09);
	linesMeta.push({ text: pinLine, fontSize: pinFontSize, fontWeight: "bold" });
	// Посчитаем итоговую высоту с учётом разных высот строк
	const lineHeights = linesMeta.map((lm) => {
		const m = measureCanvasText("Ag", { ...opts, fontSize: lm.fontSize, fontWeight: lm.fontWeight ?? "normal" });
		return Math.max(m.height, Math.floor(lm.fontSize * 1.3));
	});
	// Единый отступ между всеми строками
	const totalHeight = lineHeights.reduce((a, b) => a + b, 0) + Math.max(0, linesMeta.length - 1) * lineGap;
	let startY = innerTextY + Math.max(0, Math.floor((innerTextH - totalHeight) / 2));
	// Рендер: центрируем по горизонтали каждую строку
	for (let i = 0; i < linesMeta.length; i++) {
		const lm = linesMeta[i];
		const widthPx = measureCanvasText(lm.text, { ...opts, fontSize: lm.fontSize, fontWeight: lm.fontWeight ?? "normal" }).width;
		const x = innerTextX + Math.max(0, Math.floor((innerTextW - widthPx) / 2));
		drawCanvasTextToBuffer(
			{ data: packed, width, height },
			lm.text,
			x,
			startY,
			{ ...opts, fontSize: lm.fontSize, fontWeight: lm.fontWeight ?? "normal" },
		);
		if (i < linesMeta.length - 1) {
			startY += lineHeights[i] + lineGap;
		}
	}

	// Конвертация в BMP 1bpp через утилиту
	const bmpBytes = toMonochromeBmp({ width, height, data: packed }, { topDown, invert: false });
	const bodyAb = new Uint8Array(bmpBytes).buffer; // гарантированно ArrayBuffer
	return new NextResponse(bodyAb, {
		headers: {
			"Content-Type": "image/bmp",
			"Content-Length": String(bmpBytes.length),
			"Cache-Control": "no-cache",
		},
	});
}

