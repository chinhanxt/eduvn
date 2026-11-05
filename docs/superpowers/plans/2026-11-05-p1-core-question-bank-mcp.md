# P1 — Lõi + Ngân hàng câu hỏi + Ra đề + Chấm + MCP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng `server/` (EDU-CORE): xác thực token Keycloak, tổ chức cá nhân tự tạo, ngân hàng câu hỏi 4 dạng, ra N mã đề theo ma trận CV 7991, đáp án, file .docx, chấm điểm, và MCP server để AI chat gọi được toàn bộ.

**Architecture:** Một tiến trình Fastify duy nhất phục vụ REST `/api/*`, MCP `/mcp` (Streamable HTTP, stateless, JSON) và link tải ký `/dl/:token`. Nghiệp vụ thuần ở `src/domain/` (không I/O); `src/service.ts` ghép domain + DB + phân quyền; HTTP và MCP chỉ là lớp vỏ mỏng gọi service. Postgres qua Drizzle; test dùng PGlite trong tiến trình.

**Tech Stack:** Node 24, pnpm workspace, TypeScript 7 (ESM, strict), Fastify 5, @modelcontextprotocol/sdk 1.32, Drizzle ORM 0.45 + drizzle-kit 0.31, PGlite 0.5 (test), pg 8, jose 6, zod 4, docx 9, vitest 5, tsx 4. Hạ tầng dev: Postgres 17, Keycloak 26 (docker compose).

**Spec:** `docs/specs/2026-11-05-eduvn-design.md` (yêu cầu R1–R5). Bối cảnh sản phẩm: `PRODUCT.md`. Module: `docs/modules/01,02,03,05`.

## Global Constraints

- Node `>=24`; mọi package `"type": "module"`; TypeScript `strict: true`, `moduleResolution: "Bundler"`, `noEmit`.
- Bản thư viện tối thiểu: `fastify@^5.12.8`, `@modelcontextprotocol/sdk@^1.32.2`, `drizzle-orm@^0.45.4`, `drizzle-kit@^0.31.11`, `@electric-sql/pglite@^0.5.15`, `pg@^8.23.1`, `jose@^6.2.15`, `zod@^4.6.7`, `docx@^9.15.2`, `vitest@^5.1.0`, `typescript@^7.0.2`, `tsx@^4.23.15`.
- Test DB = PGlite trong tiến trình. **Không bật Docker khi chạy test.** Docker chỉ dùng ở Task 13 (smoke).
- Một tác vụ nặng mỗi lúc trên máy dev; không chạy song song nhiều bộ test/build.
- Logic nghiệp vụ chỉ trong `server/src/domain/` — không import DB/HTTP ở đó.
- Định danh code tiếng Anh; thông báo cho người dùng tiếng Việt có dấu; tên tool MCP tiếng Việt không dấu `snake_case`.
- Cổng dev: server 4310, Postgres 5442, Keycloak 8180.
- Điểm mặc định (R4.1): mcq 0,25 · đúng/sai theo số ý đúng `[0, 0.1, 0.25, 0.5, 1]` · trả lời ngắn 0,25 (Toán 0,5).
- Mã đề bắt đầu từ `101`; số mã đề 1–24.
- Mọi lệnh chạy từ gốc repo `~/projects/eduvn`.

## Đã kiểm trước (probe 2026-11-05, `/tmp/eduvn-probe`)

- Fastify + `StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })` + `reply.hijack()` chạy được với `Client` + `StreamableHTTPClientTransport`; lỗi ném trong tool → `isError: true`.
- `registerTool(name, { inputSchema: <zod raw shape> }, handler)` nhận `z.discriminatedUnion` và `z.coerce.number()`.
- `migrate()` của `drizzle-orm/pglite/migrator` phải gọi trên kiểu DB cụ thể **trước** khi gán sang kiểu chung `Db`.
- `docx` `Packer.toBuffer` + `jszip` đọc lại `word/document.xml` giữ nguyên tiếng Việt.

## File Structure

```
package.json                    workspace root scripts
pnpm-workspace.yaml             packages: [server]
server/
  package.json · tsconfig.json · vitest.config.ts · drizzle.config.ts · .env.example
  drizzle/                      migration SQL sinh bởi drizzle-kit
  src/
    domain/rng.ts               PRNG có seed + shuffle
    domain/question.ts          schema 4 dạng câu, bộ lọc
    domain/scoring.ts           quy tắc điểm CV 7991, chấm từng câu
    domain/matrix.ts            ma trận đề, chọn câu theo ô
    domain/variants.ts          trộn mã đề, đáp án, chấm cả đề
    domain/authz.ts             vai trò, hành động, can/assertCan
    db/schema.ts                bảng Drizzle
    db/client.ts                kiểu Db, kết nối Postgres + migrate
    db/repo.ts                  truy vấn
    errors.ts                   NotFoundError, UnauthorizedError
    service.ts                  nghiệp vụ có phân quyền (dùng chung REST/MCP)
    auth/verify.ts              xác thực JWT (JWKS)
    auth/download.ts            ký/kiểm link tải HMAC
    auth/actor.ts               Identity → Actor, tự tạo tổ chức cá nhân
    export/docx.ts              đề + đáp án .docx
    http/app.ts                 Fastify: REST, /dl, /mcp
    mcp/server.ts               MCP tools
    config.ts · main.ts         đọc env, khởi động
  tests/
    helpers/{db,tokens,fixtures,app}.ts
    domain/*.test.ts · db/repo.test.ts · service.test.ts
    auth/*.test.ts · export/docx.test.ts · http/api.test.ts · mcp/mcp.test.ts · config.test.ts
infra/docker-compose.yml · infra/keycloak/realm-eduvn.json
scripts/smoke.sh
```

## Truy vết yêu cầu → Task

| Yêu cầu | Task |
|---|---|
| R1.1–R1.2 token, sub | 9, 11 |
| R1.3 tổ chức cá nhân | 11 |
| R1.4 vai trò/hành động | 6, 8 |
| R1.5 `x-org-id` | 11 |
| R2.1–R2.2 dạng câu, trường | 2 |
| R2.3–R2.4 theo tổ chức, lọc | 7, 8 |
| R3.1–R3.3 ma trận, thiếu câu, không trùng | 4 |
| R3.4–R3.6 mã đề, seed, đáp án | 1, 5 |
| R3.7 .docx | 10, 11 |
| R3.8 link ký 15 phút | 11 |
| R4.1–R4.4 chấm | 3, 5 |
| R5.1–R5.4 MCP | 11, 12 |
| Chạy thật với Keycloak | 13 |

---

### Task 1: Workspace + PRNG có seed

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`
- Create: `server/src/domain/rng.ts`
- Test: `server/tests/domain/rng.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `type Rng = () => number`; `mulberry32(seed: number): Rng`; `shuffle<T>(items: readonly T[], rng: Rng): T[]` (không sửa mảng gốc)

- [ ] **Step 1: Tạo workspace**

`package.json`:
```json
{
  "name": "eduvn",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - server
```

`server/package.json`:
```json
{
  "name": "@eduvn/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "start": "tsx --env-file=.env src/main.ts",
    "dev": "tsx watch --env-file=.env src/main.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate"
  }
}
```

`server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src", "tests", "drizzle.config.ts", "vitest.config.ts"]
}
```

`server/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
```

Cài thư viện:
```bash
cd server
pnpm add fastify@^5.12.8 @modelcontextprotocol/sdk@^1.32.2 drizzle-orm@^0.45.4 pg@^8.23.1 jose@^6.2.15 zod@^4.6.7 docx@^9.15.2
pnpm add -D typescript@^7.0.2 tsx@^4.23.15 vitest@^5.1.0 drizzle-kit@^0.31.11 @electric-sql/pglite@^0.5.15 @types/node@^24 @types/pg jszip@^3.10.1
cd ..
```

- [ ] **Step 2: Viết test lỗi** — `server/tests/domain/rng.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { mulberry32, shuffle } from "../../src/domain/rng";

describe("mulberry32", () => {
  it("cùng seed cho cùng dãy số", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("khác seed cho dãy khác", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });

  it("giá trị nằm trong [0, 1)", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("là hoán vị, tái lập theo seed, không sửa mảng gốc", () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = shuffle(src, mulberry32(7));
    const s2 = shuffle(src, mulberry32(7));
    expect(s1).toEqual(s2);
    expect([...s1].sort((x, y) => x - y)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
```

- [ ] **Step 3: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/domain/rng.test.ts`
Expected: FAIL — không resolve được import `../../src/domain/rng`.

- [ ] **Step 4: Code tối thiểu** — `server/src/domain/rng.ts`

```ts
export type Rng = () => number;

/** PRNG 32-bit có seed (mulberry32): cùng seed → cùng dãy, dùng để đề tái lập được. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates trên bản sao. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
```

- [ ] **Step 5: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/domain/rng.test.ts && pnpm -C server typecheck`
Expected: 4 test PASS; typecheck không lỗi.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml server/package.json server/tsconfig.json server/vitest.config.ts server/src/domain/rng.ts server/tests/domain/rng.test.ts
git commit -m "feat(server): workspace + seeded PRNG"
```

---

### Task 2: Schema câu hỏi 4 dạng + fixtures test

**Files:**
- Create: `server/src/domain/question.ts`
- Create: `server/tests/helpers/fixtures.ts`
- Test: `server/tests/domain/question.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `LEVELS = ["NB","TH","VD"]`, `QUESTION_TYPES = ["mcq","true_false","short_answer","essay"]`
  - zod + type: `Level`, `QuestionType`, `QuestionInput` (discriminated union theo `type`), `QuestionFilter`
  - `type StoredQuestion = QuestionInput & { id: string }`
  - `parseQuestion(input: unknown): QuestionInput` (ném `ZodError`)
  - fixtures: `mcq(p?)`, `tf(p?)`, `short(p?)`, `essay(p?)` trả câu hợp lệ môn "Toán", lớp 10, chủ đề "Mệnh đề", mức "NB"; `stored(q, id?)`

- [ ] **Step 1: Fixtures** — `server/tests/helpers/fixtures.ts`

```ts
import type { QuestionInput } from "../../src/domain/question";

type Of<T extends QuestionInput["type"]> = Extract<QuestionInput, { type: T }>;

const base = { subject: "Toán", grade: 10, topic: "Mệnh đề", level: "NB" as const, tags: [] as string[] };

export function mcq(p: Partial<Of<"mcq">> = {}): Of<"mcq"> {
  return {
    ...base,
    type: "mcq",
    stem: "Câu nào sau đây là mệnh đề?",
    options: ["2 + 2 = 4", "Bạn khỏe không?", "Hãy đóng cửa lại!", "x > 1"],
    answer: 0,
    ...p,
  };
}

export function tf(p: Partial<Of<"true_false">> = {}): Of<"true_false"> {
  return {
    ...base,
    type: "true_false",
    stem: "Xét tính đúng sai của các mệnh đề sau:",
    statements: ["3 là số nguyên tố", "4 là số lẻ", "√2 là số hữu tỉ", "0 là số tự nhiên"],
    answer: [true, false, false, true],
    ...p,
  };
}

export function short(p: Partial<Of<"short_answer">> = {}): Of<"short_answer"> {
  return { ...base, type: "short_answer", stem: "Viết 3/2 dưới dạng số thập phân.", answer: "1,5", ...p };
}

export function essay(p: Partial<Of<"essay">> = {}): Of<"essay"> {
  return {
    ...base,
    type: "essay",
    stem: "Chứng minh √2 là số vô tỉ.",
    rubric: "Giả sử phản chứng (0,5đ); suy ra mâu thuẫn (0,5đ).",
    points: 1,
    ...p,
  };
}

let counter = 0;
export function stored<T extends QuestionInput>(q: T, id = `q${++counter}`): T & { id: string } {
  return { ...q, id };
}
```

- [ ] **Step 2: Viết test lỗi** — `server/tests/domain/question.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { QuestionFilter, parseQuestion } from "../../src/domain/question";
import { essay, mcq, short, tf } from "../helpers/fixtures";

describe("parseQuestion", () => {
  it("nhận đủ 4 dạng hợp lệ", () => {
    for (const q of [mcq(), tf(), short(), essay()]) {
      expect(parseQuestion(q).type).toBe(q.type);
    }
  });

  it("tags mặc định là []", () => {
    const { tags: _t, ...noTags } = mcq();
    expect(parseQuestion(noTags).tags).toEqual([]);
  });

  it("mcq phải có đúng 4 phương án", () => {
    expect(() => parseQuestion(mcq({ options: ["a", "b", "c"] }))).toThrow();
  });

  it("mcq answer trong 0–3", () => {
    expect(() => parseQuestion(mcq({ answer: 4 }))).toThrow();
  });

  it("true_false phải có 4 ý và 4 đáp án", () => {
    expect(() => parseQuestion(tf({ answer: [true, false, true] }))).toThrow();
    expect(() => parseQuestion(tf({ statements: ["a", "b"] }))).toThrow();
  });

  it("essay cần points dương", () => {
    expect(() => parseQuestion(essay({ points: 0 }))).toThrow();
  });

  it("từ chối dạng lạ, mức độ lạ, lớp ngoài 1–16", () => {
    expect(() => parseQuestion({ ...mcq(), type: "matching" })).toThrow();
    expect(() => parseQuestion(mcq({ level: "XX" as never }))).toThrow();
    expect(() => parseQuestion(mcq({ grade: 17 }))).toThrow();
  });
});

describe("QuestionFilter", () => {
  it("ép kiểu grade/limit từ query string", () => {
    expect(QuestionFilter.parse({ subject: "Toán", grade: "10", limit: "5" })).toEqual({ subject: "Toán", grade: 10, limit: 5 });
  });

  it("bắt buộc subject và grade", () => {
    expect(() => QuestionFilter.parse({ subject: "Toán" })).toThrow();
  });
});
```

- [ ] **Step 3: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/domain/question.test.ts`
Expected: FAIL — không resolve được `../../src/domain/question`.

- [ ] **Step 4: Code** — `server/src/domain/question.ts`

```ts
import { z } from "zod";

export const LEVELS = ["NB", "TH", "VD"] as const; // Nhận biết, Thông hiểu, Vận dụng
export const QUESTION_TYPES = ["mcq", "true_false", "short_answer", "essay"] as const;

export const Level = z.enum(LEVELS);
export type Level = z.infer<typeof Level>;
export const QuestionType = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof QuestionType>;

const base = {
  subject: z.string().trim().min(1),
  /** 1–12: lớp phổ thông; 13–16: năm 1–4 đại học. */
  grade: z.number().int().min(1).max(16),
  topic: z.string().trim().min(1),
  level: Level,
  stem: z.string().trim().min(1),
  explanation: z.string().optional(),
  tags: z.array(z.string()).default([]),
};

