// P14/GX "Xuất bản & Nhập": PowerPoint gốc (ppt-master), Office Math, mẫu của trường, nhập .pptx, HTML ngoại tuyến, gói .zip, kịch bản, video.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { chromium } from "playwright-core";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { aiLessons, memberships, users } from "../../src/db/schema";
import { readLessonBundle } from "../../src/export/lessonBundle";
import { renderScriptMd } from "../../src/export/lessonScript";
import { inlineInteractive, mathInText, renderOfflineHtml } from "../../src/export/offlineHtml";
import { audioDirOf } from "../../src/services/aiLessons/generate";
import type { StoredScene } from "../../src/services/aiLessons/types";
import { buildPptx } from "../../src/services/pptx/build";
import { aiLessonPages, deckPages, revealTimes } from "../../src/services/pptx/pages";
import { compileOmml, sidecarCfg, sidecarReady } from "../../src/services/pptx/sidecar";
import { PAPER_STYLE, layoutText, parseRich, plainParas, scalePath } from "../../src/services/pptx/svg";
import { textMath } from "../../src/services/pptx/service";
import { testApp } from "../helpers/app";

const CHROME = "/usr/bin/google-chrome";
const READY = sidecarReady();
const PY = sidecarCfg().python;
const SOFFICE = ["/usr/bin/soffice", "/usr/bin/libreoffice"].find((p) => existsSync(p));
const FIX = path.join(__dirname, "../fixtures/mau-truong.pptx");

const CANVAS = {
  elements: [
    { id: "t1", type: "text", left: 60, top: 40, width: 880, height: 80, content: '<p><strong><span style="font-size:32px">Bình phương một tổng</span></strong></p>', defaultColor: "#1e2340" },
    { id: "t2", type: "text", left: 60, top: 140, width: 520, height: 160, content: "<p>Công thức: $(a+b)^2 = a^2 + 2ab + b^2$.</p><ul><li><p>Bình phương số thứ nhất</p></li><li><p>Cộng hai lần tích $2ab$</p></li></ul>", defaultColor: "#333333" },
    { id: "s1", type: "shape", left: 620, top: 140, width: 300, height: 180, viewBox: [200, 200], path: "M 0 0 L 200 0 L 200 200 L 0 200 Z", fill: "#e8f0fa", outline: { color: "#2f5d8a", width: 2 }, text: { content: "<p>Hình vuông cạnh a+b</p>", defaultColor: "#1e2340", align: "middle" } },
    { id: "l1", type: "latex", left: 200, top: 330, width: 600, height: 90, latex: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}" },
    { id: "c1", type: "chart", left: 60, top: 430, width: 400, height: 120, chartType: "column", data: { labels: ["A", "B", "C"], legends: ["Điểm"], series: [[7, 8, 9]] } },
    { id: "tb", type: "table", left: 520, top: 430, width: 400, height: 110, theme: { rowHeader: true, color: "#2f5d8a" }, data: [[{ text: "x" }, { text: "$x^2$" }], [{ text: "2" }, { text: "4" }], [{ text: "3" }, { text: "9" }]] },
  ],
  background: { type: "solid", color: "#ffffff" },
};
const SCENES = (audio?: string[]): StoredScene[] =>
  [
    { id: "sc1", type: "slide", title: "Bình phương một tổng", order: 1, content: { type: "slide", canvas: CANVAS }, actions: [{ id: "a1", type: "speech", text: "Chào các em, hôm nay ta học hằng đẳng thức.", durationMs: 1500, ...(audio ? { audioFile: audio[0] } : {}) }, { id: "a2", type: "spotlight", elementId: "t2" }, { id: "a3", type: "speech", text: "Đây là công thức bình phương một tổng.", durationMs: 2000, ...(audio ? { audioFile: audio[1] } : {}) }, { id: "a4", type: "spotlight", elementId: "l1" }, { id: "a5", type: "speech", text: "Còn đây là công thức nghiệm.", durationMs: 1800 }] },
    { id: "sc2", type: "quiz", title: "Luyện tập", order: 2, content: { type: "quiz", questions: [{ id: "q1", type: "single", question: "Khai triển $(x+1)^2$ bằng", options: [{ label: "$x^2+1$", value: "A" }, { label: "$x^2+2x+1$", value: "B" }, { label: "$x^2-2x+1$", value: "C" }, { label: "$2x+1$", value: "D" }], answer: ["B"], analysis: "Áp dụng hằng đẳng thức." }, { id: "q2", type: "short_answer", question: "Tính $11^2$", answer: ["121"] }] }, actions: [{ id: "a6", type: "speech", text: "Các em làm hai câu sau.", durationMs: 2000 }] },
    { id: "sc3", type: "interactive", title: "Mô phỏng hình vuông", order: 3, content: { type: "interactive", widgetType: "simulation", html: '<!doctype html><html><head><script src="/vendor/interactive/katex@0.16.38/dist/katex.min.js"></script></head><body><input id="a" type="range" min="1" max="9" value="3"><div id="out">9</div><script>document.getElementById("a").oninput=function(e){document.getElementById("out").textContent=String(e.target.value*e.target.value)};window.KX=typeof katex!=="undefined"</script></body></html>' }, actions: [{ id: "a7", type: "speech", text: "Kéo thanh trượt để xem.", durationMs: 1500 }] },
  ] as unknown as StoredScene[];

