import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ServerResponse } from "node:http";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { type LiveAnswer, type LiveQStat, classes, liveResults, liveSessions } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { type GameItem, GameSource } from "../domain/games";
import { DEFAULT_LIMIT_SECONDS, MAX_PLAYERS, cleanName, gradebookScore, isCorrect, liveItems, newPin, rankPlayers, scoreAnswer } from "../domain/live";
import { QuestionType } from "../domain/question";
import { NotFoundError, ValidationError } from "../errors";
import type { Ai } from "./ai";
import { draftQuestions } from "./aiSkills";
import type { ClassService } from "./classes";
import type { GameService } from "./games";

type Actor = { userId: string; orgId: string; role: Role };

/** Lỗi có mã HTTP (bộ xử lý lỗi của app trả 4xx nguyên văn). */
export class LiveHttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

const GRACE_MS = 300; // bù độ trễ mạng: nhận câu trả lời đến qEnd + 300 ms
const ROOM_IDLE_MS = 2 * 60 * 60 * 1000;
const ENDED_KEEP_MS = 20 * 60 * 1000;
const HEARTBEAT_MS = 15_000;
const MIN_GAP_MS = 50; // giới hạn tần suất POST theo người chơi
const WRONG_PIN_PER_MIN = 20;

type Cur = { a: { choice?: number; text?: string }; ok: boolean; pts: number; ms: number };
type Player = {
  id: string;
  name: string;
  studentId: string | null;
  score: number;
  streak: number;
  correct: number;
  answers: LiveAnswer[];
  cur: Cur | null;
  res: Set<ServerResponse>;
  lastPost: number;
  rank: number;
};
type Phase = "lobby" | "question" | "reveal" | "ended";
type Room = {
  pin: string;
  orgId: string;
  ownerId: string;
  title: string;
  items: GameItem[];
  limitMs: number;
  classId: string | null;
  className: string | null;
  roster: { id: string; name: string }[] | null;
  phase: Phase;
  qi: number;
  qStart: number;
  qEnd: number;
  pausedLeft: number | null;
  timer: NodeJS.Timeout | null;
  players: Map<string, Player>;
  hosts: Set<ServerResponse>;
  counts: number[];
  answered: number;
  ranked: Player[];
  qstats: LiveQStat[];
  startedAt: Date;
  sessionId: string | null;
  touched: number;
  endedAt: number;
  hostTimer: NodeJS.Timeout | null;
};

const AiSource = z.object({ subject: z.string().trim().min(1), grade: z.number().int().min(1).max(16), topic: z.string().trim().min(1), level: z.enum(["NB", "TH", "VD"]).default("TH"), type: z.union([QuestionType, z.literal("mix")]).default("mcq"), count: z.number().int().min(2).max(10).default(5) }).strict();
export const CreateRoomInput = z.object({
  source: z.union([z.object({ gameId: z.string().min(1) }).strict(), z.object({ ai: AiSource }).strict(), z.unknown()]),
  classId: z.string().min(1).optional(),
  timerSeconds: z.number().int().min(5).max(120).optional(),
  title: z.string().trim().min(1).max(120).optional(),
});

const AnswerInput = z.object({ q: z.number().int().min(0), choice: z.number().int().min(0).max(9).optional(), text: z.string().max(200).optional() });

export type LiveDeps = { db: Db; ai: Ai; classes: ClassService; games: GameService; secret: string; now?: () => number };

