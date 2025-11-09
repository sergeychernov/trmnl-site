import { NextResponse } from "next/server";

// Возвращает JSON с ссылкой на PNG и интервалом обновления
export async function GET(request: Request) {
	const url = new URL(request.url);
	const intervalParam = url.searchParams.get("interval");
	const interval = Number.isFinite(Number(intervalParam)) ? Math.max(5, Number(intervalParam)) : 300;

	const host = request.headers.get("host") ?? url.host;
	// Нельзя смешивать ?? и || без скобок: сначала определим протокол из заголовка или URL,
	// затем подставим https как запасной вариант.
	const urlProto = url.protocol.replace(":", "");
	const proto = (request.headers.get("x-forwarded-proto") ?? urlProto) || "https";
	const base = `${proto}://${host}`;

	// cache-buster, чтобы TRMNL не брал из кэша
	const imageUrl = `${base}/api/trmnl.png?ts=${Date.now()}`;

	return NextResponse.json({
		url: imageUrl,
		interval,
	});
}


