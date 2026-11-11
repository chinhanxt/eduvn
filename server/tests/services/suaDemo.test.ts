// Hồi quy các lỗi nội dung/hiển thị phát hiện ở buổi demo 2026-11-11 (bài "Xác suất có điều kiện").
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { describe, expect, it } from "vitest";
import { dedupeHeadings } from "../../src/domain/bookBlocks";
import { curriculumNote, derivable, fixGradeRefs, foreignNumbers, lessonFacts, numbersIn, wrongGradeRefs } from "../../src/domain/lessonFacts";
import { compileTimeline, oneLineExplain, plainText, quizVoiceLines, toSrt } from "../../src/export/aiLessonTimeline";
import { framed, frameServer, settleInteractive } from "../../src/export/aiLessonVideo";
import { interactiveDoc } from "../../src/export/interactiveHtml";
import { hyperframesHtml } from "../../src/services/anim/hfHtml";
import { addF, fracTex, mulF, toFrac } from "../../src/services/anim/studio";
import { AnimSpec, fracMul } from "../../src/services/anim/spec";
import type { StoredScene } from "../../src/services/aiLessons/types";

const CHROME = "/usr/bin/google-chrome";
const LESSON = "Hộp có 5 bi đỏ và 3 bi xanh. Lấy lần lượt 2 viên không hoàn lại. $P(A) = \\frac{5}{8}$, $P(B|A) = \\frac{4}{7}$.";

