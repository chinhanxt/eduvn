import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { answerKey, makeVariants } from "../../src/domain/variants";
import { renderAnswerKeyDocx, renderExamDocx } from "../../src/export/docx";
import { essay, mcq, short, stored, tf } from "../helpers/fixtures";

const meta = { title: "Kiểm tra 15 phút", subject: "Toán", grade: 10, durationMinutes: 15, school: "THPT Nguyễn Du" };
const pool = [stored(mcq({ stem: "Câu hỏi trắc nghiệm số một" }), "m1"), stored(tf(), "t1"), stored(short(), "s1"), stored(essay(), "e1")];

async function documentXml(buf: Buffer): Promise<string> {
  expect(buf.subarray(0, 2).toString()).toBe("PK");
  const file = (await JSZip.loadAsync(buf)).file("word/document.xml");
  if (!file) throw new Error("no document.xml");
  return file.async("string");
}

describe("renderExamDocx", () => {
  it("có đầu đề, mã đề, các phần, câu hỏi, HẾT", async () => {
    const [v] = makeVariants(pool, 1, 1);
    const xml = await documentXml(await renderExamDocx(meta, v!));
    for (const s of [
      "THPT Nguyễn Du",
      "KIỂM TRA 15 PHÚT",
      "Môn: Toán – Lớp 10 – Thời gian làm bài: 15 phút",
      "Mã đề: 101",
      "PHẦN I.",
      "PHẦN II.",
      "PHẦN III.",
      "PHẦN IV.",
      "Câu 1.",
      "Câu hỏi trắc nghiệm số một",
      "a) 3 là số nguyên tố",
      "(1 điểm)",
      "HẾT",
    ]) {
      expect(xml).toContain(s);
    }
  });

  it("đại học hiển thị Năm thay cho Lớp", async () => {
    const [v] = makeVariants(pool, 1, 1);
    const xml = await documentXml(await renderExamDocx({ ...meta, grade: 13 }, v!));
    expect(xml).toContain("Năm 1");
  });
});

describe("renderAnswerKeyDocx", () => {
  it("bảng đáp án cho từng mã đề", async () => {
    const vs = makeVariants(pool, 2, 1);
    const xml = await documentXml(await renderAnswerKeyDocx(meta, vs.map((v) => ({ code: v.code, entries: answerKey(v) }))));
    for (const s of ["ĐÁP ÁN", "Mã đề 101", "Mã đề 102", "ĐSSĐ", "1,5", "Tự luận"]) expect(xml).toContain(s);
  });
});
