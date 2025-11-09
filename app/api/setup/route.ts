import { NextResponse } from "next/server";

// Handshake для Seed Studio TRMNL
export async function GET() {
	return NextResponse.json({
		status: "ok",
		message: "TRMNL setup acknowledged",
	});
}


