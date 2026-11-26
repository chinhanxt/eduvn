// Server thử UI v2 (không Docker): PGlite + Keycloak giả + dữ liệu mẫu theo thế giới mẫu (docs/demo/the-gioi-mau.md):
// Trường Liên cấp Bình Minh, GV đăng nhập là cô Lê Thu Hà; lớp 10A1, 11A3, 8A2, KTPM K23; câu hỏi, bài tập, điểm đủ các môn.
// Chạy: PORT=4325 OUT=/tmp/eduvn-demo pnpm --filter @eduvn/server exec tsx scripts/serve-demo-v2.ts
// Ghi ra $OUT/gv-token.txt (access token GV "Cô Lê Thu Hà"), $OUT/hs-session.json (phiên mã lớp của HS "Nguyễn Minh Anh", 10A1)
// và $OUT/hs-token.txt (tài khoản của Minh Anh, đã liên kết với thẻ lớp: gia sư, luyện tập, thẻ ôn).
// "Dùng thử nhanh" trên /dang-nhap: GET /api/demo/vao-thu (có route = đang chạy server demo), POST {vai: "gv" | "hs"} → token/phiên mới.
// Lịch sử (bài cũ, chuỗi ngày học) được tạo bằng cách làm bài thật qua API rồi lùi mốc thời gian trong DB; thẻ ôn ghi thẳng vào DB.
import { mkdirSync, writeFileSync } from "node:fs";
import { eq, inArray, sql } from "drizzle-orm";
import { assignments, organizations, questions, students, submissions, tutorReviewEvents, tutorReviewState } from "../src/db/schema";
import { addMember, ensureUser } from "../src/db/repo";
import { type Headers, bearerOf, call, issueAll, loginStudent } from "../tests/helpers/classroom";
import { createVerifier } from "../src/auth/verify";
import { buildApp } from "../src/http/app";
import { testDb } from "../tests/helpers/db";
import { AUDIENCE, ISSUER, makeIssuer } from "../tests/helpers/tokens";
import { essay, mcq, short } from "../tests/helpers/fixtures";
import { lessonPlan } from "../tests/helpers/lesson";

const port = Number(process.env.PORT ?? 4325);
const out = process.env.OUT ?? "/tmp/eduvn-demo";
mkdirSync(out, { recursive: true });
const db = await testDb();
const kc = await makeIssuer();
const app = buildApp({
  db,
  verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
  issuer: ISSUER,
  publicUrl: `http://127.0.0.1:${port}`,
  downloadSecret: "demo-secret-demo-secret-demo-secret!!",
  studentSecret: "demo-student-secret-demo-student-secret",
  studentRateLimit: { max: 100_000, timeWindow: 60_000 },
});
// token sống 12 giờ (đủ cho một buổi chụp ảnh/đo)
const t = { app, db, sign: (claims: Record<string, unknown>) => kc.sign(claims, { exp: "12h" }) };
const ok = <R extends { statusCode: number; body: string }>(r: R, what: string): R => {
  if (r.statusCode >= 300) throw new Error(`${what}: ${r.statusCode} ${r.body.slice(0, 300)}`);
  return r;
};

// ---------- Tài khoản demo (thế giới mẫu) ----------
const GV = { sub: "gv-1", name: "Cô Lê Thu Hà", email: "ha.lt@binhminh.edu.vn" };
const HS = { sub: "hs-minh-anh", name: "Nguyễn Minh Anh", email: "minhanh.10a1@binhminh.edu.vn" };

// ---------- "Dùng thử nhanh" (chỉ có khi chạy server demo; phải đăng ký trước lần inject đầu tiên) ----------
// Mỗi lần bấm ký token/phiên mới, nên trang demo để chạy lâu vẫn vào được.
let demoLogin: { classCode: string; seat: number; pin: string } | null = null;
app.get("/api/demo/vao-thu", async (_req, reply) =>
  demoLogin ? { vai: ["gv", "hs"], gv: "Cô Lê Thu Hà · Toán", hs: "Nguyễn Minh Anh · 10A1" } : reply.code(503).send({ error: "Đang dựng dữ liệu mẫu" }),
);
app.post("/api/demo/vao-thu", async (req, reply) => {
  const vai = (req.body as { vai?: unknown } | null)?.vai;
  if (!demoLogin) return reply.code(503).send({ error: "Đang dựng dữ liệu mẫu" });
  if (vai === "gv") return { token: await t.sign(GV), name: "Lê Thu Hà" };
  if (vai === "hs") {
    const s = ok(await call(t, "POST", "/api/student/session", {}, demoLogin), "hs login").json();
    return { session: s, token: await t.sign(HS), name: HS.name };
  }
  return reply.code(400).send({ error: "vai phải là gv hoặc hs" });
});

const gv = bearerOf(await t.sign(GV));
const me = ok(await call(t, "GET", "/api/me", gv), "me").json() as { org: { id: string } };
const orgId = me.org.id;
await db.update(organizations).set({ name: "Trường Liên cấp Bình Minh" }).where(eq(organizations.id, orgId));

