"use client";

import type { PluginEditorProps } from "../types";
import { useMemo, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import {
	Box,
	Button,
	FormControlLabel,
	Grid,
	Stack,
	Switch,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";

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
		<Stack spacing={2}>
			<Tabs
				value={tab}
				onChange={(_: SyntheticEvent, v: (typeof dayTabs)[number]["key"]) => setTab(v)}
				variant="scrollable"
				scrollButtons="auto"
			>
				{dayTabs.map((t) => (
					<Tab key={t.key} value={t.key} label={t.label} />
				))}
			</Tabs>

			{tab === "general" && (
				<Stack spacing={2}>
					<Box>
						<Typography variant="subtitle2">Часовой пояс (IANA)</Typography>
						<TextField
							size="small"
							fullWidth
							placeholder="Europe/Moscow"
							value={value.timeZone ?? ""}
							onChange={(e: ChangeEvent<HTMLInputElement>) => update({ timeZone: e.target.value })}
						/>
					</Box>
					<Box>
						<Typography variant="subtitle2">Длительность урока (мин)</Typography>
						<TextField
							size="small"
							type="number"
							inputProps={{ min: 1 }}
							value={Number.isFinite(value.lessonDurationMin as number) ? (value.lessonDurationMin as number) : 0}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								update({ lessonDurationMin: Math.max(1, Number(e.target.value) || 1) })
							}
							sx={{ width: 160 }}
						/>
					</Box>
					<FormControlLabel
						control={
							<Switch
								checked={value.showTimes ?? true}
								onChange={(e: ChangeEvent<HTMLInputElement>) => update({ showTimes: e.target.checked })}
							/>
						}
						label="Показывать время"
					/>
					<Stack spacing={1}>
						<Stack direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="subtitle2">Начало каждого урока</Typography>
							<Button size="small" variant="outlined" onClick={addSlot}>
								Добавить слот
							</Button>
						</Stack>
						<Stack spacing={1}>
							{lessonStarts.map((t, idx) => (
								<Stack key={idx} direction="row" alignItems="center" spacing={1}>
									<TextField
										size="small"
										value={t}
										onChange={(e: ChangeEvent<HTMLInputElement>) => updateLessonStarts(idx, e.target.value)}
										placeholder="HH:MM"
										sx={{ width: 120 }}
									/>
									<Button
										size="small"
										variant="outlined"
										color="inherit"
										onClick={() => removeSlot(idx)}
										disabled={lessonStarts.length <= 1}
									>
										Удалить
									</Button>
								</Stack>
							))}
						</Stack>
					</Stack>
				</Stack>
			)}

			{tab !== "general" && (
				<DayEditor
					day={tab as keyof WeekSchedule}
					label={dayTabs.find((t) => t.key === tab)?.label ?? ""}
					value={value}
					onChangeTitle={updateDayTitle}
				/>
			)}
		</Stack>
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
		<Stack spacing={1.5}>
			<Typography variant="subtitle2">{label}: предметы по слотам</Typography>
			<Stack spacing={1.5}>
				{rows.map((r) => (
					<Grid key={r.idx} container columnSpacing={1.5} alignItems="center">
						<Grid item xs="auto">
							<Typography variant="caption" color="text.secondary" sx={{ width: 60, display: "inline-block" }}>
								{r.time || "—"}
							</Typography>
						</Grid>
						<Grid item xs>
							<TextField
								size="small"
								fullWidth
								value={r.title}
								onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeTitle(day, r.idx, e.target.value)}
								placeholder="Название предмета (пусто — нет урока)"
							/>
						</Grid>
					</Grid>
				))}
			</Stack>
		</Stack>
	);
}


