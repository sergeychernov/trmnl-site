import { ObjectId } from "mongodb";

export type Plugin = {
	name: string;
	settings: Record<string, unknown>;
}

export type DeviceDoc = {
	mac: string;
	hash: string;
	api_key: string;
	screen: string | null;
	refresh_schedule: unknown | null;
	timezone: string;
	last_update_time: Date | null;
	next_expected_update: Date | null;
	last_refresh_duration: number | null;
	battery_voltage: number | null;
	firmware_version: string | null;
	rssi: number | null;
	created_at: Date;
	updated_at: Date;
	pin?: string;
	registered_at?: Date;
	firmwareVersion?: string;
	hardware?: {
		model: string;
		width: number;
		height: number;
	};
	info?: {
		user?: {
			name?: string;
			age?: number;
			address?: string;
			room?: string;
		};
	};
	plugins?: Plugin[];
	layout?: LayoutConfig;
};

export type LayoutConfig = {
	orientation: "horizontal" | "vertical";
	portrait: boolean;
	/** Человекочитаемая запись пропорций вида "1:2:1" */
	ratiosText: string;
	/** Нормализованные числовые веса (например, [1,2,1]) */
	ratios: number[];
};

export type DeviceMemberDoc = {
	userId: ObjectId;
	deviceId: ObjectId;
	role: "owner" | "editor" | "viewer";
	status: "active" | "revoked" | "pending";
	alias?: string;
	addedBy?: ObjectId;
	createdAt: Date;
	updatedAt?: Date;
};

export type TelegramLinkDoc = {
	userId: ObjectId;
	linkCode: string;
	expiresAt: Date;
	createdAt: Date;
};

export type AccountDoc = {
	provider: string;
	userId: ObjectId;
	providerAccountId: string;
	access_token: string | null;
	refresh_token: string | null;
	extraData?: {
		username?: string | null;
		first_name?: string | null;
		last_name?: string | null;
	};
};

export type UserDoc = {
	_id?: ObjectId;
	email: string;
	name?: string | null;
	image?: string | null;
	emailVerified?: Date | null;
	passwordHash?: string | null;
};

// Обобщённый документ данных плагина для конкретного устройства
export type DataDevicePlugin<TData> = {
	deviceId: ObjectId;
	data: TData;
	createdAt: Date;
	createdBy: ObjectId;
};

// Данные плагина telegram для устройства (одна запись = одно сообщение)
export type DataDeviceTelegramDoc = DataDevicePlugin<string>;