const DECK = {
  title: "Phương trình bậc hai",
  subject: "Toán",
  grade: 9,
  slides: [
    { layout: "title" as const, title: "Phương trình bậc hai", bullets: ["Toán 9"] },
    { layout: "bullets" as const, title: "Công thức nghiệm", bullets: ["Biệt thức $\\Delta = b^2 - 4ac$", "Nếu $\\Delta > 0$: hai nghiệm $x_{1,2}=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}$", "Nếu $\\Delta = 0$: nghiệm kép"], notes: "Nhắc lại cách tính delta." },
    { layout: "two_column" as const, title: "So sánh", left: ["Có nghiệm", "Δ ≥ 0"], right: ["Vô nghiệm", "Δ < 0"] },
    { layout: "section" as const, title: "Luyện tập", bullets: ["Làm bài tập 1–3"] },
    { layout: "quiz" as const, title: "Kiểm tra nhanh", question: "Phương trình $x^2-1=0$ có mấy nghiệm?", options: ["0", "1", "2", "Vô số"], answer: 2 },
  ],
};

const tmp: string[] = [];
const mk = (p: string) => {
  const d = mkdtempSync(path.join(tmpdir(), p));
  tmp.push(d);
  return d;
};
afterAll(() => {
  for (const d of tmp.splice(0)) rmSync(d, { recursive: true, force: true });
});

const slideXml = async (buf: Buffer) => {
  const z = await JSZip.loadAsync(buf);
  const names = Object.keys(z.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => Number(/(\d+)/.exec(a)?.[1]) - Number(/(\d+)/.exec(b)?.[1]));
  return { z, names, xml: await Promise.all(names.map((n) => z.file(n)!.async("string"))) };
};

/** python-pptx đọc lại: số slide, số hình, ghi chú. */
function pyRead(file: string): { slides: number; shapes: number[]; notes: string[]; layouts: string[] } {
  const code = `import json,sys\nfrom pptx import Presentation\np=Presentation(sys.argv[1])\nprint(json.dumps({"slides":len(p.slides),"shapes":[len(s.shapes) for s in p.slides],"notes":[(s.notes_slide.notes_text_frame.text if s.has_notes_slide else "") for s in p.slides],"layouts":[s.slide_layout.name for s in p.slides]}))`;
  return JSON.parse(execFileSync(PY, ["-c", code, file], { encoding: "utf8" }));
}

function silentMp3(file: string, sec: number) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `sine=f=330:d=${sec}`, "-q:a", "6", file]);
}

describe("svg: dàn chữ, path, chữ giàu định dạng (thuần)", () => {
  it("parseRich: đoạn, gạch đầu dòng, cỡ chữ px × tỉ lệ, công thức $…$ thành run riêng", () => {
    const p = parseRich('<p style="text-align:center"><span style="font-size:20px;color:#ff0000"><strong>Đậm</strong></span> và $x^2$</p><ul><li><p>Ý 1</p></li><li><p>Ý 2</p></li></ul>', 2);
    expect(p).toHaveLength(3);
    expect(p[0]!.align).toBe("center");
    expect(p[0]!.runs[0]).toMatchObject({ text: "Đậm", bold: true, size: 40, color: "#FF0000" });
    expect(p[0]!.runs.find((r) => r.math)?.math).toBe("x^2");
    expect(p[1]!.bullet).toBe("•");
  });
  it("layoutText: tự xuống dòng trong khung, tự co chữ, công thức thành marker OMML", () => {
    const long = "Đây là một câu rất dài cần phải xuống dòng nhiều lần trong một khung hẹp ".repeat(3);
    const r = layoutText(plainParas([long, "Nghiệm $x=\\frac{1}{2}$"], { size: 30 }), { x: 0, y: 0, w: 300, h: 200 }, { font: "Calibri", size: 30, color: "#000000" });
    expect((r.svg.match(/<tspan x=/g) ?? []).length).toBeGreaterThan(4);
    expect(r.height).toBeLessThanOrEqual(206);
    expect(r.svg).toContain('data-pptx-inline-formula="x=\\frac{1}{2}"');
  });
  it("scalePath: co giãn lệnh tuyệt đối/tương đối", () => {
    expect(scalePath("M 0 0 L 200 0 L 200 100 Z", 0.5, 2, 10, 20)).toBe("M 10 20 L 110 20 L 110 220 Z");
    expect(scalePath("M0 0 l10 10 h5", 2, 2, 1, 1)).toBe("M 1 1 l 20 20 h 10");
  });
  it("revealTimes: phần tử xuất hiện theo mốc lời giảng (spotlight sau câu thứ n)", () => {
    const t = revealTimes(SCENES()[0]!);
    expect(t.get("t2")).toBeCloseTo(1.5);
    expect(t.get("l1")).toBeCloseTo(3.5);
  });
  it("textMath: công thức giữa câu (nhập từ .pptx) thành chữ đọc được", () => {
    const [e] = textMath([{ type: "text", content: "<p>Ta có $x^{2}+1$ &gt; 0</p>" }]);
    expect(e!.content).toBe("<p>Ta có x²+1 &gt; 0</p>");
  });
});

