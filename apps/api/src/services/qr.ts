import QRCode from "qrcode";

/**
 * Encode `{WEB_URL}/p/{slug}` as a PNG data URL for product.create response.
 */
export async function generateProductQr(landingPageUrl: string): Promise<string> {
  return QRCode.toDataURL(landingPageUrl, {
    type: "image/png",
    margin: 1,
    width: 512,
    errorCorrectionLevel: "M",
  });
}
