export type UserSettings = {
	name: string;
	age: number;
};

export type DeviceSettings = {
	pluginId: string;
	pluginSettings: unknown;
};

export type Settings = {
	user: UserSettings;
	device: DeviceSettings;
};

export function getSettingsStorageKey(id: string): string {
	return `settings:${id}`;
}

export function parseSettings(raw: unknown): Settings | null {
	if (!raw || typeof raw !== "object") return null;
	const value = raw as Partial<Settings>;
	if (
		!value.user ||
		typeof value.user.name !== "string" ||
		typeof value.user.age !== "number" ||
		!value.device ||
		typeof (value.device as DeviceSettings).pluginId !== "string"
	) {
		return null;
	}
	return value as Settings;
}

export function loadSettingsFromLocalStorage(id: string): Settings | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(getSettingsStorageKey(id));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		return parseSettings(parsed);
	} catch {
		return null;
	}
}

export function saveSettingsToLocalStorage(id: string, settings: Settings): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(getSettingsStorageKey(id), JSON.stringify(settings));
	} catch {
		// ignore
	}
}


