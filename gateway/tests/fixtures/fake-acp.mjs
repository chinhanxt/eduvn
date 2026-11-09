#!/usr/bin/env node
// Agent ACP giả cho test: nói JSON-RPC qua stdin/stdout giống `agy acp`.
// Lệnh đặc biệt trong nội dung prompt:
//   [[sleep:N]] chờ N ms (huỷ được)   [[crash]] thoát tiến trình   [[tool]] xin quyền dùng công cụ rồi kết thúc không chữ
//   [[json]] trả JSON trong khối mã   [[badjson]] trả chữ thường, trừ khi prompt có "Chỉ trả về JSON"
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const MODELS = [
  { modelId: "fake-fast", name: "Fake Fast" },
  { modelId: "fake-smart", name: "Fake Smart" },
];
const dataDir = process.env.FAKE_DATA_DIR; // giả lập nơi agy ghi dữ liệu phiên
const sessions = new Map();
const waiting = new Map();
let n = 0;
let reqId = 1000;
const send = (m) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...m }) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

process.stdout.write("Khởi động agent giả\n");
const noInit = process.env.FAKE_NO_INIT === "1";

createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.method === undefined) {
    const w = waiting.get(m.id);
    if (w) {
      waiting.delete(m.id);
      w(m);
    }
    return;
  }
  const p = m.params ?? {};
  const reply = (result) => send({ id: m.id, result });
  const fail = (code, message) => send({ id: m.id, error: { code, message } });
  switch (m.method) {
    case "initialize":
      if (noInit) return;
      return reply({ protocolVersion: 1, agentCapabilities: { promptCapabilities: { image: true } } });
    case "session/new": {
      const id = "s" + ++n;
      sessions.set(id, { model: "fake-fast", turns: 0, cancelled: false });
      if (dataDir) {
        mkdirSync(join(dataDir, "conversations"), { recursive: true });
        writeFileSync(join(dataDir, "conversations", `${id}.db`), "x");
        writeFileSync(join(dataDir, "conversations", `${id}.db-wal`), "x");
        writeFileSync(join(dataDir, "conversations", `${id}.db-shm`), "x");
        mkdirSync(join(dataDir, "brain", id), { recursive: true });
      }
      return reply({ sessionId: id, models: { availableModels: MODELS, currentModelId: "fake-fast" } });
    }
    case "session/set_model": {
      const s = sessions.get(p.sessionId);
      if (!s) return fail(-32602, "Unknown session");
      if (!MODELS.some((x) => x.modelId === p.modelId)) return fail(-32602, `Unknown model ID: ${p.modelId}`);
      s.model = p.modelId;
      return reply({});
    }
    case "session/close":
      sessions.delete(p.sessionId);
      return reply({});
    case "session/cancel": {
      const s = sessions.get(p.sessionId);
      if (s) s.cancelled = true;
      return;
    }
    case "session/prompt":
      return void prompt(m.id, p);
    default:
      return fail(-32601, "Method not found");
  }
});

async function prompt(id, p) {
  const s = sessions.get(p.sessionId);
  if (!s) return send({ id, error: { code: -32602, message: "Unknown session" } });
  s.turns++;
  s.cancelled = false;
  const text = p.prompt.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const images = p.prompt.filter((b) => b.type === "image").length;
  const last = text.trim().split("\n").filter(Boolean).pop() ?? "";
  const sl = /\[\[sleep:(\d+)\]\]/.exec(text);
  if (sl) for (let t = 0; t < Number(sl[1]) && !s.cancelled; t += 10) await sleep(10);
  if (s.cancelled) {
    if (text.includes("[[latechunks]]")) {
      for (const t of ["LATE1", "LATE2"]) {
        await sleep(20);
        send({ method: "session/update", params: { sessionId: p.sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: t } } } });
      }
    }
    return send({ id, result: { stopReason: "cancelled" } });
  }
  if (text.includes("[[closeout]]")) {
    process.stdout.end();
    setTimeout(() => process.exit(0), 5000);
    return;
  }
  if (text.includes("[[crash]]")) process.exit(3);
  if (text.includes("[[tool]]") && !text.includes("không dùng công cụ")) {
    const rid = ++reqId;
    const answered = new Promise((r) => waiting.set(rid, r));
    send({ id: rid, method: "session/request_permission", params: { sessionId: p.sessionId, toolCall: { name: "run_command" }, options: [] } });
    const ans = await answered;
    if (ans.result?.outcome?.outcome !== "cancelled") process.stderr.write("CÔNG CỤ ĐÃ ĐƯỢC CHO PHÉP\n");
    return send({ id, result: { stopReason: "end_turn", usage: { inputTokens: text.length, outputTokens: 0 } } });
  }
  let out;
  if (text.includes("[[json]]")) out = 'Đây là kết quả:\n```json\n{"ok":true,"n":2}\n```';
  else if (text.includes("[[badjson]]")) out = text.includes("Chỉ trả về JSON") ? '{"ok":true,"retry":1}' : "không phải JSON";
  else out = `[${s.model}#${s.turns}] ${last}${images ? ` (ảnh:${images})` : ""}`;
  for (const part of [out.slice(0, 3), out.slice(3, 8), out.slice(8)].filter(Boolean)) {
    send({ method: "session/update", params: { sessionId: p.sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: part } } } });
    await sleep(5);
  }
  send({ id, result: { stopReason: "end_turn", usage: { inputTokens: text.length, outputTokens: out.length, cachedReadTokens: s.turns > 1 ? 100 : 0 } } });
}
