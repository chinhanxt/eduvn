// server/tests/domain/board.test.ts
import { describe, expect, it } from "vitest";
import { sampleDoc } from "../helpers/board";
import { emptyBoardDoc, validateBoard } from "../../src/domain/board";

const meta = { title: "Ôn tập hình không gian", subject: "Toán", grade: 11, topic: "Thiết diện" };

describe("validateBoard", () => {
  it("nhận tài liệu hợp lệ", () => {
    const r = validateBoard({ ...meta, doc: sampleDoc() }, "save");
    expect(r.ok).toBe(true);
  });
  it("tạo mới không có doc → 1 trang trống", () => {
    const r = validateBoard(meta, "create");
    expect(r.ok && r.board.doc).toEqual(emptyBoardDoc());
  });
  it("lưu bắt buộc có doc; báo lỗi tiếng Việt kèm đường dẫn", () => {
    const r = validateBoard(meta, "save");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toContain('"doc"');
  });
  it("giới hạn: 30 trang, loại khối, màu", () => {
    const pages = Array.from({ length: 31 }, (_, i) => ({ id: `p${i}`, objects: [] }));
    const r1 = validateBoard({ ...meta, doc: { version: 1, pages } }, "save");
    expect(!r1.ok && r1.issues.join()).toContain("Tối đa 30 trang");
    const bad = sampleDoc();
    (bad.pages[0]!.objects[2] as { kind: string }).kind = "sphere";
    expect(validateBoard({ ...meta, doc: bad }, "save").ok).toBe(false);
    const bad2 = sampleDoc();
    (bad2.pages[0]!.objects[0] as { color: string }).color = "red";
    expect(validateBoard({ ...meta, doc: bad2 }, "save").ok).toBe(false);
  });
});
