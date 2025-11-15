"use client";

import { useEffect, useMemo, useState } from "react";
import { buildRatioOptions, parseRatios } from "@/lib/ratios";

type Orientation = "horizontal" | "vertical";

type RenderLayoutEditorProps = {
	width: number;
	height: number;
	initialOrientation?: Orientation;
	initialRatiosText?: string;
	initialPortrait?: boolean;
	onChange: (state: {
		orientation: Orientation;
		portrait: boolean;
		ratiosText: string;
		ratios: number[] | undefined;
	}) => void;
};

export default function RenderLayoutEditor({
	width,
	height,
	initialOrientation = "horizontal",
	initialRatiosText = "1:1",
	initialPortrait = false,
	onChange,
}: RenderLayoutEditorProps) {
	const [orientation, setOrientation] = useState<Orientation>(initialOrientation);
	const [ratiosText, setRatiosText] = useState<string>(initialRatiosText);
	const [portrait, setPortrait] = useState<boolean>(initialPortrait);

	// Эффективные размеры с учётом portrait (поменять местами ширину/высоту)
	const effectiveWidth = portrait ? height : width;
	const effectiveHeight = portrait ? width : height;

	// Список опций зависит только от эффективных размеров, но НЕ от ориентации,
	// чтобы он не сбрасывался при переключении направления
	const ratioOptions = useMemo(() => buildRatioOptions(effectiveWidth, effectiveHeight), [effectiveWidth, effectiveHeight]);

	// Следим, чтобы выбранное значение всегда присутствовало среди доступных опций
	useEffect(() => {
		if (!ratioOptions.find((o) => o.value === ratiosText)) {
			setRatiosText(ratioOptions[0]?.value ?? "1");
		}
	}, [ratioOptions, ratiosText]);

	useEffect(() => {
		onChange({
			orientation,
			portrait,
			ratiosText,
			ratios: parseRatios(ratiosText),
		});
	}, [orientation, portrait, ratiosText, onChange]);

	return (
		<div className="rounded-lg border border-gray-200 p-4">
			<div className="grid gap-4">
				<div className="flex items-center gap-3 flex-wrap">
					{/* 1) Смена ширины и высоты */}
					<div className="inline-flex items-center gap-2 text-sm">
						<code className="px-1.5 py-0.5 bg-gray-100 rounded">{portrait ? height : width}</code>
						<button
							type="button"
							onClick={() => setPortrait((v) => !v)}
							className={[
								"px-2 py-1 rounded-md border",
								portrait ? "bg-black text-white" : "bg-white hover:bg-gray-50",
							].join(" ")}
							aria-pressed={portrait}
							aria-label="Поменять ширину/высоту местами"
							title="Поменять ширину/высоту местами"
						>
							⇄
						</button>
						<code className="px-1.5 py-0.5 bg-gray-100 rounded">{portrait ? width : height}</code>
						<span className="text-xs text-gray-500">px</span>
					</div>
					{/* 2) Пропорции */}
					<div className="inline-flex items-center gap-2">
						<select
							value={ratiosText}
							onChange={(e) => setRatiosText(e.target.value)}
							className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none bg-white"
						>
							{ratioOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					{/* 3) Ориентация (скрыта для 'На весь экран') */}
					{ratiosText !== "1" && (
						<div className="inline-flex overflow-hidden rounded-md border">
							<button
								type="button"
								onClick={() => setOrientation("horizontal")}
								className={[
									"px-2.5 py-1.5 text-sm",
									orientation === "horizontal" ? "bg-black text-white" : "bg-white hover:bg-gray-50",
								].join(" ")}
								aria-label="Слева направо"
								title="Слева направо"
							>
								→
							</button>
							<button
								type="button"
								onClick={() => setOrientation("vertical")}
								className={[
									"px-2.5 py-1.5 text-sm border-l",
									orientation === "vertical" ? "bg-black text-white" : "bg-white hover:bg-gray-50",
								].join(" ")}
								aria-label="Сверху вниз"
								title="Сверху вниз"
							>
								↓
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}


