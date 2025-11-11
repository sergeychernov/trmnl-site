import { NextResponse } from "next/server";
import { createElement } from "react";
import { getBaseUrl, parseRenderSearchParams } from "@lib/persers";
import { createQrMatrix, computeQrLayout, drawQrPacked } from "@lib/qr";
import { ensureRobotoMono, ensureNotoSansMono } from "@lib/fonts";
import { renderOgElementToBmp } from "@lib/ogToBmp";
import { toMonochromeBmp } from "@lib/bmp";
import { drawCanvasTextToBuffer, measureCanvasText, wrapTextToLines } from "@lib/canvasText";
import { registerFont } from "canvas";

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

	// Подключаем шрифты для OG (Roboto Mono + Noto Sans Mono для расширенного покрытия)
	const roboto = await ensureRobotoMono();
	const noto = await ensureNotoSansMono();
	const ogFonts = [];
	if (roboto.regular) ogFonts.push({ name: roboto.family, dataPath: roboto.regular, weight: 400 as const, style: "normal" as const });
	if (roboto.bold) ogFonts.push({ name: roboto.family, dataPath: roboto.bold, weight: 700 as const, style: "normal" as const });
	if (noto.regular) ogFonts.push({ name: noto.family, dataPath: noto.regular, weight: 400 as const, style: "normal" as const });
	if (noto.bold) ogFonts.push({ name: noto.family, dataPath: noto.bold, weight: 700 as const, style: "normal" as const });

	// Тексты
	const instructionLines = [`Чтобы настроить устройство, перейдите по qrcode`, `или`, `перейдите по ссылке`];
	const siteLine = `${origin}`;
	const action = `зарегистрируйтесь и добавьте устройство по следующему пинкоду:`;
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

	// OG React-элемент полной сцены 800x480 (без JSX)
	const leftPanel = createElement(
		"div",
		{
			style: {
				width: `${leftWidth}px`,
				height: "100%",
				boxSizing: "border-box",
				padding: `${pad}px`,
				position: "relative",
			} as React.CSSProperties,
		},
		createElement(
			"svg",
			{
				width: leftWidth,
				height: height,
				viewBox: `0 0 ${leftWidth} ${height}`,
				xmlns: "http://www.w3.org/2000/svg",
			} as unknown as React.SVGProps<SVGSVGElement>,
			createElement("rect", {
				x: 0,
				y: 0,
				width: leftWidth,
				height: height,
				fill: "#fff",
			} as unknown as React.SVGProps<SVGRectElement>),
			...rects,
		),
	);

	const rightPanelChildren: React.ReactNode[] = [];
	rightPanelChildren.push(
		createElement(
			"div",
			{ style: { fontSize: `${baseFont}px`, fontWeight: 400 } as React.CSSProperties },
			...instructionLines.map((l, i) => createElement("div", { key: i }, l)),
		),
	);
	rightPanelChildren.push(
		createElement("div", { style: { fontSize: `${baseFont}px`, fontWeight: 700 } as React.CSSProperties }, siteLine),
	);
	rightPanelChildren.push(
		createElement("div", { style: { fontSize: `${baseFont}px`, fontWeight: 400 } as React.CSSProperties }, action),
	);
	rightPanelChildren.push(
		createElement("div", { style: { fontSize: `${pinFont}px`, fontWeight: 700 } as React.CSSProperties }, pinLine),
	);

	const rightPanel = createElement(
		"div",
		{
			style: {
				width: `${Math.floor(width * rightRatio)}px`,
				height: "100%",
				boxSizing: "border-box",
				padding: `${pad}px`,
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				gap: `${lineGap}px`,
				textAlign: "center",
			} as React.CSSProperties,
		},
		...rightPanelChildren,
	);

	const element = createElement(
		"div",
		{
			style: {
				width: `${width}px`,
				height: `${height}px`,
				display: "flex",
				flexDirection: "row",
				background: "#fff",
				color: "#000",
				fontFamily: `${roboto.family}, ${noto.family}, sans-serif`,
			} as React.CSSProperties,
		},
		leftPanel,
		rightPanel,
	);

	// Рендерим через OG→BMP с двойным масштабом; при ошибке шрифтов — фолбэк на canvas 1bpp
	try {
		const bmpBytes = await renderOgElementToBmp(element, {
			width,
			height,
			scale: 2,
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
	} catch {
		// Фолбэк: прежний рендер напрямую в 1bpp packed
		const bytesPerRow = Math.ceil(width / 8);
		const packed = new Uint8Array(bytesPerRow * height);

		// Зарегистрировать шрифты для node-canvas, если доступны
		if (roboto.regular) { try { registerFont(roboto.regular, { family: roboto.family, weight: "normal" }); } catch { } }
		if (roboto.bold) { try { registerFont(roboto.bold, { family: roboto.family, weight: "bold" }); } catch { } }
		if (noto.regular) { try { registerFont(noto.regular, { family: noto.family, weight: "normal" }); } catch { } }
		if (noto.bold) { try { registerFont(noto.bold, { family: noto.family, weight: "bold" }); } catch { } }

		// Левая панель: QR
		const leftWidthPx = Math.floor(width * leftRatio);
		const leftLayout = computeQrLayout(leftWidthPx - pad * 2, height - pad * 2, matrix.size, marginModules);
		// смещаем в пределах левой панели
		const shiftedLayout = {
			scale: leftLayout.scale,
			offsetX: pad + leftLayout.offsetX,
			offsetY: pad + leftLayout.offsetY,
		};
		drawQrPacked({ data: packed, width, height }, matrix, shiftedLayout);

		// Правая панель: тексты (центрирование по колонке)
		const rightX0 = leftWidthPx;
		const innerTextX = rightX0 + pad;
		const innerTextW = Math.max(0, width - rightX0 - pad * 2);
		const innerTextY = pad;
		const innerTextH = Math.max(0, height - pad * 2);
		const opts = { fontFamily: `${roboto.family}, ${noto.family}, monospace`, fontSize: baseFont, thresholdAlpha: 64, color: "#000" as const };
		measureCanvasText("Ag", opts);

		// Перенос строк и вычисление высот
		const wrappedInstrArr = instructionLines.map((line) =>
			wrapTextToLines(line, innerTextW, opts, { maxLines: 2, minFontSize: 10 }),
		);
		const instrFontSize = Math.min(...wrappedInstrArr.map((w) => w.fontSize));
		const wrappedAction = wrapTextToLines(action, innerTextW, { ...opts, fontSize: instrFontSize }, { maxLines: 3, minFontSize: 10 });
		const renderFontSize = Math.min(instrFontSize, wrappedAction.fontSize);

		type LineMeta = { text: string; fontSize: number; fontWeight?: "normal" | "bold" };
		const linesMeta: LineMeta[] = [];
		for (const w of wrappedInstrArr) {
			for (const l of w.lines) linesMeta.push({ text: l, fontSize: renderFontSize, fontWeight: "normal" });
		}
		linesMeta.push({ text: siteLine, fontSize: renderFontSize, fontWeight: "bold" });
		for (const l of wrappedAction.lines) linesMeta.push({ text: l, fontSize: renderFontSize, fontWeight: "normal" });
		linesMeta.push({ text: pinLine, fontSize: pinFont, fontWeight: "bold" });

		const lineHeights = linesMeta.map((lm) => {
			const m = measureCanvasText("Ag", { ...opts, fontSize: lm.fontSize, fontWeight: lm.fontWeight ?? "normal" });
			return Math.max(m.height, Math.floor(lm.fontSize * 1.3));
		});
		const totalHeight = lineHeights.reduce((a, b) => a + b, 0) + Math.max(0, linesMeta.length - 1) * lineGap;
		let startY = innerTextY + Math.max(0, Math.floor((innerTextH - totalHeight) / 2));
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

		const bmpBytes = toMonochromeBmp({ width, height, data: packed }, { topDown: false, invert: false });
		return new NextResponse(new Uint8Array(bmpBytes).buffer, {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": String(bmpBytes.length),
				"Cache-Control": "no-cache",
			},
		});
	}
}

