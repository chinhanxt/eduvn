// web/scripts/p13-shots.mjs — chạy thật P13 qua cổng AI: 6 bài (hình không gian ×2, hàm số, xác suất có điều kiện, phương trình mũ,
// tích phân) → giải từng bước (SSE) → đo thời gian + tỉ lệ "Đã kiểm" → chia sẻ công khai → chụp /loi-giai, trình xem (desktop/điện thoại),
// tô sáng theo bước, "Chưa hiểu bước này", ngân hàng, gia sư "Lời giải đầy đủ", kết quả bài làm HS. Kiểm nhãn trên hình thật không đè.
// Dùng với server/scripts/serve-pglite.ts (PORT=4326, GATEWAY_TOKEN, AI_TASK_OVERRIDES) + vite (API_URL=http://127.0.0.1:4326 WEB_PORT=5186).
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const API = process.env.API ?? "http://127.0.0.1:4326";
const WEB = process.env.WEB ?? "http://127.0.0.1:5186";
const TOKEN = readFileSync(process.env.TOKEN_FILE ?? "/tmp/p13-token.txt", "utf8").trim();
const SHOT = (n) => `/tmp/p13-${n}.png`;
const ONLY = process.env.ONLY; // "solve" = chỉ giải (không mở Chrome); "shots" = bỏ phần giải, dùng /tmp/p13-run.json

