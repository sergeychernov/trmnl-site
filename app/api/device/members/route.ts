import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc, DeviceMemberDoc } from "@/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceWithId = DeviceDoc & { _id: ObjectId };

export async function GET(request: Request) {
	try {
		const session = await auth();
		const userId = session?.user?.id;
		if (!userId) {
			return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
		}
		const { searchParams } = new URL(request.url);
		const hash = (searchParams.get("hash") || "").trim();
		if (!hash) {
			return NextResponse.json({ ok: false, error: "invalid_or_missing_hash" }, { status: 400 });
		}
		const db = await getDb();
		const devicesCol = db.collection<DeviceWithId>("devices");
		const membersCol = db.collection<DeviceMemberDoc>("device_members");
		const usersCol = db.collection<{ _id: ObjectId; email: string }>("users");

		const device = await devicesCol.findOne({ hash });
		if (!device) {
			return NextResponse.json({ ok: false, error: "device_not_found" }, { status: 404 });
		}

		const currentUserObjectId = new ObjectId(userId);
		const me = await membersCol.findOne({
			userId: currentUserObjectId,
			deviceId: device._id,
			status: "active",
		});
		// Только владелец может видеть список участников
		if (!me || me.role !== "owner") {
			return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
		}

		const members = await membersCol
			.find({ deviceId: device._id, status: "active" })
			.project<{ userId: ObjectId; role: DeviceMemberDoc["role"] }>({ userId: 1, role: 1, _id: 0 })
			.toArray();
		const userIds = members.map((m) => m.userId);
		if (userIds.length === 0) {
			return NextResponse.json({ ok: true, members: [] });
		}
		const users = await usersCol
			.find({ _id: { $in: userIds } })
			.project<{ _id: ObjectId; email: string }>({ _id: 1, email: 1 })
			.toArray();
		const emailById = new Map<string, string>();
		for (const u of users) {
			emailById.set(String(u._id), u.email);
		}
		const result = members
			.filter((m) => String(m.userId) !== String(currentUserObjectId)) // исключаем себя
			.map((m) => ({
				email: emailById.get(String(m.userId)) ?? "",
				role: m.role,
			}))
			.filter((m) => m.email);

		return NextResponse.json({ ok: true, members: result });
	} catch (error) {
		console.error("[device/members] error:", error);
		return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
	}
}


