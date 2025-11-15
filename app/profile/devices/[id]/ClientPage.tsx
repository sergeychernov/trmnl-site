/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { loadSettingsFromLocalStorage, saveSettingsToLocalStorage, parseSettings, type Settings } from "@lib/settings";
import { listPlugins, getPlugin } from "@/plugins";
import PageLayout from "@/app/components/layouts/PageLayout";
import RenderLayout from "@/app/components/layouts/RenderLayout";
import SettingsTabs from "./Tabs";
import type { PublicDevice } from "@/db/devices";
import DeviceMeta from "./DeviceMeta";
import RenderLayoutEditor from "./RenderLayoutEditor";

type ClientPageProps = {
	id: string;
	device: PublicDevice | null;
};

export default function ClientPage({ id, device }: ClientPageProps) {

	const plugins = useMemo(() => listPlugins(), []);
	const [userName, setUserName] = useState("");
	const [userAge, setUserAge] = useState<number | "">("");
	const [pluginId, setPluginId] = useState<string>(plugins[0]?.id ?? "");
	const [pluginSettingsText, setPluginSettingsText] = useState<string>("");
	const [pluginSettingsError, setPluginSettingsError] = useState<string>("");
	const [saved, setSaved] = useState<null | Settings>(null);
	const [initializing, setInitializing] = useState(true);

	useEffect(() => {
		let cancelled = false;
		async function init() {
			if (!id) return;
			setInitializing(true);
			const existing = loadSettingsFromLocalStorage(id);
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
			// Пробуем подтянуть из БД
			try {
				const res = await fetch(`/api/settings/${encodeURIComponent(id)}`, { cache: "no-store" });
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
				// игнорируем сетевые ошибки
			}
			// Фоллбек — настройки по умолчанию текущего плагина
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
	}, [id]);

	useEffect(() => {
		// Смена плагина пользователем -> подставим его настройки по умолчанию
		if (initializing) return;
		const p = getPlugin(pluginId);
		if (p) {
			setPluginSettingsText(JSON.stringify(p.defaultSettings, null, 2));
			setPluginSettingsError("");
		}
	}, [pluginId, initializing]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setPluginSettingsError("");
		const plugin = getPlugin(pluginId);
		if (!plugin) {
			setPluginSettingsError("Не выбран плагин");
			return;
		}
		let parsedSettings: unknown;
		try {
			parsedSettings = JSON.parse(pluginSettingsText || "{}");
		} catch {
			setPluginSettingsError("Некорректный JSON настроек плагина");
			return;
		}
		if (!plugin.validate(parsedSettings)) {
			setPluginSettingsError("Настройки плагина не проходят валидацию");
			return;
		}
		const settings: Settings = {
			user: {
				name: userName.trim(),
				age: typeof userAge === "number" ? userAge : parseInt(String(userAge || "0"), 10) || 0,
			},
			device: {
				pluginId: plugin.id,
				pluginSettings: parsedSettings,
			},
		};
		saveSettingsToLocalStorage(id, settings);
		setSaved(settings);
		// Также сохраним в БД через API
		try {
			await fetch(`/api/settings/${encodeURIComponent(id)}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(settings),
			});
		} catch {
			// игнорируем сетевые ошибки, локальное сохранение уже выполнено
		}
	}

	return (
		<PageLayout title="Настройки" tabs={<SettingsTabs />}>
			<DeviceMeta id={id} device={device} />

			{/* Панель настроек RenderLayout + превью */}
			{device && <RenderLayoutControlsAndPreview device={device} />}

			<form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
				<fieldset style={{ display: "grid", gap: 12 }}>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Выбранный плагин</span>
						<select
							value={pluginId}
							onChange={(e) => setPluginId(e.target.value)}
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
								background: "white",
							}}
						>
							{plugins.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
					</label>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Настройки плагина (JSON)</span>
						<textarea
							value={pluginSettingsText}
							onChange={(e) => setPluginSettingsText(e.target.value)}
							rows={8}
							spellCheck={false}
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
								resize: "vertical",
								fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
							}}
						/>
						{pluginSettingsError && (
							<span style={{ color: "#b91c1c" }}>{pluginSettingsError}</span>
						)}
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
					Сохранено локально для ID <code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>{id}</code>.
				</p>
			)}
		</PageLayout>
	);
}

function RenderLayoutControlsAndPreview({ device }: { device: PublicDevice }) {
	const width = device?.hardware?.width ?? 800;
	const height = device?.hardware?.height ?? 480;
	const [editorState, setEditorState] = useState<{
		orientation: "horizontal" | "vertical";
		portrait: boolean;
		ratiosText: string;
		ratios: number[] | undefined;
	}>({
		orientation: "horizontal",
		portrait: false,
		ratiosText: "1:1",
		ratios: undefined,
	});

	const childCount = Math.max(1, editorState.ratios ? editorState.ratios.length : 1);
	const effectiveWidth = editorState.portrait ? height : width;
	const effectiveHeight = editorState.portrait ? width : height;

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-8">
			<RenderLayoutEditor
				width={width}
				height={height}
				initialOrientation={editorState.orientation}
				initialRatiosText={editorState.ratiosText}
				initialPortrait={editorState.portrait}
				onChange={setEditorState}
			/>
			<div className="rounded-lg border border-gray-200 p-4 overflow-auto lg:col-span-2">
				<RenderLayout width={effectiveWidth} height={effectiveHeight} ratios={editorState.ratios} orientation={editorState.orientation}>
					{Array.from({ length: childCount }).map((_, idx) => (
						<div
							key={idx}
							className="w-full h-full flex items-center justify-center text-sm"
							style={{ background: idx % 2 === 0 ? "#f3f4f6" : "#e5e7eb", border: "1px dashed #cbd5e1" }}
						>
							Блок {idx + 1}
						</div>
					))}
				</RenderLayout>
			</div>
		</div>
	);
}


