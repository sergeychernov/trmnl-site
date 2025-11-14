"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadSettingsFromLocalStorage, saveSettingsToLocalStorage, parseSettings, type Settings } from "@lib/settings";
import { listPlugins, getPlugin } from "@/plugins";
import PageLayout from "@/app/components/layouts/PageLayout";
import SettingsTabs from "../Tabs";

type Params = { id?: string };

export default function SettingsUserPage() {
	const params = useParams<Params>();
	const idParam = useMemo(() => {
		const raw = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
		return raw ?? "";
	}, [params]);

	const plugins = useMemo(() => listPlugins(), []);
	const [userName, setUserName] = useState("");
	const [userAge, setUserAge] = useState<number | "">("");
	const [pluginId, setPluginId] = useState<string>(plugins[0]?.id ?? "");
	const [pluginSettingsText, setPluginSettingsText] = useState<string>("");
	const [saved, setSaved] = useState<null | Settings>(null);
	const [initializing, setInitializing] = useState(true);

	useEffect(() => {
		let cancelled = false;
		async function init() {
			if (!idParam) return;
			setInitializing(true);
			const existing = loadSettingsFromLocalStorage(idParam);
			if (existing) {
				if (cancelled) return;
				setUserName(existing.user.name);
				setUserAge(existing.user.age);
				setPluginId(existing.device.pluginId);
				setPluginSettingsText(JSON.stringify(existing.device.pluginSettings, null, 2));
				setSaved(existing);
				setInitializing(false);
				return;
			}
			try {
				const res = await fetch(`/api/settings/${encodeURIComponent(idParam)}`, { cache: "no-store" });
				if (cancelled) return;
				if (res.ok) {
					const data = await res.json().catch(() => null);
					const parsed = data?.settings ? parseSettings(data.settings) : null;
					if (parsed) {
						setUserName(parsed.user.name);
						setUserAge(parsed.user.age);
						setPluginId(parsed.device.pluginId);
						setPluginSettingsText(JSON.stringify(parsed.device.pluginSettings, null, 2));
						setSaved(parsed);
						setInitializing(false);
						return;
					}
				}
			} catch {
				// ignore
			}
			const p = getPlugin(pluginId) ?? plugins[0];
			if (p) {
				setPluginSettingsText(JSON.stringify(p.defaultSettings, null, 2));
			}
			setInitializing(false);
		}
		void init();
		return () => {
			cancelled = true;
		};
	}, [idParam]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const plugin = getPlugin(pluginId) ?? plugins[0];
		const parsedDeviceSettings = (() => {
			try {
				return JSON.parse(pluginSettingsText || "{}");
			} catch {
				return plugin?.defaultSettings ?? {};
			}
		})();
		const settings: Settings = {
			user: {
				name: userName.trim(),
				age: typeof userAge === "number" ? userAge : parseInt(String(userAge || "0"), 10) || 0,
			},
			device: {
				pluginId: plugin?.id ?? pluginId,
				pluginSettings: parsedDeviceSettings,
			},
		};
		saveSettingsToLocalStorage(idParam, settings);
		setSaved(settings);
		try {
			await fetch(`/api/settings/${encodeURIComponent(idParam)}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(settings),
			});
		} catch {
			// ignore
		}
	}

	return (
		<PageLayout title="Настройки" tabs={<SettingsTabs />}>
			<p style={{ color: "#555", marginBottom: 24 }}>
				ID устройства (хеш MAC): <code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>{idParam || "—"}</code>
			</p>

			<form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
				<fieldset style={{ display: "grid", gap: 12 }}>
					<legend style={{ fontWeight: 600, marginBottom: 4 }}>Настройки пользователя</legend>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Имя</span>
						<input
							type="text"
							value={userName}
							onChange={(e) => setUserName(e.target.value)}
							placeholder="Иван Иванов"
							required
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
							}}
						/>
					</label>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Возраст</span>
						<input
							type="number"
							min={0}
							value={userAge}
							onChange={(e) => setUserAge(e.target.value === "" ? "" : Number(e.target.value))}
							placeholder="30"
							required
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
							}}
						/>
					</label>
				</fieldset>

				<div style={{ display: "flex", gap: 12 }}>
					<button
						type="submit"
						style={{
							padding: "10px 16px",
							background: "black",
							color: "white",
							border: "none",
							borderRadius: 8,
							cursor: "pointer",
						}}
					>
						Сохранить
					</button>
				</div>
			</form>

			{saved && (
				<p style={{ marginTop: 16, color: "#14834e" }}>
					Сохранено локально для ID <code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>{idParam}</code>.
				</p>
			)}
		</PageLayout>
	);
}


