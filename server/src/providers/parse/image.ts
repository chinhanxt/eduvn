// Ảnh (PNG/JPG/WebP/GIF/BMP/TIFF/JP2) → chữ bằng nhà cung cấp OCR (mặc định AI đọc ảnh). Định dạng mô hình không nhận → ffmpeg đổi sang PNG.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ValidationError } from "../../errors";
import { extOf } from "../registry";
import type { OcrProvider, ParseProvider } from "../types";
import { run } from "../util";

export const IMAGE_FORMATS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "jp2"];
const NATIVE: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

async function toPng(ext: string, buf: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "eduvn-img-"));
  try {
    const src = path.join(dir, `in.${ext}`);
    const dst = path.join(dir, "out.png");
    await writeFile(src, buf);
    try {
      await run("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-frames:v", "1", dst], { timeout: 60_000 });
    } catch {
      throw new ValidationError([`Không đọc được ảnh .${ext}`]);
    }
    return await readFile(dst);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function createImageParser(ocr: () => OcrProvider | undefined): ParseProvider {
  return {
    info: { id: "anh-ocr", kind: "parse", label: "Ảnh → chữ (OCR)", description: "Ảnh chụp trang sách, bảng, đề: đọc chữ và công thức bằng nhà cung cấp OCR.", local: false, free: true, formats: IMAGE_FORMATS },
    async check() {
      const o = ocr();
      return o ? o.check() : { ok: false, detail: "Chưa có nhà cung cấp OCR (cần cổng AI)" };
    },
    async parse(name, buf, opts = {}) {
      const o = ocr();
      if (!o) throw new ValidationError(["Máy chủ chưa có bộ đọc chữ trong ảnh (OCR) — cần bật cổng AI"]);
      const ext = extOf(name);
      const mime = NATIVE[ext];
      const img = mime ? buf : await toPng(ext, buf);
      opts.onProgress?.({ total: 1, done: 0 });
      const { text } = await o.ocr({ image: img, mime: mime ?? "image/png", hint: "Ảnh tài liệu.", signal: opts.signal });
      opts.onProgress?.({ total: 1, done: 1 });
      return { pages: text ? [text] : [], engine: `anh-ocr/${o.info.id}`, format: ext, warnings: [] };
    },
  };
}
