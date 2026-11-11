// Runtime tác tử bền: lượt (agent_turns) + nhật ký sự kiện (agent_events, seq tăng dần) + bus trong tiến trình.
// Lượt chạy nền, không gắn với kết nối HTTP: rớt mạng/F5 thì nối lại từ seq (Last-Event-ID), huỷ được, dừng chờ ask_user rồi tiếp đúng lượt
// (state lưu DB nên tiếp được cả sau khi máy chủ khởi động lại). Theo DeepTutor services/session/turns + runtime/coordination (Apache-2.0), đã sửa.
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { agentEvents, agentTurns } from "../db/schema";
import { ForbiddenError } from "../domain/authz";
import { ConflictError, NotFoundError } from "../errors";
import type { Ai, AiMessage, AiPart } from "../services/ai";
import { type CapabilityRegistry, createCapabilityRegistry } from "./capabilities";
import { DEFAULT_LIMITS, emptyUsage, runAgentLoop } from "./loop";
import { ASK_USER, type ToolRegistry, askUserTool, createToolRegistry } from "./tools";
import { type AgentActor, type AgentEvent, type AgentLimits, type AgentLoopState, type AskAnswer, FINAL_STATUSES, type SeqEvent, type TurnAttachment, type TurnStatus } from "./types";

const DELTA_FLUSH_MS = 60;
const HISTORY_TURNS = 10;
const STALE_MS = 120_000;
const CANCEL_WAIT_MS = 5000;

const Uuid = z.uuid();
export const StartBody = z.object({
  message: z.string().trim().min(1, "Hãy nhập câu hỏi").max(8000),
  capability: z.string().default("chat"),
  threadId: z.uuid().optional(),
  attachments: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("image"), name: z.string().max(200).default("ảnh"), dataUrl: z.string().regex(/^data:image\/(png|jpe?g|webp|gif);base64,/, "Ảnh phải là PNG/JPG/WEBP/GIF").max(6_000_000) }),
        z.object({ kind: z.literal("text"), name: z.string().min(1).max(200), text: z.string().max(60_000) }),
      ]),
    )
    .max(6)
    .default([])
    .refine((a) => a.filter((x) => x.kind === "image").length <= 3, "Tối đa 3 ảnh mỗi lượt"),
  params: z.record(z.string(), z.unknown()).default({}),
});
export const AnswerBody = z.object({
  answers: z.array(z.object({ id: z.string().min(1).max(20), selected: z.array(z.string().max(200)).max(8).default([]), other: z.string().max(2000).optional() })).max(4),
});

export type StartInput = z.input<typeof StartBody>;
/** Ai được phép xem/điều khiển lượt: mặc định chủ lượt. `scope` tách các nơi dùng (tro_ly, workbench, lop_hoc…). */
export type AgentOwner = { actor: AgentActor; ownerKey?: string; scope?: string };

type Live = {
  ctl: AbortController;
  seq: number;
  log: SeqEvent[];
  subs: Set<(e: SeqEvent) => void>;
  writes: Promise<unknown>;
  pending: { type: "thinking" | "content"; step?: number; text: string } | null;
  timer: ReturnType<typeof setTimeout> | null;
  done: Promise<void>;
};

const attachmentText = (a: Extract<TurnAttachment, { kind: "text" }>) => `\n\n[Tệp đính kèm: ${a.name}]\n\`\`\`\n${a.text}\n\`\`\``;

/** Tin của người dùng cho model: chữ + tệp chữ inline + ảnh (image_url). */
export function userMessage(message: string, attachments: TurnAttachment[]): AiMessage {
  const text = message + attachments.filter((a) => a.kind === "text").map((a) => attachmentText(a as Extract<TurnAttachment, { kind: "text" }>)).join("");
  const images = attachments.filter((a): a is Extract<TurnAttachment, { kind: "image" }> => a.kind === "image");
  if (!images.length) return { role: "user", content: text };
  return { role: "user", content: [{ type: "text", text }, ...images.map((i): AiPart => ({ type: "image_url", image_url: { url: i.dataUrl } }))] };
}

export type AgentRuntimeDeps = { db: Db; ai: Ai; limits?: Partial<AgentLimits>; now?: () => Date };

