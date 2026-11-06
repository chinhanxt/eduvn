import { describe, expect, it } from "vitest";
import { rankRelated, words } from "../../src/domain/related";
import { mcq, stored } from "../helpers/fixtures";

const bank = [
  stored(mcq({ topic: "Thiết diện", stem: "Cho hình lập phương $ABCD.A'B'C'D'$. Thiết diện cắt bởi $(MNP)$ là hình gì?" }), "q1"),
  stored(mcq({ topic: "Hàm số bậc hai", stem: "Đỉnh của parabol $y=x^2-3$ là" }), "q2"),
  stored(mcq({ topic: "Mệnh đề", stem: "Câu nào là mệnh đề?" }), "q3"),
  stored(mcq({ topic: "Thiết diện", stem: "Hình chóp $S.ABCD$ cắt bởi mặt phẳng qua trung điểm" }), "q4"),
];

describe("words", () => {
  it("chữ thường, bỏ từ 1 ký tự và từ dừng", () => {
    expect([...words("Cho hình lập phương ABCD, tính x")]).toEqual(["hình", "lập", "phương", "abcd"]);
  });
});

describe("rankRelated", () => {
  it("đúng chủ đề + nhiều từ khoá trên bảng đứng trước; không khớp gì thì bỏ", () => {
    const r = rankRelated(bank, { topic: "Thiết diện", text: "hình lập phương thiết diện" }, 5);
    expect(r.map((q) => q.id)).toEqual(["q1", "q4"]);
  });
  it("không có chủ đề: chỉ theo từ khoá", () => {
    expect(rankRelated(bank, { text: "parabol" }, 5).map((q) => q.id)).toEqual(["q2"]);
  });
  it("bỏ câu đã loại trừ; giới hạn số câu", () => {
    expect(rankRelated(bank, { topic: "Thiết diện", exclude: ["q1"] }, 5).map((q) => q.id)).toEqual(["q4"]);
    expect(rankRelated(bank, { topic: "Thiết diện" }, 1)).toHaveLength(1);
  });
});
