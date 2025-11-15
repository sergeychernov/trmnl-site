import { ObjectId, type Collection, type Db } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { DeviceDoc } from "./types";

export type DeviceWithId = DeviceDoc & { _id: ObjectId };

/** Возвращает коллекцию `devices` с типом документов `DeviceDoc`. */
export async function getDevicesCollection(db?: Db): Promise<Collection<DeviceDoc>> {
	const database = db ?? (await getDb());
	return database.collection<DeviceDoc>("devices");
}

/** 
 * Находит устройство по его хешу.
 * Можно передать `projection`, чтобы ограничить возвращаемые поля.
 */
export async function findDeviceByHash(
	hash: string,
	options?: { projection?: Record<string, 0 | 1> },
): Promise<DeviceDoc | null> {
	if (!hash) return null;
	const col = await getDevicesCollection();
	return col.findOne({ hash }, options?.projection ? { projection: options.projection } : undefined);
}

/** Безопасное публичное представление устройства (не содержит `api_key`, `pin`, `mac`). */
export type PublicDevice = Omit<DeviceDoc, "api_key" | "pin" | "mac">;


