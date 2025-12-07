import { NextResponse } from "next/server";
import { findDeviceByMac, getDevicesCollection } from "@/db/devices";
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
	const refresh_rate = Number.isFinite(Number(intervalParam)) ? Math.max(60, Number(intervalParam)) : 180;
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
		const device = await findDeviceByMac(mac);
		if (device) {
			console.log(`Device found: ${device.hash} (${device.hardware?.model || "—"})`);
			if (!device.registered_at) {
				if (!device.pin) {
					const pin = computeSixDigitPinFromMac(mac);
					const devicesCol = await getDevicesCollection();
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
			} else {
				const { hash } = device;
				return NextResponse.json(
					{
						status: 0,
						image_url: `${base}/api/render/device?hash=${hash}&ts=${Date.now()}`,
						filename: `${hash}_${Date.now()}.bmp`,
						refresh_rate,
					},
				);
			}
		} else {
			console.error(`Device not found: ${mac}`);
		}
	} catch (error) {
		console.error("Error fetching device from database:", error);
	}
	//TODO: отправить на /api/setup
	
}


