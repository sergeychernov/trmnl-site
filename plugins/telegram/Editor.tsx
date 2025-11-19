"use client";

import React from "react";
import { Stack, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { PluginEditorProps } from "../types";
import type { TelegramSettings } from "./index";

const FONT_SCALE_OPTIONS: Array<{ value: TelegramSettings["fontScale"]; label: string; helper: string }> = [
	{ value: -2, label: "Очень мелкий", helper: "-2" },
	{ value: -1, label: "Мелкий", helper: "-1" },
	{ value: 0, label: "Обычный", helper: "0" },
	{ value: 1, label: "Крупный", helper: "+1" },
	{ value: 2, label: "Очень крупный", helper: "+2" },
];

export default function TelegramEditor({ value, onChange }: PluginEditorProps<TelegramSettings>) {
	const settings = value ?? { fontScale: 0 };

	const handleFontScaleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
		const raw = String(event.target.value);
		const parsed = Number.parseInt(raw, 10) as TelegramSettings["fontScale"];
		onChange({
			...settings,
			fontScale: Number.isNaN(parsed) ? 0 : parsed,
		});
	};

	return (
		<Stack spacing={2}>
			<Typography variant="body2" color="text.secondary">
				Настройки отображения сообщений Telegram на экране TRMNL.
			</Typography>

			<FormControl size="small">
				<InputLabel id="telegram-font-scale-label">Размер шрифта</InputLabel>
				<Select
					labelId="telegram-font-scale-label"
					id="telegram-font-scale"
					label="Размер шрифта"
					value={String(settings.fontScale)}
					onChange={handleFontScaleChange}
				>
					{FONT_SCALE_OPTIONS.map((opt) => (
						<MenuItem key={opt.value} value={String(opt.value)}>
							{opt.label} ({opt.helper})
						</MenuItem>
					))}
				</Select>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
					Задаёт относительный размер текста: −2/−1 — мельче, +1/+2 — крупнее базового.
				</Typography>
			</FormControl>
		</Stack>
	);
}
