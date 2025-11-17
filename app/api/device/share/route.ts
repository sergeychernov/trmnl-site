import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc, DeviceMemberDoc } from "@/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceWithId = DeviceDoc & { _id: ObjectId };

function isValidEmail(email: string): boolean {
	// Простая валидация
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
	try {
		const session = await auth();
		const userId = session?.user?.id;
		if (!userId) {
			return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
		}

		let hash: string | null = null;
		let email: string | null = null;
		let role: DeviceMemberDoc["role"] = "viewer";
		try {
			const body = await request.json().catch(() => null);
			if (body && typeof body.hash === "string") {
				hash = body.hash.trim();
			}
			if (body && typeof body.email === "string") {
				email = body.email.trim().toLowerCase();
			}
			if (body && typeof body.role === "string") {
				const r = body.role as DeviceMemberDoc["role"];
				if (r === "owner" || r === "editor" || r === "viewer") {
					role = r;
				}
			}
		} catch {
			// ignore
		}
		if (!hash) {
			return NextResponse.json({ ok: false, error: "invalid_or_missing_hash" }, { status: 400 });
		}
		if (!email || !isValidEmail(email)) {
			return NextResponse.json({ ok: false, error: "invalid_or_missing_email" }, { status: 400 });
		}

		const db = await getDb();
		const devicesCol = db.collection<DeviceWithId>("devices");
		const membersCol = db.collection<DeviceMemberDoc>("device_members");
		const usersCol = db.collection<{ _id: ObjectId; email: string }>("users");

		const device = await devicesCol.findOne({ hash });
		if (!device) {
			return NextResponse.json({ ok: false, error: "device_not_found" }, { status: 404 });
		}

		const targetUser = await usersCol.findOne({ email });
		if (!targetUser) {
			return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
		}

		const currentUserObjectId = new ObjectId(userId);
		const now = new Date();

		await membersCol.updateOne(
			{ userId: targetUser._id, deviceId: device._id },
			{
				$set: { status: "active", updatedAt: now, role },
				$setOnInsert: {
					userId: targetUser._id,
					deviceId: device._id,
					createdAt: now,
					addedBy: currentUserObjectId,
				},
			},
			{ upsert: true },
		);

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[device/share] error:", error);
		return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
	}
}


