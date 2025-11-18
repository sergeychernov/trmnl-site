import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/parsers";
import { toMonochromeBmp } from "@/lib/bmp";
import { getSizesByRatios } from "@/lib/ratios";
import { findDeviceByHash } from "@/db/devices";
import { getPlugin } from "@/plugins";
import { renderPlugin } from "@/plugins/server";
import type { MonochromeImage } from "@/plugins/types";
import { getDb } from "@/lib/mongodb";
import type { DeviceMemberDoc, AccountDoc } from "@/db/types";
import type { DeviceWithId } from "@/db/devices";
import { loadDevicePluginData } from "@/db/dataDevice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBit(buf: Uint8Array, width: number, x: number, y: number): 0 | 1 {
	const rowBytes = Math.ceil(width / 8);
	const byteIndex = y * rowBytes + Math.floor(x / 8);
	const bitIndex = 7 - (x % 8);
	return ((buf[byteIndex] >> bitIndex) & 1) as 0 | 1;
}

function setBit(buf: Uint8Array, width: number, x: number, y: number, value: 0 | 1): void {
	const rowBytes = Math.ceil(width / 8);
	const byteIndex = y * rowBytes + Math.floor(x / 8);
	const bitIndex = 7 - (x % 8);
	if (value) {
		buf[byteIndex] |= (1 << bitIndex);
	} else {
		buf[byteIndex] &= ~(1 << bitIndex);
	}
}

function composeImages(
	targetWidth: number,
	targetHeight: number,
	parts: Array<{ x: number; y: number; image: MonochromeImage }>,
): MonochromeImage {
	const outRowBytes = Math.ceil(targetWidth / 8);
	const data = new Uint8Array(outRowBytes * targetHeight);
	for (const part of parts) {
		const { x: offX, y: offY, image } = part;
		const src = image.data;
		for (let sy = 0; sy < image.height; sy++) {
			const dy = offY + sy;
			if (dy < 0 || dy >= targetHeight) continue;
			for (let sx = 0; sx < image.width; sx++) {
				const dx = offX + sx;
				if (dx < 0 || dx >= targetWidth) continue;
				const bit = getBit(src, image.width, sx, sy);
				if (bit) setBit(data, targetWidth, dx, dy, 1);
			}
		}
	}
	return { width: targetWidth, height: targetHeight, data };
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const hash = url.searchParams.get("hash")?.trim();
	if (!hash) {
		return NextResponse.json({ error: "missing hash" }, { status: 400 });
	}

	const device = await findDeviceByHash(hash);
	if (!device) {
		return NextResponse.json({ error: "device not found" }, { status: 404 });
	}

	const baseUrl = getBaseUrl(request);
	const defaultWidth = 800;
	const defaultHeight = 480;
	const hwWidth = device.hardware?.width ?? defaultWidth;
	const hwHeight = device.hardware?.height ?? defaultHeight;
	const portrait = !!device.layout?.portrait;
	const targetWidth = portrait ? hwHeight : hwWidth;
	const targetHeight = portrait ? hwWidth : hwHeight;

	const orientation = device.layout?.orientation ?? "horizontal";
	const ratios = (device.layout?.ratios && device.layout.ratios.length > 0) ? device.layout.ratios : [1];
	const slotSizes = getSizesByRatios(ratios, orientation, targetWidth, targetHeight);

	const pluginsArray = Array.isArray(device.plugins) ? device.plugins : [];
	const defaultPlugin = getPlugin("empty");

	const count = Math.max(1, slotSizes.length);
	let offsetX = 0;
	let offsetY = 0;
	const parts: Array<{ x: number; y: number; image: MonochromeImage }> = [];
	for (let i = 0; i < count; i++) {
		const size = slotSizes[i] ?? { width: targetWidth, height: targetHeight };
		const descriptor = pluginsArray[i] ?? { name: defaultPlugin?.id ?? "empty", settings: defaultPlugin?.defaultSettings ?? {} };
		const plugin = getPlugin(descriptor.name) ?? defaultPlugin;
		if (!plugin) continue;

		// Получаем telegramId владельца устройства
		let telegramId: string | null = null;
		try {
			const db = await getDb();
			const deviceMembers = db.collection<DeviceMemberDoc>("device_members");
			const accounts = db.collection<AccountDoc>("accounts");

			// Находим владельца устройства
			// device приходит из findDeviceByHash и имеет _id
			const deviceWithId = device as DeviceWithId;
			const owner = await deviceMembers.findOne({
				deviceId: deviceWithId._id,
				role: "owner",
				status: "active"
			});

			if (owner) {
				// Находим его Telegram аккаунт
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

		// Подгружаем данные плагина для данного слота, если плагин объявил стратегию хранения
		let data: unknown = plugin.defaultData;
		if (plugin.dataStrategy && plugin.dataStrategy !== "none") {
			try {
				const deviceWithId = device as DeviceWithId;
				const stored = await loadDevicePluginData<unknown>({
					pluginId: plugin.id,
					deviceId: deviceWithId._id,
					strategy: plugin.dataStrategy,
				});
				if (typeof stored !== "undefined") {
					data = stored;
				}
			} catch {
				// Ошибки загрузки данных не должны ломать рендер, оставляем data по умолчанию
			}
		}

		const image = await renderPlugin(plugin, {
			user: device.info?.user ? { name: device.info.user.name ?? "", age: Number(device.info.user.age ?? 0) } : undefined,
			settings: (descriptor.settings ?? {}) as Record<string, unknown>,
			data,
			context: { deviceId: device.hash, baseUrl, telegramId },
			index: i + 1,
			width: size.width,
			height: size.height,
		});
		if (image) {
			parts.push({ x: orientation === "horizontal" ? offsetX : 0, y: orientation === "vertical" ? offsetY : 0, image });
		}
		if (orientation === "horizontal") {
			offsetX += size.width;
		} else {
			offsetY += size.height;
		}
	}

	if (parts.length === 0) {
		return NextResponse.json({ error: "nothing to render" }, { status: 400 });
	}

	const composed = composeImages(targetWidth, targetHeight, parts);
	const bmp = toMonochromeBmp(composed, { topDown: false, invert: false });
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


