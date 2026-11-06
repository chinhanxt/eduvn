// Smoke E2E: Keycloak + Postgres + server :4310 + vite :5173 đang chạy.
import { readFile } from "node:fs/promises";
import ExcelJS from "../../server/node_modules/exceljs/excel.js";
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
page.on("dialog", (d) => void d.accept());
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
  assert((await page.locator(".tools .tool").count()) >= 12, "trang chủ có đủ ô công cụ (12)");
  for (const href of ["/giao-an", "/tro-choi", "/van-ban", "/so-diem"]) assert((await page.locator(`.tools a[href="${href}"]`).count()) === 1, `ô công cụ ${href}`);
  const lastNav = page.locator("aside nav a").last();
  await lastNav.scrollIntoViewIfNeeded();
  const nb = await lastNav.boundingBox();
  assert(nb && nb.y + nb.height <= 800, "sidebar: mục cuối nằm trong màn 1280x800");

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

  // P4 — ô công thức trong ngân hàng
  await page.getByTestId("q-topic").fill(`Thiết diện ${topic}`);
  await page.getByTestId("q-stem").click();
  await page.keyboard.type("Cho hàm số ");
  await page.keyboard.type("$");
  await page.waitForSelector("[data-testid=math-kb].on");
  assert(true, "gõ $ mở ô công thức + bàn phím toán");
  await page.keyboard.type("x^2"); // MathLive tự thoát số mũ sau 1 chữ số
  await page.keyboard.type("-3");
  await shot("cong-thuc");
  await page.getByTestId("kb-done").click();
  await page.keyboard.type(" có đỉnh là");
  for (let k = 0; k < 4; k++) await page.getByTestId(`q-opt-${k}`).fill(`Điểm ${"ABCD"[k]}`);
  await page.getByLabel("Đáp án A").check();
  await page.getByTestId("q-save").click();
  await page.waitForFunction(() => [...document.querySelectorAll("[data-testid=q-table] .me-tex")].length > 0);
  assert(true, "câu hỏi có công thức hiển thị dạng toán trong bảng");
  await shot("cong-thuc-bang");

  // P4 — bảng giảng
  const apiPost = (url, body) => page.evaluate(async ([url, body]) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    const r = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  }, [url, body]);
  const tdTopic = `Thiết diện ${Date.now() % 1000}`;
  for (let k = 0; k < 4; k++) {
    const r = await apiPost("/api/questions", { type: "mcq", subject: "Toán", grade: 11, topic: tdTopic, level: "TH", tags: [], stem: `Thiết diện của hình lập phương cắt bởi $(MNP)$ — câu ${k + 1}`, options: ["Tam giác", "Tứ giác", "Ngũ giác", "Lục giác"], answer: 3 });
    assert(r.status === 201, `thêm câu thiết diện ${k + 1}`);
  }
  await page.goto(`${BASE}/bang-giang`);
  await page.waitForSelector("h1");
  await page.getByTestId("bg-new").click();
  await page.getByTestId("bg-title").fill("Ôn tập hình không gian");
  await page.locator("form input[type=number]").fill("11");
  await page.getByTestId("bg-topic").fill(tdTopic);
  await page.getByTestId("bg-create").click();
  await page.waitForSelector("[data-testid=bd-stage]");
  const stage = await page.getByTestId("bd-stage").boundingBox();
  await page.getByTestId("t-pen").click();
  await page.mouse.move(stage.x + 60, stage.y + 60);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(stage.x + 60 + k * 12, stage.y + 60 + Math.sin(k) * 10);
  await page.mouse.up();
  assert((await page.locator(".bd-ink").count()) === 1, "vẽ được 1 nét bút");

  await page.getByTestId("t-graph").click();
  await page.waitForSelector("[data-testid=bd-expr-0]");
  await page.waitForTimeout(600); // chờ math-field gắn xong rồi mới gõ
  await page.locator("[data-testid=bd-expr-0]").click();
  await page.keyboard.type("y=x^2");
  await page.keyboard.type("-3");
  await page.getByTestId("bd-graph-ok").click();
  await page.waitForSelector("[data-testid=bd-graph] .bd-curve");
  assert(true, "vẽ đồ thị y = x² − 3");

  await page.getByTestId("t-solid").click();
  await page.getByTestId("bd-lib-cube").click();
  await page.waitForSelector("[data-testid=bd-solid]");
  await page.getByTestId("bd-m-cut").click();
  for (const p of ["A", "C", "C'"]) await page.locator(`[data-pt="${p}"] .bd-hit`).click({ force: true }); // chấm đỉnh nằm trên vùng bấm; bấm thật vẫn nổi bọt về <g>
  await page.waitForFunction(() => document.querySelector("[data-testid=bd-info]")?.textContent?.includes("hình chữ nhật"));
  assert(true, "cắt lập phương qua A, C, C' → hình chữ nhật");
  await shot("bang-giang");

  await page.getByTestId("t-suggest").click();
  await page.waitForSelector("[data-testid=bd-q]");
  assert((await page.getByTestId("bd-q").count()) >= 1, "gợi ý bài liên quan có câu");
  await page.getByTestId("bd-show").first().click();
  await page.getByTestId("bd-reveal").click();
  await page.waitForSelector("[data-testid=bd-proj] .bd-po.right");
  assert(true, "chiếu câu + hiện đáp án");
  await shot("bang-giang-chieu");
  await page.locator("[data-testid=bd-proj] .xbtn").click();

  await page.getByTestId("bd-save").click();
  await page.waitForFunction(() => document.querySelector("[data-testid=bd-state]")?.textContent === "Đã lưu");
  await page.reload();
  await page.waitForSelector("[data-testid=bd-solid]");
  assert((await page.locator(".bd-ink").count()) === 1 && (await page.getByTestId("bd-graph").count()) === 1, "lưu và mở lại bài giảng còn nguyên");

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
  await cell.getByTestId("cell-yccd").fill("Nhận biết được mệnh đề và mệnh đề phủ định");
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

  // Ma trận + đặc tả (F5)
  const [dlm] = await Promise.all([page.waitForEvent("download"), page.getByTestId("dl-matrix").first().click()]);
  await dlm.saveAs("/tmp/eduvn-ma-tran.docx");
  assert((await readFile("/tmp/eduvn-ma-tran.docx")).subarray(0, 2).toString() === "PK" && dlm.suggestedFilename().startsWith("ma-tran-"), `tải ma trận ${dlm.suggestedFilename()}`);

  // Giáo án (F4): AI gửi qua API, GV xem và tải trên web
  const step = { assign: "GV chiếu tình huống và giao nhiệm vụ.", perform: "HS làm việc theo cặp.", report: "Đại diện cặp trình bày.", conclude: "GV nhận xét và chốt kiến thức." };
  const act = (name) => ({ name, goal: "HS nêu được khái niệm mệnh đề.", content: "Thảo luận cặp đôi với phiếu học tập.", product: "Phiếu học tập hoàn chỉnh.", steps: step });
  const lessonTitle = `Mệnh đề ${Date.now() % 1000}`;
  const plan = {
    header: { school: "THPT Nguyễn Huệ", teacher: "Cô Lan", subject: "Toán", grade: 10, title: lessonTitle, periods: 2 },
    objectives: { knowledge: ["Nêu được khái niệm mệnh đề, mệnh đề phủ định."], competencies: { general: ["Tự chủ và tự học"], specific: ["Tư duy và lập luận toán học"] }, qualities: ["Chăm chỉ, trung thực"] },
    materials: ["Máy chiếu", "Phiếu học tập"],
    activities: [act("Khởi động"), { subs: [act("Khái niệm"), act("Ví dụ")] }, act("Luyện tập"), act("Vận dụng")],
  };
  const post = (body) => page.evaluate(async (body) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    const r = await fetch("/api/lessons", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  }, body);
  const bad = await post({ ...plan, objectives: { ...plan.objectives, qualities: [] } });
  assert(bad.status === 400 && bad.body.issues.some((i) => i.includes("Phẩm chất")), "giáo án thiếu phẩm chất bị từ chối");
  assert((await post(plan)).status === 201, "lưu giáo án");
  await page.goto(`${BASE}/giao-an`);
  await page.waitForSelector("[data-testid=lesson-card]");
  await shot("giao-an");
  await page.locator("[data-testid=lesson-card]", { hasText: lessonTitle }).click();
  await page.waitForSelector("[data-testid=lesson-view]");
  assert((await page.getByTestId("lesson-activity").count()) === 4, "giáo án hiển thị đủ 4 hoạt động");
  await shot("giao-an-chi-tiet");
  const [dll] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-lesson").click()]);
  await dll.saveAs("/tmp/eduvn-giao-an.docx");
  assert((await readFile("/tmp/eduvn-giao-an.docx")).subarray(0, 2).toString() === "PK", `tải giáo án ${dll.suggestedFilename()}`);

  // Văn bản hành chính (F6)
  const vb = {
    loai: "ke_hoach", co_quan_chu_quan: "SỞ GD&ĐT TP. HỒ CHÍ MINH", co_quan_ban_hanh: "TRƯỜNG THPT NGUYỄN DU", ky_hieu_co_quan: "THPTND", so: 45, dia_danh: "TP. Hồ Chí Minh", ngay: "2026-11-05",
    trich_yeu: `Tổ chức Hội thi Olympic Toán học ${Date.now() % 1000}`,
    can_cu: ["Căn cứ Kế hoạch giáo dục nhà trường năm học 2026–2027"],
    noi_dung: ["Trường THPT Nguyễn Du xây dựng kế hoạch như sau:", { cap: 1, tieu_de: "Mục đích, yêu cầu" }, { danh_sach: ["Tổ chức nghiêm túc", "An toàn, tiết kiệm"] }],
    noi_nhan: ["Sở GD&ĐT (để báo cáo)", "Các tổ chuyên môn"], chuc_vu_ky: "HIỆU TRƯỞNG", nguoi_ky: "Nguyễn Văn An",
  };
  const postVb = (body) => page.evaluate(async (body) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    const r = await fetch("/api/van-ban", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  }, body);
  const badVb = await postVb({ ...vb, noi_nhan: [] });
  assert(badVb.status === 400 && badVb.body.issues.some((i) => i.includes("nơi nhận")), "văn bản thiếu nơi nhận bị từ chối");
  assert((await postVb(vb)).status === 201, "lưu văn bản");
  await page.goto(`${BASE}/van-ban`);
  await page.waitForSelector("[data-testid=vb-row]");
  await shot("van-ban");
  const [dlv] = await Promise.all([page.waitForEvent("download"), page.locator("[data-testid=vb-row]", { hasText: vb.trich_yeu }).getByTestId("vb-download").click()]);
  await dlv.saveAs("/tmp/eduvn-van-ban.docx");
  assert((await readFile("/tmp/eduvn-van-ban.docx")).subarray(0, 2).toString() === "PK", `tải văn bản ${dlv.suggestedFilename()}`);

  // Slide (F7): từ giáo án → tải .pptx
  await page.goto(`${BASE}/slide`);
  await page.waitForSelector("h1");
  await page.getByTestId("slide-from-lesson").click();
  await page.waitForSelector("[data-testid=slide-lesson]");
  await page.getByTestId("slide-lesson").selectOption({ label: `${lessonTitle} · Toán 10` });
  await page.getByTestId("slide-create").click();
  await page.waitForSelector("[data-testid=slide-row]");
  await shot("slide");
  const [dls] = await Promise.all([page.waitForEvent("download"), page.locator("[data-testid=slide-row]").first().getByTestId("slide-download").click()]);
  await dls.saveAs("/tmp/eduvn-slide.pptx");
  assert((await readFile("/tmp/eduvn-slide.pptx")).subarray(0, 2).toString() === "PK" && dls.suggestedFilename().endsWith(".pptx"), `tải slide ${dls.suggestedFilename()}`);

  // Trò chơi (F8): < 4 câu bị từ chối, thêm câu → tạo, mở chơi, tải .html
  const gTopic = `Game ${Date.now() % 100000}`;
  const api = (path, body) => page.evaluate(async ([path, body]) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    const r = await fetch(path, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    return r.status;
  }, [path, body]);
  await page.goto(`${BASE}/tro-choi`);
  await page.waitForSelector("h1");
  await page.getByTestId("new-game").click();
  await page.getByTestId("g-title").fill("Ôn smoke");
  await page.getByTestId("g-subject").fill("Toán");
  await page.getByTestId("g-topic").fill(gTopic);
  await page.getByTestId("g-create").click();
  await page.waitForSelector("[data-testid=game-error]");
  assert(/Cần ít nhất 4 câu/.test(await page.getByTestId("game-error").innerText()), "trò chơi < 4 câu bị từ chối");
  for (let i = 0; i < 4; i++) await api("/api/questions", { subject: "Toán", grade: 10, topic: gTopic, level: "NB", type: "mcq", stem: `Câu ${i + 1}: 1 + ${i} = ?`, options: ["1", "2", "3", "4"], answer: i % 4, explanation: "Cộng đơn giản." });
  await page.getByTestId("g-create").click();
  await page.waitForSelector("[data-testid=game-row]");
  await shot("tro-choi");
  const [popup] = await Promise.all([ctx.waitForEvent("page"), page.getByTestId("game-open").first().click()]);
  await popup.waitForSelector(".opt");
  await popup.locator(".opt").first().click();
  await popup.waitForSelector(".fb");
  assert(true, "mở trò chơi và trả lời một câu");
  await popup.screenshot({ path: SHOT("tro-choi-choi") });
  await popup.close();
  const [dlg] = await Promise.all([page.waitForEvent("download"), page.getByTestId("game-download").first().click()]);
  await dlg.saveAs("/tmp/eduvn-tro-choi.html");
  assert((await readFile("/tmp/eduvn-tro-choi.html", "utf8")).startsWith("<!doctype html>") && dlg.suggestedFilename().endsWith(".html"), `tải trò chơi ${dlg.suggestedFilename()}`);

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
  const [t, max] = total.split("/").map((x) => parseFloat(x.trim().replace(",", ".")));
  assert(t > 0 && t === max, `chấm đúng hết: ${total.replace(/\s+/g, " ")}`);
  await shot("cham-bai");

  // Lớp & học viên (F1)
  const cname = `10A${Date.now() % 1000}`;
  await page.goto(`${BASE}/lop-hoc`);
  await page.waitForSelector("h1");
  await page.getByTestId("new-class").click();
  await page.getByTestId("c-name").fill(cname);
  await page.getByTestId("c-subject").fill("Toán");
  await page.getByTestId("c-save").click();
  await page.locator("[data-testid=class-card]", { hasText: cname }).click();
  await page.waitForSelector("h1 >> text=" + cname);
  const classId = page.url().split("/").pop();
  await page.getByTestId("paste-toggle").click();
  await page.getByTestId("paste-text").fill("Nguyễn Văn An;05/03/2010;Nam\nTrần Thị Bình;12/11/2010;Nữ\nLê Văn Cường\nNguyễn Văn An;01/01/2011;Nam");
  await page.getByTestId("paste-save").click();
  await page.waitForSelector("[data-testid=warnings]");
  assert(/Trùng tên/.test(await page.getByTestId("warnings").innerText()), "dán danh sách: cảnh báo trùng tên");
  const xl = new ExcelJS.Workbook();
  const sh = xl.addWorksheet("DS");
  sh.addRow(["Danh sách"]);
  sh.addRow(["STT", "Họ và tên", "Ngày sinh", "Giới tính"]);
  sh.addRow([1, "Phạm Thị Dung", "20/09/2010", "Nữ"]);
  await xl.xlsx.writeFile("/tmp/eduvn-smoke-ds.xlsx");
  await page.getByTestId("upload-input").setInputFiles("/tmp/eduvn-smoke-ds.xlsx");
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=student-table] tbody tr").length === 5);
  assert(true, "tải Excel: đủ 5 học viên (4 dán + 1 Excel)");
  await shot("lop-hoc");
  const [dl1] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-list").click()]);
  await dl1.saveAs("/tmp/eduvn-danh-sach-lop.xlsx");
  assert((await readFile("/tmp/eduvn-danh-sach-lop.xlsx")).subarray(0, 2).toString() === "PK", `xuất danh sách ${dl1.suggestedFilename()}`);

  // Sổ điểm (F2 + F3)
  await page.goto(`${BASE}/so-diem?lop=${classId}`);
  await page.waitForSelector("[data-testid=score-grid]");
  for (const [col, v] of [["TX1", "8,5"], ["TX2", "9"], ["TX3", "7"], ["GK", "8"], ["CK", "9"]]) {
    await page.getByTestId(`sc-0-${col}`).fill(v);
    await page.getByTestId(`sc-0-${col}`).press("Enter");
    await page.waitForLoadState("networkidle");
  }
  await page.waitForFunction(() => document.querySelector("[data-testid=dtb-0]")?.textContent === "8,4");
  assert(true, "nhập 5 cột điểm → ĐTB 8,4");
  await page.getByTestId("sc-1-GK").fill("11");
  await page.getByTestId("sc-1-GK").press("Enter");
  await page.waitForSelector(".err");
  assert(/ngoài thang/.test(await page.locator(".err").innerText()), "điểm 11 bị từ chối");
  await page.getByTestId("term-HK2").click();
  await page.waitForFunction(() => document.querySelector("[data-testid=dtb-0]")?.textContent === "");
  assert(true, "HK2 độc lập với HK1 (ĐTB trống)");
  await page.getByTestId("term-HK1").click();
  await page.waitForFunction(() => document.querySelector("[data-testid=dtb-0]")?.textContent === "8,4");
  assert(true, "quay lại HK1: ĐTB vẫn 8,4");
  await shot("so-diem");
  await page.getByTestId("tab-diem-danh").click();
  await page.waitForSelector("[data-testid=att-table]");
  await page.getByTestId("att-0").selectOption("present");
  await page.getByTestId("att-1").selectOption("excused");
  await page.getByTestId("att-2").selectOption("unexcused");
  await page.getByTestId("att-save").click();
  await page.waitForSelector("text=Đã lưu");
  await shot("so-diem-diem-danh");
  await page.getByTestId("tab-nhan-xet").click();
  await page.waitForSelector("[data-testid=cm-table]");
  await page.getByTestId("cm-0").fill("ngắn");
  await page.getByTestId("cm-save").click();
  await page.waitForSelector(".err");
  assert(/quá ngắn/.test(await page.locator(".err").innerText()), "nhận xét quá ngắn bị từ chối");
  await page.getByTestId("cm-0").fill("Em học chăm chỉ, tích cực phát biểu, cần cẩn thận hơn khi trình bày bài.");
  await page.getByTestId("lv-0").selectOption("Tốt");
  await page.getByTestId("cm-save").click();
  await page.waitForSelector("text=Đã lưu");
  await shot("so-diem-nhan-xet");
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-gb").click()]);
  await dl2.saveAs("/tmp/eduvn-so-diem.xlsx");
  assert((await readFile("/tmp/eduvn-so-diem.xlsx")).subarray(0, 2).toString() === "PK", `xuất sổ điểm ${dl2.suggestedFilename()}`);

  // Các trang còn lại
  await go("/", "home");
  await go("/ket-noi", "ket-noi");
  assert((await page.getByTestId("mcp-url").innerText()).endsWith("/mcp"), "trang Kết nối có URL MCP");
  for (const [p, n] of [["/slide", "slide"], ["/video", "video"], ["/giao-trinh", "giao-trinh"], ["/gia-su", "gia-su"], ["/to-chuc", "to-chuc"]]) await go(p, n);
  console.log("SMOKE PASS");
} catch (e) {
  await page.screenshot({ path: SHOT("FAIL") }).catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
