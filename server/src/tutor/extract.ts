// Tách chữ theo trang từ PDF / DOCX / TXT / MD.
// Port ý tưởng từ DeepTutor deeptutor/services/parsing (Apache-2.0), đã sửa: PDF dùng `pdftotext`
// (poppler) thay vì MinerU/docling; DOCX đọc trực tiếp word/document.xml; không OCR.
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import JSZip from "jszip";
import type { LessonPlan } from "../domain/lesson";
import { ValidationError } from "../errors";

const run = promisify(execFile);
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
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

async function pdfPages(buf: Buffer): Promise<string[]> {
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
    return pages;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const XML_ENT: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

async function docxPages(buf: Buffer): Promise<string[]> {
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

export async function extractPages(name: string, buf: Buffer): Promise<string[]> {
  if (buf.length > MAX_FILE_BYTES) throw new ValidationError(["File quá lớn (tối đa 20 MB)"]);
  const ext = name.toLowerCase().split(".").pop() ?? "";
  let pages: string[];
  if (ext === "pdf") pages = await pdfPages(buf);
  else if (ext === "docx") pages = await docxPages(buf);
  else if (["txt", "md", "markdown"].includes(ext)) pages = paginateText(buf.toString("utf8"));
  else throw new ValidationError([`Chưa hỗ trợ định dạng .${ext || "?"} (nhận PDF, DOCX, TXT, MD)`]);
  if (!pages.some((p) => p.trim().length > 0)) throw new ValidationError(["Tài liệu không có chữ để đọc (PDF scan cần OCR trước)"]);
  return pages;
}

/** Giáo án EDUVN → chữ thường, mỗi hoạt động một trang. */
export function lessonPlanPages(plan: LessonPlan): string[] {
  const h = plan.header;
  const head = [`Bài: ${h.title}`, `Môn: ${h.subject}${h.grade ? ` lớp ${h.grade}` : ""}`, "Mục tiêu kiến thức:", ...plan.objectives.knowledge.map((k) => `- ${k}`), "Năng lực đặc thù:", ...plan.objectives.competencies.specific.map((k) => `- ${k}`), plan.materials.length ? `Học liệu: ${plan.materials.join("; ")}` : ""].filter(Boolean).join("\n");
  const pages = [head];
  for (const a of plan.activities) {
    const block = (x: { name: string; goal: string; content: string; product: string }) => [x.name && `Hoạt động: ${x.name}`, x.goal && `Mục tiêu: ${x.goal}`, x.content && `Nội dung: ${x.content}`, x.product && `Sản phẩm: ${x.product}`].filter(Boolean).join("\n");
    pages.push([block(a), ...a.subs.map(block)].filter(Boolean).join("\n\n"));
  }
  return pages.filter((p) => p.trim());
}
