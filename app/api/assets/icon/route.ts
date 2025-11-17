import { NextResponse } from "next/server";
import React from "react";
import {
	SmileyIcon,
	SmileyWinkIcon,
	HandHeartIcon,
	HeartIcon,
	SmileyMeltingIcon,
	SmileyXEyesIcon,
	SunIcon,
	SunDimIcon,
} from "@phosphor-icons/react/dist/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IconName =
	| "smiley"
	| "smiley-wink"
	| "hand-heart"
	| "heart"
	| "smiley-melting"
	| "smiley-xeyes"
	| "sun"
	| "sun-dim";

function getIconByName(name: IconName): React.ComponentType<{ size?: number; weight?: "fill" | "regular"; color?: string }> | null {
	switch (name) {
		case "smiley": return SmileyIcon;
		case "smiley-wink": return SmileyWinkIcon;
		case "hand-heart": return HandHeartIcon;
		case "heart": return HeartIcon;
		case "smiley-melting": return SmileyMeltingIcon;
		case "smiley-xeyes": return SmileyXEyesIcon;
		case "sun": return SunIcon;
		case "sun-dim": return SunDimIcon;
		default: return null;
	}
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const nameParam = (url.searchParams.get("name") ?? "").toLowerCase() as IconName;
	const size = Math.max(8, Math.min(2048, Number(url.searchParams.get("size") ?? 64))) | 0;
	const Icon = getIconByName(nameParam);
	if (!Icon) {
		return NextResponse.json({ error: "unknown icon" }, { status: 400 });
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const req = (eval("require") as (m: string) => any);
		const { renderToStaticMarkup } = req("react-dom/server");
		const element = React.createElement(Icon, { size, weight: "fill", color: "black" });
		const svg = renderToStaticMarkup(element);
		return new NextResponse(svg, {
			headers: {
				"Content-Type": "image/svg+xml; charset=utf-8",
				"Cache-Control": "no-cache",
			},
		});
	} catch (err) {
		return NextResponse.json({ error: "render failed", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
	}
}

export const revalidate = 0;


