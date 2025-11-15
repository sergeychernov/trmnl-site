"use client";

import { useEffect, useMemo, useState } from "react";

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

function parseRatios(input: string): number[] | undefined {
	const parts = (input || "").split(":").map((p) => p.trim()).filter(Boolean);
	if (parts.length === 0) return undefined;
	const nums = parts.map((p) => {
		const v = Math.trunc(Number(p));
		return Number.isFinite(v) && v > 0 ? v : 1;
	});
	return nums;
}

// (удалено) прежний вариант calculateRatioList(width) заменён объединяющим вариантом для width и height

function gcd(a: number, b: number): number {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y !== 0) {
		const t = y;
		y = x % y;
		x = t;
	}
	return Math.max(1, x);
}

function calculateRatioList(width: number, height: number): number[][] {
	const g = gcd(width, height);
	const result: number[][] = [];
	const pushUnique = (arr: number[]) => {
		// Нормализуем веса (убираем кратность), чтобы 1:1 == 2:2 == 3:3
		const normG = arr.reduce((acc, v) => gcd(acc, v));
		const normalized = arr.map((v) => Math.trunc(v / Math.max(1, normG)));
		const key = normalized.join(":");
		if (!result.find((r) => r.join(":") === key)) result.push(normalized);
	};
	// Базовый кейс — одна секция
	pushUnique([1]);
	// Равные части, если количество частей делит g
	for (let k = 2; k <= 6; k++) {
		if (g % k === 0) pushUnique(Array.from({ length: k }, () => 1));
	}
	// Алгоритмически генерируем некоторые асимметричные наборы (без предзаданных пресетов)
	// Для 2 частей
	for (let a = 1; a <= 4; a++) {
		for (let b = 1; b <= 4; b++) {
			const s = a + b;
			if (g % s === 0) pushUnique([a, b]);
		}
	}
	// Для 3 частей
	for (let a = 1; a <= 3; a++) {
		for (let b = 1; b <= 3; b++) {
			for (let c = 1; c <= 3; c++) {
				const s = a + b + c;
				if (g % s === 0) pushUnique([a, b, c]);
			}
		}
	}
	// Для 4 частей (ограничим веса для компактности)
	for (let a = 1; a <= 2; a++) {
		for (let b = 1; b <= 2; b++) {
			for (let c = 1; c <= 2; c++) {
				for (let d = 1; d <= 2; d++) {
					const s = a + b + c + d;
					if (g % s === 0) pushUnique([a, b, c, d]);
				}
			}
		}
	}
	return result;
}

function buildRatioOptions(width: number, height: number): Array<{ label: string; value: string; ratios: number[] }> {
	const ratios = calculateRatioList(width, height);
	const options = ratios.map((r) => {
		const text = r.join(":");
		const label = text === "1" ? "На весь экран" : text;
		return { label, value: text, ratios: r };
	});
	return options.length > 0 ? options : [{ label: "На весь экран", value: "1", ratios: [1] }];
}

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


