import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderAiLessonPptx } from "../../src/export/aiLessonPptx";
import { compileTimeline, shortExplain, splitCues, toSrt } from "../../src/export/aiLessonTimeline";
import { renderLessonVideo } from "../../src/export/aiLessonVideo";
import { mathInline, quizQuestionHtml, slideHtml } from "../../src/export/slideHtml";
import type { Ai } from "../../src/services/ai";
import { type AnimService, createAnimService } from "../../src/services/anim";
import { extractMaterialText } from "../../src/services/aiLessons/material";
import { createAiLessonService } from "../../src/services/aiLessons/service";
import { createVieneuTts, speakable } from "../../src/services/aiLessons/tts";
import type { Tts } from "../../src/services/aiLessons/tts";
import type { StoredScene } from "../../src/services/aiLessons/types";
import { testApp } from "../helpers/app";

const CHROME = "/usr/bin/google-chrome";
const OUTLINE = {
  languageDirective: "Dạy bằng tiếng Việt",
  courseTitle: "Hằng đẳng thức đáng nhớ",
  outlines: [
    { id: "s1", type: "slide", title: "Bình phương một tổng", description: "Công thức bình phương của một tổng", keyPoints: ["(a+b)^2", "Ví dụ"], order: 1 },
    { id: "s2", type: "quiz", title: "Luyện tập nhanh", description: "Hai câu trắc nghiệm", keyPoints: ["áp dụng"], order: 2, quizConfig: { questionCount: 2, difficulty: "easy", questionTypes: ["single"] } },
    { id: "s3", type: "interactive", title: "Mô phỏng hình vuông", description: "Kéo a, b xem diện tích", keyPoints: ["diện tích"], order: 3, widgetType: "simulation", widgetOutline: { concept: "Bình phương một tổng", keyVariables: ["a", "b"] } },
  ],
};
const SLIDE = {
  elements: [
    { id: "t1", type: "text", left: 60, top: 40, width: 880, height: 80, content: "<p><strong>Bình phương một tổng</strong></p>", defaultFontName: "", defaultColor: "#1e2340" },
    { id: "t2", type: "text", left: 60, top: 160, width: 880, height: 120, content: "<p>Công thức: $(a+b)^2 = a^2 + 2ab + b^2$</p>", defaultFontName: "", defaultColor: "#333333" },
    { id: "l1", type: "latex", left: 200, top: 320, width: 600, height: 100, latex: "(a+b)^2=a^2+2ab+b^2" },
  ],
  background: { type: "solid", color: "#ffffff" },
};
const QUIZ = [
  { id: "q1", type: "single", question: "Khai triển $(x+1)^2$ bằng", options: [{ label: "$x^2+1$", value: "A" }, { label: "$x^2+2x+1$", value: "B" }, { label: "$x^2-2x+1$", value: "C" }, { label: "$2x+1$", value: "D" }], answer: ["B"], analysis: "Áp dụng hằng đẳng thức.", points: 5 },
  { id: "q2", type: "multiple", question: "Chọn các khẳng định đúng", options: [{ label: "A đúng", value: "A" }, { label: "B sai", value: "B" }], answer: ["A"], analysis: "—", points: 5 },
];
const HTML = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Mô phỏng</title></head><body><h1>Kéo a và b</h1><input id="a" type="range" min="1" max="10" value="3"><div id="out">9</div><script>document.getElementById('a').addEventListener('input',function(e){document.getElementById('out').textContent=String(e.target.value*e.target.value)});</script></body></html>`;
const ACTIONS = (id: string) => [{ type: "action", name: "spotlight", params: { elementId: id } }, { type: "text", content: "Chúng ta cùng xem công thức bình phương của một tổng." }, { type: "text", content: "Hãy ghi nhớ: a cộng b, tất cả bình phương." }];

type FakeOpts = { failInteractive?: boolean; noAnim?: boolean; badAnim?: boolean; lowConf?: boolean; rewrite?: boolean; gradeRef?: boolean; animNums?: "once" | "always" };
function fakeAi(opts: FakeOpts = {}): Ai & { calls: string[]; msgs: { task: string; all: string }[]; opts: FakeOpts } {
  const calls: string[] = [];
  const msgs: { task: string; all: string }[] = [];
  let numsLeft = 1;
  const ai = {
    calls,
    msgs,
    opts,
    async chat(task: string, messages: { content: unknown }[]) {
      calls.push(task);
      const user = String(messages[messages.length - 1]?.content);
      const all = messages.map((m) => String(m.content)).join("\n");
      msgs.push({ task, all });
      if (task === "slide_dan_y") return JSON.stringify(OUTLINE);
      if (task === "slide_tuong_tac") {
        if (ai.opts.failInteractive) return "Xin lỗi, tôi không làm được.";
        return HTML;
      }
      if (task === "slide_noi_dung") {
        if (!all.includes("# Quiz Content Generator")) return JSON.stringify(SLIDE);
        // lần đầu lời giải nhắc nhầm sách lớp khác; lần sinh lại (có nhắc lớp) vẫn nhắc nhầm một chỗ → máy sửa
        if (ai.opts.gradeRef) return JSON.stringify(QUIZ.map((q, i) => (i === 0 ? { ...q, analysis: all.includes("Lần trước câu hỏi/lời giải nhắc") ? "Xem SGK Toán 9, áp dụng hằng đẳng thức." : "Theo SGK Toán 12, áp dụng hằng đẳng thức." } : q)));
        return JSON.stringify(QUIZ);
      }
      if (task === "loi_giang") {
        if (all.includes("VIẾT LẠI LỜI GIẢNG")) return ai.opts.rewrite ? JSON.stringify({ loiGiang: ["Trên màn hình, công thức bình phương của một tổng hiện dần từng bước.", "Hãy ghi nhớ: a cộng b, tất cả bình phương."] }) : "không phải JSON";
        return JSON.stringify(ACTIONS("t1"));
      }
      if (task === "hoat_hinh_toan") {
        if (ai.opts.noAnim) return JSON.stringify({ template: null });
        if (ai.opts.badAnim) return JSON.stringify({ template: "bien_doi_cong_thuc", thoiLuong: 5, params: { cacBuoc: [{ latex: "\\input{x}" }, { latex: "y" }] }, reason: "x", confidence: 0.9 });
        if (ai.opts.lowConf) return JSON.stringify({ template: "bien_doi_cong_thuc", thoiLuong: 5, params: { cacBuoc: [{ latex: "x" }, { latex: "y" }] }, reason: "không chắc", confidence: 0.3 });
        if (ai.opts.animNums && (ai.opts.animNums === "always" || numsLeft-- > 0)) return JSON.stringify({ template: "bien_doi_cong_thuc", thoiLuong: 5, params: { cacBuoc: [{ latex: "(a+b)^2" }, { latex: "a^2+2ab+b^2", ghiChu: "Ví dụ với 37 và 59" }] }, reason: "x", confidence: 0.9 });
        return JSON.stringify({ template: "bien_doi_cong_thuc", thoiLuong: 99, params: { cacBuoc: [{ latex: "(a+b)^2" }, { latex: "a^2+2ab+b^2", ghiChu: "Khai triển" }], toMau: ["2ab"] }, reason: "Cảnh khai triển bình phương một tổng", confidence: 0.92 });
      }
      throw new Error(`task lạ ${task}`);
    },
    // biome-ignore lint: không dùng
    async *stream() {},
  };
  return ai as unknown as Ai & { calls: string[]; msgs: { task: string; all: string }[]; opts: FakeOpts };
}

const fakeTts: Tts = {
  async synthMany(items, dir) {
    execFileSync("mkdir", ["-p", dir]);
    return items.map((it) => {
      writeFileSync(path.join(dir, `${it.name}.mp3`), Buffer.from("ID3-fake-audio"));
      return { file: `${it.name}.mp3`, durationMs: 2000 };
    });
  },
};
const tmpDirs: string[] = [];
const mkTmp = (p: string) => {
  const d = mkdtempSync(path.join(tmpdir(), p));
  tmpDirs.push(d);
  return d;
};

/** Dựng giả: ffmpeg tạo clip 1 giây thay cho Manim/HyperFrames (việc dựng thật có test riêng ở anim.test.ts). */
function fakeAnim(): AnimService {
  const real = createAnimService({ dataDir, manimHome: "/khong/co", tinytexBin: "/khong/co" });
  return {
    ...real,
    render: async (input: unknown) => {
      const { hash } = real.prepare(input);
      execFileSync("mkdir", ["-p", real.dir]);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=10:duration=1", "-pix_fmt", "yuv420p", real.fileOf(hash)]);
      return { hash, file: real.fileOf(hash), durationMs: 1000 };
    },
  };
}

let ttsImpl: Tts = fakeTts;
let dataDir: string;
let t: Awaited<ReturnType<typeof testApp>>;
let ai: ReturnType<typeof fakeAi>;
let auth: Record<string, string>;

async function boot() {
  dataDir = mkTmp("eduvn-ail-");
  ai = fakeAi();
  const app = await testApp({ ai, aiLessons: { dataDir, tts: { synthMany: (a, b) => ttsImpl.synthMany(a, b) }, anim: fakeAnim(), sceneConcurrency: 3, chromePath: CHROME } });
  return { app };
}

beforeEach(async () => {
  ttsImpl = fakeTts;
  const b = await boot();
  t = b.app;
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", email: "gv1@example.test", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown) => t.app.inject({ method, url, headers: auth, payload: payload as object });
async function waitDone(id: string) {
  for (let i = 0; i < 400; i++) {
    const s = (await call("GET", `/api/ai-lessons/${id}/trang-thai`)).json();
    if (s.status === "done" || s.status === "error") return s;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("quá thời gian");
}
async function makeLesson() {
  const r = await call("POST", "/api/ai-lessons", { requirement: "Toán 8 — Hằng đẳng thức đáng nhớ", subject: "Toán", grade: 8, sceneCount: 3 });
  expect(r.statusCode).toBe(202);
  const id = r.json().id as string;
  return { id, status: await waitDone(id) };
}

describe("sinh bài giảng AI", () => {
  it("dàn ý → slide + quiz + interactive + lời giảng + giọng đọc; định tuyến đúng task", async () => {
    const { id, status } = await makeLesson();
    expect(status).toMatchObject({ status: "done", done: 3, total: 3, failed: [] });
    expect(new Set(ai.calls)).toEqual(new Set(["slide_dan_y", "slide_noi_dung", "slide_tuong_tac", "loi_giang"]));
    const d = (await call("GET", `/api/ai-lessons/${id}`)).json();
    expect(d.title).toBe("Hằng đẳng thức đáng nhớ");
    const scenes = d.scenes as StoredScene[];
    expect(scenes.map((s) => s.type)).toEqual(["slide", "quiz", "interactive"]);
    const speech = scenes[0]?.actions?.filter((a) => a.type === "speech") ?? [];
    expect(speech.length).toBe(2);
    expect(speech[0]).toMatchObject({ durationMs: 2000 });
    expect((scenes[2]?.content as { html?: string }).html).toContain("<script>");
    const audio = await call("GET", `/api/ai-lessons/${id}/audio/${(speech[0] as { audioFile: string }).audioFile}`);
    expect(audio.statusCode).toBe(200);
    expect(audio.headers["content-type"]).toBe("audio/mpeg");
    expect((await call("GET", `/api/ai-lessons/${id}/audio/..%2Fx.mp3`)).statusCode).toBe(404);
  });

  it("cảnh lỗi thử lại 1 lần rồi bỏ qua; 'sinh tiếp' làm nốt cảnh còn thiếu", async () => {
    ai.opts.failInteractive = true;
    const { id, status } = await makeLesson();
    expect(status.status).toBe("done");
    expect(status.failed).toHaveLength(1);
    expect(status.failed[0]).toContain("Mô phỏng hình vuông");
    expect(ai.calls.filter((c) => c === "slide_tuong_tac")).toHaveLength(2);
    expect(((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as unknown[]).length).toBe(2);
    ai.opts.failInteractive = false;
    expect((await call("POST", `/api/ai-lessons/${id}/sinh-tiep`)).statusCode).toBe(202);
    const s2 = await waitDone(id);
    expect(s2).toMatchObject({ status: "done", done: 3, failed: [] });
    expect(ai.calls.filter((c) => c === "slide_dan_y")).toHaveLength(1);
  });

  it("giọng đọc lỗi tạm thời: bài vẫn xong, 'sinh tiếp' bù lại các câu còn thiếu tiếng", async () => {
    ttsImpl = { synthMany: async (items) => items.map(() => null) };
    const { id } = await makeLesson();
    const speechOf = async () => ((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[]).flatMap((s) => (s.actions ?? []).filter((a) => a.type === "speech"));
    expect((await speechOf()).every((a) => !(a as { audioFile?: string }).audioFile)).toBe(true);
    ttsImpl = fakeTts;
    await call("POST", `/api/ai-lessons/${id}/sinh-tiep`);
    await waitDone(id);
    const after = await speechOf();
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((a) => (a as { audioFile?: string }).audioFile)).toBe(true);
  });

  it("sửa nhanh: đổi chữ, xoá cảnh, sinh lại 1 cảnh", async () => {
    const { id } = await makeLesson();
    const d = (await call("GET", `/api/ai-lessons/${id}`)).json();
    const scenes = d.scenes as StoredScene[];
    const first = scenes[0] as StoredScene & { content: { canvas: { elements: { content: string }[] } } };
    first.content.canvas.elements[0]!.content = "<p>Tiêu đề mới</p>";
    const saved = await call("PUT", `/api/ai-lessons/${id}`, { title: "Bài đã sửa", scenes: [first, scenes[1]] });
    expect(saved.json()).toMatchObject({ ok: true, sceneCount: 2 });
    const d2 = (await call("GET", `/api/ai-lessons/${id}`)).json();
    expect(d2.title).toBe("Bài đã sửa");
    expect(JSON.stringify(d2.scenes[0])).toContain("Tiêu đề mới");
    const before = ai.calls.length;
    const re = await call("POST", `/api/ai-lessons/${id}/canh/${first.id}/sinh-lai`, { directive: "Thêm ví dụ" });
    expect(re.statusCode).toBe(200);
    expect(JSON.stringify(re.json())).not.toContain("Tiêu đề mới");
    expect(ai.calls.length).toBeGreaterThan(before);
  });

  it("[demo 11/11] cảnh tương tác/quiz soạn sau slide, prompt có lớp + CTGDPT 2018, dàn ý cả bài và dữ kiện slide trước; luật bố cục cảnh tương tác", async () => {
    await makeLesson();
    const order = ai.msgs.filter((m) => m.task === "slide_noi_dung" || m.task === "slide_tuong_tac").map((m) => (m.task === "slide_tuong_tac" ? "tt" : m.all.includes("# Quiz Content Generator") ? "quiz" : "slide"));
    expect(order.indexOf("slide")).toBeLessThan(order.indexOf("tt"));
    expect(order.indexOf("slide")).toBeLessThan(order.indexOf("quiz"));
    const tt = ai.msgs.find((m) => m.task === "slide_tuong_tac")?.all ?? "";
    expect(tt).toContain("lớp 8, theo Chương trình giáo dục phổ thông 2018");
    expect(tt).toContain("Dàn ý cả bài");
    expect(tt).toContain("PHẢI dùng đúng các số liệu này");
    expect(tt).toContain("Công thức: $(a+b)^2 = a^2 + 2ab + b^2$"); // chữ của slide cảnh 1
    expect(tt).toContain("cỡ chữ tối thiểu 16px");
    expect(tt).toContain("Không dùng localStorage");
  });

  it("[demo 11/11] quiz nhắc 'SGK Toán 12' trong bài lớp 8 → sinh lại 1 lần kèm nhắc lớp, vẫn lệch thì sửa về đúng lớp; có lời đọc câu hỏi/đáp án", async () => {
    ai.opts.gradeRef = true;
    const { id } = await makeLesson();
    expect(ai.msgs.filter((m) => m.task === "slide_noi_dung" && m.all.includes("# Quiz Content Generator"))).toHaveLength(2);
    const quiz = ((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[]).find((s) => s.type === "quiz") as StoredScene;
    const qs = (quiz.content as unknown as { questions: { analysis: string }[] }).questions;
    expect(qs[0]?.analysis).toBe("Xem SGK Toán 8, áp dụng hằng đẳng thức.");
    expect(quiz.quizVoice).toHaveLength(2);
    expect(quiz.quizVoice?.[0]?.q.text.startsWith("Câu 1. Khai triển $(x+1)^2$ bằng Phương án A:")).toBe(true);
    expect(quiz.quizVoice?.[0]?.q).toMatchObject({ durationMs: 2000 }); // đã đọc giọng cùng lượt với lời giảng
    expect(quiz.quizVoice?.[0]?.a.text.startsWith("Đáp án đúng: B.")).toBe(true);
  });

  it("[demo 11/11] bài cũ chưa có lời đọc quiz: trước khi dựng video máy tự sinh + đọc giọng", async () => {
    const { id } = await makeLesson();
    const d = (await call("GET", `/api/ai-lessons/${id}`)).json();
    const scenes = (d.scenes as StoredScene[]).map(({ quizVoice: _q, ...s }) => s);
    await call("PUT", `/api/ai-lessons/${id}`, { scenes });
    expect(((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[]).some((s) => s.quizVoice)).toBe(false);
    const orgId = (await t.app.inject({ method: "GET", url: "/api/me", headers: auth })).json().org.id as string;
    const svc = createAiLessonService(t.db, ai, { dataDir, tts: fakeTts });
    const prepared = await svc.prepareVideo({ userId: "gv", orgId, role: "owner" }, id);
    const quiz = prepared.find((s) => s.type === "quiz") as StoredScene;
    expect(quiz.quizVoice?.every((v) => v.q.audioFile && v.a.audioFile)).toBe(true);
    const tl = compileTimeline("Bài", prepared);
    const qsegs = tl.segments.filter((s) => s.kind === "quiz" && s.quizIndex !== undefined && s.audioFile?.startsWith("qv_"));
    expect(qsegs).toHaveLength(4); // 2 câu × (đọc câu hỏi, đọc đáp án)
  });

  it("[demo 11/11] gắn hoạt hình: lời giảng nhắc thứ chỉ có trên slide được viết lại cho khớp màn hình, đọc lại giọng câu đổi", async () => {
    ai.opts.rewrite = true;
    const { id } = await makeLesson();
    const slide = ((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[])[0] as StoredScene;
    const before = slide.actions?.filter((a) => a.type === "speech") as { audioFile: string; text: string }[];
    expect((await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, {})).statusCode).toBe(202);
    let got: StoredScene | undefined;
    for (let i = 0; i < 200; i++) {
      got = ((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[])[0];
      if (got?.animation?.status !== "dang_dung") break;
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(got?.animation?.status).toBe("xong");
    const after = got?.actions?.filter((a) => a.type === "speech") as { audioFile?: string; text: string; durationMs?: number }[];
    expect(after.map((a) => a.text)).toEqual(["Trên màn hình, công thức bình phương của một tổng hiện dần từng bước.", "Hãy ghi nhớ: a cộng b, tất cả bình phương."]);
    expect(after[0]?.durationMs).toBe(2000); // câu đổi đã được đọc lại giọng
    expect(after[1]?.audioFile).toBe(before[1]?.audioFile); // câu giữ nguyên không đọc lại
    expect(ai.msgs.find((m) => m.all.includes("VIẾT LẠI LỜI GIẢNG"))?.all).toContain('Hoạt hình "Biến đổi công thức"');
  });

  it("[demo 11/11] AI chọn hoạt hình: prompt có dữ kiện bài + ưu tiên phân số; số lệch với bài → chọn lại 1 lần, vẫn lệch thì từ chối", async () => {
    const { id } = await makeLesson();
    const slide = ((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[])[0] as StoredScene;
    ai.opts.animNums = "always";
    const r1 = await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, {});
    expect(r1.statusCode).toBe(400);
    expect(r1.json().error).toContain("số liệu không có trong bài");
    const asks = ai.msgs.filter((m) => m.task === "hoat_hinh_toan");
    expect(asks).toHaveLength(2);
    expect(asks[0]?.all).toContain('xác suất ghi dạng phân số chuỗi như trong bài (vd "5/8", "4/7")');
    expect(asks[1]?.all).toContain("Đề xuất trước dùng các số 37; 59");
    ai.opts.animNums = "once";
    expect((await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, {})).statusCode).toBe(202);
    await new Promise((r) => setTimeout(r, 200));
  });

  it("lưu quiz vào ngân hàng: trắc nghiệm 4 phương án lưu, nhiều đáp án bị bỏ qua có lý do", async () => {
    const { id } = await makeLesson();
    const scenes = (await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[];
    const quiz = scenes.find((s) => s.type === "quiz") as StoredScene;
    const r = await call("POST", `/api/ai-lessons/${id}/canh/${quiz.id}/luu-ngan-hang`, { level: "NB" });
    expect(r.json()).toMatchObject({ saved: 1 });
    expect(r.json().skipped[0]).toContain("Câu 2");
    const bank = (await call("GET", "/api/questions?subject=To%C3%A1n&grade=8")).json() as { stem: string; answer: number }[];
    expect(bank.map((q) => q.stem)).toContain("Khai triển $(x+1)^2$ bằng");
    expect(bank.find((q) => q.stem.startsWith("Khai triển"))?.answer).toBe(1);
    const slide = scenes[0] as StoredScene;
    expect((await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/luu-ngan-hang`, {})).statusCode).toBe(404);
  });

  it("danh mục mẫu hoạt hình cho thư viện chọn", async () => {
    const r = await call("GET", "/api/ai-lessons/mau-hoat-hinh");
    expect(r.statusCode).toBe(200);
    const list = r.json() as { id: string; viDu: unknown; tuKhoa?: unknown }[];
    expect(list.length).toBeGreaterThanOrEqual(28);
    expect(list.every((e) => e.tuKhoa === undefined && e.viDu !== undefined)).toBe(true);
  });

  it("hoạt hình toán: AI chọn mẫu → kiểm zod → dựng nền → gắn vào cảnh; spec xấu bị chặn; bỏ hoạt hình", async () => {
    const { id } = await makeLesson();
    const scenes = (await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[];
    const slide = scenes[0] as StoredScene;
    const quiz = scenes[1] as StoredScene;
    expect((await call("POST", `/api/ai-lessons/${id}/canh/${quiz.id}/hoat-hinh`, {})).statusCode).toBe(400);
    ai.opts.noAnim = true;
    expect((await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, {})).json().error).toContain("không cần hoạt hình");
    ai.opts.noAnim = false;
    ai.opts.badAnim = true;
    expect((await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, {})).statusCode).toBe(400);
    ai.opts.badAnim = false;
    ai.opts.lowConf = true;
    const low = await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, {});
    expect(low.statusCode).toBe(400);
    expect(ai.calls.filter((c) => c === "hoat_hinh_toan").length).toBeGreaterThanOrEqual(5); // 1 + 2 (sai zod) + 2 (tin cậy thấp), mỗi lần thử lại 1 lượt
    ai.opts.lowConf = false;
    expect((await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, { spec: { template: "bien_doi_cong_thuc", thoiLuong: 5, params: { cacBuoc: [{ latex: "\\input{/etc/passwd}" }, { latex: "x" }] } } })).statusCode).toBe(400);
    const r = await call("POST", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`, {});
    expect(r.statusCode).toBe(202);
    for (let i = 0; i < 200; i++) {
      const sc0 = ((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[])[0];
      if (sc0?.animation?.status !== "dang_dung") break;
      await new Promise((r) => setTimeout(r, 25));
    }
    const got = ((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[])[0] as StoredScene;
    expect(got.animation).toMatchObject({ status: "xong", durationMs: 1000, confidence: 0.92 });
    expect((got.animation?.spec as { thoiLuong: number }).thoiLuong).toBe(4); // = tổng lời giảng 2 × 2 s, không theo số AI đưa ra (99)
    const hash = got.animation?.hash as string;
    const clip = await call("GET", `/api/ai-lessons/${id}/hoat-hinh/${hash}`);
    expect(clip.statusCode).toBe(200);
    expect(clip.headers["content-type"]).toBe("video/mp4");
    expect((await call("GET", `/api/ai-lessons/${id}/hoat-hinh/${"0".repeat(24)}`)).statusCode).toBe(404);
    // sửa nhanh không làm mất / đè hoạt hình do máy chủ quản
    const body = { scenes: scenes.map((s) => ({ ...s, animation: { status: "dang_dung", spec: {} } })) };
    await call("PUT", `/api/ai-lessons/${id}`, body);
    expect(((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[])[0]?.animation?.status).toBe("xong");
    const tl = compileTimeline("Bài", [got]);
    expect(tl.segments.map((s) => s.anim)).toEqual([{ hash, offsetMs: 0 }, { hash, offsetMs: 2000 }]);
    expect((await call("DELETE", `/api/ai-lessons/${id}/canh/${slide.id}/hoat-hinh`)).statusCode).toBe(200);
    expect(((await call("GET", `/api/ai-lessons/${id}`)).json().scenes as StoredScene[])[0]?.animation).toBeUndefined();
  });

  it("xuất PPTX: 3 trang, lời giảng trong ghi chú, đáp án quiz trong ghi chú", async () => {
    const { id } = await makeLesson();
    const res = await call("GET", `/api/ai-lessons/${id}/pptx`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("presentationml");
    const zip = await JSZip.loadAsync(res.rawPayload);
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides).toHaveLength(3);
    const s1 = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(s1).toContain("Bình phương một tổng");
    const notes = await Promise.all(Object.keys(zip.files).filter((f) => /notesSlide\d+\.xml$/.test(f)).map((f) => zip.file(f)!.async("string")));
    expect(notes.join("")).toContain("Chúng ta cùng xem công thức");
    expect(notes.join("")).toContain("Đáp án");
  });

  it("khởi động lại: việc đang chạy dở đánh dấu lỗi", async () => {
    const r = await call("POST", "/api/ai-lessons", { requirement: "Toán 8 — Hằng đẳng thức", sceneCount: 3 });
    await waitDone(r.json().id);
    const { db } = t;
    const { aiLessons } = await import("../../src/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(aiLessons).set({ status: "running" }).where(eq(aiLessons.id, r.json().id));
    const { createAiLessonService } = await import("../../src/services/aiLessons/service");
    expect(await createAiLessonService(db, ai, { dataDir }).markStale()).toBe(1);
    const s = (await call("GET", `/api/ai-lessons/${r.json().id}/trang-thai`)).json();
    expect(s.status).toBe("error");
    expect(s.error).toContain("Sinh tiếp");
  });

  it("không có cổng AI → 503; thiếu mô tả → 400", async () => {
    const t2 = await testApp();
    const a2 = { authorization: `Bearer ${await t2.sign({ sub: "gv-2", name: "Thầy Nam" })}` };
    const r = await t2.app.inject({ method: "POST", url: "/api/ai-lessons", headers: a2, payload: { requirement: "Toán 8 hằng đẳng thức" } });
    expect(r.statusCode).toBe(503);
    expect((await call("POST", "/api/ai-lessons", { requirement: "" })).statusCode).toBe(400);
    await t2.app.close();
  });
});

describe("giọng VieNeu (lệnh giả)", () => {
  // lệnh giả: mỗi dòng trong -f thành 1 giây âm 330 Hz + 0,25 s lặng, ghi seg.json như vieneu-say thật
  function fakeCmd(): string {
    const dir = mkTmp("eduvn-fakesay-");
    const f = path.join(dir, "vieneu-say");
    writeFileSync(f, `#!/usr/bin/env bash
while [ $# -gt 0 ]; do case "$1" in -f) F="$2"; shift 2;; -o) O="$2"; shift 2;; --segments) S="$2"; shift 2;; --ref) echo "$2" > "$(dirname "$O")/ref.txt"; shift 2;; *) shift;; esac; done
N=$(grep -c . "$F")
ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=330:duration=$((N * 125 / 100 + 1))" "$O"
python3 - "$F" "$S" <<'PY'
import json,sys
lines=[l.strip() for l in open(sys.argv[1],encoding="utf-8") if l.strip()]
pos=0.0;segs=[]
for l in lines:
    segs.append({"text":l,"start":pos,"end":pos+1.0});pos+=1.25
json.dump(segs,open(sys.argv[2],"w"))
PY
`);
    chmodSync(f, 0o755);
    return f;
  }

  it("đọc cả loạt một lần, cắt từng câu đúng mốc (+0,2 s đệm cuối), bỏ câu rỗng", async () => {
    const out = mkTmp("eduvn-ttsout-");
    const tts = createVieneuTts({ cmd: fakeCmd(), ref: "/x/mau.wav" });
    const r = await tts.synthMany([{ text: "Câu một", name: "a" }, { text: "**", name: "rong" }, { text: "Câu **hai**", name: "b" }], out);
    expect(r[1]).toBeNull();
    expect(r[0]?.file).toBe("a.mp3");
    expect(Math.abs((r[0]?.durationMs ?? 0) - 1200)).toBeLessThan(120);
    expect(Math.abs((r[1 + 1]?.durationMs ?? 0) - 1200)).toBeLessThan(120);
    expect(existsSync(path.join(out, "b.mp3"))).toBe(true);
  });

  it("lệnh lỗi → null, không ném", async () => {
    const tts = createVieneuTts({ cmd: "/khong/co/lenh" });
    expect(await tts.synthMany([{ text: "Xin chào", name: "a" }], mkTmp("eduvn-ttsout-"))).toEqual([null]);
  });
});

describe("thư viện interactive /vendor/interactive", () => {
  it("phục vụ tệp trong danh sách cho phép với CORS *, chặn ngoài danh sách và ../", async () => {
    const ok = await t.app.inject({ method: "GET", url: "/vendor/interactive/katex@0.16.38/dist/katex.min.js" });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers["access-control-allow-origin"]).toBe("*");
    expect((await t.app.inject({ method: "GET", url: "/vendor/interactive/three@0.160.0/build/three.module.js" })).statusCode).toBe(200);
    expect((await t.app.inject({ method: "GET", url: "/vendor/interactive/katex@0.16.38/package.json" })).statusCode).toBe(404);
    expect((await t.app.inject({ method: "GET", url: "/vendor/interactive/katex@0.16.38/dist/../package.json" })).statusCode).toBe(404);
    expect((await t.app.inject({ method: "GET", url: "/vendor/interactive/khong-co@1.0.0/x.js" })).statusCode).toBe(404);
  });
});

describe("tài liệu đầu vào", () => {
  it("DOCX và TXT → chữ; định dạng lạ bị từ chối", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", '<w:document><w:body><w:p><w:r><w:t>Hằng đẳng thức &amp; ví dụ</w:t></w:r></w:p><w:p><w:r><w:t>Dòng hai</w:t></w:r></w:p></w:body></w:document>');
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    expect(await extractMaterialText("bai.docx", buf)).toBe("Hằng đẳng thức & ví dụ\nDòng hai");
    expect(await extractMaterialText("a.txt", Buffer.from("  nội dung  "))).toBe("nội dung");
    await expect(extractMaterialText("a.exe", Buffer.from("x"))).rejects.toThrow("Chỉ hỗ trợ");
  });

  it("API tải tài liệu trả chữ để đưa vào dàn ý", async () => {
    const r = await call("POST", "/api/ai-lessons/tai-lieu", { name: "ghi-chu.txt", contentBase64: Buffer.from("Chương 2: Hằng đẳng thức").toString("base64") });
    expect(r.json()).toMatchObject({ text: "Chương 2: Hằng đẳng thức", chars: 24 });
  });
});

describe("dòng thời gian video (IR) và phụ đề", () => {
  const scenes = (): StoredScene[] =>
    [
      { id: "a", outlineId: "s1", type: "slide", title: "A", order: 1, stageId: "x", content: { type: "slide", canvas: { elements: [] } }, actions: [{ id: "1", type: "spotlight", elementId: "t1" }, { id: "2", type: "speech", text: "Xin chào các em. Hôm nay học hằng đẳng thức đáng nhớ.", durationMs: 6000 }, { id: "3", type: "speech", text: "Hết.", durationMs: 1000 }] },
      { id: "b", outlineId: "s2", type: "quiz", title: "B", order: 2, stageId: "x", content: { type: "quiz", questions: [] }, actions: [] },
    ] as unknown as StoredScene[];

  it("speech → đoạn có hiệu ứng spotlight, quiz thêm đoạn hiện đáp án, tổng thời lượng đúng", () => {
    const tl = compileTimeline("Bài", scenes());
    expect(tl.segments.map((s) => [s.kind, s.effect ?? null, s.reveal ?? false, s.durationMs])).toEqual([
      ["slide", "spotlight", false, 6000],
      ["slide", null, false, 1000],
      ["quiz", null, false, 4000],
      ["quiz", null, true, 4000],
    ]);
    expect(tl.segments[0]?.focusId).toBe("t1");
    expect(tl.totalMs).toBe(15000);
  });

  it("tách phụ đề theo câu, cộng đúng thời lượng; SRT hợp lệ", () => {
    const cues = splitCues("Xin chào các em, hôm nay chúng ta học bài mới. Hãy chú ý lắng nghe nhé!", 8000);
    expect(cues.length).toBeGreaterThanOrEqual(1);
    expect(cues.reduce((n, c) => n + c.durationMs, 0)).toBe(8000);
    const srt = toSrt(compileTimeline("Bài", scenes()));
    expect(srt).toMatch(/^1\n00:00:00,000 --> 00:00:0\d,\d{3}\n/);
  });

  it("quiz: mỗi câu hai đoạn (câu hỏi rồi đáp án), lời giải ngắn nằm ở phụ đề; lời giảng đầu hiện câu 1", () => {
    const quiz = { id: "q", outlineId: "s2", type: "quiz", title: "Luyện tập", order: 1, stageId: "x", content: { type: "quiz", questions: QUIZ }, actions: [{ id: "1", type: "speech", text: "Làm thử nhé.", durationMs: 3000 }] } as unknown as StoredScene;
    const tl = compileTimeline("Bài", [quiz]);
    // thời lượng theo nội dung (đọc câu hỏi + phương án + 2,5 s nghĩ; đáp án + lời giải), không cố định 5 s/4 s
    expect(tl.segments.map((x) => [x.quizIndex, x.reveal ?? false])).toEqual([[0, false], [0, false], [0, true], [1, false], [1, true]]);
    expect(tl.segments[1]?.durationMs).toBeGreaterThan(5000);
    const cue = tl.segments[2]?.cues[0]?.text ?? "";
    expect(cue.startsWith("Đáp án đúng: B.")).toBe(true);
    expect(cue.length).toBeLessThanOrEqual(150);
    expect(tl.segments[2]?.cues[0]?.text).not.toContain("$");
    const q2 = { ...QUIZ[0], analysis: "Ta có (x+1)^2 = x^2 + 2x + 1 nên chọn B." };
    expect(shortExplain(q2 as never)).toBe("Đáp án B. Ta có (x+1)² = x² + 2x + 1 nên chọn B.");
  });

  it("phụ đề: câu dài chia nhỏ ≤ ~140 ký tự mà tổng thời lượng không đổi", () => {
    const long = `${"Chúng ta khai triển từng số hạng, rồi gộp các số hạng đồng dạng lại với nhau, ".repeat(4)}và thu gọn.`;
    const cues = splitCues(long, 20000);
    expect(cues.length).toBeGreaterThan(2);
    expect(Math.max(...cues.map((c) => c.text.length))).toBeLessThanOrEqual(150);
    expect(cues.reduce((n, c) => n + c.durationMs, 0)).toBe(20000);
  });

  it("công thức viết thuần (^) trong quiz được dựng KaTeX; chữ thường giữ nguyên, $…$ vẫn dùng được", () => {
    const L = (t: string) => `<i>${t}</i>`;
    expect(mathInline("Khai triển biểu thức (2x - 3y)^2 ta được kết quả là:", L)).toBe("Khai triển biểu thức <i>(2x - 3y)^2</i> ta được kết quả là:");
    expect(mathInline("4x^2 - 12xy + 9y^2", L)).toBe("<i>4x^2 - 12xy + 9y^2</i>");
    expect(mathInline("102^2 - 4 = (102 - 2)(102 + 2) = 100 * 104", L)).toBe("<i>102^2 - 4 = (102 - 2)(102 + 2) = 100 \\cdot 104</i>");
    expect(mathInline("Hôm nay học hằng đẳng thức", L)).toBe("Hôm nay học hằng đẳng thức");
    expect(mathInline("Ta có $x^2$ và <b>", L)).toBe("Ta có <i>x^2</i> và &lt;b&gt;");
  });

  it("khung câu hỏi: phương án đúng tô xanh có dấu ✓, phương án sai mờ đi khi hiện đáp án", () => {
    const L = (t: string) => `<i>${t}</i>`;
    const q = QUIZ[0] as never;
    const before = quizQuestionHtml("Luyện tập", q, 0, 2, { latex: L });
    const after = quizQuestionHtml("Luyện tập", q, 0, 2, { latex: L, reveal: true });
    expect(before).toContain("CÂU HỎI 1/2");
    expect(before).not.toContain("✓");
    expect(after).toContain("✓");
    expect(after.match(/opacity:0\.4/g)).toHaveLength(3);
  });

  it("speakable bỏ LaTeX để giọng đọc không đọc ký hiệu", () => {
    expect(speakable("Ta có $(a+b)^2$ và **đậm**")).not.toMatch(/[$*\\]/);
    expect(speakable("$\\frac{1}{2}$")).toContain("1 phần 2");
  });
});

describe("HTML slide dùng chung", () => {
  it("chữ, công thức, spotlight; loại script/onclick trong nội dung AI", () => {
    const html = slideHtml(
      { elements: [{ id: "t1", type: "text", left: 10, top: 10, width: 300, height: 50, content: '<p onclick="x()">Chào<script>alert(1)</script></p>', defaultColor: "#222" }, { id: "m", type: "latex", left: 10, top: 100, width: 200, height: 50, latex: "x^2" }] },
      { latex: (t) => `<i>${t}</i>`, focusId: "t1", effect: "spotlight", subtitle: "Phụ đề" },
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onclick");
    expect(html).toContain("<i>x^2</i>");
    expect(html).toContain('class="spot"');
    expect(html).toContain("Phụ đề");
  });
});

describe.skipIf(!existsSync(CHROME))("xuất MP4 (Chrome + FFmpeg thật)", () => {
  it("dựng video ngắn có tiếng, tệp mp4 + srt hợp lệ", { timeout: 120_000 }, async () => {
    const dir = mkTmp("eduvn-vid-");
    const audio = path.join(dir, "audio");
    execFileSync("mkdir", ["-p", audio]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=330:duration=1.5", path.join(audio, "s1.mp3")]);
    const sc = [
      { id: "a", outlineId: "s1", type: "slide", title: "A", order: 1, stageId: "x", content: { type: "slide", canvas: SLIDE }, actions: [{ id: "1", type: "spotlight", elementId: "t1" }, { id: "s1", type: "speech", text: "Công thức bình phương của một tổng.", audioFile: "s1.mp3", durationMs: 1500 }] },
      { id: "b", outlineId: "s2", type: "quiz", title: "Luyện tập nhanh", order: 2, stageId: "x", content: { type: "quiz", questions: QUIZ }, actions: [] },
    ] as unknown as StoredScene[];
    const r = await renderLessonVideo("Thử", sc, audio, { chromePath: CHROME, outDir: path.join(dir, "out") });
    const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "csv=p=0", r.video]).toString();
    expect(probe).toContain("video,1280,720");
    expect(probe).toContain("audio");
    expect(readFileSync(r.srt, "utf8")).toContain("Công thức bình phương");
    // mỗi câu quiz: đoạn đọc câu hỏi + nghĩ, đoạn đáp án — thời lượng theo nội dung; hình và tiếng dài đúng bằng dòng thời gian
    expect(r.totalMs).toBe(compileTimeline("Thử", sc).totalMs);
    expect(r.totalMs).toBeGreaterThan(1500 + 2 * (2500 + 3200));
    const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", r.video]).toString()) * 1000;
    expect(Math.abs(dur - r.totalMs)).toBeLessThan(400);
  });
});

describe("xuất PPTX hàm thuần", () => {
  it("không lỗi với đủ loại phần tử", async () => {
    const sc = [
      { id: "a", outlineId: "s1", type: "slide", title: "A", order: 1, stageId: "x", content: { type: "slide", canvas: { ...SLIDE, theme: { fontColor: "#333" }, elements: [...SLIDE.elements, { id: "sh", type: "shape", left: 10, top: 10, width: 100, height: 50, rotate: 0, viewBox: [200, 200], path: "M0 0L200 0L200 200L0 200Z", fill: "#4f6bed", text: { content: "<p>Hộp</p>", defaultColor: "#fff", align: "middle" } }, { id: "ln", type: "line", left: 100, top: 100, width: 100, start: [0, 0], end: [100, 40], style: "dashed", color: "#f00", points: ["", "arrow"] }, { id: "tb", type: "table", left: 10, top: 300, width: 400, height: 100, rotate: 0, colWidths: [0.5, 0.5], data: [[{ text: "a", colspan: 1, rowspan: 1 }, { text: "b", colspan: 1, rowspan: 1 }]], theme: { color: "#4472c4", rowHeader: true } }, { id: "ch", type: "chart", left: 500, top: 300, width: 300, height: 200, rotate: 0, chartType: "column", data: { labels: ["x", "y"], legends: ["s"], series: [[1, 2]] }, themeColors: ["#5b9bd5"] }, { id: "cd", type: "code", left: 10, top: 400, width: 300, height: 100, rotate: 0, language: "js", lines: [{ id: "1", content: "let a = 1;" }] }] } }, actions: [] },
    ] as unknown as StoredScene[];
    const buf = await renderAiLessonPptx("Thử", sc);
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files).some((f) => f.startsWith("ppt/charts/"))).toBe(true);
    expect(await zip.file("ppt/slides/slide1.xml")!.async("string")).toContain("Hộp");
  });
});
