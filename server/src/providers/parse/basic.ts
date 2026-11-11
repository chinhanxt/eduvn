// PDF (pdftotext, trang scan → OCR vision) · DOCX (đọc thẳng word/document.xml) · TXT/MD (trang giả ~2500 ký tự).
// Port ý tưởng từ DeepTutor deeptutor/services/parsing (Apache-2.0), đã sửa. Chuyển từ tutor/extract.ts (P6/P12).
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { ValidationError } from "../../errors";
import type { Ai } from "../../services/ai";
import { type OcrProgress, ocrPdfPages } from "../ocr/vision";
import { extOf } from "../registry";
import type { ParseProvider } from "../types";
import { commandExists, run } from "../util";

export type ExtractOpts = { ai?: Ai; onProgress?: (p: OcrProgress) => void };
const PSEUDO_PAGE_CHARS = 2500;

/** Gom đoạn văn thành "trang" giả khoảng 2500 ký tự (TXT/MD/DOCX không có trang thật). */
export function paginateText(text: string, pageChars = PSEUDO_PAGE_CHARS): string[] {
  const paras = text.normalize("NFC").replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const pages: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length > pageChars) {
      pages.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) pages.push(cur);
  return pages;
}

/** Chữ theo trang; trang không có lớp chữ (PDF scan) được OCR nếu có `opts.ai`. */
export async function pdfPages(buf: Buffer, opts: ExtractOpts = {}): Promise<string[]> {
  const dir = await mkdtemp(join(tmpdir(), "eduvn-pdf-"));
  try {
    const file = join(dir, "in.pdf");
    await writeFile(file, buf);
    let out: string;
    try {
      ({ stdout: out } = await run("pdftotext", ["-enc", "UTF-8", file, "-"], { maxBuffer: 64 * 1024 * 1024, timeout: 120_000 }));
    } catch (e) {
      if ((e as { code?: string }).code === "ENOENT") throw new ValidationError(["Máy chủ chưa cài pdftotext (poppler-utils) nên chưa đọc được PDF"]);
      throw new ValidationError(["Không đọc được file PDF (file hỏng hoặc có mật khẩu)"]);
    }
    const pages = out.split("\f");
    if (pages.length && pages[pages.length - 1]!.trim() === "") pages.pop();
    const blank = pages.flatMap((p, i) => (p.trim() ? [] : [i + 1]));
    if (blank.length && opts.ai) {
      const texts = await ocrPdfPages(buf, blank, opts.ai, opts.onProgress);
      for (const [n, t] of texts) pages[n - 1] = t;
    }
    return pages;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const XML_ENT: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

export async function docxPages(buf: Buffer): Promise<string[]> {
  let xml: string | undefined;
  try {
    xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")?.async("string");
  } catch {
    throw new ValidationError(["Không đọc được file DOCX"]);
  }
  if (!xml) throw new ValidationError(["File DOCX không có nội dung (thiếu word/document.xml)"]);
  const pages: string[] = [];
  let cur: string[] = [];
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const para = m[0];
    const text = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>/g)].map((t) => (t[1] === undefined ? " " : t[1])).join("").replace(/&(amp|lt|gt|quot|apos);/g, (e) => XML_ENT[e]!);
    if (text.trim()) cur.push(text.trim());
    if (/<w:br[^>]*w:type="page"/.test(para) || para.includes("<w:lastRenderedPageBreak/>")) {
      if (cur.length) pages.push(cur.join("\n\n"));
      cur = [];
    }
  }
  if (cur.length) pages.push(cur.join("\n\n"));
  // Không có ngắt trang thật → chia trang giả.
  return pages.length > 1 ? pages : paginateText(pages.join("\n\n"));
}

export const BASIC_FORMATS = ["pdf", "docx", "txt", "md", "markdown"];

export function createBasicParser(ai?: Ai): ParseProvider {
  return {
    info: { id: "pdftotext", kind: "parse", label: "Bộ đọc cơ bản", description: "PDF bằng pdftotext (trang scan → AI đọc ảnh), DOCX, TXT, Markdown.", local: true, free: true, formats: BASIC_FORMATS },
    async check() {
      return (await commandExists("pdftotext")) ? { ok: true, detail: "Sẵn sàng · pdftotext (poppler)" } : { ok: false, detail: "Chưa cài poppler-utils (pdftotext) — vẫn đọc được DOCX/TXT/MD" };
    },
    async parse(name, buf, opts = {}) {
      const ext = extOf(name);
      const pages = ext === "pdf" ? await pdfPages(buf, { ai, onProgress: opts.onProgress }) : ext === "docx" ? await docxPages(buf) : paginateText(buf.toString("utf8"));
      return { pages, engine: "pdftotext", format: ext, warnings: [] };
    },
  };
}
