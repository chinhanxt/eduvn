import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import PptxGenJS from "pptxgenjs";
import { describe, expect, it } from "vitest";
import { fakeOcr } from "../../src/providers/fakes";
import { parseDocument, registerDefaultParsers } from "../../src/providers/parse";
import { createImageParser } from "../../src/providers/parse/image";
import { createLibreofficePreview } from "../../src/providers/parse/libreoffice";
import { parseCsv, tableToMarkdown } from "../../src/providers/parse/table";
import { ProviderRegistry } from "../../src/providers/registry";
import { extractPages } from "../../src/tutor/extract";

const reg = () => registerDefaultParsers(new ProviderRegistry());

describe("bảng → Markdown", () => {
  it("CSV: ngoặc kép, dấu phẩy/xuống dòng trong ô, tự nhận dấu ;", () => {
    expect(parseCsv('Họ tên,Điểm\n"Nguyễn Văn A, lớp 10A",8.5\n"Dòng ""một""\nhai",7\n')).toEqual([["Họ tên", "Điểm"], ["Nguyễn Văn A, lớp 10A", "8.5"], ['Dòng "một"\nhai', "7"]]);
    expect(parseCsv("﻿a;b\r\n1;2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("tableToMarkdown: bỏ dòng trống, cột thừa; thoát |; tiêu đề trống → Cột n", () => {
    expect(tableToMarkdown([["Tên", "", ""], ["a|b", "x", ""], ["", "", ""]])).toEqual(["| Tên | Cột 2 |\n| --- | --- |\n| a\\|b | x |"]);
    const long = tableToMarkdown([["n"], ...Array.from({ length: 450 }, (_, i) => [String(i)])], "Trang tính: S1");
    expect(long).toHaveLength(3);
    expect(long[1]).toMatch(/^## Trang tính: S1 \(dòng 201–400\)\n\n\| n \|/);
  });
  it("XLSX nhiều trang tính → mỗi trang tính một trang bảng; CSV qua registry", async () => {
    const wb = new ExcelJS.Workbook();
    const a = wb.addWorksheet("Lớp 10A");
    a.addRow(["STT", "Họ tên", "Điểm"]);
    a.addRow([1, "Trần Thị Bình", 9]);
    a.addRow([2, "Lê Văn Cường", { formula: "4+4", result: 8 }]);
    wb.addWorksheet("Trống");
    const b = wb.addWorksheet("Ghi chú");
    b.addRow(["Hạn nộp"]);
    b.addRow([new Date("2026-11-20T00:00:00Z")]);
    const r = await parseDocument(reg(), "diem.xlsx", Buffer.from(await wb.xlsx.writeBuffer()));
    expect(r.engine).toBe("bang-tinh");
    expect(r.pages).toEqual(["## Trang tính: Lớp 10A\n\n| STT | Họ tên | Điểm |\n| --- | --- | --- |\n| 1 | Trần Thị Bình | 9 |\n| 2 | Lê Văn Cường | 8 |", "## Trang tính: Ghi chú\n\n| Hạn nộp |\n| --- |\n| 2026-11-20 |"]);
    expect((await parseDocument(reg(), "ds.csv", Buffer.from("a,b\n1,2"))).pages).toEqual(["| a | b |\n| --- | --- |\n| 1 | 2 |"]);
  });
});

describe("ảnh → OCR", () => {
  it("PNG gửi thẳng; GIF đổi sang PNG bằng ffmpeg rồi mới OCR", async () => {
    const seen: string[] = [];
    const ocr = fakeOcr("Bài 1. Tính $2+3$");
    const spy = { ...ocr, ocr: async (req: Parameters<typeof ocr.ocr>[0]) => (seen.push(`${req.mime}:${req.image.subarray(1, 4).toString()}`), ocr.ocr(req)) };
    const p = createImageParser(() => spy);
    const dir = mkdtempSync(path.join(tmpdir(), "eduvn-gif-"));
    try {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=white:s=32x32", "-frames:v", "1", path.join(dir, "a.gif")]);
      const r = await p.parse("de.gif", readFileSync(path.join(dir, "a.gif")));
      expect(r).toMatchObject({ pages: ["Bài 1. Tính $2+3$"], format: "gif", engine: "anh-ocr/gia-ocr" });
      expect(seen).toEqual(["image/png:PNG"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("không có OCR → lỗi rõ", async () => {
    await expect(parseDocument(reg(), "a.png", Buffer.from("x"))).rejects.toThrow(/OCR/);
  });
});

describe("LibreOffice headless", () => {
  it("PPTX → PDF → chữ, mỗi slide một trang; định dạng lạ báo danh sách nhận được", async () => {
    const pptx = new PptxGenJS();
    pptx.addSlide().addText("Định luật Ôm", { x: 1, y: 1, w: 8, h: 1 });
    pptx.addSlide().addText("I = U / R — cường độ dòng điện", { x: 1, y: 1, w: 8, h: 1 });
    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const pages = await extractPages("bai-giang.pptx", buf);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain("Định luật Ôm");
    expect(pages[1]).toContain("cường độ dòng điện");
    await expect(extractPages("a.exe", Buffer.from("x"))).rejects.toThrow(/Chưa hỗ trợ định dạng \.exe \(nhận .*PPTX.*XLSX/);
  }, 120_000);
  it("xem trước: DOCX → PDF", async () => {
    const JSZip = (await import("jszip")).default;
    const z = new JSZip();
    z.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Giáo án tuần 12</w:t></w:r></w:p></w:body></w:document>');
    const pdf = await createLibreofficePreview().toPdf("giao-an.docx", await z.generateAsync({ type: "nodebuffer" }));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 120_000);
});