export function createLiveService(deps: LiveDeps) {
  const { db } = deps;
  const now = deps.now ?? Date.now;
  const rooms = new Map<string, Room>();
  const wrong = new Map<string, { n: number; reset: number }>();

  // ---------- Token người chơi (HMAC) ----------
  const sig = (pin: string, id: string) => createHmac("sha256", deps.secret).update(`live:${pin}.${id}`).digest("base64url").slice(0, 22);
  const tokenOf = (pin: string, id: string) => `${pin}.${id}.${sig(pin, id)}`;
  const hostToken = (pin: string) => createHmac("sha256", deps.secret).update(`live-host:${pin}`).digest("base64url").slice(0, 32);
  const eq2 = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

  function playerOf(token: unknown): { room: Room; p: Player } {
    const m = typeof token === "string" ? /^(\d{6})\.([0-9a-f]{16})\.([\w-]{22})$/.exec(token) : null;
    const room = m ? rooms.get(m[1] as string) : undefined;
    const p = room?.players.get(m?.[2] as string);
    if (!m || !room || !p || !eq2(sig(m[1] as string, m[2] as string), m[3] as string)) throw new LiveHttpError(401, "Phiên chơi không còn — hãy vào lại bằng mã PIN");
    return { room, p };
  }

  function wrongPin(ip: string) {
    const t = now();
    const w = wrong.get(ip);
    const cur = !w || w.reset < t ? { n: 0, reset: t + 60_000 } : w;
    cur.n++;
    wrong.set(ip, cur);
    if (cur.n > WRONG_PIN_PER_MIN) throw new LiveHttpError(429, "Nhập sai quá nhiều lần, đợi một phút rồi thử lại");
    throw new NotFoundError("Không tìm thấy phòng chơi. Kiểm tra lại mã PIN.");
  }
  const roomByPin = (pin: string, ip: string): Room => {
    const r = /^\d{6}$/.test(pin) ? rooms.get(pin) : undefined;
    return r ?? wrongPin(ip);
  };

  // ---------- Dựng trạng thái gửi qua SSE ----------
  const publicQ = (r: Room) => {
    const it = r.items[r.qi];
    return it && r.phase !== "lobby" ? { i: r.qi, q: it.q, kind: it.kind, options: it.options } : null;
  };
  const answerText = (it: GameItem) => (it.kind === "choice" ? (it.options?.[it.answer as number] ?? "") : String(it.answer));
  const top = (r: Room, n: number) => r.ranked.slice(0, n).map((p) => ({ name: p.name, score: p.score }));
  const timing = (r: Room) => ({ now: now(), endsAt: r.phase === "question" ? r.qEnd : 0, paused: r.pausedLeft !== null, leftMs: r.pausedLeft ?? Math.max(0, r.qEnd - now()), limitMs: r.limitMs });

  function hostState(r: Room) {
    const it = r.items[r.qi];
    const shown = r.phase === "reveal" || r.phase === "ended";
    return {
      role: "host" as const,
      pin: r.pin,
      title: r.title,
      className: r.className,
      phase: r.phase,
      qi: r.qi,
      total: r.items.length,
      playerCount: r.players.size,
      names: r.phase === "lobby" ? [...r.players.values()].map((p) => p.name) : undefined,
      answered: r.answered,
      question: publicQ(r),
      ...timing(r),
      reveal: shown && it && r.qi >= 0 && r.qstats[r.qstats.length - 1]?.i === r.qi ? { answer: answerText(it), correctIndex: it.kind === "choice" ? it.answer : null, explain: it.explain, counts: r.counts, correct: r.qstats[r.qstats.length - 1]?.correct ?? 0, answeredCount: r.answered, top: top(r, 5) } : null,
      podium: r.phase === "ended" ? top(r, 3) : null,
      sessionId: r.sessionId,
      classId: r.classId,
    };
  }

  function playerState(r: Room, p: Player) {
    const it = r.items[r.qi];
    const shown = r.phase === "reveal" || r.phase === "ended";
    const last = p.answers[p.answers.length - 1];
    return {
      role: "player" as const,
      pin: r.pin,
      title: r.title,
      name: p.name,
      phase: r.phase,
      qi: r.qi,
      total: r.items.length,
      question: publicQ(r),
      ...timing(r),
      answered: r.phase === "question" && p.cur !== null,
      me: { score: p.score, rank: p.rank, streak: p.streak, of: r.players.size },
      result: shown && it && last && last.i === r.qi ? { ok: last.ok, pts: last.pts, answer: answerText(it), explain: it.explain } : null,
      podium: r.phase === "ended" ? top(r, 3) : null,
    };
  }

  const send = (res: ServerResponse, state: object) => {
    if (!res.writableEnded) res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
  };
  function toPlayers(r: Room) {
    for (const p of r.players.values()) for (const res of p.res) send(res, playerState(r, p));
  }
  function toHosts(r: Room) {
    if (r.hosts.size === 0) return;
    const s = hostState(r);
    for (const h of r.hosts) send(h, s);
  }
  /** Gom các thay đổi dồn dập (người vào, người trả lời) thành một lần báo cho màn GV. */
  function hostSoon(r: Room) {
    if (r.hostTimer) return;
    r.hostTimer = setTimeout(() => {
      r.hostTimer = null;
      toHosts(r);
    }, 120);
  }
  const touch = (r: Room) => {
    r.touched = now();
  };

  // ---------- Vòng chơi ----------
  function rankAll(r: Room) {
    r.ranked = rankPlayers([...r.players.values()]);
    r.ranked.forEach((p, i) => {
      p.rank = i + 1;
    });
  }

  function startQuestion(r: Room) {
    r.qi++;
    const it = r.items[r.qi] as GameItem;
    for (const p of r.players.values()) p.cur = null;
    r.counts = new Array(it.kind === "choice" ? (it.options?.length ?? 0) : 0).fill(0);
    r.answered = 0;
    r.phase = "question";
    r.pausedLeft = null;
    r.qStart = now();
    r.qEnd = r.qStart + r.limitMs;
    armTimer(r, r.limitMs + GRACE_MS);
    touch(r);
    toPlayers(r);
    toHosts(r);
  }
  function armTimer(r: Room, ms: number) {
    if (r.timer) clearTimeout(r.timer);
    r.timer = setTimeout(() => reveal(r), ms);
    r.timer.unref?.();
  }

  /** Chốt câu: cộng điểm, xếp hạng, thống kê. Không phát sự kiện (người gọi phát). */
  function settle(r: Room) {
    if (r.timer) clearTimeout(r.timer);
    r.timer = null;
    r.pausedLeft = null;
    const it = r.items[r.qi] as GameItem;
    let correct = 0;
    for (const p of r.players.values()) {
      const c = p.cur;
      if (c?.ok) {
        p.score += c.pts;
        p.streak++;
        p.correct++;
        correct++;
      } else p.streak = 0;
      p.answers.push({ i: r.qi, ok: c?.ok ?? false, pts: c?.pts ?? 0, ms: c?.ms ?? r.limitMs });
    }
    r.qstats.push({ i: r.qi, q: it.q, kind: it.kind, answered: r.answered, correct, counts: r.counts });
    rankAll(r);
    r.phase = "reveal";
  }
  function reveal(r: Room) {
    if (r.phase !== "question") return;
    settle(r);
    touch(r);
    toPlayers(r);
    toHosts(r);
  }

  async function end(r: Room) {
    if (r.phase === "ended") return;
    if (r.phase === "question") settle(r);
    if (r.timer) clearTimeout(r.timer);
    r.timer = null;
    r.phase = "ended";
    r.endedAt = now();
    rankAll(r);
    touch(r);
    toPlayers(r);
    toHosts(r);
    if (r.qstats.length > 0 && r.players.size > 0) {
      r.sessionId = await save(r).catch((e) => {
        console.error("live save", e);
        return null;
      });
      toHosts(r);
    }
  }

  async function save(r: Room): Promise<string> {
    return db.transaction(async (tx) => {
      const [s] = await tx
        .insert(liveSessions)
        .values({ orgId: r.orgId, ownerId: r.ownerId, classId: r.classId, title: r.title, questionCount: r.items.length, qstats: r.qstats, startedAt: r.startedAt })
        .returning({ id: liveSessions.id });
      if (!s) throw new Error("live session insert");
      await tx.insert(liveResults).values(r.ranked.map((p) => ({ sessionId: s.id, studentId: p.studentId, name: p.name, rank: p.rank, score: p.score, correctCount: p.correct, answers: p.answers })));
      return s.id;
    });
  }

  // ---------- Tạo phòng ----------
  async function itemsFor(actor: Actor, raw: unknown): Promise<{ items: GameItem[]; title: string; timer: number }> {
    const o = (raw ?? {}) as Record<string, unknown>;
    if (typeof o.gameId === "string") {
      const g = await deps.games.loadItems(actor, o.gameId);
      return { items: g.items, title: g.title, timer: g.timerSeconds };
    }
    if (o.ai !== undefined) {
      assertCan(actor.role, "game:manage");
      const p = AiSource.safeParse(o.ai);
      if (!p.success) throw new ValidationError(p.error.issues.map((i) => `AI tạo câu: "${i.path.join(".")}" ${i.message}`));
      const { questions } = await draftQuestions(deps.ai, { ...p.data, type: p.data.type });
      return { items: liveItems(questions), title: `${p.data.subject} ${p.data.grade} · ${p.data.topic}`, timer: 0 };
    }
    const parsed = GameSource.safeParse(raw);
    if (!parsed.success) throw new ValidationError(["Nguồn câu hỏi không hợp lệ: cần { gameId } hoặc { examId, code? } hoặc { questionIds } hoặc bộ lọc ngân hàng hoặc { ai: {...} }"]);
    const { qs, label } = await deps.games.resolveSource(actor, parsed.data);
    return { items: liveItems(qs), title: label, timer: 0 };
  }

  async function create(actor: Actor, raw: unknown) {
    assertCan(actor.role, "game:manage");
    const p = CreateRoomInput.safeParse(raw);
    if (!p.success) throw new ValidationError(p.error.issues.map((i) => `Sai dữ liệu tại "${i.path.join(".") || "gốc"}": ${i.message}`));
    const src = await itemsFor(actor, p.data.source);
    const items = src.items.slice(0, 100);
    if (items.length < 1) throw new ValidationError(["Không có câu trắc nghiệm / đúng-sai / trả lời ngắn nào để chơi"]);
    let roster: Room["roster"] = null;
    let classId: string | null = null;
    let className: string | null = null;
    if (p.data.classId) {
      const c = await deps.classes.getClass(actor, p.data.classId);
      if (c.students.length === 0) throw new ValidationError([`Lớp ${c.name} chưa có học viên — thêm danh sách lớp hoặc bỏ chọn lớp để HS tự nhập biệt danh`]);
      classId = c.id;
      className = c.name;
      roster = c.students.map((s) => ({ id: s.id, name: s.fullName }));
    }
    const pin = newPin(new Set(rooms.keys()));
    const room: Room = {
      pin, orgId: actor.orgId, ownerId: actor.userId, title: p.data.title ?? src.title, items,
      limitMs: (p.data.timerSeconds ?? (src.timer || DEFAULT_LIMIT_SECONDS)) * 1000,
      classId, className, roster, phase: "lobby", qi: -1, qStart: 0, qEnd: 0, pausedLeft: null, timer: null,
      players: new Map(), hosts: new Set(), counts: [], answered: 0, ranked: [], qstats: [], startedAt: new Date(), sessionId: null, touched: now(), endedAt: 0, hostTimer: null,
    };
    rooms.set(pin, room);
    return { pin, hostToken: hostToken(pin), title: room.title, total: items.length, className };
  }

  // ---------- Phía GV ----------
  function ownRoom(actor: Actor, pin: string): Room {
    assertCan(actor.role, "game:manage");
    const r = rooms.get(pin);
    if (!r || r.orgId !== actor.orgId || r.ownerId !== actor.userId) throw new NotFoundError("Không tìm thấy phòng chơi");
    return r;
  }

  function listMine(actor: Actor) {
    assertCan(actor.role, "game:manage");
    return [...rooms.values()].filter((r) => r.orgId === actor.orgId && r.ownerId === actor.userId && r.phase !== "ended").map((r) => ({ pin: r.pin, title: r.title, phase: r.phase, players: r.players.size, total: r.items.length }));
  }

  function hostInfo(actor: Actor, pin: string) {
    const r = ownRoom(actor, pin);
    return { hostToken: hostToken(pin), state: hostState(r), joinPath: `/choi?pin=${pin}` };
  }

  async function control(actor: Actor, pin: string, action: unknown) {
    const r = ownRoom(actor, pin);
    touch(r);
    const a = z.enum(["start", "next", "skip", "pause", "resume", "end"]).safeParse(action);
    if (!a.success) throw new ValidationError(["Lệnh không hợp lệ (start, next, skip, pause, resume, end)"]);
    switch (a.data) {
      case "start":
        if (r.phase !== "lobby") throw new LiveHttpError(409, "Trận đã bắt đầu");
        if (r.players.size === 0) throw new LiveHttpError(409, "Chưa có học sinh nào vào phòng");
        startQuestion(r);
        break;
      case "next":
      case "skip":
        if (r.phase === "question") reveal(r);
        else if (r.phase === "reveal") {
          if (r.qi + 1 >= r.items.length) await end(r);
          else startQuestion(r);
        } else throw new LiveHttpError(409, "Không thể chuyển câu lúc này");
        break;
      case "pause":
        if (r.phase !== "question" || r.pausedLeft !== null) throw new LiveHttpError(409, "Chỉ tạm dừng được khi đang đếm giờ");
        r.pausedLeft = Math.max(0, r.qEnd - now());
        if (r.timer) clearTimeout(r.timer);
        r.timer = null;
        toPlayers(r);
        toHosts(r);
        break;
      case "resume":
        if (r.phase !== "question" || r.pausedLeft === null) throw new LiveHttpError(409, "Đang không tạm dừng");
        r.qEnd = now() + r.pausedLeft;
        r.qStart = r.qEnd - r.limitMs;
        armTimer(r, r.pausedLeft + GRACE_MS);
        r.pausedLeft = null;
        toPlayers(r);
        toHosts(r);
        break;
      case "end":
        await end(r);
        break;
    }
    return hostState(r);
  }

  /** Luồng SSE của GV (xác thực bằng hostToken vì EventSource không gửi được header). */
  function attachHost(pin: string, token: string, res: ServerResponse): () => void {
    const r = rooms.get(pin);
    if (!r || !eq2(hostToken(pin), token)) throw new NotFoundError("Không tìm thấy phòng chơi");
    r.hosts.add(res);
    send(res, hostState(r));
    return () => r.hosts.delete(res);
  }

  // ---------- Phía HS ----------
  function lookup(pin: string, ip: string) {
    const r = roomByPin(pin, ip);
    const taken = new Set([...r.players.values()].filter((p) => p.studentId && p.res.size > 0).map((p) => p.studentId));
    return {
      title: r.title,
      phase: r.phase,
      players: r.players.size,
      roster: r.roster ? r.roster.map((s) => ({ id: s.id, name: s.name, taken: taken.has(s.id) })) : null,
    };
  }

  function join(pin: string, ip: string, raw: unknown) {
    const r = roomByPin(pin, ip);
    const b = (raw ?? {}) as { name?: unknown; studentId?: unknown; token?: unknown };
    if (typeof b.token === "string") {
      try {
        const x = playerOf(b.token);
        if (x.room.pin === pin) return { token: b.token, name: x.p.name };
      } catch {
        /* token cũ: vào như người mới */
      }
    }
    if (r.phase === "ended") throw new LiveHttpError(409, "Trận này đã kết thúc");
    if (r.roster) {
      const s = typeof b.studentId === "string" ? r.roster.find((x) => x.id === b.studentId) : undefined;
      if (!s) throw new LiveHttpError(400, "Hãy chọn tên của bạn trong danh sách lớp");
      const existing = [...r.players.values()].find((p) => p.studentId === s.id);
      if (existing) {
        if (existing.res.size > 0) throw new LiveHttpError(409, "Tên này đang được dùng trên một máy khác");
        return { token: tokenOf(pin, existing.id), name: existing.name }; // mất token (xoá bộ nhớ trình duyệt): cho vào lại
      }
      return { token: add(r, s.name, s.id), name: s.name };
    }
    const name = cleanName(b.name);
    if (!name) throw new LiveHttpError(400, "Biệt danh cần 1–24 ký tự");
    if ([...r.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new LiveHttpError(409, "Biệt danh này đã có người dùng, chọn tên khác");
    return { token: add(r, name, null), name };
  }

  function add(r: Room, name: string, studentId: string | null): string {
    if (r.players.size >= MAX_PLAYERS) throw new LiveHttpError(409, "Phòng đã đầy");
    const id = randomBytes(8).toString("hex");
    r.players.set(id, { id, name, studentId, score: 0, streak: 0, correct: 0, answers: [], cur: null, res: new Set(), lastPost: 0, rank: 0 });
    // vào giữa trận: coi như chưa trả lời các câu đã qua
    touch(r);
    hostSoon(r);
    return tokenOf(r.pin, id);
  }

  function attachPlayer(token: string, res: ServerResponse): () => void {
    const { room, p } = playerOf(token);
    p.res.add(res);
    send(res, playerState(room, p));
    hostSoon(room);
    return () => {
      p.res.delete(res);
    };
  }

  function answer(raw: unknown) {
    const b = (raw ?? {}) as { t?: unknown };
    const { room: r, p } = playerOf(b.t);
    const a = AnswerInput.safeParse(raw);
    if (!a.success) throw new LiveHttpError(400, "Câu trả lời không hợp lệ");
    const t = now();
    if (t - p.lastPost < MIN_GAP_MS) throw new LiveHttpError(429, "Bạn bấm nhanh quá, thử lại");
    p.lastPost = t;
    if (r.phase !== "question" || r.pausedLeft !== null || t > r.qEnd + GRACE_MS) throw new LiveHttpError(409, "Đã hết giờ");
    if (a.data.q !== r.qi) throw new LiveHttpError(409, "Câu hỏi đã chuyển");
    if (p.cur) throw new LiveHttpError(409, "Bạn đã trả lời câu này");
    const it = r.items[r.qi] as GameItem;
    if (it.kind === "choice") {
      if (a.data.choice === undefined || a.data.choice >= (it.options?.length ?? 0)) throw new LiveHttpError(400, "Chưa chọn đáp án");
    } else if (!a.data.text?.trim()) throw new LiveHttpError(400, "Chưa nhập đáp án");
    const ms = Math.min(r.limitMs, Math.max(0, t - r.qStart));
    const ok = isCorrect(it, a.data);
    p.cur = { a: a.data, ok, ms, pts: scoreAnswer(ok, ms, r.limitMs, p.streak + 1) };
    if (it.kind === "choice" && a.data.choice !== undefined) r.counts[a.data.choice] = (r.counts[a.data.choice] ?? 0) + 1;
    r.answered++;
    touch(r);
    const live = [...r.players.values()].filter((x) => x.res.size > 0);
    if (live.length > 0 && live.every((x) => x.cur)) reveal(r);
    else hostSoon(r);
    return { accepted: true };
  }

  // ---------- Kết quả đã lưu ----------
  async function sessionRow(actor: Actor, id: string) {
    assertCan(actor.role, "game:read");
    if (!z.uuid().safeParse(id).success) throw new NotFoundError("Không tìm thấy phiên chơi");
    const [s] = await db.select().from(liveSessions).where(and(eq(liveSessions.id, id), eq(liveSessions.orgId, actor.orgId)));
    if (!s) throw new NotFoundError("Không tìm thấy phiên chơi");
    return s;
  }

  async function listSessions(actor: Actor) {
    assertCan(actor.role, "game:read");
    const rows = await db.select().from(liveSessions).where(eq(liveSessions.orgId, actor.orgId)).orderBy(desc(liveSessions.endedAt)).limit(30);
    return rows.map((s) => ({ id: s.id, title: s.title, classId: s.classId, questionCount: s.questionCount, endedAt: s.endedAt.toISOString() }));
  }

  async function getSession(actor: Actor, id: string) {
    const s = await sessionRow(actor, id);
    const results = await db.select().from(liveResults).where(eq(liveResults.sessionId, s.id));
    const pct = (q: LiveQStat) => (q.answered > 0 ? Math.round(((q.answered - q.correct) / q.answered) * 100) : 0);
    return {
      id: s.id, title: s.title, classId: s.classId, questionCount: s.questionCount, endedAt: s.endedAt.toISOString(),
      results: results.sort((a, b) => a.rank - b.rank).map((x) => ({ rank: x.rank, name: x.name, studentId: x.studentId, score: x.score, correct: x.correctCount, scored10: gradebookScore(x.correctCount, s.questionCount) })),
      hardest: s.qstats.map((q) => ({ i: q.i + 1, q: q.q, answered: q.answered, wrongPct: pct(q) })).filter((q) => q.answered > 0).sort((a, b) => b.wrongPct - a.wrongPct).slice(0, 5),
    };
  }

  /** Ghi điểm (thang 10 = tỉ lệ câu đúng) của HS đã chọn tên trong lớp vào sổ điểm, qua service sổ điểm có sẵn. */
  async function writeGradebook(actor: Actor, id: string, raw: unknown) {
    const s = await sessionRow(actor, id);
    const b = z.object({ column: z.string().trim().min(1), term: z.enum(["HK1", "HK2"]).default("HK1") }).safeParse(raw);
    if (!b.success) throw new ValidationError(["Cần chọn cột điểm (column) và học kỳ (term: HK1 | HK2)"]);
    if (!s.classId) throw new ValidationError(["Phiên chơi này không gắn lớp nên không ghi vào sổ điểm được"]);
    const [cls] = await db.select({ scale: classes.scale }).from(classes).where(eq(classes.id, s.classId));
    const rows = (await db.select().from(liveResults).where(eq(liveResults.sessionId, s.id))).filter((x) => x.studentId);
    if (rows.length === 0) throw new ValidationError(["Không có học viên nào của lớp trong kết quả"]);
    const entries: Record<string, number> = {};
    for (const x of rows) {
      const v = gradebookScore(x.correctCount, s.questionCount);
      entries[x.studentId as string] = cls?.scale === "TT27" ? Math.max(1, Math.round(v)) : v;
    }
    return deps.classes.enterScores(actor, s.classId, b.data.column, entries, b.data.term);
  }

  // ---------- Dọn dẹp ----------
  const sweeper = setInterval(() => {
    const t = now();
    for (const r of rooms.values()) {
      for (const p of r.players.values()) for (const res of p.res) if (!res.writableEnded) res.write(": ping\n\n");
      for (const h of r.hosts) if (!h.writableEnded) h.write(": ping\n\n");
      if (r.phase === "ended" ? t - r.endedAt > ENDED_KEEP_MS : t - r.touched > ROOM_IDLE_MS) void drop(r);
    }
    for (const [ip, w] of wrong) if (w.reset < t) wrong.delete(ip);
  }, HEARTBEAT_MS);
  sweeper.unref();

  async function drop(r: Room) {
    await end(r); // phòng bỏ quên mà đã chơi dở vẫn được lưu kết quả
    if (r.hostTimer) clearTimeout(r.hostTimer);
    for (const p of r.players.values()) for (const res of p.res) res.end();
    for (const h of r.hosts) h.end();
    rooms.delete(r.pin);
  }

  async function dispose() {
    clearInterval(sweeper);
    for (const r of [...rooms.values()]) {
      if (r.timer) clearTimeout(r.timer);
      if (r.hostTimer) clearTimeout(r.hostTimer);
      for (const p of r.players.values()) for (const res of p.res) res.end();
      for (const h of r.hosts) h.end();
      rooms.delete(r.pin);
    }
  }

  return { create, listMine, hostInfo, control, attachHost, lookup, join, attachPlayer, answer, listSessions, getSession, writeGradebook, dispose, HEARTBEAT_MS };
}
export type LiveService = ReturnType<typeof createLiveService>;
