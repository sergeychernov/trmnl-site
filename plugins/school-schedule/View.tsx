import React from "react";

type SchoolScheduleViewProps = {
	lines: string[];
	titleSize: number;
	rowSize: number;
	margin: number;
};

export default function SchoolScheduleView({ lines, titleSize, rowSize, margin }: SchoolScheduleViewProps) {
	const gapY = Math.round(rowSize * 0.6);
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "stretch",
				justifyContent: "center",
				backgroundColor: "#fff",
				color: "#000",
				padding: `${margin}px`,
			}}
		>
			<div
				style={{
					fontFamily: "Noto Sans, sans-serif",
					fontWeight: 700,
					fontSize: `${titleSize}px`,
					textAlign: "center",
					marginBottom: `${lines.length > 1 ? gapY : 0}px`,
				}}
			>
				{lines[0] ?? ""}
			</div>
			{lines.slice(1).map((text, idx) => (
				<div
					key={idx}
					style={{
						width: "100%",
						fontFamily: "Noto Sans, sans-serif",
						fontWeight: 400,
						fontSize: `${rowSize}px`,
						textAlign: "left",
						marginTop: idx === 0 ? "0px" : "8px",
					}}
				>
					{text}
				</div>
			))}
		</div>
	);
}


