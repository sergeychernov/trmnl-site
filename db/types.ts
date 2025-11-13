import { ObjectId } from "mongodb";

export type DeviceDoc = {
	friendly_id: string;
	name: string;
	mac: string;
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


