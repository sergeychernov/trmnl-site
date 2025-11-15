"use client";

import type { PluginEditorProps } from "../types";

type RegistrationSettings = {
	orientation: "landscape" | "portrait";
	marginModules?: number;
};

export default function RegistrationEditor({ value, onChange }: PluginEditorProps<RegistrationSettings>) {
	const update = (patch: Partial<RegistrationSettings>) => onChange({ ...value, ...patch });
	const margin = typeof value.marginModules === "number" ? value.marginModules : 4;
	return (
		<div className="grid gap-3">
			<label className="grid gap-1">
				<span className="text-sm font-medium">Ориентация</span>
				<select
					value={value.orientation}
					onChange={(e) => update({ orientation: e.target.value as RegistrationSettings["orientation"] })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				>
					<option value="landscape">Ландшафт</option>
					<option value="portrait">Портрет</option>
				</select>
			</label>
			<label className="grid gap-1">
				<span className="text-sm font-medium">Отступ (модули QR)</span>
				<input
					type="number"
					min={0}
					max={64}
					step={1}
					value={margin}
					onChange={(e) => update({ marginModules: Math.max(0, Math.min(64, Number(e.target.value) || 0)) })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				/>
			</label>
		</div>
	);
}


