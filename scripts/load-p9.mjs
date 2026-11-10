// Thử tải P9a: N học sinh tự lưu mỗi SAVE_EVERY giây trong DURATION giây, rồi cả lớp nộp trong SUBMIT_WINDOW giây.
// Cần: server đang chạy (Postgres thật trong docker, infra/), Keycloak (lấy token gv1) hoặc TEACHER_TOKEN.
// Chạy: flock /tmp/eduvn-heavy.lock node scripts/load-p9.mjs
import autocannon from "../server/node_modules/autocannon/autocannon.js";

const API = process.env.API ?? "http://localhost:4310";
const KC = process.env.KC ?? "http://localhost:8180";
const N = Number(process.env.N ?? 1000);
const DURATION = Number(process.env.DURATION ?? 120);
const SAVE_EVERY = Number(process.env.SAVE_EVERY ?? 3);
const SUBMIT_WINDOW = Number(process.env.SUBMIT_WINDOW ?? 10);
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 200);
const TARGET = { saveP95: 150, submitP95: 400 };

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const p95 = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] : NaN;
};
async function teacherToken() {
  if (process.env.TEACHER_TOKEN) return process.env.TEACHER_TOKEN;
  const r = await fetch(`${KC}/realms/eduvn/protocol/openid-connect/token`, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "password", client_id: "eduvn-dev", username: "gv1", password: "gv1-dev-pass", scope: "openid" }),
  });
  if (!r.ok) throw new Error(`Keycloak ${r.status}`);
  return (await r.json()).access_token;
}
async function call(method, path, token, body) {
  const r = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body !== undefined && { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
}

const gv = await teacherToken();
const tag = `Tải ${Date.now()}`;
log(`chuẩn bị lớp ${N} HS`);
const cls = await call("POST", "/api/classes", gv, { name: `T${Date.now() % 100000}`, schoolYear: "2026-2027", subject: "Toán" });
const names = Array.from({ length: N }, (_, i) => `Học Sinh ${String(i + 1).padStart(4, "0")}`);
for (let i = 0; i < N; i += 500) await call("POST", `/api/classes/${cls.id}/students`, gv, { text: names.slice(i, i + 500).join("\n") });
for (let i = 0; i < 10; i++) await call("POST", "/api/questions", gv, { type: "mcq", subject: "Toán", grade: 10, topic: tag, level: "NB", tags: [], stem: `Câu ${i + 1}: ${i} + 1 = ?`, options: [String(i), String(i + 1), String(i + 2), String(i + 3)], answer: 1 });
for (let i = 0; i < 2; i++) await call("POST", "/api/questions", gv, { type: "short_answer", subject: "Toán", grade: 10, topic: tag, level: "TH", tags: [], stem: `Viết ${i + 1}/2 dạng thập phân`, answer: i === 0 ? "0,5" : "1" });
const exam = await call("POST", "/api/exams", gv, { title: tag, variants: 4, durationMinutes: 60, matrix: { subject: "Toán", grade: 10, cells: [{ topic: tag, level: "NB", type: "mcq", count: 10 }, { topic: tag, level: "TH", type: "short_answer", count: 2 }] } });
const asg = await call("POST", `/api/classes/${cls.id}/assignments`, gv, { title: tag, source: { examId: exam.examId }, dueAt: new Date(Date.now() + 3 * 3600_000).toISOString(), publish: true });
log("cấp mã");
const { classCode, cards } = await call("POST", `/api/classes/${cls.id}/credentials`, gv, {});
log("đăng nhập + vào bài");
const students = await pool(cards, 25, async (c) => {
  const s = await call("POST", "/api/student/session", "", { classCode, seat: c.seat, pin: c.pin });
  const room = await call("POST", `/api/student/assignments/${asg.id}/start`, s.token, {});
  return { studentId: c.studentId, token: s.token, sid: room.submission.id, nos: room.questions.map((q) => q.no), seq: 0, answers: {}, acked: {}, ackedSeq: 0 };
});

function nextAnswers(st) {
  const k = Math.min(st.nos.length, Object.keys(st.answers).length + 1);
  const answers = {};
  st.nos.slice(0, k).forEach((no, i) => (answers[String(no)] = i >= 10 ? "1{,}0" : (st.seq + i) % 4));
  return answers;
}

async function run(name, opts, makeBody, method) {
  const lat = [];
  let k = 0;
  let s5xx = 0;
  let other = 0;
  const inst = autocannon({
    url: API,
    connections: CONNECTIONS,
    pipelining: 1,
    ...opts,
    requests: [{
      method,
      setupRequest(req, ctx) {
        const st = students[k++ % students.length];
        const { path, body, seq, answers } = makeBody(st);
        ctx.st = st;
        ctx.seq = seq;
        ctx.answers = answers;
        return { ...req, path, headers: { authorization: `Bearer ${st.token}`, "content-type": "application/json" }, body: JSON.stringify(body) };
      },
      onResponse(status, _body, ctx) {
        if (status >= 500) s5xx++;
        else if (status >= 300) other++;
        else if (ctx.seq > ctx.st.ackedSeq) {
          ctx.st.ackedSeq = ctx.seq;
          ctx.st.acked = ctx.answers;
        }
      },
    }],
  });
  inst.on("response", (_c, _status, _bytes, ms) => lat.push(ms));
  const res = await inst;
  const out = { name, requests: res.requests.total, p50: res.latency.p50, p95: p95(lat), p99: res.latency.p99, max: res.latency.max, s5xx, non2xx: other, errors: res.errors, timeouts: res.timeouts };
  log(JSON.stringify(out));
  return out;
}

log(`tự lưu: ${N} HS × mỗi ${SAVE_EVERY}s trong ${DURATION}s`);
const save = await run("autosave", { duration: DURATION, overallRate: Math.ceil(N / SAVE_EVERY) }, (st) => {
  st.seq++;
  st.answers = nextAnswers(st);
  return { path: `/api/student/submissions/${st.sid}/answers`, body: { seq: st.seq, answers: st.answers }, seq: st.seq, answers: st.answers };
}, "PUT");

const answeredOf = (a) => Object.values(a).filter((v) => v !== null && v !== "").length;
const mon = await call("GET", `/api/assignments/${asg.id}/monitor`, gv);
const byId = new Map(mon.rows.map((r) => [r.studentId, r]));
// mất = máy chủ có ÍT câu hơn bản đã được xác nhận (bản gửi cuối có thể đã lưu dù autocannon dừng trước khi nhận phản hồi)
const lostAfterSave = students.filter((st) => (byId.get(st.studentId)?.answered ?? 0) < answeredOf(st.acked)).length;
log(`sau tự lưu: ${lostAfterSave} HS lệch số câu đã lưu`);

log(`nộp: ${N} bài trong ${SUBMIT_WINDOW}s`);
const submit = await run("submit", { amount: N, overallRate: Math.ceil(N / SUBMIT_WINDOW) }, (st) => {
  const seq = st.seq + 1;
  return { path: `/api/student/submissions/${st.sid}/submit`, body: { seq, answers: st.answers }, seq, answers: st.answers };
}, "POST");

const res = await call("GET", `/api/assignments/${asg.id}/results`, gv);
const notFinal = res.rows.filter((r) => r.status === null || r.status === "in_progress").length;
const mon2 = await call("GET", `/api/assignments/${asg.id}/monitor`, gv);
const byId2 = new Map(mon2.rows.map((r) => [r.studentId, r]));
const lostAfterSubmit = students.filter((st) => (byId2.get(st.studentId)?.answered ?? 0) < answeredOf(st.answers)).length;

const pass = save.p95 < TARGET.saveP95 && submit.p95 < TARGET.submitP95 && save.s5xx + submit.s5xx === 0 && lostAfterSave === 0 && lostAfterSubmit === 0 && notFinal === 0;
console.log(JSON.stringify({ N, autosave: save, submit, lostAfterSave, lostAfterSubmit, notFinal, target: TARGET, pass }, null, 2));
process.exitCode = pass ? 0 : 1;
