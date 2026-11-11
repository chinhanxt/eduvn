// web/src/omr/image.ts
async function bitmapCanvas(file: Blob, maxEdge: number): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

/** Ảnh → RGBA (cạnh dài ≤ 2400 px) cho bộ quét. */
export async function fileToImageData(file: Blob): Promise<ImageData> {
  const c = await bitmapCanvas(file, 2400);
  return c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
}

/** Nén ảnh bài viết tay: cạnh dài ≤ 1600 px, JPEG 0,85, trả data URL. */
export async function fileToJpeg(file: Blob): Promise<string> {
  return (await bitmapCanvas(file, 1600)).toDataURL("image/jpeg", 0.85);
}
