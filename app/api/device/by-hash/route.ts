import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc } from "@/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		// Используем тот же параметр `id`, что и в /api/device/info
		const id = url.searchParams.get("id") || "";
		if (!id) {
			return NextResponse.json({ error: "missing_id" }, { status: 400 });
		}
		const db = await getDb();
		const devices = db.collection<DeviceDoc>("devices");
		const device = await devices.findOne(
			{ hash: id },
			// Не отдаём чувствительные поля в клиент
			{ projection: { _id: 0, api_key: 0, pin: 0, mac: 0 } },
		);
		return NextResponse.json({ device: device ?? null }, { status: 200 });
	} catch (err) {
		console.error("[device/by-hash] GET error:", err);
		return NextResponse.json({ error: "internal_error" }, { status: 500 });
	}
}


