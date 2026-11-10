// Chụp ảnh trình phát bài giảng AI (dùng với demo-server giả Keycloak). Cách dùng: node scripts/p5-shots.mjs <lessonId>
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const id = process.argv[2];
const token = readFileSync("/tmp/p5-token.txt", "utf8");
const BASE = process.env.WEB_URL ?? "http://127.0.0.1:5175";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("dialog", (d) => void d.accept());
const user = { access_token: token, token_type: "Bearer", scope: "openid profile email", expires_at: Math.floor(Date.now() / 1000) + 7 * 3600, profile: { sub: "gv-demo", name: "Cô Lan (demo)", email: "gv.demo@example.test" } };
await page.addInitScript(([k, v]) => localStorage.setItem(k, v), ["oidc.user:http://localhost:8180/realms/eduvn:eduvn-dev", JSON.stringify(user)]);
const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `/tmp/p5-${n}.png` }); console.log("shot", n); };

await page.goto(`${BASE}/bai-giang-ai`);
await page.waitForSelector("h1");
await page.getByTestId("ail-new").click();
await page.getByTestId("ail-req").fill("Toán 8 — Hằng đẳng thức đáng nhớ");
await shot("list");
await page.goto(`${BASE}/bai-giang-ai/${id}`);
await page.waitForSelector('[data-testid="ail-player"]');
await page.waitForSelector('[data-testid="ail-slide"]');
await shot("player-slide");
const n = await page.getByTestId("ail-scene-btn").count();
console.log("cảnh", n);
// phát cảnh 1 để thấy spotlight + phụ đề
await page.getByTestId("ail-play").click();
await page.waitForTimeout(4500);
await shot("player-playing");
await page.getByTestId("ail-play").click();
// quiz
for (let i = 0; i < n; i++) {
  await page.getByTestId("ail-scene-btn").nth(i).click();
  await page.waitForTimeout(500);
  if (await page.getByTestId("ail-quiz").count()) {
    const radios = page.locator('[data-testid="ail-quiz"] input[type=radio]');
    if (await radios.count()) await radios.first().check();
    await page.getByTestId("ail-check").click();
    await shot("player-quiz");
  }
  if (await page.getByTestId("ail-interactive").count()) {
    await page.waitForTimeout(2500);
    await shot("player-interactive");
  }
}
await page.getByTestId("ail-scene-btn").nth(0).click();
await page.getByTestId("ail-tab-edit").click();
await page.waitForSelector('[data-testid="ail-canvas"]');
await page.getByTestId("ail-handle").first().click();
await shot("editor");
// kéo thử
const box = await page.getByTestId("ail-handle").first().boundingBox();
if (box) { await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + 50, { steps: 5 }); await page.mouse.up(); }
await page.getByTestId("ail-text").fill("Hằng đẳng thức đáng nhớ (đã sửa)");
await shot("editor-sua");
await page.getByTestId("ail-save").click();
await page.waitForSelector('[data-testid="ail-msg"]');
await page.getByTestId("ail-tab-play").click();
await shot("sau-sua");
// xuất
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("ail-pptx").click()]);
await dl.saveAs("/tmp/p5-demo.pptx");
console.log("pptx saved");
await page.getByTestId("ail-bank").first().click();
await page.waitForSelector('[data-testid="ail-msg"]');
console.log("bank:", await page.getByTestId("ail-msg").innerText());
await browser.close();
