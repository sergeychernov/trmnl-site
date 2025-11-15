export function parseRatios(input: string): number[] | undefined {
	const parts = (input || "").split(":").map((p) => p.trim()).filter(Boolean);
	if (parts.length === 0) return undefined;
	const nums = parts.map((p) => {
		const v = Math.trunc(Number(p));
		return Number.isFinite(v) && v > 0 ? v : 1;
	});
	return nums;
}

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

export function calculateRatioList(width: number, height: number): number[][] {
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
	for (let a = 1; a <= 8; a++) {
		for (let b = 1; b <= 8; b++) {
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

export function buildRatioOptions(width: number, height: number, maxLength: number = 3): Array<{ label: string; value: string; ratios: number[] }> {
	const ratios = calculateRatioList(width, height).filter((r) => r.length <= maxLength);
	const options = ratios.map((r) => {
		const text = r.join(":");
		const label = text === "1" ? "На весь экран" : text;
		return { label, value: text, ratios: r };
	});
	return options.length > 0 ? options : [{ label: "На весь экран", value: "1", ratios: [1] }];
}

function sanitizeRatios(r?: number[]): number[] {
	if (!r || r.length === 0) return [1];
	const cleaned = r.map((n) => {
		const v = Math.trunc(Number(n));
		return Number.isFinite(v) && v > 0 ? v : 1;
	}).filter((n) => n > 0);
	return cleaned.length > 0 ? cleaned : [1];
}

export function getSizesByRatios(
	ratios: number[] | undefined,
	orientation: "horizontal" | "vertical",
	width: number,
	height: number,
): Array<{ width: number; height: number }> {
	const weights = sanitizeRatios(ratios);
	const isHorizontal = orientation === "horizontal";
	const axisSize = Math.trunc(isHorizontal ? width : height);
	const crossSize = Math.trunc(isHorizontal ? height : width);
	const total = weights.reduce((acc, w) => acc + w, 0);
	// базовое целое распределение и остатки
	const base = weights.map((w) => Math.floor((axisSize * w) / Math.max(1, total)));
	const allocated = base.reduce((a, b) => a + b, 0);
	let remainder = Math.max(0, axisSize - allocated);
	// список индексов по убыванию дробной части (largest remainder method)
	const remainders = weights.map((w, i) => {
		const exact = (axisSize * w) / Math.max(1, total);
		return { i, frac: exact - Math.floor(exact) };
	}).sort((a, b) => b.frac - a.frac || a.i - b.i);
	for (let k = 0; k < remainders.length && remainder > 0; k++) {
		base[remainders[k].i] += 1;
		remainder -= 1;
	}
	// собираем размеры
	return base.map((main) =>
		isHorizontal ? { width: main, height: crossSize } : { width: crossSize, height: main },
	);
}


