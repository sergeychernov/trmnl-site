import { NextResponse } from "next/server";
import { getPlugin } from "@/plugins";
import type { UserSettings } from "@/plugins/types";
import { getBaseUrl } from "@/lib/parsers";
import { renderPlugin } from "@/plugins/server";
import { toMonochromeBmp } from "@lib/bmp";
import { findDeviceByHash } from "@/db/devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Универсальный рендер BMP 1bpp для произвольного плагина (?plugin=id)
export async function GET(request: Request) {
	const url = new URL(request.url);
	const pluginId = url.searchParams.get("plugin")?.trim();
	const widthNum = Math.trunc(Number(url.searchParams.get("width")));
	const heightNum = Math.trunc(Number(url.searchParams.get("height")));
	const indexNum = Math.trunc(Number(url.searchParams.get("index") ?? "1"));
	const deviceHash = url.searchParams.get("device")?.trim() || null;
	if (!pluginId || !Number.isFinite(widthNum) || !Number.isFinite(heightNum) || widthNum <= 0 || heightNum <= 0) {
		return NextResponse.json({ error: "invalid or missing parameters (plugin, width, height[, index])" }, { status: 400 });
	}
	const width = widthNum;
	const height = heightNum;
	const index = Number.isFinite(indexNum) && indexNum > 0 ? indexNum : 1;
	let settings: Record<string, unknown> = {};
	const settingsParam = url.searchParams.get("settings");
	if (settingsParam) {
		try {
			const parsed = JSON.parse(settingsParam);
			if (parsed && typeof parsed === "object") {
				settings = parsed as Record<string, unknown>;
			}
		} catch {
			// игнорируем, оставляем пустые settings
		}
	}

	const plugin = getPlugin(pluginId);
	if (!plugin) {
		return NextResponse.json({ error: "plugin not found" }, { status: 404 });
	}
	const origin = getBaseUrl(request);
	let user: UserSettings = { name: "", age: 0 }; // по умолчанию
	let context = { deviceId: null as string | null, baseUrl: origin };
	if (deviceHash) {
		try {
			const device = await findDeviceByHash(deviceHash);
			if (device) {
				const u = device.info?.user;
				user = {
					name: String(u?.name ?? ""),
					age: Number(u?.age ?? 0),
				};
				context = { deviceId: device.hash, baseUrl: origin };
			}
		} catch {
			// игнорируем, оставляем дефолтного пользователя
		}
	}
	const image = await renderPlugin(plugin as import("@/plugins").Plugin<Record<string, unknown>>, {
		user,
		settings,
		context,
		index,
		width,
		height,
	});
	if (!image) {
		return NextResponse.json({ error: "unsupported size for plugin" }, { status: 400 });
	}

	// Сборка BMP через библиотеку
	const bmp = toMonochromeBmp(image, { topDown: false, invert: false });
	const buf = new ArrayBuffer(bmp.byteLength);
	new Uint8Array(buf).set(bmp);
	return new NextResponse(buf, {
		headers: {
			"Content-Type": "image/bmp",
			"Content-Length": String(bmp.byteLength),
			"Cache-Control": "no-cache",
		},
	});
}


