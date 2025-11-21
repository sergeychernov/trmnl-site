import type React from "react";

// Импортируем MDX‑документацию плагинов.
// Для каждого плагина можно добавлять новые локали по мере появления файлов.
import HelloDocsRu from "./hello/docs/ru.mdx";
import HelloDocsEn from "./hello/docs/en.mdx";
import SchoolScheduleDocsRu from "./school-schedule/docs/ru.mdx";
import SchoolScheduleDocsEn from "./school-schedule/docs/en.mdx";

export type Locale = "ru" | "en";

type DocsComponent = React.ComponentType;

type PluginDocsMap = Partial<Record<Locale, DocsComponent>>;

const docsRegistry: Record<string, PluginDocsMap> = {
	hello: {
		ru: HelloDocsRu,
		en: HelloDocsEn,
	},
	"school-schedule": {
		ru: SchoolScheduleDocsRu,
		en: SchoolScheduleDocsEn,
	},
	// Для остальных плагинов можно добавить записи по мере появления docs.mdx
};

/**
 * Возвращает React‑компонент с документацией плагина для указанной локали.
 * Если точного совпадения по locale нет, пытается вернуть русскую или английскую
 * версию как fallback. Если документация не найдена вообще — вернёт undefined.
 */
export function getPluginDocs(id: string, locale: Locale): DocsComponent | undefined {
	const entry = docsRegistry[id];
	if (!entry) return undefined;

	return entry[locale] ?? entry.ru ?? entry.en;
}

/**
 * Возвращает список доступных локалей документации для указанного плагина.
 */
export function getAvailableDocLocales(id: string): Locale[] {
	const entry = docsRegistry[id];
	if (!entry) return [];
	return (Object.keys(entry) as Locale[]).sort();
}


