// Smoke P9a: GV cấp thẻ → giao bài → 3 HS (điện thoại) đăng nhập mã lớp + STT + PIN, làm, tự lưu, nộp → GV xem kết quả.
// Cần: server PGlite (server/scripts/serve-pglite.ts, TOKEN_FILE) + vite (API_URL trỏ server).
// Chạy: API=http://127.0.0.1:4323 WEB_URL=http://127.0.0.1:5183 TOKEN_FILE=/tmp/p9a-token.txt node web/scripts/smoke-p9.mjs
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const API = process.env.API ?? "http://127.0.0.1:4323";
const BASE = process.env.WEB_URL ?? "http://127.0.0.1:5183";
const TOKEN = readFileSync(process.env.TOKEN_FILE ?? "/tmp/p9a-token.txt", "utf8").trim();
const SHOT = (n) => `/tmp/p9a-${n}.png`;
const assert = (c, m) => {
  if (!c) throw new Error(`SMOKE FAIL: ${m}`);
  console.log(`ok  ${m}`);
};
const call = async (method, path, body) => {
  const r = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((tok) => {
    const authority = "http://localhost:8180/realms/eduvn";
    localStorage.setItem(`oidc.user:${authority}:eduvn-dev`, JSON.stringify({ access_token: tok, token_type: "Bearer", scope: "openid profile email", expires_at: Math.floor(Date.now() / 1000) + 7 * 3600, profile: { sub: "gv-demo", name: "Cô Lan (thử)" } }));
  }, TOKEN);
  const page = await ctx.newPage();
  page.on("dialog", (d) => void d.accept());
  page.on("pageerror", (e) => console.log("pageerror", e.message));

  // Dữ liệu nền qua API
  const topic = `Lớp trực tuyến ${Date.now() % 100000}`;
  const cls = await call("POST", "/api/classes", { name: "10A1", schoolYear: "2026-2027", subject: "Toán" });
  await call("POST", `/api/classes/${cls.body.id}/students`, { text: "Nguyễn Văn An\nTrần Thị Bình\nLê Văn Cường" });
  for (let i = 0; i < 2; i++) assert((await call("POST", "/api/questions", { type: "mcq", subject: "Toán", grade: 10, topic, level: "NB", tags: [], stem: `Câu ${i + 1}: $${i}+1$ bằng`, options: [`$${i}$`, `$${i + 1}$`, `$${i + 2}$`, `$${i + 3}$`], answer: 1 })).status === 201, `thêm câu trắc nghiệm ${i + 1}`);
  assert((await call("POST", "/api/questions", { type: "short_answer", subject: "Toán", grade: 10, topic, level: "TH", tags: [], stem: "Viết $\\frac{3}{2}$ dưới dạng số thập phân.", answer: "1,5" })).status === 201, "thêm câu trả lời ngắn");
  const title = `Kiểm tra ${topic}`;
  const exam = await call("POST", "/api/exams", { title, variants: 1, durationMinutes: 15, matrix: { subject: "Toán", grade: 10, cells: [{ topic, level: "NB", type: "mcq", count: 2 }, { topic, level: "TH", type: "short_answer", count: 1 }] } });
  assert(exam.status === 201, "tạo đề 2 trắc nghiệm + 1 trả lời ngắn");
  const keys = (await call("GET", `/api/exams/${exam.body.examId}/key`)).body[0].entries;

  // GV: cấp mã (UI)
  await page.goto(`${BASE}/lop-hoc/${cls.body.id}?tab=the-lop`);
  await page.getByTestId("lh-issue").click();
  await page.waitForFunction(() => /^\d{6}$/.test(document.querySelector("[data-testid=lh-pin-3]")?.textContent ?? ""));
  const classCode = (await page.getByTestId("lh-class-code").innerText()).trim();
  const pins = {};
  for (const seat of [1, 2, 3]) pins[seat] = (await page.getByTestId(`lh-pin-${seat}`).innerText()).trim();
  assert(/^[A-Z2-9]{6}$/.test(classCode), `cấp mã lớp ${classCode} + PIN cho cả lớp`);
  await page.screenshot({ path: SHOT("the-lop") });

  // GV: giao bài (UI)
  await page.goto(`${BASE}/lop-hoc/${cls.body.id}?tab=giao-bai`);
  await page.getByTestId("lh-new").click();
  await page.locator("[data-testid=lh-exams] label", { hasText: title }).click();
  await page.getByTestId("lh-publish").click();
  await page.waitForSelector("[data-testid=lh-monitor]");
  assert((await page.locator("[data-testid=lh-mrow]").count()) === 3, "giao bài → tab Theo dõi có 3 HS");
  await page.screenshot({ path: SHOT("theo-doi") });

  // 3 HS trên điện thoại
  const plan = { 1: "all", 2: "mcq", 3: "one" };
  for (const seat of process.env.ONLY_HS1 ? [1] : [1, 2, 3]) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const hs = await c.newPage();
    hs.on("pageerror", (e) => console.log("hs pageerror", e.message));
    await hs.goto(`${BASE}/hs`);
    await hs.getByTestId("hs-in-code").fill(classCode);
    await hs.getByTestId("hs-in-seat").fill(String(seat));
    for (let i = 0; i < 6; i++) await hs.getByTestId(`hs-in-pin-${i}`).fill(pins[seat][i]);
    if (seat === 1) await hs.screenshot({ path: SHOT("hs-dang-nhap") });
    await hs.getByTestId("hs-go").click();
    const card = hs.locator("[data-testid=hs-asg]", { hasText: title });
    await card.waitFor();
    await card.getByTestId("hs-start").click();
    await hs.waitForSelector("[data-testid=hs-pal-0]");
    for (const [i, e] of keys.entries()) {
      const mode = plan[seat];
      if (mode === "one" && i > 0) break;
      if (mode === "mcq" && e.section !== "mcq") continue;
      await hs.getByTestId(`hs-pal-${i}`).click();
      if (e.section === "mcq") await hs.getByTestId(`hs-opt-${e.no}-${"ABCD".indexOf(e.answer)}`).click();
      else {
        await hs.waitForTimeout(600);
        await hs.locator(`[data-testid=hs-sa-${e.no}]`).click();
        await hs.keyboard.type("3/2");
        const typed = await hs.locator(`[data-testid=hs-sa-${e.no}]`).evaluate((el) => el.value);
        if (typed !== "\\frac{3}{2}") {
          // Bàn phím ảo không nhận phím trong trình duyệt tự động: nạp công thức bằng lệnh của MathLive, vẫn đi qua sự kiện input → tự lưu.
          console.log(`(gõ phím ra "${typed}", nạp công thức bằng executeCommand)`);
          await hs.locator(`[data-testid=hs-sa-${e.no}]`).evaluate((el) => {
            el.focus();
            el.executeCommand(["insert", "\\frac{3}{2}"]);
          });
        }
      }
    }
    await hs.waitForFunction(() => document.querySelector("[data-testid=hs-save]")?.textContent?.includes("Đã lưu"), null, { timeout: 15000 });
    if (seat === 1) await hs.screenshot({ path: SHOT("hs-lam-bai") });
    await hs.getByTestId("hs-submit-top").click();
    await hs.getByTestId("hs-confirm").click();
    await hs.waitForSelector("[data-testid=hs-score]");
    const score = (await hs.getByTestId("hs-score").innerText()).trim();
    console.log(`HS ${seat}: ${score}/10`);
    if (seat === 1) {
      assert(score === "10", `HS 1 nộp bài, chấm đúng hết (công thức 3/2 = 1,5): ${score}/10`);
      await hs.screenshot({ path: SHOT("hs-ket-qua") });
    }
    await c.close();
  }

  // GV: kết quả
  await page.goto(`${BASE}/lop-hoc/${cls.body.id}?tab=ket-qua`);
  await page.waitForFunction(() => document.querySelector("[data-testid=lh-kpi-submit]")?.textContent?.replace(/\s+/g, "") === "3/3", null, { timeout: 15000 });
  assert((await page.locator("[data-testid=lh-row]").count()) === 3, "GV thấy 3 dòng điểm, nộp 3/3");
  assert((await page.locator("[data-testid=lh-items] tbody tr").count()) === 3, "thống kê từng câu (3 câu)");
  await page.screenshot({ path: SHOT("ket-qua"), fullPage: true });
  console.log("SMOKE PASS");
} finally {
  await browser.close();
}
