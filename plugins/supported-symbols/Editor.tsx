"use client";

import type { PluginEditorProps } from "../types";

type SymbolsSettings = {
	orientation: "landscape" | "portrait";
};

export default function SupportedSymbolsEditor({ value, onChange }: PluginEditorProps<SymbolsSettings>) {
	const update = (patch: Partial<SymbolsSettings>) => onChange({ ...value, ...patch });
	return (
		<div className="grid gap-3">
			<label className="grid gap-1">
				<span className="text-sm font-medium">Ориентация</span>
				<select
					value={value.orientation}
					onChange={(e) => update({ orientation: e.target.value as SymbolsSettings["orientation"] })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				>
					<option value="landscape">Ландшафт</option>
					<option value="portrait">Портрет</option>
				</select>
			</label>
		</div>
	);
}


