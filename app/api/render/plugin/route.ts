import { NextResponse } from "next/server";
import { getPlugin } from "@/plugins";
import type { UserSettings } from "@/plugins/types";
import { getBaseUrl } from "@/lib/parsers";
import { renderPlugin } from "@/plugins/server";
import { toMonochromeBmp } from "@lib/bmp";
import { findDeviceByHash } from "@/db/devices";
import { loadDevicePluginData } from "@/db/dataDevice";

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

	const plugin = getPlugin<Record<string, unknown>, unknown>(pluginId);
	if (!plugin) {
		return NextResponse.json({ error: "plugin not found" }, { status: 404 });
	}
	const origin = getBaseUrl(request);
	let user: UserSettings = { name: "", age: 0 }; // по умолчанию
	let context = { deviceId: null as string | null, baseUrl: origin, telegramId: null as string | null };
	// Значения данных по умолчанию (если плагин использует внешнее хранилище)
	let data: unknown = plugin.defaultData;
	let dataCreatedAt: Date | undefined;
	if (deviceHash) {
		try {
			const device = await findDeviceByHash(deviceHash);
			if (device) {
				const u = device.info?.user;
				user = {
					name: String(u?.name ?? ""),
					age: Number(u?.age ?? 0),
				};

				// Получаем telegramId владельца устройства
				let telegramId: string | null = null;
				try {
					const { getDb } = await import("@/lib/mongodb");
					const db = await getDb();
					const deviceMembers = db.collection<import("@/db/types").DeviceMemberDoc>("device_members");
					const accounts = db.collection<import("@/db/types").AccountDoc>("accounts");

					// device приходит из findDeviceByHash и имеет _id
					const deviceWithId = device as import("@/db/devices").DeviceWithId;
					const owner = await deviceMembers.findOne({
						deviceId: deviceWithId._id,
						role: "owner",
						status: "active"
					});

					if (owner) {
						const telegramAccount = await accounts.findOne({
							userId: owner.userId,
							provider: "telegram"
						});

						if (telegramAccount) {
							telegramId = telegramAccount.providerAccountId;
						}
					}
				} catch {
					// Игнорируем ошибки получения telegramId
				}

				// Подгружаем данные плагина для конкретного устройства, если указана стратегия
				if (plugin.dataStrategy && plugin.dataStrategy !== "none") {
					try {
						const { getDb } = await import("@/lib/mongodb");
						const db = await getDb();
						const deviceWithId = device as import("@/db/devices").DeviceWithId;
						const stored = await loadDevicePluginData<unknown>({
							pluginId,
							deviceId: deviceWithId._id,
							strategy: plugin.dataStrategy,
							db,
						});
						if (stored) {
							data = stored.data;
							dataCreatedAt = stored.createdAt;
						}
					} catch {
						// Ошибки загрузки данных не должны ломать рендер, оставляем data по умолчанию
					}
				}

				context = { deviceId: device.hash, baseUrl: origin, telegramId };
			}
		} catch {
			// игнорируем, оставляем дефолтного пользователя
		}
	}
	let image: Awaited<ReturnType<typeof renderPlugin>> | null = null;
	try {
		image = await renderPlugin(plugin as import("@/plugins").Plugin<Record<string, unknown>, unknown>, {
			user,
			settings,
			data,
			dataCreatedAt,
			context,
			index,
			width,
			height,
		});
	} catch (error) {
		// Диагностика ошибок рендера (OG / React)
		// ВАЖНО: не логируем чувствительные данные, только параметры рендера
		console.error("[render-plugin] error", {
			pluginId,
			width,
			height,
			index,
			deviceHash,
			hasTelegramId: !!context.telegramId,
			error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
		});
		return NextResponse.json({ error: "render_failed" }, { status: 500 });
	}
	if (!image) {
		console.error("[render-plugin] null image returned", {
			pluginId,
			width,
			height,
			index,
			deviceHash,
			hasTelegramId: !!context.telegramId,
		});
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


