import React from "react";
import { HELLO_ICON_IMAGES, type HelloIconName } from "./icon-images";
import type { HelloSettings } from "./index";

function getHourInTimeZone(timeZone: string): number {
	const fmt = new Intl.DateTimeFormat("en-GB", {
		timeZone,
		hour: "2-digit",
		hour12: false,
	});
	const parts = fmt.formatToParts(new Date());
	const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
	return Number(hourStr);
}

function greetingByHour(hour: number): string {
	if (hour >= 5 && hour < 11) return "Доброе утро";
	if (hour >= 11 && hour < 17) return "Добрый день";
	if (hour >= 17 && hour < 23) return "Добрый вечер";
	return "Доброй ночи";
}

const ICON_NAMES = Object.keys(HELLO_ICON_IMAGES) as HelloIconName[];

export default function HelloRender(props: { settings: HelloSettings; userName?: string; width: number; height: number }) {
	const { settings, userName, width, height } = props;
	const hour = getHourInTimeZone(settings.timeZone);
	const greet = greetingByHour(hour);
	const name = (userName ?? "").trim();
	const line = name ? `${greet}, ${name}!` : `${greet}!`;

	// Небольшая адаптация размеров шрифта к ширине
	const titleSize = Math.max(24, Math.floor(width * 0.12));
	const isElongated = width >= height * 1.5 || height >= width * 1.5;
	const iconSize = Math.max(24, Math.floor(Math.min(width, height) * 0.28));
	const footerSize = Math.max(10, Math.floor(Math.min(width, height) * 0.03));
	const updatedAt = new Intl.DateTimeFormat("ru-RU", {
		timeZone: settings.timeZone,
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date());

	const i = (Math.floor(hour * Math.random() * ICON_NAMES.length)) % ICON_NAMES.length;
	const iconName = ICON_NAMES[i];
	const faceSrc = HELLO_ICON_IMAGES[iconName];

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				color: "black",
				background: "white",
				fontFamily: "Noto Sans, sans-serif",
				padding: 16,
				gap: 12,
			}}
		>
			<div
				style={{
					display: "flex",
					fontWeight: 700,
					fontSize: titleSize,
					lineHeight: 1.1,
					textAlign: "center",
					whiteSpace: "pre-wrap",
				}}
			>
				{line}
			</div>
			{isElongated && (
				<div
					style={{
						width: iconSize,
						height: iconSize,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						opacity: 1,
					}}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						key={iconName}
						src={faceSrc}
						alt=""
						width={iconSize}
						height={iconSize}
						style={{ display: "block" }}
					/>
				</div>
			)}
			<div
				style={{
					display: "flex",
					position: "absolute",
					bottom: 8,
					right: 12,
					fontSize: footerSize,
					lineHeight: 1,
					fontWeight: 400,
					color: "black",
				}}
			>
				{updatedAt}
			</div>
		</div>
	);
}