export const McqQuestion = z.object({
  ...base,
  type: z.literal("mcq"),
  options: z.array(z.string().trim().min(1)).length(4),
  /** Chỉ số phương án đúng 0–3 (A–D). */
  answer: z.number().int().min(0).max(3),
});

export const TrueFalseQuestion = z.object({
  ...base,
  type: z.literal("true_false"),
  statements: z.array(z.string().trim().min(1)).length(4),
  answer: z.array(z.boolean()).length(4),
});

export const ShortAnswerQuestion = z.object({
  ...base,
  type: z.literal("short_answer"),
  answer: z.string().trim().min(1),
});

export const EssayQuestion = z.object({
  ...base,
  type: z.literal("essay"),
  rubric: z.string().trim().min(1),
  points: z.number().positive(),
});

export const QuestionInput = z.discriminatedUnion("type", [McqQuestion, TrueFalseQuestion, ShortAnswerQuestion, EssayQuestion]);
export type QuestionInput = z.infer<typeof QuestionInput>;
export type StoredQuestion = QuestionInput & { id: string };

export function parseQuestion(input: unknown): QuestionInput {
  return QuestionInput.parse(input);
}

export const QuestionFilter = z.object({
  subject: z.string().trim().min(1),
  grade: z.coerce.number().int().min(1).max(16),
  topic: z.string().trim().min(1).optional(),
  level: Level.optional(),
  type: QuestionType.optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
});
export type QuestionFilter = z.infer<typeof QuestionFilter>;
```

- [ ] **Step 5: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/domain/question.test.ts && pnpm -C server typecheck`
Expected: 9 test PASS; typecheck sạch.

- [ ] **Step 6: Commit**

```bash
git add server/src/domain/question.ts server/tests/helpers/fixtures.ts server/tests/domain/question.test.ts
git commit -m "feat(domain): question schema for 4 Vietnamese exam item types"
```

---

### Task 3: Quy tắc điểm CV 7991 + chấm từng câu

**Files:**
- Create: `server/src/domain/scoring.ts`
- Test: `server/tests/domain/scoring.test.ts`

**Interfaces:**
- Consumes: `QuestionInput` (Task 2)
- Produces:
  - `type PointRules = { mcq: number; trueFalseByCorrect: readonly [number, number, number, number, number]; shortAnswer: number }`
  - `DEFAULT_RULES`, `MATH_RULES`
  - zod + type `ResponseValue = number | boolean[] | string | null`
  - `rulesForSubject(subject: string): PointRules`
  - `normalizeShort(s: string): string`, `round2(n: number): number`
  - `maxPoints(q: QuestionInput, rules: PointRules): number`
  - `scoreItem(q: QuestionInput, r: ResponseValue | undefined, rules?: PointRules): number | null` (essay → `null`)

- [ ] **Step 1: Viết test lỗi** — `server/tests/domain/scoring.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, MATH_RULES, maxPoints, normalizeShort, round2, rulesForSubject, scoreItem } from "../../src/domain/scoring";
import { essay, mcq, short, tf } from "../helpers/fixtures";

describe("scoreItem", () => {
  it("mcq: đúng 0,25, sai 0", () => {
    expect(scoreItem(mcq({ answer: 2 }), 2)).toBe(0.25);
    expect(scoreItem(mcq({ answer: 2 }), 1)).toBe(0);
    expect(scoreItem(mcq(), undefined)).toBe(0);
  });

  it("đúng/sai: bậc thang theo số ý đúng 0→0, 1→0,1, 2→0,25, 3→0,5, 4→1", () => {
    const q = tf({ answer: [true, false, false, true] });
    expect(scoreItem(q, [false, true, true, false])).toBe(0);
    expect(scoreItem(q, [true, true, true, false])).toBe(0.1);
    expect(scoreItem(q, [true, false, true, false])).toBe(0.25);
    expect(scoreItem(q, [true, false, false, false])).toBe(0.5);
    expect(scoreItem(q, [true, false, false, true])).toBe(1);
  });

  it("đúng/sai: bài làm thiếu ý → 0", () => {
    expect(scoreItem(tf(), [true, false])).toBe(0);
    expect(scoreItem(tf(), null)).toBe(0);
  });

  it("trả lời ngắn: chuẩn hoá dấu phẩy, khoảng trắng, hoa thường", () => {
    const q = short({ answer: "1,5" });
    expect(scoreItem(q, " 1.5 ")).toBe(0.25);
    expect(scoreItem(q, "1,6")).toBe(0);
    expect(scoreItem(q, "1.5", MATH_RULES)).toBe(0.5);
  });

  it("tự luận: không chấm tự động", () => {
    expect(scoreItem(essay(), "bài làm")).toBeNull();
  });
});

describe("helpers", () => {
  it("normalizeShort", () => {
    expect(normalizeShort(" -1, 5 ")).toBe("-1.5");
    expect(normalizeShort("ABC")).toBe("abc");
  });

  it("round2", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(0.25 * 3 + 0.1)).toBe(0.85);
  });

  it("maxPoints", () => {
    expect(maxPoints(mcq(), DEFAULT_RULES)).toBe(0.25);
    expect(maxPoints(tf(), DEFAULT_RULES)).toBe(1);
    expect(maxPoints(short(), MATH_RULES)).toBe(0.5);
    expect(maxPoints(essay({ points: 2 }), DEFAULT_RULES)).toBe(2);
  });

  it("rulesForSubject: môn Toán (mọi kiểu viết) dùng 0,5đ trả lời ngắn", () => {
    expect(rulesForSubject("Toán")).toBe(MATH_RULES);
    expect(rulesForSubject("TOÁN HỌC")).toBe(MATH_RULES);
    expect(rulesForSubject("toan")).toBe(MATH_RULES);
    expect(rulesForSubject("Ngữ văn")).toBe(DEFAULT_RULES);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/domain/scoring.test.ts`
Expected: FAIL — không resolve được `../../src/domain/scoring`.

- [ ] **Step 3: Code** — `server/src/domain/scoring.ts`

```ts
import { z } from "zod";
import type { QuestionInput } from "./question";

export type PointRules = {
  mcq: number;
  /** Điểm theo số ý đúng 0..4 của câu đúng/sai. */
  trueFalseByCorrect: readonly [number, number, number, number, number];
  shortAnswer: number;
};

/** CV 7991/BGDĐT-GDTrH. */
export const DEFAULT_RULES: PointRules = { mcq: 0.25, trueFalseByCorrect: [0, 0.1, 0.25, 0.5, 1], shortAnswer: 0.25 };
export const MATH_RULES: PointRules = { ...DEFAULT_RULES, shortAnswer: 0.5 };

export const ResponseValue = z.union([z.number().int(), z.array(z.boolean()), z.string(), z.null()]);
export type ResponseValue = z.infer<typeof ResponseValue>;

function foldVietnamese(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

export function rulesForSubject(subject: string): PointRules {
  return foldVietnamese(subject).startsWith("toan") ? MATH_RULES : DEFAULT_RULES;
}

export function normalizeShort(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function maxPoints(q: QuestionInput, rules: PointRules): number {
  switch (q.type) {
    case "mcq":
      return rules.mcq;
    case "true_false":
      return rules.trueFalseByCorrect[4];
    case "short_answer":
      return rules.shortAnswer;
    case "essay":
      return q.points;
  }
}

export function scoreItem(q: QuestionInput, r: ResponseValue | undefined, rules: PointRules = DEFAULT_RULES): number | null {
  switch (q.type) {
    case "mcq":
      return r === q.answer ? rules.mcq : 0;
    case "true_false": {
      if (!Array.isArray(r) || r.length !== 4) return 0;
      const correct = q.answer.filter((v, i) => r[i] === v).length;
      return rules.trueFalseByCorrect[correct] ?? 0;
    }
    case "short_answer":
      return typeof r === "string" && normalizeShort(r) === normalizeShort(q.answer) ? rules.shortAnswer : 0;
    case "essay":
      return null;
  }
}
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/domain/scoring.test.ts && pnpm -C server typecheck`
Expected: 9 test PASS; typecheck sạch.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/scoring.ts server/tests/domain/scoring.test.ts
git commit -m "feat(domain): CV 7991 point rules and per-item scoring"
```

---

### Task 4: Ma trận đề + chọn câu theo ô

**Files:**
- Create: `server/src/domain/matrix.ts`
- Test: `server/tests/domain/matrix.test.ts`

**Interfaces:**
- Consumes: `Level`, `QuestionType`, `StoredQuestion` (Task 2); `Rng`, `shuffle`, `mulberry32` (Task 1)
- Produces:
  - zod + type `MatrixCell = { topic: string; level: Level; type: QuestionType; count: number }`
  - zod + type `ExamMatrix = { subject: string; grade: number; cells: MatrixCell[] }`
  - `type Shortage = { cell: MatrixCell; need: number; have: number }`
  - `selectQuestions(pool: readonly StoredQuestion[], matrix: ExamMatrix, rng: Rng): { selected: StoredQuestion[]; shortages: Shortage[] }`

- [ ] **Step 1: Viết test lỗi** — `server/tests/domain/matrix.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { ExamMatrix, selectQuestions } from "../../src/domain/matrix";
import { mulberry32 } from "../../src/domain/rng";
import { mcq, stored } from "../helpers/fixtures";

const pool = [
  stored(mcq({ stem: "M1" }), "md-nb-1"),
  stored(mcq({ stem: "M2" }), "md-nb-2"),
  stored(mcq({ stem: "M3" }), "md-nb-3"),
  stored(mcq({ stem: "M4", level: "TH" }), "md-th-1"),
  stored(mcq({ stem: "T1", topic: "Tập hợp" }), "th-ok"),
  stored(mcq({ stem: "T2", topic: "Tập hợp", grade: 11 }), "th-g11"),
  stored(mcq({ stem: "T3", topic: "Tập hợp", subject: "Vật lí" }), "th-ly"),
];
const m = (cells: ExamMatrix["cells"]): ExamMatrix => ({ subject: "Toán", grade: 10, cells });

describe("selectQuestions", () => {
  it("chọn đúng số câu mỗi ô", () => {
    const { selected, shortages } = selectQuestions(
      pool,
      m([
        { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 },
        { topic: "Mệnh đề", level: "TH", type: "mcq", count: 1 },
      ]),
      mulberry32(1),
    );
    expect(shortages).toEqual([]);
    expect(selected).toHaveLength(3);
    expect(selected.filter((q) => q.level === "NB")).toHaveLength(2);
    expect(selected.map((q) => q.id)).toContain("md-th-1");
  });

  it("hai ô cùng tiêu chí không lấy trùng câu", () => {
    const { selected, shortages } = selectQuestions(
      pool,
      m([
        { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 },
        { topic: "Mệnh đề", level: "NB", type: "mcq", count: 1 },
      ]),
      mulberry32(3),
    );
    expect(shortages).toEqual([]);
    expect(new Set(selected.map((q) => q.id)).size).toBe(3);
  });

  it("báo thiếu: ô nào, cần bao nhiêu, có bao nhiêu", () => {
    const cell = { topic: "Mệnh đề", level: "NB" as const, type: "mcq" as const, count: 4 };
    const { shortages } = selectQuestions(pool, m([cell]), mulberry32(1));
    expect(shortages).toEqual([{ cell, need: 4, have: 3 }]);
  });

  it("chỉ lấy đúng môn và lớp của ma trận", () => {
    const { selected, shortages } = selectQuestions(pool, m([{ topic: "Tập hợp", level: "NB", type: "mcq", count: 3 }]), mulberry32(1));
    expect(selected.map((q) => q.id)).toEqual(["th-ok"]);
    expect(shortages[0]?.have).toBe(1);
  });

  it("cùng seed → cùng lựa chọn", () => {
    const matrix = m([{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 }]);
    const a = selectQuestions(pool, matrix, mulberry32(9)).selected.map((q) => q.id);
    const b = selectQuestions(pool, matrix, mulberry32(9)).selected.map((q) => q.id);
    expect(a).toEqual(b);
  });
});

