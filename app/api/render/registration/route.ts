import { NextResponse } from "next/server";
import { createElement } from "react";
import { getBaseUrl, parseRenderSearchParams } from "@lib/persers";
import { createQrMatrix, computeQrLayout, drawQrPacked } from "@lib/qr";
import { ensureRobotoMono, ensureNotoSansMono, ensureNotoSans, resolveLocalFont } from "@lib/fonts";
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

	// Подключаем шрифты для OG (локальные в public/fonts имеют приоритет)
	// Поддерживаемые имена файлов:
	// - NotoSans-Regular.ttf / NotoSans-Bold.ttf
	// - NotoSansMono-Regular.ttf / NotoSansMono-Bold.ttf
	// - RobotoMono-Regular.ttf / RobotoMono-Bold.ttf
	let notoSans = await resolveLocalFont("Noto Sans", { regular: "NotoSans-Regular.ttf", bold: "NotoSans-Bold.ttf" });
	if (!notoSans.regular && !notoSans.bold) notoSans = await ensureNotoSans();
	let noto = await resolveLocalFont("Noto Sans Mono", { regular: "NotoSansMono-Regular.ttf", bold: "NotoSansMono-Bold.ttf" });
	if (!noto.regular && !noto.bold) noto = await ensureNotoSansMono();
	let roboto = await resolveLocalFont("Roboto Mono", { regular: "RobotoMono-Regular.ttf", bold: "RobotoMono-Bold.ttf" });
	if (!roboto.regular && !roboto.bold) roboto = await ensureRobotoMono();
	// Если локальные файлы не найдены, попробуем подтянуть их по HTTP из /fonts и сохранить в /tmp
	async function ensureFromPublicUrl(file: string): Promise<string> {
		try {
			// Убираем порт из base, если он случайно попал
			const cleanBase = base.replace(/:443$/, "").replace(/:80$/, "");
			const urlAbs = `${cleanBase}/fonts/${file}`;
			console.log(`[fonts] Fetching ${urlAbs}`);
			const res = await fetch(urlAbs);
			if (!res.ok) {
				console.log(`[fonts] Fetch failed: ${res.status} ${res.statusText}`);
				return "";
			}
			const ab = await res.arrayBuffer();
			const dir = "/tmp/fonts";
			await (await import("node:fs/promises")).mkdir(dir, { recursive: true });
			const p = `${dir}/${file}`;
			await (await import("node:fs/promises")).writeFile(p, Buffer.from(ab));
			console.log(`[fonts] Downloaded ${file} → ${p}`);
			return p;
		} catch (err) {
			console.log(`[fonts] ensureFromPublicUrl(${file}) error:`, err);
			return "";
		}
	}
	if (!notoSans.regular) notoSans.regular = await ensureFromPublicUrl("NotoSans-Regular.ttf");
	if (!notoSans.bold) notoSans.bold = await ensureFromPublicUrl("NotoSans-Bold.ttf");
	if (!noto.regular) noto.regular = await ensureFromPublicUrl("NotoSansMono-Regular.ttf");
	if (!noto.bold) noto.bold = await ensureFromPublicUrl("NotoSansMono-Bold.ttf");
	if (!roboto.regular) roboto.regular = await ensureFromPublicUrl("RobotoMono-Regular.ttf");
	if (!roboto.bold) roboto.bold = await ensureFromPublicUrl("RobotoMono-Bold.ttf");
	// Если файлы появились, убедимся что имя семейства корректное (а не generic)
	if ((notoSans.regular || notoSans.bold) && notoSans.family !== "Noto Sans") {
		notoSans.family = "Noto Sans";
	}
	if ((noto.regular || noto.bold) && noto.family !== "Noto Sans Mono") {
		noto.family = "Noto Sans Mono";
	}
	if ((roboto.regular || roboto.bold) && roboto.family !== "Roboto Mono") {
		roboto.family = "Roboto Mono";
	}
	// Для надёжности используем одно семейство в OG (Noto Sans)
	const ogFonts = [];
	if (notoSans.regular) ogFonts.push({ name: notoSans.family, dataPath: notoSans.regular, weight: 400 as const, style: "normal" as const });
	if (notoSans.bold) ogFonts.push({ name: notoSans.family, dataPath: notoSans.bold, weight: 700 as const, style: "normal" as const });
	// Диагностика шрифтов
	try {
		const dump = (label: string, f: { family: string; regular: string; bold: string }) =>
			console.log(`[fonts] ${label}: family="${f.family}" regular="${f.regular}" bold="${f.bold}"`);
		dump("NotoSans", notoSans);
		dump("NotoSansMono", noto);
		dump("RobotoMono", roboto);
		console.log(`[fonts] OG fonts count=${ogFonts.length}`);
	} catch { /* noop */ }

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
				fontFamily: notoSans.family,
			} as React.CSSProperties,
		},
		leftPanel,
		rightPanel,
	);

	// Рендерим через OG→BMP с двойным масштабом; при ошибке шрифтов — фолбэк на canvas 1bpp
	try {
		console.log(`[registration] Render OG: size=${width}x${height} scale=2 family="${notoSans.family}"`);
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
	} catch (err) {
		try {
			console.error("[registration] OG render failed:", err);
		} catch { /* noop */ }
		// Фолбэк: прежний рендер напрямую в 1bpp packed
		const bytesPerRow = Math.ceil(width / 8);
		const packed = new Uint8Array(bytesPerRow * height);

		// Зарегистрировать шрифты для node-canvas, если доступны (локальные пути работают без Fontconfig)
		if (notoSans.regular) {
			try { registerFont(notoSans.regular, { family: notoSans.family, weight: "normal" }); } catch (e) { try { console.error("[fonts] registerFont regular failed", e); } catch { } }
		}
		if (notoSans.bold) {
			try { registerFont(notoSans.bold, { family: notoSans.family, weight: "bold" }); } catch (e) { try { console.error("[fonts] registerFont bold failed", e); } catch { } }
		}
		if (noto.regular) { try { registerFont(noto.regular, { family: noto.family, weight: "normal" }); } catch { } }
		if (noto.bold) { try { registerFont(noto.bold, { family: noto.family, weight: "bold" }); } catch { } }
		if (roboto.regular) { try { registerFont(roboto.regular, { family: roboto.family, weight: "normal" }); } catch { } }
		if (roboto.bold) { try { registerFont(roboto.bold, { family: roboto.family, weight: "bold" }); } catch { } }

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
		// Для node-canvas используем ОДНУ зарегистрированную семью, без списка через запятую
		const fallbackFamily = notoSans.regular ? notoSans.family : "sans-serif";
		const opts = { fontFamily: fallbackFamily, fontSize: baseFont, thresholdAlpha: 64, color: "#000" as const };
		try {
			console.log(`[registration] Render canvas fallback: family="${fallbackFamily}"`);
		} catch { /* noop */ }
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

