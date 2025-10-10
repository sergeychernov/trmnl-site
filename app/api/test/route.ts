import { NextResponse } from "next/server";

export async function GET() {
	const outcomes = ["орел", "решка"];
	const result = outcomes[Math.floor(Math.random() * outcomes.length)];
	return NextResponse.json({ result });
}