describe("ExamMatrix", () => {
  it("từ chối ô có count 0 và ma trận rỗng", () => {
    expect(() => ExamMatrix.parse(m([{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 0 }]))).toThrow();
    expect(() => ExamMatrix.parse(m([]))).toThrow();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/domain/matrix.test.ts`
Expected: FAIL — không resolve được `../../src/domain/matrix`.

- [ ] **Step 3: Code** — `server/src/domain/matrix.ts`

```ts
import { z } from "zod";
import { Level, QuestionType, type StoredQuestion } from "./question";
import { type Rng, shuffle } from "./rng";

export const MatrixCell = z.object({
  topic: z.string().trim().min(1),
  level: Level,
  type: QuestionType,
  count: z.number().int().positive(),
});
export type MatrixCell = z.infer<typeof MatrixCell>;

export const ExamMatrix = z.object({
  subject: z.string().trim().min(1),
  grade: z.number().int().min(1).max(16),
  cells: z.array(MatrixCell).min(1),
});
export type ExamMatrix = z.infer<typeof ExamMatrix>;

export type Shortage = { cell: MatrixCell; need: number; have: number };

export function selectQuestions(
  pool: readonly StoredQuestion[],
  matrix: ExamMatrix,
  rng: Rng,
): { selected: StoredQuestion[]; shortages: Shortage[] } {
  const used = new Set<string>();
  const selected: StoredQuestion[] = [];
  const shortages: Shortage[] = [];

  for (const cell of matrix.cells) {
    const candidates = pool.filter(
      (q) =>
        !used.has(q.id) &&
        q.subject === matrix.subject &&
        q.grade === matrix.grade &&
        q.topic === cell.topic &&
        q.level === cell.level &&
        q.type === cell.type,
    );
    if (candidates.length < cell.count) shortages.push({ cell, need: cell.count, have: candidates.length });
    for (const q of shuffle(candidates, rng).slice(0, cell.count)) {
      used.add(q.id);
      selected.push(q);
    }
  }
  return { selected, shortages };
}
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/domain/matrix.test.ts && pnpm -C server typecheck`
Expected: 6 test PASS; typecheck sạch.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/matrix.ts server/tests/domain/matrix.test.ts
git commit -m "feat(domain): exam matrix and question selection with shortage report"
```

---

### Task 5: Mã đề, đáp án, chấm cả đề

**Files:**
- Create: `server/src/domain/variants.ts`
- Modify: `server/tests/helpers/fixtures.ts` (thêm `responsesFromKey` ở cuối file)
- Test: `server/tests/domain/variants.test.ts`

**Interfaces:**
- Consumes: `QuestionInput`, `QuestionType`, `StoredQuestion` (Task 2); `Rng`, `mulberry32`, `shuffle` (Task 1); `DEFAULT_RULES`, `maxPoints`, `PointRules`, `ResponseValue`, `round2`, `scoreItem` (Task 3)
- Produces:
  - `SECTION_ORDER: readonly QuestionType[]` = `["mcq","true_false","short_answer","essay"]`
  - `type VariantItem = { no: number; section: QuestionType; sectionNo: number; questionId: string; question: QuestionInput }`
  - `type Variant = { code: string; items: VariantItem[] }`
  - `makeVariants(questions: readonly StoredQuestion[], count: number, seed: number, firstCode?: number): Variant[]`
  - `type KeyEntry = { no: number; section: QuestionType; sectionNo: number; answer: string }`
  - `answerKey(v: Variant): KeyEntry[]`
  - `type GradeResult = { total: number; autoMax: number; pendingEssay: number[]; items: { no: number; points: number | null }[] }`
  - `gradeVariant(v: Variant, responses: Record<number, ResponseValue>, rules?: PointRules): GradeResult` — khoá = `no` (số thứ tự toàn đề)
  - fixtures: `responsesFromKey(entries: KeyEntry[]): Record<string, ResponseValue>`

- [ ] **Step 1: Thêm helper vào cuối** `server/tests/helpers/fixtures.ts`

```ts
import type { ResponseValue } from "../../src/domain/scoring";
import type { KeyEntry } from "../../src/domain/variants";

/** Dựng bài làm đúng hoàn toàn từ đáp án (dùng cho test chấm). */
export function responsesFromKey(entries: KeyEntry[]): Record<string, ResponseValue> {
  return Object.fromEntries(
    entries.map((e) => [
      String(e.no),
      e.section === "mcq" ? "ABCD".indexOf(e.answer) : e.section === "true_false" ? [...e.answer].map((c) => c === "Đ") : e.answer,
    ]),
  );
}
```
(Đặt 2 dòng `import type` lên đầu file cạnh import hiện có.)

- [ ] **Step 2: Viết test lỗi** — `server/tests/domain/variants.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { answerKey, gradeVariant, makeVariants } from "../../src/domain/variants";
import { essay, mcq, responsesFromKey, short, stored, tf } from "../helpers/fixtures";

const pool = [
  stored(mcq({ stem: "M1", options: ["a1", "b1", "c1", "d1"], answer: 0 }), "m1"),
  stored(mcq({ stem: "M2", options: ["a2", "b2", "c2", "d2"], answer: 1 }), "m2"),
  stored(mcq({ stem: "M3", options: ["a3", "b3", "c3", "d3"], answer: 3 }), "m3"),
  stored(tf(), "t1"),
  stored(short(), "s1"),
  stored(essay(), "e1"),
];
const byId = new Map(pool.map((q) => [q.id, q]));

describe("makeVariants", () => {
  it("tạo mã 101.. và mỗi mã chứa đủ câu", () => {
    const vs = makeVariants(pool, 3, 42);
    expect(vs.map((v) => v.code)).toEqual(["101", "102", "103"]);
    for (const v of vs) expect(v.items.map((i) => i.questionId).sort()).toEqual(pool.map((q) => q.id).sort());
  });

  it("giữ thứ tự phần I→IV, đánh số lại trong từng phần", () => {
    const [v] = makeVariants(pool, 1, 1);
    expect(v!.items.map((i) => i.section)).toEqual(["mcq", "mcq", "mcq", "true_false", "short_answer", "essay"]);
    expect(v!.items.map((i) => i.sectionNo)).toEqual([1, 2, 3, 1, 1, 1]);
    expect(v!.items.map((i) => i.no)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("trộn phương án nhưng đáp án vẫn trỏ đúng nội dung", () => {
    for (const v of makeVariants(pool, 5, 7)) {
      for (const it of v.items) {
        if (it.question.type !== "mcq") continue;
        const orig = byId.get(it.questionId);
        if (orig?.type !== "mcq") throw new Error("fixture");
        expect(it.question.options[it.question.answer]).toBe(orig.options[orig.answer]);
        expect([...it.question.options].sort()).toEqual([...orig.options].sort());
      }
    }
  });

  it("tái lập theo seed", () => {
    expect(makeVariants(pool, 2, 42)).toEqual(makeVariants(pool, 2, 42));
  });

  it("count phải ≥ 1", () => {
    expect(() => makeVariants(pool, 0, 1)).toThrow();
  });
});

describe("answerKey", () => {
  it("định dạng đáp án theo dạng câu", () => {
    const [v] = makeVariants(pool, 1, 3);
    const key = answerKey(v!);
    const bySection = (s: string) => key.filter((k) => k.section === s).map((k) => k.answer);
    for (const a of bySection("mcq")) expect(["A", "B", "C", "D"]).toContain(a);
    expect(bySection("true_false")).toEqual(["ĐSSĐ"]);
    expect(bySection("short_answer")).toEqual(["1,5"]);
    expect(bySection("essay")).toEqual(["Tự luận"]);
  });
});

describe("gradeVariant", () => {
  it("làm đúng hết = điểm tối đa phần tự động; tự luận chờ chấm", () => {
    const [v] = makeVariants(pool, 1, 5);
    const r = gradeVariant(v!, responsesFromKey(answerKey(v!)));
    expect(r.autoMax).toBe(2); // 3×0,25 + 1 + 0,25
    expect(r.total).toBe(2);
    expect(r.pendingEssay).toEqual([6]);
  });

  it("bỏ trống = 0 điểm", () => {
    const [v] = makeVariants(pool, 1, 5);
    expect(gradeVariant(v!, {}).total).toBe(0);
  });
});
```

- [ ] **Step 3: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/domain/variants.test.ts`
Expected: FAIL — không resolve được `../../src/domain/variants`.

- [ ] **Step 4: Code** — `server/src/domain/variants.ts`

```ts
import type { QuestionInput, QuestionType, StoredQuestion } from "./question";
import { type Rng, mulberry32, shuffle } from "./rng";
import { DEFAULT_RULES, type PointRules, type ResponseValue, maxPoints, round2, scoreItem } from "./scoring";

export const SECTION_ORDER: readonly QuestionType[] = ["mcq", "true_false", "short_answer", "essay"];

export type VariantItem = { no: number; section: QuestionType; sectionNo: number; questionId: string; question: QuestionInput };
export type Variant = { code: string; items: VariantItem[] };

function withShuffledOptions(q: StoredQuestion, rng: Rng): QuestionInput {
  if (q.type !== "mcq") return q;
  const order = shuffle([0, 1, 2, 3], rng);
  return { ...q, options: order.map((i) => q.options[i] as string), answer: order.indexOf(q.answer) };
}

export function makeVariants(questions: readonly StoredQuestion[], count: number, seed: number, firstCode = 101): Variant[] {
  if (!Number.isInteger(count) || count < 1) throw new Error("count must be a positive integer");
  return Array.from({ length: count }, (_, v) => {
    const rng = mulberry32(seed + v);
    const items: VariantItem[] = [];
    for (const section of SECTION_ORDER) {
      const inSection = shuffle(
        questions.filter((q) => q.type === section),
        rng,
      );
      inSection.forEach((q, i) => {
        items.push({ no: items.length + 1, section, sectionNo: i + 1, questionId: q.id, question: withShuffledOptions(q, rng) });
      });
    }
    return { code: String(firstCode + v), items };
  });
}

export type KeyEntry = { no: number; section: QuestionType; sectionNo: number; answer: string };

const LETTERS = ["A", "B", "C", "D"] as const;

function keyOf(q: QuestionInput): string {
  switch (q.type) {
    case "mcq":
      return LETTERS[q.answer] ?? "?";
    case "true_false":
      return q.answer.map((b) => (b ? "Đ" : "S")).join("");
    case "short_answer":
      return q.answer;
    case "essay":
      return "Tự luận";
  }
}

export function answerKey(v: Variant): KeyEntry[] {
  return v.items.map((it) => ({ no: it.no, section: it.section, sectionNo: it.sectionNo, answer: keyOf(it.question) }));
}

export type GradeResult = { total: number; autoMax: number; pendingEssay: number[]; items: { no: number; points: number | null }[] };

export function gradeVariant(v: Variant, responses: Record<number, ResponseValue>, rules: PointRules = DEFAULT_RULES): GradeResult {
  const items = v.items.map((it) => ({ no: it.no, points: scoreItem(it.question, responses[it.no], rules) }));
  const total = round2(items.reduce((s, i) => s + (i.points ?? 0), 0));
  const autoMax = round2(v.items.reduce((s, it) => s + (it.question.type === "essay" ? 0 : maxPoints(it.question, rules)), 0));
  return { total, autoMax, pendingEssay: items.filter((i) => i.points === null).map((i) => i.no), items };
}
```

- [ ] **Step 5: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/domain && pnpm -C server typecheck`
Expected: toàn bộ test domain PASS (rng, question, scoring, matrix, variants); typecheck sạch.

- [ ] **Step 6: Commit**

```bash
git add server/src/domain/variants.ts server/tests/helpers/fixtures.ts server/tests/domain/variants.test.ts
git commit -m "feat(domain): exam variants, answer keys and grading"
```

---

### Task 6: Phân quyền

**Files:**
- Create: `server/src/domain/authz.ts`
- Test: `server/tests/domain/authz.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `ROLES`, `type Role`, `ACTIONS`, `type Action`, `class ForbiddenError extends Error`, `can(role: Role, action: Action): boolean`, `assertCan(role: Role, action: Action): void`

- [ ] **Step 1: Viết test lỗi** — `server/tests/domain/authz.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { ACTIONS, ForbiddenError, assertCan, can } from "../../src/domain/authz";

describe("authz", () => {
  it("owner và admin làm được mọi thứ", () => {
    for (const a of ACTIONS) {
      expect(can("owner", a)).toBe(true);
      expect(can("admin", a)).toBe(true);
    }
  });

  it("teacher: dạy học được, không quản lý thành viên/tổ chức", () => {
    expect(can("teacher", "question:write")).toBe(true);
    expect(can("teacher", "exam:create")).toBe(true);
    expect(can("teacher", "member:manage")).toBe(false);
    expect(can("teacher", "org:manage")).toBe(false);
  });

  it("assistant: xem, chấm; không soạn, không ra đề", () => {
    expect(can("assistant", "exam:grade")).toBe(true);
    expect(can("assistant", "exam:read_key")).toBe(true);
    expect(can("assistant", "question:write")).toBe(false);
    expect(can("assistant", "exam:create")).toBe(false);
  });

  it("student: không có quyền nào ở P1", () => {
    for (const a of ACTIONS) expect(can("student", a)).toBe(false);
  });

  it("assertCan ném ForbiddenError có tên vai trò", () => {
    expect(() => assertCan("student", "exam:read_key")).toThrow(ForbiddenError);
    expect(() => assertCan("student", "exam:read_key")).toThrow(/student/);
    expect(() => assertCan("teacher", "exam:create")).not.toThrow();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/domain/authz.test.ts`
Expected: FAIL — không resolve được `../../src/domain/authz`.

- [ ] **Step 3: Code** — `server/src/domain/authz.ts`

```ts
export const ROLES = ["owner", "admin", "teacher", "assistant", "student"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "org:manage",
  "member:manage",
  "question:read",
  "question:write",
  "exam:create",
  "exam:read_key",
  "exam:grade",
] as const;
export type Action = (typeof ACTIONS)[number];

const TEACHING: readonly Action[] = ["question:read", "question:write", "exam:create", "exam:read_key", "exam:grade"];

const GRANTS: Record<Role, readonly Action[]> = {
  owner: ACTIONS,
  admin: ACTIONS,
  teacher: TEACHING,
  assistant: ["question:read", "exam:read_key", "exam:grade"],
  student: [],
};

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function can(role: Role, action: Action): boolean {
  return GRANTS[role].includes(action);
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) throw new ForbiddenError(`Vai trò "${role}" không được phép thực hiện "${action}"`);
}
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/domain/authz.test.ts && pnpm -C server typecheck`
Expected: 5 test PASS; typecheck sạch.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/authz.ts server/tests/domain/authz.test.ts
git commit -m "feat(domain): role/action permission matrix"
```

---

### Task 7: DB schema, migration, repo (PGlite trong test)

**Files:**
- Create: `server/src/db/schema.ts`, `server/src/db/client.ts`, `server/src/db/repo.ts`, `server/drizzle.config.ts`
- Create (sinh tự động): `server/drizzle/*`
- Create: `server/tests/helpers/db.ts`
- Test: `server/tests/db/repo.test.ts`

**Interfaces:**
- Consumes: `ROLES`, `Role` (Task 6); `ExamMatrix` (Task 4); `QuestionInput`, `QuestionFilter`, `StoredQuestion` (Task 2); `Variant` (Task 5)
- Produces:
  - `type Db = PgDatabase<PgQueryResultHKT, typeof schema>`; `connectDb(url: string): Promise<Db>` (chạy migrate)
  - `type UserRow`, `type ExamRow` (= `typeof exams.$inferSelect`, có `id, orgId, ownerId, title, durationMinutes, seed, matrix: ExamMatrix, variants: Variant[], createdAt`)
  - `ensureUser(db, { sub, email?, name? }): Promise<UserRow>` (upsert theo `sub`)
  - `createOrg(db, name: string, ownerId: string): Promise<{ id: string; name: string }>` (tạo luôn membership `owner`)
  - `addMember(db, orgId: string, userId: string, role: Role): Promise<void>`
  - `getRole(db, orgId: string, userId: string): Promise<Role | null>`
  - `membershipsOf(db, userId: string): Promise<{ orgId: string; role: Role }[]>` (cũ nhất trước)
  - `insertQuestion(db, orgId: string, ownerId: string, q: QuestionInput): Promise<StoredQuestion>`
  - `listQuestions(db, orgId: string, f: QuestionFilter): Promise<StoredQuestion[]>`
  - `insertExam(db, e: { orgId; ownerId; title; durationMinutes; seed; matrix: ExamMatrix; variants: Variant[] }): Promise<string>`
  - `findExam(db, orgId: string, examId: string): Promise<ExamRow | null>`
  - test helper: `testDb(): Promise<Db>`

- [ ] **Step 1: Schema** — `server/src/db/schema.ts`

```ts
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ROLES } from "../domain/authz";
import type { ExamMatrix } from "../domain/matrix";
import type { QuestionInput } from "../domain/question";
import type { Variant } from "../domain/variants";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  sub: text("sub").notNull().unique(),
  email: text("email"),
  name: text("name"),
  createdAt: createdAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    topic: text("topic").notNull(),
    level: text("level").notNull(),
    type: text("type").notNull(),
    body: jsonb("body").$type<QuestionInput>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("questions_lookup_idx").on(t.orgId, t.subject, t.grade, t.topic)],
);

export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  seed: integer("seed").notNull(),
  matrix: jsonb("matrix").$type<ExamMatrix>().notNull(),
  variants: jsonb("variants").$type<Variant[]>().notNull(),
  createdAt: createdAt(),
});
```

`server/drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({ dialect: "postgresql", schema: "./src/db/schema.ts", out: "./drizzle" });
```

- [ ] **Step 2: Sinh migration**

Run: `pnpm -C server db:generate`
Expected: in ra `5 tables` và tạo `server/drizzle/0000_*.sql` + `server/drizzle/meta/`.

- [ ] **Step 3: Client + test helper**

`server/src/db/client.ts`:
```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_DIR = new URL("../../drizzle", import.meta.url).pathname;

export async function connectDb(url: string): Promise<Db> {
  const db = drizzle(new pg.Pool({ connectionString: url }), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}
```

`server/tests/helpers/db.ts`:
```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { type Db, MIGRATIONS_DIR } from "../../src/db/client";
import * as schema from "../../src/db/schema";

/** Postgres trong tiến trình, migrate sẵn. Mỗi lần gọi = DB mới, sạch. */
export async function testDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}
```

- [ ] **Step 4: Viết test lỗi** — `server/tests/db/repo.test.ts`

```ts
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../../src/db/client";
import { addMember, createOrg, ensureUser, findExam, getRole, insertExam, insertQuestion, listQuestions, membershipsOf } from "../../src/db/repo";
import { testDb } from "../helpers/db";
import { mcq, tf } from "../helpers/fixtures";

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("users & orgs", () => {
  it("ensureUser là upsert theo sub", async () => {
    const a = await ensureUser(db, { sub: "s1", email: "a@x.test" });
    const b = await ensureUser(db, { sub: "s1", email: "b@x.test", name: "B" });
    expect(b.id).toBe(a.id);
    expect(b.email).toBe("b@x.test");
    expect(b.name).toBe("B");
  });

  it("createOrg gán owner; người ngoài không có vai trò", async () => {
    const u = await ensureUser(db, { sub: "s1" });
    const stranger = await ensureUser(db, { sub: "s2" });
    const org = await createOrg(db, "Trung tâm A", u.id);
    expect(await getRole(db, org.id, u.id)).toBe("owner");
    expect(await getRole(db, org.id, stranger.id)).toBeNull();
    await addMember(db, org.id, stranger.id, "student");
    expect(await getRole(db, org.id, stranger.id)).toBe("student");
    expect(await membershipsOf(db, stranger.id)).toEqual([{ orgId: org.id, role: "student" }]);
  });
});

describe("questions", () => {
  it("lưu, lọc, và cách ly theo tổ chức", async () => {
    const u = await ensureUser(db, { sub: "s1" });
    const orgA = await createOrg(db, "A", u.id);
    const orgB = await createOrg(db, "B", u.id);
    const saved = await insertQuestion(db, orgA.id, u.id, mcq());
    await insertQuestion(db, orgA.id, u.id, tf());
    await insertQuestion(db, orgA.id, u.id, mcq({ grade: 11 }));
    await insertQuestion(db, orgB.id, u.id, mcq());

    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.stem).toBe(mcq().stem);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10 })).toHaveLength(2);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10, type: "true_false" })).toHaveLength(1);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10, level: "VD" })).toHaveLength(0);
    expect(await listQuestions(db, orgB.id, { subject: "Toán", grade: 10 })).toHaveLength(1);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10, limit: 1 })).toHaveLength(1);
  });
});

describe("exams", () => {
  it("lưu và đọc lại theo tổ chức", async () => {
    const u = await ensureUser(db, { sub: "s1" });
    const org = await createOrg(db, "A", u.id);
    const other = await createOrg(db, "B", u.id);
    const matrix = { subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB" as const, type: "mcq" as const, count: 1 }] };
    const id = await insertExam(db, { orgId: org.id, ownerId: u.id, title: "KT", durationMinutes: 15, seed: 1, matrix, variants: [] });
    const row = await findExam(db, org.id, id);
    expect(row?.title).toBe("KT");
    expect(row?.matrix).toEqual(matrix);
    expect(await findExam(db, other.id, id)).toBeNull();
  });
});
```

- [ ] **Step 5: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/db/repo.test.ts`
Expected: FAIL — không resolve được `../../src/db/repo`.

- [ ] **Step 6: Code** — `server/src/db/repo.ts`

```ts
import { and, asc, eq } from "drizzle-orm";
import type { Role } from "../domain/authz";
import type { ExamMatrix } from "../domain/matrix";
import type { QuestionFilter, QuestionInput, StoredQuestion } from "../domain/question";
import type { Variant } from "../domain/variants";
import type { Db } from "./client";
import { exams, memberships, organizations, questions, users } from "./schema";

export type UserRow = typeof users.$inferSelect;
export type ExamRow = typeof exams.$inferSelect;

export async function ensureUser(db: Db, p: { sub: string; email?: string; name?: string }): Promise<UserRow> {
  const values = { sub: p.sub, email: p.email ?? null, name: p.name ?? null };
  const [row] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.sub, set: { email: values.email, name: values.name } })
    .returning();
  if (!row) throw new Error("ensureUser: no row returned");
  return row;
}

export async function createOrg(db: Db, name: string, ownerId: string): Promise<{ id: string; name: string }> {
  const [org] = await db.insert(organizations).values({ name }).returning({ id: organizations.id, name: organizations.name });
  if (!org) throw new Error("createOrg: no row returned");
  await db.insert(memberships).values({ orgId: org.id, userId: ownerId, role: "owner" });
  return org;
}

export async function addMember(db: Db, orgId: string, userId: string, role: Role): Promise<void> {
  await db.insert(memberships).values({ orgId, userId, role });
}

export async function getRole(db: Db, orgId: string, userId: string): Promise<Role | null> {
  const [m] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  return m?.role ?? null;
}

export async function membershipsOf(db: Db, userId: string): Promise<{ orgId: string; role: Role }[]> {
  return db
    .select({ orgId: memberships.orgId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt));
}

export async function insertQuestion(db: Db, orgId: string, ownerId: string, q: QuestionInput): Promise<StoredQuestion> {
  const [row] = await db
    .insert(questions)
    .values({ orgId, ownerId, subject: q.subject, grade: q.grade, topic: q.topic, level: q.level, type: q.type, body: q })
    .returning({ id: questions.id });
  if (!row) throw new Error("insertQuestion: no row returned");
  return { ...q, id: row.id };
}

export async function listQuestions(db: Db, orgId: string, f: QuestionFilter): Promise<StoredQuestion[]> {
  const conds = [eq(questions.orgId, orgId), eq(questions.subject, f.subject), eq(questions.grade, f.grade)];
  if (f.topic) conds.push(eq(questions.topic, f.topic));
  if (f.level) conds.push(eq(questions.level, f.level));
  if (f.type) conds.push(eq(questions.type, f.type));
  const rows = await db
    .select({ id: questions.id, body: questions.body })
    .from(questions)
    .where(and(...conds))
    .orderBy(asc(questions.createdAt))
    .limit(f.limit ?? 500);
  return rows.map((r) => ({ ...r.body, id: r.id }));
}

export async function insertExam(
  db: Db,
  e: { orgId: string; ownerId: string; title: string; durationMinutes: number; seed: number; matrix: ExamMatrix; variants: Variant[] },
): Promise<string> {
  const [row] = await db.insert(exams).values(e).returning({ id: exams.id });
  if (!row) throw new Error("insertExam: no row returned");
  return row.id;
}

export async function findExam(db: Db, orgId: string, examId: string): Promise<ExamRow | null> {
  const [row] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.orgId, orgId), eq(exams.id, examId)));
  return row ?? null;
}
```

- [ ] **Step 7: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/db && pnpm -C server typecheck`
Expected: 4 test PASS; typecheck sạch.

- [ ] **Step 8: Commit**

```bash
git add server/drizzle.config.ts server/drizzle server/src/db server/tests/helpers/db.ts server/tests/db/repo.test.ts
git commit -m "feat(db): schema, migrations and repository (PGlite in tests)"
```

---

### Task 8: Service (nghiệp vụ có phân quyền)

**Files:**
- Create: `server/src/errors.ts`, `server/src/service.ts`
- Test: `server/tests/service.test.ts`

**Interfaces:**
- Consumes: Task 2–7 (`parseQuestion`, `QuestionFilter`, `ExamMatrix`, `selectQuestions`, `Shortage`, `mulberry32`, `makeVariants`, `answerKey`, `gradeVariant`, `rulesForSubject`, `ResponseValue`, `assertCan`, `Role`, repo functions, `Db`, `ExamRow`)
- Produces:
  - `errors.ts`: `class NotFoundError extends Error`, `class UnauthorizedError extends Error`
  - `type Actor = { userId: string; orgId: string; role: Role }`
  - `type ExamLinks = { exams: { code: string; url: string }[]; answerKey: string; expiresInMinutes: number }`
  - zod `GenerateExamInput` (`title`, `matrix`, `variants` mặc định 4 (1–24), `durationMinutes` mặc định 45 (5–240), `seed?`); `type GenerateExamInput = z.input<…>`
  - `type GenerateExamResult = { ok: true; examId; codes: string[]; questionCount; seed } | { ok: false; shortages: Shortage[] }`
  - `createService(db: Db)` → `{ addQuestion(actor, input: unknown), searchQuestions(actor, filter: unknown), generateExam(actor, input: GenerateExamInput), getExam(actor, examId), getAnswerKeys(actor, examId): Promise<{ code; entries: KeyEntry[] }[]>, grade(actor, examId, code, responses: Record<string, ResponseValue>): Promise<GradeResult>, loadExamForExport(orgId, examId): Promise<ExamRow> }`
  - `type Service = ReturnType<typeof createService>`

- [ ] **Step 1: Viết test lỗi** — `server/tests/service.test.ts`

```ts
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client";
import { addMember, createOrg, ensureUser } from "../src/db/repo";
import { ForbiddenError } from "../src/domain/authz";
import { NotFoundError } from "../src/errors";
import { type Actor, createService } from "../src/service";
import { testDb } from "./helpers/db";
import { mcq, responsesFromKey, short, tf } from "./helpers/fixtures";

let db: Db;
let teacher: Actor;
let student: Actor;

beforeEach(async () => {
  db = await testDb();
  const t = await ensureUser(db, { sub: "t1", name: "Cô Lan" });
  const s = await ensureUser(db, { sub: "s1", name: "Em Nam" });
  const org = await createOrg(db, "Trung tâm A", t.id);
  await addMember(db, org.id, s.id, "student");
  teacher = { userId: t.id, orgId: org.id, role: "owner" };
  student = { userId: s.id, orgId: org.id, role: "student" };
});

const matrix = {
  subject: "Toán",
  grade: 10,
  cells: [
    { topic: "Mệnh đề", level: "NB" as const, type: "mcq" as const, count: 2 },
    { topic: "Mệnh đề", level: "NB" as const, type: "true_false" as const, count: 1 },
  ],
};

async function seedBank(svc: ReturnType<typeof createService>) {
  await svc.addQuestion(teacher, mcq({ stem: "C1" }));
  await svc.addQuestion(teacher, mcq({ stem: "C2" }));
  await svc.addQuestion(teacher, tf());
}

describe("service", () => {
  it("student không thêm được câu hỏi, không xem được đáp án", async () => {
    const svc = createService(db);
    await expect(svc.addQuestion(student, mcq())).rejects.toBeInstanceOf(ForbiddenError);
    await seedBank(svc);
    const res = await svc.generateExam(teacher, { title: "KT", matrix, variants: 1, seed: 1 });
    if (!res.ok) throw new Error("expected ok");
    await expect(svc.getAnswerKeys(student, res.examId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("searchQuestions kiểm tra bộ lọc", async () => {
    await expect(createService(db).searchQuestions(teacher, { subject: "Toán" })).rejects.toThrow();
  });

  it("ra đề → đáp án → chấm đúng hết được điểm tối đa", async () => {
    const svc = createService(db);
    await seedBank(svc);
    const res = await svc.generateExam(teacher, { title: "KT 15 phút", matrix, variants: 2, seed: 1 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.codes).toEqual(["101", "102"]);
    expect(res.questionCount).toBe(3);
    const keys = await svc.getAnswerKeys(teacher, res.examId);
    expect(keys.map((k) => k.code)).toEqual(["101", "102"]);
    const result = await svc.grade(teacher, res.examId, "102", responsesFromKey(keys[1]!.entries));
    expect(result.total).toBe(1.5);
    expect(result.autoMax).toBe(1.5);
  });

  it("môn Toán: trả lời ngắn 0,5đ", async () => {
    const svc = createService(db);
    await svc.addQuestion(teacher, short({ answer: "1,5" }));
    const res = await svc.generateExam(teacher, {
      title: "KT",
      matrix: { subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB", type: "short_answer", count: 1 }] },
      variants: 1,
      seed: 2,
    });
    if (!res.ok) throw new Error("expected ok");
    expect((await svc.grade(teacher, res.examId, "101", { "1": "1.5" })).total).toBe(0.5);
  });

  it("thiếu câu → ok:false kèm ô thiếu, không lưu đề", async () => {
    const res = await createService(db).generateExam(teacher, { title: "KT", matrix, variants: 1 });
    expect(res).toEqual({ ok: false, shortages: [expect.objectContaining({ need: 2, have: 0 }), expect.objectContaining({ need: 1, have: 0 })] });
  });

  it("đề/mã đề không tồn tại → NotFoundError", async () => {
    const svc = createService(db);
    await expect(svc.getExam(teacher, "not-a-uuid")).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.getExam(teacher, "00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(NotFoundError);
    await seedBank(svc);
    const res = await svc.generateExam(teacher, { title: "KT", matrix, variants: 1, seed: 1 });
    if (!res.ok) throw new Error("expected ok");
    await expect(svc.grade(teacher, res.examId, "999", {})).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/service.test.ts`
Expected: FAIL — không resolve được `../src/errors` / `../src/service`.

- [ ] **Step 3: Code**

`server/src/errors.ts`:
```ts
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}
```

`server/src/service.ts`:
```ts
import { z } from "zod";
import type { Db } from "./db/client";
import { type ExamRow, findExam, insertExam, insertQuestion, listQuestions } from "./db/repo";
import { type Role, assertCan } from "./domain/authz";
import { ExamMatrix, type Shortage, selectQuestions } from "./domain/matrix";
import { QuestionFilter, type StoredQuestion, parseQuestion } from "./domain/question";
import { mulberry32 } from "./domain/rng";
import { type ResponseValue, rulesForSubject } from "./domain/scoring";
import { type GradeResult, type KeyEntry, type Variant, answerKey, gradeVariant, makeVariants } from "./domain/variants";
import { NotFoundError } from "./errors";

export type Actor = { userId: string; orgId: string; role: Role };
export type ExamLinks = { exams: { code: string; url: string }[]; answerKey: string; expiresInMinutes: number };

export const GenerateExamInput = z.object({
  title: z.string().trim().min(1),
  matrix: ExamMatrix,
  variants: z.number().int().min(1).max(24).default(4),
  durationMinutes: z.number().int().min(5).max(240).default(45),
  seed: z.number().int().min(0).max(2147483647).optional(),
});
export type GenerateExamInput = z.input<typeof GenerateExamInput>;

export type GenerateExamResult =
  | { ok: true; examId: string; codes: string[]; questionCount: number; seed: number }
  | { ok: false; shortages: Shortage[] };

const Uuid = z.uuid();

export function createService(db: Db) {
  async function loadExam(orgId: string, examId: string): Promise<ExamRow> {
    const exam = Uuid.safeParse(examId).success ? await findExam(db, orgId, examId) : null;
    if (!exam) throw new NotFoundError("Không tìm thấy đề");
    return exam;
  }

  function variantOf(exam: ExamRow, code: string): Variant {
    const v = exam.variants.find((x) => x.code === code);
    if (!v) throw new NotFoundError(`Đề không có mã ${code}`);
    return v;
  }

  async function addQuestion(actor: Actor, input: unknown): Promise<StoredQuestion> {
    assertCan(actor.role, "question:write");
    return insertQuestion(db, actor.orgId, actor.userId, parseQuestion(input));
  }

  async function searchQuestions(actor: Actor, filter: unknown): Promise<StoredQuestion[]> {
    assertCan(actor.role, "question:read");
    return listQuestions(db, actor.orgId, QuestionFilter.parse(filter));
  }

  async function generateExam(actor: Actor, input: GenerateExamInput): Promise<GenerateExamResult> {
    assertCan(actor.role, "exam:create");
    const p = GenerateExamInput.parse(input);
    const seed = p.seed ?? Math.floor(Math.random() * 2147483647);
    const pool = await listQuestions(db, actor.orgId, { subject: p.matrix.subject, grade: p.matrix.grade, limit: 10000 });
    const { selected, shortages } = selectQuestions(pool, p.matrix, mulberry32(seed));
    if (shortages.length > 0) return { ok: false, shortages };
    const variants = makeVariants(selected, p.variants, seed);
    const examId = await insertExam(db, {
      orgId: actor.orgId,
      ownerId: actor.userId,
      title: p.title,
      durationMinutes: p.durationMinutes,
      seed,
      matrix: p.matrix,
      variants,
    });
    return { ok: true, examId, codes: variants.map((v) => v.code), questionCount: selected.length, seed };
  }

  async function getExam(actor: Actor, examId: string): Promise<ExamRow> {
    assertCan(actor.role, "exam:read_key");
    return loadExam(actor.orgId, examId);
  }

  async function getAnswerKeys(actor: Actor, examId: string): Promise<{ code: string; entries: KeyEntry[] }[]> {
    const exam = await getExam(actor, examId);
    return exam.variants.map((v) => ({ code: v.code, entries: answerKey(v) }));
  }

  async function grade(actor: Actor, examId: string, code: string, responses: Record<string, ResponseValue>): Promise<GradeResult> {
    assertCan(actor.role, "exam:grade");
    const exam = await loadExam(actor.orgId, examId);
    const byNo = Object.fromEntries(Object.entries(responses).map(([k, v]) => [Number(k), v]));
    return gradeVariant(variantOf(exam, code), byNo, rulesForSubject(exam.matrix.subject));
  }

  /** Không kiểm vai trò: chỉ gọi sau khi đã xác minh link tải ký HMAC. */
  async function loadExamForExport(orgId: string, examId: string): Promise<ExamRow> {
    return loadExam(orgId, examId);
  }

  return { addQuestion, searchQuestions, generateExam, getExam, getAnswerKeys, grade, loadExamForExport };
}

export type Service = ReturnType<typeof createService>;
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/service.test.ts && pnpm -C server typecheck`
Expected: 6 test PASS; typecheck sạch.

- [ ] **Step 5: Commit**

```bash
git add server/src/errors.ts server/src/service.ts server/tests/service.test.ts
git commit -m "feat(server): permission-checked service for bank, exams and grading"
```

---

### Task 9: Xác thực JWT + link tải ký

**Files:**
- Create: `server/src/auth/verify.ts`, `server/src/auth/download.ts`
- Create: `server/tests/helpers/tokens.ts`
- Test: `server/tests/auth/verify.test.ts`, `server/tests/auth/download.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `type Identity = { sub: string; email?: string; name?: string }`
  - `type VerifyToken = (token: string) => Promise<Identity>`
  - `createVerifier(o: { issuer: string; audience: string; jwksUrl?: string; keys?: JWTVerifyGetKey }): VerifyToken`
  - `type DownloadClaims = { orgId: string; examId: string; kind: "exam" | "key"; code?: string }`
  - `createDownloadSigner(secret: string, ttl?: string | number)` → `{ sign(c: DownloadClaims): Promise<string>; verify(t: string): Promise<DownloadClaims> }` (secret ≥ 32 ký tự)
  - test helper: `ISSUER`, `AUDIENCE`, `makeIssuer(): Promise<{ keys; sign(claims, opts?: { aud?; iss?; exp? }): Promise<string> }>`

- [ ] **Step 1: Helper token** — `server/tests/helpers/tokens.ts`

```ts
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";

export const ISSUER = "http://kc.test/realms/eduvn";
export const AUDIENCE = "eduvn-api";

/** Một "Keycloak giả": cặp khoá RSA + JWKS cục bộ. */
export async function makeIssuer() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, opts: { aud?: string; iss?: string; exp?: string | number } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(opts.iss ?? ISSUER)
      .setAudience(opts.aud ?? AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "5m")
      .sign(privateKey);
  return { keys, sign };
}
```

- [ ] **Step 2: Viết test lỗi**

`server/tests/auth/verify.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createVerifier } from "../../src/auth/verify";
import { AUDIENCE, ISSUER, makeIssuer } from "../helpers/tokens";

