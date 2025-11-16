"use client";

import type { PluginEditorProps } from "../types";
import { Stack, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";
import type { ChangeEvent } from "react";

type RegistrationSettings = {
	orientation: "landscape" | "portrait";
	marginModules?: number;
};

export default function RegistrationEditor({ value, onChange }: PluginEditorProps<RegistrationSettings>) {
	const update = (patch: Partial<RegistrationSettings>) => onChange({ ...value, ...patch });
	const margin = typeof value.marginModules === "number" ? value.marginModules : 4;
	return (
		<Stack spacing={2}>
			<FormControl size="small">
				<InputLabel id="registration-orientation-label">Ориентация</InputLabel>
				<Select
					labelId="registration-orientation-label"
					label="Ориентация"
					value={value.orientation}
					onChange={(e: unknown) =>
						update({
							orientation: ((e as { target: { value: string } }).target.value as RegistrationSettings["orientation"]),
						})
					}
				>
					<MenuItem value="landscape">Ландшафт</MenuItem>
					<MenuItem value="portrait">Портрет</MenuItem>
				</Select>
			</FormControl>
			<TextField
				size="small"
				type="number"
				label="Отступ (модули QR)"
				inputProps={{ min: 0, max: 64, step: 1 }}
				value={margin}
				onChange={(e: ChangeEvent<HTMLInputElement>) =>
					update({ marginModules: Math.max(0, Math.min(64, Number(e.target.value) || 0)) })
				}
			/>
		</Stack>
	);
}


