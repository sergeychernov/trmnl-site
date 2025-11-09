import { NextResponse } from "next/server";

// Возвращает монохромный BMP 800x480 (1 бит на пиксель) для Seed Studio TRMNL.
// Палитра: индекс 0 — белый, индекс 1 — чёрный. Фон — белый, по периметру — чёрная рамка.
export async function GET(request: Request) {
	// Параметры совместимости:
	// - invert=1  -> инвертировать биты (чёрное/белое)
	// - rotate=180 -> повернуть содержимое на 180° (размеры остаются 800x480)
	// - topdown=1 -> записывать BMP в top-down (biHeight < 0)
	const url = new URL(request.url);
	const invertBits = url.searchParams.get("invert") === "1" || url.searchParams.get("invert") === "true";
	const rotate = url.searchParams.get("rotate") === "180" ? 180 : 0;
	const topDown = url.searchParams.get("topdown") === "1" || url.searchParams.get("topdown") === "true";
	// Геометрия
	const width = 800;
	const height = 480;
	const bitsPerPixel = 1; // 1bpp, монохром

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
	// Фон — белый (индекс 0 -> биты = 0). Рисуем через setPixelBlack с учётом rotate/topdown.
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

	// Чёрная рамка
	for (let x = 0; x < width; x++) {
		setPixelBlack(x, 0); // верх
		setPixelBlack(x, height - 1); // низ
	}
	for (let y = 0; y < height; y++) {
		setPixelBlack(0, y); // левый
		setPixelBlack(width - 1, y); // правый
	}

	// --- Текст: текущая дата YYYY-MM-DD, 5x7 шрифт (масштабируемый) ---
	const FONT_5x7: Record<string, number[]> = {
		"0": [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
		"1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
		"2": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
		"3": [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
		"4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
		"5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
		"6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
		"7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
		"8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
		"9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
		"A": [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
		"B": [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
		"C": [0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111],
		"D": [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
		"E": [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
		"F": [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
		"-": [0b00000, 0b00000, 0b00000, 0b01110, 0b00000, 0b00000, 0b00000],
		" ": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
	};

	const drawGlyph = (glyph: number[], x: number, yTop: number, scale: number) => {
		const glyphHeight = 7;
		const glyphWidth = 5;
		for (let gy = 0; gy < glyphHeight; gy++) {
			const rowBits = glyph[gy] ?? 0;
			for (let gx = 0; gx < glyphWidth; gx++) {
				const bitOn = (rowBits & (1 << (glyphWidth - 1 - gx))) !== 0;
				if (!bitOn) continue;
				// масштабируем пиксель
				for (let sy = 0; sy < scale; sy++) {
					for (let sx = 0; sx < scale; sx++) {
						setPixelBlack(x + gx * scale + sx, yTop + gy * scale + sy);
					}
				}
			}
		}
	};

	const drawText = (text: string, x: number, yTop: number, scale: number) => {
		const glyphAdvance = 5 * scale;
		const letterSpacing = scale; // 1 столбец пробела
		let cursorX = x;
		for (const ch of text) {
			const g = FONT_5x7[ch] ?? FONT_5x7[" "];
			drawGlyph(g, cursorX, yTop, scale);
			cursorX += glyphAdvance + letterSpacing;
		}
	};

	// Вычисляем строку даты
	const now = new Date();
	const yyyy = String(now.getFullYear());
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	const dateText = `${yyyy}-${mm}-${dd}`;

	// Подбор масштаба и центрирование
	const scale = 6; // 5x7 -> 30x42 на символ
	const glyphAdvance = 5 * scale + scale; // включая интервал
	const textWidth = dateText.length * glyphAdvance - scale; // без последнего интервала
	const textHeight = 7 * scale;
	const startX = Math.max(2, Math.floor((width - textWidth) / 2));
	const startY = Math.max(2, Math.floor((height - textHeight) / 2));

	drawText(dateText, startX, startY, scale);

	// Если устройство прислало MAC (заголовок ID) — выведем его снизу по центру
	const macHeader = request.headers.get("ID")?.toUpperCase() ?? "";
	const macHex = macHeader.replace(/[^A-F0-9]/g, "").slice(0, 12);
	if (macHex.length === 12) {
		const macGroups = macHex.match(/.{1,2}/g) as string[];
		const macText = macGroups.join("-");
		const macScale = 4; // поменьше, чтобы поместилось внизу
		const macAdvance = 5 * macScale + macScale;
		const macWidth = macText.length * macAdvance - macScale;
		const macHeight = 7 * macScale;
		const macX = Math.max(2, Math.floor((width - macWidth) / 2));
		const macY = Math.max(2, height - macHeight - 8);
		drawText(macText, macX, macY, macScale);
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