// ---------- Ngân hàng câu hỏi: mọi môn của thế giới mẫu ----------
type M = [stem: string, options: string[], answer: number];
type Topic = { subject: string; grade: number; topic: string; mcq: M[]; short?: [string, string][]; essay?: [string, string, number][] };
const BANK: Topic[] = [
  // Toán 10 (cô Hà, 10A1). Ví dụ đời thực dùng chung: quầy nước chanh, lãi −x² + 6x − 5 (trăm nghìn), có lãi khi 1 < x < 5.
  { subject: "Toán", grade: 10, topic: "Dấu tam thức", mcq: [
    ["Tam thức f(x) = x² − 5x + 6 âm khi nào?", ["2 < x < 3", "x < 2", "x > 3", "x < 2 hoặc x > 3"], 0],
    ["Tam thức f(x) = −x² + 4x − 3 dương khi nào?", ["1 < x < 3", "x < 1", "x > 3", "Với mọi x"], 0],
    ["Biệt thức Δ của f(x) = x² + x + 1 bằng", ["−3", "3", "5", "−5"], 0],
    ["f(x) = x² + 2x + 1 không dương khi", ["x = −1", "x > −1", "x < −1", "Với mọi x"], 0],
  ], short: [["Tìm số nguyên m nhỏ nhất để x² − 2x + m > 0 với mọi x.", "2"], ["Tam thức x² − 6x + 5 có mấy nghiệm dương?", "2"]],
  essay: [["Xét dấu tam thức f(x) = −x² + 6x − 5.", "Tìm đúng hai nghiệm (0,5đ); lập bảng xét dấu đúng (0,5đ).", 1], ["Lập bảng xét dấu của f(x) = 2x² − 3x − 2.", "Nghiệm −1/2 và 2 (0,5đ); bảng xét dấu (0,5đ).", 1]] },
  { subject: "Toán", grade: 10, topic: "Bất phương trình bậc hai", mcq: [
    ["Tập nghiệm của x² − 4 ≥ 0 là", ["(−∞; −2] ∪ [2; +∞)", "[−2; 2]", "(−2; 2)", "[2; +∞)"], 0],
    ["Quầy nước chanh bán x chục cốc thì lãi −x² + 6x − 5 (trăm nghìn). Quầy có lãi khi", ["1 < x < 5", "x < 1 hoặc x > 5", "1 ≤ x ≤ 5", "x > 5"], 0],
    ["Bất phương trình x² + x + 1 < 0 có tập nghiệm", ["∅", "ℝ", "(−1; 0)", "(0; 1)"], 0],
    ["Tập nghiệm của 2x² − 3x − 2 ≤ 0 là", ["[−1/2; 2]", "(−1/2; 2)", "(−∞; −1/2] ∪ [2; +∞)", "[−2; 1/2]"], 0],
  ], short: [["Quầy nước chanh lãi −x² + 6x − 5 (trăm nghìn) khi bán x chục cốc. Bán nhiều nhất bao nhiêu chục cốc (số nguyên) mà vẫn có lãi?", "4"], ["Bất phương trình x² − 5x + 4 < 0 có bao nhiêu nghiệm nguyên?", "2"]],
  essay: [["Giải bất phương trình −x² + 6x − 5 > 0. Nêu ý nghĩa với quầy nước chanh của lớp.", "Nhân −1 và đổi chiều (0,5đ); tập nghiệm (1; 5) và diễn giải (0,5đ).", 1], ["Giải bất phương trình x² − 3x − 4 ≤ 0.", "Nghiệm −1 và 4 (0,5đ); tập nghiệm [−1; 4] (0,5đ).", 1]] },
  { subject: "Toán", grade: 10, topic: "Hàm số bậc hai", mcq: [
    ["Trục đối xứng của parabol y = x² − 4x + 3 là", ["x = 2", "x = −2", "x = 4", "x = 3"], 0],
    ["Đỉnh của parabol y = −x² + 2x + 3 là", ["(1; 4)", "(−1; 0)", "(1; 3)", "(2; 3)"], 0],
    ["Hàm số y = 2x² − 4x + 1 đồng biến trên", ["(1; +∞)", "(−∞; 1)", "(−∞; 2)", "ℝ"], 0],
    ["Giá trị nhỏ nhất của y = x² − 2x + 5 là", ["4", "5", "1", "−4"], 0],
  ], short: [["Parabol y = x² − 6x + m đi qua điểm (1; 0). Tìm m.", "5"], ["Tung độ đỉnh của parabol y = x² − 2x + 5 bằng bao nhiêu?", "4"]] },
  { subject: "Toán", grade: 10, topic: "Mệnh đề, tập hợp", mcq: [
    ["Câu nào sau đây là mệnh đề?", ["Hà Nội là thủ đô của Việt Nam", "Bạn học lớp mấy?", "Hãy làm bài đi!", "x + 1 > 2"], 0],
    ["Phủ định của mệnh đề “∀x ∈ ℝ, x² ≥ 0” là", ["∃x ∈ ℝ, x² < 0", "∀x ∈ ℝ, x² < 0", "∃x ∈ ℝ, x² ≥ 0", "∀x ∈ ℝ, x² ≤ 0"], 0],
    ["Cho A = {1; 2; 3}, B = {2; 3; 4}. A ∩ B là", ["{2; 3}", "{1; 2; 3; 4}", "{1}", "{4}"], 0],
    ["Số tập con của tập {a; b; c} là", ["8", "6", "3", "9"], 0],
  ] },
  { subject: "Toán", grade: 10, topic: "Tích vô hướng", mcq: [
    ["Cho a⃗ = (1; 2), b⃗ = (3; −1). Tích vô hướng a⃗·b⃗ bằng", ["1", "5", "7", "−1"], 0],
    ["Hai vectơ khác 0⃗ vuông góc khi tích vô hướng của chúng", ["bằng 0", "bằng 1", "âm", "dương"], 0],
    ["Cho |a⃗| = 2, |b⃗| = 3, góc giữa hai vectơ là 60°. a⃗·b⃗ bằng", ["3", "6", "3√3", "−3"], 0],
    ["Cho a⃗ = (2; −1), b⃗ = (1; 2). Góc giữa a⃗ và b⃗ là", ["90°", "60°", "45°", "0°"], 0],
  ], short: [["Cho a⃗ = (3; 4). Độ dài |a⃗| bằng bao nhiêu?", "5"], ["Cho a⃗ = (2; 1), b⃗ = (1; 3). Tính a⃗·b⃗.", "5"]],
  essay: [["Cho tam giác ABC có A(1; 1), B(4; 1), C(1; 5). Chứng minh tam giác vuông tại A.", "Tính hai vectơ (0,5đ); tích vô hướng bằng 0 (0,5đ).", 1], ["Tính góc giữa a⃗ = (1; 1) và b⃗ = (0; 2).", "Công thức cos (0,5đ); góc 45° (0,5đ).", 1]] },
  // Vật lí 10
  { subject: "Vật lí", grade: 10, topic: "Rơi tự do", mcq: [
    ["Gia tốc rơi tự do gần mặt đất thường lấy bằng", ["9,8 m/s²", "8,9 m/s²", "98 m/s²", "0,98 m/s²"], 0],
    ["Thả rơi một vật không vận tốc đầu, sau 2 s vận tốc của vật là (g = 10 m/s²)", ["20 m/s", "10 m/s", "40 m/s", "5 m/s"], 0],
    ["Quãng đường vật rơi tự do trong 3 s đầu là (g = 10 m/s²)", ["45 m", "30 m", "90 m", "15 m"], 0],
    ["Trong ống chân không, lông chim và hòn bi thả cùng lúc sẽ", ["chạm đáy cùng lúc", "hòn bi chạm trước", "lông chim chạm trước", "lông chim không rơi"], 0],
  ], short: [["Vật rơi tự do từ độ cao 20 m (g = 10 m/s²). Thời gian rơi là bao nhiêu giây?", "2"]] },
  { subject: "Vật lí", grade: 10, topic: "Chuyển động thẳng biến đổi đều", mcq: [
    ["Xe tăng tốc từ 0 lên 20 m/s trong 10 s. Gia tốc của xe là", ["2 m/s²", "0,5 m/s²", "20 m/s²", "200 m/s²"], 0],
    ["Đồ thị vận tốc – thời gian của chuyển động nhanh dần đều là", ["đường thẳng xiên góc", "đường thẳng song song trục thời gian", "đường parabol", "đường tròn"], 0],
    ["Công thức vận tốc của chuyển động thẳng biến đổi đều là", ["v = v₀ + at", "v = v₀t + at²", "v = at²/2", "v = s/t²"], 0],
    ["Xe đang chạy 10 m/s thì hãm phanh với a = −2 m/s². Sau bao lâu xe dừng?", ["5 s", "2 s", "10 s", "20 s"], 0],
  ] },
  // Hoá học 10 (thầy Long)
  { subject: "Hoá học", grade: 10, topic: "Phản ứng oxi hoá – khử", mcq: [
    ["Chất khử là chất", ["nhường electron", "nhận electron", "không đổi số oxi hoá", "luôn là phi kim"], 0],
    ["Số oxi hoá của S trong H₂SO₄ là", ["+6", "+4", "−2", "0"], 0],
    ["Trong phản ứng Zn + CuSO₄ → ZnSO₄ + Cu, chất bị oxi hoá là", ["Zn", "Cu²⁺", "SO₄²⁻", "Cu"], 0],
    ["Số oxi hoá của Mn trong KMnO₄ là", ["+7", "+6", "+4", "+2"], 0],
  ], short: [["Trong phản ứng 2Na + Cl₂ → 2NaCl, mỗi nguyên tử Na nhường mấy electron?", "1"]] },
  { subject: "Hoá học", grade: 10, topic: "Liên kết cộng hoá trị", mcq: [
    ["Liên kết trong phân tử H₂ là", ["cộng hoá trị không cực", "ion", "cộng hoá trị có cực", "kim loại"], 0],
    ["Giữa hai nguyên tử N trong phân tử N₂ có", ["liên kết ba", "liên kết đơn", "liên kết đôi", "liên kết ion"], 0],
    ["Liên kết trong phân tử HCl là", ["cộng hoá trị có cực", "ion", "cộng hoá trị không cực", "kim loại"], 0],
    ["Phân tử nào có liên kết đôi?", ["O₂", "H₂", "Cl₂", "HCl"], 0],
  ] },
  // Sinh học 10
  { subject: "Sinh học", grade: 10, topic: "Cấu trúc tế bào", mcq: [
    ["Bào quan tổng hợp protein là", ["ribosome", "ti thể", "lục lạp", "lysosome"], 0],
    ["Tế bào nhân sơ không có", ["màng nhân", "ribosome", "màng sinh chất", "tế bào chất"], 0],
    ["Bào quan cung cấp năng lượng chủ yếu cho tế bào là", ["ti thể", "bộ máy Golgi", "không bào", "trung thể"], 0],
    ["Thành tế bào thực vật cấu tạo chủ yếu từ", ["cellulose", "peptidoglycan", "chitin", "protein"], 0],
  ] },
  // Lịch sử 10
  { subject: "Lịch sử", grade: 10, topic: "Văn minh Đại Việt", mcq: [
    ["Bộ luật thành văn tiêu biểu thời Lê sơ là", ["Quốc triều hình luật", "Hình thư", "Hoàng Việt luật lệ", "Bình Ngô đại cáo"], 0],
    ["Văn Miếu được xây dựng năm 1070 dưới triều", ["Lý", "Trần", "Lê sơ", "Nguyễn"], 0],
    ["Chữ Nôm được dùng để", ["ghi tiếng Việt", "ghi tiếng Hán", "ghi tiếng Phạn", "thay chữ Quốc ngữ"], 0],
    ["Lý Công Uẩn dời đô ra Thăng Long năm", ["1010", "938", "1070", "1428"], 0],
  ] },
  // Địa lí 10
  { subject: "Địa lí", grade: 10, topic: "Khí quyển", mcq: [
    ["Tầng khí quyển sát mặt đất là", ["tầng đối lưu", "tầng bình lưu", "tầng giữa", "tầng nhiệt"], 0],
    ["Tầng ô-dôn tập trung chủ yếu ở", ["tầng bình lưu", "tầng đối lưu", "tầng nhiệt", "tầng ngoài"], 0],
    ["Gió Tín phong thổi từ", ["áp cao cận chí tuyến về xích đạo", "xích đạo về cực", "cực về ôn đới", "ôn đới về chí tuyến"], 0],
    ["Lên cao trong tầng đối lưu, nhiệt độ không khí", ["giảm dần", "tăng dần", "không đổi", "tăng rồi giảm"], 0],
  ] },
  // Tiếng Anh 10 (thầy Minh)
  { subject: "Tiếng Anh", grade: 10, topic: "Câu bị động", mcq: [
    ["The letter ___ yesterday.", ["was sent", "sent", "is sent", "has sent"], 0],
    ["English ___ in many countries.", ["is spoken", "speaks", "spoke", "is speaking"], 0],
    ["The new bridge ___ next year.", ["will be built", "will build", "is built", "built"], 0],
    ["This song ___ by millions of people.", ["has been heard", "has heard", "have been heard", "hears"], 0],
  ] },
  { subject: "Tiếng Anh", grade: 10, topic: "Thì hiện tại hoàn thành", mcq: [
    ["I ___ here since 2020.", ["have lived", "lived", "live", "am living"], 0],
    ["She ___ her homework yet.", ["hasn't finished", "didn't finish", "doesn't finish", "not finished"], 0],
    ["___ you ever ___ to Hue?", ["Have / been", "Did / go", "Do / go", "Are / been"], 0],
    ["We ___ three tests this week.", ["have had", "had had", "has had", "having"], 0],
  ] },
  // Tin học 10 (cô Ngọc)
  { subject: "Tin học", grade: 10, topic: "Câu lệnh rẽ nhánh", mcq: [
    ["Trong Python, câu lệnh rẽ nhánh bắt đầu bằng từ khoá", ["if", "for", "while", "def"], 0],
    ["Kết quả của 7 % 3 trong Python là", ["1", "2", "3", "0"], 0],
    ["Biểu thức (5 > 3) and (2 > 4) có giá trị", ["False", "True", "5", "Báo lỗi"], 0],
    ["Nhánh chạy khi mọi điều kiện phía trước đều sai là", ["else", "elif", "if", "then"], 0],
  ] },
  // Ngữ văn 10 (10A1) và Ngữ văn 11 (thầy Bảo, 11A3)
  { subject: "Ngữ văn", grade: 10, topic: "Nghị luận xã hội", mcq: [
    ["Đoạn văn nghị luận xã hội cần có", ["luận điểm, lí lẽ và dẫn chứng", "nhân vật và cốt truyện", "vần và nhịp", "lời thoại"], 0],
    ["Câu nêu luận điểm thường đặt ở", ["đầu đoạn", "giữa đoạn", "cuối bài", "nhan đề"], 0],
  ], essay: [["Viết đoạn văn nghị luận (khoảng 200 chữ) về lòng biết ơn.", "Đủ ý, mạch lạc, có dẫn chứng (2đ).", 2]] },
  { subject: "Ngữ văn", grade: 11, topic: "Đọc hiểu nghị luận", mcq: [
    ["Đoạn văn nêu ý kiến rồi đưa dẫn chứng để làm rõ chủ yếu dùng thao tác", ["chứng minh", "so sánh", "bác bỏ", "bình luận"], 0],
    ["Luận điểm là", ["ý kiến thể hiện quan điểm của người viết", "dẫn chứng cụ thể", "câu mở đoạn", "số liệu thống kê"], 0],
    ["Văn bản nghị luận xã hội bàn về", ["một hiện tượng, vấn đề của đời sống", "một tác phẩm văn học", "một nhân vật hư cấu", "một bài thơ"], 0],
    ["Từ “Tuy nhiên” ở đầu câu thể hiện phép liên kết", ["phép nối", "phép lặp", "phép thế", "phép liên tưởng"], 0],
  ], essay: [["Viết đoạn văn (khoảng 200 chữ) bàn về thói quen đọc sách của người trẻ.", "Luận điểm rõ, lí lẽ và dẫn chứng thuyết phục, mạch lạc (2đ).", 2]] },
  { subject: "Ngữ văn", grade: 11, topic: "Nghị luận về một tư tưởng", mcq: [
    ["Bài nghị luận về một tư tưởng, đạo lí trước hết phải", ["giải thích tư tưởng cần bàn", "kể một câu chuyện", "tả cảnh thiên nhiên", "liệt kê số liệu"], 0],
    ["“Uống nước nhớ nguồn” bàn về", ["lòng biết ơn", "sự chăm chỉ", "tình bạn", "lòng dũng cảm"], 0],
    ["Phần bàn luận mở rộng nhằm", ["xem xét mặt trái và rút bài học", "nhắc lại đề bài", "giới thiệu tác giả", "tóm tắt tác phẩm"], 0],
    ["Dẫn chứng trong văn nghị luận cần", ["tiêu biểu, xác thực", "càng dài càng tốt", "chỉ lấy từ sách giáo khoa", "không cần nguồn"], 0],
  ] },
  // 8A2 (cô Lan): Sinh học 8 và Toán 8
  { subject: "Sinh học", grade: 8, topic: "Quang hợp ở cây xanh", mcq: [
    ["Quang hợp diễn ra chủ yếu ở bộ phận nào của cây?", ["lá", "rễ", "thân", "hoa"], 0],
    ["Sản phẩm của quang hợp gồm", ["glucose và oxygen", "nước và CO₂", "tinh bột và CO₂", "oxygen và nước"], 0],
    ["Chất diệp lục nằm trong", ["lục lạp", "ti thể", "nhân tế bào", "không bào"], 0],
    ["Nguyên liệu của quang hợp là", ["CO₂ và nước", "oxygen và glucose", "tinh bột", "muối khoáng"], 0],
  ], short: [["Thí nghiệm lá khoai lang: phần lá bị che kín có chuyển màu xanh tím với iodine không? (có/không)", "không"]] },
  { subject: "Sinh học", grade: 8, topic: "Hệ tuần hoàn", mcq: [
    ["Tim người có mấy ngăn?", ["4", "2", "3", "5"], 0],
    ["Máu đỏ tươi là máu giàu", ["oxygen", "CO₂", "nitrogen", "glucose"], 0],
    ["Mạch máu dẫn máu từ tim đi khắp cơ thể là", ["động mạch", "tĩnh mạch", "mao mạch", "mạch bạch huyết"], 0],
    ["Tế bào máu tham gia vào quá trình đông máu là", ["tiểu cầu", "hồng cầu", "bạch cầu", "huyết tương"], 0],
  ] },
  { subject: "Toán", grade: 8, topic: "Phân thức đại số", mcq: [
    ["Phân thức x/(x − 1) xác định khi", ["x ≠ 1", "x ≠ 0", "x = 1", "x > 1"], 0],
    ["Rút gọn 2x/(4x²) với x ≠ 0 được", ["1/(2x)", "2x", "x/2", "1/x"], 0],
    ["Phân thức đối của 3/x là", ["−3/x", "x/3", "−x/3", "1/(3x)"], 0],
    ["1/x + 1/x bằng", ["2/x", "1/(2x)", "2/x²", "1/x²"], 0],
  ] },
  // KTPM K23 (TS. Khải): Lập trình — gradeVi(14) = "Năm 2"
  { subject: "Lập trình", grade: 14, topic: "Cây nhị phân tìm kiếm", mcq: [
    ["Duyệt trung thứ tự (inorder) một cây nhị phân tìm kiếm cho dãy khoá", ["tăng dần", "giảm dần", "ngẫu nhiên", "theo từng mức"], 0],
    ["Tìm kiếm trên cây nhị phân tìm kiếm cân bằng có độ phức tạp", ["O(log n)", "O(n)", "O(1)", "O(n log n)"], 0],
    ["Khoá nhỏ nhất của cây nhị phân tìm kiếm nằm ở", ["nút trái cùng", "gốc", "nút phải cùng", "một lá bất kỳ"], 0],
    ["Xoá nút có hai con, ta thay nút đó bằng", ["nút kế tiếp theo trung thứ tự", "nút gốc", "một lá bất kỳ", "nút cha"], 0],
  ], essay: [["Viết hàm Python kiểm tra một cây nhị phân có phải cây nhị phân tìm kiếm không, nêu độ phức tạp.", "Thuật toán đúng (1đ); phân tích độ phức tạp (1đ).", 2]] },
  { subject: "Lập trình", grade: 14, topic: "Đồ thị BFS/DFS", mcq: [
    ["BFS dùng cấu trúc dữ liệu", ["hàng đợi", "ngăn xếp", "heap", "bảng băm"], 0],
    ["DFS cài đặt không đệ quy dùng", ["ngăn xếp", "hàng đợi", "mảng hai chiều", "bảng băm"], 0],
    ["BFS trên đồ thị không trọng số tìm được", ["đường đi ít cạnh nhất", "cây khung nhỏ nhất", "chu trình Euler", "cách tô màu"], 0],
    ["Độ phức tạp của BFS khi dùng danh sách kề là", ["O(V + E)", "O(V²)", "O(E log V)", "O(V·E)"], 0],
  ], short: [["Đồ thị đầy đủ 5 đỉnh có bao nhiêu cạnh?", "10"]] },
];
for (const b of BANK) {
  const base = { subject: b.subject, grade: b.grade, topic: b.topic };
  for (const [stem, options, answer] of b.mcq) ok(await call(t, "POST", "/api/questions", gv, mcq({ ...base, stem, options, answer })), "question");
  for (const [stem, answer] of b.short ?? []) ok(await call(t, "POST", "/api/questions", gv, short({ ...base, stem, answer })), "question");
  for (const [stem, rubric, points] of b.essay ?? []) ok(await call(t, "POST", "/api/questions", gv, essay({ ...base, stem, rubric, points })), "question");
}

