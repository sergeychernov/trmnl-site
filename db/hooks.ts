'use client';

import { useCallback, useEffect, useState } from "react";
import type { DeviceDoc } from "./types";

export type PublicDevice = Omit<DeviceDoc, "api_key" | "pin" | "mac">;

export type UseDeviceByHashResult = {
	device: PublicDevice | null;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
};

/** React‑хук для загрузки устройства из коллекции `devices` по его `hash`. */
export function useDeviceByHash(hash: string | null | undefined): UseDeviceByHashResult {
	const [device, setDevice] = useState<PublicDevice | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchDevice = useCallback(async () => {
		if (!hash) {
			setDevice(null);
			setError(null);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/device/by-hash?id=${encodeURIComponent(hash)}`, { cache: "no-store" });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const data = (await res.json().catch(() => ({}))) as { device?: PublicDevice | null };
			setDevice(data.device ?? null);
		} catch {
			setDevice(null);
			setError("Не удалось загрузить данные устройства");
		} finally {
			setLoading(false);
		}
	}, [hash]);

	useEffect(() => {
		void fetchDevice();
	}, [fetchDevice]);

	return { device, loading, error, refetch: fetchDevice };
}