describe("createVerifier", () => {
  it("trả Identity từ token hợp lệ", async () => {
    const kc = await makeIssuer();
    const verify = createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys });
    expect(await verify(await kc.sign({ sub: "u1", email: "a@x.test", name: "Cô Lan" }))).toEqual({ sub: "u1", email: "a@x.test", name: "Cô Lan" });
  });

  it("từ chối sai audience, sai issuer, hết hạn, sai khoá, thiếu sub", async () => {
    const kc = await makeIssuer();
    const other = await makeIssuer();
    const verify = createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys });
    await expect(verify(await kc.sign({ sub: "u1" }, { aud: "account" }))).rejects.toThrow();
    await expect(verify(await kc.sign({ sub: "u1" }, { iss: "http://evil.test" }))).rejects.toThrow();
    await expect(verify(await kc.sign({ sub: "u1" }, { exp: Math.floor(Date.now() / 1000) - 60 }))).rejects.toThrow();
    await expect(verify(await other.sign({ sub: "u1" }))).rejects.toThrow();
    await expect(verify(await kc.sign({}))).rejects.toThrow();
  });

  it("bắt buộc có jwksUrl hoặc keys", () => {
    expect(() => createVerifier({ issuer: ISSUER, audience: AUDIENCE })).toThrow();
  });
});
```

`server/tests/auth/download.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createDownloadSigner } from "../../src/auth/download";

