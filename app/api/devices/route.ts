import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc, DeviceMemberDoc } from "@/db/types";
import { hashMacAddress } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceWithId = DeviceDoc & { _id: ObjectId };

export async function GET() {
	try {
		const session = await auth();
		const userId = session?.user?.id;
		if (!userId) {
			return NextResponse.json({ devices: [] }, { status: 200 });
		}
		const db = await getDb();
		const membersCol = db.collection<DeviceMemberDoc>("device_members");
		const devicesCol = db.collection<DeviceWithId>("devices");

		const userObjectId = new ObjectId(userId);

		const memberships = await membersCol
			.find({ userId: userObjectId, status: "active" })
			.project<{ deviceId: ObjectId; role?: DeviceMemberDoc["role"] }>({ deviceId: 1, role: 1, _id: 0 })
			.toArray();
		if (memberships.length === 0) {
			return NextResponse.json({ devices: [] });
		}
		const deviceIds = memberships.map((m) => m.deviceId);
		const rolesByDeviceId = new Map<string, DeviceMemberDoc["role"] | undefined>();
		for (const m of memberships) {
			rolesByDeviceId.set(String(m.deviceId), m.role);
		}

		const devices = await devicesCol
			.find({ _id: { $in: deviceIds } })
			.project<Pick<DeviceWithId, "_id" | "friendly_id" | "name" | "hash" | "registered_at">>({
				_id: 1,
				friendly_id: 1,
				name: 1,
				hash: 1,
				registered_at: 1,
			})
			.toArray();
		console.log(devices);

		const result = devices.map((d) => ({
			id: String(d._id),
			friendly_id: d.friendly_id,
			name: d.name,
			hash: d.hash,
			registered_at: d.registered_at ?? null,
			role: rolesByDeviceId.get(String(d._id)) ?? null,
		}));
		console.log(result);

		return NextResponse.json({ devices: result });
	} catch (error) {
		console.error("[devices] error:", error);
		return NextResponse.json({ devices: [] }, { status: 200 });
	}
}


