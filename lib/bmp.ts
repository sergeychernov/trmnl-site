// Формирование монохромного BMP (1 bpp, палитра: 0=белый, 1=чёрный)
// Вход: упакованные побайтно пиксели (MSB-first), построчно сверху-вниз
export type MonochromePackedImage = {
	width: number;
	height: number;
	data: Uint8Array; // длина: ceil(width/8) * height
};

export type BmpOptions = {
	topDown?: boolean; // biHeight < 0 если true, иначе bottom-up
	invert?: boolean; // инвертировать биты пикселей
};

export function toMonochromeBmp(
	image: MonochromePackedImage,
	options: BmpOptions = {},
): Uint8Array {
	const width = image.width;
	const height = image.height;
	const bitsPerPixel = 1;
	const rowSizeBytes = Math.ceil((width * bitsPerPixel) / 32) * 4; // выравнивание до 4 байт
	const pixelDataSize = rowSizeBytes * height;

	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const colorTableSize = 8; // 2 * 4 (BGRA)
	const pixelDataOffset = fileHeaderSize + infoHeaderSize + colorTableSize;
	const fileSize = pixelDataOffset + pixelDataSize;

	const buffer = new ArrayBuffer(fileSize);
	const view = new DataView(buffer);
	let offset = 0;

	// BITMAPFILEHEADER ('BM')
	view.setUint8(offset++, 0x42);
	view.setUint8(offset++, 0x4d);
	view.setUint32(offset, fileSize, true); offset += 4;
	view.setUint16(offset, 0, true); offset += 2; // bfReserved1
	view.setUint16(offset, 0, true); offset += 2; // bfReserved2
	view.setUint32(offset, pixelDataOffset, true); offset += 4; // bfOffBits

	// BITMAPINFOHEADER
	view.setUint32(offset, infoHeaderSize, true); offset += 4; // biSize
	view.setInt32(offset, width, true); offset += 4; // biWidth
	const biHeight = options.topDown ? -height : height;
	view.setInt32(offset, biHeight, true); offset += 4; // biHeight
	view.setUint16(offset, 1, true); offset += 2; // biPlanes
	view.setUint16(offset, bitsPerPixel, true); offset += 2; // biBitCount
	view.setUint32(offset, 0, true); offset += 4; // biCompression = BI_RGB
	view.setUint32(offset, pixelDataSize, true); offset += 4; // biSizeImage
	view.setInt32(offset, 2835, true); offset += 4; // biXPelsPerMeter (~72 DPI)
	view.setInt32(offset, 2835, true); offset += 4; // biYPelsPerMeter
	view.setUint32(offset, 2, true); offset += 4; // biClrUsed
	view.setUint32(offset, 2, true); offset += 4; // biClrImportant

	// Палитра (2 цвета, BGRA): 0=белый, 1=чёрный
	view.setUint8(offset++, 0xff); // B
	view.setUint8(offset++, 0xff); // G
	view.setUint8(offset++, 0xff); // R
	view.setUint8(offset++, 0x00); // A
	view.setUint8(offset++, 0x00); // B
	view.setUint8(offset++, 0x00); // G
	view.setUint8(offset++, 0x00); // R
	view.setUint8(offset++, 0x00); // A

	// Пиксели
	const bytes = new Uint8Array(buffer);
	const startPixelData = pixelDataOffset;
	// Инициализируем белым (0x00 для 1bpp с палитрой 0=white)
	bytes.fill(0x00, startPixelData, startPixelData + pixelDataSize);

	const srcBytesPerRow = Math.ceil(width / 8);
	for (let outRow = 0; outRow < height; outRow++) {
		const srcRow = options.topDown ? outRow : height - 1 - outRow;
		const srcOffset = srcRow * srcBytesPerRow;
		const dstOffset = startPixelData + outRow * rowSizeBytes;
		bytes.set(image.data.subarray(srcOffset, srcOffset + srcBytesPerRow), dstOffset);
		// padding до rowSizeBytes оставляем нулями
	}

	if (options.invert) {
		for (let i = startPixelData; i < startPixelData + pixelDataSize; i++) {
			bytes[i] ^= 0xff;
		}
	}

	return bytes;
}


