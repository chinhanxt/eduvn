import { describe, expect, it } from "vitest";
import { GV_FOOT, gvNav } from "../src/portal/gv/nav";
import { hocNav } from "../src/portal/hoc/nav";
import { initialsOf } from "../src/portal/me";
import { heroAction, heroTitle, longDay, metricText, subjectColor } from "../src/portal/hocToday";
import { dueText, filterTasks, type GvTask, type HocToday, pct, signed, taskKey, taskStatus, viewCounts } from "../src/portal/today";
import { defaultCrumbs, isItem, matchNav, type NavItem } from "../src/ui/shell/nav";

const task = (o: Partial<GvTask>): GvTask => ({
  id: "KT-1111-10A1",
  kind: "grade",
  group: "today",
  title: "Chấm · KT",
  className: "10A1",
  classId: "c1",
  progress: { done: 4, total: 10 },
  note: null,
  dueAt: "2026-11-11T10:00:00.000Z",
  dueLabel: "17:00",
  hot: true,
  href: "/lop-hoc/c1",
  detail: { type: "lesson", lessonId: "l", subject: "Toán", grade: 10, periods: 1, date: "2026-11-11", boardId: null },
  ...o,
});

describe("điều hướng khung cổng", () => {
  const items = gvNav().filter(isItem);
  it("mục khớp dài nhất, Hôm nay chỉ khớp đúng /", () => {
    expect(matchNav(items, "/")?.label).toBe("Hôm nay");
    expect(matchNav(items, "/lop-hoc")?.label).toBe("Lớp học");
    expect(matchNav(items, "/lop-hoc/abc")?.label).toBe("Lớp học");
    expect(matchNav(items, "/khong-co")).toBeNull();
  });
  it("breadcrumb mặc định: trang gốc của mục, trang con thêm 'Chi tiết' có link về cha", () => {
    expect(defaultCrumbs(items, "/ngan-hang", items[0]!)).toEqual([{ label: "Ngân hàng câu hỏi" }]);
    expect(defaultCrumbs(items, "/giao-an/42", items[0]!)).toEqual([{ label: "Giáo án", to: "/giao-an" }, { label: "Chi tiết" }]);
    expect(defaultCrumbs(items, "/la", items[0]!)).toEqual([{ label: "Hôm nay" }]);
  });
  it("mục có href (cổng khác) và chấm môn học không được tô 'đang chọn'", () => {
    const xs: NavItem[] = [{ to: "/hoc/giao-trinh", label: "Giáo trình" }, { to: "/hoc/giao-trinh", label: "Toán", dot: "var(--c1)" }, { to: "/choi", href: "/choi", label: "Đấu trường" }];
    expect(matchNav(xs, "/hoc/giao-trinh")?.label).toBe("Giáo trình");
    expect(matchNav(xs, "/choi")).toBeNull();
  });
  it("cổng GV có đủ trang hiện có + phím tắt G không trùng", () => {
    const to = [...items, ...GV_FOOT].map((n) => n.to);
    // /cham-anh gộp vào /cham-bai (UI v2 Đợt 2): đường cũ vẫn chuyển hướng, không còn mục riêng
    for (const p of ["/", "/lop-hoc", "/cham-bai", "/so-diem", "/ngan-hang", "/de-thi", "/bai-giang-ai", "/giao-an", "/bang-giang", "/so-do", "/slide", "/de-cuong", "/tro-choi", "/dau-truong", "/giao-trinh", "/kho-tri-thuc", "/van-ban", "/ket-noi"]) expect(to).toContain(p);
    const keys = items.map((n) => n.kbd).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("đếm trên thanh bên lấy từ dữ liệu Hôm nay", () => {
    const n = gvNav({ classes: 4, grading: 23 }).filter(isItem);
    expect(n.find((x) => x.to === "/cham-bai")?.count).toBe(23);
    expect(n.find((x) => x.to === "/lop-hoc")?.count).toBe(4);
  });
  it("cổng Học: tài khoản có 5 tab + nhóm Môn học; phiên mã lớp chỉ Hôm nay/Bài tập/Đấu trường", () => {
    const d = { upcoming: [{ canStart: true }, { canStart: false }], review: { due: 12, minutes: 5 }, subjects: [{ subject: "Toán" }, { subject: "Ngữ văn" }] } as unknown as HocToday;
    const acc = hocNav(true, d);
    expect(acc.tabs.map((t) => t.label)).toEqual(["Hôm nay", "Bài tập", "Luyện tập", "Gia sư", "Giáo trình"]);
    expect(acc.nav.filter(isItem).filter((n) => n.dot).map((n) => n.label)).toEqual(["Toán", "Ngữ văn"]);
    expect(acc.nav.filter(isItem).find((n) => n.label === "Bài tập")?.count).toBe(1);
    const hs = hocNav(false, d);
    expect(hs.tabs.map((t) => t.label)).toEqual(["Hôm nay", "Bài tập", "Đấu trường"]);
    expect(hs.tabs[2]?.href).toBe("/choi");
  });
});

describe("hàm thuần màn Hôm nay", () => {
  const tasks = [task({ kind: "grade" }), task({ kind: "due", hot: false }), task({ kind: "lesson", progress: null })];
  it("tab lọc + đếm", () => {
    expect(filterTasks(tasks, "cho-cham")).toHaveLength(1);
    expect(filterTasks(tasks, "can-lam").map((t) => t.kind)).toEqual(["due", "lesson"]);
    expect(filterTasks(tasks, "hoc-sinh")).toEqual([]);
    expect(viewCounts({ tasks, attention: [{ studentId: "s", fullName: "A", classId: "c", className: "10A1", reasons: [], last: null }] })).toEqual({ "tat-ca": 3, "can-lam": 2, "cho-cham": 1, "hoc-sinh": 1 });
  });
  it("ô trạng thái + phím tắt hàng", () => {
    expect(taskStatus(tasks[0]!)).toMatchObject({ cls: "half", pct: 40 });
    expect(taskStatus(task({ progress: { done: 0, total: 32 } })).cls).toBe("todo");
    expect(taskStatus(tasks[2]!).cls).toBe("live");
    expect(tasks.map(taskKey)).toEqual(["C", "R", "O"]);
  });
  it("số kiểu Việt: dấu phẩy, dấu trừ thật, phần trăm 0–100", () => {
    expect(signed(0.4)).toBe("+0,4");
    expect(signed(-0.44)).toBe("−0,4");
    expect(signed(0)).toBe("0");
    expect(signed(3, 0)).toBe("+3");
    expect(signed(null)).toBe("");
    expect(pct(91)).toBe("91%");
    expect(pct(1)).toBe("1%");
    expect(pct(null)).toBe("—");
  });
  it("hạn theo giờ Việt Nam", () => {
    const now = "2026-11-11T03:00:00.000Z"; // 10:00 VN
    expect(dueText("2026-11-11T10:00:00.000Z", now)).toBe("Hôm nay 17:00 · còn 7 giờ");
    expect(dueText("2026-11-11T01:00:00.000Z", now)).toBe("Đã quá hạn 2 giờ");
    expect(dueText("2026-11-14T02:30:00.000Z", now)).toBe("Thứ Bảy 14/11 · 09:30");
    expect(longDay("T2", "2026-11-10")).toBe("Thứ Hai · 10/11");
  });
  it("thẻ việc tiếp theo của HS", () => {
    const n = { total: 12, answered: 6, kind: "practice", canStart: true } as NonNullable<HocToday["next"]>;
    expect(heroTitle(n)).toBe("Còn 6 câu là xong!");
    expect(heroAction(n)).toBe("Làm tiếp câu 7");
    expect(heroAction({ ...n, answered: 0 })).toBe("Bắt đầu làm");
    expect(heroTitle({ ...n, answered: 0 })).toBe("Bài mới: 12 câu");
    expect(heroTitle(null)).toBe("Hôm nay em đã xong bài!");
    expect(metricText({ kind: "score", value: 7.5 })).toEqual({ big: "7,5", small: "điểm gần nhất" });
    expect(metricText({ kind: "none", value: null }).big).toBe("—");
  });
  it("màu môn cố định theo tên; chữ cái avatar", () => {
    expect(subjectColor("Toán 10")).toBe("var(--c1)");
    expect(subjectColor("Ngữ văn")).toBe("var(--c2)");
    expect(subjectColor("Tiếng Anh")).toBe("var(--c3)");
    expect(subjectColor("Âm nhạc", 4)).toBe("var(--c5)");
    expect(initialsOf("Nguyễn Minh Anh")).toBe("MA");
    expect(initialsOf("lan.anh@truong.vn")).toBe("LA");
    expect(initialsOf("")).toBe("?");
  });
});
