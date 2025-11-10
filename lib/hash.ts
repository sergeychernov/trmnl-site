// Универсальные функции хеширования (браузер/Node)
// SHA-256 в hex; можно укоротить результат через необязательный параметр length
export async function hashString(input: string, length?: number): Promise<string> {
	const webCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
	let hex: string;
	if (webCrypto?.subtle) {
		const encoder = new TextEncoder();
		const data = encoder.encode(input);
		const digest = await webCrypto.subtle.digest("SHA-256", data);
		hex = bufferToHex(digest);
	} else {
		// Fallback для Node.js окружения без WebCrypto
		const { createHash } = await import("crypto");
		hex = createHash("sha256").update(input, "utf8").digest("hex");
	}
	if (typeof length === "number" && length > 0) {
		return hex.slice(0, Math.min(length, hex.length));
	}
	return hex;
}

export async function hashMacAddress(macAddress: string): Promise<string> {
	// Нормализуем MAC: верхний регистр и только шестнадцатеричные символы
	const normalized = macAddress.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
	return hashString(normalized, 12);
}

function bufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = "";
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, "0");
	}
	return hex;
}


