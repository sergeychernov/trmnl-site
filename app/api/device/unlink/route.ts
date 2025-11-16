import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc, DeviceMemberDoc } from "@/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceWithId = DeviceDoc & { _id: ObjectId };

export async function POST(request: Request) {
	try {
		const session = await auth();
		const userId = session?.user?.id;
		if (!userId) {
			return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
		}

		let hash: string | null = null;
		try {
			const body = await request.json().catch(() => null);
			if (body && typeof body.hash === "string") {
				hash = body.hash.trim();
			}
		} catch {
			// ignore
		}
		if (!hash) {
			return NextResponse.json({ ok: false, error: "invalid_or_missing_hash" }, { status: 400 });
		}

		const db = await getDb();
		const devicesCol = db.collection<DeviceWithId>("devices");
		const membersCol = db.collection<DeviceMemberDoc>("device_members");

		const device = await devicesCol.findOne({ hash });
		if (!device) {
			return NextResponse.json({ ok: false, error: "device_not_found" }, { status: 404 });
		}

		const userObjectId = new ObjectId(userId);
		const now = new Date();

		const { matchedCount } = await membersCol.updateOne(
			{ userId: userObjectId, deviceId: device._id, status: "active" },
			{ $set: { status: "revoked", updatedAt: now } },
		);

		if (matchedCount === 0) {
			// Nothing to revoke (already revoked or no membership)
			return NextResponse.json({ ok: true });
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[device/unlink] error:", error);
		return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
	}
}


