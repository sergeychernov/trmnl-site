import { Children, type ReactNode } from "react";

type RenderLayoutProps = {
	width: number;
	height: number;
	ratios?: number[];
	children: ReactNode;
	orientation: "vertical" | "horizontal";
};

function sanitizeRatios(r?: number[]): number[] {
	if (!r || r.length === 0) return [1];
	const cleaned = r.map((n) => {
		const v = Math.trunc(Number(n));
		return Number.isFinite(v) && v > 0 ? v : 1;
	}).filter((n) => n > 0);
	return cleaned;
}

export default function RenderLayout({ width, height, ratios, children, orientation }: RenderLayoutProps) {
	const w = Math.trunc(width);
	const h = Math.trunc(height);
	const childArray = Children.toArray(children);

	const cleanedRatios = sanitizeRatios(ratios);

	const count = childArray.length;
	const weights =
		count <= cleanedRatios.length
			? cleanedRatios.slice(0, count)
			: Array.from({ length: count }, (_, i) => cleanedRatios[i % cleanedRatios.length]);

	return (
		<div
			style={{ width: `${w}px`, height: `${h}px` }}
			className="overflow-hidden"
		>
			<div
				className={`flex w-full h-full ${orientation === "horizontal" ? "flex-row" : "flex-col"}`}
			>
				{childArray.slice(0, weights.length).map((child, idx) => (
					<div
						key={idx}
						className="min-w-0 min-h-0 overflow-hidden"
						style={{ flexGrow: weights[idx], flexShrink: 1, flexBasis: 0 }}
					>
						{child}
					</div>
				))}
			</div>
		</div>
	);
}