describe.skipIf(!READY)("ppt-master: Office Math (OMML) gốc", () => {
  it("biên dịch đúng ≥ 15 công thức: phân số, căn, mũ/chỉ số, tích phân, tổng, giới hạn, ma trận, hệ, vectơ, hoá học", async () => {
    const cases: [string, RegExp[]][] = [
      ["\\frac{a}{b}", [/<m:f>/, /<m:num>/, /<m:den>/]],
      ["\\dfrac{1}{2}+\\tfrac{3}{4}", [/<m:f>[\s\S]*<m:f>/]],
      ["\\sqrt{x^2+1}", [/<m:rad>/, /<m:degHide m:val="(on|1)"/, /<m:sSup>/]],
      ["\\sqrt[3]{8}=2", [/<m:rad>/, /<m:deg>[\s\S]*3/]],
      ["x^{2}+y_{1}", [/<m:sSup>/, /<m:sSub>/]],
      ["a_{n}^{2}", [/<m:sSubSup>/]],
      ["\\int_{0}^{1} x^2\\,dx", [/<m:nary>/, /<m:chr m:val="∫"/, /<m:sub>/, /<m:sup>/]],
      ["\\sum_{k=1}^{n} k=\\frac{n(n+1)}{2}", [/<m:nary>/, /<m:chr m:val="∑"/, /<m:f>/]],
      ["\\lim_{x\\to 0}\\frac{\\sin x}{x}=1", [/<m:limLow>|<m:func>/, /<m:f>/]],
      ["\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}", [/<m:m>/, /<m:mr>[\s\S]*<m:mr>/, /<m:d>/]],
      ["\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}", [/<m:m>/, /m:val="\|"/]],
      ["\\begin{cases}x+y=3\\\\x-y=1\\end{cases}", [/<m:d>/, /m:val="\{"/, /<m:eqArr>/]],
      ["\\left\\{\\begin{array}{l}2x+y=5\\\\x-y=1\\end{array}\\right.", [/<m:d>/, /m:val="\{"/]],
      ["x_{1,2}=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}", [/<m:sSub>/, /<m:f>/, /<m:rad>/, /±/]],
      ["\\vec{AB}+\\overrightarrow{BC}=\\overrightarrow{AC}", [/<m:acc>|<m:groupChr>/]],
      ["\\sin^2\\alpha+\\cos^2\\alpha=1", [/<m:sSup>/, /α/]],
      ["\\log_{2} 8 = 3", [/<m:sSub>|<m:func>/]],
      ["\\overline{AB}=5\\text{ cm}", [/<m:bar>|<m:acc>/]],
      ["\\left| x \\right| \\geq 0", [/<m:d>/, /≥/]],
      ["\\ce{2H2 + O2 -> 2H2O}", [/<m:oMath/, /→/]],
      ["\\widehat{ABC}=90^\\circ", [/<m:acc>|<m:groupChr>/, /<m:sSup>/]],
    ];
    const res = await compileOmml(cases.map(([l]) => l));
    expect(res).toHaveLength(cases.length);
    let ok = 0;
    res.forEach((r, i) => {
      expect(r.ok, `${cases[i]![0]} → ${r.error}`).toBe(true);
      for (const re of cases[i]![1]) expect(r.omml, `${cases[i]![0]} thiếu ${re}`).toMatch(re);
      expect(r.omml).toMatch(/^<m:oMathPara/);
      ok++;
    });
    expect(ok).toBeGreaterThanOrEqual(15);
    // lệnh lạ không làm sập: báo lỗi từng công thức
    const [bad] = await compileOmml(["\\khonglenhnay{x}"]);
    expect(bad!.ok).toBe(false);
  });
});