const SECRET = "test-secret-test-secret-test-secret!";

describe("createDownloadSigner", () => {
  it("ký rồi kiểm lại được", async () => {
    const s = createDownloadSigner(SECRET);
    const claims = { orgId: "o1", examId: "e1", kind: "exam" as const, code: "101" };
    expect(await s.verify(await s.sign(claims))).toEqual(claims);
    expect(await s.verify(await s.sign({ orgId: "o1", examId: "e1", kind: "key" }))).toEqual({ orgId: "o1", examId: "e1", kind: "key", code: undefined });
  });

  it("từ chối token bị sửa, ký bằng khoá khác, hết hạn", async () => {
    const s = createDownloadSigner(SECRET);
    const t = await s.sign({ orgId: "o1", examId: "e1", kind: "key" });
    await expect(s.verify(`${t}x`)).rejects.toThrow();
    await expect(createDownloadSigner(`${SECRET}-other`).verify(t)).rejects.toThrow();
    const expired = createDownloadSigner(SECRET, Math.floor(Date.now() / 1000) - 10);
    await expect(expired.verify(await expired.sign({ orgId: "o1", examId: "e1", kind: "key" }))).rejects.toThrow();
  });

  it("secret phải ≥ 32 ký tự", () => {
    expect(() => createDownloadSigner("short")).toThrow();
  });
});
```

- [ ] **Step 3: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/auth`
Expected: FAIL — không resolve được `../../src/auth/verify` và `../../src/auth/download`.

- [ ] **Step 4: Code**

`server/src/auth/verify.ts`:
```ts
import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from "jose";

export type Identity = { sub: string; email?: string; name?: string };
export type VerifyToken = (token: string) => Promise<Identity>;

export function createVerifier(o: { issuer: string; audience: string; jwksUrl?: string; keys?: JWTVerifyGetKey }): VerifyToken {
  const keys = o.keys ?? (o.jwksUrl ? createRemoteJWKSet(new URL(o.jwksUrl)) : undefined);
  if (!keys) throw new Error("createVerifier: need jwksUrl or keys");
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, { issuer: o.issuer, audience: o.audience });
    if (typeof payload.sub !== "string" || payload.sub === "") throw new Error("token has no sub");
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  };
}
```

`server/src/auth/download.ts`:
```ts
import { SignJWT, jwtVerify } from "jose";

export type DownloadClaims = { orgId: string; examId: string; kind: "exam" | "key"; code?: string };

export function createDownloadSigner(secret: string, ttl: string | number = "15m") {
  if (secret.length < 32) throw new Error("DOWNLOAD_SECRET must be at least 32 characters");
  const key = new TextEncoder().encode(secret);
  return {
    sign(claims: DownloadClaims): Promise<string> {
      return new SignJWT({ ...claims }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(ttl).sign(key);
    },
    async verify(token: string): Promise<DownloadClaims> {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      const { orgId, examId, kind, code } = payload as Record<string, unknown>;
      if (typeof orgId !== "string" || typeof examId !== "string" || (kind !== "exam" && kind !== "key")) {
        throw new Error("invalid download token");
      }
      return { orgId, examId, kind, code: typeof code === "string" ? code : undefined };
    },
  };
}
```

- [ ] **Step 5: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/auth && pnpm -C server typecheck`
Expected: 6 test PASS; typecheck sạch.

- [ ] **Step 6: Commit**

```bash
git add server/src/auth/verify.ts server/src/auth/download.ts server/tests/helpers/tokens.ts server/tests/auth
git commit -m "feat(auth): OIDC JWT verification and signed download links"
```

---

### Task 10: Xuất .docx đề + đáp án

**Files:**
- Create: `server/src/export/docx.ts`
- Test: `server/tests/export/docx.test.ts`

**Interfaces:**
- Consumes: `QuestionType` (Task 2); `Variant`, `VariantItem`, `KeyEntry`, `makeVariants`, `answerKey` (Task 5)
- Produces:
  - `type ExamMeta = { title: string; subject: string; grade: number; durationMinutes: number; school?: string }`
  - `SECTION_TITLES: Record<QuestionType, string>`
  - `renderExamDocx(meta: ExamMeta, variant: Variant): Promise<Buffer>`
  - `renderAnswerKeyDocx(meta: ExamMeta, keys: { code: string; entries: KeyEntry[] }[]): Promise<Buffer>`

- [ ] **Step 1: Viết test lỗi** — `server/tests/export/docx.test.ts`

```ts
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { answerKey, makeVariants } from "../../src/domain/variants";
import { renderAnswerKeyDocx, renderExamDocx } from "../../src/export/docx";
import { essay, mcq, short, stored, tf } from "../helpers/fixtures";

