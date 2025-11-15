import { NextResponse } from "next/server";
import { getPlugin } from "@/plugins";
import type { UserSettings } from "@/lib/settings";
import { hashMacAddress } from "@lib/hash";
import { getBaseUrl, parsePluginRenderSearchParams } from "@/lib/parsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Универсальный рендер BMP 1bpp для произвольного плагина (?plugin=id)
export async function GET(request: Request) {
	const url = new URL(request.url);
	const params = parsePluginRenderSearchParams(request);
	if (!params) {
		return NextResponse.json({ error: "invalid or missing parameters (mac, ts, width, height, layout, plugins)" }, { status: 400 });
	}
	const { width, height, layout, plugins } = params;
	const deviceId = hashMacAddress(params.mac);
	switch (layout) {
		case "single-portrait":
			break;
		case "single-landscape":
			break;
		case "double-portrait":
			break;
		case "double-landscape":
			const plugin = getPlugin(plugins[0].name);
			if (!plugin) {
				return NextResponse.json({ error: "plugin not found" }, { status: 404 });
			}
			return NextResponse.json({ error: "TODO: render plugin" }, { status: 400 });
			//const image = await plugin.render({ name: "", age: 0 }, plugins[0].settings, { deviceId, baseUrl: url.origin });
			break;
		default:
			return NextResponse.json({ error: "invalid layout" }, { status: 400 });
	}


	return NextResponse.json({ error: "implement me" }, { status: 400 });
}


