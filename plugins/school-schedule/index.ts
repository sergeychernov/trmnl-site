import type { Plugin } from "../types";
import React from "react";
import type { UserSettings, PluginRenderContext } from "@/plugins/types";
import SchoolScheduleRender from "./Render";
import SchoolScheduleEditor from "./Editor";
import type { PluginEditorProps } from "../types";

type WeekSchedule = {
	mon: string[];
	tue: string[];
	wed: string[];
	thu: string[];
	fri: string[];
	sat?: string[];
};

export type ScheduleSettings = {
	timeZone: string; // IANA TZ, например "Europe/Moscow"
	lessonDurationMin: number; // длительность урока в минутах
	lessonStarts: string[]; // массив HH:MM — начала уроков (единый для всех дней)
	showTimes: boolean; // показывать ли время начала/конца в строках расписания
	schedule: WeekSchedule;
};

function isHHMM(s: unknown): s is string {
	return typeof s === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(s.trim());
}

function isWeekSchedule(x: unknown): x is WeekSchedule {
	if (!x || typeof x !== "object") return false;
	const v = x as Partial<WeekSchedule>;
	const checkArr = (arr: unknown) => Array.isArray(arr) && arr.every((t) => typeof t === "string");
	const baseOk =
		checkArr(v.mon) &&
		checkArr(v.tue) &&
		checkArr(v.wed) &&
		checkArr(v.thu) &&
		checkArr(v.fri);
	if (!baseOk) return false;
	if (v.sat != null && !Array.isArray(v.sat)) return false;
	if (Array.isArray(v.sat) && !v.sat.every((t) => typeof t === "string")) return false;
	return true;
}

function validate(value: unknown): value is ScheduleSettings {
	if (!value || typeof value !== "object") return false;
	const v = value as Partial<ScheduleSettings>;
	const tzOk = typeof v.timeZone === "string";
	const durOk = Number.isFinite(v.lessonDurationMin as number) && (v.lessonDurationMin as number) > 0;
	const startsOk = Array.isArray(v.lessonStarts) && v.lessonStarts.length > 0 && v.lessonStarts.every(isHHMM);
	const showTimesOk = typeof v.showTimes === "boolean";
	return tzOk && durOk && startsOk && showTimesOk && isWeekSchedule(v.schedule);
}

// Вся логика рендера перенесена в ./Render.tsx

const schoolSchedule: Plugin<ScheduleSettings> = {
	id: "school-schedule",
	name: "Школьное расписание",
	refreshRate: 3300,//40 минут время урока и 15 минут вернуться
	outputSizes: [], // без ограничений по размеру — работает в превью блоков любых размеров
	defaultSettings: {
		timeZone: "Europe/Moscow",
		lessonDurationMin: 45,
		lessonStarts: ["08:30", "09:25", "10:30", "11:25", "12:20", "13:15"],
		showTimes: true,
		schedule: {
			mon: ["Математика", "Русский язык", "История", "Английский"],
			tue: ["Литература", "Физкультура", "Физика", "Труд"],
			wed: [],
			thu: [],
			fri: [],
			sat: [],
		},
	},
	validate,
	editor: async () => (SchoolScheduleEditor as unknown as React.ComponentType<PluginEditorProps<ScheduleSettings>>),
	render({ settings, width, height }: { user?: UserSettings; settings?: ScheduleSettings; context?: PluginRenderContext; width: number; height: number }) {
		// Мержим с дефолтами, чтобы отсутствующие поля (напр. showTimes) не сбрасывались
		const d = { ...schoolSchedule.defaultSettings, ...(settings ?? {}) } as ScheduleSettings;
		return React.createElement(SchoolScheduleRender, { settings: d, width, height });
	},
};

export default schoolSchedule;


