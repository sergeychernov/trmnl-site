import { NextRequest, NextResponse } from "next/server";
import { Bot, webhookCallback } from "grammy";
import type { MessageEntity } from "grammy/types";
import { getDb } from "@/lib/mongodb";
import type { TelegramLinkDoc, AccountDoc, DeviceMemberDoc, DeviceDoc, UserDoc } from "@/db/types";
import { saveDevicePluginData } from "@/db/dataDevice";
import { getPlugin } from "@/plugins";

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
	const telegramLinks = db.collection<TelegramLinkDoc>("telegram_links");
	const accounts = db.collection<AccountDoc>("accounts");
	const users = db.collection<UserDoc>("users");

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

// Команда для вывода списка устройств
bot.command("devices", async (ctx) => {
	const telegramId = ctx.from?.id;
	if (!telegramId) {
		await ctx.reply("Не удалось получить ваш Telegram ID.");
		return;
	}

	const db = await getDb();
	const accounts = db.collection<AccountDoc>("accounts");
	const deviceMembers = db.collection<DeviceMemberDoc>("device_members");
	const devices = db.collection<DeviceDoc>("devices");

	// Находим аккаунт пользователя
	const account = await accounts.findOne({
		provider: "telegram",
		providerAccountId: telegramId.toString(),
	});

	if (!account) {
		await ctx.reply(
			"Ваш Telegram аккаунт не привязан. Используйте ссылку из настроек профиля для привязки."
		);
		return;
	}

	// Находим все устройства пользователя
	const userDevices = await deviceMembers.find({
		userId: account.userId,
		status: "active"
	}).toArray();

	if (userDevices.length === 0) {
		await ctx.reply("У вас пока нет подключенных устройств.");
		return;
	}

	// Получаем информацию об устройствах
	const deviceIds = userDevices.map(dm => dm.deviceId);
	const deviceDocs = await devices.find({
		_id: { $in: deviceIds }
	}).toArray();

	// Формируем список устройств
	let message = "📱 *Ваши устройства:*\n\n";

	for (const deviceMember of userDevices) {
		const device = deviceDocs.find(d => d._id.equals(deviceMember.deviceId));
		if (device) {
			const alias = deviceMember.alias || "Без названия";
			const role = deviceMember.role === "owner" ? "Владелец" : deviceMember.role === "editor" ? "Редактор" : "Наблюдатель";
			const lastUpdate = device.last_update_time
				? new Date(device.last_update_time).toLocaleString("ru-RU", { timeZone: device.timezone || "Europe/Moscow" })
				: "Не обновлялось";

			message += `• *${alias}*\n`;
			message += `  Роль: ${role}\n`;
			message += `  hash: \`${device.hash}\`\n`;
			message += `  Последнее обновление: ${lastUpdate}\n`;
			if (device.battery_voltage) {
				message += `  Батарея: ${device.battery_voltage}V\n`;
			}
			message += "\n";
		}
	}

	await ctx.reply(message, { parse_mode: "Markdown" });
});

// Команда помощи
bot.command("help", async (ctx) => {
	await ctx.reply(
		"🤖 *Доступные команды:*\n\n" +
		"/start <код> - Привязать Telegram аккаунт\n" +
		"/devices - Показать список ваших устройств\n" +
		"/help - Показать это сообщение",
		{ parse_mode: "Markdown" },
	);
});

// Преобразуем текст + entities Telegram в простой Markdown (Markdown-подобная разметка)
function formatTelegramTextAsMarkdown(text: string, entities?: MessageEntity[]): string {
	if (!entities || entities.length === 0) {
		return text;
	}

	// Сортируем сущности по убыванию offset, чтобы индексы не сдвигались при вставках
	const sorted = [...entities].sort((a, b) => b.offset - a.offset);
	let result = text;

	for (const entity of sorted) {
		const start = entity.offset;
		const end = entity.offset + entity.length;
		const before = result.slice(0, start);
		const middle = result.slice(start, end);
		const after = result.slice(end);

		let wrapped = middle;
		switch (entity.type) {
			case "bold":
				wrapped = `**${middle}**`;
				break;
			case "italic":
				wrapped = `_${middle}_`;
				break;
			case "underline":
				wrapped = `__${middle}__`;
				break;
			case "strikethrough":
				wrapped = `~~${middle}~~`;
				break;
			case "code":
				wrapped = `\`${middle}\``;
				break;
			case "pre":
				// Для простоты отображаем как инлайн-код
				wrapped = `\`${middle}\``;
				break;
			case "text_link":
				// text_link содержит URL в entity.url
				if ("url" in entity && entity.url) {
					wrapped = `[${middle}](${entity.url})`;
				}
				break;
			default:
				// Остальные типы (mention, url и т.п.) отображаем как есть
				break;
		}

		result = before + wrapped + after;
	}

	return result;
}

