import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Idempotency-Key cho POST /api/*: cùng người gửi (header authorization + x-org-id) + cùng khoá trong 10 phút
 * → trả lại đúng phản hồi lần đầu (header `idempotent-replayed: true`), không chạy lại thao tác.
 * Hai yêu cầu cùng khoá gửi đồng thời: yêu cầu sau chờ yêu cầu đầu xong rồi nhận cùng kết quả.
 * Cùng khoá nhưng khác đường dẫn/thân → 422. Lỗi 5xx/429 không lưu (cho phép thử lại).
 * Bộ nhớ tạm trong RAM của tiến trình (một máy chủ lõi); tối đa MAX_ENTRIES mục, mục cũ nhất bị bỏ trước.
 */
export const IDEMPOTENCY_TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 10_000;
const WAIT_MS = 60_000;
/** Route trả luồng (SSE) hoặc tự xử lý phản hồi: không áp dụng. */
const SKIP = new Set(["/api/tutor/chat"]);

type Done = { state: "done"; fp: string; at: number; status: number; contentType: string | undefined; body: string | Buffer };
type Pending = { state: "pending"; fp: string; at: number; owner: FastifyRequest; wait: Promise<void>; resolve: () => void };
type Entry = Done | Pending;

const sha = (s: string) => createHash("sha256").update(s).digest("base64url");

export function registerIdempotency(app: FastifyInstance, opts: { now?: () => number } = {}): void {
  const now = opts.now ?? Date.now;
  const store = new Map<string, Entry>();
  const scopes = new WeakMap<FastifyRequest, string>();

  const fresh = (e: Entry | undefined): Entry | undefined => (e && now() - e.at < IDEMPOTENCY_TTL_MS ? e : undefined);
  function put(scope: string, e: Entry) {
    store.delete(scope);
    store.set(scope, e);
    while (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value as string;
      const old = store.get(oldest);
      store.delete(oldest);
      if (old?.state === "pending") old.resolve();
    }
  }
  /** Yêu cầu chủ kết thúc mà chưa lưu được (5xx, ngắt kết nối, hijack): bỏ mục, cho người chờ chạy lại. */
  function release(req: FastifyRequest) {
    const scope = scopes.get(req);
    if (!scope) return;
    scopes.delete(req);
    const e = store.get(scope);
    if (e?.state === "pending" && e.owner === req) {
      store.delete(scope);
      e.resolve();
    }
  }
  const replay = (reply: FastifyReply, d: Done) => {
    if (d.contentType) reply.header("content-type", d.contentType);
    return reply.code(d.status).header("idempotent-replayed", "true").send(d.body);
  };

  app.addHook("preHandler", async (req, reply) => {
    if (req.method !== "POST") return;
    const raw = req.headers["idempotency-key"];
    if (raw === undefined) return;
    const path = req.url.split("?")[0] ?? "";
    if (!path.startsWith("/api/") || SKIP.has(path)) return;
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.length < 8 || key.length > 200) return reply.code(400).send({ error: "Idempotency-Key phải dài 8–200 ký tự" });
    const scope = sha(`${req.headers.authorization ?? ""}\n${req.headers["x-org-id"] ?? ""}\n${key}`);
    const fp = sha(`${req.method} ${req.url}\n${JSON.stringify(req.body ?? null)}`);
    for (let round = 0; round < 3; round++) {
      const hit = fresh(store.get(scope));
      if (!hit) break;
      if (hit.fp !== fp) return reply.code(422).send({ error: "Idempotency-Key này đã dùng cho một yêu cầu khác" });
      if (hit.state === "done") return replay(reply, hit);
      await Promise.race([hit.wait, new Promise((r) => setTimeout(r, WAIT_MS).unref())]);
    }
    let resolve!: () => void;
    const wait = new Promise<void>((r) => (resolve = r));
    put(scope, { state: "pending", fp, at: now(), owner: req, wait, resolve });
    scopes.set(req, scope);
    reply.raw.once("close", () => release(req));
  });

  app.addHook("onSend", async (req, reply, payload) => {
    const scope = scopes.get(req);
    if (!scope) return payload;
    const e = store.get(scope);
    if (e?.state === "pending" && e.owner === req && reply.statusCode < 500 && reply.statusCode !== 429 && (typeof payload === "string" || Buffer.isBuffer(payload) || payload == null)) {
      scopes.delete(req);
      const ct = reply.getHeader("content-type");
      put(scope, { state: "done", fp: e.fp, at: e.at, status: reply.statusCode, contentType: typeof ct === "string" ? ct : undefined, body: (payload as string | Buffer | null) ?? "" });
      e.resolve();
    }
    return payload;
  });
  app.addHook("onResponse", async (req) => release(req));
  app.addHook("onRequestAbort", async (req) => release(req));
}