// ---------- Đề (ma trận lấy câu từ ngân hàng) ----------
type Cell = { topic: string; type?: "mcq" | "short_answer" | "essay"; count: number };
type Exam = { id: string; key: { no: number; section: string; answer: string }[] };
async function exam(title: string, subject: string, grade: number, cells: Cell[], minutes = 15): Promise<Exam> {
  const matrix = { subject, grade, cells: cells.map((c) => ({ topic: c.topic, level: "NB", type: c.type ?? "mcq", count: c.count })) };
  const r = ok(await call(t, "POST", "/api/exams", gv, { title, variants: 1, durationMinutes: minutes, matrix }), `exam ${title}`);
  const id = r.json().examId as string;
  const key = ok(await call(t, "GET", `/api/exams/${id}/key`, gv), "key").json()[0].entries;
  return { id, key };
}
const E = {
  // Các môn khác của 10A1
  ly: await exam("Bài tập · Rơi tự do", "Vật lí", 10, [{ topic: "Rơi tự do", count: 4 }, { topic: "Rơi tự do", type: "short_answer", count: 1 }, { topic: "Chuyển động thẳng biến đổi đều", count: 3 }]),
  lyCd: await exam("Bài tập · Chuyển động thẳng biến đổi đều", "Vật lí", 10, [{ topic: "Chuyển động thẳng biến đổi đều", count: 4 }, { topic: "Rơi tự do", count: 2 }]),
  hoa: await exam("Kiểm tra 15′ · Oxi hoá – khử", "Hoá học", 10, [{ topic: "Phản ứng oxi hoá – khử", count: 4 }, { topic: "Phản ứng oxi hoá – khử", type: "short_answer", count: 1 }, { topic: "Liên kết cộng hoá trị", count: 3 }]),
  hoaLk: await exam("Bài tập · Liên kết cộng hoá trị", "Hoá học", 10, [{ topic: "Liên kết cộng hoá trị", count: 4 }, { topic: "Phản ứng oxi hoá – khử", count: 2 }]),
  anh: await exam("Luyện tập · Câu bị động", "Tiếng Anh", 10, [{ topic: "Câu bị động", count: 4 }, { topic: "Thì hiện tại hoàn thành", count: 4 }]),
  anhHt: await exam("Luyện tập · Thì hiện tại hoàn thành", "Tiếng Anh", 10, [{ topic: "Thì hiện tại hoàn thành", count: 4 }, { topic: "Câu bị động", count: 2 }]),
  sinh10: await exam("Ôn nhanh · Cấu trúc tế bào", "Sinh học", 10, [{ topic: "Cấu trúc tế bào", count: 4 }]),
  su: await exam("Ôn nhanh · Văn minh Đại Việt", "Lịch sử", 10, [{ topic: "Văn minh Đại Việt", count: 4 }]),
  dia: await exam("Ôn nhanh · Khí quyển", "Địa lí", 10, [{ topic: "Khí quyển", count: 4 }]),
  tin: await exam("Luyện tập · Câu lệnh rẽ nhánh", "Tin học", 10, [{ topic: "Câu lệnh rẽ nhánh", count: 4 }]),
  van10: await exam("Đoạn văn nghị luận · 200 chữ", "Ngữ văn", 10, [{ topic: "Nghị luận xã hội", count: 2 }, { topic: "Nghị luận xã hội", type: "essay", count: 1 }], 45),
  // 11A3
  van11: await exam("Bài tập · Nghị luận về một tư tưởng", "Ngữ văn", 11, [{ topic: "Nghị luận về một tư tưởng", count: 4 }, { topic: "Đọc hiểu nghị luận", count: 4 }]),
  van11kt: await exam("Kiểm tra 15′ · Đọc hiểu nghị luận", "Ngữ văn", 11, [{ topic: "Đọc hiểu nghị luận", count: 4 }, { topic: "Đọc hiểu nghị luận", type: "essay", count: 1 }]),
  // 8A2
  quangHop: await exam("Bài tập · Quang hợp ở cây xanh", "Sinh học", 8, [{ topic: "Quang hợp ở cây xanh", count: 4 }, { topic: "Quang hợp ở cây xanh", type: "short_answer", count: 1 }]),
  tuanHoan: await exam("Bài tập · Hệ tuần hoàn", "Sinh học", 8, [{ topic: "Hệ tuần hoàn", count: 4 }, { topic: "Quang hợp ở cây xanh", count: 2 }]),
  phanThuc: await exam("Luyện tập · Phân thức đại số", "Toán", 8, [{ topic: "Phân thức đại số", count: 4 }]),
  // KTPM K23
  bst: await exam("Bài tập · Cây nhị phân tìm kiếm", "Lập trình", 14, [{ topic: "Cây nhị phân tìm kiếm", count: 4 }, { topic: "Cây nhị phân tìm kiếm", type: "essay", count: 1 }], 45),
  bfs: await exam("Luyện tập · Đồ thị BFS/DFS", "Lập trình", 14, [{ topic: "Đồ thị BFS/DFS", count: 4 }, { topic: "Đồ thị BFS/DFS", type: "short_answer", count: 1 }, { topic: "Cây nhị phân tìm kiếm", count: 2 }]),
  // Toán 10 (tạo sau cùng: đề mới nhất là đề mặc định ở Đấu trường, Trò chơi)
  kt15: await exam("Kiểm tra 15′ · Bất phương trình bậc hai", "Toán", 10, [
    { topic: "Dấu tam thức", count: 3 }, { topic: "Bất phương trình bậc hai", count: 3 },
    { topic: "Bất phương trình bậc hai", type: "short_answer", count: 2 }, { topic: "Dấu tam thức", type: "essay", count: 2 },
  ]),
  luyen: await exam("Luyện tập · Hàm số bậc hai", "Toán", 10, [
    { topic: "Hàm số bậc hai", count: 4 }, { topic: "Dấu tam thức", count: 4 },
    { topic: "Hàm số bậc hai", type: "short_answer", count: 2 }, { topic: "Mệnh đề, tập hợp", count: 2 },
  ]),
  tichVoHuong: await exam("Kiểm tra 15′ · Tích vô hướng", "Toán", 10, [
    { topic: "Tích vô hướng", count: 4 }, { topic: "Tích vô hướng", type: "short_answer", count: 2 }, { topic: "Tích vô hướng", type: "essay", count: 1 },
  ]),
  toanNho: await exam("Ôn nhanh · Bất phương trình bậc hai", "Toán", 10, [{ topic: "Bất phương trình bậc hai", count: 4 }, { topic: "Dấu tam thức", count: 4 }]),
};