const meta = { title: "Kiểm tra 15 phút", subject: "Toán", grade: 10, durationMinutes: 15, school: "THPT Nguyễn Du" };
const pool = [stored(mcq({ stem: "Câu hỏi trắc nghiệm số một" }), "m1"), stored(tf(), "t1"), stored(short(), "s1"), stored(essay(), "e1")];

async function documentXml(buf: Buffer): Promise<string> {
  expect(buf.subarray(0, 2).toString()).toBe("PK");
  const file = (await JSZip.loadAsync(buf)).file("word/document.xml");
  if (!file) throw new Error("no document.xml");
  return file.async("string");
}

describe("renderExamDocx", () => {
  it("có đầu đề, mã đề, các phần, câu hỏi, HẾT", async () => {
    const [v] = makeVariants(pool, 1, 1);
    const xml = await documentXml(await renderExamDocx(meta, v!));
    for (const s of [
      "THPT Nguyễn Du",
      "KIỂM TRA 15 PHÚT",
      "Môn: Toán – Lớp 10 – Thời gian làm bài: 15 phút",
      "Mã đề: 101",
      "PHẦN I.",
      "PHẦN II.",
      "PHẦN III.",
      "PHẦN IV.",
      "Câu 1.",
      "Câu hỏi trắc nghiệm số một",
      "a) 3 là số nguyên tố",
      "(1 điểm)",
      "HẾT",
    ]) {
      expect(xml).toContain(s);
    }
  });

  it("đại học hiển thị Năm thay cho Lớp", async () => {
    const [v] = makeVariants(pool, 1, 1);
    const xml = await documentXml(await renderExamDocx({ ...meta, grade: 13 }, v!));
    expect(xml).toContain("Năm 1");
  });
});

describe("renderAnswerKeyDocx", () => {
  it("bảng đáp án cho từng mã đề", async () => {
    const vs = makeVariants(pool, 2, 1);
    const xml = await documentXml(await renderAnswerKeyDocx(meta, vs.map((v) => ({ code: v.code, entries: answerKey(v) }))));
    for (const s of ["ĐÁP ÁN", "Mã đề 101", "Mã đề 102", "ĐSSĐ", "1,5", "Tự luận"]) expect(xml).toContain(s);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/export`
Expected: FAIL — không resolve được `../../src/export/docx`.

- [ ] **Step 3: Code** — `server/src/export/docx.ts`

```ts
import { AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { QuestionType } from "../domain/question";
import type { KeyEntry, Variant, VariantItem } from "../domain/variants";

export type ExamMeta = { title: string; subject: string; grade: number; durationMinutes: number; school?: string };

export const SECTION_TITLES: Record<QuestionType, string> = {
  mcq: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn",
  true_false: "PHẦN II. Câu trắc nghiệm đúng sai",
  short_answer: "PHẦN III. Câu trắc nghiệm trả lời ngắn",
  essay: "PHẦN IV. Tự luận",
};

const SECTION_ROMAN: Record<QuestionType, string> = { mcq: "I", true_false: "II", short_answer: "III", essay: "IV" };
const OPTION_LABELS = ["A", "B", "C", "D"];
const STATEMENT_LABELS = ["a", "b", "c", "d"];

function gradeLabel(grade: number): string {
  return grade <= 12 ? `Lớp ${grade}` : `Năm ${grade - 12}`;
}

function centered(text: string, bold = false): Paragraph {
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold })] });
}

function indented(text: string): Paragraph {
  return new Paragraph({ text, indent: { left: 360 } });
}

function bold(text: string, before = 240): Paragraph {
  return new Paragraph({ spacing: { before }, children: [new TextRun({ text, bold: true })] });
}

function header(meta: ExamMeta): Paragraph[] {
  return [
    ...(meta.school ? [centered(meta.school, true)] : []),
    centered(meta.title.toUpperCase(), true),
    centered(`Môn: ${meta.subject} – ${gradeLabel(meta.grade)} – Thời gian làm bài: ${meta.durationMinutes} phút`),
  ];
}

function itemParagraphs(it: VariantItem): Paragraph[] {
  const q = it.question;
  const head = new Paragraph({
    spacing: { before: 120 },
    children: [new TextRun({ text: `Câu ${it.sectionNo}. `, bold: true }), new TextRun(q.stem)],
  });
  switch (q.type) {
    case "mcq":
      return [head, ...q.options.map((o, i) => indented(`${OPTION_LABELS[i]}. ${o}`))];
    case "true_false":
      return [head, ...q.statements.map((s, i) => indented(`${STATEMENT_LABELS[i]}) ${s}`))];
    case "short_answer":
      return [head];
    case "essay":
      return [head, indented(`(${q.points} điểm)`)];
  }
}

export async function renderExamDocx(meta: ExamMeta, variant: Variant): Promise<Buffer> {
  const children: Paragraph[] = [
    ...header(meta),
    centered(`Mã đề: ${variant.code}`, true),
    new Paragraph({ spacing: { before: 200 }, text: "Họ và tên: ........................................................  Số báo danh: ...................." }),
  ];
  let current: QuestionType | null = null;
  for (const it of variant.items) {
    if (it.section !== current) {
      current = it.section;
      children.push(bold(SECTION_TITLES[it.section]));
    }
    children.push(...itemParagraphs(it));
  }
  children.push(new Paragraph({ spacing: { before: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "------ HẾT ------", bold: true })] }));
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

function cell(text: string, isBold = false): TableCell {
  return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: isBold })] })] });
}

export async function renderAnswerKeyDocx(meta: ExamMeta, keys: { code: string; entries: KeyEntry[] }[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [...header(meta), centered("ĐÁP ÁN", true)];
  for (const k of keys) {
    children.push(bold(`Mã đề ${k.code}`));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Phần", true), cell("Câu", true), cell("Đáp án", true)] }),
          ...k.entries.map((e) => new TableRow({ children: [cell(SECTION_ROMAN[e.section]), cell(String(e.sectionNo)), cell(e.answer)] })),
        ],
      }),
    );
  }
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/export && pnpm -C server typecheck`
Expected: 3 test PASS; typecheck sạch.

- [ ] **Step 5: Kiểm bằng mắt (1 lần)**

```bash
pnpm -C server exec tsx -e '
import { writeFileSync } from "node:fs";
import { makeVariants, answerKey } from "./src/domain/variants";
import { renderExamDocx, renderAnswerKeyDocx } from "./src/export/docx";
import { mcq, tf, short, essay, stored } from "./tests/helpers/fixtures";
(async () => {
  const pool = [stored(mcq(),"m1"), stored(mcq({stem:"Câu thứ hai"}),"m2"), stored(tf(),"t1"), stored(short(),"s1"), stored(essay(),"e1")];
  const vs = makeVariants(pool, 2, 1);
  const meta = { title: "Kiểm tra 15 phút", subject: "Toán", grade: 10, durationMinutes: 15, school: "THPT Nguyễn Du" };
  writeFileSync("/tmp/eduvn-de-101.docx", await renderExamDocx(meta, vs[0]));
  writeFileSync("/tmp/eduvn-dap-an.docx", await renderAnswerKeyDocx(meta, vs.map(v => ({ code: v.code, entries: answerKey(v) }))));
})();
'
libreoffice --headless --convert-to pdf --outdir /tmp /tmp/eduvn-de-101.docx /tmp/eduvn-dap-an.docx
```
Expected: `/tmp/eduvn-de-101.pdf`, `/tmp/eduvn-dap-an.pdf` mở được, tiếng Việt hiển thị đúng. Nếu máy không có LibreOffice: mở .docx bằng Word/Google Docs.

- [ ] **Step 6: Commit**

```bash
git add server/src/export/docx.ts server/tests/export/docx.test.ts
git commit -m "feat(export): exam and answer-key .docx rendering"
```

---

### Task 11: HTTP app — REST, tổ chức cá nhân, link tải

**Files:**
- Create: `server/src/auth/actor.ts`, `server/src/http/app.ts`
- Create: `server/tests/helpers/app.ts`
- Test: `server/tests/http/api.test.ts`

**Interfaces:**
- Consumes: `createService`, `Actor`, `ExamLinks`, `GenerateExamInput` (Task 8); `NotFoundError`, `UnauthorizedError` (Task 8); `ForbiddenError` (Task 6); `ResponseValue` (Task 3); `answerKey` (Task 5); `ensureUser`, `createOrg`, `getRole`, `membershipsOf` (Task 7); `Identity`, `VerifyToken`, `createVerifier`, `createDownloadSigner` (Task 9); `renderExamDocx`, `renderAnswerKeyDocx` (Task 10); `testDb` (Task 7); `ISSUER`, `AUDIENCE`, `makeIssuer` (Task 9)
- Produces:
  - `resolveActor(db: Db, identity: Identity, orgId?: string): Promise<Actor>`
  - `type AppDeps = { db: Db; verify: VerifyToken; issuer: string; publicUrl: string; downloadSecret: string }`
  - `buildApp(deps: AppDeps): FastifyInstance` — routes: `GET /health`, `GET /.well-known/oauth-protected-resource`, `POST /api/questions`, `GET /api/questions`, `POST /api/exams` (201 / 422), `GET /api/exams/:id/key`, `POST /api/exams/:id/grade`, `POST /api/exams/:id/links`, `GET /dl/:token`
  - test helper: `testApp(): Promise<{ app: FastifyInstance; db: Db; sign: (claims: Record<string, unknown>) => Promise<string> }>`, `PUBLIC_URL = "http://eduvn.test"`

- [ ] **Step 1: Helper** — `server/tests/helpers/app.ts`

```ts
import { createVerifier } from "../../src/auth/verify";
import { buildApp } from "../../src/http/app";
import { testDb } from "./db";
import { AUDIENCE, ISSUER, makeIssuer } from "./tokens";

export const PUBLIC_URL = "http://eduvn.test";

export async function testApp() {
  const db = await testDb();
  const kc = await makeIssuer();
  const app = buildApp({
    db,
    verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
    issuer: ISSUER,
    publicUrl: PUBLIC_URL,
    downloadSecret: "test-secret-test-secret-test-secret!",
  });
  return { app, db, sign: (claims: Record<string, unknown>) => kc.sign(claims) };
}
```

- [ ] **Step 2: Viết test lỗi** — `server/tests/http/api.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_URL, testApp } from "../helpers/app";
import { mcq, responsesFromKey, tf } from "../helpers/fixtures";
import { ISSUER, makeIssuer } from "../helpers/tokens";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;

beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", email: "gv1@example.test", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});

const matrix = {
  subject: "Toán",
  grade: 10,
  cells: [
    { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 },
    { topic: "Mệnh đề", level: "NB", type: "true_false", count: 1 },
  ],
};

async function seedBank() {
  for (const q of [mcq({ stem: "C1" }), mcq({ stem: "C2" }), tf()]) {
    const res = await t.app.inject({ method: "POST", url: "/api/questions", headers: auth, payload: q });
    expect(res.statusCode).toBe(201);
  }
}

describe("public", () => {
  it("GET /health", async () => {
    const res = await t.app.inject({ method: "GET", url: "/health" });
    expect(res.json()).toEqual({ ok: true });
  });

  it("GET /.well-known/oauth-protected-resource", async () => {
    const res = await t.app.inject({ method: "GET", url: "/.well-known/oauth-protected-resource" });
    expect(res.json()).toEqual({ resource: `${PUBLIC_URL}/mcp`, authorization_servers: [ISSUER], bearer_methods_supported: ["header"] });
  });
});

describe("auth", () => {
  it("401 + resource_metadata khi thiếu token", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/questions", payload: mcq() });
    expect(res.statusCode).toBe(401);
    expect(res.headers["www-authenticate"]).toBe(`Bearer resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource"`);
  });

  it("401 khi token ký bằng khoá lạ", async () => {
    const evil = await makeIssuer();
    const res = await t.app.inject({ method: "GET", url: "/api/questions?subject=x&grade=10", headers: { authorization: `Bearer ${await evil.sign({ sub: "x" })}` } });
    expect(res.statusCode).toBe(401);
  });

  it("403 khi chọn tổ chức không phải thành viên", async () => {
    for (const orgId of ["00000000-0000-4000-8000-000000000000", "khong-phai-uuid"]) {
      const res = await t.app.inject({ method: "GET", url: "/api/questions?subject=x&grade=10", headers: { ...auth, "x-org-id": orgId } });
      expect(res.statusCode).toBe(403);
    }
  });
});

