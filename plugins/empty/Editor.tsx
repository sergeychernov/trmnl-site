"use client";

import type { PluginEditorProps } from "../types";

type EmptySettings = Record<string, never>;

export default function EmptyEditor({ value, onChange }: PluginEditorProps<EmptySettings>) {
	// Ничего редактировать не нужно — просто визуальный маркер
	return <div className="text-sm text-gray-500">Нет настраиваемых параметров</div>;
}


