import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc } from "@/db/types";
import { computeSixDigitPinFromMac } from "@/lib/hash";
import { parseDisplayHeaders } from "@/lib/parsers";

export const runtime = "nodejs";

// Основной эндпоинт для TRMNL по BYOS-спецификации
// В	let device: DeviceDoc = null;сегда HTTP 200. Поля ответа:
// - status (0 = OK)
// - image_url (абсолютная ссылка на BMP 800x480 1bpp)
// - filename (имя файла для устройства)
// - refresh_rate (сек.)
// - reset_firmware, update_firmware (флаги)
export async function GET(request: Request) {
	const url = new URL(request.url);
	const intervalParam = url.searchParams.get("interval");
	const refresh_rate = Number.isFinite(Number(intervalParam)) ? Math.max(5, Number(intervalParam)) : 180;
	const headers = parseDisplayHeaders(request);
	console.log("headers", headers);
	if (!headers) {
		console.error("Invalid headers");
		return NextResponse.json(
			{
				status: 400,
				message: "Invalid headers",
				image_url: null,
				filename: null,
				refresh_rate: 180,
				reset_firmware: false,
				update_firmware: false,
				firmware_url: null,
				special_function: null,
			},
			{ status: 200 },
		);
	}
	const { protocol, host, mac, width, height, firmwareVersion, model } = headers;

	const base = `${protocol}://${host}`;

	try {
		const db = await getDb();
		const devicesCol = db.collection<DeviceDoc>("devices");
		const device = await devicesCol.findOne<DeviceDoc>({ mac });
		if (device) {
			console.log(`Device found: ${device.hash} (${device.hardware?.model || "—"})`);
			if (!device.registered_at) {
				if (!device.pin) {
					const pin = computeSixDigitPinFromMac(mac);
					await devicesCol.updateOne(
						{ mac },
						{
							$set: {
								pin,
								updated_at: new Date(),
								firmwareVersion,
								"hardware.model": model,
								"hardware.width": width,
								"hardware.height": height
							}
						},
					);
					device.pin = pin;
				}
				return NextResponse.json(
					{
						status: 0,
						image_url: `${base}/api/render/registration?pin=${encodeURIComponent(device.pin!)}&mac=${mac}&ts=${Date.now()}&width=${width}&height=${height}`,
						filename: `${mac}_${Date.now()}.bmp`,
						refresh_rate,
					},
				);
			} //else {
			// 	const layout = device.layout || "single-landscape";
			// 	const plugins = device.plugins || { name: "calendar", settings: {} };
			// 	return NextResponse.json(
			// 		{
			// 			status: 0,
			// 			image_url: `${base}/api/render/plugin?mac=${mac}&ts=${Date.now()}&width=${width}&height=${height}&layout=${layout}&plugins=${JSON.stringify(plugins)}`,
			// 			filename: `${mac}_${Date.now()}.bmp`,
			// 			refresh_rate,
			// 		},
			// 	);
			// }
		} else {
			console.error(`Device not found: ${mac}`);
			const uniqueId =
				Math.random().toString(36).substring(2, 7) + Date.now().toString(36).slice(-3);
			const ts = Date.now();
			// Направляем устройство на универсальный рендер `/api/trmnl`, который покажет экран регистрации (QR)
			// и одновременно просим устройство перейти в setup через reset_firmware + special_function.
			const image_url = `${base}/api/trmnl?ts=${ts}&id=${mac}`;
			return NextResponse.json(
				{
					status: 500,
					message: "Device not found",
					image_url,
					filename: `not-found_${uniqueId}.bmp`,
					refresh_rate,
					reset_firmware: true,
					update_firmware: false,
					firmware_url: null,
					special_function: "restart_playlist",
				},
				{ status: 200 },
			);
		}
	} catch (error) {
		console.error("Error fetching device from database:", error);
	}

	const ts = Date.now();
	const filename = `${mac || "DEVICE"}_${ts}.bmp`;

	// Можно управлять параметрами совместимости через query (?invert/topdown/rotate) при необходимости
	const idQuery = mac ? `&mac=${mac}` : "";
	const image_url = `${base}/api/trmnl?ts=${ts}${idQuery}`;

	return NextResponse.json(
		{
			status: 0,
			image_url,
			filename,
			refresh_rate,
			reset_firmware: false,
			update_firmware: false,
		},
		{ status: 200 },
	);
}


