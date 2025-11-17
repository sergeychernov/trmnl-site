import type React from "react";
import { getPlugin } from "@/plugins";

type BlockConfig = { id: string; settings: Record<string, unknown> };
type PluginInfo = { id: string; name: string; defaultSettings: unknown };

type PluginEditorPanelProps = {
	selectedBlock: number;
	blocks: BlockConfig[];
	setBlocks: React.Dispatch<React.SetStateAction<BlockConfig[]>>;
	plugins: PluginInfo[];
	EditorComp: React.ComponentType<{ value: unknown; onChange: (next: unknown) => void }> | null;
};

export default function PluginEditorPanel({
	selectedBlock,
	blocks,
	setBlocks,
	plugins,
	EditorComp,
}: PluginEditorPanelProps) {
	const currentBlock = blocks[selectedBlock];
	const currentPlugin = currentBlock ? getPlugin(currentBlock.id) : null;
	const valueForEditor =
		currentPlugin
			? {
					...(currentPlugin.defaultSettings as Record<string, unknown>),
					...(currentBlock?.settings ?? {}),
			  }
			: (currentBlock?.settings ?? {});
	return (
		<div className="mt-3">
			<label className="block text-sm font-medium mb-1">Блок #{selectedBlock + 1}</label>
			<select
				value={blocks[selectedBlock]?.id ?? ""}
				onChange={(e) => {
					const newId = e.target.value;
					const p = getPlugin(newId);
					setBlocks((prev) => {
						const next = [...prev];
						next[selectedBlock] = { id: newId, settings: p ? ((p.defaultSettings as unknown) as Record<string, unknown>) : {} };
						return next;
					});
				}}
				className="px-3 py-2 rounded-md border bg-white"
			>
				{plugins.map((p) => (
					<option key={p.id} value={p.id}>
						{p.name}
					</option>
				))}
			</select>
			<div className="mt-3 border rounded-md p-3">
				{EditorComp ? (
					<EditorComp
						value={valueForEditor as unknown}
						onChange={(next: unknown) => {
							setBlocks((prev) => {
								const arr = [...prev];
								const curr = arr[selectedBlock];
								if (!curr) return prev;
								arr[selectedBlock] = { ...curr, settings: (next as Record<string, unknown>) };
								return arr;
							});
						}}
					/>
				) : (
					<div className="text-sm text-gray-500">Редактор плагина недоступен</div>
				)}
			</div>
		</div>
	);
}


