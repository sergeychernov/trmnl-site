declare module "qrcode" {
  export interface QRCodeOptions {
    type?: "svg" | "png" | "utf8";
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function create(
    text: string,
    options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }
  ): unknown;

  export function toString(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  export default {
    create,
    toString,
  };
}


