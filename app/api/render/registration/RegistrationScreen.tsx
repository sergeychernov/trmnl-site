import React from "react";
import { createQrSvgElements } from "@lib/qr";

interface RegistrationScreenProps {
	width: number;
	height: number;
	pad: number;
	notoSans: { family: string };
	qr: string;
	siteLine: string;
	pinLine: string;
}

export function RegistrationScreen({
	width,
	height,
	pad,
	notoSans,
	qr,
	siteLine,
	pinLine,
}: RegistrationScreenProps) {
	// Левая панель занимает 2/5 от общей ширины (flex: 2 из 2+3)
	const leftWidth = Math.floor(width * 0.4);
	const availQrW = Math.max(0, leftWidth - pad * 2);
	const availQrH = Math.max(0, height - pad * 2);
	const qrSize = Math.min(availQrW, availQrH);

	// Генерируем QR-код элементы
	const { elements: qrElements, svgSize } = createQrSvgElements(qr, qrSize, {
		marginModules: 4,
		errorCorrectionLevel: "M",
		fgColor: "#000000",
		bgColor: "#FFFFFF",
	});

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
					flex: 2,
					height: "100%",
					boxSizing: "border-box",
					padding: `${pad}px`,
					position: "relative",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<svg
					width={svgSize}
					height={svgSize}
					viewBox={`0 0 ${svgSize} ${svgSize}`}
					xmlns="http://www.w3.org/2000/svg"
				>
					{qrElements}
				</svg>
			</div>

			{/* Правая панель: текст */}
			<div
				style={{
					flex: 3,
					height: "100%",
					boxSizing: "border-box",
					padding: `${pad}px`,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					gap: `6px`,
					textAlign: "center",
				}}
			>
				{/* Инструкции */}
				<div
					style={{
						fontSize: `24`,
						fontWeight: 400,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<div style={{ display: "flex" }}>Чтобы настроить устройство, перейдите по qrcode</div>
					<div style={{ display: "flex" }}>или</div>
					<div style={{ display: "flex" }}>перейдите по ссылке</div>
					<div style={{ display: "flex" }}><b>{siteLine}</b></div>
					<div style={{ display: "flex" }}>зарегистрируйтесь и добавьте устройство по следующему пинкоду:</div>
					<div style={{ display: "flex", fontSize: `44` }}><b>{pinLine}</b></div>
				</div>

			</div>
		</div>
	);
}

