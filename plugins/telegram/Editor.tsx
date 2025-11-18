"use client";

import React from "react";
import { Stack, Typography } from "@mui/material";

export default function TelegramEditor() {
	// У плагина Telegram пока нет настраиваемых параметров
	return (
		<Stack spacing={2}>
			<Typography variant="body2" color="text.secondary">
				Этот плагин пока не имеет настроек.
			</Typography>
		</Stack>
	);
}