export function createAgentRuntime(deps: AgentRuntimeDeps) {
  const { db, ai } = deps;
  const now = deps.now ?? (() => new Date());
  const tools: ToolRegistry = createToolRegistry([askUserTool]);
  const capabilities: CapabilityRegistry = createCapabilityRegistry();
  const live = new Map<string, Live>();

  const keyOf = (o: AgentOwner) => o.ownerKey ?? o.actor.userId;
  const scopeOf = (o: AgentOwner) => o.scope ?? "tro_ly";

  async function load(o: AgentOwner, turnId: string) {
    if (!Uuid.safeParse(turnId).success) throw new NotFoundError("Không tìm thấy lượt");
    const [row] = await db.select().from(agentTurns).where(and(eq(agentTurns.id, turnId), eq(agentTurns.orgId, o.actor.orgId), eq(agentTurns.ownerKey, keyOf(o)), eq(agentTurns.scope, scopeOf(o))));
    if (!row) throw new NotFoundError("Không tìm thấy lượt");
    return row;
  }

  // ---------- phát sự kiện ----------
  function openLive(turnId: string, seq: number): Live {
    let resolve!: () => void;
    const l: Live = { ctl: new AbortController(), seq, log: [], subs: new Set(), writes: Promise.resolve(), pending: null, timer: null, done: new Promise<void>((r) => (resolve = r)) };
    (l as Live & { resolve: () => void }).resolve = resolve;
    live.set(turnId, l);
    return l;
  }

  function publish(turnId: string, l: Live, e: AgentEvent): void {
    const ev = { ...e, seq: ++l.seq } as SeqEvent;
    l.log.push(ev);
    const { seq, type, ...data } = ev;
    l.writes = l.writes
      .then(() => db.insert(agentEvents).values({ turnId, seq, type, data: data as Record<string, unknown> }))
      .then(() => (type === "step" || type === "ask_user" ? db.update(agentTurns).set({ lastSeq: seq, updatedAt: now() }).where(eq(agentTurns.id, turnId)) : undefined))
      .catch((err) => console.error("agent event", err));
    for (const s of l.subs) s(ev);
  }

  function flushDelta(turnId: string, l: Live): void {
    if (l.timer) clearTimeout(l.timer);
    l.timer = null;
    const p = l.pending;
    l.pending = null;
    if (p) publish(turnId, l, p.type === "thinking" ? { type: "thinking", step: p.step ?? 0, text: p.text } : { type: "content", text: p.text });
  }

  /** Gộp các mẩu chữ liên tiếp (~60 ms) để nhật ký không phình. */
  function emit(turnId: string, l: Live, e: AgentEvent): void {
    if (e.type === "thinking" || e.type === "content") {
      const step = e.type === "thinking" ? e.step : undefined;
      if (l.pending && (l.pending.type !== e.type || l.pending.step !== step)) flushDelta(turnId, l);
      if (l.pending) l.pending.text += e.text;
      else {
        l.pending = { type: e.type, step, text: e.text };
        l.timer = setTimeout(() => flushDelta(turnId, l), DELTA_FLUSH_MS);
      }
      return;
    }
    flushDelta(turnId, l);
    publish(turnId, l, e);
  }

  async function settle(turnId: string, l: Live, patch: Partial<typeof agentTurns.$inferInsert>): Promise<void> {
    flushDelta(turnId, l);
    await l.writes;
    await db.update(agentTurns).set({ ...patch, lastSeq: l.seq, updatedAt: now() }).where(eq(agentTurns.id, turnId));
    live.delete(turnId);
    for (const s of l.subs) s({ type: "status", status: (patch.status as TurnStatus) ?? "done", seq: -1 } as SeqEvent);
    l.subs.clear();
    (l as Live & { resolve: () => void }).resolve();
  }

  // ---------- chạy ----------
  async function history(orgId: string, ownerKey: string, scope: string, threadId: string, before: string): Promise<AiMessage[]> {
    const rows = await db
      .select({ id: agentTurns.id, message: agentTurns.message, answer: agentTurns.answer, attachments: agentTurns.attachments })
      .from(agentTurns)
      .where(and(eq(agentTurns.orgId, orgId), eq(agentTurns.ownerKey, ownerKey), eq(agentTurns.scope, scope), eq(agentTurns.threadId, threadId), inArray(agentTurns.status, ["done", "limit"])))
      .orderBy(desc(agentTurns.createdAt))
      .limit(HISTORY_TURNS + 1);
    return rows
      .filter((r) => r.id !== before && r.answer)
      .slice(0, HISTORY_TURNS)
      .reverse()
      .flatMap((r): AiMessage[] => {
        const names = r.attachments.map((a) => a.name);
        return [
          { role: "user", content: r.message + (names.length ? `\n(Đã đính kèm: ${names.join(", ")})` : "") },
          { role: "assistant", content: `ANSWER: ${r.answer}` },
        ];
      });
  }

  async function run(row: typeof agentTurns.$inferSelect, l: Live, actor: AgentActor, resume?: { state: AgentLoopState; answers: AskAnswer[] }) {
    const turnId = row.id;
    try {
      const cap = capabilities.get(row.capability);
      if (!cap) throw new Error(`Không có năng lực ${row.capability}`);
      const list = tools.available(actor, row.params, cap.tools).filter((t) => t.name !== ASK_USER);
      if (cap.askUser !== false) list.push(askUserTool);
      const outcome = await runAgentLoop(
        { ai, task: cap.task, tools: list, limits: { ...deps.limits, ...cap.limits }, actor, turnId, params: row.params, signal: l.ctl.signal, emit: (e) => emit(turnId, l, e) },
        { system: cap.system, history: await history(row.orgId, row.ownerKey, row.scope, row.threadId, row.id), user: userMessage(row.message, row.attachments), resume },
      );
      if (outcome.status === "waiting") {
        emit(turnId, l, { type: "status", status: "waiting" });
        await settle(turnId, l, { status: "waiting", state: outcome.state, usage: outcome.state.usage });
        return;
      }
      if (outcome.error) emit(turnId, l, { type: "error", message: outcome.error });
      emit(turnId, l, { type: "done", status: outcome.status, answer: outcome.answer, usage: outcome.state.usage });
      await settle(turnId, l, { status: outcome.status, answer: outcome.answer, usage: outcome.state.usage, state: null, error: outcome.error ?? null, finishedAt: now() });
    } catch (e) {
      console.error("agent turn", e);
      const message = "Trợ lý gặp lỗi, em thử lại nhé.";
      emit(turnId, l, { type: "error", message });
      emit(turnId, l, { type: "done", status: "error", answer: "", usage: resume?.state.usage ?? emptyUsage() });
      await settle(turnId, l, { status: "error", error: (e as Error).message, state: null, finishedAt: now() }).catch(() => {});
    }
  }

  // ---------- API ----------
  async function start(o: AgentOwner, input: unknown) {
    const v = StartBody.parse(input);
    const cap = capabilities.get(v.capability);
    if (!cap) throw new NotFoundError("Không có năng lực này");
    if (cap.roles && !cap.roles.includes(o.actor.role)) throw new ForbiddenError(`Vai trò "${o.actor.role}" không dùng được năng lực "${cap.title}"`);
    const threadId = v.threadId ?? crypto.randomUUID();
    const busy = await db
      .select({ id: agentTurns.id })
      .from(agentTurns)
      .where(and(eq(agentTurns.orgId, o.actor.orgId), eq(agentTurns.ownerKey, keyOf(o)), eq(agentTurns.threadId, threadId), inArray(agentTurns.status, ["running", "waiting"])));
    for (const b of busy) await reap(b.id);
    const still = busy.length ? await db.select({ id: agentTurns.id, status: agentTurns.status }).from(agentTurns).where(inArray(agentTurns.id, busy.map((b) => b.id))) : [];
    const blocking = still.find((s) => s.status === "running" || s.status === "waiting");
    if (blocking) throw new ConflictError(blocking.status === "waiting" ? "Lượt trước đang chờ em trả lời" : "Trợ lý đang trả lời lượt trước", { turnId: blocking.id });
    const [row] = await db
      .insert(agentTurns)
      .values({ orgId: o.actor.orgId, ownerKey: keyOf(o), scope: scopeOf(o), threadId, capability: cap.id, message: v.message, attachments: v.attachments as TurnAttachment[], params: v.params, status: "running" })
      .returning();
    const l = openLive(row!.id, 0);
    emit(row!.id, l, { type: "turn", turnId: row!.id, threadId, capability: cap.id, message: v.message });
    emit(row!.id, l, { type: "status", status: "running" });
    void run(row!, l, o.actor);
    return { turnId: row!.id, threadId, capability: cap.id };
  }

  /** Lượt "running" không còn chạy trong tiến trình này quá STALE_MS (máy chủ khởi động lại) → interrupted. */
  async function reap(turnId: string): Promise<void> {
    if (live.has(turnId)) return;
    const [row] = await db.select().from(agentTurns).where(eq(agentTurns.id, turnId));
    if (!row || row.status !== "running" || now().getTime() - row.updatedAt.getTime() < STALE_MS) return;
    const l = openLive(turnId, row.lastSeq);
    const [last] = await db.select({ seq: agentEvents.seq }).from(agentEvents).where(eq(agentEvents.turnId, turnId)).orderBy(desc(agentEvents.seq)).limit(1);
    l.seq = Math.max(l.seq, last?.seq ?? 0);
    emit(turnId, l, { type: "error", message: "Lượt bị ngắt do máy chủ khởi động lại. Em gửi lại câu hỏi nhé." });
    emit(turnId, l, { type: "done", status: "interrupted", answer: row.answer, usage: row.usage ?? emptyUsage() });
    await settle(turnId, l, { status: "interrupted", finishedAt: now() });
  }

  /**
   * Theo dõi lượt: phát lại sự kiện seq > afterSeq rồi nhận trực tiếp. onEvent nhận `status` cuối (seq -1) khi lượt dừng/chờ.
   * Trả hàm huỷ theo dõi. `ended` = lượt đã ở trạng thái cuối/chờ ngay khi gọi (đã phát lại hết).
   */
  async function follow(o: AgentOwner, turnId: string, afterSeq: number, onEvent: (e: SeqEvent) => void): Promise<{ close: () => void; ended: boolean }> {
    await load(o, turnId);
    await reap(turnId);
    let last = afterSeq;
    const l = live.get(turnId);
    const queue: SeqEvent[] = [];
    let replaying = true;
    const deliver = (e: SeqEvent) => {
      if (e.seq !== -1 && e.seq <= last) return;
      if (e.seq !== -1) last = e.seq;
      onEvent(e);
    };
    const sub = (e: SeqEvent) => (replaying ? queue.push(e) : deliver(e));
    l?.subs.add(sub);
    const rows = await db.select().from(agentEvents).where(and(eq(agentEvents.turnId, turnId), gt(agentEvents.seq, afterSeq))).orderBy(asc(agentEvents.seq));
    for (const r of rows) deliver({ ...(r.data as object), type: r.type, seq: r.seq } as SeqEvent);
    if (l) for (const e of l.log) deliver(e);
    replaying = false;
    for (const e of queue) deliver(e);
    if (l && live.get(turnId) === l) return { close: () => l.subs.delete(sub), ended: false };
    // Không chạy (hoặc vừa xong trong lúc phát lại): đọc trạng thái cuối.
    const row = await load(o, turnId);
    if (!queue.some((e) => e.seq === -1)) onEvent({ type: "status", status: row.status, seq: -1 } as SeqEvent);
    return { close: () => {}, ended: true };
  }

  async function cancel(o: AgentOwner, turnId: string): Promise<{ status: TurnStatus }> {
    const row = await load(o, turnId);
    const l = live.get(turnId);
    if (l) {
      l.ctl.abort();
      await Promise.race([l.done, new Promise((r) => setTimeout(r, CANCEL_WAIT_MS))]);
      return { status: (await load(o, turnId)).status };
    }
    if (row.status === "waiting") {
      const [claimed] = await db.update(agentTurns).set({ status: "cancelled", updatedAt: now() }).where(and(eq(agentTurns.id, turnId), eq(agentTurns.status, "waiting"))).returning();
      if (claimed) {
        const w = openLive(turnId, row.lastSeq);
        const [lastEv] = await db.select({ seq: agentEvents.seq }).from(agentEvents).where(eq(agentEvents.turnId, turnId)).orderBy(desc(agentEvents.seq)).limit(1);
        w.seq = Math.max(w.seq, lastEv?.seq ?? 0);
        emit(turnId, w, { type: "done", status: "cancelled", answer: "", usage: row.usage ?? emptyUsage() });
        await settle(turnId, w, { status: "cancelled", state: null, finishedAt: now() });
      }
      return { status: "cancelled" };
    }
    await reap(turnId);
    return { status: (await load(o, turnId)).status };
  }

  async function answer(o: AgentOwner, turnId: string, input: unknown) {
    const v = AnswerBody.parse(input);
    const row = await load(o, turnId);
    if (row.status !== "waiting" || !row.state?.pending) throw new ConflictError("Lượt này không chờ câu trả lời", { status: row.status });
    const [claimed] = await db.update(agentTurns).set({ status: "running", updatedAt: now() }).where(and(eq(agentTurns.id, turnId), eq(agentTurns.status, "waiting"))).returning();
    if (!claimed) throw new ConflictError("Câu trả lời đã được gửi", { status: "running" });
    const [lastEv] = await db.select({ seq: agentEvents.seq }).from(agentEvents).where(eq(agentEvents.turnId, turnId)).orderBy(desc(agentEvents.seq)).limit(1);
    const l = openLive(turnId, Math.max(row.lastSeq, lastEv?.seq ?? 0));
    emit(turnId, l, { type: "status", status: "running" });
    const valid = new Set(row.state.pending.questions.map((q) => q.id));
    void run(claimed, l, o.actor, { state: row.state, answers: v.answers.filter((a) => valid.has(a.id)) as AskAnswer[] });
    return { turnId, status: "running" as const };
  }

  const view = (r: typeof agentTurns.$inferSelect) => ({
    id: r.id,
    threadId: r.threadId,
    capability: r.capability,
    message: r.message,
    attachments: r.attachments.map((a) => ({ kind: a.kind, name: a.name })),
    status: r.status,
    answer: r.answer,
    usage: r.usage,
    ask: r.status === "waiting" && r.state?.pending ? { callId: r.state.pending.callId, questions: r.state.pending.questions } : null,
    lastSeq: r.lastSeq,
    createdAt: r.createdAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  });

  async function get(o: AgentOwner, turnId: string, withEvents = false) {
    await reap(turnId);
    const r = await load(o, turnId);
    if (!withEvents) return view(r);
    const events = await db.select().from(agentEvents).where(eq(agentEvents.turnId, turnId)).orderBy(asc(agentEvents.seq));
    return { ...view(r), events: events.map((e) => ({ ...(e.data as object), type: e.type, seq: e.seq })) };
  }

  async function thread(o: AgentOwner, threadId: string) {
    if (!Uuid.safeParse(threadId).success) throw new NotFoundError("Không tìm thấy cuộc trò chuyện");
    const rows = await db
      .select()
      .from(agentTurns)
      .where(and(eq(agentTurns.orgId, o.actor.orgId), eq(agentTurns.ownerKey, keyOf(o)), eq(agentTurns.scope, scopeOf(o)), eq(agentTurns.threadId, threadId)))
      .orderBy(asc(agentTurns.createdAt));
    if (!rows.length) throw new NotFoundError("Không tìm thấy cuộc trò chuyện");
    for (const r of rows) if (r.status === "running") await reap(r.id);
    return { threadId, turns: rows.map(view) };
  }

  /** Chờ mọi lượt đang chạy xong (test / tắt máy chủ êm). */
  async function idle(): Promise<void> {
    while (live.size) await Promise.all([...live.values()].map((l) => l.done));
  }

  /** Huỷ mọi lượt đang chạy rồi chờ chúng ghi xong (tắt máy chủ). */
  async function stop(): Promise<void> {
    for (const l of live.values()) l.ctl.abort();
    await idle();
  }

  return {
    tools,
    capabilities,
    stop,
    start,
    follow,
    cancel,
    answer,
    get,
    thread,
    idle,
    isFinal: (s: TurnStatus) => FINAL_STATUSES.includes(s),
    limits: { ...DEFAULT_LIMITS, ...deps.limits },
  };
}

export type AgentRuntime = ReturnType<typeof createAgentRuntime>;