describe.skipIf(!READY)("ppt-master: dựng PowerPoint gốc", () => {
  it("bài giảng AI → .pptx: OMML gốc, biểu đồ + bảng gốc, QR, ghi chú, chuyển trang, hiệu ứng theo lời, giọng đọc nhúng; python-pptx đọc lại", async () => {
    const dir = mk("eduvn-xb-a-");
    silentMp3(path.join(dir, "a1.mp3"), 1.5);
    silentMp3(path.join(dir, "a3.mp3"), 2);
    const images = new Map<string, string>();
    const pages = aiLessonPages({ title: "Hằng đẳng thức", subject: "Toán", grade: 8 }, SCENES(["a1.mp3", "a3.mp3"]), { canvas: { W: 1280, H: 720 }, style: PAPER_STYLE, images, qrUrl: "https://eduvn.test/bai-giang-ai/1" });
    expect(pages.map((p) => p.stem)).toEqual(["01_title", "02_canh", "03_cau1", "03_cau2", "04_tuong-tac"]);
    const r = await buildPptx(pages, { audioDir: dir, narration: true, animations: true, transition: "fade", images });
    expect(r.formulas).toBeGreaterThanOrEqual(4);
    const { z, xml } = await slideXml(r.buffer);
    expect(xml).toHaveLength(5);
    const s2 = xml[1]!;
    expect(s2).toContain("<m:oMathPara"); // công thức khối
    expect(s2).toMatch(/<a14:m>\s*<m:oMath/); // công thức giữa câu
    expect(s2).toContain("drawingml/2006/chart");
    expect(s2).toContain("<a:tbl>");
    expect(s2).toMatch(/<p:transition[^>]*>/);
    expect(s2).toMatch(/presetClass="entr"/); // phần tử xuất hiện theo lời
    expect(xml[0]).toMatch(/<a:custGeom>|<p:sp>/); // QR vector trên bìa
    const media = Object.keys(z.files).filter((n) => n.startsWith("ppt/media/") && n.endsWith(".mp3"));
    expect(media.length).toBeGreaterThanOrEqual(5); // giọng đọc từng trang
    expect(Object.keys(z.files).some((n) => n.startsWith("ppt/embeddings/") && n.endsWith(".xlsx"))).toBe(true); // dữ liệu biểu đồ sửa được
    const file = path.join(dir, "bai.pptx");
    writeFileSync(file, r.buffer);
    const py = pyRead(file);
    expect(py.slides).toBe(5);
    expect(py.notes[1]).toContain("công thức bình phương một tổng");
    expect(py.notes[2]).toContain("Đáp án — Câu 1: B");
  }, 180_000);

  it("bộ slide (P3) → .pptx đi đường kiểm Quick của ppt-master; LibreOffice chuyển PDF được", async () => {
    const r = await buildPptx(deckPages(DECK, { canvas: { W: 1280, H: 720 }, style: PAPER_STYLE, images: new Map(), eyebrow: "Toán · Lớp 9" }), { animations: true });
    expect(r.route).toBe("quick");
    const { xml } = await slideXml(r.buffer);
    expect(xml).toHaveLength(5);
    expect(xml[1]).toContain("<m:oMath");
    expect(xml[4]).toMatch(/presetClass="entr"/);
    if (SOFFICE) {
      const dir = mk("eduvn-xb-lo-");
      const f = path.join(dir, "deck.pptx");
      writeFileSync(f, r.buffer);
      execFileSync(SOFFICE, ["--headless", `-env:UserInstallation=file://${dir}/lo`, "--convert-to", "pdf", "--outdir", dir, f], { timeout: 120_000, stdio: "ignore" });
      const pdf = readFileSync(path.join(dir, "deck.pdf"));
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
      expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(5);
    }
  }, 240_000);

  it("đổ vào mẫu .pptx của trường: giữ master (logo, dải màu, theme), slide dùng layout của mẫu, tiêu đề thành placeholder", async () => {
    const { analyzeTemplate } = await import("../../src/services/pptx/sidecar");
    const { canvasFor, styleFromTheme } = await import("../../src/services/pptx/build");
    const { areaFromTemplate } = await import("../../src/services/pptx/service");
    const info = await analyzeTemplate(FIX);
    expect(info.theme.colors.accent1).toBe("#8B1E3F");
    expect(info.theme.fonts).toEqual({ major: "Georgia", minor: "Arial" });
    const style = styleFromTheme(info, true);
    const area = areaFromTemplate(info);
    expect(area?.title.w).toBeGreaterThan(900);
    const pages = deckPages(DECK, { canvas: canvasFor(info), style, images: new Map(), template: true, area });
    const r = await buildPptx(pages, { template: { file: FIX, info } });
    const { z, xml } = await slideXml(r.buffer);
    expect(xml).toHaveLength(5); // slide mẫu cũ bị bỏ, chỉ còn bài
    const master = await z.file("ppt/slideMasters/slideMaster1.xml")!.async("string");
    const tplMaster = await (await JSZip.loadAsync(readFileSync(FIX))).file("ppt/slideMasters/slideMaster1.xml")!.async("string");
    expect(master).toBe(tplMaster); // master giữ nguyên byte
    expect(master).toContain("Logo truong");
    expect(xml[0]).toMatch(/<p:ph type="ctrTitle"\/>/);
    expect(xml[1]).toMatch(/<p:ph type="title"\/>/);
    expect(xml[1]).toMatch(/<p:ph idx="1"\/>/); // nội dung vào placeholder thân của mẫu
    expect(xml[1]).not.toContain("<p:bg>"); // nền lấy từ master
    const dir = mk("eduvn-xb-tpl-");
    const f = path.join(dir, "mau.pptx");
    writeFileSync(f, r.buffer);
    const py = pyRead(f);
    expect(py.layouts[0]).toBe("Title Slide");
    expect(py.layouts[1]).toBe("Title and Content");
    expect(py.notes[1]).toBe("Nhắc lại cách tính delta.");
  }, 180_000);
});

