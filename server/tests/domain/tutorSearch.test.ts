import { describe, expect, it } from "vitest";
import { Bm25, chunkPages, citedNumbers, foldVi, tokenize } from "../../src/domain/tutorSearch";

describe("tiếng Việt", () => {
  it("bỏ dấu, đ→d; token gồm âm tiết, cặp âm tiết và âm tiết có dấu", () => {
    expect(foldVi("Hằng đẳng thức Đáng Nhớ")).toBe("hang dang thuc dang nho");
    const t = tokenize("Hằng đẳng thức");
    expect(t).toContain("hang");
    expect(t).toContain("~hằng");
    expect(t).toContain("hang_dang");
    expect(tokenize("là của và")).toEqual([]);
  });
});

describe("chia đoạn theo trang", () => {
  it("giữ số trang, gói đoạn văn, cắt cứng đoạn quá dài có chồng lấn", () => {
    const long = "Câu thứ nhất khá dài để thử. ".repeat(60);
    const chunks = chunkPages(["Đoạn một.\n\nĐoạn hai của trang một nữa.", long, ""], { size: 300, overlap: 40 });
    expect(chunks[0]).toMatchObject({ page: 1 });
    expect(chunks.filter((c) => c.page === 2).length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.text.length <= 340)).toBe(true);
    expect(chunks.map((c) => c.idx)).toEqual(chunks.map((_, i) => i));
    expect(chunks.some((c) => c.page === 3)).toBe(false);
  });
});

describe("BM25", () => {
  const docs = [
    { text: "Hằng đẳng thức bình phương của một tổng: (a+b)^2 = a^2 + 2ab + b^2", id: "tong" },
    { text: "Hằng đẳng thức hiệu hai bình phương: a^2 - b^2 = (a-b)(a+b)", id: "hieu" },
    { text: "Định luật Ôm cho đoạn mạch: cường độ dòng điện tỉ lệ thuận với hiệu điện thế", id: "om" },
    { text: "Quang hợp là quá trình cây xanh tạo chất hữu cơ nhờ ánh sáng", id: "quanghop" },
  ];
  const idx = new Bm25(docs);
  it("xếp đúng đoạn, không dấu vẫn tìm được", () => {
    expect(idx.search("bình phương của một tổng", 2)[0]?.item.id).toBe("tong");
    expect(idx.search("hieu hai binh phuong", 1)[0]?.item.id).toBe("hieu");
    expect(idx.search("định luật ôm", 1)[0]?.item.id).toBe("om");
    expect(idx.search("zzz không có", 3)).toEqual([]);
  });
  it("truy hồi < 50 ms với 5.000 đoạn", () => {
    const words = "cây xanh nước đất không khí ánh sáng phương trình hàm số đồ thị tam giác đường tròn lực gia tốc vận tốc năng lượng điện từ hoá học phản ứng axit bazơ muối".split(" ");
    const big = Array.from({ length: 5000 }, (_, i) => ({ id: String(i), text: Array.from({ length: 80 }, (_, j) => words[(i * 7 + j * 13 + (i % 11) * j) % words.length]).join(" ") }));
    big.push({ id: "đích", text: "Công thức Viète liên hệ tổng và tích hai nghiệm của phương trình bậc hai" });
    const t0 = performance.now();
    const index = new Bm25(big);
    const build = performance.now() - t0;
    const t1 = performance.now();
    for (let i = 0; i < 20; i++) index.search("tổng và tích hai nghiệm của phương trình bậc hai", 5);
    const per = (performance.now() - t1) / 20;
    expect(index.search("tổng và tích hai nghiệm của phương trình bậc hai", 1)[0]?.item.id).toBe("đích");
    console.log(`BM25 5001 đoạn: dựng ${build.toFixed(0)} ms, tìm ${per.toFixed(2)} ms/lần`);
    expect(per).toBeLessThan(50);
  });
  it("citedNumbers", () => {
    expect(citedNumbers("Theo [2] và [1], lại [2] và a[10] [x]")).toEqual([2, 1, 10]);
  });
});
