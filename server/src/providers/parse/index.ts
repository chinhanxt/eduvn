// Đọc tài liệu qua registry parse: chọn bộ theo phần mở rộng, báo rõ định dạng chưa hỗ trợ.
import { ValidationError } from "../../errors";
import type { Ai } from "../../services/ai";
import { createVisionOcr } from "../ocr/vision";
import { ProviderRegistry, extOf } from "../registry";
import type { ParseOptions, ParseResult } from "../types";
import { createBasicParser } from "./basic";
import { createImageParser } from "./image";
import { createLibreofficeParser } from "./libreoffice";
import { createTableParser } from "./table";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Bộ parse mặc định (pdftotext, bảng tính, LibreOffice, ảnh → OCR vision nếu có cổng AI) đăng ký vào `r`. */
export function registerDefaultParsers(r: ProviderRegistry, cfg: { ai?: Ai; soffice?: string } = {}): ProviderRegistry {
  r.register(createBasicParser(cfg.ai));
  r.register(createTableParser());
  r.register(createLibreofficeParser({ soffice: cfg.soffice, ai: cfg.ai }));
  if (cfg.ai && !r.has("ocr")) r.register(createVisionOcr(cfg.ai));
  r.register(createImageParser(() => r.find("ocr")));
  return r;
}

const FMT_LABEL = (fmts: string[]) => fmts.map((f) => f.toUpperCase()).join(", ");

/** Tài liệu → trang chữ. Lỗi định dạng / file rỗng / quá lớn → ValidationError tiếng Việt. */
export async function parseDocument(r: ProviderRegistry, name: string, buf: Buffer, opts: ParseOptions = {}): Promise<ParseResult> {
  if (buf.length > MAX_FILE_BYTES) throw new ValidationError(["File quá lớn (tối đa 20 MB)"]);
  const p = r.parserFor(name);
  if (!p) throw new ValidationError([`Chưa hỗ trợ định dạng .${extOf(name) || "?"} (nhận ${FMT_LABEL(r.capabilities().parseFormats.filter((f) => f !== "markdown" && f !== "jpeg" && f !== "tiff"))})`]);
  const res = await p.parse(name, buf, opts);
  if (!res.pages.some((x) => x.trim().length > 0)) throw new ValidationError(["Tài liệu không có chữ để đọc (PDF scan chưa đọc được bằng OCR)"]);
  return res;
}
