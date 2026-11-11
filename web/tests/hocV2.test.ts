import { describe, expect, it } from "vitest";
import { givenName, mascotLine, moodForScore } from "../src/portal/hoc/mascot";
import { asgAction, asgCounts, band, bySubject, ddmm, dueTone, filterAsg, notRight, scoredOf, sectionLabels, sectionScores, spent, subjectsOf, summary, verdictOf } from "../src/student/data";
import { HOC_PATH, hocV2Path, isCardQr } from "../src/student/paths";
import type { MyAssignment, ReviewItem } from "../src/student/types";

const asg = (o: Partial<MyAssignment>): MyAssignment => ({
  id: "a1",
  title: "Bài",
  kind: "practice",
  subject: "Toán",
  questionCount: 10,
  durationMinutes: 15,
  opensAt: "2026-11-01T00:00:00.000Z",
  dueAt: "2026-11-11T14:00:00.000Z",
  attemptsAllowed: 1,
  attemptsUsed: 0,
  state: "chua_lam",
  canStart: true,
  answered: 0,
  score10: null,
  currentSubmissionId: null,
  lastSubmissionId: null,
  ...o,
});
const item = (o: Partial<ReviewItem> & Pick<ReviewItem, "type">): ReviewItem => ({ no: 1, section: o.type, stem: "x", maxPoints: 1, response: null, points: 1, correct: true, options: ["a", "b"], statements: [], ...o }) as ReviewItem;

describe("đường cổng Học v2", () => {
  it("đường P9a cũ /hoc/hs/… → bài tập, làm bài, kết quả", () => {
    expect(hocV2Path("/hoc/hs")).toBe("/hoc/bai-tap");
    expect(hocV2Path("/hoc/hs/")).toBe("/hoc/bai-tap");
    expect(hocV2Path("/hoc/hs/qr")).toBe("/hoc/bai-tap/qr");
    expect(hocV2Path("/hoc/hs/bai/abc")).toBe("/hoc/lam-bai/abc");
    expect(hocV2Path("/hoc/hs/ket-qua/s1")).toBe("/hoc/ket-qua/s1");
    expect(hocV2Path("/hoc/hs/la")).toBe("/hoc/bai-tap");
    expect(hocV2Path("/hoc/bai-tap")).toBeNull();
    expect(hocV2Path("/hoc/hsx")).toBeNull();
  });
  it("đường mới + thẻ QR cũ và mới đều nhận", () => {
    expect(HOC_PATH.lamBai("a b")).toBe("/hoc/lam-bai/a%20b");
    expect(HOC_PATH.ketQua()).toBe("/hoc/ket-qua");
    expect(isCardQr("https://x.vn/hs/qr#t", "https://x.vn")).toBe(true);
    expect(isCardQr("https://x.vn/hoc/bai-tap/qr#t", "https://x.vn")).toBe(true);
    expect(isCardQr("https://evil.vn/hs/qr#t", "https://x.vn")).toBe(false);
  });
});

describe("danh sách bài", () => {
  const rows = [
    asg({ id: "1", state: "dang_lam", dueAt: "2026-11-12T00:00:00Z", answered: 6, questionCount: 12 }),
    asg({ id: "2", state: "chua_lam", dueAt: "2026-11-11T10:00:00Z" }),
    asg({ id: "3", state: "chua_mo", dueAt: "2026-11-10T00:00:00Z" }),
    asg({ id: "4", state: "da_nop", subject: "Ngữ văn", score10: 8, lastSubmissionId: "s4", canStart: false }),
    asg({ id: "5", state: "qua_han" }),
  ];
  it("Cần làm theo hạn gần nhất, bài chưa mở cuối; lọc môn", () => {
    expect(filterAsg(rows, "can-lam").map((a) => a.id)).toEqual(["2", "1", "3"]);
    expect(filterAsg(rows, "da-nop").map((a) => a.id)).toEqual(["4"]);
    expect(asgCounts(rows)).toEqual({ "can-lam": 3, "da-nop": 1, "tat-ca": 5 });
    expect(asgCounts(rows, "Ngữ văn")).toEqual({ "can-lam": 0, "da-nop": 1, "tat-ca": 1 });
    expect(subjectsOf(rows)).toEqual(["Ngữ văn", "Toán"]);
  });
  it("nút chính của thẻ", () => {
    expect(asgAction(rows[0]!)).toMatchObject({ label: "Làm tiếp câu 7", to: "/hoc/lam-bai/1", primary: true });
    expect(asgAction(rows[1]!)).toMatchObject({ label: "Làm bài", to: "/hoc/lam-bai/2" });
    expect(asgAction(rows[2]!).to).toBeNull();
    expect(asgAction(rows[3]!)).toMatchObject({ label: "Xem kết quả", to: "/hoc/ket-qua/s4", primary: false });
    expect(asgAction(asg({ state: "da_nop", canStart: true, lastSubmissionId: "s" })).label).toBe("Làm lại");
    expect(asgAction(rows[4]!).to).toBeNull();
  });
  it("mức gấp hạn nộp", () => {
    const now = Date.parse("2026-11-11T09:00:00Z");
    expect(dueTone(rows[1]!, now)).toBe("hot");
    expect(dueTone(rows[0]!, now)).toBe("");
    expect(dueTone(rows[3]!, now)).toBe("ok");
    expect(dueTone(rows[4]!, now)).toBe("late");
  });
});

