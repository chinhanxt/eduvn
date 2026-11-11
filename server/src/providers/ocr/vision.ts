// OCR bằng LLM-vision qua cổng AI (task `doc_anh_bai_lam`, P12). Trang PDF dạng ảnh: render bằng `pdftoppm` (poppler) → vision.
// Hàng đợi tối đa 2 trang song song. Chuyển từ tutor/ocr.ts (giữ re-export ở đó).
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ValidationError } from "../../errors";
import type { Ai, AiMessage } from "../../services/ai";
import type { OcrProvider } from "../types";
import { run } from "../util";

export const OCR_TASK = "doc_anh_bai_lam";
export const OCR_MAX_PAGES = 60;
export const OCR_CONCURRENCY = 2;

export const OCR_SYSTEM = `Bạn là bộ đọc chữ (OCR) cho tài liệu học tập tiếng Việt. Ảnh là MỘT trang tài liệu.
Chép lại đúng nguyên văn toàn bộ chữ trong ảnh, theo thứ tự đọc, giữ xuống dòng và đoạn văn.
Mọi công thức toán viết bằng LaTeX đặt trong $…$ (công thức riêng dòng vẫn dùng $…$), ví dụ $x^2+2x+1=0$, $\\frac{a}{b}$.
Giữ dấu tiếng Việt chính xác. Không giải thích, không thêm lời bình, không bọc trong khối mã. Trang trống thì trả về chuỗi rỗng.`;

export type OcrProgress = { total: number; done: number };

const clean = (t: string) => t.replace(/^```\w*\n?|```$/g, "").trim();

/** Một ảnh (data URL) → chữ; lỗi thì thử lại một lần. */
async function visionRead(ai: Ai, dataUrl: string, hint: string, signal?: AbortSignal): Promise<string> {
  const msgs: AiMessage[] = [
    { role: "system", content: OCR_SYSTEM },
    { role: "user", content: [{ type: "text", text: hint }, { type: "image_url", image_url: { url: dataUrl } }] },
  ];
  try {
    return clean(await ai.chat(OCR_TASK, msgs, { signal }));
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return clean(await ai.chat(OCR_TASK, msgs, { signal }));
  }
}

export function createVisionOcr(ai: Ai): OcrProvider {
  return {
    info: { id: "ocr-vision", kind: "ocr", label: "AI đọc ảnh (vision)", description: "Mô hình AI qua cổng AI của trường đọc chữ + công thức trong ảnh/trang scan.", local: false, free: true },
    async check() {
      try {
        await ai.chat(OCR_TASK, [{ role: "user", content: "Trả lời đúng một chữ: ok" }]);
        return { ok: true, detail: "Cổng AI trả lời" };
      } catch (e) {
        return { ok: false, detail: (e as Error).message };
      }
    },
    async ocr(req) {
      return { text: await visionRead(ai, `data:${req.mime};base64,${req.image.toString("base64")}`, req.hint ?? "Ảnh tài liệu.", req.signal) };
    },
  };
}

async function renderPage(file: string, page: number, dir: string): Promise<string> {
  const base = join(dir, `p${page}`);
  try {
    await run("pdftoppm", ["-jpeg", "-jpegopt", "quality=85", "-r", "120", "-f", String(page), "-l", String(page), "-singlefile", file, base], { timeout: 60_000 });
  } catch (e) {
    if ((e as { code?: string }).code === "ENOENT") throw new ValidationError(["Máy chủ chưa cài pdftoppm (poppler-utils) nên chưa đọc được PDF scan"]);
    throw new ValidationError([`Không render được trang ${page} của PDF`]);
  }
  return (await readFile(`${base}.jpg`)).toString("base64");
}

/** OCR các trang (đánh số từ 1) của PDF. Trả Map trang → chữ. `onProgress` gọi sau mỗi trang xong. */
export async function ocrPdfPages(buf: Buffer, pageNos: number[], ai: Ai, onProgress?: (p: OcrProgress) => void): Promise<Map<number, string>> {
  if (pageNos.length > OCR_MAX_PAGES) throw new ValidationError([`PDF scan có ${pageNos.length} trang, vượt giới hạn ${OCR_MAX_PAGES} trang mỗi lần`]);
  const dir = await mkdtemp(join(tmpdir(), "eduvn-ocr-"));
  const out = new Map<number, string>();
  try {
    const file = join(dir, "in.pdf");
    await writeFile(file, buf);
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < pageNos.length) {
        const page = pageNos[next++]!;
        const b64 = await renderPage(file, page, dir);
        out.set(page, await visionRead(ai, `data:image/jpeg;base64,${b64}`, `Trang ${page}.`));
        onProgress?.({ total: pageNos.length, done: ++done });
      }
    };
    onProgress?.({ total: pageNos.length, done: 0 });
    await Promise.all(Array.from({ length: Math.min(OCR_CONCURRENCY, pageNos.length) }, worker));
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