/** Bài làm: mỗi câu đúng với xác suất p (giả ngẫu nhiên ổn định theo seed). */
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
function answers(key: Exam["key"], p: number, upTo = Infinity) {
  const a: Record<string, unknown> = {};
  for (const e of key) {
    if (e.no > upTo) continue;
    const right = rnd() < p;
    if (e.section === "mcq") a[String(e.no)] = right ? "ABCD".indexOf(e.answer) : ("ABCD".indexOf(e.answer) + 1) % 4;
    else if (e.section === "short_answer") a[String(e.no)] = right ? e.answer : "0";
    else if (e.section === "essay") a[String(e.no)] = "Bài làm tự luận của em.";
  }
  return a;
}

// ---------- Lớp (danh sách theo thế giới mẫu; 10A1 mở đầu bằng 10 em đầu sổ) ----------
type Klass = { id: string; name: string; hs: Headers[]; cards: Awaited<ReturnType<typeof issueAll>>["cards"]; classCode: string };
async function klass(name: string, subject: string, names: string[]): Promise<Klass> {
  const c = ok(await call(t, "POST", "/api/classes", gv, { name, schoolYear: "2026-2027", subject }), "class").json().id as string;
  ok(await call(t, "POST", `/api/classes/${c}/students`, gv, { text: names.join("\n") }), "students");
  const { classCode, cards } = await issueAll(t, gv, c);
  const hs = await Promise.all(cards.map((k) => loginStudent(t, classCode, k)));
  return { id: c, name, hs, cards, classCode };
}
const c10a1 = await klass("10A1", "Toán 10", [
  "Nguyễn Minh Anh", "Trần Khánh Duy", "Đỗ Đức Thịnh", "Lê Bảo Châu", "Hoàng Gia Hân", "Vũ Quốc Huy", "Đặng Thu Trang",
  "Bùi Nhật Nam", "Đỗ Khánh Linh", "Ngô Tuấn Kiệt", "Phan Minh Khoa", "Trịnh Ngọc Diệp", "Lý Hải Yến", "Cao Đức Mạnh",
]);
const c11a3 = await klass("11A3", "Ngữ văn 11", [
  "Nguyễn Hoàng Long", "Trần Thu Uyên", "Lê Minh Quân", "Phạm Ngọc Ánh", "Võ Thành Đạt", "Đặng Mai Chi",
  "Hồ Thanh Tâm", "Ngô Phương Linh", "Đinh Tuấn Anh", "Lâm Bảo Ngọc", "Tạ Quốc Việt", "Mai Thùy Dương",
]);
const c8a2 = await klass("8A2", "Sinh học 8", [
  "Lê Thảo Vy", "Nguyễn An Nhiên", "Trần Minh Khang", "Phạm Thu Hằng", "Vũ Đức Anh", "Đỗ Khánh An",
  "Hoàng Bảo Long", "Mai Phương Thảo", "Trương Gia Khánh", "Lương Ngọc Mai",
]);
const cK23 = await klass("KTPM K23", "Lập trình", [
  "Phạm Quang Huy", "Nguyễn Đức Trung", "Trần Hữu Phước", "Lê Hoàng Phúc", "Đào Minh Tú", "Vương Thị Ngọc",
  "Huỳnh Tấn Phát", "Châu Khải Minh", "Kiều Anh Thư", "Tống Việt Hoàng", "Lã Thanh Sơn", "Mạc Hải Đăng",
]);

