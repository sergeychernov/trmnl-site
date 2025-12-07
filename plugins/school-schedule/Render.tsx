import React from "react";
import SchoolScheduleView from "./View";
import type { ScheduleSettings } from "./index";

function getNowInTzParts(timeZone: string): { hour: number; minute: number; dow: number } {
	const fmt = new Intl.DateTimeFormat("en-GB", {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		weekday: "short",
	});
	const parts = fmt.formatToParts(new Date());
	const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
	const wd = String(map.weekday || "").toLowerCase();
	const dow = wd.startsWith("mon") ? 1 : wd.startsWith("tue") ? 2 : wd.startsWith("wed") ? 3 : wd.startsWith("thu") ? 4 : wd.startsWith("fri") ? 5 : wd.startsWith("sat") ? 6 : 0;
	return {
		hour: Number(map.hour || 0),
		minute: Number(map.minute || 0),
		dow,
	};
}

function isHHMM(s: string): boolean {
	return /^([01]\d|2[0-3]):([0-5]\d)$/.test(s.trim());
}

function hhmmToMinutes(s: string): number {
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
	if (!m) return 0;
	return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToHHMM(mins: number): string {
	const m = Math.max(0, Math.trunc(mins));
	const h = Math.floor(m / 60);
	const mm = m % 60;
	return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function dayKeyByDow(dow: number): "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" {
	switch (dow) {
		case 1:
			return "mon";
		case 2:
			return "tue";
		case 3:
			return "wed";
		case 4:
			return "thu";
		case 5:
			return "fri";
		case 6:
			return "sat";
		default:
			return "sun";
	}
}

type BuiltLesson = { start: string; end: string; startMin: number; endMin: number; title: string };

function buildDayLessons(dow: number, cfg: ScheduleSettings): BuiltLesson[] {
	const key = dayKeyByDow(dow);
	if (key === "sun") return [];
	const wk = key as keyof ScheduleSettings["schedule"];
	const titles: string[] = (cfg.schedule[wk] ?? []) as string[];
	const out: BuiltLesson[] = [];
	for (let i = 0; i < cfg.lessonStarts.length; i++) {
		const startStr = cfg.lessonStarts[i];
		if (!isHHMM(startStr)) continue;
		const title = String(titles[i] ?? "").trim();
		if (!title) continue;
		const startMin = hhmmToMinutes(startStr);
		const endMin = startMin + cfg.lessonDurationMin;
		out.push({ start: startStr, end: minutesToHHMM(endMin), startMin, endMin, title });
	}
	return out;
}

function pickDisplayDay(nowDow: number, nowMinutes: number, cfg: ScheduleSettings): { dow: number; lessons: BuiltLesson[] } {
	const today = buildDayLessons(nowDow, cfg);
	const lastStartToday = today.length > 0 ? Math.max(...today.map((l) => l.startMin)) : -1;

	// Пока не начался последний урок — показываем сегодняшний день.
	if (today.length > 0 && nowMinutes < lastStartToday) {
		return { dow: nowDow, lessons: today };
	}

	for (let i = 1; i <= 7; i++) {
		const d = ((nowDow + i) % 7) as number;
		const arr = buildDayLessons(d, cfg);
		if (arr.length > 0) return { dow: d, lessons: arr };
	}
	return { dow: nowDow, lessons: [] };
}

function rusDayName(dow: number): string {
	switch (dow) {
		case 1:
			return "Понедельник";
		case 2:
			return "Вторник";
		case 3:
			return "Среда";
		case 4:
			return "Четверг";
		case 5:
			return "Пятница";
		case 6:
			return "Суббота";
		default:
			return "Воскресенье";
	}
}

export default function SchoolScheduleRender(props: { settings: ScheduleSettings; width: number; height: number }) {
	const { settings: d, width } = props;
	const nowParts = getNowInTzParts(d.timeZone);
	const nowMinutes = nowParts.hour * 60 + nowParts.minute;
	const { dow, lessons } = pickDisplayDay(nowParts.dow, nowMinutes, d);
	const dayTitle = rusDayName(dow);

	const lines: string[] = [];
	lines.push(dayTitle);
	if (lessons.length === 0) {
		lines.push("Нет занятий");
	} else {
		for (const les of lessons) {
			const line = d.showTimes ? `${les.start}–${les.end} ${les.title}` : les.title;
			lines.push(line);
		}
	}

	const margin = 8;
	// Простые относительные размеры без расчёта метрик текста
	const titleSize = Math.max(20, Math.floor(width * 0.12));
	const rowSize = Math.max(18, Math.floor(width * 0.08));


	return <SchoolScheduleView lines={lines} titleSize={titleSize} rowSize={rowSize} margin={margin} />;
}


