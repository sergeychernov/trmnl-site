'use client';

import type { PluginEditorProps } from "../types";

type HelloSettings = {
	timeZone: string;
};

export default function HelloEditor({ value, onChange }: PluginEditorProps<HelloSettings>) {
	const update = (patch: Partial<HelloSettings>) => onChange({ ...value, ...patch });
	return (
		<div className="grid gap-3">
			<label className="grid gap-1">
				<span className="text-sm font-medium">Часовой пояс (IANA)</span>
				<input
					type="text"
					placeholder="Europe/Moscow"
					value={value.timeZone ?? ""}
					onChange={(e) => update({ timeZone: e.target.value })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				/>
			</label>
		</div>
	);
}


