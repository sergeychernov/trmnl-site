"use client";

import type { PluginEditorProps } from "../types";
import { Typography } from "@mui/material";

type EmptySettings = Record<string, never>;

export default function EmptyEditor({ value, onChange }: PluginEditorProps<EmptySettings>) {
	// Ничего редактировать не нужно — просто визуальный маркер
	return <Typography variant="body2" color="text.secondary">Нет настраиваемых параметров</Typography>;
}


