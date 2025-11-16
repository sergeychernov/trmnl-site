"use client";

import type { PluginEditorProps } from "../types";

type CalendarSettings = {
	orientation: "landscape" | "portrait";
	drawBorder: boolean;
	showMac: boolean;
	macHex?: string;
};

export default function CalendarEditor({ value, onChange }: PluginEditorProps<CalendarSettings>) {
	const update = (patch: Partial<CalendarSettings>) => onChange({ ...value, ...patch });
	const macValid = !value.macHex || /^[0-9a-fA-F]{12}$/.test(value.macHex);
	return (
		<div className="grid gap-3">
			<label className="grid gap-1">
				<span className="text-sm font-medium">Ориентация</span>
				<select
					value={value.orientation ?? "landscape"}
					onChange={(e) => update({ orientation: e.target.value as CalendarSettings["orientation"] })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				>
					<option value="landscape">Ландшафт</option>
					<option value="portrait">Портрет</option>
				</select>
			</label>
			<label className="inline-flex items-center gap-2">
				<input
					type="checkbox"
					checked={!!value.drawBorder}
					onChange={(e) => update({ drawBorder: e.target.checked })}
				/>
				<span className="text-sm">Рисовать рамку</span>
			</label>
			<label className="inline-flex items-center gap-2">
				<input
					type="checkbox"
					checked={!!value.showMac}
					onChange={(e) => update({ showMac: e.target.checked })}
				/>
				<span className="text-sm">Показывать MAC</span>
			</label>
			<label className="grid gap-1">
				<span className="text-sm font-medium">MAC (без двоеточий)</span>
				<input
					type="text"
					inputMode="text"
					placeholder="e.g. a1b2c3d4e5f6"
					value={value.macHex ?? ""}
					onChange={(e) => update({ macHex: e.target.value.trim() || undefined })}
					className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
				/>
				{!macValid && <span className="text-xs text-red-600">Должно быть 12 шестнадцатеричных символов</span>}
			</label>
		</div>
	);
}


