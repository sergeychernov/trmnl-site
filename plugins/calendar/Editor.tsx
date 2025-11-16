"use client";

import type { PluginEditorProps } from "../types";
import { Stack, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, TextField } from "@mui/material";
import type { ChangeEvent } from "react";

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
		<Stack spacing={2}>
			<FormControl size="small">
				<InputLabel id="calendar-orientation-label">Ориентация</InputLabel>
				<Select
					labelId="calendar-orientation-label"
					label="Ориентация"
					value={value.orientation ?? "landscape"}
					onChange={(e: unknown) =>
						update({
							orientation: ((e as { target: { value: string } }).target.value as CalendarSettings["orientation"]),
						})
					}
				>
					<MenuItem value="landscape">Ландшафт</MenuItem>
					<MenuItem value="portrait">Портрет</MenuItem>
				</Select>
			</FormControl>
			<FormControlLabel
				control={
					<Switch
						checked={!!value.drawBorder}
						onChange={(e: ChangeEvent<HTMLInputElement>) => update({ drawBorder: e.target.checked })}
					/>
				}
				label="Рисовать рамку"
			/>
			<FormControlLabel
				control={
					<Switch
						checked={!!value.showMac}
						onChange={(e: ChangeEvent<HTMLInputElement>) => update({ showMac: e.target.checked })}
					/>
				}
				label="Показывать MAC"
			/>
			<TextField
				size="small"
				label="MAC (без двоеточий)"
				placeholder="a1b2c3d4e5f6"
				value={value.macHex ?? ""}
				onChange={(e: ChangeEvent<HTMLInputElement>) => update({ macHex: e.target.value.trim() || undefined })}
				error={!macValid}
				helperText={!macValid ? "Должно быть 12 шестнадцатеричных символов" : " "}
			/>
		</Stack>
	);
}


