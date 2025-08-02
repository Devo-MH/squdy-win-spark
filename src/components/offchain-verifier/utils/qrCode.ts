import QRCode from "qrcode-generator";

export interface QRCodeOptions {
  text: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  typeNumber?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40;
  cellSize?: number;
  margin?: number;
}

/**
 * Generate QR code as SVG string
 */
export function generateQRCodeSVG(options: QRCodeOptions): string {
  const {
    text,
    errorCorrectionLevel = "L",
    typeNumber = 0,
    cellSize = 4,
    margin = 4
  } = options;

  try {
    const qr = QRCode(typeNumber, errorCorrectionLevel);
    qr.addData(text);
    qr.make();
    
    return qr.createSvgTag({
      cellSize,
      margin
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error(`Failed to generate QR code: ${error}`);
  }
}

/**
 * Generate QR code as data URL
 */
export function generateQRCodeDataURL(options: QRCodeOptions): string {
  const svg = generateQRCodeSVG(options);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate QR code as HTML element
 */
export function generateQRCodeElement(options: QRCodeOptions): HTMLElement {
  const svg = generateQRCodeSVG(options);
  const container = document.createElement('div');
  container.innerHTML = svg;
  return container.firstElementChild as HTMLElement;
}

/**
 * Generate QR code for Telegram channels
 */
export function generateTelegramQRCode(channelUrl: string): string {
  return generateQRCodeSVG({
    text: channelUrl,
    errorCorrectionLevel: "M",
    cellSize: 4,
    margin: 4
  });
}

/**
 * Generate QR code for general social media links
 */
export function generateSocialQRCode(socialUrl: string): string {
  return generateQRCodeSVG({
    text: socialUrl,
    errorCorrectionLevel: "L",
    cellSize: 4,
    margin: 4
  });
}