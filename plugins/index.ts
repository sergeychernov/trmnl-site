import type { Plugin } from "./types";

// Реестр плагинов. Добавляйте новые плагины сюда.
import hello from "./hello";
import calendar from "./calendar";
import registration from "./registration";
import symbols from "./supported-symbols";
import empty from "./empty";
import schoolSchedule from "./school-schedule";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, Plugin<any>> = {
	[hello.id]: hello,
	[calendar.id]: calendar,
	[registration.id]: registration,
	[symbols.id]: symbols,
	[empty.id]: empty,
	[schoolSchedule.id]: schoolSchedule,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listPlugins(): Plugin<any>[] {
	return Object.values(registry);
}

export function getPlugin<T extends object = Record<string, unknown>>(id: string): Plugin<T> | undefined {
	return registry[id] as Plugin<T> | undefined;
}

export * from "./types";