const vn = (dayOffset: number, hh: number, mm = 0) => {
  const d = new Date(Date.now() + 7 * 3600_000);
  const iso = `${d.toISOString().slice(0, 10)}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+07:00`;
  // chạy demo sau giờ đó: hạn "hôm nay" đã qua thì lùi tới 2 giờ nữa để seed không lỗi
  const t = new Date(iso).getTime() + dayOffset * 86_400_000;
  return new Date(dayOffset >= 0 ? Math.max(t, Date.now() + 2 * 3600_000) : t).toISOString();
};
async function give(cls: { id: string }, ex: { id: string }, title: string, dueAt: string, kind: "practice" | "test" = "practice", extra: Record<string, unknown> = {}) {
  return ok(await call(t, "POST", `/api/classes/${cls.id}/assignments`, gv, { title, source: { examId: ex.id }, dueAt, publish: true, kind, ...extra }), "assignment").json().id as string;
}
const start = async (hs: Headers, id: string) => ok(await call(t, "POST", `/api/student/assignments/${id}/start`, hs, {}), "start").json().submission.id as string;
const submit = async (hs: Headers, id: string, a: Record<string, unknown>) => {
  const sid = await start(hs, id);
  ok(await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs, { seq: 1, answers: a }), "submit");
  return sid;
};
async function gradeAll(aid: string, sids: string[], score: () => number) {
  const res = ok(await call(t, "GET", `/api/assignments/${aid}/results`, gv), "results").json();
  const essays = res.stats.items.filter((i: { type: string }) => i.type === "essay").map((i: { label: number; max?: number }) => i.label);
  if (!essays.length) return;
  for (const sid of sids) await call(t, "PUT", `/api/assignments/${aid}/submissions/${sid}/grades`, gv, { points: Object.fromEntries(essays.map((n: number) => [n, score()])) });
}
/** Lùi một bài (hạn + mọi lượt làm) về quá khứ `days` ngày. */
async function shift(aid: string, days: number) {
  const iv = sql.raw(`interval '${days * 24} hours'`);
  await t.db.update(assignments).set({ opensAt: sql`${assignments.opensAt} - ${iv}`, dueAt: sql`${assignments.dueAt} - ${iv}` }).where(eq(assignments.id, aid));
  await t.db.update(submissions).set({ startedAt: sql`${submissions.startedAt} - ${iv}`, deadlineAt: sql`${submissions.deadlineAt} - ${iv}`, submittedAt: sql`${submissions.submittedAt} - ${iv}`, updatedAt: sql`${submissions.updatedAt} - ${iv}` }).where(inArray(submissions.assignmentId, [aid]));
}