type ProcessUserTextMessageParams = {
	telegramId: number | undefined;
	rawText: string;
	entities?: MessageEntity[];
	reply: (text: string) => Promise<unknown>;
};

// Общая логика обработки исходного текста (как нового, так и отредактированного):
// поиск аккаунта, устройств с плагином Telegram, сохранение markdown и ответ пользователю.
async function processUserTextMessage({
	telegramId,
	rawText,
	entities,
	reply,
}: ProcessUserTextMessageParams): Promise<void> {
	const text = rawText.trim();

	if (!telegramId || !text) {
		return;
	}
	// Игнорируем команды (они уже обработаны в других хендлерах)
	if (text.startsWith("/")) {
		return;
	}

	const db = await getDb();
	const accounts = db.collection<AccountDoc>("accounts");
	const deviceMembers = db.collection<DeviceMemberDoc>("device_members");
	const devices = db.collection<DeviceDoc>("devices");

	// Находим аккаунт пользователя
	const account = await accounts.findOne({
		provider: "telegram",
		providerAccountId: telegramId.toString(),
	});
	if (!account) {
		await reply(
			"Ваш Telegram аккаунт не привязан. Используйте ссылку из настроек профиля для привязки.",
		);
		return;
	}

	// Находим все активные устройства пользователя
	const memberships = await deviceMembers
		.find({ userId: account.userId, status: "active" })
		.toArray();
	if (memberships.length === 0) {
		await reply("У вас пока нет подключенных устройств.");
		return;
	}

	const deviceIds = memberships.map((m) => m.deviceId);
	const deviceDocs = await devices
		.find({ _id: { $in: deviceIds } })
		.toArray();

	// Оставляем только устройства, где подключён плагин telegram
	const pluginId = "telegram";
	const devicesWithTelegram = deviceDocs.filter(
		(device) =>
			Array.isArray(device.plugins) &&
			device.plugins.some((p) => p.name === pluginId),
	);

	if (devicesWithTelegram.length === 0) {
		await reply(
			"У вас нет устройств с плагином Telegram. Добавьте плагин Telegram в настройках устройства.",
		);
		return;
	}

	// Узнаём стратегию данных плагина из реестра
	const telegramPlugin = getPlugin(pluginId);
	const strategy = telegramPlugin?.dataStrategy ?? "none";
	if (strategy === "none") {
		await reply(
			"Сообщение получено, но плагин Telegram не настроен для хранения данных.",
		);
		return;
	}

	// Преобразуем текст с учётом Telegram entities в Markdown-подобную разметку
	const markdownText = formatTelegramTextAsMarkdown(rawText, entities);

	// Сохраняем сообщение для каждого устройства с плагином Telegram
	for (const device of devicesWithTelegram) {
		await saveDevicePluginData<string>({
			pluginId,
			deviceId: device._id,
			data: markdownText,
			createdBy: account.userId,
			strategy,
		});
	}

	if (devicesWithTelegram.length === 1) {
		const onlyDevice = devicesWithTelegram[0];
		const membership = memberships.find((m) =>
			m.deviceId.equals(onlyDevice._id),
		);
		const alias = membership?.alias || onlyDevice.hash;
		await reply(`Сообщение отправлено на устройство ${alias}.`);
	} else {
		await reply(
			`Сообщение отправлено на ${devicesWithTelegram.length} устройств с плагином Telegram.`,
		);
	}
}

// Обработка обычных текстовых сообщений — сохраняем их как данные для Telegram-плагина,
// включая базовое форматирование (жирный, курсив, подчёркнутый, зачёркнутый, code, pre, text_link).
bot.on("message:text", async (ctx) => {
	const telegramId = ctx.from?.id;
	const rawText = ctx.message?.text ?? "";

	await processUserTextMessage({
		telegramId,
		rawText,
		entities: ctx.message?.entities,
		reply: (text: string) => ctx.reply(text),
	});
});

// Обработка редактирования последнего (и не только) текстового сообщения:
// при редактировании мы просто пересохраняем Markdown и отправляем его на те же устройства.
bot.on("edited_message:text", async (ctx) => {
	const telegramId = ctx.from?.id;
	const rawText = ctx.editedMessage?.text ?? "";

	await processUserTextMessage({
		telegramId,
		rawText,
		entities: ctx.editedMessage?.entities,
		reply: (text: string) => ctx.reply(text),
	});
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
