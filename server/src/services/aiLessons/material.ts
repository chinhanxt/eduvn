/** Trích chữ từ tài liệu GV tải lên (PDF/DOCX/TXT) làm `pdfText` cho dàn ý. Ý tưởng từ lib/server/material-extraction của OpenMAIC (MIT), viết lại gọn. */
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import JSZip from "jszip";
import { ValidationError } from "../../errors";

const run = promisify(execFile);
export const MAX_MATERIAL_CHARS = 40_000;

async function pdfText(buf: Buffer): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "eduvn-mat-"));
  try {
    const f = path.join(dir, "in.pdf");
    await writeFile(f, buf);
    const { stdout } = await run("pdftotext", ["-enc", "UTF-8", f, "-"], { maxBuffer: 32 * 1024 * 1024, timeout: 60_000 });
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const unxml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

async function docxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new ValidationError(["File DOCX không có nội dung"]);
  return unxml(
    xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

/** Trả văn bản đã gọn, cắt ở MAX_MATERIAL_CHARS. */
export async function extractMaterialText(name: string, buf: Buffer): Promise<string> {
  const ext = path.extname(name).toLowerCase();
  let text: string;
  if (ext === ".pdf") text = await pdfText(buf);
  else if (ext === ".docx") text = await docxText(buf);
  else if (ext === ".txt" || ext === ".md") text = buf.toString("utf8");
  else throw new ValidationError(["Chỉ hỗ trợ tài liệu PDF, DOCX, TXT"]);
  text = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new ValidationError(["Không đọc được chữ trong tài liệu (có thể là PDF ảnh quét)"]);
  return text.slice(0, MAX_MATERIAL_CHARS);
}

/** Giáo án EDUVN (JSON) → văn bản phẳng cho dàn ý. */
export function lessonPlanText(plan: unknown): string {
  const out: string[] = [];
  const walk = (v: unknown, key = ""): void => {
    if (typeof v === "string") out.push(key ? `${key}: ${v}` : v);
    else if (typeof v === "number") out.push(`${key}: ${v}`);
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(plan);
  return out.join("\n").slice(0, MAX_MATERIAL_CHARS);
}
