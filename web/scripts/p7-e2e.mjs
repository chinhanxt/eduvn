// Chạy thật P7 (chấm từ ảnh): server demo PGlite + cổng AI thật, vite. Ảnh /tmp/p7-*.png, số đo /tmp/p7-e2e.json.
// Chuẩn bị: GATEWAY_TOKEN=… PORT=4318 TOKEN_FILE=/tmp/p7-token.txt pnpm --filter @eduvn/server exec tsx scripts/serve-pglite.ts
//           API_URL=http://127.0.0.1:4318 WEB_PORT=5178 pnpm --filter @eduvn/web exec vite
// Chạy:     node web/scripts/p7-e2e.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const API = process.env.API ?? "http://127.0.0.1:4318";
const BASE = process.env.WEB_URL ?? "http://127.0.0.1:5178";
const token = readFileSync(process.env.TOKEN_FILE ?? "/tmp/p7-token.txt", "utf8").trim();
const out = {};
const assert = (c, m) => {
  if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m);
};
async function call(method, path, body) {
  const r = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = r.status === 204 ? null : await r.json();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(j)}`);
  return j;
}

// ---------- Dữ liệu: 12 trắc nghiệm, 4 đúng/sai, 4 trả lời ngắn, 1 tự luận; lớp 10A1 cấp thẻ (số thứ tự) ----------
const base = { subject: "Toán", grade: 10, topic: "Hàm số bậc hai", level: "TH", tags: [] };
for (let i = 0; i < 12; i++) await call("POST", "/api/questions", { ...base, type: "mcq", stem: `Câu trắc nghiệm số ${i + 1}: đỉnh của parabol $y=x^2-${2 * i + 2}x$ có hoành độ bằng?`, options: [`$${i + 1}$`, `$${i + 2}$`, `$${-i - 1}$`, `$${2 * i}$`], answer: i % 4 });
for (let i = 0; i < 4; i++) await call("POST", "/api/questions", { ...base, type: "true_false", stem: `Cho hàm số $y=x^2-${i + 2}x+1$. Xét tính đúng sai:`, statements: ["Đồ thị là parabol", "Hàm số đồng biến trên ℝ", "Đồ thị cắt trục tung tại (0;1)", "Hệ số a âm"], answer: [true, false, true, i % 2 === 0] });
for (const a of ["1,5", "-2", "0,25", "12"]) await call("POST", "/api/questions", { ...base, type: "short_answer", stem: `Trả lời ngắn: kết quả là ${a.replace("-", "âm ")} (câu thử)`, answer: a });
await call("POST", "/api/questions", { ...base, type: "essay", stem: "Giải phương trình $x^2-5x+6=0$.", rubric: "Tính đúng biệt thức Δ = 1 (0,5 điểm); tìm đúng hai nghiệm x = 2 và x = 3 (0,5 điểm).", explanation: "Δ = 25 − 24 = 1; x = (5 ± 1)/2 → x = 2, x = 3.", points: 1 });
const matrix = { subject: "Toán", grade: 10, cells: [{ topic: "Hàm số bậc hai", level: "TH", type: "mcq", count: 12 }, { topic: "Hàm số bậc hai", level: "TH", type: "true_false", count: 4 }, { topic: "Hàm số bậc hai", level: "TH", type: "short_answer", count: 4 }, { topic: "Hàm số bậc hai", level: "TH", type: "essay", count: 1 }] };
const exam = await call("POST", "/api/exams", { title: "Kiểm tra 15 phút — Hàm số bậc hai", matrix, variants: 2 });
const keys = await call("GET", `/api/exams/${exam.examId}/key`);
const k0 = keys[0];
const cls = await call("POST", "/api/classes", { name: "10A1", schoolYear: "2026-2027" });
await call("POST", `/api/classes/${cls.id}/students`, { text: "Nguyễn Văn An\nTrần Thị Bình\nLê Hoàng Cường\nPhạm Minh Dũng" });
await call("POST", `/api/classes/${cls.id}/credentials`, {});
const roster = await call("GET", `/api/photo/classes/${cls.id}/roster`);
const binh = roster.students.find((s) => s.fullName === "Trần Thị Bình");
console.log("seats", roster.students.map((s) => `${s.seat}:${s.fullName}`).join(", "));

// ---------- Ảnh phiếu tổng hợp ----------
const truth = Object.fromEntries(k0.entries.filter((e) => e.section !== "essay").map((e) => [e.no, e.section === "mcq" ? "ABCD".indexOf(e.answer) : e.section === "true_false" ? [...e.answer].map((c) => c === "Đ") : e.answer]));
const mcqNos = k0.entries.filter((e) => e.section === "mcq").map((e) => e.no);
const ans1 = { ...truth, [mcqNos[4]]: (truth[mcqNos[4]] + 1) % 4, [mcqNos[7]]: (truth[mcqNos[7]] + 2) % 4 }; // 2 câu sai thật
const ans2 = { ...truth };
const spec = {
  examId: exam.examId, title: "Kiểm tra 15 phút — Hàm số bậc hai", code: k0.code, entries: k0.entries,
  sheets: [
    { out: "/tmp/p7-phieu-binh.png", seed: 11, angle: 6, sbd: String(binh.seat), answers: ans1, double: [mcqNos[1]], faint: [mcqNos[9]] },
    { out: "/tmp/p7-phieu-sbd-sai.png", seed: 23, angle: -7, sbd: "000009", answers: ans2 },
  ],
};
writeFileSync("/tmp/p7-synth.json", JSON.stringify(spec));
const files = execFileSync("../server/node_modules/.bin/tsx", ["scripts/p7-synth.ts", "/tmp/p7-synth.json"], { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname }).split("\n").filter((l) => l.startsWith("/tmp/"));
console.log("ảnh", files.join(" "));

// ---------- Trình duyệt ----------
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
const user = { access_token: token, token_type: "Bearer", scope: "openid profile email", expires_at: Math.floor(Date.now() / 1000) + 7 * 3600, profile: { sub: "gv-demo", name: "Cô Lan (thử)" } };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ["oidc.user:http://localhost:8180/realms/eduvn:eduvn-dev", JSON.stringify(user)]);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
const posts = [];
page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/photo/omr")) posts.push(r.url()); });

await page.goto(`${BASE}/cham-anh?de=${exam.examId}&lop=${cls.id}`);
await page.getByTestId("s-drop").waitFor();
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/p7-1-quet-trong.png" });

const t0 = Date.now();
await page.getByTestId("s-file").setInputFiles(files);
await page.getByTestId("s-skeleton").first().waitFor();
await page.waitForTimeout(150);
await page.screenshot({ path: "/tmp/p7-2-dang-quet.png" });
await page.waitForFunction(() => document.querySelectorAll('[data-testid="s-sheet"]').length === 2 && !document.querySelector('[data-testid="s-skeleton"]'), null, { timeout: 120_000 });
out.scanWallMs = Date.now() - t0; // gồm tải OpenCV.js lần đầu
await page.waitForSelector('[data-testid="s-total"]');
await page.waitForTimeout(500);
out.scanMsPerPage = (await page.getByTestId("s-ms").textContent()).replace(/\D/g, "");
await page.screenshot({ path: "/tmp/p7-3-ket-qua-quet.png", fullPage: true });

const cards = page.getByTestId("s-sheet");
const c1 = cards.nth(0);
const c2 = cards.nth(1);
out.doubts = await page.getByTestId("s-doubt").count();
assert(out.doubts >= 1 && (await page.locator(".pg-doubt", { hasText: "tô hai ô" }).count()) === 1, `phiếu 1: câu tô 2 ô bị cờ (tổng ô nghi vấn ${out.doubts}; tô mờ 45% có lúc đọc thẳng được)`);
assert((await c1.getByTestId("s-match").textContent()).includes("Trần Thị Bình"), "SBD phiếu 1 khớp Trần Thị Bình theo số thứ tự");
assert(await c2.getByTestId("s-pick").isVisible(), "phiếu 2 (SBD 000009) không khớp → ô chọn tay tô nổi");
await page.locator(".pg-doubt").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: "/tmp/p7-4-o-nghi-van.png", clip: (await c1.boundingBox()) ?? undefined });

// GV sửa nghi vấn theo đáp án thật (tô 2 ô → chọn ô đầu; tô mờ → giữ ô đã tô)
const doubtTiles = c1.getByTestId("s-doubt");
for (let i = 0; i < (await doubtTiles.count()); i++) {
  const tile = doubtTiles.nth(i);
  const name = await tile.locator(".h").textContent();
  const no = Number(/Câu (\d+)/.exec(name)?.[1]);
  const want = ans1[no];
  await tile.locator(".pg-opt").nth(typeof want === "number" ? want : 0).click();
}
await c2.getByTestId("s-pick").selectOption({ label: roster.students.find((s) => s.fullName === "Phạm Minh Dũng").seat + " · Phạm Minh Dũng" });
await page.waitForTimeout(300);
assert((await page.getByTestId("s-open").textContent()).trim() === "0", "hết ô nghi vấn sau khi GV sửa");
const saveAll = page.getByTestId("s-save-all");
await saveAll.click();
await saveAll.click({ force: true }).catch(() => {});
await saveAll.click({ force: true }).catch(() => {});
await page.getByTestId("pg-toast").first().waitFor();
await page.waitForTimeout(500);
assert(posts.length === 2, `bấm "Lưu" 3 lần chỉ gửi 2 phiếu (${posts.length} request)`);
await page.screenshot({ path: "/tmp/p7-5-da-luu.png", fullPage: true });

// Độ chính xác: so đáp án đã lưu với đáp án tô thật
const saved = await call("GET", "/api/photo/results?kind=omr");
let groups = 0, wrong = 0;
const cmp = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const [r, ans] of [[saved.find((x) => x.student.includes("Bình")), ans1], [saved.find((x) => x.student.includes("Dũng")), ans2]]) {
  for (const [no, v] of Object.entries(ans)) {
    groups += Array.isArray(v) ? 4 : typeof v === "string" ? 4 : 1;
    const got = r.body.responses[no];
    if (Array.isArray(v)) v.forEach((x, i) => { if (got?.[i] !== x) wrong++; });
    else if (!cmp(got, v)) wrong += typeof v === "string" ? 4 : 1;
  }
}
out.accuracy = { groups, wrong, pct: (1 - wrong / groups) * 100 };
out.saved = saved.map((r) => ({ student: r.student, total: r.total, max: r.max, doubts: r.body.doubts, edited: r.body.edited }));
assert(wrong === 0, `đáp án đã lưu khớp đáp án tô (${groups} nhóm ô, sai ${wrong})`);

// Ghi sổ điểm một chạm (phiếu đã ghép HS)
await page.getByTestId("gb-open").first().click();
await page.getByTestId("gb-go").waitFor();
await page.getByTestId("gb-go").click();
await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="pg-toast"]')].some((t) => t.textContent.includes("Đã ghi")));
await page.screenshot({ path: "/tmp/p7-6-ghi-so-diem.png" });

// ---------- Bài viết tay qua cổng AI thật ----------
const hw = await ctx.newPage();
await hw.setViewportSize({ width: 900, height: 700 });
await hw.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=block&subset=vietnamese" rel="stylesheet">
<style>body{margin:0;background:#fbfaf4} .p{width:860px;padding:30px 40px;font:32px/52px 'Patrick Hand',cursive;color:#1d2a6b;
background-image:repeating-linear-gradient(transparent 0 51px,#b9c6e6 51px 52px);transform:rotate(-1.2deg)} .p i{font-style:normal;letter-spacing:1px}</style></head>
<body><div class="p" id="p">Bài làm: Giải phương trình x² − 5x + 6 = 0<br>Ta có Δ = b² − 4ac = 25 − 24 = 1 &gt; 0<br>nên phương trình có hai nghiệm phân biệt:<br><i>x₁ = (5 + 1) / 2 = 3 ;  x₂ = (5 − 1) / 2 = 2</i><br>Vậy tập nghiệm S = {2 ; 3}.</div></body></html>`);
await hw.evaluate(() => document.fonts.ready);
await hw.waitForTimeout(800);
await hw.locator("#p").screenshot({ path: "/tmp/p7-bai-viet-tay.png" });
await hw.close();

