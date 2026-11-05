import { z } from "zod";

/** Kế hoạch bài dạy theo CV 5512/BGDĐT-GDTrH (Phụ lục IV). */

export const STEP_NAMES = ["Chuyển giao nhiệm vụ", "Thực hiện nhiệm vụ", "Báo cáo, thảo luận", "Kết luận, nhận định"] as const;
export const ACTIVITY_TITLES = ["Mở đầu (Xác định vấn đề/nhiệm vụ học tập)", "Hình thành kiến thức mới", "Luyện tập", "Vận dụng"] as const;

const str = z.string().trim().normalize("NFC").default("");
const strList = z.array(z.string().trim().normalize("NFC")).default([]);

const Steps = z.object({ assign: str, perform: str, report: str, conclude: str }).default({ assign: "", perform: "", report: "", conclude: "" });

const ActivityBase = z.object({ name: str, goal: str, content: str, product: str, steps: Steps });
export type ActivityBody = z.infer<typeof ActivityBase>;

const Activity = ActivityBase.extend({
  /** Chỉ dùng cho hoạt động 2: tách 2.1, 2.2… mỗi hoạt động nhỏ có đủ a–d. */
  subs: z.array(ActivityBase).default([]),
});
export type Activity = z.infer<typeof Activity>;

export const LessonPlan = z.object({
  header: z.object({
    school: str,
    department: str,
    teacher: str,
    subject: str,
    grade: z.number().int().min(1).max(16).optional(),
    title: str,
    periods: z.number().int().min(1).max(20).optional(),
    date: str,
  }),
  objectives: z.object({
    knowledge: strList,
    competencies: z.object({ general: strList, specific: strList }).default({ general: [], specific: [] }),
    qualities: strList,
  }),
  materials: strList,
  activities: z.array(Activity).default([]),
});
export type LessonPlan = z.infer<typeof LessonPlan>;

function checkList(items: string[], label: string, issues: string[]): void {
  if (items.length === 0) issues.push(`Thiếu ${label}`);
  else
    items.forEach((s, i) => {
      if (s === "") issues.push(`${label}: dòng ${i + 1} đang để trống`);
    });
}

function checkActivity(a: ActivityBody, label: string, issues: string[]): void {
  if (a.goal === "") issues.push(`${label} thiếu a) Mục tiêu`);
  if (a.content === "") issues.push(`${label} thiếu b) Nội dung`);
  if (a.product === "") issues.push(`${label} thiếu c) Sản phẩm`);
  const keys = ["assign", "perform", "report", "conclude"] as const;
  const empty = keys.map((k, i) => (a.steps[k] === "" ? i : -1)).filter((i) => i >= 0);
  if (empty.length === keys.length) issues.push(`${label} thiếu d) Tổ chức thực hiện (4 bước: chuyển giao nhiệm vụ; thực hiện nhiệm vụ; báo cáo, thảo luận; kết luận, nhận định)`);
  else for (const i of empty) issues.push(`${label} thiếu d) Tổ chức thực hiện, bước ${i + 1} (${STEP_NAMES[i]})`);
}

export type LessonValidation = { ok: true; plan: LessonPlan } | { ok: false; issues: string[] };

/** Trả danh sách lỗi tiếng Việt để AI sửa và gửi lại. */
export function validateLessonPlan(input: unknown): LessonValidation {
  const parsed = LessonPlan.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `Sai kiểu dữ liệu tại "${i.path.join(".") || "gốc"}": ${i.message}`);
    return { ok: false, issues: issues.length ? issues : ["Giáo án phải là một object JSON"] };
  }
  const p = parsed.data;
  const issues: string[] = [];
  const h = p.header;
  if (h.subject === "") issues.push("Thiếu môn học (header.subject)");
  if (h.grade === undefined) issues.push("Thiếu lớp (header.grade, số 1–12)");
  if (h.title === "") issues.push("Thiếu tên bài (header.title)");
  if (h.periods === undefined) issues.push("Thiếu số tiết (header.periods)");

  checkList(p.objectives.knowledge, "1. Kiến thức (objectives.knowledge)", issues);
  checkList(p.objectives.competencies.general, "2. Năng lực chung (objectives.competencies.general)", issues);
  checkList(p.objectives.competencies.specific, "2. Năng lực đặc thù (objectives.competencies.specific)", issues);
  checkList(p.objectives.qualities, "3. Phẩm chất (objectives.qualities)", issues);
  checkList(p.materials, "II. Thiết bị dạy học và học liệu (materials)", issues);

  if (p.activities.length !== 4) {
    issues.push(`Cần đúng 4 hoạt động theo thứ tự: 1 Mở đầu, 2 Hình thành kiến thức mới, 3 Luyện tập, 4 Vận dụng; hiện có ${p.activities.length}`);
  }
  p.activities.slice(0, 4).forEach((a, i) => {
    const label = `Hoạt động ${i + 1} (${ACTIVITY_TITLES[i]})`;
    if (i === 1 && a.subs.length > 0) {
      const own = [a.goal, a.content, a.product, ...Object.values(a.steps)].some((v) => v !== "");
      if (own) issues.push(`${label}: đã chia hoạt động nhỏ (subs) thì để trống goal/content/product/steps ở cấp hoạt động 2`);
      a.subs.forEach((s, j) => checkActivity(s, `Hoạt động 2.${j + 1}`, issues));
    } else {
      if (i !== 1 && a.subs.length > 0) issues.push(`${label}: chỉ hoạt động 2 mới có hoạt động nhỏ (subs)`);
      checkActivity(a, `Hoạt động ${i + 1}`, issues);
    }
  });
  return issues.length > 0 ? { ok: false, issues } : { ok: true, plan: p };
}

export const LESSON_SHAPE_HELP = `JSON giáo án CV 5512 (Phụ lục IV):
{
 "header": {"school"?: "Trường", "department"?: "Tổ", "teacher"?: "Giáo viên", "subject": "Toán", "grade": 10, "title": "Tên bài", "periods": 2, "date"?: "dd/mm/yyyy"},
 "objectives": {"knowledge": ["..."], "competencies": {"general": ["..."], "specific": ["..."]}, "qualities": ["..."]},
 "materials": ["Thiết bị, học liệu..."],
 "activities": [ đúng 4 phần tử theo thứ tự: 1 Mở đầu, 2 Hình thành kiến thức mới, 3 Luyện tập, 4 Vận dụng;
   mỗi phần tử: {"name"?: "tên cụ thể của hoạt động", "goal": "a) Mục tiêu", "content": "b) Nội dung", "product": "c) Sản phẩm",
     "steps": {"assign": "chuyển giao nhiệm vụ", "perform": "thực hiện nhiệm vụ", "report": "báo cáo, thảo luận", "conclude": "kết luận, nhận định"}}
   Riêng hoạt động 2 có thể thay goal/content/product/steps bằng "subs": [ {cùng dạng name/goal/content/product/steps} ... ] cho 2.1, 2.2… ]
}
Mọi trường chữ đều bắt buộc không rỗng (trừ trường có dấu ?). Thiếu cấu phần thì tool trả danh sách lỗi tiếng Việt, không lưu.`;
