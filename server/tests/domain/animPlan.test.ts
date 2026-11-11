import { describe, expect, it } from "vitest";
import { AnimPlan, SceneInfo, cueTimes, keywordTime, motionSidecar, normalizePlan, numberHasSource, numberReadings, sceneDuration, sentenceTimes, sourceNumbers, syllables, validatePlan } from "../../src/domain/animPlan";
import { compactForRepair, findingsText, type Finding } from "../../src/domain/animFinding";

const scene = SceneInfo.parse({
  subject: "su",
  grade: 12,
  title: "Chiến dịch Điện Biên Phủ 1954",
  slideText: "Đợt 1: 13/3 – 17/3/1954 · Him Lam, Độc Lập",
  speech: [
    { text: "Chiến dịch Điện Biên Phủ mở màn ngày 13 tháng 3 năm 1954.", durationMs: 5000 },
    { text: "Đợt một, quân ta tiêu diệt cứ điểm Him Lam và Độc Lập.", durationMs: 6000 },
    { text: "Đợt hai, ta siết chặt vòng vây các cao điểm phía đông.", durationMs: 5000 },
    { text: "Ngày 7 tháng 5, tướng De Castries bị bắt sống.", durationMs: 4000 },
  ],
});

const plan = (over: Partial<AnimPlan> = {}): AnimPlan =>
  AnimPlan.parse({
    skills: [{ id: "ban-do-chien-dich", vaiTro: "chinh" }],
    confidence: 0.82,
    lyDo: "Kể diễn biến có địa danh và mốc ngày.",
    beats: [
      { i: 0, t0: 0, t1: 5, cau: [0], cue: "kw:Điện Biên Phủ", viec: "bản đồ + địa danh", skill: "ban-do-chien-dich", duLieu: { places: ["dien-bien-phu"] } },
      { i: 1, t0: 5, t1: 11, cau: [1], cue: "kw:Him Lam", viec: "mũi tên đợt 1", skill: "ban-do-chien-dich", duLieu: { arrows: [{ from: "tuan-giao", to: "him-lam" }] } },
      { i: 2, t0: 11, t1: 16, cau: [2], viec: "đợt 2", skill: "ban-do-chien-dich" },
      { i: 3, t0: 16, t1: 20, cau: [3], cue: "kw:7 tháng 5", viec: "kết", skill: "ban-do-chien-dich", duLieu: { ngay: "7/5/1954" } },
    ],
    ...over,
  });

const places = new Set(["dien-bien-phu", "tuan-giao", "him-lam"]);

describe("SceneInfo + mốc câu", () => {
  it("cộng dồn durationMs, tổng kẹp 3–60 s", () => {
    expect(sentenceTimes(scene).map((s) => [s.t0, s.t1])).toEqual([[0, 5], [5, 11], [11, 16], [16, 20]]);
    expect(sceneDuration(scene)).toBe(20);
    expect(sceneDuration({ speech: [{ text: "a", durationMs: 900 }] })).toBe(3);
    expect(sceneDuration({ speech: [{ text: "a", durationMs: 90_000 }] })).toBe(60);
  });
  it("âm tiết: dấu câu là nhịp nghỉ", () => {
    expect(syllables("Đợt một, quân ta.").map((s) => (s.pause ? "|" : s.w))).toEqual(["Đợt", "một", "|", "quân", "ta", "|"]);
  });
  it("mốc từ khoá nội suy âm tiết, không phân biệt dấu/hoa", () => {
    const s = sentenceTimes(scene)[1]!;
    const t = keywordTime(s, "him lam");
    expect(t).toBeGreaterThan(5);
    expect(t).toBeLessThan(11);
    expect(keywordTime(s, "Hà Nội")).toBeNull();
  });
});

describe("AnimPlan zod", () => {
  it("nhận kế hoạch đúng", () => expect(plan().beats).toHaveLength(4));
  it("cần đúng 1 skill chinh, beat dùng skill có khai báo", () => {
    expect(() => plan({ skills: [{ id: "a-b", vaiTro: "phu" }] })).toThrow(/chinh/);
    expect(() => AnimPlan.parse({ ...plan(), beats: [{ ...plan().beats[0]!, skill: "khac" }] })).toThrow(/không có trong skills/);
  });
  it("chỉ số beat liên tục", () => {
    const b = plan().beats;
    expect(() => AnimPlan.parse({ ...plan(), beats: [b[0], { ...b[1]!, i: 5 }] })).toThrow(/liên tục/);
  });
  it("khongCanHoatHinh cho phép rỗng", () => {
    expect(AnimPlan.parse({ skills: [], confidence: 0.2, lyDo: "Chỉ là định nghĩa.", beats: [], khongCanHoatHinh: true }).khongCanHoatHinh).toBe(true);
  });
});