const call = async (method, path, body, token = TOKEN) => {
  const r = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (r.status >= 400) throw new Error(`${method} ${path} → ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};

const PROBLEMS = [
  { key: "khong-gian", topic: "Hình học không gian", stem: "Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông cạnh $a$, $SA$ vuông góc với mặt phẳng đáy và $SA = a\\sqrt{2}$. Tính góc giữa đường thẳng $SC$ và mặt phẳng $(ABCD)$.", answer: "45°" },
  { key: "khoang-cach", topic: "Hình học không gian", stem: "Cho hình chóp $S.ABC$ có $SA$ vuông góc với mặt phẳng $(ABC)$, tam giác $ABC$ vuông tại $B$, $AB = a$, $SA = 2a$. Tính khoảng cách từ $A$ đến mặt phẳng $(SBC)$.", answer: "2a√5/5" },
  { key: "ham-so", topic: "Hàm số", stem: "Tìm các điểm cực trị của đồ thị hàm số $y = x^3 - 3x + 1$.", answer: "Cực đại (−1; 3), cực tiểu (1; −1)" },
  { key: "xac-suat", topic: "Xác suất có điều kiện", stem: "Một nhà máy có hai máy A và B sản xuất lần lượt 60% và 40% tổng số sản phẩm. Tỉ lệ phế phẩm của máy A là 2%, của máy B là 5%. Lấy ngẫu nhiên một sản phẩm thì thấy đó là phế phẩm. Tính xác suất để sản phẩm đó do máy A sản xuất.", answer: "3/8" },
  { key: "mu", topic: "Phương trình mũ", stem: "Giải phương trình $4^x - 6\\cdot 2^x + 8 = 0$.", answer: "x = 1; x = 2" },
  { key: "tich-phan", topic: "Tích phân", stem: "Tính tích phân $I = \\displaystyle\\int_1^e \\frac{\\ln x}{x}\\,dx$.", answer: "1/2" },
];

async function solve(questionId) {
  const t0 = Date.now();
  const r = await fetch(`${API}/api/solutions/solve`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ questionId }) });
  if (!r.ok) throw new Error(`solve ${r.status} ${await r.text()}`);
  const dec = new TextDecoder();
  let buf = "";
  const out = { firstFigure: null, firstStep: null, done: null, steps: 0, partials: 0, status: [], error: null };
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const p of parts) {
      if (!p.startsWith("data: ")) continue;
      const e = JSON.parse(p.slice(6));
      const t = (Date.now() - t0) / 1000;
      if (e.type === "figure") out.firstFigure ??= t;
      else if (e.type === "step") (out.firstStep ??= t), out.steps++;
      else if (e.type === "partial") out.partials++;
      else if (e.type === "status") out.status.push(e.message);
      else if (e.type === "verified") (out.verification = e.verification), (out.corrected = e.corrected);
      else if (e.type === "done") (out.done = t), (out.id = e.id), (out.solution = e.solution);
      else if (e.type === "error") out.error = e.message;
    }
  }
  return out;
}

let run;
if (ONLY === "shots") run = JSON.parse(readFileSync("/tmp/p13-run.json", "utf8"));
else {
  run = { items: [] };
  for (const p of PROBLEMS) {
    const q = await call("POST", "/api/questions", { type: "short_answer", subject: "Toán", grade: 12, topic: p.topic, level: "VD", tags: [], stem: p.stem, answer: p.answer });
    process.stdout.write(`giải ${p.key}… `);
    let r = await solve(q.id);
    if (r.error && !r.solution) {
      process.stdout.write(`lỗi (${r.error}), thử lại… `);
      r = await solve(q.id);
    }
    const s = r.solution;
    console.log(r.error && !s ? `LỖI ${r.error}` : `${s.verification.status}${r.corrected ? " (đã tự sửa)" : ""} · hình ${s.figure?.kind ?? "—"} · ${s.steps.length} bước · hình sau ${r.firstFigure ?? "—"}s · bước 1 sau ${r.firstStep}s · xong ${r.done}s`);
    let slug = null;
    if (r.id) slug = (await call("POST", `/api/solutions/${r.id}/publish`, { public: true })).slug;
    run.items.push({ key: p.key, questionId: q.id, id: r.id, slug, error: r.error, firstFigure: r.firstFigure, firstStep: r.firstStep, done: r.done, steps: s?.steps.length, partials: r.partials, corrected: r.corrected, status: s?.verification.status, details: s?.verification.details, figure: s?.figure?.kind ?? null, answer: s?.answer, refs: s?.steps.map((x) => x.refs) });
    writeFileSync("/tmp/p13-run.json", JSON.stringify(run, null, 2));
  }
  const ok = run.items.filter((i) => i.status === "verified").length;
  console.log(`Đã kiểm: ${ok}/${run.items.length}`);
  if (ONLY === "solve") process.exit(0);
}

const by = (k) => run.items.find((i) => i.key === k);
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", headless: true });
const report = { overlaps: {}, errors: [] };
try {
  const login = async (ctx) =>
    ctx.addInitScript((tok) => {
      localStorage.setItem("oidc.user:http://localhost:8180/realms/eduvn:eduvn-dev", JSON.stringify({ access_token: tok, token_type: "Bearer", scope: "openid profile email", expires_at: Math.floor(Date.now() / 1000) + 7 * 3600, profile: { sub: "gv-demo", name: "Cô Lan (thử)" } }));
    }, TOKEN);
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await desk.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && report.errors.push(m.text()));

  /** Nhãn chữ trên hình (đang hiển thị) có cặp nào chồng nhau không — đo bằng getBBox thật của trình duyệt. */
  const overlaps = (p) =>
    p.evaluate(() => {
      const svg = document.querySelector('[data-testid="sol-figure"]');
      if (!svg) return null;
      const r = [...svg.querySelectorAll("text")].filter((t) => getComputedStyle(t).opacity !== "0").map((t) => ({ t: t.textContent, b: t.getBoundingClientRect() }));
      // nhãn tô sáng nằm đúng chỗ nhãn SGK bên dưới → bỏ cặp trùng chữ trùng chỗ
      const bad = [];
      for (let i = 0; i < r.length; i++)
        for (let j = i + 1; j < r.length; j++) {
          const a = r[i].b, b = r[j].b;
          const same = r[i].t === r[j].t && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
          const ov = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          if (ov && !same) bad.push(`${r[i].t} / ${r[j].t}`);
        }
      return { labels: r.length, bad };
    });
  const settle = (p, ms = 700) => p.waitForTimeout(ms);

  // thư viện công khai
  await page.goto(`${WEB}/loi-giai`);
  await page.waitForSelector('[data-testid="lib-list"]');
  await settle(page);
  await page.screenshot({ path: SHOT("thu-vien") });
  await page.fill('[data-testid="lib-search"]', "máy");
  await page.waitForFunction(() => document.querySelectorAll(".sol-card").length === 1);
  await settle(page, 400);
  await page.screenshot({ path: SHOT("thu-vien-tim") });

  // trình xem từng bài
  for (const it of run.items.filter((i) => i.slug)) {
    await page.goto(`${WEB}/loi-giai/${it.slug}`);
    await page.waitForSelector('[data-testid="sol-viewer"]');
    await page.evaluate(() => document.fonts.ready);
    await settle(page);
    const n = await page.locator('[data-testid="sol-step"]').count();
    const ov = [];
    for (let k = 0; k < n; k++) {
      if (n > 1) await page.click(`[data-testid="sol-num-${k + 1}"]`);
      await settle(page, 450);
      ov.push(await overlaps(page));
      if (k === Math.min(1, n - 1)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await settle(page, 350);
        await page.screenshot({ path: SHOT(`${it.key}-buoc${k + 1}`) });
      }
    }
    report.overlaps[it.key] = ov;
  }
  const solid = by("khong-gian") ?? run.items[0];
  if (solid?.slug) {
    await page.goto(`${WEB}/loi-giai/${solid.slug}`);
    await page.waitForSelector('[data-testid="sol-viewer"]');
    await settle(page);
    await page.click('[data-testid="sol-verify"]');
    await settle(page, 300);
    await page.screenshot({ path: SHOT("kiem-dap-so") });
    await page.keyboard.press("Escape");
  }

  // điện thoại
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await mob.newPage();
  mp.on("pageerror", (e) => report.errors.push(`mobile: ${e.message}`));
  await mp.goto(`${WEB}/loi-giai`);
  await mp.waitForSelector('[data-testid="lib-list"]');
  await settle(mp);
  await mp.screenshot({ path: SHOT("thu-vien-mobile") });
  if (solid?.slug) {
    await mp.goto(`${WEB}/loi-giai/${solid.slug}`);
    await mp.waitForSelector('[data-testid="sol-viewer"]');
    await settle(mp);
    await mp.click('[data-testid="sol-num-2"]');
    await settle(mp, 600);
    await mp.screenshot({ path: SHOT("khong-gian-mobile") });
    report.mobileOverflow = await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await mp.evaluate(() => window.scrollBy(0, 500));
    await settle(mp, 500);
    await mp.screenshot({ path: SHOT("khong-gian-mobile-cuon") });
    report.mobileStickyTop = await mp.evaluate(() => Math.round(document.querySelector(".sol-fig").getBoundingClientRect().top));
  }

  // GV đăng nhập: "Chưa hiểu bước này" (gia sư P6 thật), ngân hàng + hộp lời giải, gia sư "Lời giải đầy đủ"
  const gv = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await login(gv);
  const gp = await gv.newPage();
  gp.on("pageerror", (e) => report.errors.push(`gv: ${e.message}`));
  const xs = by("xac-suat") ?? run.items[0];
  if (xs?.slug) {
    await gp.goto(`${WEB}/loi-giai/${xs.slug}`);
    await gp.waitForSelector('[data-testid="sol-viewer"]');
    await gp.click('[data-testid="sol-num-2"]');
    await settle(gp, 500);
    const t0 = Date.now();
    await gp.click('[data-testid="sol-stuck"]');
    await gp.waitForSelector(".sol-turn-ai .sol-rich", { timeout: 120_000 });
    report.stuckFirstText = (Date.now() - t0) / 1000;
    await gp.waitForFunction(() => !document.querySelector(".sol-typing"), null, { timeout: 180_000 });
    report.stuckDone = (Date.now() - t0) / 1000;
    await settle(gp, 300);
    await gp.screenshot({ path: SHOT("chua-hieu") });
  }

  await gp.goto(`${WEB}/ngan-hang`);
  await gp.fill('[data-testid="f-grade"]', "12");
  await gp.waitForSelector('[data-testid="q-solution"]');
  await settle(gp, 800);
  await gp.screenshot({ path: SHOT("ngan-hang") });
  await gp.locator('[data-testid="q-solution"]').nth(2).click();
  await gp.waitForSelector('[data-testid="sol-viewer"]');
  await settle(gp, 800);
  await gp.screenshot({ path: SHOT("ngan-hang-loi-giai") });
  // giải lại để chụp lúc đang stream (skeleton + chữ hiện dần)
  await gp.getByRole("button", { name: "Giải lại" }).click();
  await gp.waitForSelector(".sol-skel", { timeout: 60_000 });
  await gp.screenshot({ path: SHOT("dang-giai-skeleton") });
  await gp.waitForSelector('[data-testid="sol-step"]', { timeout: 180_000 });
  await settle(gp, 1500);
  await gp.screenshot({ path: SHOT("dang-giai-buoc") });
  await gp.waitForSelector('[data-testid="sol-publish"]', { timeout: 300_000 });
  await settle(gp, 500);
  await gp.screenshot({ path: SHOT("ngan-hang-giai-lai-xong") });

  await gp.goto(`${WEB}/hoc/gia-su`);
  await gp.click('[data-testid="mode-full"]');
  await gp.fill('[data-testid="chat-input"]', "Giải bất phương trình $\\log_2(x-1) < 3$.");
  await gp.click('[data-testid="chat-send"]');
  await gp.waitForSelector('[data-testid="full-solution"] [data-testid="sol-answer"]', { timeout: 300_000 });
  await settle(gp, 600);
  await gp.screenshot({ path: SHOT("gia-su-loi-giai-day-du") });

  // HS cổng /hs: giao 2 câu có lời giải (hiện lời giải sau khi nộp) → HS nộp → kết quả có trình xem lời giải
  const cls = await call("POST", "/api/classes", { name: "12A1", schoolYear: "2026-2027", subject: "Toán" });
  await call("POST", `/api/classes/${cls.id}/students`, { text: "Nguyễn Văn An\nTrần Thị Bình" });
  const cred = await call("POST", `/api/classes/${cls.id}/credentials`, {});
  const qids = [by("khong-gian"), by("xac-suat")].filter((i) => i?.id).map((i) => i.questionId);
  const a = await call("POST", `/api/classes/${cls.id}/assignments`, { title: "Luyện tập lời giải", source: { questionIds: qids }, dueAt: new Date(Date.now() + 86400_000).toISOString(), publish: true, showSolution: "after_submit" });
  const card = cred.cards[0];
  const sess = await call("POST", "/api/student/session", { classCode: cred.classCode, seat: card.seat, pin: card.pin }, "");
  const st = await call("POST", `/api/student/assignments/${a.id}/start`, {}, sess.token);
  await call("POST", `/api/student/submissions/${st.submission.id}/submit`, { seq: 1, answers: {} }, sess.token);
  const hs = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await hs.addInitScript((s) => localStorage.setItem("eduvn.hs", JSON.stringify({ ...s, expiresAt: Date.now() + s.expiresInSeconds * 1000 })), sess);
  const hp = await hs.newPage();
  hp.on("pageerror", (e) => report.errors.push(`hs: ${e.message}`));
  await hp.goto(`${WEB}/hs/ket-qua/${st.submission.id}`);
  await hp.waitForSelector('[data-testid="hs-rq"]');
  await settle(hp, 800);
  await hp.locator('[data-testid="hs-rq"] .rh').first().click();
  await hp.waitForSelector('[data-testid="hs-solution"] [data-testid="sol-viewer"]', { timeout: 30_000 });
  await settle(hp, 800);
  await hp.locator('[data-testid="hs-solution"]').scrollIntoViewIfNeeded();
  await hp.screenshot({ path: SHOT("hs-ket-qua") });
  await hp.click('[data-testid="hs-solution"] [data-testid="sol-stuck"]');
  await hp.waitForSelector(".sol-turn-ai .sol-rich", { timeout: 120_000 });
  await hp.waitForFunction(() => !document.querySelector(".sol-typing"), null, { timeout: 180_000 });
  await settle(hp, 300);
  await hp.screenshot({ path: SHOT("hs-chua-hieu") });
} finally {
  await browser.close();
  writeFileSync("/tmp/p13-report.json", JSON.stringify({ run: run.items.map(({ refs, details, ...x }) => ({ ...x, details })), ...report }, null, 2));
  console.log(JSON.stringify(report, null, 1).slice(0, 3000));
}
