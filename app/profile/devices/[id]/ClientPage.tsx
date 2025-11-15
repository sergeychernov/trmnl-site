"use client";

import { useEffect, useMemo, useState } from "react";
import PageLayout from "@/app/components/layouts/PageLayout";
import RenderLayout from "@/app/components/layouts/RenderLayout";
import { getSizesByRatios } from "@lib/ratios";
import SettingsTabs from "./Tabs";
import type { PublicDevice } from "@/db/devices";
import type { LayoutConfig } from "@/db/types";
import DeviceMeta from "./DeviceMeta";
import RenderLayoutEditor from "./RenderLayoutEditor";
import Image from "next/image";
import { listPlugins, getPlugin } from "@/plugins";
import PluginEditorPanel from "./PluginEditorPanel";

type ClientPageProps = {
	id: string;
	device: PublicDevice | null;
};

export default function ClientPage({ id, device }: ClientPageProps) {

	return (
		<PageLayout title="Настройки" tabs={<SettingsTabs />}>
			<DeviceMeta id={id} device={device} />

			{/* Панель настроек RenderLayout + превью */}
			{device && <RenderLayoutControlsAndPreview id={id} device={device} />}
		</PageLayout>
	);
}

function RenderLayoutControlsAndPreview({ id, device }: { id: string; device: PublicDevice }) {
	const width = device?.hardware?.width ?? 800;
	const height = device?.hardware?.height ?? 480;
	const [editorState, setEditorState] = useState<{
		orientation: "horizontal" | "vertical";
		portrait: boolean;
		ratiosText: string;
		ratios: number[] | undefined;
	}>({
		orientation: device?.layout?.orientation ?? "horizontal",
		portrait: device?.layout?.portrait ?? false,
		ratiosText: device?.layout?.ratiosText ?? "1",
		ratios: device?.layout?.ratios ?? undefined,
	});
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const childCount = Math.max(1, editorState.ratios ? editorState.ratios.length : 1);
	const effectiveWidth = editorState.portrait ? height : width;
	const effectiveHeight = editorState.portrait ? width : height;
	const blockSizes = useMemo(
		() => getSizesByRatios(editorState.ratios, editorState.orientation, effectiveWidth, effectiveHeight),
		[editorState.ratios, editorState.orientation, effectiveWidth, effectiveHeight],
	);
	const plugins = useMemo(() => listPlugins(), []);
	const defaultPlugin = plugins.find((p) => p.id === "empty") ?? plugins[0];
	const [selectedBlock, setSelectedBlock] = useState(0);
	const [blocks, setBlocks] = useState<Array<{ id: string; settings: Record<string, unknown> }>>(
		() => Array.from({ length: childCount }, () => ({ id: defaultPlugin?.id ?? "empty", settings: defaultPlugin?.defaultSettings ?? {} })),
	);
	// Загрузка сохранённых плагинов устройства
	useEffect(() => {
		let cancelled = false;
		async function loadPlugins() {
			try {
				const res = await fetch(`/api/device/layout?id=${encodeURIComponent(id)}`, { cache: "no-store" });
				if (!res.ok) return;
				const data = await res.json().catch(() => null) as { plugins?: Array<{ name: string; settings: Record<string, unknown> }> } | null;
				const saved = Array.isArray(data?.plugins) ? data!.plugins : null;
				if (cancelled || !saved) return;
				setBlocks(saved.map((p) => ({ id: p.name, settings: p.settings ?? {} })));
				setSelectedBlock(0);
			} catch {
				// ignore
			}
		}
		void loadPlugins();
		return () => {
			cancelled = true;
		};
	}, [id]);
	// Подгоняем длину blocks под текущее количество блоков
	useEffect(() => {
		setBlocks((prev) => {
			const next = [...prev];
			if (next.length < childCount) {
				const fillWith = { id: defaultPlugin?.id ?? "empty", settings: defaultPlugin?.defaultSettings ?? {} };
				while (next.length < childCount) next.push({ ...fillWith });
			} else if (next.length > childCount) {
				next.length = childCount;
			}
			return next;
		});
		if (selectedBlock >= childCount) {
			setSelectedBlock(Math.max(0, childCount - 1));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [childCount]);
	// Динамически подгружаем редактор выбранного плагина
	const [EditorComp, setEditorComp] = useState<null | React.ComponentType<{ value: unknown; onChange: (next: unknown) => void }>>(null);
	useEffect(() => {
		const current = blocks[selectedBlock];
		if (!current) {
			setEditorComp(null);
			return;
		}
		const p = getPlugin(current.id);
		if (!p) {
			setEditorComp(null);
			return;
		}
		let cancelled = false;
		p.editor().then((Comp) => {
			if (!cancelled) setEditorComp(() => Comp as unknown as React.ComponentType<{ value: unknown; onChange: (next: unknown) => void }>);
		}).catch(() => {
			if (!cancelled) setEditorComp(null);
		});
		return () => {
			cancelled = true;
		};
	}, [blocks, selectedBlock]);

	async function handleSaveLayout() {
		setSaving(true);
		setSaveError(null);
		try {
			const layout: LayoutConfig = {
				orientation: editorState.orientation,
				portrait: editorState.portrait,
				ratiosText: editorState.ratiosText,
				ratios: (editorState.ratios && editorState.ratios.length > 0) ? editorState.ratios : [1],
			};
			const pluginsPayload = blocks.map((b) => ({ name: b.id, settings: b.settings }));
			const res = await fetch("/api/device/layout", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id, layout, plugins: pluginsPayload }),
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
		} catch {
			setSaveError("Не удалось сохранить компоновку");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-8">
			<div>
				<RenderLayoutEditor
					width={width}
					height={height}
					initialOrientation={editorState.orientation}
					initialRatiosText={editorState.ratiosText}
					initialPortrait={editorState.portrait}
					onChange={setEditorState}
				/>
				<PluginEditorPanel
					selectedBlock={selectedBlock}
					blocks={blocks}
					setBlocks={setBlocks}
					plugins={plugins.map((p) => ({ id: p.id, name: p.name, defaultSettings: p.defaultSettings }))}
					EditorComp={EditorComp}
				/>
				<div className="mt-3 flex items-center gap-3">
					<button
						onClick={handleSaveLayout}
						disabled={saving}
						className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-60"
					>
						{saving ? "Сохранение..." : "Сохранить компоновку"}
					</button>
					{saveError && <span className="text-sm text-red-600">{saveError}</span>}
				</div>
			</div>
			<div className="rounded-lg border border-gray-200 p-4 overflow-auto lg:col-span-2">
				<RenderLayout width={effectiveWidth} height={effectiveHeight} ratios={editorState.ratios} orientation={editorState.orientation}>
					{Array.from({ length: childCount }).map((_, idx) => {
						const w = blockSizes[idx]?.width ?? 0;
						const h = blockSizes[idx]?.height ?? 0;
						const blk = blocks[idx] ?? { id: defaultPlugin?.id ?? "empty", settings: defaultPlugin?.defaultSettings ?? {} };
						const settingsParam = encodeURIComponent(JSON.stringify(blk.settings ?? {}));
						const src = `/api/render/plugin?plugin=${encodeURIComponent(blk.id)}&width=${w}&height=${h}&index=${idx + 1}&settings=${settingsParam}`;
						return (
							<button
								type="button"
								key={idx}
								onClick={() => setSelectedBlock(idx)}
								className={`w-full h-full`}
								style={{ lineHeight: 0 }}
								aria-label={`Выбрать блок ${idx + 1}`}
							>
								<Image src={src} alt={`block-${idx + 1}`} width={w} height={h} className="w-full h-full object-contain" />
							</button>
						);
					})}
				</RenderLayout>
			</div>
		</div>
	);
}


