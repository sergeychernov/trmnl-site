import type { Plugin } from "./types";

// Реестр плагинов. Добавляйте новые плагины сюда.
import hello from "./hello";
import symbols from "./supported-symbols";
import empty from "./empty";
import schoolSchedule from "./school-schedule";
import telegram from "./telegram";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, Plugin<any, any>> = {
	[hello.id]: hello,
	[symbols.id]: symbols,
	[empty.id]: empty,
	[schoolSchedule.id]: schoolSchedule,
	[telegram.id]: telegram,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listPlugins(): Plugin<any, any>[] {
	return Object.values(registry);
}

export function getPlugin<TSettings extends object = Record<string, unknown>, TData = unknown>(
	id: string,
): Plugin<TSettings, TData> | undefined {
	return registry[id] as Plugin<TSettings, TData> | undefined;
}

export * from "./types";


