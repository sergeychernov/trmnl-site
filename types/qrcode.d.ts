declare module "qrcode" {
  // Минимальная сигнатура для локального использования
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }
  ): unknown;
}


