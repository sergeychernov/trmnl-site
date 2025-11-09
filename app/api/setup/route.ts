import { NextResponse } from "next/server";

// Handshake/регистрация устройства (упрощённый режим без БД).
// Согласовано с BYOS-спецификацией: всегда HTTP 200, статус передаём в JSON.
export async function GET(request: Request) {
	const idHeader = request.headers.get("ID")?.toUpperCase() ?? null; // MAC
	const apiKey = request.headers.get("Access-Token") ?? null;

	if (!idHeader) {
		return NextResponse.json(
			{
				status: 404,
				api_key: null,
				friendly_id: null,
				image_url: null,
				filename: null,
				message: "ID header is required",
			},
			{ status: 200 },
		);
	}

	// В no-DB режиме просто подтверждаем, что устройство может продолжать работу.
	// Генерацию/выдачу реального api_key не делаем, если не используем БД.
	const friendlyId = `DEVICE_${idHeader.replace(/[^A-F0-9]/g, "")}`;
	return NextResponse.json(
		{
			status: 200,
			api_key: apiKey, // если устройство прислало — подтверждаем обратно
			friendly_id: friendlyId,
			image_url: null,
			filename: null,
			message: "Device setup acknowledged (no-DB mode)",
		},
		{ status: 200 },
	);
}


