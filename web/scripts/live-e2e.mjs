// Chạy thật: 1 màn GV + 3 điện thoại HS chơi hết trận, chụp ảnh /tmp/p11-*.png. Dùng với server demo (token /tmp/p11-token.txt).
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
const assert = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };

await gv.goto(`${BASE}/dau-truong`);
await gv.getByTestId("live-form").waitFor();
await gv.waitForTimeout(800);
await gv.getByTestId("lv-src-bank").click();
await gv.getByTestId("lv-topic").fill("Mệnh đề");
await gv.getByTestId("lv-class").selectOption({ label: "10A1 · 2026-2027 · 3 HS" });
await gv.getByTestId("lv-secs").fill("15");
await gv.screenshot({ path: "/tmp/p11-tao-phong.png" });
await gv.getByTestId("lv-open").click();
await gv.getByTestId("lv-pin").waitFor();
const pin = (await gv.getByTestId("lv-pin").textContent()).trim();
console.log("PIN", pin);

const names = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường"];
const phones = [];
for (const [i, name] of names.entries()) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("HS pageerror", e.message));
  await p.goto(`${BASE}/choi`);
  await p.getByTestId("pl-pin").fill(pin);
  await p.getByTestId("pl-go").click();
  await p.getByTestId("pl-roster").waitFor();
  if (i === 0) await p.screenshot({ path: "/tmp/p11-hs-chon-ten.png" });
  await p.getByRole("button", { name }).click();
  await p.getByTestId("pl-game").waitFor();
  phones.push(p);
}
await gv.waitForFunction(() => document.querySelectorAll('[data-testid="lv-names"] .lv-chip').length === 3);
await gv.waitForTimeout(400);
await gv.screenshot({ path: "/tmp/p11-sanh.png" });
assert(true, "3 HS vào sảnh, GV thấy tên");

// HS cũ vào lại sau khi tải lại trang (token localStorage)
await phones[2].reload();
await phones[2].getByTestId("pl-game").waitFor();
assert(true, "HS tải lại trang vẫn trong phòng");

await gv.getByTestId("lv-start").click();
for (let q = 0; q < 5; q++) {
  await gv.getByTestId("lv-clock").waitFor();
  await Promise.all(phones.map((p) => p.waitForFunction(() => document.querySelector('[data-phase="question"]'))));
  if (q === 0) { await gv.waitForTimeout(500); await gv.screenshot({ path: "/tmp/p11-gv-cau-hoi.png" }); await phones[0].screenshot({ path: "/tmp/p11-hs-cau-hoi.png" }); }
  for (const [i, p] of phones.entries()) {
    await p.waitForTimeout(150 + i * 120);
    if (await p.getByTestId("pl-text").count()) { await p.getByTestId("pl-text").fill(i === 1 ? "8" : "9"); await p.getByTestId("pl-send").click(); }
    else await p.getByTestId(`pl-opt-${i === 1 && q % 2 ? 3 : 0}`).click(); // An & Cường chọn A, Bình đôi khi sai (đáp án đúng không phải lúc nào cũng A)
  }
  await gv.locator('[data-phase="reveal"]').waitFor({ timeout: 8000 }); // tất cả đã trả lời → tự chốt
  await gv.waitForTimeout(700);
  if (q === 1) { await gv.screenshot({ path: "/tmp/p11-gv-ket-qua-cau.png" }); await phones[0].screenshot({ path: "/tmp/p11-hs-ket-qua.png" }); }
  assert((await gv.getByTestId("lv-top5").locator("li").count()) >= 1, `câu ${q + 1}: có bảng top 5`);
  await gv.getByTestId("lv-next").click();
}
await gv.getByTestId("lv-podium").waitFor();
await gv.waitForTimeout(900);
await gv.screenshot({ path: "/tmp/p11-vinh-danh.png" });
await phones[0].screenshot({ path: "/tmp/p11-hs-ket-thuc.png" });
assert((await gv.getByTestId("lv-podium").locator(".lv-step").count()) === 3, "bục vinh danh 3 người");

await gv.getByTestId("lv-result").click();
await gv.getByTestId("lv-gb-write").waitFor();
await gv.screenshot({ path: "/tmp/p11-ket-qua-tran.png" });
await gv.getByTestId("lv-gb-write").click();
await gv.getByTestId("lv-gb-ok").waitFor();
console.log(await gv.getByTestId("lv-gb-ok").textContent());
await gv.goto(`${BASE}/so-diem`);
await browser.close();
