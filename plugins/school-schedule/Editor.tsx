"use client";

import type { PluginEditorProps } from "../types";
import { useMemo, useState } from "react";

type WeekSchedule = {
	mon: string[];
	tue: string[];
	wed: string[];
	thu: string[];
	fri: string[];
	sat?: string[];
};
type ScheduleSettings = {
	timeZone: string;
	lessonDurationMin: number;
	lessonStarts: string[];
	showTimes: boolean;
	schedule: WeekSchedule;
};

const dayTabs = [
	{ key: "general", label: "Общие" },
	{ key: "mon", label: "Пн" },
	{ key: "tue", label: "Вт" },
	{ key: "wed", label: "Ср" },
	{ key: "thu", label: "Чт" },
	{ key: "fri", label: "Пт" },
	{ key: "sat", label: "Сб" },
] as const;

export default function SchoolScheduleEditor({ value, onChange }: PluginEditorProps<ScheduleSettings>) {
	const [tab, setTab] = useState<(typeof dayTabs)[number]["key"]>("general");

	// Безопасные значения по умолчанию для несовместимых/пустых настроек
	const lessonStarts = Array.isArray(value?.lessonStarts) ? value.lessonStarts as string[] : [];
	const slotsCount = lessonStarts.length;

	const ensureDayLength = (arr: string[]): string[] => {
		const next = arr.slice(0, slotsCount);
		while (next.length < slotsCount) next.push("");
		return next;
	};

	const update = (patch: Partial<ScheduleSettings>) => onChange({ ...value, ...patch });

	const updateLessonStarts = (idx: number, nextVal: string) => {
		const arr = lessonStarts.slice();
		arr[idx] = nextVal;
		const schedule = { ...value.schedule };
		schedule.mon = ensureDayLength(schedule.mon);
		schedule.tue = ensureDayLength(schedule.tue);
		schedule.wed = ensureDayLength(schedule.wed);
		schedule.thu = ensureDayLength(schedule.thu);
		schedule.fri = ensureDayLength(schedule.fri);
		if (schedule.sat) schedule.sat = ensureDayLength(schedule.sat);
		update({ lessonStarts: arr, schedule });
	};

	const addSlot = () => {
		const arr = lessonStarts.slice();
		arr.push("08:00");
		const schedule = { ...value.schedule };
		schedule.mon = ensureDayLength(schedule.mon);
		schedule.tue = ensureDayLength(schedule.tue);
		schedule.wed = ensureDayLength(schedule.wed);
		schedule.thu = ensureDayLength(schedule.thu);
		schedule.fri = ensureDayLength(schedule.fri);
		if (schedule.sat) schedule.sat = ensureDayLength(schedule.sat);
		update({ lessonStarts: arr, schedule });
	};

	const removeSlot = (idx: number) => {
		if (lessonStarts.length <= 1) return;
		const arr = lessonStarts.slice();
		arr.splice(idx, 1);
		const trim = (a: string[]) => {
			const copy = a.slice();
			copy.splice(idx, 1);
			return copy;
		};
		const schedule = {
			mon: trim((value.schedule?.mon ?? []) as string[]),
			tue: trim((value.schedule?.tue ?? []) as string[]),
			wed: trim((value.schedule?.wed ?? []) as string[]),
			thu: trim((value.schedule?.thu ?? []) as string[]),
			fri: trim((value.schedule?.fri ?? []) as string[]),
			sat: value.schedule?.sat ? trim((value.schedule.sat ?? []) as string[]) : undefined,
		};
		update({ lessonStarts: arr, schedule });
	};

	const updateDayTitle = (day: keyof WeekSchedule, slotIndex: number, title: string) => {
		const schedule = { ...value.schedule };
		const curr = (schedule[day] ?? []) as string[];
		const next = curr.slice();
		while (next.length < slotsCount) next.push("");
		next[slotIndex] = title;
		(schedule as Record<string, unknown>)[day] = next;
		update({ schedule });
	};

	return (
		<div className="grid gap-3">
			<div className="flex gap-2 flex-wrap">
				{dayTabs.map((t) => {
					const active = tab === t.key;
					return (
						<button
							key={t.key}
							type="button"
							onClick={() => setTab(t.key)}
							className={`text-xs px-2 py-1 border rounded-md ${active ? "bg-black text-white" : "bg-white"}`}
						>
							{t.label}
						</button>
					);
				})}
			</div>

			{tab === "general" && (
				<div className="grid gap-3">
					<label className="grid gap-1">
						<span className="text-sm font-medium">Часовой пояс (IANA)</span>
						<input
							type="text"
							placeholder="Europe/Moscow"
							value={value.timeZone ?? ""}
							onChange={(e) => update({ timeZone: e.target.value })}
							className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
						/>
					</label>
					<label className="grid gap-1">
						<span className="text-sm font-medium">Длительность урока (мин)</span>
						<input
							type="number"
							min={1}
							value={Number.isFinite(value.lessonDurationMin as number) ? (value.lessonDurationMin as number) : 0}
							onChange={(e) => update({ lessonDurationMin: Math.max(1, Number(e.target.value) || 1) })}
							className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white w-28"
						/>
					</label>
					<label className="inline-flex items-center gap-2">
						<input
							type="checkbox"
							checked={value.showTimes ?? true}
							onChange={(e) => update({ showTimes: e.target.checked })}
						/>
						<span className="text-sm">Показывать время</span>
					</label>
					<div className="grid gap-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Начало каждого урока</span>
							<button type="button" onClick={addSlot} className="text-xs px-2 py-1 border rounded-md bg-white">
								Добавить слот
							</button>
						</div>
						<div className="grid gap-2">
							{lessonStarts.map((t, idx) => (
								<div key={idx} className="flex items-center gap-2">
									<input
										type="text"
										value={t}
										onChange={(e) => updateLessonStarts(idx, e.target.value)}
										className="border border-gray-300 rounded-md px-2 py-1 text-sm outline-none bg-white w-24"
										placeholder="HH:MM"
									/>
									<button
										type="button"
										onClick={() => removeSlot(idx)}
										disabled={lessonStarts.length <= 1}
										className="text-xs px-2 py-1 border rounded-md bg-white disabled:opacity-60"
									>
										Удалить
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{tab !== "general" && (
				<DayEditor
					day={tab as keyof WeekSchedule}
					label={dayTabs.find((t) => t.key === tab)?.label ?? ""}
					value={value}
					onChangeTitle={updateDayTitle}
				/>
			)}
		</div>
	);
}

function DayEditor({
	day,
	label,
	value,
	onChangeTitle,
}: {
	day: keyof WeekSchedule;
	label: string;
	value: ScheduleSettings;
	onChangeTitle: (day: keyof WeekSchedule, slotIndex: number, title: string) => void;
}) {
	const slotsCount = Array.isArray(value.lessonStarts) ? value.lessonStarts.length : 0;
	const rows = useMemo(() => {
		const titles = Array.isArray((value.schedule as Record<string, unknown> | undefined)?.[day])
			? ((value.schedule as Record<string, unknown>)[day] as string[])
			: [];
		const arr: Array<{ idx: number; time: string; title: string }> = [];
		for (let i = 0; i < slotsCount; i++) {
			const time = Array.isArray(value.lessonStarts) ? value.lessonStarts[i] ?? "" : "";
			arr.push({ idx: i, time, title: titles[i] ?? "" });
		}
		return arr;
	}, [slotsCount, day, value.schedule, value.lessonStarts]);

	return (
		<div className="grid gap-2">
			<div className="text-sm font-medium">{label}: предметы по слотам</div>
			<div className="grid gap-2">
				{rows.map((r) => (
					<div key={r.idx} className="grid grid-cols-[80px,1fr] gap-2 items-center">
						<span className="text-xs text-gray-600">{r.time || "—"}</span>
						<input
							type="text"
							value={r.title}
							onChange={(e) => onChangeTitle(day, r.idx, e.target.value)}
							className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
							placeholder="Название предмета (пусто — нет урока)"
						/>
					</div>
				))}
			</div>
		</div>
	);
}


