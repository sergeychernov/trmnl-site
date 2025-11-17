import { NextRequest, NextResponse } from "next/server";
import { Bot, webhookCallback } from "grammy";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Создаём экземпляр бота
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");

// Обрабатываем команду /start
bot.command("start", async (ctx) => {
	const linkCode = ctx.match;

	if (!linkCode || !/^\d{8}$/.test(linkCode)) {
		await ctx.reply(
			"Привет! \u0414ля привязки аккаунта нужно использовать ссылку с кодом привязки из настроек профиля."
		);
		return;
	}

	const db = await getDb();
	const telegramLinks = db.collection("telegram_links");
	const accounts = db.collection("accounts");
	const users = db.collection("users");

	// Ищем активный код привязки
	const linkDoc = await telegramLinks.findOne({
		linkCode,
		expiresAt: { $gt: new Date() },
	});

	if (!linkDoc) {
		await ctx.reply(
			"Код привязки недействителен или истёк. Пожалуйста, получите новый код в настройках профиля."
		);
		return;
	}

	const telegramId = ctx.from?.id;
	const telegramUsername = ctx.from?.username || null;
	const telegramFirstName = ctx.from?.first_name || null;
	const telegramLastName = ctx.from?.last_name || null;

	if (!telegramId) {
		await ctx.reply("Не удалось получить ваш Telegram ID. Попробуйте снова.");
		return;
	}

	// Проверяем, не привязан ли уже этот Telegram аккаунт
	const existingAccount = await accounts.findOne({
		provider: "telegram",
		providerAccountId: telegramId.toString(),
	});

	if (existingAccount) {
		// Находим пользователя, к которому уже привязан аккаунт
		const existingUser = await users.findOne({ _id: existingAccount.userId });
		const userName = existingUser?.name || "неизвестный пользователь";
		await ctx.reply(
			`Этот Telegram аккаунт уже привязан к пользователю ${userName}.`
		);
		return;
	}

	// Создаём привязку аккаунта
	await accounts.insertOne({
		provider: "telegram",
		userId: linkDoc.userId,
		providerAccountId: telegramId.toString(),
		access_token: null,
		refresh_token: null,
		extraData: {
			username: telegramUsername,
			first_name: telegramFirstName,
			last_name: telegramLastName,
		},
	});

	// Удаляем использованный код
	await telegramLinks.deleteOne({ _id: linkDoc._id });

	// Находим пользователя для приветственного сообщения
	const user = await users.findOne({ _id: linkDoc.userId });
	const userName = user?.name || user?.email || "Пользователь";

	await ctx.reply(
		`\u2705 Успешно! Telegram аккаунт привязан к профилю ${userName}.\n\nТеперь вы будете получать уведомления о ваших устройствах TRMNL в этот чат.`
	);
});

// Обработка остальных сообщений
bot.on("message", async (ctx) => {
	await ctx.reply(
		"Используйте ссылку с кодом привязки из настроек профиля для привязки аккаунта."
	);
});

// Создаём обработчик webhook
const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(req: NextRequest) {
	try {
		// Проверяем секретный токен (Telegram может передавать его в заголовке)
		const secretToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
		if (process.env.TELEGRAM_WEBHOOK_SECRET && secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Передаём запрос в Grammy
		const body = await req.json();
		const response = await handleUpdate(new Request(req.url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}));

		return new NextResponse(response.body, {
			status: response.status,
			headers: response.headers,
		});
	} catch (error) {
		console.error("Telegram webhook error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// Поддержка GET для проверки webhook
export async function GET() {
	return NextResponse.json({ ok: true, message: "Telegram webhook is active" });
}