describe("ngân hàng câu hỏi + đề", () => {
  it("lần đầu đăng nhập tự có không gian cá nhân; thêm và tìm câu hỏi", async () => {
    await seedBank();
    const res = await t.app.inject({ method: "GET", url: `/api/questions?subject=${encodeURIComponent("Toán")}&grade=10`, headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(3);
  });

  it("400 khi câu hỏi sai cấu trúc", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/questions", headers: auth, payload: mcq({ options: ["a", "b", "c"] }) });
    expect(res.statusCode).toBe(400);
  });

  it("ra đề → đáp án → chấm → tải .docx", async () => {
    await seedBank();
    const created = await t.app.inject({ method: "POST", url: "/api/exams", headers: auth, payload: { title: "Kiểm tra 15 phút", matrix, variants: 2, seed: 7, durationMinutes: 15 } });
    expect(created.statusCode).toBe(201);
    const { examId, codes } = created.json();
    expect(codes).toEqual(["101", "102"]);

    const keys = (await t.app.inject({ method: "GET", url: `/api/exams/${examId}/key`, headers: auth })).json();
    expect(keys).toHaveLength(2);

    const graded = await t.app.inject({ method: "POST", url: `/api/exams/${examId}/grade`, headers: auth, payload: { code: "101", responses: responsesFromKey(keys[0].entries) } });
    expect(graded.json()).toMatchObject({ total: 1.5, autoMax: 1.5 });

    const links = (await t.app.inject({ method: "POST", url: `/api/exams/${examId}/links`, headers: auth })).json();
    expect(links.exams).toHaveLength(2);
    expect(links.expiresInMinutes).toBe(15);
    for (const url of [links.exams[0].url, links.answerKey]) {
      expect(url.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
      const file = await t.app.inject({ method: "GET", url: new URL(url).pathname });
      expect(file.statusCode).toBe(200);
      expect(file.headers["content-type"]).toBe(DOCX);
      expect(file.rawPayload.subarray(0, 2).toString()).toBe("PK");
    }
    expect((await t.app.inject({ method: "GET", url: "/dl/khong-hop-le" })).statusCode).toBe(404);
  });

  it("422 kèm ô thiếu khi ngân hàng chưa đủ câu", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/exams", headers: auth, payload: { title: "KT", matrix } });
    expect(res.statusCode).toBe(422);
    expect(res.json().shortages).toHaveLength(2);
  });

  it("404 với đề không tồn tại", async () => {
    for (const id of ["00000000-0000-4000-8000-000000000000", "abc"]) {
      expect((await t.app.inject({ method: "GET", url: `/api/exams/${id}/key`, headers: auth })).statusCode).toBe(404);
    }
  });
});
```

- [ ] **Step 3: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/http`
Expected: FAIL — không resolve được `../../src/http/app`.

- [ ] **Step 4: Code**

`server/src/auth/actor.ts`:
```ts
import { z } from "zod";
import type { Db } from "../db/client";
import { createOrg, ensureUser, getRole, membershipsOf } from "../db/repo";
import { ForbiddenError } from "../domain/authz";
import type { Actor } from "../service";
import type { Identity } from "./verify";

const OrgId = z.uuid();

/** Identity → Actor. Chưa thuộc tổ chức nào → tự tạo không gian cá nhân (owner). */
export async function resolveActor(db: Db, identity: Identity, orgId?: string): Promise<Actor> {
  const user = await ensureUser(db, identity);
  if (orgId !== undefined) {
    const role = OrgId.safeParse(orgId).success ? await getRole(db, orgId, user.id) : null;
    if (!role) throw new ForbiddenError("Bạn không phải thành viên của tổ chức này");
    return { userId: user.id, orgId, role };
  }
  const [first] = await membershipsOf(db, user.id);
  if (first) return { userId: user.id, orgId: first.orgId, role: first.role };
  const org = await createOrg(db, `Không gian của ${identity.name ?? identity.email ?? "tôi"}`, user.id);
  return { userId: user.id, orgId: org.id, role: "owner" };
}
```

`server/src/http/app.ts`:
```ts
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { ZodError, z } from "zod";
import { resolveActor } from "../auth/actor";
import { type DownloadClaims, createDownloadSigner } from "../auth/download";
import type { Identity, VerifyToken } from "../auth/verify";
import type { Db } from "../db/client";
import { ForbiddenError } from "../domain/authz";
import { ResponseValue } from "../domain/scoring";
import { answerKey } from "../domain/variants";
import { NotFoundError, UnauthorizedError } from "../errors";
import { renderAnswerKeyDocx, renderExamDocx } from "../export/docx";
import { type Actor, type ExamLinks, GenerateExamInput, createService } from "../service";

export type AppDeps = { db: Db; verify: VerifyToken; issuer: string; publicUrl: string; downloadSecret: string };

const GradeBody = z.object({ code: z.string().min(1), responses: z.record(z.string(), ResponseValue) });
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const LINK_TTL_MINUTES = 15;

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false });
  const service = createService(deps.db);
  const signer = createDownloadSigner(deps.downloadSecret, `${LINK_TTL_MINUTES}m`);
  const metadataUrl = `${deps.publicUrl}/.well-known/oauth-protected-resource`;

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof UnauthorizedError) {
      return reply.code(401).header("www-authenticate", `Bearer resource_metadata="${metadataUrl}"`).send({ error: err.message });
    }
    if (err instanceof ForbiddenError) return reply.code(403).send({ error: err.message });
    if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
    if (err instanceof ZodError) return reply.code(400).send({ error: "Dữ liệu không hợp lệ", issues: err.issues });
    const status = (err as { statusCode?: number }).statusCode;
    if (status !== undefined && status >= 400 && status < 500) return reply.code(status).send({ error: (err as Error).message });
    console.error(err);
    return reply.code(500).send({ error: "Lỗi máy chủ" });
  });

  async function authenticate(req: FastifyRequest): Promise<Actor> {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError("Thiếu access token");
    let identity: Identity;
    try {
      identity = await deps.verify(header.slice("Bearer ".length));
    } catch {
      throw new UnauthorizedError("Access token không hợp lệ hoặc đã hết hạn");
    }
    const orgHeader = req.headers["x-org-id"];
    return resolveActor(deps.db, identity, typeof orgHeader === "string" ? orgHeader : undefined);
  }

  async function makeLinks(actor: Actor, examId: string): Promise<ExamLinks> {
    const exam = await service.getExam(actor, examId);
    const url = async (kind: "exam" | "key", code?: string) =>
      `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, examId: exam.id, kind, code })}`;
    return {
      exams: await Promise.all(exam.variants.map(async (v) => ({ code: v.code, url: await url("exam", v.code) }))),
      answerKey: await url("key"),
      expiresInMinutes: LINK_TTL_MINUTES,
    };
  }

  app.get("/health", async () => ({ ok: true }));

  app.get("/.well-known/oauth-protected-resource", async () => ({
    resource: `${deps.publicUrl}/mcp`,
    authorization_servers: [deps.issuer],
    bearer_methods_supported: ["header"],
  }));

  app.post("/api/questions", async (req, reply) => reply.code(201).send(await service.addQuestion(await authenticate(req), req.body)));

  app.get("/api/questions", async (req) => service.searchQuestions(await authenticate(req), req.query));

  app.post("/api/exams", async (req, reply) => {
    const actor = await authenticate(req);
    const result = await service.generateExam(actor, GenerateExamInput.parse(req.body));
    return reply.code(result.ok ? 201 : 422).send(result);
  });

  app.get<{ Params: { id: string } }>("/api/exams/:id/key", async (req) => service.getAnswerKeys(await authenticate(req), req.params.id));

  app.post<{ Params: { id: string } }>("/api/exams/:id/grade", async (req) => {
    const actor = await authenticate(req);
    const body = GradeBody.parse(req.body);
    return service.grade(actor, req.params.id, body.code, body.responses);
  });

  app.post<{ Params: { id: string } }>("/api/exams/:id/links", async (req) => makeLinks(await authenticate(req), req.params.id));

  app.get<{ Params: { token: string } }>("/dl/:token", async (req, reply) => {
    let claims: DownloadClaims;
    try {
      claims = await signer.verify(req.params.token);
    } catch {
      throw new NotFoundError("Link tải đã hết hạn hoặc không hợp lệ");
    }
    const exam = await service.loadExamForExport(claims.orgId, claims.examId);
    const meta = { title: exam.title, subject: exam.matrix.subject, grade: exam.matrix.grade, durationMinutes: exam.durationMinutes };
    const shortId = exam.id.slice(0, 8);
    let buffer: Buffer;
    let filename: string;
    if (claims.kind === "key") {
      buffer = await renderAnswerKeyDocx(meta, exam.variants.map((v) => ({ code: v.code, entries: answerKey(v) })));
      filename = `dap-an-${shortId}.docx`;
    } else {
      const v = exam.variants.find((x) => x.code === claims.code);
      if (!v) throw new NotFoundError("Không có mã đề này");
      buffer = await renderExamDocx(meta, v);
      filename = `de-${v.code}-${shortId}.docx`;
    }
    return reply.header("content-type", DOCX).header("content-disposition", `attachment; filename="${filename}"`).send(buffer);
  });

  return app;
}
```

- [ ] **Step 5: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/http && pnpm -C server typecheck`
Expected: 10 test PASS; typecheck sạch.

- [ ] **Step 6: Commit**

```bash
git add server/src/auth/actor.ts server/src/http/app.ts server/tests/helpers/app.ts server/tests/http/api.test.ts
git commit -m "feat(http): REST API, personal workspace provisioning, signed .docx downloads"
```

---

### Task 12: MCP server + route `/mcp`

**Files:**
- Create: `server/src/mcp/server.ts`
- Modify: `server/src/http/app.ts` (thêm import + 3 route MCP ngay trước `return app;`)
- Test: `server/tests/mcp/mcp.test.ts`

**Interfaces:**
- Consumes: `Service`, `Actor`, `ExamLinks` (Task 8); `MatrixCell` (Task 4); `QuestionFilter`, `QuestionInput` (Task 2); `ResponseValue` (Task 3); `buildApp` internals `authenticate`, `makeLinks`, `service` (Task 11); `testApp`, `PUBLIC_URL` (Task 11)
- Produces:
  - `type McpDeps = { service: Service; actor: Actor; makeLinks: (examId: string) => Promise<ExamLinks> }`
  - `buildMcpServer(deps: McpDeps): McpServer` với tool: `tim_cau_hoi`, `them_cau_hoi`, `tao_de`, `lay_dap_an`, `cham_bai`, `xuat_word`
  - Route: `POST /mcp` (stateless, JSON), `GET /mcp` và `DELETE /mcp` → 405

- [ ] **Step 1: Viết test lỗi** — `server/tests/mcp/mcp.test.ts`

```ts
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_URL, testApp } from "../helpers/app";
import { mcq, responsesFromKey, tf } from "../helpers/fixtures";

let t: Awaited<ReturnType<typeof testApp>>;
let base: string;
let token: string;

beforeEach(async () => {
  t = await testApp();
  await t.app.listen({ port: 0, host: "127.0.0.1" });
  base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  token = await t.sign({ sub: "gv-mcp", name: "Thầy Minh" });
});
afterEach(async () => {
  await t.app.close();
});

async function connect(): Promise<Client> {
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${token}` } } }));
  return client;
}

type ToolResult = { content: { type: string; text: string }[]; isError?: boolean };
const text = (r: unknown) => (r as ToolResult).content[0]?.text ?? "";
const data = (r: unknown) => JSON.parse(text(r));

const cells = [
  { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 },
  { topic: "Mệnh đề", level: "NB", type: "true_false", count: 1 },
];

describe("MCP /mcp", () => {
  it("liệt kê đủ 6 tool", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((x) => x.name).sort()).toEqual(["cham_bai", "lay_dap_an", "tao_de", "them_cau_hoi", "tim_cau_hoi", "xuat_word"]);
    await client.close();
  });

  it("luồng đầy đủ: thêm câu → tìm → tạo đề → đáp án → chấm → xuất Word", async () => {
    const client = await connect();
    expect(data(await client.callTool({ name: "them_cau_hoi", arguments: { questions: [mcq({ stem: "C1" }), mcq({ stem: "C2" }), tf()] } })).added).toBe(3);
    expect(data(await client.callTool({ name: "tim_cau_hoi", arguments: { subject: "Toán", grade: 10 } }))).toHaveLength(3);

    const exam = data(await client.callTool({ name: "tao_de", arguments: { title: "KT 15 phút", subject: "Toán", grade: 10, cells, variants: 2, seed: 3 } }));
    expect(exam).toMatchObject({ ok: true, codes: ["101", "102"], questionCount: 3 });

    const keys = data(await client.callTool({ name: "lay_dap_an", arguments: { examId: exam.examId } }));
    const graded = data(await client.callTool({ name: "cham_bai", arguments: { examId: exam.examId, code: "101", responses: responsesFromKey(keys[0].entries) } }));
    expect(graded).toMatchObject({ total: 1.5, autoMax: 1.5 });

    const links = data(await client.callTool({ name: "xuat_word", arguments: { examId: exam.examId } }));
    expect(links.exams).toHaveLength(2);
    expect(links.answerKey.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
    await client.close();
  });

  it("tao_de báo thiếu câu bằng isError tiếng Việt", async () => {
    const client = await connect();
    const r = await client.callTool({ name: "tao_de", arguments: { title: "KT", subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 5 }] } });
    expect((r as ToolResult).isError).toBe(true);
    expect(text(r)).toContain("cần 5, có 0");
    await client.close();
  });

  it("lỗi quyền/không tìm thấy trả về isError", async () => {
    const client = await connect();
    const r = await client.callTool({ name: "lay_dap_an", arguments: { examId: "00000000-0000-4000-8000-000000000000" } });
    expect((r as ToolResult).isError).toBe(true);
    await client.close();
  });

  it("401 + resource_metadata khi không có token; 405 với GET", async () => {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
    expect((await fetch(`${base}/mcp`)).status).toBe(405);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/mcp`
Expected: FAIL — `/mcp` trả 404 (route chưa có), test liệt kê tool lỗi kết nối.

- [ ] **Step 3: Code** — `server/src/mcp/server.ts`

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MatrixCell } from "../domain/matrix";
import { QuestionFilter, QuestionInput } from "../domain/question";
import { ResponseValue } from "../domain/scoring";
import type { Actor, ExamLinks, Service } from "../service";

