import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { parseSettings, type Settings } from "@lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	context: { params: Promise<{ id?: string }> },
) {
	try {
		const { id: rawId } = await context.params;
		const id = (rawId || "").trim();
		if (!id) {
			return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
		}

		const db = await getDb();
		// Коллекция может отсутствовать на чистой базе — в таком случае вернём 404
		const exists = await db
			.listCollections({ name: "settings" }, { nameOnly: true })
			.toArray();
		if (exists.length === 0) {
			return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
		}

		const col = db.collection<Settings & { _id: string; updatedAt?: Date }>("settings");
		const doc = await col.findOne({ _id: id });
		if (!doc) {
			return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
		}

		// Валидация структуры
		const validated = parseSettings({ user: (doc as Settings).user, device: (doc as Settings).device });
		if (!validated) {
			return NextResponse.json({ ok: false, error: "Corrupted data" }, { status: 500 });
		}

		// Не возвращаем внутренние поля (_id, updatedAt)
		return NextResponse.json({ ok: true, settings: validated }, { status: 200 });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}

export async function PUT(
	request: Request,
	context: { params: Promise<{ id?: string }> },
) {
	try {
		const { id: rawId } = await context.params;
		const id = (rawId || "").trim();
		if (!id) {
			return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
		}
		const body = await request.json().catch(() => null);
		const parsed = parseSettings(body);
		if (!parsed) {
			return NextResponse.json({ ok: false, error: "Invalid settings payload" }, { status: 400 });
		}

		const db = await getDb();
		// Ensure collection exists
		const exists = await db.listCollections({ name: "settings" }, { nameOnly: true }).toArray();
		if (exists.length === 0) {
			await db.createCollection("settings");
		}
		const col = db.collection<Settings & { _id: string; updatedAt: Date }>("settings");
		await col.updateOne(
			{ _id: id },
			{
				$set: {
					...parsed,
					updatedAt: new Date(),
				},
			},
			{ upsert: true },
		);
		return NextResponse.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}


