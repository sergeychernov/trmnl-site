// Универсальные функции хеширования (браузер/Node)
// SHA-256 в hex
export async function hashString(input: string): Promise<string> {
	const webCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
	if (webCrypto?.subtle) {
		const encoder = new TextEncoder();
		const data = encoder.encode(input);
		const digest = await webCrypto.subtle.digest("SHA-256", data);
		return bufferToHex(digest);
	}
	// Fallback для Node.js окружения без WebCrypto
	const { createHash } = await import("crypto");
	return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function hashMacAddress(macAddress: string): Promise<string> {
	// Нормализуем MAC: верхний регистр и только шестнадцатеричные символы
	const normalized = macAddress.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
	return hashString(normalized);
}

function bufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = "";
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, "0");
	}
	return hex;
}


