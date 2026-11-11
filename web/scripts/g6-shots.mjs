// web/scripts/g6-shots.mjs — chạy thật trợ lý tác tử (G6 đợt 1) qua cổng AI và chụp /hoc/tro-ly:
// đang suy nghĩ/tra kho, câu trả lời có nguồn, thẻ ask_user, sau khi trả lời, F5 khôi phục (390 tối), khung soạn có đính kèm.
// Dùng với server/scripts/serve-pglite.ts (PORT=4327, TOKEN_FILE=/tmp/g6-token.txt, GATEWAY_TOKEN, AI_TASK_OVERRIDES='{"tro_ly_tac_tu":"gia_su_chat"}')
// + vite (API_URL=http://127.0.0.1:4327 WEB_PORT=5187). Ảnh: /tmp/g6-*.png.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const API = process.env.API ?? "http://127.0.0.1:4327";
const WEB = process.env.WEB ?? "http://127.0.0.1:5187";
const TOKEN = readFileSync(process.env.TOKEN_FILE ?? "/tmp/g6-token.txt", "utf8").trim();
const SHOT = (n) => `/tmp/g6-${n}.png`;
const call = async (method, path, body) => {
  const r = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (r.status >= 400) throw new Error(`${method} ${path} → ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};

const PAGES = [
  "Bài 3. Những hằng đẳng thức đáng nhớ\n\nBình phương của một tổng. Với hai số a và b bất kì, ta có (a+b)^2 = a^2 + 2ab + b^2.\n\nVí dụ: (x+3)^2 = x^2 + 6x + 9.",
  "Hiệu hai bình phương. Với hai số a và b, ta có a^2 - b^2 = (a-b)(a+b). Hiệu hai bình phương bằng tích của tổng hai số với hiệu của chúng.\n\nVí dụ: x^2 - 9 = (x-3)(x+3). Học sinh hay nhầm giữa bình phương của một hiệu và hiệu hai bình phương.",
];
const kbs = await call("GET", "/api/tutor/kbs");
if (!kbs.some((k) => k.docCount > 0)) {
  const kb = await call("POST", "/api/tutor/kbs", { name: "Toán 8 · Hằng đẳng thức", subject: "Toán", grade: 8 });
  await call("POST", `/api/tutor/kbs/${kb.id}/docs`, { name: "SGK Toán 8 – Bài 3", text: PAGES.join("\n\n") });
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const report = {};
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((tok) => {
    localStorage.setItem("oidc.user:http://localhost:8180/realms/eduvn:eduvn-dev", JSON.stringify({ access_token: tok, token_type: "Bearer", scope: "openid profile email", expires_at: Math.floor(Date.now() / 1000) + 7 * 3600, profile: { sub: "gv-demo", name: "Minh Anh (thử)" } }));
  }, TOKEN);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.goto(`${WEB}/hoc/tro-ly`, { waitUntil: "networkidle" });
  await page.waitForSelector(".ag-composer textarea");
  await page.screenshot({ path: SHOT("trong") });

  // 1) Câu cần tra kho: chụp lúc đang chạy + lúc xong (mở quá trình).
  const t0 = Date.now();
  await page.fill(".ag-composer textarea", "Theo tài liệu của lớp, hiệu hai bình phương phát biểu thế nào? Cho em ví dụ trong sách.");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".ag-proc.is-busy", { timeout: 30_000 });
  await page.waitForSelector(".ag-tool, .ag-answer", { timeout: 90_000 });
  report.firstActivityMs = Date.now() - t0;
  await page.screenshot({ path: SHOT("dang-chay") });
  await page.waitForSelector(".ag-srcs, .ag-turn:not([aria-busy]) .ag-answer", { timeout: 120_000 });
  await page.waitForFunction(() => !document.querySelector(".ag-turn[aria-busy]"), null, { timeout: 120_000 });
  report.turn1Ms = Date.now() - t0;
  await page.waitForTimeout(600);
  const hd = page.locator(".ag-proc-hd").first();
  if ((await hd.getAttribute("aria-expanded")) === "false") await hd.click();
  await page.locator(".ag-tool-hd").first().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT("tra-loi"), fullPage: true });
  report.turn1 = { tools: await page.locator(".ag-tool").count(), sources: await page.locator(".ag-srcs li").count(), url: page.url() };

  // 2) Cuộc mới: câu thiếu dữ kiện → thẻ ask_user.
  await page.getByRole("button", { name: "Cuộc mới" }).first().click();
  await page.fill(".ag-composer textarea", "Giải giúp em bài này với.");
  await page.keyboard.press("Enter");
  const asked = await page.waitForSelector(".ag-ask:not(.is-answered), .ag-turn:not([aria-busy]) .ag-answer", { timeout: 120_000 });
  report.askShown = await asked.evaluate((el) => el.classList.contains("ag-ask"));
  await page.waitForTimeout(500);
  await page.screenshot({ path: SHOT("ask-user") });
  if (report.askShown) {
    const ask = page.locator(".ag-ask:not(.is-answered)");
    const free = await ask.locator("textarea").count();
    if (await ask.locator(".ag-opt").count()) await ask.locator(".ag-opt").first().click();
    if (free || !(await ask.locator(".ag-opt").count())) await ask.locator("textarea").first().fill("Phân tích x² − 9 thành nhân tử");
    // nhiều câu: đi hết các thẻ con
    for (let i = 0; i < 4 && (await ask.getByRole("button", { name: "Câu tiếp" }).count()); i++) {
      await ask.getByRole("button", { name: "Câu tiếp" }).click();
      if (await ask.locator(".ag-opt").count()) await ask.locator(".ag-opt").first().click();
      else await ask.locator("textarea").first().fill("Phân tích x² − 9 thành nhân tử");
    }
    await page.screenshot({ path: SHOT("ask-chon") });
    await ask.getByRole("button", { name: "Gửi câu trả lời" }).click();
    await page.waitForSelector(".ag-ask.is-answered", { timeout: 30_000 });
    await page.waitForFunction(() => !document.querySelector(".ag-turn[aria-busy]"), null, { timeout: 150_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: SHOT("ask-xong"), fullPage: true });
  }
  const mach = new URL(page.url()).searchParams.get("mach");
  report.mach = mach;

  // 3) F5 khôi phục ở 390 px, chế độ tối.
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await m.addInitScript((tok) => {
    localStorage.setItem("eduvn-theme", "dark");
    localStorage.setItem("oidc.user:http://localhost:8180/realms/eduvn:eduvn-dev", JSON.stringify({ access_token: tok, token_type: "Bearer", scope: "openid profile email", expires_at: Math.floor(Date.now() / 1000) + 7 * 3600, profile: { sub: "gv-demo", name: "Minh Anh (thử)" } }));
  }, TOKEN);
  const mp = await m.newPage();
  await mp.goto(`${WEB}/hoc/tro-ly?mach=${mach}`, { waitUntil: "networkidle" });
  await mp.waitForSelector(".ag-turn", { timeout: 20_000 });
  await mp.waitForTimeout(500);
  report.restoredTurns = await mp.locator(".ag-turn").count();
  await mp.screenshot({ path: SHOT("390-toi"), fullPage: true });

  // 4) Khung soạn có đính kèm (tệp chữ + ảnh) ở 1024.
  await page.setViewportSize({ width: 1024, height: 760 });
  await page.getByRole("button", { name: "Cuộc mới" }).first().click().catch(() => {});
  await page.setInputFiles(".ag-composer input[type=file]", [
    { name: "de-bai.txt", mimeType: "text/plain", buffer: Buffer.from("Câu 1. Phân tích đa thức x^2 - 16 thành nhân tử.") },
    { name: "anh-bai-tap.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") },
  ]);
  await page.fill(".ag-composer textarea", "Em làm câu 1 trong tệp đính kèm như vậy có đúng không ạ?");
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT("khung-soan") });
  await m.close();
  await ctx.close();
} finally {
  await browser.close();
}
writeFileSync("/tmp/g6-shots.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
