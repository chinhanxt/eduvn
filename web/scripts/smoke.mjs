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