describe("số liệu nhất quán (hoạt hình)", () => {
  it("đọc số: nguyên, thập phân phẩy, phân số a/b và \\frac, phần trăm; bỏ số mũ", () => {
    const n = numbersIn("0,25 và 3/8 và \\frac{4}{7}, 40%, x^2");
    expect(n.values).toEqual(expect.arrayContaining([0.25, 3, 8, 0.375, 4, 7, 4 / 7, 40, 0.4]));
    expect(n.values).not.toContain(2);
  });
  it("cây xác suất bịa số (0,6/0,4, 0,5/0,75 kiểu 3 đỏ 2 xanh) bị phát hiện; số của bài (5/8, 4/7, tích 5/14) và phân số chuỗi thì qua", () => {
    const bad = { goc: "Bốc 2 bi", cacNhanh: [{ ten: "Đỏ", xs: 0.6, con: [{ ten: "Đỏ", xs: 0.5 }, { ten: "Xanh", xs: 0.5 }] }, { ten: "Xanh", xs: 0.4, con: [{ ten: "Đỏ", xs: 0.75 }, { ten: "Xanh", xs: 0.25 }] }] };
    expect(foreignNumbers(bad, LESSON)).toEqual(expect.arrayContaining([0.6, 0.4, 0.5, 0.75, 0.25]));
    const good = { goc: "Bốc 2 bi", cacNhanh: [{ ten: "Đỏ", xs: "5/8", con: [{ ten: "Đỏ", xs: "4/7" }, { ten: "Xanh", xs: "3/7" }] }, { ten: "Xanh", xs: 0.375, con: [{ ten: "Đỏ", xs: "5/7" }, { ten: "Xanh", xs: "2/7" }] }] };
    expect(foreignNumbers(good, `${LESSON} Sau khi lấy xanh còn 5 đỏ 2 xanh: 5/7 và 2/7.`)).toEqual([]);
    expect(derivable(LESSON).some((x) => Math.abs(x - 5 / 14) < 1e-9)).toBe(true);
    // số trong chữ của tham số lệch với bài 5 đỏ 3 xanh
    expect(foreignNumbers({ cacDong: ["Hộp có 14 đỏ, 16 xanh"] }, LESSON)).toEqual([14, 16]);
    // khung trục / LaTeX tổng quát không bị kiểm
    expect(foreignNumbers({ bieuThuc: "x^2/3", xMin: -9, cacBuoc: [{ latex: "P(A\\cap B)=P(A)P(B|A)" }] }, LESSON)).toEqual([]);
  });
  it("cây xác suất nhận phân số dạng chuỗi, giữ nhãn phân số và nhân phân số tối giản ở lá", () => {
    const spec = AnimSpec.parse({ template: "cay_xac_suat", thoiLuong: 10, params: { goc: "Bốc bi", cacNhanh: [{ ten: "Đỏ", xs: "5/8", con: [{ ten: "Đỏ", xs: "4/7" }, { ten: "Xanh", xs: "3/7" }] }, { ten: "Xanh", xs: "3/8" }] } });
    const b = (spec.params as { cacNhanh: { xs: number; xsNhan?: string }[] }).cacNhanh[0]!;
    expect(b).toMatchObject({ xs: 0.625, xsNhan: "5/8" });
    expect(fracMul("5/8", "4/7")).toBe("5/14");
    // khuôn "Giấy học thuật" dựng phân số bằng KaTeX: kiểm phép nhân phân số tối giản + không còn số thập phân
    expect(fracTex(mulF(toFrac(0.625), toFrac(4 / 7)))).toBe("\\dfrac{5}{14}");
    expect(fracTex(addF([mulF(toFrac(0.375), toFrac(1)), mulF(toFrac(0.625), toFrac(3 / 7))]))).toBe("\\dfrac{9}{14}");
    const html = hyperframesHtml(spec as never);
    const text = html.slice(html.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    expect(text).toMatch(/Bốc bi/);
    expect(html).not.toContain("0,625");
    expect(html).not.toContain("0,357");
    expect(AnimSpec.safeParse({ template: "cay_xac_suat", thoiLuong: 10, params: { cacNhanh: [{ ten: "A", xs: "9/8" }, { ten: "B", xs: "1/8" }] } }).success).toBe(false);
  });
  it("dữ kiện các cảnh slide trước đưa vào prompt cảnh sau", () => {
    const scenes = [
      { order: 1, type: "slide", title: "Ví dụ", content: { canvas: { elements: [{ type: "text", content: "<p>Hộp có <b>5 bi đỏ</b> và 3 bi xanh</p>" }, { type: "latex", latex: "\\frac{5}{8}" }] } } },
      { order: 2, type: "quiz", title: "Quiz", content: {} },
      { order: 3, type: "slide", title: "Sau", content: { canvas: { elements: [{ type: "text", content: "<p>không lấy</p>" }] } } },
    ];
    expect(lessonFacts(scenes, 3)).toBe("- Ví dụ: Hộp có 5 bi đỏ và 3 bi xanh $\\frac{5}{8}$");
  });
});

describe("lớp / chương trình", () => {
  it("phát hiện + sửa tên SGK/lớp lệch lớp của bài; lớp học trước vẫn giữ khi không phải tên sách", () => {
    const t = "Theo SGK Toán 12, công thức nhân… (xem Toán lớp 12). Đã học ở lớp 10.";
    expect(wrongGradeRefs(t, 11)).toEqual(["SGK Toán 12", "Toán lớp 12"]);
    expect(fixGradeRefs(t, 11)).toBe("Theo SGK Toán 11, công thức nhân… (xem Toán lớp 11). Đã học ở lớp 10.");
    expect(wrongGradeRefs("SGK Toán 11", 11)).toEqual([]);
    expect(curriculumNote("Toán", 11)).toContain('Chương trình giáo dục phổ thông 2018');
    expect(curriculumNote("Toán", 11)).toContain('"SGK Toán 11"');
  });
});

describe("cảnh quiz trong video: thời lượng theo nội dung", () => {
  const QS = [
    { id: "q1", type: "single", question: "Biết học sinh là nữ, xác suất thích bóng đá?", options: [{ value: "A", label: "0,10 (hay 1/10)" }, { value: "B", label: "0,25 (hay 1/4)" }, { value: "C", label: "0,45" }, { value: "D", label: "0,55" }], answer: ["B"], analysis: "Có 16 bạn nữ, 4 bạn thích nên $P = \\frac{4}{16} = \\frac14$. Chọn B." },
    { id: "q2", type: "multiple", question: "Chọn các khẳng định đúng", options: [{ value: "A", label: "$P(T|B)=0,95$" }, { value: "B", label: "$P(B\\cap T)=0,019$" }], answer: ["A", "B"], analysis: "Theo cây xác suất." },
  ];
  const scene = (voice?: boolean) =>
    ({ id: "s", outlineId: "o", type: "quiz", title: "Củng cố", order: 1, stageId: "x", content: { type: "quiz", questions: QS }, actions: [{ id: "a", type: "speech", text: "Củng cố nhé.", durationMs: 3000 }], ...(voice && { quizVoice: quizVoiceLines(QS, "s").map((v, i) => ({ q: { ...v.q, audioFile: `q${i}.mp3`, durationMs: 9000 }, a: { ...v.a, audioFile: `a${i}.mp3`, durationMs: 6000 } })) }) }) as unknown as StoredScene;

  it("chỉ đọc câu hỏi (không đọc phương án); đáp án + đúng 1 câu lời giải (bỏ câu dẫn kết thúc bằng ':')", () => {
    const [v1, v2] = quizVoiceLines(QS, "s");
    expect(v1?.q.text).toBe("Câu 1. Biết học sinh là nữ, xác suất thích bóng đá?");
    expect(v1?.a.text).toBe("Đáp án đúng: B. Có 16 bạn nữ, 4 bạn thích nên $P = \\frac{4}{16} = \\frac14$.");
    expect(v2?.a.text).toBe("Đáp án đúng: A và B. Theo cây xác suất.");
    expect(oneLineExplain("Phân tích các nhận định dựa trên sơ đồ cây: - Phương án A đúng vì P(T|B) = 0,95. - Phương án B đúng.")).toBe("Phương án A đúng vì P(T|B) = 0,95.");
    expect(oneLineExplain(`${"Rất dài, ".repeat(40)}hết.`).length).toBeLessThanOrEqual(221);
    expect(plainText("$P(B\\cap T) = \\frac{5}{8}\\cdot\\frac47$")).toBe("P(B∩T) = 5/8·4/7");
  });
  it("có giọng đọc: mỗi câu = tiếng đọc câu hỏi + 3 s nghĩ, đáp án = tiếng đọc + 0,8 s; không còn đoạn câm cố định", () => {
    const tl = compileTimeline("Bài", [scene(true)]);
    expect(tl.segments.map((x) => [x.quizIndex, x.reveal ?? false, x.audioFile ?? null, x.durationMs])).toEqual([
      [0, false, null, 3000],
      [0, false, "q0.mp3", 12000],
      [0, true, "a0.mp3", 6800],
      [1, false, "q1.mp3", 12000],
      [1, true, "a1.mp3", 6800],
    ]);
    // mỗi đoạn: các mốc phụ đề phủ kín thời lượng (để khung hình khớp tiếng)
    for (const s of tl.segments) expect(s.cues.reduce((n, c) => n + c.durationMs, 0)).toBe(s.durationMs);
    expect(toSrt(tl)).not.toMatch(/\n\n\n|-->.*\n\n/);
    expect(toSrt(tl)).not.toContain("$");
  });
  it("chưa có giọng đọc: thời lượng ước lượng theo số chữ của câu hỏi + 3 s nghĩ", () => {
    const tl = compileTimeline("Bài", [scene(false)]);
    const ask = tl.segments.find((x) => x.quizIndex === 0 && !x.reveal && x.cues.length > 1);
    expect(ask?.durationMs).toBe(3000 + Math.round(("Câu 1. " + QS[0]!.question).length / 14 * 1000));
    expect(tl.diagnostics.some((d) => d.includes("chưa có giọng đọc"))).toBe(true);
  });
});

describe("giáo trình: khử trùng tiêu đề", () => {
  it("tiêu đề tiểu mục lặp giữa các khối (hoặc trùng tên chương) bị bỏ dòng tiêu đề, giữ nội dung", () => {
    const { blocks, dropped } = dedupeHeadings(
      [
        { markdown: "### Quay lại hộp bi\nA\n\n### Từ định nghĩa đến công thức nhân\nB" },
        { markdown: "*nối*\n\n### Từ định nghĩa đến **công thức nhân**\nC\n\n### Đổi vai trò\nD" },
        { markdown: "### Công thức nhân và cây xác suất\nE" },
        {},
      ],
      "Công thức nhân và cây xác suất",
    );
    expect(blocks[1]?.markdown).toBe("*nối*\n\nC\n\n### Đổi vai trò\nD");
    expect(blocks[2]?.markdown).toBe("E");
    expect(dropped).toEqual(["Từ định nghĩa đến **công thức nhân**", "Công thức nhân và cây xác suất"]);
  });
});

describe.skipIf(!existsSync(CHROME))("cảnh tương tác trong khung dựng video (Chrome thật)", () => {
  it("KaTeX dựng được \\(…\\) trong iframe sandbox; mã AI gọi localStorage/cookie không lỗi; chờ trang ổn định", { timeout: 60_000 }, async () => {
    const ai = `<!DOCTYPE html><html><head><link rel="stylesheet" href="/vendor/interactive/katex@0.16.38/dist/katex.min.css"><script src="/vendor/interactive/katex@0.16.38/dist/katex.min.js"></script><script src="/vendor/interactive/katex@0.16.38/dist/contrib/auto-render.min.js"></script></head><body><h1 id="t">Xác suất \\(P(A|B)\\)</h1><div id="o">…</div><script>localStorage.setItem("k","5/8");sessionStorage.setItem("s","1");document.cookie="a=1";document.getElementById("o").textContent=localStorage.getItem("k")+"|"+document.cookie;document.addEventListener("DOMContentLoaded",function(){renderMathInElement(document.body,{delimiters:[{left:"\\\\(",right:"\\\\)",display:false}]})});</script></body></html>`;
    const fs = await frameServer();
    const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-gpu"] });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      fs.set(framed(interactiveDoc(ai), "Phụ đề", "allow-scripts"));
      await page.goto(`${fs.origin}/frame`, { waitUntil: "load" });
      await settleInteractive(page);
      const f = page.frames().find((x) => x !== page.mainFrame())!;
      const r = await f.evaluate(() => ({ katex: document.querySelectorAll("#t .katex").length, raw: document.body.innerText.includes("\\("), out: document.getElementById("o")?.textContent }));
      expect(r).toEqual({ katex: 1, raw: false, out: "5/8|a=1" });
    } finally {
      await browser.close();
      await fs.close();
    }
  });
});
