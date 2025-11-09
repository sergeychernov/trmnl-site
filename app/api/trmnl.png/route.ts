import { NextResponse } from "next/server";
import { deflateSync } from "zlib";

// Генерация монохромного PNG 800x480 (1 бит на пиксель) с датой в центре
export async function GET() {
	const width = 800;
	const height = 480;

	// Размер строки в байтах (1 бит/пиксель)
	const rowBytes = Math.ceil(width / 8);

	// Буфер изображения в порядке top-down. Бит 1 = белый, 0 = чёрный (для PNG grayscale 1bpp).
	const imageData = new Uint8Array(height * rowBytes);
	// Инициализация белым: все биты = 1
	imageData.fill(0xff);

	const setPixelBlack = (x: number, y: number) => {
		if (x < 0 || x >= width || y < 0 || y >= height) return;
		const byteIndex = y * rowBytes + (x >> 3);
		const mask = 0x80 >> (x & 7);
		// Чёрный = 0
		imageData[byteIndex] &= ~mask;
	};

	// Рамка
	for (let x = 0; x < width; x++) {
		setPixelBlack(x, 0);
		setPixelBlack(x, height - 1);
	}
	for (let y = 0; y < height; y++) {
		setPixelBlack(0, y);
		setPixelBlack(width - 1, y);
	}

	// Шрифт 5x7 и отрисовка даты
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
		"-": [0b00000, 0b00000, 0b00000, 0b01110, 0b00000, 0b00000, 0b00000],
		" ": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
	};

	const drawGlyph = (glyph: number[], x: number, y: number, scale: number) => {
		const glyphHeight = 7;
		const glyphWidth = 5;
		for (let gy = 0; gy < glyphHeight; gy++) {
			const rowBits = glyph[gy] ?? 0;
			for (let gx = 0; gx < glyphWidth; gx++) {
				const bitOn = (rowBits & (1 << (glyphWidth - 1 - gx))) !== 0;
				if (!bitOn) continue;
				for (let sy = 0; sy < scale; sy++) {
					for (let sx = 0; sx < scale; sx++) {
						setPixelBlack(x + gx * scale + sx, y + gy * scale + sy);
					}
				}
			}
		}
	};
	const drawText = (text: string, x: number, y: number, scale: number) => {
		const glyphAdvance = 5 * scale;
		const letterSpacing = scale;
		let cx = x;
		for (const ch of text) {
			const g = FONT_5x7[ch] ?? FONT_5x7[" "];
			drawGlyph(g, cx, y, scale);
			cx += glyphAdvance + letterSpacing;
		}
	};

	const now = new Date();
	const yyyy = String(now.getFullYear());
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	const dateText = `${yyyy}-${mm}-${dd}`;

	const scale = 6;
	const glyphAdvance = 5 * scale + scale;
	const textWidth = dateText.length * glyphAdvance - scale;
	const textHeight = 7 * scale;
	const startX = Math.max(2, Math.floor((width - textWidth) / 2));
	const startY = Math.max(2, Math.floor((height - textHeight) / 2));
	drawText(dateText, startX, startY, scale);

	// PNG упаковка: IHDR, IDAT, IEND
	const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

	const writeUint32BE = (buf: Uint8Array, offset: number, value: number) => {
		buf[offset] = (value >>> 24) & 0xff;
		buf[offset + 1] = (value >>> 16) & 0xff;
		buf[offset + 2] = (value >>> 8) & 0xff;
		buf[offset + 3] = value & 0xff;
	};

	// CRC32
	let crcTable: number[] | null = null;
	const makeCrcTable = () => {
		const table: number[] = [];
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) {
				c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			}
			table[n] = c >>> 0;
		}
		crcTable = table;
	};
	const crc32 = (data: Uint8Array) => {
		if (!crcTable) makeCrcTable();
		let c = 0xffffffff;
		for (let i = 0; i < data.length; i++) {
			c = (c >>> 8) ^ (crcTable as number[])[(c ^ data[i]) & 0xff];
		}
		return (c ^ 0xffffffff) >>> 0;
	};

	const chunk = (type: string, data: Uint8Array) => {
		const out = new Uint8Array(8 + 4 + data.length + 4);
		// length
		writeUint32BE(out, 0, data.length);
		// type
		for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
		// data
		out.set(data, 8);
		// crc
		const crcInput = new Uint8Array(4 + data.length);
		for (let i = 0; i < 4; i++) crcInput[i] = type.charCodeAt(i);
		crcInput.set(data, 4);
		const crc = crc32(crcInput);
		writeUint32BE(out, 8 + data.length, crc);
		return out;
	};

	// IHDR
	const ihdr = new Uint8Array(13);
	writeUint32BE(ihdr, 0, width);
	writeUint32BE(ihdr, 4, height);
	ihdr[8] = 1; // bit depth = 1
	ihdr[9] = 0; // color type = 0 (grayscale)
	ihdr[10] = 0; // compression method
	ihdr[11] = 0; // filter method
	ihdr[12] = 0; // interlace method

	// IDAT: добавляем байт фильтра 0 перед каждой строкой
	const scanlines = new Uint8Array(height * (1 + rowBytes));
	for (let y = 0; y < height; y++) {
		const dstRowStart = y * (1 + rowBytes);
		scanlines[dstRowStart] = 0; // фильтр 0 (None)
		const srcStart = y * rowBytes;
		scanlines.set(imageData.subarray(srcStart, srcStart + rowBytes), dstRowStart + 1);
	}
	const compressed = deflateSync(scanlines);

	const idat = chunk("IDAT", compressed);
	const iend = chunk("IEND", new Uint8Array(0));
	const ihdrChunk = chunk("IHDR", ihdr);

	const totalLen = pngSignature.length + ihdrChunk.length + idat.length + iend.length;
	const png = new Uint8Array(totalLen);
	let p = 0;
	png.set(pngSignature, p); p += pngSignature.length;
	png.set(ihdrChunk, p); p += ihdrChunk.length;
	png.set(idat, p); p += idat.length;
	png.set(iend, p);

	return new NextResponse(png, {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "no-cache",
		},
	});
}


