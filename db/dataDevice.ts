import type { Collection, Db, ObjectId, WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { DataDevicePlugin, DataDeviceTelegramDoc } from "./types";
import type { PluginDataStrategy } from "@/plugins/types";

// Базовый helper: получение коллекции данных устройства для конкретного плагина
export async function getDataDeviceCollection<TData>(
	pluginId: string,
	db?: Db,
): Promise<Collection<DataDevicePlugin<TData>>> {
	const database = db ?? (await getDb());
	const collectionName = `data_device_${pluginId}`;
	return database.collection<DataDevicePlugin<TData>>(collectionName);
}

// Специализированный helper для Telegram-плагина (pluginId = "telegram")
export async function getTelegramDeviceDataCollection(db?: Db): Promise<Collection<DataDeviceTelegramDoc>> {
	return getDataDeviceCollection<string>("telegram", db);
}

// Вставка новой записи данных для устройства/плагина (append semantics)
export async function insertDevicePluginData<TData>(params: {
	pluginId: string;
	deviceId: ObjectId;
	data: TData;
	createdBy: ObjectId;
	db?: Db;
}): Promise<void> {
	const { pluginId, deviceId, data, createdBy, db } = params;
	const col = await getDataDeviceCollection<TData>(pluginId, db);
	const doc: DataDevicePlugin<TData> = {
		deviceId,
		data,
		createdAt: new Date(),
		createdBy,
	};
	await col.insertOne(doc);
}

// Сохранение данных для устройства/плагина с учётом стратегии:
// - "append": каждая запись -> новый документ
// - "replace": один документ на устройство (обновляется по deviceId)
export async function saveDevicePluginData<TData>(params: {
	pluginId: string;
	deviceId: ObjectId;
	data: TData;
	createdBy: ObjectId;
	strategy: PluginDataStrategy;
	db?: Db;
}): Promise<void> {
	const { pluginId, deviceId, data, createdBy, strategy, db } = params;
	const col = await getDataDeviceCollection<TData>(pluginId, db);
	const now = new Date();

	if (strategy === "append") {
		await col.insertOne({
			deviceId,
			data,
			createdAt: now,
			createdBy,
		} as DataDevicePlugin<TData>);
		return;
	}

	if (strategy === "replace") {
		await col.updateOne(
			{ deviceId },
			{
				$set: {
					data,
					createdAt: now,
					createdBy,
				},
			},
			{ upsert: true },
		);
		return;
	}

	// strategy === "none" или не задан — ничего не сохраняем
}

// Загрузка данных для устройства/плагина с учётом стратегии.
// Для "append" берём последнюю запись по createdAt, для "replace" — единственный документ.
export async function loadDevicePluginData<TData>(params: {
	pluginId: string;
	deviceId: ObjectId;
	strategy: PluginDataStrategy | undefined;
	db?: Db;
}): Promise<TData | undefined> {
	const { pluginId, deviceId, strategy, db } = params;
	if (!strategy || strategy === "none") return undefined;

	const col = await getDataDeviceCollection<TData>(pluginId, db);

	if (strategy === "replace") {
		const doc = await col.findOne({ deviceId });
		return (doc?.data as TData) ?? undefined;
	}

	const cursor = col.find({ deviceId }).sort({ createdAt: -1 }).limit(1);
	const last: WithId<DataDevicePlugin<TData>> | null = await cursor.next();
	return last?.data;
}


