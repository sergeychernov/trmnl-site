"use client";

import type { PluginEditorProps } from "../types";
import { Stack, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

type SymbolsSettings = {
	orientation: "landscape" | "portrait";
};

export default function SupportedSymbolsEditor({ value, onChange }: PluginEditorProps<SymbolsSettings>) {
	const update = (patch: Partial<SymbolsSettings>) => onChange({ ...value, ...patch });
	return (
		<Stack spacing={2}>
			<FormControl size="small">
				<InputLabel id="symbols-orientation-label">Ориентация</InputLabel>
				<Select
					labelId="symbols-orientation-label"
					label="Ориентация"
					value={value.orientation}
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


