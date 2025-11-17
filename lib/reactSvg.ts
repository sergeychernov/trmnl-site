import React from "react";

/**
 * Render a React SVG element as data:URL <img> on the server (for stable OG/bitmap pipelines),
 * and return the original React element on the client.
 *
 * - Server (typeof window === "undefined"): converts SVG ReactElement → static markup → data:URL → <img>.
 * - Client: returns the original element untouched.
 *
 * Width/height are applied to the resulting <img>. For client-side SVG, preserve sizing inside the element itself.
 */
export function renderSvgAsImgOnServer(
	element: React.ReactElement,
	width: number,
	height: number,
	alt: string = "",
): React.ReactElement {
	if (typeof window === "undefined") {
		try {
			// Avoid static import so client bundle doesn't include react-dom/server
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const req = (eval("require") as (m: string) => any);
			const { renderToStaticMarkup } = req("react-dom/server");
			const svg = renderToStaticMarkup(element);
			const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
			return React.createElement("img", { alt, src, width, height }) as unknown as React.ReactElement;
		} catch {
			// Fallback: return the element if server render-to-string is unavailable
			return element;
		}
	}
	return element;
}


