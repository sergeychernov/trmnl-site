import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc, DeviceMemberDoc } from "@/db/types";
import type { DeviceConnectErrorCode } from "./errors";
import { DeviceConnectErrorMessages } from "./errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceWithId = DeviceDoc & { _id: ObjectId };

export async function POST(request: Request) {
	try {
		const session = await auth();
		const userId = session?.user?.id;
		if (!userId) {
			const error: DeviceConnectErrorCode = "unauthorized";
			return NextResponse.json({ error, message: DeviceConnectErrorMessages[error] }, { status: 401 });
		}

		let pin: string | null = null;
		try {
			const body = await request.json().catch(() => null);
			if (body && typeof body.pin === "string") {
				pin = body.pin.trim();
			}
		} catch {
			// ignore parse error, will validate below
		}
		if (!pin || !/^\d{6}$/.test(pin)) {
			const error: DeviceConnectErrorCode = "invalid_or_missing_pin";
			return NextResponse.json({ error, message: DeviceConnectErrorMessages[error] }, { status: 400 });
		}

		const db = await getDb();
		const devicesCol = db.collection<DeviceWithId>("devices");
		const membersCol = db.collection<DeviceMemberDoc>("device_members");

		// Ищем устройство по PIN и только не зарегистрированные
		const device = await devicesCol.findOne({
			pin,
			registered_at: { $exists: false },
		});
		if (!device) {
			const error: DeviceConnectErrorCode = "device_not_found_or_already_registered";
			return NextResponse.json({ error, message: DeviceConnectErrorMessages[error] }, { status: 404 });
		}

		const now = new Date();
		const userObjectId = new ObjectId(userId);

		// Создаём/подтверждаем связь пользователь↔устройство (idempotent)
		await membersCol.updateOne(
			{ userId: userObjectId, deviceId: device._id },
			{
				$setOnInsert: {
					userId: userObjectId,
					deviceId: device._id,
					role: "owner",
					status: "active",
					createdAt: now,
					addedBy: userObjectId,
				},
			},
			{ upsert: true },
		);

		// Помечаем устройство как зарегистрированное
		await devicesCol.updateOne(
			{ _id: device._id },
			{ $set: { registered_at: now, updated_at: now } },
		);

		return NextResponse.json({
			ok: true,
			device: {
				id: String(device._id),
				hash: device.hash,
				mac: device.mac,
			},
		});
	} catch (error) {
		console.error("[device/connect] error:", error);
		const code: DeviceConnectErrorCode = "internal_error";
		return NextResponse.json({ error: code, message: DeviceConnectErrorMessages[code] }, { status: 500 });
	}
}


