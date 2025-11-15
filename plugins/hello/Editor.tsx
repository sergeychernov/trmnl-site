'use client';

import type { PluginEditorProps } from "../types";

type HelloSettings = {
	message: string;
	orientation: "landscape" | "portrait";
};

export default function HelloEditor({ value, onChange }: PluginEditorProps<HelloSettings>) {
	const update = (patch: Partial<HelloSettings>) => onChange({ ...value, ...patch });
	return (
		<div className="grid gap-3">
			<label className="grid gap-1">
				<span className="text-sm font-medium">Сообщение</span>
				<input
					type="text"
					value={value.message ?? ""}
					onChange={(e) => update({ message: e.target.value })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				/>
			</label>
			<label className="grid gap-1">
				<span className="text-sm font-medium">Ориентация</span>
				<select
					value={value.orientation ?? "landscape"}
					onChange={(e) => update({ orientation: e.target.value as HelloSettings["orientation"] })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				>
					<option value="landscape">Ландшафт</option>
					<option value="portrait">Портрет</option>
				</select>
			</label>
		</div>
	);
}


