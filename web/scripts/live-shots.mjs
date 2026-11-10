// Chụp ảnh thiết kế mới (1440×810 máy chiếu, 390×844 điện thoại) → /tmp/p11v2-*.png. Cần server demo (:4321) + vite (:5181).
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.WEB_URL ?? "http://127.0.0.1:5181";
const token = readFileSync("/tmp/p11-token.txt", "utf8");
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
const user = { access_token: token, token_type: "Bearer", scope: "openid profile email", expires_at: Math.floor(Date.now() / 1000) + 7 * 3600, profile: { sub: "gv-demo", name: "Cô Lan (demo)" } };
const gvCtx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
await gvCtx.addInitScript(([k, v]) => localStorage.setItem(k, v), ["oidc.user:http://localhost:8180/realms/eduvn:eduvn-dev", JSON.stringify(user)]);
const gv = await gvCtx.newPage();
gv.on("pageerror", (e) => console.log("GV pageerror", e.message));
gv.on("dialog", (d) => void d.accept());
const out = (n) => `/tmp/p11v2-${n}.png`;

await gv.goto(`${BASE}/dau-truong`);
await gv.getByTestId("live-form").waitFor();
await gv.waitForTimeout(800);
await gv.getByTestId("lv-src-bank").click();
await gv.getByTestId("lv-topic").fill("Mệnh đề");
await gv.getByTestId("lv-class").selectOption({ label: "10A1 · 2026-2027 · 6 HS" });
await gv.getByTestId("lv-secs").fill("25");
await gv.getByTestId("lv-open").click();
await gv.getByTestId("lv-pin").waitFor();
const pin = (await gv.getByTestId("lv-pin").textContent()).replace(/\s/g, "");

const names = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Đức", "Võ Thị Hạnh", "Đặng Quốc Khánh"];
const phones = [];
for (const [i, name] of names.entries()) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("HS pageerror", e.message));
  await p.goto(`${BASE}/choi`);
  await p.getByTestId("pl-pin").fill(pin);
  await p.getByTestId("pl-go").click();
  await p.getByTestId("pl-roster").waitFor();
  if (i === 0) { await p.waitForTimeout(700); await p.screenshot({ path: out("hs-chon-ten") }); }
  await p.getByRole("button", { name }).click();
  await p.getByTestId("pl-game").waitFor();
  if (i === 0) { await p.waitForTimeout(500); await p.screenshot({ path: out("hs-cho") }); }
  phones.push(p);
  await gv.waitForTimeout(250);
}
await gv.waitForTimeout(1500);
await gv.screenshot({ path: out("sanh") });

// đáp án đúng theo nội dung câu
const CORRECT = [["Câu nào sau đây", 0], ["Phủ định", 0], ["Số nguyên tố", 2], ["tập con", 1]];
// kế hoạch đúng/sai mỗi HS theo câu → bảng xếp hạng đổi chỗ
const PLAN = [[1, 1, 0, 1, 1], [0, 0, 1, 1, 1], [1, 0, 1, 1, 0], [1, 1, 1, 0, 1], [0, 1, 1, 1, 1], [1, 1, 0, 0, 1]];
const WAIT = [[300, 900, 400, 1200, 300], [200, 300, 200, 300, 200], [1000, 1500, 900, 700, 1100], [600, 400, 800, 500, 500], [1400, 1100, 1300, 900, 1300], [800, 700, 600, 1500, 700]];
async function answer(p, i, q) {
  await p.waitForTimeout(WAIT[i][q]);
  const good = PLAN[i][q];
  if (await p.getByTestId("pl-text").count()) { await p.getByTestId("pl-text").fill(good ? "9" : "6"); await p.getByTestId("pl-send").click(); return; }
  const txt = await p.locator(".pl-qtext").innerText();
  const hit = CORRECT.find(([k]) => txt.includes(k));
  const right = hit ? hit[1] : 0;
  await p.getByTestId(`pl-opt-${good ? right : (right + 1) % 4}`).click();
}
const phaseIs = (p, ph) => p.waitForFunction((x) => document.querySelector(`[data-phase="${x}"]`), ph, { timeout: 15000 });

await gv.getByTestId("lv-start").click();
for (let q = 0; q < 5; q++) {
  await Promise.all([gv, ...phones].map((p) => phaseIs(p, "question")));
  await gv.waitForTimeout(1400);
  if (q === 1) {
    await Promise.all([0, 1, 2].map((i) => answer(phones[i], i, q)));
    await gv.waitForTimeout(900);
    await gv.screenshot({ path: out("cau-hoi") });
    await phones[5].screenshot({ path: out("hs-cau-hoi") });
    await phones[0].screenshot({ path: out("hs-da-chon") });
    await Promise.all([3, 4, 5].map((i) => answer(phones[i], i, q)));
  } else await Promise.all(phones.map((p, i) => answer(p, i, q)));
  await Promise.all([gv, ...phones].map((p) => phaseIs(p, "reveal")));
  await gv.waitForTimeout(2800);
  if (q === 1) {
    await gv.screenshot({ path: out("dap-an") });
    await phones[0].screenshot({ path: out("hs-dung") });
    await phones[1].screenshot({ path: out("hs-sai") });
  }
  if (q === 2) {
    await gv.screenshot({ path: out("xep-hang") });
    await gv.locator(".lv-lb").screenshot({ path: out("xep-hang-cot") });
  }
  if (q === 0) await gv.screenshot({ path: out("dap-an-cau-1") });
  await gv.getByTestId("lv-next").click();
}
await gv.getByTestId("lv-podium").waitFor();
await gv.waitForTimeout(1800);
await gv.screenshot({ path: out("vinh-danh-giua") });
await gv.waitForTimeout(2600);
await gv.screenshot({ path: out("vinh-danh-confetti") });
await gv.waitForTimeout(4200);
await gv.screenshot({ path: out("vinh-danh") });
await phones[3].screenshot({ path: out("hs-ket-thuc") });
await phones[5].screenshot({ path: out("hs-ket-thuc-2") });
await browser.close();
console.log("xong");
