// LibreOffice headless: DOC/PPT/XLS/PPTX/ODT/ODP/ODS/RTF → PDF → chữ theo trang (pdftotext, trang trống → OCR vision).
// Mỗi lần chuyển dùng hồ sơ LibreOffice riêng trong /tmp (chạy song song không giẫm nhau), tối đa 1 tiến trình soffice một lúc.
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ValidationError } from "../../errors";
import type { Ai } from "../../services/ai";
import { extOf } from "../registry";
import type { ParseProvider, PreviewProvider } from "../types";
import { commandExists, isMissing, run } from "../util";
import { pdfPages } from "./basic";

export const OFFICE_FORMATS = ["doc", "ppt", "pptx", "xls", "odt", "odp", "ods", "rtf"];
/** Xem trước được thêm DOCX/XLSX (đọc chữ thì đã có bộ riêng nhanh hơn). */
export const PREVIEW_FORMATS = [...OFFICE_FORMATS, "docx", "xlsx"].sort();

let chain: Promise<unknown> = Promise.resolve();
/** Hàng đợi một việc: soffice ăn ~300 MB RAM mỗi tiến trình. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn, fn);
  chain = p.catch(() => undefined);
  return p;
}

export async function officeToPdf(name: string, buf: Buffer, soffice = "soffice", timeoutMs = 180_000): Promise<Buffer> {
  return serial(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "eduvn-lo-"));
    try {
      const ext = extOf(name) || "bin";
      const src = path.join(dir, `in.${ext}`);
      await writeFile(src, buf);
      const profile = pathToFileURL(path.join(dir, "profile")).href;
      try {
        await run(soffice, [`-env:UserInstallation=${profile}`, "--headless", "--norestore", "--nolockcheck", "--convert-to", "pdf", "--outdir", path.join(dir, "out"), src], { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 });
      } catch (e) {
        if (isMissing(e)) throw new ValidationError([`Máy chủ chưa cài LibreOffice nên chưa đọc được file .${ext}`]);
        throw new ValidationError([`LibreOffice không mở được file .${ext} (file hỏng, có mật khẩu hoặc quá lâu)`]);
      }
      const out = (await readdir(path.join(dir, "out")).catch(() => [])).find((f) => f.endsWith(".pdf"));
      if (!out) throw new ValidationError([`LibreOffice không chuyển được file .${ext} sang PDF`]);
      return await readFile(path.join(dir, "out", out));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

const check = (soffice: string) => async () => ((await commandExists(soffice)) ? { ok: true, detail: `Sẵn sàng · ${soffice} --headless` } : { ok: false, detail: "Chưa cài LibreOffice trên máy chủ" });

export function createLibreofficeParser(cfg: { soffice?: string; ai?: Ai } = {}): ParseProvider {
  const soffice = cfg.soffice ?? "soffice";
  return {
    info: { id: "libreoffice", kind: "parse", label: "LibreOffice", description: "Word/PowerPoint/Excel đời cũ, PPTX, OpenDocument, RTF: chuyển sang PDF rồi đọc chữ theo trang (mỗi slide một trang).", local: true, free: true, formats: OFFICE_FORMATS },
    check: check(soffice),
    async parse(name, buf, opts = {}) {
      const pdf = await officeToPdf(name, buf, soffice);
      return { pages: await pdfPages(pdf, { ai: cfg.ai, onProgress: opts.onProgress }), engine: "libreoffice", format: extOf(name), warnings: [] };
    },
  };
}

export function createLibreofficePreview(cfg: { soffice?: string } = {}): PreviewProvider {
  const soffice = cfg.soffice ?? "soffice";
  return {
    info: { id: "libreoffice", kind: "preview", label: "LibreOffice", description: "Xem trước tài liệu văn phòng dưới dạng PDF.", local: true, free: true, formats: PREVIEW_FORMATS },
    check: check(soffice),
    toPdf: (name, buf) => officeToPdf(name, buf, soffice),
  };
}
