import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc, LayoutConfig, Plugin as DevicePlugin } from "@/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
			{ projection: { layout: 1, plugins: 1, _id: 0 } },
		);
		return NextResponse.json({ layout: device?.layout ?? null, plugins: device?.plugins ?? null }, { status: 200 });
	} catch (err) {
		console.error("[device/layout] GET error:", err);
		return NextResponse.json({ error: "internal_error" }, { status: 500 });
	}
}

type PutPayload = {
	id?: string; // hash устройства
	layout?: Partial<LayoutConfig> | null;
	plugins?: DevicePlugin[] | null;
};

function isValidLayout(input: unknown): input is LayoutConfig {
	if (typeof input !== "object" || input === null) return false;
	const obj = input as {
		orientation?: unknown;
		portrait?: unknown;
		ratiosText?: unknown;
		ratios?: unknown;
	};
	if (obj.orientation !== "horizontal" && obj.orientation !== "vertical") return false;
	if (typeof obj.portrait !== "boolean") return false;
	if (typeof obj.ratiosText !== "string") return false;
	if (!Array.isArray(obj.ratios) || obj.ratios.length === 0 || !obj.ratios.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)) {
		return false;
	}
	return true;
}

export async function PUT(request: Request) {
	try {
		const body = (await request.json().catch(() => null)) as PutPayload | null;
		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "invalid_body" }, { status: 400 });
		}
		const { id, layout, plugins } = body;
		if (!id || typeof id !== "string") {
			return NextResponse.json({ error: "missing_id" }, { status: 400 });
		}
		if (!isValidLayout(layout)) {
			return NextResponse.json({ error: "invalid_layout" }, { status: 400 });
		}
		// Валидация plugins (если переданы)
		if (plugins != null) {
			const ok =
				Array.isArray(plugins) &&
				plugins.every(
					(p) =>
						p &&
						typeof p === "object" &&
						typeof p.name === "string" &&
						p.name.length > 0 &&
						p.settings != null &&
						typeof p.settings === "object",
				);
			if (!ok) {
				return NextResponse.json({ error: "invalid_plugins" }, { status: 400 });
			}
		}
		const db = await getDb();
		const devices = db.collection<DeviceDoc>("devices");
		const $set: Partial<DeviceDoc> = { layout, updated_at: new Date() };
		if (plugins != null) {
			$set.plugins = plugins;
		}
		const res = await devices.updateOne(
			{ hash: id },
			{ $set },
			{ upsert: false },
		);
		return NextResponse.json({ ok: res.acknowledged });
	} catch (err) {
		console.error("[device/layout] PUT error:", err);
		return NextResponse.json({ error: "internal_error" }, { status: 500 });
	}
}