await page.getByTestId("tab-viet-tay").click();
await page.getByTestId("e-pick").waitFor();
await page.getByTestId("e-pick").selectOption({ index: 1 });
await page.getByTestId("e-class").selectOption(cls.id);
await page.getByTestId("e-student-pick").waitFor();
await page.getByTestId("e-student-pick").selectOption({ label: `${binh.seat} · Trần Thị Bình` });
await page.getByTestId("e-file").setInputFiles(["/tmp/p7-bai-viet-tay.png"]);
await page.locator(".pg-pages img").waitFor();
let t1 = Date.now();
await page.getByTestId("e-transcribe").click();
await page.getByTestId("e-skeleton").waitFor();
await page.screenshot({ path: "/tmp/p7-7-dang-phien-am.png" });
await page.waitForFunction(() => document.querySelector('[data-testid="e-transcript"]')?.value.length > 10, null, { timeout: 180_000 });
out.transcribeMs = Date.now() - t1;
out.transcript = await page.getByTestId("e-transcript").inputValue();
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/p7-8-phien-am.png", fullPage: true });
assert(/2/.test(out.transcript) && /3/.test(out.transcript), "phiên âm có hai nghiệm 2 và 3");
t1 = Date.now();
await page.getByTestId("e-grade").click();
await page.getByTestId("e-criteria").waitFor({ timeout: 180_000 });
out.gradeMs = Date.now() - t1;
out.aiTotal = await page.getByTestId("e-total").textContent();
await page.getByTestId("e-save").scrollIntoViewIfNeeded();
await page.screenshot({ path: "/tmp/p7-9-cham-rubric.png", fullPage: true });
await page.getByTestId("e-save").click();
await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="pg-toast"]')].some((t) => t.textContent.includes("Đã lưu")));
const essays = await call("GET", "/api/photo/results?kind=essay");
out.essay = { student: essays[0]?.student, total: essays[0]?.total, max: essays[0]?.max, criteria: essays[0]?.body.criteria };
assert(essays[0]?.student.includes("Trần Thị Bình"), "bài viết tay lưu đúng HS");
await page.screenshot({ path: "/tmp/p7-10-da-duyet.png" });

// Di động 390 px: không tràn ngang
// Khung cũ chưa co giãn (UI v2 làm lại Shell): ẩn thanh bên để đo riêng trang này ở bề rộng điện thoại.
await page.addStyleTag({ content: "aside{display:none!important}.app{grid-template-columns:1fr!important}main{padding:6px 12px!important}.top{padding:12px!important}" });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByTestId("tab-quet").click();
await page.waitForTimeout(400);
out.overflowX = await page.evaluate(() => document.querySelector(".pg").scrollWidth - document.querySelector(".pg").clientWidth);
await page.screenshot({ path: "/tmp/p7-11-di-dong.png" });

writeFileSync("/tmp/p7-e2e.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
