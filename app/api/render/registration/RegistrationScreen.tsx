import React from "react";

interface RegistrationScreenProps {
	width: number;
	height: number;
	leftWidth: number;
	rightRatio: number;
	pad: number;
	lineGap: number;
	notoSans: { family: string };
	rects: React.ReactNode[];
	instructionLines: string[];
	siteLine: string;
	action: string;
	pinLine: string;
	baseFont: number;
	pinFont: number;
}

export function RegistrationScreen({
	width,
	height,
	leftWidth,
	rightRatio,
	pad,
	lineGap,
	notoSans,
	rects,
	instructionLines,
	siteLine,
	action,
	pinLine,
	baseFont,
	pinFont,
}: RegistrationScreenProps) {
	return (
		<div
			style={{
				width: `${width}px`,
				height: `${height}px`,
				display: "flex",
				flexDirection: "row",
				background: "#fff",
				color: "#000",
				fontFamily: notoSans.family,
			}}
		>
			{/* Левая панель: QR код */}
			<div
				style={{
					width: `${leftWidth}px`,
					height: "100%",
					boxSizing: "border-box",
					padding: `${pad}px`,
					position: "relative",
					display: "flex",
				}}
			>
				<svg
					width={leftWidth}
					height={height}
					viewBox={`0 0 ${leftWidth} ${height}`}
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect x={0} y={0} width={leftWidth} height={height} fill="#fff" />
					{rects}
				</svg>
			</div>

			{/* Правая панель: текст */}
			<div
				style={{
					width: `${Math.floor(width * rightRatio)}px`,
					height: "100%",
					boxSizing: "border-box",
					padding: `${pad}px`,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					gap: `${lineGap}px`,
					textAlign: "center",
				}}
			>
				{/* Инструкции */}
				<div
					style={{
						fontSize: `${baseFont}px`,
						fontWeight: 400,
						display: "flex",
						flexDirection: "column",
					}}
				>
					{instructionLines.map((line, i) => (
						<div key={i}>{line}</div>
					))}
				</div>

				{/* Сайт */}
				<div
					style={{
						fontSize: `${baseFont}px`,
						fontWeight: 700,
						display: "flex",
					}}
				>
					{siteLine}
				</div>

				{/* Действие */}
				<div
					style={{
						fontSize: `${baseFont}px`,
						fontWeight: 400,
						display: "flex",
					}}
				>
					{action}
				</div>

				{/* PIN код */}
				<div
					style={{
						fontSize: `${pinFont}px`,
						fontWeight: 700,
						display: "flex",
					}}
				>
					{pinLine}
				</div>
			</div>
		</div>
	);
}

