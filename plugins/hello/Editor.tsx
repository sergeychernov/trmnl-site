'use client';

import type { PluginEditorProps } from "../types";
import { Stack, TextField, Typography } from "@mui/material";
import type { ChangeEvent } from "react";

type HelloSettings = {
	timeZone: string;
};

export default function HelloEditor({ value, onChange }: PluginEditorProps<HelloSettings>) {
	const update = (patch: Partial<HelloSettings>) => onChange({ ...value, ...patch });
	return (
		<Stack spacing={2}>
			<Typography variant="subtitle2">Часовой пояс (IANA)</Typography>
			<TextField
				size="small"
				fullWidth
				placeholder="Europe/Moscow"
				value={value.timeZone ?? ""}
				onChange={(e: ChangeEvent<HTMLInputElement>) => update({ timeZone: e.target.value })}
			/>
		</Stack>
	);
}


