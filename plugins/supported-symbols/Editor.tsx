"use client";

import type { PluginEditorProps } from "../types";
import { Stack, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

type SymbolsSettings = {
	orientation: "landscape" | "portrait";
};

export default function SupportedSymbolsEditor({ value, onChange }: PluginEditorProps<SymbolsSettings>) {
	const current: SymbolsSettings =
		value && (value as Partial<SymbolsSettings>).orientation && ((value as Partial<SymbolsSettings>).orientation === "landscape" || (value as Partial<SymbolsSettings>).orientation === "portrait")
			? (value as SymbolsSettings)
			: { orientation: "landscape" };
	const update = (patch: Partial<SymbolsSettings>) => onChange({ ...current, ...patch });
	return (
		<Stack spacing={2}>
			<FormControl size="small">
				<InputLabel id="symbols-orientation-label">Ориентация</InputLabel>
				<Select
					labelId="symbols-orientation-label"
					label="Ориентация"
					value={current.orientation}
					onChange={(e: unknown) =>
						update({
							orientation: ((e as { target: { value: string } }).target.value as SymbolsSettings["orientation"]),
						})
					}
				>
					<MenuItem value="landscape">Ландшафт</MenuItem>
					<MenuItem value="portrait">Портрет</MenuItem>
				</Select>
			</FormControl>
		</Stack>
	);
}


