import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { randomBytes } from "crypto";
import type { DeviceDoc } from "@/db/types";

export const runtime = "nodejs";

// Handshake/регистрация устройства в БД (MongoDB, коллекция devices).
// BYOS-спецификация: всегда HTTP 200, статус в JSON.
export async function GET(request: Request) {
	const idHeader = request.headers.get("ID")?.toUpperCase() ?? null; // MAC адрес
	console.log(`[setup]`, request.headers);
	console.log(`[setup]`, request.body);
	console.log(`[setup]`, request.url);

	if (!idHeader) {
		return NextResponse.json(
			{
				status: 404,
				api_key: null,
				friendly_id: null,
				image_url: null,
				filename: null,
				message: "ID header is required",
			},
			{ status: 200 },
		);
	}

	// Нормализуем MAC (только HEX, 12 символов)
	const macHex = idHeader.replace(/[^A-F0-9]/g, "").slice(0, 12);
	if (macHex.length !== 12) {
		return NextResponse.json(
			{
				status: 404,
				api_key: null,
				friendly_id: null,
				image_url: null,
				filename: null,
				message: "Invalid ID format",
			},
			{ status: 200 },
		);
	}

	const db = await getDb();
	// Создадим коллекцию при отсутствии
	const collections = await db.listCollections({ name: "devices" }, { nameOnly: true }).toArray();
	if (collections.length === 0) {
		await db.createCollection("devices");
	}
	const devicesCol = db.collection<DeviceDoc>("devices");

	const device: DeviceDoc | null = await devicesCol.findOne({ mac_address: macHex });
	let isNew = false;
	let result: DeviceDoc;

	if (!device) {
		isNew = true;
		const apiKey = randomBytes(32).toString("hex"); // 64-символьный hex
		const friendlyId = `DEVICE_${macHex.slice(-6)}`;
		const now = new Date();
		const name = `TRMNL ${macHex.slice(-4)}`;
		const newDoc: DeviceDoc = {
			friendly_id: friendlyId,
			name,
			mac: macHex,
			api_key: apiKey,
			screen: null,
			refresh_schedule: null,
			timezone: "UTC",
			last_update_time: null,
			next_expected_update: null,
			last_refresh_duration: null,
			battery_voltage: null,
			firmware_version: null,
			rssi: null,
			created_at: now,
			updated_at: now,
		};
		await devicesCol.insertOne(newDoc);
		result = newDoc;
	} else {
		// Уже существует: при необходимости сгенерируем ключ, обновим updated_at
		let apiKey = device.api_key;
		if (!apiKey) {
			apiKey = randomBytes(32).toString("hex");
		}
		const update: Partial<DeviceDoc> = {
			api_key: apiKey,
			updated_at: new Date(),
		};
		await devicesCol.updateOne({ mac: macHex }, { $set: update });
		result = { ...device, ...update } as DeviceDoc;
	}

	// Не доверяем входящему Access-Token, ключ авторитетно берём из БД
	const message = isNew ? "Device successfully registered" : "Device already registered";
	return NextResponse.json(
		{
			status: 200,
			api_key: result.api_key,
			friendly_id: result.friendly_id,
			image_url: null,
			filename: null,
			message,
		},
		{ status: 200 },
	);
}


