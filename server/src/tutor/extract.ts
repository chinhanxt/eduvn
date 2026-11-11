// Tách chữ theo trang từ tài liệu GV/HS tải lên. Đã chuyển sang registry parse của G1 (providers/parse/*):
// PDF/DOCX/TXT/MD như cũ + DOC/PPT/PPTX/XLS/ODT/ODP/ODS/RTF (LibreOffice), XLSX/CSV/TSV (bảng Markdown), ảnh (OCR vision). Giữ API cũ.
import type { LessonPlan } from "../domain/lesson";
import type { Ai } from "../services/ai";
import { type ExtractOpts, paginateText, pdfPages } from "../providers/parse/basic";
import { MAX_FILE_BYTES, parseDocument, registerDefaultParsers } from "../providers/parse";
import { ProviderRegistry } from "../providers/registry";

export { MAX_FILE_BYTES, paginateText, pdfPages, type ExtractOpts };

const cache = new WeakMap<Ai, ProviderRegistry>();
let noAi: ProviderRegistry | undefined;
/** Registry parse mặc định theo cổng AI (OCR cần AI); tạo một lần. */
export function parsersFor(ai?: Ai): ProviderRegistry {
  if (!ai) return (noAi ??= registerDefaultParsers(new ProviderRegistry()));
  let r = cache.get(ai);
  if (!r) cache.set(ai, (r = registerDefaultParsers(new ProviderRegistry(), { ai })));
  return r;
}

export async function extractPages(name: string, buf: Buffer, opts: ExtractOpts = {}): Promise<string[]> {
  return (await parseDocument(parsersFor(opts.ai), name, buf, { onProgress: opts.onProgress })).pages;
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
