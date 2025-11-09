import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ipAddress, geolocation } from "@vercel/functions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";

export async function GET(request: Request) {
	try {
		const db = await getDb();
		// Быстрый ping через простой запрос к системной коллекции
		const admin = db.admin();
		await admin.ping();
		const collections = await db.listCollections({}, { nameOnly: true }).toArray();
		const ip = ipAddress(request) || null;
		const geo = geolocation(request);
		return NextResponse.json({
			ok: true,
			db: db.databaseName,
			collections: collections.map((c) => c.name),
			ip,
			geo,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}


