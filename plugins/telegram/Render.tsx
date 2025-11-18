import React from "react";
import type { RenderArgs } from "../types";
import type { TelegramSettings } from "./index";

export default function Render({
	user,
	context,
	width,
	height,
}: RenderArgs<TelegramSettings>) {
	const telegramId = context?.telegramId;

	// Лог для диагностики проблем OG‑рендера
	console.log("[telegram-plugin] render", {
		width,
		height,
		hasUser: !!user,
		hasTelegramId: !!telegramId,
	});

	// Если Telegram не привязан
	if (!telegramId) {
		return (
			<div
				style={{
					width,
					height,
					backgroundColor: "white",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "Noto Sans",
					fontSize: 20,
					color: "black",
					padding: 40,
					textAlign: "center",
				}}
			>
				<div style={{ fontSize: 60, marginBottom: 20 }}>⚠️</div>
				<div style={{ lineHeight: 1.5, display: "flex", flexDirection: "column" }}>
					Для работы этого плагина
					<br />
					привяжите Telegram аккаунт
					<br />
					в профиле пользователя
				</div>
			</div>
		);
	}

	const containerStyle: React.CSSProperties = {
		width,
		height,
		backgroundColor: "white",
		color: "black",
		fontFamily: "Noto Sans",
		padding: 30,
		display: "flex",
		flexDirection: "column",
	};

	return (
		<div style={containerStyle}>
			<h1>
				Telegram TRMNL
			</h1>

			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 12,
					textAlign: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 4,
						fontSize: 18,
					}}
				>
					<span>Здесь будут выводиться сообщения,</span>
					<span>которые бот TRMNL отправляет на это устройство.</span>
				</div>
			</div>
		</div>
	);
}
