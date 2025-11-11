import fs from "node:fs";
import path from "node:path";

// Кэш в пределах одного воркера, чтобы не дёргать сеть повторно
const memoryCache: Record<string, { regular: string; bold: string; family: string }> = {};

async function downloadToFile(url: string, filePath: string) {
	// Если файл уже на диске — используем его
	try {
		const stat = await fs.promises.stat(filePath);
		if (stat.isFile() && stat.size > 0) return filePath;
	} catch {
		// no file — continue
	}
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to download font (${res.status}): ${url}`);
	}
	const ab = await res.arrayBuffer();
	await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
	await fs.promises.writeFile(filePath, Buffer.from(ab));
	return filePath;
}

async function downloadFirstAvailable(urls: string[], filePath: string) {
	let lastErr: unknown = null;
	for (const url of urls) {
		try {
			return await downloadToFile(url, filePath);
		} catch (e) {
			lastErr = e;
			continue;
		}
	}
	throw lastErr ?? new Error("No font URL worked");
}

/**
 * Гарантирует наличие ttf-файлов Roboto Mono (Regular/Bold) в /tmp и возвращает пути.
 * Источник файлов — публичный репозиторий Google Fonts (TTF).
 */
export async function ensureRobotoMono(): Promise<{ regular: string; bold: string; family: string }> {
	const key = "roboto-mono";
	if (memoryCache[key]) return memoryCache[key];

	const tmpDir = path.join("/tmp", "fonts", "roboto-mono");
	const regularPath = path.join(tmpDir, "RobotoMono-Regular.ttf");
	const boldPath = path.join(tmpDir, "RobotoMono-Bold.ttf");

	// Основной путь — в поддиректории static (новая структура репозитория Google Fonts)
	const regularUrls = [
		// raw.githubusercontent: предпочтительный источник (без редиректов)
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/static/RobotoMono-Regular.ttf",
		// Возможные альтернативы расположения
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/RobotoMono-Regular.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/RobotoMono%5Bwght%5D.ttf", // variable TTF
		"https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/static/RobotoMono-Regular.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono-Regular.ttf",
		// Запасной (github.com с /raw)
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/static/RobotoMono-Regular.ttf",
		// Старый путь без static
		"https://github.com/google/fonts/raw/main/apache/robotomono/RobotoMono-Regular.ttf",
	];
	const boldUrls = [
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/static/RobotoMono-Bold.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/RobotoMono-Bold.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/RobotoMono%5Bwght%5D.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/static/RobotoMono-Bold.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono-Bold.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/apache/robotomono/static/RobotoMono-Bold.ttf",
		"https://github.com/google/fonts/raw/main/apache/robotomono/RobotoMono-Bold.ttf",
	];

	try {
		await Promise.all([
			downloadFirstAvailable(regularUrls, regularPath),
			downloadFirstAvailable(boldUrls, boldPath),
		]);
		const out = { regular: regularPath, bold: boldPath, family: "Roboto Mono" };
		memoryCache[key] = out;
		return out;
	} catch {
		// Если не удалось скачать — не валим рендер. Вернём безопасный фолбэк.
		const out = { regular: "", bold: "", family: "monospace" };
		memoryCache[key] = out;
		return out;
	}
}

/**
 * Гарантирует наличие ttf-файлов Noto Sans Mono (Regular/Bold) в /tmp и возвращает пути.
 * Используется как расширенная поддержка Юникода (включая кириллицу) для OG/Canvas.
 */
export async function ensureNotoSansMono(): Promise<{ regular: string; bold: string; family: string }> {
	const key = "noto-sans-mono";
	if (memoryCache[key]) return memoryCache[key];

	const tmpDir = path.join("/tmp", "fonts", "noto-sans-mono");
	const regularPath = path.join(tmpDir, "NotoSansMono-Regular.ttf");
	const boldPath = path.join(tmpDir, "NotoSansMono-Bold.ttf");

	const regularUrls = [
		"https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmono/static/NotoSansMono-Regular.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmono/NotoSansMono%5Bwght%5D.ttf",
		"https://github.com/google/fonts/raw/main/ofl/notosansmono/static/NotoSansMono-Regular.ttf",
	];
	const boldUrls = [
		"https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmono/static/NotoSansMono-Bold.ttf",
		"https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmono/NotoSansMono%5Bwght%5D.ttf",
		"https://github.com/google/fonts/raw/main/ofl/notosansmono/static/NotoSansMono-Bold.ttf",
	];

	try {
		await Promise.all([
			downloadFirstAvailable(regularUrls, regularPath),
			downloadFirstAvailable(boldUrls, boldPath),
		]);
		const out = { regular: regularPath, bold: boldPath, family: "Noto Sans Mono" };
		memoryCache[key] = out;
		return out;
	} catch {
		const out = { regular: "", bold: "", family: "monospace" };
		memoryCache[key] = out;
		return out;
	}
}