export type McpDeps = { service: Service; actor: Actor; makeLinks: (examId: string) => Promise<ExamLinks> };

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function buildMcpServer({ service, actor, makeLinks }: McpDeps): McpServer {
  const server = new McpServer({ name: "eduvn", version: "0.1.0" });

  server.registerTool(
    "tim_cau_hoi",
    {
      title: "Tìm câu hỏi",
      description: "Tìm câu hỏi trong ngân hàng của tổ chức. Bắt buộc: subject (môn), grade (1–12 phổ thông, 13–16 năm 1–4 đại học). Tuỳ chọn: topic, level (NB/TH/VD), type (mcq/true_false/short_answer/essay), limit.",
      inputSchema: QuestionFilter.shape,
    },
    async (args) => json(await service.searchQuestions(actor, args)),
  );

  server.registerTool(
    "them_cau_hoi",
    {
      title: "Thêm câu hỏi",
      description:
        "Thêm 1–100 câu hỏi vào ngân hàng. mcq: 4 phương án, answer = chỉ số 0–3. true_false: 4 ý (statements), answer = 4 giá trị true/false. short_answer: answer là chuỗi ngắn. essay: rubric + points. level: NB (nhận biết), TH (thông hiểu), VD (vận dụng).",
      inputSchema: { questions: z.array(QuestionInput).min(1).max(100) },
    },
    async ({ questions }) => {
      const ids: string[] = [];
      for (const q of questions) ids.push((await service.addQuestion(actor, q)).id);
      return json({ added: ids.length, ids });
    },
  );

  server.registerTool(
    "tao_de",
    {
      title: "Tạo đề theo ma trận",
      description:
        "Tạo đề kiểm tra theo ma trận (CV 7991): mỗi ô = chủ đề × mức độ × dạng câu × số câu. Tạo nhiều mã đề (101, 102…), trộn câu và phương án. Thiếu câu thì báo ô thiếu.",
      inputSchema: {
        title: z.string().min(1),
        subject: z.string().min(1),
        grade: z.number().int().min(1).max(16),
        cells: z.array(MatrixCell).min(1),
        variants: z.number().int().min(1).max(24).default(4),
        durationMinutes: z.number().int().min(5).max(240).default(45),
        seed: z.number().int().min(0).max(2147483647).optional(),
      },
    },
    async ({ title, subject, grade, cells, variants, durationMinutes, seed }) => {
      const result = await service.generateExam(actor, { title, matrix: { subject, grade, cells }, variants, durationMinutes, seed });
      if (!result.ok) {
        const lines = result.shortages.map((s) => `- ${s.cell.topic} · ${s.cell.level} · ${s.cell.type}: cần ${s.need}, có ${s.have}`);
        return fail(`Ngân hàng chưa đủ câu hỏi:\n${lines.join("\n")}`);
      }
      return json(result);
    },
  );

  server.registerTool(
    "lay_dap_an",
    { title: "Lấy đáp án", description: "Đáp án của mọi mã đề trong một đề.", inputSchema: { examId: z.string() } },
    async ({ examId }) => json(await service.getAnswerKeys(actor, examId)),
  );

  server.registerTool(
    "cham_bai",
    {
      title: "Chấm bài trắc nghiệm",
      description:
        "Chấm một bài làm. responses: khoá = số thứ tự câu trong toàn đề (no, xem lay_dap_an); mcq = chỉ số 0–3, true_false = mảng 4 true/false, short_answer = chuỗi. Tự luận trả về pendingEssay.",
      inputSchema: { examId: z.string(), code: z.string().min(1), responses: z.record(z.string(), ResponseValue) },
    },
    async ({ examId, code, responses }) => json(await service.grade(actor, examId, code, responses)),
  );

  server.registerTool(
    "xuat_word",
    { title: "Xuất file Word", description: "Tạo link tải .docx cho từng mã đề và file đáp án (hết hạn sau 15 phút).", inputSchema: { examId: z.string() } },
    async ({ examId }) => json(await makeLinks(examId)),
  );

  return server;
}
```

- [ ] **Step 4: Gắn route vào** `server/src/http/app.ts`

Thêm import ở đầu file:
```ts
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyReply } from "fastify";
import { buildMcpServer } from "../mcp/server";
```

Thêm ngay trước `return app;`:
```ts
  app.post("/mcp", async (req, reply) => {
    const actor = await authenticate(req);
    const server = buildMcpServer({ service, actor, makeLinks: (examId) => makeLinks(actor, examId) });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.raw.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    reply.hijack();
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });

  const methodNotAllowed = async (_req: FastifyRequest, reply: FastifyReply) =>
    reply.code(405).header("allow", "POST").send({ error: "MCP endpoint chỉ nhận POST" });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);
```

- [ ] **Step 5: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/mcp tests/http && pnpm -C server typecheck`
Expected: 5 test MCP + 10 test HTTP PASS; typecheck sạch.

- [ ] **Step 6: Commit**

```bash
git add server/src/mcp/server.ts server/src/http/app.ts server/tests/mcp/mcp.test.ts
git commit -m "feat(mcp): MCP tools for question bank, exams, grading and Word export"
```

---

### Task 13: Cấu hình, khởi động, hạ tầng dev (Postgres + Keycloak), smoke test thật

**Files:**
- Create: `server/src/config.ts`, `server/src/main.ts`, `server/.env.example`
- Create: `infra/docker-compose.yml`, `infra/keycloak/realm-eduvn.json`
- Create: `scripts/smoke.sh`
- Test: `server/tests/config.test.ts`

**Interfaces:**
- Consumes: `connectDb` (Task 7); `createVerifier` (Task 9); `buildApp` (Task 11–12)
- Produces: `type Config`; `loadConfig(env?: Record<string, string | undefined>): Config` (bỏ `/` cuối của `PUBLIC_URL`, `OIDC_ISSUER`); tiến trình server ở cổng 4310

- [ ] **Step 1: Viết test lỗi** — `server/tests/config.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const env = {
  DATABASE_URL: "postgres://eduvn:eduvn-dev@127.0.0.1:5442/eduvn",
  OIDC_ISSUER: "http://localhost:8180/realms/eduvn/",
  OIDC_JWKS_URL: "http://localhost:8180/realms/eduvn/protocol/openid-connect/certs",
  PUBLIC_URL: "http://localhost:4310/",
  DOWNLOAD_SECRET: "x".repeat(32),
};

describe("loadConfig", () => {
  it("điền mặc định và bỏ / cuối", () => {
    expect(loadConfig(env)).toEqual({
      ...env,
      OIDC_ISSUER: "http://localhost:8180/realms/eduvn",
      PUBLIC_URL: "http://localhost:4310",
      OIDC_AUDIENCE: "eduvn-api",
      HOST: "127.0.0.1",
      PORT: 4310,
    });
  });

  it("từ chối secret ngắn và thiếu biến", () => {
    expect(() => loadConfig({ ...env, DOWNLOAD_SECRET: "short" })).toThrow();
    expect(() => loadConfig({ ...env, DATABASE_URL: undefined })).toThrow();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `pnpm -C server exec vitest run tests/config.test.ts`
Expected: FAIL — không resolve được `../src/config`.

- [ ] **Step 3: Code**

`server/src/config.ts`:
```ts
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().min(1),
  OIDC_ISSUER: z.url(),
  OIDC_JWKS_URL: z.url(),
  OIDC_AUDIENCE: z.string().min(1).default("eduvn-api"),
  PUBLIC_URL: z.url(),
  DOWNLOAD_SECRET: z.string().min(32),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4310),
});
export type Config = z.infer<typeof Env>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const cfg = Env.parse(env);
  return { ...cfg, OIDC_ISSUER: cfg.OIDC_ISSUER.replace(/\/+$/, ""), PUBLIC_URL: cfg.PUBLIC_URL.replace(/\/+$/, "") };
}
```
Lưu ý: `Env.parse` loại bỏ khoá thừa của `process.env` (zod object mặc định strip), nên kết quả chỉ chứa các khoá trên.

`server/src/main.ts`:
```ts
import { createVerifier } from "./auth/verify";
import { loadConfig } from "./config";
import { connectDb } from "./db/client";
import { buildApp } from "./http/app";

const cfg = loadConfig();
const db = await connectDb(cfg.DATABASE_URL);
const app = buildApp({
  db,
  verify: createVerifier({ issuer: cfg.OIDC_ISSUER, audience: cfg.OIDC_AUDIENCE, jwksUrl: cfg.OIDC_JWKS_URL }),
  issuer: cfg.OIDC_ISSUER,
  publicUrl: cfg.PUBLIC_URL,
  downloadSecret: cfg.DOWNLOAD_SECRET,
});
await app.listen({ host: cfg.HOST, port: cfg.PORT });
console.log(`eduvn server: ${cfg.PUBLIC_URL} · MCP: ${cfg.PUBLIC_URL}/mcp`);
```

`server/.env.example`:
```dotenv
DATABASE_URL=postgres://eduvn:eduvn-dev@127.0.0.1:5442/eduvn
OIDC_ISSUER=http://localhost:8180/realms/eduvn
OIDC_JWKS_URL=http://localhost:8180/realms/eduvn/protocol/openid-connect/certs
OIDC_AUDIENCE=eduvn-api
PUBLIC_URL=http://localhost:4310
DOWNLOAD_SECRET=dev-only-change-me-dev-only-change-me
HOST=127.0.0.1
PORT=4310
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `pnpm -C server exec vitest run tests/config.test.ts && pnpm -C server typecheck`
Expected: 2 test PASS; typecheck sạch.

- [ ] **Step 5: Hạ tầng dev**

`infra/docker-compose.yml`:
```yaml
name: eduvn
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: eduvn
      POSTGRES_PASSWORD: eduvn-dev
      POSTGRES_DB: eduvn
    ports: ["127.0.0.1:5442:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eduvn"]
      interval: 5s
      retries: 10
  keycloak:
    image: quay.io/keycloak/keycloak:26.4
    command: ["start-dev", "--import-realm", "--http-port=8180"]
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin-dev
    ports: ["127.0.0.1:8180:8180"]
    volumes: ["./keycloak:/opt/keycloak/data/import:ro"]
volumes:
  pgdata: {}
```

`infra/keycloak/realm-eduvn.json`:
```json
{
  "realm": "eduvn",
  "enabled": true,
  "displayName": "EDUVN",
  "clients": [
    {
      "clientId": "eduvn-dev",
      "name": "EDUVN dev client",
      "publicClient": true,
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "redirectUris": ["http://localhost:*", "http://127.0.0.1:*"],
      "webOrigins": ["+"],
      "attributes": { "pkce.code.challenge.method": "S256" },
      "protocolMappers": [
        {
          "name": "audience-eduvn-api",
          "protocol": "openid-connect",
          "protocolMapper": "oidc-audience-mapper",
          "config": { "included.custom.audience": "eduvn-api", "access.token.claim": "true", "id.token.claim": "false" }
        }
      ]
    }
  ],
  "users": [
    {
      "username": "gv1",
      "enabled": true,
      "email": "gv1@example.test",
      "emailVerified": true,
      "firstName": "Lan",
      "lastName": "Nguyễn",
      "credentials": [{ "type": "password", "value": "gv1-dev-pass", "temporary": false }]
    }
  ]
}
```
`directAccessGrantsEnabled` chỉ để smoke test lấy token bằng mật khẩu; P3 tắt cho client công khai.

- [ ] **Step 6: Smoke script** — `scripts/smoke.sh`

```bash
#!/usr/bin/env bash
# Chạy thật: Keycloak cấp token → REST + MCP của server đang chạy.
set -euo pipefail
KC="${KC:-http://localhost:8180}"
API="${API:-http://localhost:4310}"
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);console.log(eval("o"+process.argv[1]))})' "$1"; }

echo "== chờ Keycloak realm eduvn"
for _ in $(seq 1 60); do curl -fsS "$KC/realms/eduvn/.well-known/openid-configuration" >/dev/null 2>&1 && break; sleep 2; done

echo "== lấy token gv1"
TOKEN=$(curl -fsS -X POST "$KC/realms/eduvn/protocol/openid-connect/token" \
  -d grant_type=password -d client_id=eduvn-dev -d username=gv1 -d password=gv1-dev-pass -d scope=openid | json ".access_token")
H=(-H "authorization: Bearer $TOKEN" -H "content-type: application/json")

echo "== health"; curl -fsS "$API/health"; echo
echo "== thêm câu hỏi"
curl -fsS "${H[@]}" -X POST "$API/api/questions" -d '{"type":"mcq","subject":"Toán","grade":10,"topic":"Mệnh đề","level":"NB","stem":"Câu nào là mệnh đề?","options":["2 + 2 = 4","Bạn khỏe không?","Hãy đóng cửa!","x > 1"],"answer":0}' | json ".id"
echo "== tạo đề"
EXAM=$(curl -fsS "${H[@]}" -X POST "$API/api/exams" -d '{"title":"Smoke","variants":1,"matrix":{"subject":"Toán","grade":10,"cells":[{"topic":"Mệnh đề","level":"NB","type":"mcq","count":1}]}}' | json ".examId")
echo "$EXAM"
echo "== MCP tools/list"
curl -fsS "${H[@]}" -H "accept: application/json, text/event-stream" -X POST "$API/mcp" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | json ".result.tools.map(t=>t.name).join(', ')"
echo "== link Word"
curl -fsS "${H[@]}" -X POST "$API/api/exams/$EXAM/links" | json ".answerKey"
echo "SMOKE OK"
```
Run: `chmod +x scripts/smoke.sh`

- [ ] **Step 7: Chạy thật (kiểm RAM trước, một tác vụ mỗi lúc)**

```bash
free -g
docker compose -f infra/docker-compose.yml up -d
cp server/.env.example server/.env
pnpm -C server start &
sleep 5
bash scripts/smoke.sh
```
Expected (theo thứ tự): `{"ok":true}` · một UUID câu hỏi · một UUID đề · `tim_cau_hoi, them_cau_hoi, tao_de, lay_dap_an, cham_bai, xuat_word` (thứ tự đăng ký) · một URL `http://localhost:4310/dl/...` · `SMOKE OK`.
Mở URL đáp án trong trình duyệt trong 15 phút → tải được `dap-an-*.docx`.

Nếu lấy token báo `invalid_grant` / "Account is not fully set up": vào `http://localhost:8180/admin` (admin / admin-dev) → realm `eduvn` → Users → gv1, điền đủ trường bắt buộc rồi chạy lại.

Dừng: `kill %1; docker compose -f infra/docker-compose.yml stop`

- [ ] **Step 8: Toàn bộ test + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: tất cả test PASS (rng, question, scoring, matrix, variants, authz, repo, service, auth, docx, http, mcp, config); typecheck sạch.

- [ ] **Step 9: Commit**

```bash
git add server/src/config.ts server/src/main.ts server/.env.example server/tests/config.test.ts infra/docker-compose.yml infra/keycloak/realm-eduvn.json scripts/smoke.sh
git commit -m "feat: config, entrypoint, dev infra (Postgres + Keycloak) and smoke test"
```

---

## Bàn giao P1

- Cổng chuyển đợt (`docs/ROADMAP.md`): toàn bộ test xanh · `scripts/smoke.sh` in `SMOKE OK` với Keycloak thật · chinhan xem file .docx đề + đáp án và duyệt.
- Cập nhật `docs/ROADMAP.md`: P1 → ✅ Đã xong, ghi ngày.
- Tiếp theo: viết plan P2 (Zalo demo) — đọc trước `hermes-plugin/zalo_tools/tools.py` của 2anh-zalo-bot để chốt cách lấy UID người gửi (xem `docs/modules/08-zalo-channel.md`).
