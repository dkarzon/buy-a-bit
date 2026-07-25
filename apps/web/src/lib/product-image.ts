const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 1_400_000;
const MAX_SIDE = 1280;

export async function fileToProductImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file (JPG, PNG, or WebP).");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Image must be 12 MB or smaller.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not process that image. Try another photo.");
    }
    context.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.85;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > 900_000 && quality > 0.45) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      throw new Error("Image is still too large after compression. Try a smaller photo.");
    }

    return dataUrl;
  } finally {
    bitmap.close();
  }
}

export function isProductImageValue(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("data:image/") && value.includes(";base64,")) {
    return value.length <= 1_500_000;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
