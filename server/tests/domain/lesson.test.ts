import { describe, expect, it } from "vitest";
import { validateLessonPlan } from "../../src/domain/lesson";
import { lessonPlan } from "../helpers/lesson";

const issues = (x: unknown) => {
  const r = validateLessonPlan(x);
  return r.ok ? [] : r.issues;
};

describe("kiểm giáo án CV 5512", () => {
  it("giáo án đủ cấu phần hợp lệ (hoạt động 2 có 2.1, 2.2)", () => {
    expect(validateLessonPlan(lessonPlan()).ok).toBe(true);
  });

  it("thiếu sản phẩm hoạt động 3 và phẩm chất", () => {
    const p = lessonPlan();
    (p.activities[2] as { product: string }).product = " ";
    p.objectives.qualities = [];
    const i = issues(p);
    expect(i).toContain("Hoạt động 3 thiếu c) Sản phẩm");
    expect(i.some((x) => x.startsWith("Thiếu 3. Phẩm chất"))).toBe(true);
  });

  it("thiếu bước tổ chức thực hiện được gọi tên", () => {
    const p = lessonPlan();
    (p.activities[0] as { steps: { report: string } }).steps.report = "";
    expect(issues(p)).toContain("Hoạt động 1 thiếu d) Tổ chức thực hiện, bước 3 (Báo cáo, thảo luận)");
  });

  it("phải đúng 4 hoạt động", () => {
    expect(issues(lessonPlan({ activities: [] }))[0]).toContain("Cần đúng 4 hoạt động");
  });

  it("hoạt động nhỏ thiếu mục được báo 2.2; không cho subs ngoài hoạt động 2", () => {
    const p = lessonPlan();
    delete (p.activities[1] as { subs: { goal?: string }[] }).subs[1]?.goal;
    expect(issues(p)).toContain("Hoạt động 2.2 thiếu a) Mục tiêu");
    const q = lessonPlan();
    (q.activities[2] as { subs?: unknown[] }).subs = [{}];
    expect(issues(q).some((x) => x.includes("chỉ hoạt động 2"))).toBe(true);
  });

  it("thiếu header và sai kiểu", () => {
    const p = lessonPlan({ header: { subject: "", title: "" } });
    const i = issues(p);
    expect(i).toEqual(expect.arrayContaining(["Thiếu môn học (header.subject)", "Thiếu lớp (header.grade, số 1–12)", "Thiếu tên bài (header.title)"]));
    expect(issues("xyz")[0]).toContain("Sai kiểu");
  });
});
