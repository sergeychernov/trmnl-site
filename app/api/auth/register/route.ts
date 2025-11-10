import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const name: string | undefined = body?.name?.trim();
		const email: string | undefined = body?.email?.toLowerCase().trim();
		const password: string | undefined = body?.password;

		if (!email || !password) {
			return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
		}
		if (password.length < 6) {
			return NextResponse.json({ error: "Пароль должен быть не короче 6 символов" }, { status: 400 });
		}

		const db = await getDb();
		const users = db.collection("users");
		const exists = await users.findOne({ email });
		if (exists) {
			// Если пользователь уже создан через OAuth — просто обновим passwordHash
			const hash = await bcrypt.hash(password, 10);
			await users.updateOne({ email }, { $set: { passwordHash: hash, name: exists.name ?? name ?? null } });
			return NextResponse.json({ ok: true, created: false });
		}

		const passwordHash = await bcrypt.hash(password, 10);
		await users.insertOne({
			name: name ?? null,
			email,
			image: null,
			emailVerified: null,
			passwordHash,
		});
		return NextResponse.json({ ok: true, created: true });
	} catch (e: any) {
		return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
	}
}


