import { createHash } from "crypto";
// Универсальные функции хеширования (Node.js, синхронные)
// SHA-256 в hex; можно укоротить результат через необязательный параметр length
export function hashString(input: string, length?: number): string {
	const hex = createHash("sha256").update(input, "utf8").digest("hex");
	if (typeof length === "number" && length > 0) {
		return hex.slice(0, Math.min(length, hex.length));
	}
	return hex;
}

export function hashMacAddress(macAddress: string): string {
	// Нормализуем MAC: верхний регистр и только шестнадцатеричные символы
	const normalized = macAddress.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
	return hashString(normalized, 12);
}

export function computeSixDigitPinFromMac(macAddress: string): string {
	const normalized = macAddress.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
	const hex = hashString(normalized);
	const int32 = parseInt(hex.slice(0, 8), 16);
	const pin = int32 % 1_000_000;
	return pin.toString().padStart(6, "0");
}