// ---- Lịch sử: 3 bài cũ mỗi lớp, đúng môn của lớp (học lực, điểm TB, nộp đúng hạn, HS cần quan tâm) ----
// `skill` theo TB lớp (10A1 7,2 · 11A3 6,8 · 8A2 7,4 · KTPM K23 7,9). `weak` = em điểm thấp, `skip` = em bỏ 2 bài gần nhất.
type Past = { ex: Exam; title: string; days: number; kind?: "practice" | "test"; p?: Record<number, number> };
const HISTORY: { cls: Klass; skill: number; weak: number; skip: number; past: Past[] }[] = [
  // 10A1: Khánh Duy điểm tụt (6,8 → 5,6), Đức Thịnh hay bỏ dở; Minh Anh mạnh Hoá (9,5 bài Oxi hoá – khử), Tiếng Anh.
  { cls: c10a1, skill: 0.68, weak: 1, skip: 2, past: [
    { ex: E.ly, title: "Bài tập · Rơi tự do", days: 20, p: { 0: 0.8 } },
    { ex: E.hoa, title: "Kiểm tra 15′ · Oxi hoá – khử", days: 8, kind: "test", p: { 0: 0.97 } },
    { ex: E.anh, title: "Luyện tập · Câu bị động", days: 5, p: { 0: 0.85 } },
  ] },
  { cls: c11a3, skill: 0.62, weak: 10, skip: 11, past: [
    { ex: E.van11, title: "Bài tập · Nghị luận về một tư tưởng", days: 20 },
    { ex: E.van11, title: "Luyện đề · Nghị luận xã hội", days: 12 },
    { ex: E.van11, title: "Ôn tập · Đọc hiểu nghị luận", days: 5 },
  ] },
  { cls: c8a2, skill: 0.68, weak: 8, skip: 9, past: [
    { ex: E.quangHop, title: "Bài tập · Quang hợp ở cây xanh", days: 20, p: { 0: 0.95 } },
    { ex: E.tuanHoan, title: "Kiểm tra 15′ · Hệ tuần hoàn", days: 12, kind: "test", p: { 0: 0.92 } },
    { ex: E.phanThuc, title: "Luyện tập · Phân thức đại số", days: 5, p: { 0: 0.65 } },
  ] },
  { cls: cK23, skill: 0.7, weak: 10, skip: 11, past: [
    { ex: E.bst, title: "Bài tập · Cây nhị phân tìm kiếm", days: 20, p: { 0: 0.9 } },
    { ex: E.bfs, title: "Luyện tập · Đồ thị BFS/DFS", days: 12, p: { 0: 0.88 } },
    { ex: E.bst, title: "Kiểm tra giữa kì · Cấu trúc dữ liệu", days: 5, kind: "test", p: { 0: 0.9 } },
  ] },
];
for (const { cls, skill, weak, skip, past } of HISTORY) {
  for (const [i, b] of past.entries()) {
    const aid = await give(cls, b.ex, b.title, vn(0, 23, 0), b.kind ?? "practice", b.kind === "test" ? { attemptsAllowed: 1 } : {});
    const sids: string[] = [];
    for (const [k, hs] of cls.hs.entries()) {
      if (k === skip && i > 0) continue; // bỏ 2 bài gần → "cần quan tâm"
      const p = k === weak ? 0.3 - i * 0.05 : (b.p?.[k] ?? skill + (k % 3) * 0.06);
      sids.push(await submit(hs, aid, answers(b.ex.key, p)));
    }
    await gradeAll(aid, sids, () => (rnd() < skill ? 2 : 1));
    await shift(aid, b.days);
  }
}