describe("kết quả một bài", () => {
  const items = [
    item({ no: 1, type: "mcq", points: 0.25, maxPoints: 0.25, correct: true }),
    item({ no: 2, type: "mcq", points: 0, maxPoints: 0.25, correct: false }),
    item({ no: 3, type: "true_false", points: 0.5, maxPoints: 1, correct: false }),
    item({ no: 4, type: "essay", points: null, maxPoints: 2, correct: null }),
  ];
  it("điểm theo phần theo thứ tự xuất hiện, câu chờ chấm đếm riêng", () => {
    expect(sectionScores(items)).toEqual([
      { label: "I · Nhiều lựa chọn", got: 0.25, max: 0.5, pending: 0 },
      { label: "II · Đúng/Sai", got: 0.5, max: 1, pending: 0 },
      { label: "III · Tự luận", got: 0, max: 2, pending: 1 },
    ]);
    expect(sectionLabels(items)).toEqual(["Phần I · Nhiều lựa chọn", "Phần I · Nhiều lựa chọn", "Phần II · Đúng/Sai", "Phần III · Tự luận"]);
  });
  it("đúng / một phần / sai / chờ chấm; lọc Chưa đúng", () => {
    expect(items.map(verdictOf)).toEqual(["ok", "bad", "part", "wait"]);
    expect(notRight(items).map((i) => i.no)).toEqual([2, 3]);
  });
  it("thời gian, xếp loại, ngày", () => {
    expect(spent("2026-11-11T10:00:00Z", "2026-11-11T10:12:40Z")).toBe("12′40″");
    expect(spent("2026-11-11T10:00:00Z", "2026-11-11T10:00:09Z")).toBe("9″");
    expect(spent("2026-11-11T10:00:00Z", null)).toBe("—");
    expect([9.5, 8, 7, 5, 4.9].map(band)).toEqual(["Xuất sắc", "Giỏi", "Khá", "Đạt", "Cần cố gắng"]);
    expect(ddmm("2026-11-06T18:00:00Z")).toBe("07/11");
  });
});

describe("kết quả tổng hợp", () => {
  const rows = [
    asg({ id: "a", score10: 6, lastSubmissionId: "x", dueAt: "2026-11-01T00:00:00Z" }),
    asg({ id: "b", score10: 4, lastSubmissionId: "y", dueAt: "2026-11-05T00:00:00Z", subject: "Ngữ văn" }),
    asg({ id: "c", score10: 8.5, lastSubmissionId: "z", dueAt: "2026-11-09T00:00:00Z" }),
    asg({ id: "d", score10: null }),
  ];
  it("bài có điểm cũ → mới, tóm tắt + chênh lệch bài gần nhất", () => {
    const s = scoredOf(rows);
    expect(s.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(summary(s)).toEqual({ n: 3, avg: 6.17, best: 8.5, last: 8.5, delta: 4.5, below: 1 });
    expect(summary(scoredOf(rows, "Toán"))).toMatchObject({ n: 2, delta: 2.5, below: 0 });
    expect(summary([])).toEqual({ n: 0, avg: null, best: null, last: null, delta: null, below: 0 });
  });
  it("theo môn: môn nhiều bài lên trước", () => {
    expect(bySubject(scoredOf(rows))).toEqual([
      { subject: "Toán", n: 2, avg: 7.3, last: 8.5 },
      { subject: "Ngữ văn", n: 1, avg: 4, last: 4 },
    ]);
  });
});

describe("linh vật Mầm", () => {
  it("tâm trạng theo điểm + câu nói", () => {
    expect([null, 9, 6, 3].map(moodForScore)).toEqual(["chao", "khen", "chao", "dong-vien"]);
    expect(mascotLine("khen", { name: "Anh" })).toBe("Giỏi quá, Anh!");
    expect(mascotLine("chuoi", { streak: 5 })).toBe("5 ngày liên tiếp rồi!");
    expect(mascotLine("chao", { left: 2, name: "Anh" })).toBe("Còn 2 bài cần làm, Anh.");
    expect(mascotLine("chao", { left: 0 })).toBe("Xong hết bài rồi!");
    expect(givenName(" Nguyễn Minh  Anh ")).toBe("Anh");
    expect(givenName(null)).toBe("");
  });
});

import { againIn, canSubmit, clockText, levelOf, markOf, optState, sessionDots } from "../src/hoc/practice";
describe("luyện tập", () => {
  it("mức độ, trạng thái phương án, đủ điều kiện nộp", () => {
    expect(levelOf("th")).toEqual(["Thông hiểu", 2]);
    expect(levelOf("VDC")).toEqual(["Vận dụng cao", 4]);
    expect(levelOf("khác")).toEqual(["khác", 2]);
    expect([0, 1, 2].map((i) => optState(i, 2, 1, true))).toEqual(["dim", "right", "wrong"]);
    expect([0, 1].map((i) => optState(i, 1, undefined, false))).toEqual(["", "on"]);
    expect(canSubmit({ type: "mcq" }, 0)).toBe(true);
    expect(canSubmit({ type: "mcq" }, null)).toBe(false);
    expect(canSubmit({ type: "true_false", statements: ["a", "b"] }, [true, null])).toBe(false);
    expect(canSubmit({ type: "true_false", statements: ["a", "b"] }, [true, false])).toBe(true);
    expect(canSubmit({ type: "short_answer" }, "  ")).toBe(false);
  });
  it("chấm phiên, hẹn ôn lại, đồng hồ", () => {
    expect(markOf({ correct: false, partial: true })).toBe("part");
    expect(sessionDots(["ok", "bad"], 3, true)).toEqual(["ok", "bad", "cur", "", "", "", "", ""]);
    expect(sessionDots([], 0, false)).toHaveLength(8);
    expect(againIn(10 / 1440)).toBe("sau 10 phút");
    expect(againIn(0.5)).toBe("trong hôm nay");
    expect(againIn(3.2)).toBe("sau 3 ngày");
    expect(clockText(160)).toBe("2′40″");
  });
});
