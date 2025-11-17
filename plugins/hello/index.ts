import React from "react";
import type { Plugin } from "../types";
import type { UserSettings, PluginRenderContext } from "@/plugins/types";
import type { PluginEditorProps } from "../types";
import HelloRender from "./Render";

export type HelloSettings = {
	timeZone: string; // IANA TZ, например "Europe/Moscow"
};

function validate(value: unknown): value is HelloSettings {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<HelloSettings>;
	return typeof v.timeZone === "string" && v.timeZone.length > 0;
}

const hello: Plugin<HelloSettings> = {
	id: "hello",
	name: "Приветствие",
	outputSizes: [], // без ограничений по размеру
	defaultSettings: { timeZone: "Europe/Moscow" },
	validate,
	editor: async () => (await import("./Editor")).default as unknown as React.ComponentType<PluginEditorProps<HelloSettings>>,
	render({ user, settings, width, height }: { user?: UserSettings; settings?: HelloSettings; context?: PluginRenderContext; width: number; height: number }) {
		const d = { ...hello.defaultSettings, ...(settings ?? {}) } as HelloSettings;
		const userName = (user?.name ?? "").trim();
		return React.createElement(HelloRender, { settings: d, userName, width, height });
	},
};

export default hello;


