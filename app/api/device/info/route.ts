import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc } from "@/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InfoUserPayload = {
	id?: string; // hash устройства
	name?: string;
	age?: number;
	address?: string;
	room?: string;
};

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const id = url.searchParams.get("id") || "";
		if (!id) {
			return NextResponse.json({ error: "missing_id" }, { status: 400 });
		}
		const db = await getDb();
		const devices = db.collection<DeviceDoc>("devices");
		const device = await devices.findOne(
			{ hash: id },
			{ projection: { info: 1, _id: 0 } },
		);
		const info = device?.info ?? {};
		return NextResponse.json({ info });
	} catch (err) {
		console.error("[device/info] GET error:", err);
		return NextResponse.json({ error: "internal_error" }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		const body = (await request.json().catch(() => null)) as InfoUserPayload | null;
		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "invalid_body" }, { status: 400 });
		}
		const { id, name, age, address, room } = body;
		if (!id || typeof id !== "string") {
			return NextResponse.json({ error: "missing_id" }, { status: 400 });
		}
		const db = await getDb();
		const devices = db.collection<DeviceDoc>("devices");

		const setUpdate: Record<string, unknown> = {};
		if (name !== undefined) setUpdate["info.user.name"] = name;
		if (age !== undefined) setUpdate["info.user.age"] = age;
		if (address !== undefined) setUpdate["info.user.address"] = address;
		if (room !== undefined) setUpdate["info.user.room"] = room;

		if (Object.keys(setUpdate).length === 0) {
			// Нечего сохранять — вернём текущие данные
			const current = await devices.findOne(
				{ hash: id },
				{ projection: { info: 1, _id: 0 } },
			);
			return NextResponse.json({ ok: true, info: current?.info ?? {} });
		}

		const res = await devices.updateOne(
			{ hash: id },
			{ $set: setUpdate },
			{ upsert: false },
		);

		// Возвращаем обновлённые данные
		const updated = await devices.findOne(
			{ hash: id },
			{ projection: { info: 1, _id: 0 } },
		);
		return NextResponse.json({ ok: res.acknowledged, info: updated?.info ?? {} });
	} catch (err) {
		console.error("[device/info] PUT error:", err);
		return NextResponse.json({ error: "internal_error" }, { status: 500 });
	}
}


