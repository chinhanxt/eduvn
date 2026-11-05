import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDownloadSigner } from "../../src/auth/download";
import { membershipsOf, ensureUser } from "../../src/db/repo";
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

describe("me + danh sách đề", () => {
  it("GET /api/me trả người dùng, tổ chức, vai trò", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/me", headers: auth });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toEqual({ name: "Cô Lan", email: "gv1@example.test" });
    expect(body.role).toBe("owner");
    expect(body.orgs).toEqual([{ id: body.org.id, name: body.org.name, role: "owner" }]);
    expect((await t.app.inject({ method: "GET", url: "/api/me" })).statusCode).toBe(401);
  });

  it("GET /api/exams: mới nhất trước, chỉ đề của tổ chức mình", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/exams", headers: auth })).json()).toEqual([]);
    await seedBank();
    for (const [title, variants] of [["Đề A", 2], ["Đề B", 3]] as const) {
      const r = await t.app.inject({ method: "POST", url: "/api/exams", headers: auth, payload: { title, matrix, variants, seed: 1 } });
      expect(r.statusCode).toBe(201);
    }
    const list = (await t.app.inject({ method: "GET", url: "/api/exams", headers: auth })).json();
    expect(list.map((e: { title: string }) => e.title)).toEqual(["Đề B", "Đề A"]);
    expect(list[0]).toMatchObject({ subject: "Toán", grade: 10, codes: ["101", "102", "103"] });
    expect(typeof list[0].createdAt).toBe("string");
    const authB = { authorization: `Bearer ${await t.sign({ sub: "gv-2" })}` };
    expect((await t.app.inject({ method: "GET", url: "/api/exams", headers: authB })).json()).toEqual([]);
  });
});

describe("cách ly tổ chức", () => {
  it("người dùng khác không đụng được đề/ngân hàng của tổ chức khác", async () => {
    await seedBank();
    const created = await t.app.inject({ method: "POST", url: "/api/exams", headers: auth, payload: { title: "KT", matrix, variants: 1, seed: 1 } });
    const { examId } = created.json();
    const authB = { authorization: `Bearer ${await t.sign({ sub: "gv-2" })}` };
    const get = (url: string) => t.app.inject({ method: "GET", url, headers: authB });
    const post = (url: string, payload?: unknown) => t.app.inject({ method: "POST", url, headers: authB, payload: payload as object });
    expect((await get(`/api/exams/${examId}/key`)).statusCode).toBe(404);
    expect((await post(`/api/exams/${examId}/grade`, { code: "101", responses: {} })).statusCode).toBe(404);
    expect((await post(`/api/exams/${examId}/links`)).statusCode).toBe(404);
    const list = await get(`/api/questions?subject=${encodeURIComponent("Toán")}&grade=10`);
    expect(list.json()).toEqual([]);
    const userA = await ensureUser(t.db, { sub: "gv-1" });
    const [m] = await membershipsOf(t.db, userA.id);
    const cross = await t.app.inject({ method: "GET", url: "/api/questions?subject=x&grade=10", headers: { ...authB, "x-org-id": m?.orgId ?? "" } });
    expect(cross.statusCode).toBe(403);
  });
});

describe("/dl âm tính", () => {
  const SECRET = "test-secret-test-secret-test-secret!";
  it("404 với token bị sửa, ký sai khoá, mã đề lạ, hết hạn", async () => {
    await seedBank();
    const { examId } = (await t.app.inject({ method: "POST", url: "/api/exams", headers: auth, payload: { title: "KT", matrix, variants: 1, seed: 1 } })).json();
    const userA = await ensureUser(t.db, { sub: "gv-1" });
    const [m] = await membershipsOf(t.db, userA.id);
    const claims = { orgId: m?.orgId ?? "", examId, kind: "key" as const };
    const good = await createDownloadSigner(SECRET).sign(claims);
    expect((await t.app.inject({ method: "GET", url: `/dl/${good}` })).statusCode).toBe(200);
    const [h, p, sig] = good.split(".");
    const flipped = `${p?.slice(0, 5)}${p?.[5] === "A" ? "B" : "A"}${p?.slice(6)}`;
    const urls = [
      `${h}.${flipped}.${sig}`,
      await createDownloadSigner("other-secret-other-secret-other-secret!").sign(claims),
      await createDownloadSigner(SECRET).sign({ ...claims, kind: "exam", code: "999" }),
      await createDownloadSigner(SECRET, Math.floor(Date.now() / 1000) - 10).sign(claims),
    ];
    for (const tok of urls) expect((await t.app.inject({ method: "GET", url: `/dl/${tok}` })).statusCode).toBe(404);
  });
});

describe("tiêu đề & cache", () => {
  it("scheme bearer không phân biệt hoa thường; key/dl no-store", async () => {
    const lower = { authorization: auth.authorization?.replace("Bearer", "bearer") ?? "" };
    expect((await t.app.inject({ method: "POST", url: "/api/questions", headers: lower, payload: mcq() })).statusCode).toBe(201);
    await seedBank();
    const { examId } = (await t.app.inject({ method: "POST", url: "/api/exams", headers: auth, payload: { title: "KT", matrix, variants: 1, seed: 1 } })).json();
    expect((await t.app.inject({ method: "GET", url: `/api/exams/${examId}/key`, headers: auth })).headers["cache-control"]).toBe("no-store");
    const links = (await t.app.inject({ method: "POST", url: `/api/exams/${examId}/links`, headers: auth })).json();
    const file = await t.app.inject({ method: "GET", url: new URL(links.answerKey).pathname });
    expect(file.headers["cache-control"]).toBe("no-store");
  });
});
