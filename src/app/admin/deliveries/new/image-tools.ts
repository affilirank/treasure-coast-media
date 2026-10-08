const WATERMARK_TEXT = "PREVIEW ONLY - MERIT MEDIA";

async function toJpeg(file: File, maxDimension: number, quality: number, watermark: boolean) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  if (watermark) {
    const fontSize = Math.max(18, Math.round(width / 28));
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(2, fontSize / 10);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    const stepY = fontSize * 3.2;
    const stepX = fontSize * 18;
    const reach = Math.hypot(width, height);
    for (let y = -reach; y < reach; y += stepY) {
      for (let x = -reach; x < reach; x += stepX) {
        const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
        ctx.strokeText(WATERMARK_TEXT, x + offset, y);
        ctx.fillText(WATERMARK_TEXT, x + offset, y);
      }
    }
    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image."))), "image/jpeg", quality));
}

export const makeWebRes = (file: File) => toJpeg(file, 2047, 0.88, false);
export const makeWatermarkedPreview = (file: File) => toJpeg(file, 1280, 0.7, true);
