// Универсальный разбор прокси-заголовков и построение baseUrl
// Используется для Next.js route handlers (Request)
export type RenderHeaders = {
	protocol: string;
	host: string;
	port?: string;
	baseUrl: string;
	forwardedFor?: string | null;
	userAgent?: string | null;
};

export function parseRenderHeaders(request: Request): RenderHeaders {
	const headers = request.headers;
	const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || undefined;
	const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || undefined;
	const forwardedPort = headers.get("x-forwarded-port")?.split(",")[0]?.trim() || undefined;
	const vercelHost = headers.get("x-vercel-deployment-url")?.trim() || undefined;
	const hostHeader = headers.get("host")?.trim() || "";

	let protocol = forwardedProto || (vercelHost ? "https" : "");
	if (!protocol) {
		try {
			protocol = new URL(request.url).protocol.replace(":", "");
		} catch {
			protocol = "https";
		}
	}

	let host = forwardedHost || vercelHost || hostHeader || "";
	if (!host) {
		try {
			const origin = new URL(request.url).origin;
			// origin имеет вид protocol://host[:port]
			host = origin.replace(/^[a-z]+:\/\//i, "");
		} catch {
			host = "localhost";
		}
	}

	// Очистка возможного протокола в host и добавление порта при необходимости
	host = host.replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "");
	let port = forwardedPort;
	// Если в host уже указан порт, не переопределяем forwardedPort
	if (!port) {
		const colonIdx = host.lastIndexOf(":");
		if (colonIdx > -1 && !host.endsWith("]")) {
			const maybePort = host.slice(colonIdx + 1);
			if (/^\d+$/.test(maybePort)) {
				port = maybePort;
			}
		}
	}

	let authority = host;
	if (port && !authority.includes(":")) {
		authority = `${authority}:${port}`;
	}

	let baseUrl = "";
	if (authority) {
		baseUrl = `${protocol}://${authority}`.replace(/\/+$/, "");
	} else {
		try {
			baseUrl = new URL(request.url).origin;
		} catch {
			baseUrl = `${protocol}://localhost`;
		}
	}

	return {
		protocol,
		host,
		port,
		baseUrl,
		forwardedFor: headers.get("x-forwarded-for"),
		userAgent: headers.get("user-agent"),
	};
}

export function getBaseUrl(request: Request): string {
	return parseRenderHeaders(request).baseUrl;
}

// Разбор заголовков от устройства (display endpoint)
export type DisplayHeaders = {
	// Базовые сетевые параметры (как в RenderHeaders)
	protocol: string;
	host: string;
	port?: string;
	baseUrl: string;
	forwardedFor?: string;
	userAgent?: string;
	// Поля устройства
	macRaw: string;
	mac: string; // 12 HEX, верхний регистр, без разделителей
	accessToken: string;
	refreshRate: number; // секунды
	batteryVoltage: number; // Вольт
	firmwareVersion: string;
	model: string;
	rssi: number; // dBm
	width: number;
	height: number;
};

export function parseDisplayHeaders(request: Request): DisplayHeaders | null {
	const base = parseRenderHeaders(request);
	const headers = request.headers;

	// ID (MAC) приходит как строка с возможными разделителями
	const idHeader = headers.get("ID") ?? headers.get("id");
	if (!idHeader) return null;
	const macRaw = idHeader.toString();
	const macClean = macRaw.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 12);
	if (macClean.length !== 12) return null;
	const mac = macClean;

	const accessToken = headers.get("access-token");
	if (!accessToken) return null;

	const refreshRateNum = Number(headers.get("refresh-rate"));
	if (!Number.isFinite(refreshRateNum) || refreshRateNum <= 0) return null;
	const refreshRate = Math.trunc(refreshRateNum);

	const batteryVoltageNum = Number(headers.get("battery-voltage"));
	if (!Number.isFinite(batteryVoltageNum)) return null;
	const batteryVoltage = batteryVoltageNum;

	const firmwareVersion = headers.get("fw-version");
	if (!firmwareVersion) return null;
	const model = headers.get("model");
	if (!model) return null;

	const rssiNum = Number(headers.get("rssi"));
	if (!Number.isFinite(rssiNum)) return null;
	const rssi = Math.trunc(rssiNum);

	const widthNum = Number(headers.get("width"));
	const heightNum = Number(headers.get("height"));
	if (!Number.isFinite(widthNum) || !Number.isFinite(heightNum)) return null;
	const width = Math.trunc(widthNum);
	const height = Math.trunc(heightNum);
	if (width <= 0 || height <= 0) return null;

	return {
		protocol: base.protocol,
		host: base.host,
		port: base.port,
		baseUrl: base.baseUrl,
		forwardedFor: base.forwardedFor ?? undefined,
		userAgent: base.userAgent ?? undefined,
		macRaw,
		mac,
		accessToken,
		refreshRate,
		batteryVoltage,
		firmwareVersion,
		model,
		rssi,
		width,
		height,
	};
}

// Разбор стандартных query-параметров рендера
export type RenderSearchParams = {
	rotate: 0 | 90 | 180 | 270;
	mac: string; // 12 HEX, верхний регистр, без разделителей
	ts: number; // целое число (мс или сек) или null
	width: number;
	height: number;
};

export function parseRenderSearchParams(request: Request): RenderSearchParams | null {
	const url = new URL(request.url);
	const rotateParam = url.searchParams.get("rotate");
	let rotate: 0 | 90 | 180 | 270 = 0;
	if (rotateParam != null) {
		const num = Math.trunc(Number(rotateParam));
		if (Number.isFinite(num)) {
			const norm = ((num % 360) + 360) % 360;
			if (norm === 90 || norm === 180 || norm === 270) {
				rotate = norm as 90 | 180 | 270;
			} else {
				rotate = 0;
			}
		}
	}

	const macRaw = url.searchParams.get("mac");
	if (macRaw == null) return null;
	const macClean = macRaw.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 12);
	if (macClean.length !== 12) return null;
	const mac = macClean;

	const tsParam = url.searchParams.get("ts");
	if (tsParam == null) return null;
	const tsNum = Number(tsParam);
	if (!Number.isFinite(tsNum)) return null;
	const ts = Math.trunc(tsNum);

	const widthParam = url.searchParams.get("width");
	const heightParam = url.searchParams.get("height");
	if (widthParam == null || heightParam == null) return null;
	const widthNum = Number(widthParam);
	const heightNum = Number(heightParam);
	if (!Number.isFinite(widthNum) || !Number.isFinite(heightNum)) return null;
	const width = Math.trunc(widthNum);
	const height = Math.trunc(heightNum);
	if (width <= 0 || height <= 0) return null;

	return { rotate, mac, ts, width, height };
}

// Расширенный разбор query-параметров для плагин-рендера:
// добавляет layout (строка) и plugins (JSON)
import type { Plugin as DevicePlugin } from "@/db/types";
export type PluginRenderSearchParams = RenderSearchParams & {
	layout: string;
	plugins: DevicePlugin[];
};

export function parsePluginRenderSearchParams(request: Request): PluginRenderSearchParams | null {
	const base = parseRenderSearchParams(request);
	if (!base) return null;
	const url = new URL(request.url);
	const layout = url.searchParams.get("layout") || undefined;
	const plugins = url.searchParams.get("plugins") || undefined;
	if (!layout || !plugins) return null;

	try {
		const pluginsJson = JSON.parse(plugins);
		if (Array.isArray(pluginsJson)) {
			return { ...base, layout, plugins: pluginsJson };
		}
	} catch (e) {
		console.error("Failed to parse plugins JSON:", e);
	}

	return null;
}


