// Smoke E2E: Keycloak + Postgres + server :4310 + vite :5173 đang chạy.
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const BASE = process.env.WEB_URL ?? "http://localhost:5173";
const SHOT = (n) => `/tmp/eduvn-web-${n}.png`;
const topic = `Mệnh đề ${Date.now()}`;

const assert = (cond, msg) => {
  if (!cond) throw new Error(`SMOKE FAIL: ${msg}`);
  console.log(`ok  ${msg}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
const shot = async (n) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOT(n) });
};
const go = async (path, n) => {
  await page.goto(`${BASE}${path}`);
  await page.waitForSelector("h1");
  await page.waitForLoadState("networkidle");
  await shot(n);
};

try {
  // Đăng nhập qua form Keycloak
  await page.goto(BASE);
  await page.waitForSelector(".login .box");
  await shot("login");
  await page.getByText("Email", { exact: true }).click();
  await page.waitForSelector("#username");
  await page.fill("#username", "gv1");
  await page.fill("#password", "gv1-dev-pass");
  await page.click("#kc-login");
  await page.waitForSelector(".me");
  assert(await page.locator("aside").isVisible(), "đăng nhập gv1 qua Keycloak");
  await page.waitForSelector(".tools");
  await page.waitForLoadState("networkidle");
  await shot("home-trong");

  // Thêm 2 câu hỏi
  await page.goto(`${BASE}/ngan-hang`);
  await page.waitForSelector("h1");
  for (const [i, stem] of ["2 + 2 = ?", "Số nào là số chẵn?"].entries()) {
    if (i === 0) await page.getByTestId("add-q").click();
    await page.getByTestId("q-topic").fill(topic);
    await page.getByTestId("q-stem").fill(`${stem} (${topic})`);
    for (let k = 0; k < 4; k++) await page.getByTestId(`q-opt-${k}`).fill(`Phương án ${"ABCD"[k]}`);
    await page.getByLabel(`Đáp án ${"ABCD"[i]}`).check();
    await page.getByTestId("q-save").click();
    await page.waitForFunction(
      ([n, t]) => [...document.querySelectorAll("[data-testid=q-table] tbody tr")].filter((r) => r.textContent.includes(t)).length >= n,
      [i + 1, topic],
    );
  }
  const hasTopic = await page.locator("[data-testid=q-table] tbody tr", { hasText: topic }).count();
  assert(hasTopic === 2, `đã thêm 2 câu hỏi vào ngân hàng (thấy ${hasTopic})`);
  await shot("ngan-hang");

  // Tạo đề: trước hết đòi 5 câu để thấy ô thiếu
  await page.goto(`${BASE}/de-thi`);
  await page.waitForSelector("h1");
  await page.getByTestId("new-exam").click();
  await page.getByTestId("e-title").fill("Kiểm tra smoke");
  const cell = page.getByTestId("cell").first();
  await cell.locator("input").first().fill(topic);
  await cell.locator("input[type=number]").fill("5");
  await page.getByTestId("e-create").click();
  await page.waitForSelector("[data-testid=shortages]");
  assert(/có 2\/5/.test(await page.getByTestId("shortages").innerText()), "thiếu câu hiển thị ô thiếu (2/5)");
  await shot("de-thi-thieu");

  await cell.locator("input[type=number]").fill("2");
  await page.getByTestId("e-create").click();
  await page.waitForSelector("[data-testid=created]");
  await page.waitForLoadState("networkidle");
  const codes = await page.getByTestId("dl-exam").count();
  assert(codes === 2, "tạo đề 2 mã đề, có link tải");
  await shot("de-thi");

  // Tải Word
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("dl-exam").first().click()]);
  const file = await dl.path();
  const head = (await readFile(file)).subarray(0, 2).toString();
  assert(head === "PK" && dl.suggestedFilename().endsWith(".docx"), `tải Word ${dl.suggestedFilename()}`);

  // Chấm bài
  await page.goto(`${BASE}/cham-bai`);
  await page.waitForSelector("[data-testid=g-row]");
  const examId = await page.getByTestId("g-exam").inputValue();
  const code = await page.getByTestId("g-code").inputValue();
  const key = await page.evaluate(
    async ({ examId }) => {
      const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
      const token = JSON.parse(localStorage.getItem(k)).access_token;
      const r = await fetch(`/api/exams/${examId}/key`, { headers: { authorization: `Bearer ${token}` } });
      return r.json();
    },
    { examId },
  );
  const entries = key.find((k) => k.code === code).entries;
  for (const en of entries) await page.getByTestId(`mcq-${en.no}-${en.answer}`).click();
  await shot("cham-bai-nhap");
  await page.getByTestId("g-submit").click();
  await page.waitForSelector("[data-testid=g-total]");
  const total = await page.getByTestId("g-total").innerText();
  const [t, max] = total.split("/").map((x) => parseFloat(x.replace(",", ".")));
  assert(t > 0 && t === max, `chấm đúng hết: ${total.replace(/\s+/g, " ")}`);
  await shot("cham-bai");

  // Các trang còn lại
  await go("/", "home");
  await go("/ket-noi", "ket-noi");
  assert((await page.getByTestId("mcp-url").innerText()).endsWith("/mcp"), "trang Kết nối có URL MCP");
  for (const [p, n] of [["/slide", "slide"], ["/video", "video"], ["/giao-trinh", "giao-trinh"], ["/gia-su", "gia-su"], ["/hoc-vien", "hoc-vien"], ["/to-chuc", "to-chuc"]]) await go(p, n);
  console.log("SMOKE PASS");
} catch (e) {
  await page.screenshot({ path: SHOT("FAIL") }).catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