describe("validatePlan", () => {
  const ctx = { scene, candidates: ["ban-do-chien-dich", "dong-thoi-gian-su-kien"], placeIds: places };
  it("kế hoạch đúng không lỗi", () => expect(validatePlan(plan(), ctx)).toEqual([]));
  it("skill ngoài ứng viên", () => expect(validatePlan(plan(), { ...ctx, candidates: ["x"] }).join()).toMatch(/không thuộc danh sách ứng viên/));
  it("hở / chồng / không phủ tới T", () => {
    const b = plan().beats;
    expect(validatePlan(plan({ beats: [b[0]!, { ...b[1]!, t0: 6 }, b[2]!, b[3]!] }), ctx).join()).toMatch(/không hở, không chồng/);
    expect(validatePlan(plan({ beats: [b[0]!, b[1]!, b[2]!, { ...b[3]!, t1: 18 }] }), ctx).join()).toMatch(/kết thúc tại T = 20/);
  });
  it("beat > 12 s, số beat", () => {
    const one = [{ i: 0, t0: 0, t1: 20, cau: [0, 1, 2, 3], cue: "t", viec: "tất cả", skill: "ban-do-chien-dich" }];
    const e = validatePlan(plan({ beats: one as AnimPlan["beats"] }), ctx).join(" | ");
    expect(e).toMatch(/> 12 s/);
    expect(e).toMatch(/cần 3–8 beat/);
  });
  it("cue từ khoá phải có trong câu của beat", () => {
    const b = plan().beats;
    expect(validatePlan(plan({ beats: [b[0]!, { ...b[1]!, cue: "kw:Mường Thanh" }, b[2]!, b[3]!] }), ctx).join()).toMatch(/Mường Thanh/);
  });
  it("số bịa / địa danh lạ trong duLieu bị bắt", () => {
    const b = plan().beats;
    const e = validatePlan(plan({ beats: [{ ...b[0]!, duLieu: { places: ["ha-noi"], quan: 49500 } }, b[1]!, b[2]!, b[3]!] }), ctx).join(" | ");
    expect(e).toMatch(/49500/);
    expect(e).toMatch(/ha-noi/);
  });
  it("chuẩn hoá beat cuối về T", () => {
    const b = plan().beats;
    expect(normalizePlan(plan({ beats: [b[0]!, b[1]!, b[2]!, { ...b[3]!, t1: 19.8 }] }), scene).beats[3]!.t1).toBe(20);
  });
});

describe("số có nguồn", () => {
  it("đọc số kiểu Việt", () => {
    expect(numberReadings("1.000")).toContain(1000);
    expect(numberReadings("16,4")).toEqual([16.4]);
    expect(numberReadings("1,500").sort()).toEqual([1.5, 1500].sort());
  });
  it("nguồn gồm slide + lời giảng; số 0–12 luôn được", () => {
    const src = sourceNumbers(scene);
    expect(numberHasSource("1954", src)).toBe(true);
    expect(numberHasSource("13", src)).toBe(true);
    expect(numberHasSource("3", src)).toBe(true);
    expect(numberHasSource("49.500", src)).toBe(false);
  });
});

describe("cue + motion.json", () => {
  it("cue kw nằm trong beat, cue t = t0", () => {
    const c = cueTimes(plan(), scene);
    expect(c[2]).toBe(11);
    expect(c[1]!).toBeGreaterThan(5);
    expect(c[1]!).toBeLessThan(10.7);
    expect(c[3]!).toBeGreaterThanOrEqual(16);
  });
  it("appearsBy cue+0,6, before nối tiếp, keepsMoving 4 s", () => {
    const m = motionSidecar(20, [0.5, 6, 11, 16.5], new Set([0, 1, 3]), { labels: true });
    expect(m.assertions).toContainEqual({ kind: "appearsBy", selector: '[data-ek-beat="1"]', bySec: 6.6 });
    expect(m.assertions).toContainEqual({ kind: "before", a: '[data-ek-beat="1"]', b: '[data-ek-beat="3"]' });
    expect(m.assertions.some((a) => a.kind === "appearsBy" && a.selector.includes('"2"'))).toBe(false);
    expect(m.assertions).toContainEqual({ kind: "keepsMoving", maxStaticSec: 4 });
  });
});

describe("Finding rút gọn", () => {
  const f = (code: string, severity: Finding["severity"], selector?: string): Finding => ({ code, severity, source: "lint", message: "x".repeat(300), fix: "Sửa: y", selector });
  it("bỏ trùng, error trước, bỏ info, cắt message", () => {
    const out = compactForRepair([f("a", "warning", "#a"), f("b", "error", "#b"), f("b", "error", "#b"), f("c", "info")]);
    expect(out.map((x) => x.code)).toEqual(["b", "a"]);
    expect(out[0]!.message.length).toBe(160);
    expect(findingsText([f("b", "error", "#b")])).toMatch(/^1\. b \[#b\]/);
  });
});