// ---- Chuỗi ngày học của Minh Anh (10A1): bài ôn nhanh nhiều môn rải 14 ngày qua ----
const minhAnh = c10a1.hs[0]!;
// Ngày chẵn ôn Toán (bất phương trình là chỗ yếu, thành thạo thấp), ngày lẻ lần lượt các môn khác.
const ON: [Exam, string][] = [[E.ly, "Rơi tự do"], [E.hoa, "Oxi hoá – khử"], [E.anh, "Câu bị động"], [E.su, "Văn minh Đại Việt"], [E.dia, "Khí quyển"], [E.sinh10, "Cấu trúc tế bào"], [E.tin, "Câu lệnh rẽ nhánh"]];
for (const [n, days] of [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].entries()) {
  const toan = n % 2 === 0;
  const [ex, topic] = toan ? [E.toanNho, "Bất phương trình bậc hai"] : ON[(n >> 1) % ON.length]!;
  const aid = await give(c10a1, ex, `Ôn nhanh · ${topic}`, vn(0, 23, 30));
  await submit(minhAnh, aid, answers(ex.key, toan ? 0.5 + n * 0.015 : 0.82));
  // cả lớp cùng làm (để không ai bị tính "bỏ bài"); Đức Thịnh bỏ vài bài
  for (const [k, hs] of c10a1.hs.entries()) if (k > 0 && !(k === 2 && days % 3 === 0)) await submit(hs, aid, answers(ex.key, k === 1 ? 0.45 : 0.75));
  await shift(aid, days);
}

