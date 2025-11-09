import type { Plugin } from "./types";

// Реестр плагинов. Добавляйте новые плагины сюда.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import hello from "./hello";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import calendar from "./calendar";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import registration from "./registration";

const registry: Record<string, Plugin<any>> = {
	[hello.id]: hello,
	[calendar.id]: calendar,
	[registration.id]: registration,
};

export function listPlugins(): Plugin<any>[] {
	return Object.values(registry);
}

export function getPlugin<T extends object = Record<string, unknown>>(id: string): Plugin<T> | undefined {
	return registry[id] as Plugin<T> | undefined;
}

export type { Plugin } from "./types";