describe("HTML ngoại tuyến + gói .zip + kịch bản (thuần/tệp)", () => {
  it("HTML 1 tệp: dữ liệu cảnh, âm thanh base64, KaTeX dựng sẵn + phông nhúng, thư viện tương tác nhúng data:", async () => {
    const dir = mk("eduvn-xb-h-");
    silentMp3(path.join(dir, "a1.mp3"), 1);
    const html = await renderOfflineHtml({ title: "Bài thử" }, SCENES(["a1.mp3", "khong-co.mp3"]), { mode: "kem-loi-giang", audioDir: dir });
    expect(html).toContain('data-mime="audio/mpeg"');
    expect(html).toContain("katex-html"); // công thức dựng sẵn bằng KaTeX
    expect(html).toMatch(/font\/woff2;base64,/);
    expect(html).not.toMatch(/(src|href)="\/vendor\//);
    expect(html).not.toMatch(/url\(fonts\//);
    const lite = await renderOfflineHtml({ title: "Bài thử" }, SCENES(["a1.mp3"]), { mode: "khong-loi-giang", audioDir: dir });
    expect(lite).not.toContain('data-mime="audio/mpeg"');
    expect(await inlineInteractive('<script src="/vendor/interactive/chart.js@4.4.8/dist/chart.umd.js"></script>')).toMatch(/src="data:text\/javascript;base64,/);
    await expect(renderOfflineHtml({ title: "x" }, SCENES(["a1.mp3"]), { mode: "kem-loi-giang", audioDir: dir, maxBytes: 100 })).rejects.toThrow(/Gói bài giảng/);
  });

  it("công thức $…$ trong chữ slide được dựng KaTeX, không đụng thuộc tính thẻ", () => {
    const h = mathInText('<p title="$x$">Ta có $a^2 &lt; b$ và 5 $</p>');
    expect(h).toContain('title="$x$"');
    expect(h).toContain("katex-html");
    expect(h).not.toContain("$a^2");
  });

  it("kịch bản .md có lời giảng từng cảnh + đáp án", () => {
    const md = renderScriptMd({ title: "Bài thử", subject: "Toán", grade: 8 }, SCENES());
    expect(md).toContain("## Cảnh 1. Bình phương một tổng");
    expect(md).toContain("2. Đây là công thức bình phương một tổng.");
    expect(md).toContain("_Đáp án: B — Áp dụng hằng đẳng thức._");
  });

  it("đọc .maic.zip của OpenMAIC: cảnh, lời giảng, âm thanh theo audioRef, bỏ PBL có báo", async () => {
    const z = new JSZip();
    const dir = mk("eduvn-xb-m-");
    silentMp3(path.join(dir, "x.mp3"), 1);
    z.file("audio/s1.mp3", readFileSync(path.join(dir, "x.mp3")));
    z.file(
      "manifest.json",
      JSON.stringify({ formatVersion: 1, exportedAt: "2026-11-11", appVersion: "1.4", stage: { name: "Lớp OpenMAIC", createdAt: 0, updatedAt: 0 }, agents: [], mediaIndex: { "audio/s1.mp3": { type: "audio", duration: 1.2 } }, scenes: [{ type: "slide", title: "Mở đầu", order: 1, content: { type: "slide", canvas: CANVAS }, actions: [{ id: "x", type: "speech", text: "Xin chào", audioRef: "audio/s1.mp3" }] }, { type: "pbl", title: "Dự án", order: 2, content: { type: "pbl" } }] }),
    );
    const b = await readLessonBundle(await z.generateAsync({ type: "nodebuffer" }));
    expect(b.source).toBe("maic");
    expect(b.meta.title).toBe("Lớp OpenMAIC");
    expect(b.scenes).toHaveLength(1);
    const sp = b.scenes[0]!.actions![0] as { audioFile?: string; durationMs?: number };
    expect(sp.audioFile).toMatch(/^maic_\w+\.mp3$/);
    expect(sp.durationMs).toBe(1200);
    expect(b.audio.size).toBe(1);
    expect(b.warnings[0]).toContain("PBL");
    await expect(readLessonBundle(Buffer.from("PK lỗi"))).rejects.toThrow(/zip/);
  });
});

describe("API /api/xuat-ban", () => {
  let t: Awaited<ReturnType<typeof testApp>>;
  let auth: Record<string, string>;
  let dataDir: string;
  beforeEach(async () => {
    dataDir = mk("eduvn-xb-api-");
    t = await testApp({ aiLessons: { dataDir, chromePath: CHROME } });
    auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", email: "gv1@example.test", name: "Cô Lan" })}` };
  });
  afterEach(async () => {
    await t.app.close();
  });
  const call = (method: "GET" | "POST" | "DELETE", url: string, payload?: unknown) => t.app.inject({ method, url, headers: auth, payload: payload as object });
  const upload = (url: string, body: Buffer) => t.app.inject({ method: "POST", url, headers: { ...auth, "content-type": "application/octet-stream" }, payload: body });

  async function seedLesson(): Promise<string> {
    await call("GET", "/api/xuat-ban/mau"); // tạo người dùng + tổ chức
    const [u] = await t.db.select().from(users).where(eq(users.sub, "gv-1"));
    const [m] = await t.db.select().from(memberships).where(eq(memberships.userId, u!.id));
    const id = "6f1e2d3c-4b5a-4968-8776-655443322110";
    mkdirSync(audioDirOf(dataDir, id), { recursive: true });
    silentMp3(path.join(audioDirOf(dataDir, id), "a1.mp3"), 1.2);
    silentMp3(path.join(audioDirOf(dataDir, id), "a3.mp3"), 1.5);
    await t.db.insert(aiLessons).values({ id, orgId: m!.orgId, ownerId: u!.id, title: "Hằng đẳng thức đáng nhớ", subject: "Toán", grade: 8, status: "done", progress: { done: 3, total: 3, stage: "Hoàn tất" }, request: { requirement: "x" }, scenes: SCENES(["a1.mp3", "a3.mp3"]) });
    return id;
  }
  async function runJob(body: unknown) {
    const r = await call("POST", "/api/xuat-ban/viec", body);
    expect(r.statusCode, r.body).toBe(202);
    const id = r.json().id as string;
    for (let i = 0; i < 1200; i++) {
      const s = (await call("GET", `/api/xuat-ban/viec/${id}`)).json();
      if (["xong", "loi", "da-huy"].includes(s.status)) return { id, s };
      await new Promise((res) => setTimeout(res, 100));
    }
    throw new Error("quá thời gian");
  }

  it("kho mẫu: tải lên (phân tích màu/phông/layout), liệt kê, tải về, xoá; tệp không phải .pptx bị từ chối", async () => {
    if (!READY) return;
    const bad = await upload("/api/xuat-ban/mau?ten=X", Buffer.from("khong phai zip"));
    expect(bad.statusCode).toBe(400);
    const r = await upload("/api/xuat-ban/mau?ten=Tổ%20Toán&loai=mau&tep=mau-truong.pptx", readFileSync(FIX));
    expect(r.statusCode, r.body).toBe(201);
    expect(r.json().info.colors.accent1).toBe("#8B1E3F");
    const list = (await call("GET", "/api/xuat-ban/mau")).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Tổ Toán", kind: "mau", mine: true });
    expect(list[0].info.layouts).toContain("Title and Content");
    const f = await call("GET", `/api/xuat-ban/mau/${list[0].id}/tep`);
    expect(f.rawPayload.length).toBe(readFileSync(FIX).length);
    expect((await call("DELETE", `/api/xuat-ban/mau/${list[0].id}`)).statusCode).toBe(204);
    expect((await call("GET", "/api/xuat-ban/mau")).json()).toHaveLength(0);
  }, 60_000);

  it("xuất PowerPoint vào mẫu của trường + HTML + gói .zip → nhập lại gói thành bài mới; kịch bản .docx; quyền theo chủ việc", async () => {
    if (!READY) return;
    const lessonId = await seedLesson();
    const mau = (await upload("/api/xuat-ban/mau?ten=Mau&loai=mau", readFileSync(FIX))).json();
    const p = await runJob({ nguon: { loai: "bai-giang-ai", id: lessonId }, dinhDang: "pptx", tuyChon: { mauId: mau.id, giongDoc: true } });
    expect(p.s.status, p.s.error).toBe("xong");
    const pptx = await call("GET", `/api/xuat-ban/viec/${p.id}/tep`);
    expect(pptx.headers["content-type"]).toContain("presentationml");
    const { z, xml } = await slideXml(pptx.rawPayload);
    expect(xml.length).toBe(5);
    expect(await z.file("ppt/slideMasters/slideMaster1.xml")!.async("string")).toContain("Logo truong");
    // người khác không xem được việc của mình
    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy Nam" })}` };
    expect((await t.app.inject({ method: "GET", url: `/api/xuat-ban/viec/${p.id}`, headers: other })).statusCode).toBe(404);

    const h = await runJob({ nguon: { loai: "bai-giang-ai", id: lessonId }, dinhDang: "html", tuyChon: { loiGiang: "kem" } });
    expect(h.s.status, h.s.error).toBe("xong");
    expect((await call("GET", `/api/xuat-ban/viec/${h.id}/tep`)).body).toContain("bài giảng ngoại tuyến EDUVN");

    const zj = await runJob({ nguon: { loai: "bai-giang-ai", id: lessonId }, dinhDang: "zip" });
    expect(zj.s.fileName).toMatch(/\.eduvn\.zip$/);
    const zipBuf = (await call("GET", `/api/xuat-ban/viec/${zj.id}/tep`)).rawPayload;
    const zz = await JSZip.loadAsync(zipBuf);
    expect(Object.keys(zz.files)).toEqual(expect.arrayContaining(["manifest.json", "bai-giang.html", "audio/a1.mp3", "audio/a3.mp3"]));
    const imp = await upload("/api/xuat-ban/nhap?tep=bai.eduvn.zip", zipBuf);
    expect(imp.statusCode, imp.body).toBe(201);
    const back = (await call("GET", `/api/ai-lessons/${imp.json().id}`)).json();
    expect(back.scenes).toHaveLength(3);
    const af = back.scenes[0].actions[0].audioFile as string;
    expect(af).toMatch(/^nhap_\w+\.mp3$/);
    expect(existsSync(path.join(audioDirOf(dataDir, imp.json().id), af))).toBe(true);

    const d = await runJob({ nguon: { loai: "bai-giang-ai", id: lessonId }, dinhDang: "kich-ban-docx" });
    const docx = await JSZip.loadAsync((await call("GET", `/api/xuat-ban/viec/${d.id}/tep`)).rawPayload);
    const doc = await docx.file("word/document.xml")!.async("string");
    expect(doc).toContain("Chào các em");
    expect(doc).toContain("<m:oMath"); // công thức trong câu hỏi là phương trình Word

    const gr = await runJob({ nguon: { loai: "bai-giang-ai", id: lessonId }, dinhDang: "goi-tai-nguyen" });
    const g = await JSZip.loadAsync((await call("GET", `/api/xuat-ban/viec/${gr.id}/tep`)).rawPayload);
    expect(Object.keys(g.files).some((n) => n.startsWith("tuong-tac/") && n.endsWith(".html"))).toBe(true);
    // định dạng chỉ cho bài giảng AI
    expect((await call("POST", "/api/xuat-ban/viec", { nguon: { loai: "bo-slide", id: lessonId }, dinhDang: "html" })).statusCode).toBe(400);
  }, 300_000);

  it("nhập .pptx giữ bố cục → bài giảng AI (cảnh slide sửa được, lời giảng từ ghi chú, công thức → LaTeX)", async () => {
    if (!READY) return;
    const r = await buildPptx(deckPages(DECK, { canvas: { W: 1280, H: 720 }, style: PAPER_STYLE, images: new Map() }), {});
    const imp = await upload("/api/xuat-ban/nhap?tep=phuong-trinh.pptx&loiGiang=ghi-chu", r.buffer);
    expect(imp.statusCode, imp.body).toBe(201);
    expect(imp.json()).toMatchObject({ scenes: 5, status: "done" });
    const l = (await call("GET", `/api/ai-lessons/${imp.json().id}`)).json();
    expect(l.title).toBe("Phương trình bậc hai");
    const s2 = l.scenes[1];
    expect(s2.type).toBe("slide");
    expect(s2.title).toBe("Công thức nghiệm");
    const els = s2.content.canvas.elements as { type: string; left: number; top: number; content?: string }[];
    const title = els.find((e) => e.type === "text" && e.content?.includes("Công thức nghiệm"));
    expect(title!.left).toBeGreaterThan(55); // vị trí giữ theo bản gốc (80/1280 × 1000 ≈ 62)
    expect(title!.left).toBeLessThan(70);
    expect(els.some((e) => e.type === "text" && e.content?.includes("Δ"))).toBe(true);
    expect(s2.actions[0]).toMatchObject({ type: "speech", text: "Nhắc lại cách tính delta." });
    // nhập lại vẫn xuất được
    const again = await runJob({ nguon: { loai: "bai-giang-ai", id: imp.json().id }, dinhDang: "pptx", tuyChon: { giongDoc: false } });
    expect(again.s.status, again.s.error).toBe("xong");
  }, 240_000);

  it("video: tuỳ chọn 720p/24 fps/không in phụ đề/QR, tiến độ; huỷ được việc đang dựng", async () => {
    if (!existsSync(CHROME)) return;
    const lessonId = await seedLesson();
    const v = await runJob({ nguon: { loai: "bai-giang-ai", id: lessonId }, dinhDang: "video", tuyChon: { doPhanGiai: "720p", fps: 24, chatLuong: "nhap", phuDeCung: false, maQr: true } });
    expect(v.s.status, v.s.error).toBe("xong");
    expect(v.s.coPhuDe).toBe(true);
    const mp4 = (await call("GET", `/api/xuat-ban/viec/${v.id}/tep`)).rawPayload;
    const dir = mk("eduvn-xb-v-");
    writeFileSync(path.join(dir, "v.mp4"), mp4);
    const probe = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "csv=p=0", path.join(dir, "v.mp4")], { encoding: "utf8" }).trim();
    expect(probe).toBe("1280,720,24/1");
    expect((await call("GET", `/api/xuat-ban/viec/${v.id}/tep?phu-de=1`)).body).toContain("Chào các em");
    const c = await call("POST", "/api/xuat-ban/viec", { nguon: { loai: "bai-giang-ai", id: lessonId }, dinhDang: "video", tuyChon: { doPhanGiai: "720p" } });
    const cid = c.json().id as string;
    await new Promise((res) => setTimeout(res, 300));
    expect((await call("DELETE", `/api/xuat-ban/viec/${cid}`)).statusCode).toBe(200);
    for (let i = 0; i < 300; i++) {
      const s = (await call("GET", `/api/xuat-ban/viec/${cid}`)).json();
      if (s.status !== "dang-chay" && s.status !== "cho") {
        expect(s.status).toBe("da-huy");
        return;
      }
      await new Promise((res) => setTimeout(res, 100));
    }
    throw new Error("không huỷ được");
  }, 300_000);
});

describe.skipIf(!existsSync(CHROME))("HTML ngoại tuyến chạy không mạng (Chrome, offline)", () => {
  it("mở file://, chuyển cảnh, phát lời giảng có phụ đề + spotlight, quiz chấm tại chỗ, cảnh tương tác chạy với thư viện nhúng", async () => {
    const dir = mk("eduvn-xb-pw-");
    silentMp3(path.join(dir, "a1.mp3"), 0.6);
    silentMp3(path.join(dir, "a3.mp3"), 0.6);
    const html = await renderOfflineHtml({ title: "Bài ngoại tuyến", subject: "Toán", grade: 8 }, SCENES(["a1.mp3", "a3.mp3"]), { mode: "kem-loi-giang", audioDir: dir, onlineUrl: "https://eduvn.test/bai-giang-ai/1" });
    const file = path.join(dir, "bai.html");
    writeFileSync(file, html);
    const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
    try {
      const ctx = await browser.newContext({ offline: true, viewport: { width: 1280, height: 800 } });
      const requests: string[] = [];
      ctx.on("request", (r) => {
        if (!/^(file|data|blob|about):/.test(r.url())) requests.push(r.url());
      });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`file://${file}`);
      await page.waitForSelector(".stage");
      expect(await page.textContent("#cnt")).toBe("01 / 03");
      await page.click("#play");
      await page.waitForSelector(".sub", { timeout: 5000 });
      expect(await page.textContent(".sub")).toContain("Chào các em");
      await page.waitForSelector(".spot", { timeout: 8000 });
      await page.screenshot({ path: "/tmp/p14x-html-play.png" });
      await page.keyboard.press("ArrowRight");
      await page.waitForSelector(".qz");
      expect(page.url()).toContain("#scene-2");
      await page.click('.q[data-k="0"] .o[data-v="C"]');
      await page.click("#chk");
      expect(await page.textContent("#res")).toBe("Đúng 0/1 câu trắc nghiệm");
      await page.click('.q[data-k="0"] .o[data-v="B"]');
      await page.click("#chk");
      expect(await page.textContent("#res")).toBe("Đúng 1/1 câu trắc nghiệm");
      expect(await page.isVisible('.q[data-k="0"] .o.ok')).toBe(true);
      await page.screenshot({ path: "/tmp/p14x-html-quiz.png" });
      await page.keyboard.press("ArrowRight");
      const fr = page.frameLocator(".ia iframe");
      await fr.locator("#a").fill("7");
      await expect.poll(async () => fr.locator("#out").textContent()).toBe("49");
      const kx = await page.frames().find((f) => f !== page.mainFrame())?.evaluate(() => (window as unknown as { KX?: boolean }).KX);
      expect(kx).toBe(true); // katex nhúng data: chạy được trong iframe không mạng
      await page.screenshot({ path: "/tmp/p14x-html-interactive.png" });
      expect(requests).toEqual([]);
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 120_000);
});
