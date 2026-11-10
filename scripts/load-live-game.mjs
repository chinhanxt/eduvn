#!/usr/bin/env node
// Bài thử tải trò chơi trực tiếp: N người chơi giả vào một phòng, trả lời trong 2 s mỗi câu × Q câu.
// Đo p95 thời gian POST trả lời (< 100 ms) và độ trễ phát sự kiện đổi câu (< 300 ms), 0 lỗi.
// Dùng: node scripts/load-live-game.mjs --base http://127.0.0.1:4321 --token-file /tmp/p11-token.txt [--players 200] [--questions 10]
import { readFileSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:4321");
const TOKEN = readFileSync(arg("token-file", "/tmp/p11-token.txt"), "utf8").trim();
const N = Number(arg("players", 200));
const Q = Number(arg("questions", 10));
const errors = [];
const j = async (method, url, body, auth = false) => {
  const r = await fetch(BASE + url, { method, headers: { "content-type": "application/json", ...(auth && { authorization: `Bearer ${TOKEN}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status} ${data.error ?? ""}`);
  return data;
};
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] ?? 0; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Dữ liệu: đủ Q câu trắc nghiệm trong chủ đề riêng
const topic = `Tải ${Date.now() % 100000}`;
for (let i = 0; i < Q; i++) await j("POST", "/api/questions", { type: "mcq", subject: "Toán", grade: 10, topic, level: "NB", tags: [], stem: `Câu tải ${i + 1}: $${i}+${i}=?$`, options: [`${2 * i}`, "a", "b", "c"], answer: 0 }, true);
const room = await j("POST", "/api/live", { source: { subject: "Toán", grade: 10, topic, limit: Q }, timerSeconds: 20 }, true);
console.log(`phòng ${room.pin}, ${room.total} câu, ${N} người chơi`);

const players = [];
let mark = { qi: -1, t: 0 };
const lat = [];
const post = [];
async function listen(p) {
  const res = await fetch(`${BASE}/api/live/stream?t=${encodeURIComponent(p.token)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  (async () => {
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ done: true }));
      if (done) return;
      buf += dec.decode(value);
      let k;
      while ((k = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, k);
        buf = buf.slice(k + 2);
        const m = /^event: state\ndata: (.*)$/m.exec(chunk);
        if (!m) continue;
        const s = JSON.parse(m[1]);
        p.state = s;
        if (s.phase === "question" && s.qi > p.seen) {
          p.seen = s.qi;
          if (s.qi === mark.qi) lat.push(Date.now() - mark.t);
          p.onQuestion?.(s);
        }
      }
    }
  })();
}

// Vào phòng (song song theo lô 50) và mở luồng SSE
for (let i = 0; i < N; i += 50) {
  await Promise.all(Array.from({ length: Math.min(50, N - i) }, async (_, k) => {
    try {
      const r = await j("POST", `/api/live/pin/${room.pin}/join`, { name: `HS${i + k + 1}` });
      const p = { token: r.token, seen: -1, state: null };
      players.push(p);
      await listen(p);
    } catch (e) { errors.push(String(e)); }
  }));
}
await sleep(500);
console.log(`đã vào ${players.length}/${N}`);

let answeredTotal = 0;
for (const p of players) {
  p.onQuestion = (s) => {
    setTimeout(async () => {
      const t0 = performance.now();
      try {
        await j("POST", "/api/live/answer", { t: p.token, q: s.qi, choice: Math.random() < 0.6 ? 0 : 1 + Math.floor(Math.random() * 3) });
        post.push(performance.now() - t0);
        answeredTotal++;
      } catch (e) { errors.push(String(e)); }
    }, Math.random() * 2000);
  };
}

for (let q = 0; q < Q; q++) {
  mark = { qi: q, t: Date.now() };
  await j("POST", `/api/live/room/${room.pin}/control`, { action: q === 0 ? "start" : "next" }, true);
  // chờ chốt câu (tất cả đã trả lời → tự chốt)
  const t0 = Date.now();
  for (;;) {
    const info = await j("GET", `/api/live/room/${room.pin}`, undefined, true);
    if (info.state.phase === "reveal" && info.state.qi === q) break;
    if (Date.now() - t0 > 25000) { errors.push(`câu ${q + 1} không chốt sau 25 s`); break; }
    await sleep(150);
  }
}
const fin = await j("POST", `/api/live/room/${room.pin}/control`, { action: "next" }, true);
await sleep(500);
const done = await j("GET", `/api/live/room/${room.pin}`, undefined, true);
const rep = {
  players: players.length, questions: Q, answers: post.length, expectedAnswers: players.length * Q,
  postP50: +pct(post, 50).toFixed(1), postP95: +pct(post, 95).toFixed(1), postMax: +Math.max(...post).toFixed(1),
  eventLatencyP50: pct(lat, 50), eventLatencyP95: pct(lat, 95), eventLatencyMax: Math.max(...lat), eventSamples: lat.length,
  errors: errors.length, phase: fin.phase, sessionSaved: !!done.state.sessionId,
};
console.log(JSON.stringify(rep, null, 2));
if (errors.length) console.log(errors.slice(0, 5));
const ok = rep.postP95 < 100 && rep.eventLatencyP95 < 300 && errors.length === 0 && rep.answers === rep.expectedAnswers;
console.log(ok ? "ĐẠT" : "KHÔNG ĐẠT");
process.exit(ok ? 0 : 1);