// ---- GV hôm nay: KT 15′ Ngữ văn 11A3 hạn 17:00 (chờ chấm tự luận, chấm được một phần) ----
const kt = await give(c11a3, E.van11kt, "Kiểm tra 15′ · Đọc hiểu nghị luận", vn(0, 17), "test", { attemptsAllowed: 1 });
const ktSids: string[] = [];
for (const [k, hs] of c11a3.hs.entries()) if (k < c11a3.hs.length - 1) ktSids.push(await submit(hs, kt, answers(E.van11kt.key, 0.4 + (k % 5) * 0.12)));
await gradeAll(kt, ktSids.slice(0, 7), () => (rnd() < 0.5 ? 2 : 1));
// ---- Hạn 21:00 KTPM K23: luyện tập (không tự luận), 2/3 lớp đã nộp ----
const lt = await give(cK23, E.bfs, "Luyện tập · Đồ thị BFS/DFS", vn(0, 21));
for (const [k, hs] of cK23.hs.entries()) if (k < 8) await submit(hs, lt, answers(E.bfs.key, 0.78));
// ---- 8A2: bài Sinh hạn ngày mai, một nửa lớp đã nộp ----
const th = await give(c8a2, E.tuanHoan, "Bài tập · Hệ tuần hoàn", vn(1, 21));
for (const [k, hs] of c8a2.hs.entries()) if (k < 5) await submit(hs, th, answers(E.tuanHoan.key, 0.75));
// ---- 10A1: Minh Anh đang làm dở 6/12 câu (hạn 21:00); tuần này mỗi ngày một môn ----
const lt10 = await give(c10a1, E.luyen, "Luyện tập · Hàm số bậc hai", vn(0, 21));
const cur = await start(minhAnh, lt10);
ok(await call(t, "PUT", `/api/student/submissions/${cur}/answers`, minhAnh, { seq: 1, answers: answers(E.luyen.key, 0.8, 6) }), "save");
for (const [k, hs] of c10a1.hs.entries()) if (k > 0 && k < 9) await submit(hs, lt10, answers(E.luyen.key, 0.75));
await give(c10a1, E.tichVoHuong, "Kiểm tra 15′ · Tích vô hướng", vn(1, 7, 30), "test", { attemptsAllowed: 1, opensAt: vn(0, 6) });
await give(c10a1, E.hoaLk, "Bài tập · Liên kết cộng hoá trị", vn(1, 21));
await give(c10a1, E.anhHt, "Luyện tập · Thì hiện tại hoàn thành", vn(2, 21));
await give(c10a1, E.van10, "Đoạn văn nghị luận · 200 chữ", vn(3, 21));
await give(c10a1, E.lyCd, "Bài tập · Chuyển động thẳng biến đổi đều", vn(4, 21));
await give(c10a1, E.tin, "Luyện tập · Câu lệnh rẽ nhánh", vn(5, 21));

// ---- Tiết dạy hôm nay + bảng giảng cùng tên ----
const today = vn(0, 12).slice(0, 10);
const viDate = `${today.slice(8, 10)}/${today.slice(5, 7)}/${today.slice(0, 4)}`;
const base = lessonPlan();
ok(await call(t, "POST", "/api/lessons", gv, { ...base, header: { ...base.header, school: "Trường Liên cấp Bình Minh", teacher: "Lê Thu Hà", date: viDate, title: "Bất phương trình bậc hai", periods: 1 } }), "lesson");
ok(await call(t, "POST", "/api/boards", gv, { title: "Bất phương trình bậc hai", subject: "Toán", grade: 10, topic: "Bất phương trình bậc hai" }), "board");

// ---------- Tài khoản của Minh Anh (liên kết thẻ lớp) + thẻ ôn đến hạn + lượt ôn mỗi tối 20–22h ----------
const maUser = await ensureUser(db, HS);
await addMember(db, orgId, maUser.id, "student");
await db.update(students).set({ userId: maUser.id }).where(eq(students.id, c10a1.cards[0]!.studentId));
const REVIEW: [subject: string, topic: string, n: number][] = [
  ["Toán", "Hàm số bậc hai", 2], ["Toán", "Dấu tam thức", 2], ["Hoá học", "Phản ứng oxi hoá – khử", 2], ["Tiếng Anh", "Thì hiện tại hoàn thành", 2],
  ["Vật lí", "Rơi tự do", 2], ["Sinh học", "Cấu trúc tế bào", 1], ["Lịch sử", "Văn minh Đại Việt", 1],
];
const cards: { id: string; subject: string; grade: number; topic: string }[] = [];
for (const [subject, topic, n] of REVIEW) {
  const qs = await db.select({ id: questions.id, subject: questions.subject, grade: questions.grade, topic: questions.topic }).from(questions).where(sql`${questions.orgId} = ${orgId} and ${questions.subject} = ${subject} and ${questions.topic} = ${topic} and ${questions.grade} = 10`).limit(n);
  cards.push(...qs);
}
const now = Date.now();
const H = 3600_000;
const D = 24 * H;
for (const [i, c] of cards.entries()) {
  const due = i < 8; // 8 thẻ đến hạn hôm nay, còn lại hẹn 1–4 ngày tới
  const interval = 1 + (i % 4);
  const dueAt = new Date(due ? now - (i + 1) * H : now + (i - 7) * D);
  const wrong = i % 5 === 1;
  await db.insert(tutorReviewState).values({
    orgId, learnerKey: maUser.id, questionId: c.id, subject: c.subject, grade: c.grade, topic: c.topic,
    intervalDays: interval, ease: 2.5, streak: wrong ? 0 : 1 + (i % 3), lapses: wrong ? 1 : 0, reviewCount: 2 + (i % 4), version: 1,
    dueAt, lastReviewAt: new Date(dueAt.getTime() - interval * D), lastCorrect: !wrong, isMistake: wrong, firstWrongAt: wrong ? new Date(now - 6 * D) : null,
  });
}
// Lượt ôn: tối nào cũng có (20:30 giờ VN), 16 ngày liền tính cả hôm nay.
const at2030 = (daysAgo: number) => {
  const d = new Date(now + 7 * H);
  const t0 = new Date(`${d.toISOString().slice(0, 10)}T20:30:00+07:00`).getTime() - daysAgo * D;
  return new Date(Math.min(t0, now - 10 * 60_000));
};
for (let daysAgo = 15; daysAgo >= 0; daysAgo--) {
  const n = 2 + ((daysAgo * 7) % 4);
  for (let j = 0; j < n; j++) {
    const c = cards[(daysAgo * 3 + j) % cards.length]!;
    await db.insert(tutorReviewEvents).values({ orgId, learnerKey: maUser.id, questionId: c.id, rating: j % 4 === 3 ? "again" : "good", correct: j % 4 !== 3, reviewedAt: new Date(at2030(daysAgo).getTime() + j * 4 * 60_000) });
  }
}

// ---------- Ghi token + phiên HS (đăng nhập lại lúc này để token còn hạn) ----------
writeFileSync(`${out}/gv-token.txt`, gv.authorization!.slice(7));
const card = c10a1.cards[0]!;
const s = ok(await call(t, "POST", "/api/student/session", {}, { classCode: c10a1.classCode, seat: card.seat, pin: card.pin }), "hs login").json();
writeFileSync(`${out}/hs-session.json`, JSON.stringify(s));
writeFileSync(`${out}/hs-token.txt`, await t.sign(HS));
demoLogin = { classCode: c10a1.classCode, seat: card.seat, pin: card.pin };
await t.app.listen({ host: "127.0.0.1", port });
console.log(`demo v2 :${port} · cô Lê Thu Hà · lớp 10A1 mã ${c10a1.classCode} · Minh Anh STT ${card.seat} PIN ${card.pin} · ${cards.length} thẻ ôn`);
