import React from "react";
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

export default function HelloRender(props: { settings: HelloSettings; userName?: string; width: number; height: number }) {
	const { settings, userName, width, height } = props;
	const hour = getHourInTimeZone(settings.timeZone);
	const greet = greetingByHour(hour);
	const name = (userName ?? "").trim();
	const line = name ? `${greet}, ${name}!` : `${greet}!`;

	// Небольшая адаптация размеров шрифта к ширине
	const titleSize = Math.max(24, Math.floor(width * 0.12));
	const subSize = Math.max(14, Math.floor(width * 0.045));
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

	function BoxSmile({ size, variant }: { size: number; variant: "happy" | "wink" | "grin" }) {
		const eyeSize = Math.max(4, Math.floor(size * 0.12));
		const eyeY = Math.floor(size * 0.36);
		const eyeXOffset = Math.floor(size * 0.24);
		const mouthWidth = Math.floor(size * (variant === "grin" ? 0.56 : 0.44));
		const mouthHeight = Math.max(4, Math.floor(size * (variant === "grin" ? 0.12 : 0.08)));
		return (
			<div
				style={{
					display: "flex",
					width: size,
					height: size,
					position: "relative",
					border: "5px solid black",
					borderRadius: "50%",
					boxSizing: "border-box",
				}}
			>
				{/* Left eye */}
				<div
					style={{
						position: "absolute",
						width: eyeSize,
						height: eyeSize,
						background: "black",
						borderRadius: "50%",
						left: eyeXOffset,
						top: eyeY,
					}}
				/>
				{/* Right eye or wink */}
				{variant !== "wink" ? (
					<div
						style={{
							position: "absolute",
							width: eyeSize,
							height: eyeSize,
							background: "black",
							borderRadius: "50%",
							right: eyeXOffset,
							top: eyeY,
						}}
					/>
				) : (
					<div
						style={{
							position: "absolute",
							width: Math.max(eyeSize * 1.8, 8),
							height: Math.max(Math.floor(eyeSize * 0.35), 3),
							background: "black",
							borderRadius: Math.max(Math.floor(eyeSize * 0.2), 2),
							right: eyeXOffset,
							top: eyeY + Math.floor(eyeSize * 0.35),
						}}
					/>
				)}
				{/* Mouth */}
				<div
					style={{
						position: "absolute",
						width: mouthWidth,
						height: mouthHeight,
						background: "black",
						borderRadius: Math.floor(mouthHeight / 2),
						left: (size - mouthWidth) / 2,
						top: Math.floor(size * 0.62),
					}}
				/>
			</div>
		);
	}
	const faces = [
		<BoxSmile key="f0" size={iconSize} variant="happy" />,
		<BoxSmile key="f1" size={iconSize} variant="wink" />,
		<BoxSmile key="f2" size={iconSize} variant="grin" />,
	];
	const face = faces[(hour + width + height) % faces.length];

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
						fontSize: subSize,
						lineHeight: 1.1,
						textAlign: "center",
						opacity: 0.95,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{face}
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


