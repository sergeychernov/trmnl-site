import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import type { TelegramLinkDoc } from "@/db/types";

// Генерация 8-значного числового кода
function generateLinkCode(): string {
	return crypto.randomInt(10000000, 99999999).toString();
}

export async function POST() {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = new ObjectId(session.user.id);
	const linkCode = generateLinkCode();
	const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 минуты

	const db = await getDb();
	const telegramLinks = db.collection<TelegramLinkDoc>("telegram_links");

	// Удаляем старые коды для этого пользователя
	await telegramLinks.deleteMany({ userId });

	// Создаём новый код привязки
	await telegramLinks.insertOne({
		userId,
		linkCode,
		expiresAt,
		createdAt: new Date(),
	});

	// Создаём TTL индекс, если не существует
	try {
		await telegramLinks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
	} catch {
		// Индекс уже существует
	}

	const botUrl = `https://t.me/trmnlmsgbot?start=${linkCode}`;

	return NextResponse.json({
		ok: true,
		linkCode,
		botUrl,
		expiresAt,
	});
}
