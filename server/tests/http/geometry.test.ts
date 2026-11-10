// server/tests/http/geometry.test.ts — POST /api/geometry/ai: đề → AI (giả) → spec đã kiểm.
import { afterEach, describe, expect, it } from "vitest";
import { createVerifier } from "../../src/auth/verify";
import { buildApp } from "../../src/http/app";
import type { Ai, AiMessage } from "../../src/services/ai";
import fixtures from "../fixtures/dung-hinh.json";
import { STUDENT_SECRET } from "../helpers/app";
import { testDb } from "../helpers/db";
import { AUDIENCE, ISSUER, makeIssuer } from "../helpers/tokens";

let app: ReturnType<typeof buildApp>;
let auth: Record<string, string>;
const seen: { task: string; messages: AiMessage[] }[] = [];

async function boot(ai?: Ai) {
  const kc = await makeIssuer();
  app = buildApp({ db: await testDb(), verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }), issuer: ISSUER, publicUrl: "http://eduvn.test", downloadSecret: "test-secret-test-secret-test-secret!", studentSecret: STUDENT_SECRET, ai });
  auth = { authorization: `Bearer ${await kc.sign({ sub: "gv-1", name: "Cô Lan" })}` };
}
afterEach(async () => {
  seen.length = 0;
  await app.close();
});
const post = (problem: unknown) => app.inject({ method: "POST", url: "/api/geometry/ai", headers: auth, payload: { problem } as object });

/** AI giả: trả spec mẫu của đề khớp (bọc ```json như model thật hay làm). */
const fakeAi: Ai = {
  chat: async (task, messages) => {
    seen.push({ task, messages });
    const q = String(messages[messages.length - 1]!.content);
    const f = fixtures.find((x) => q.includes(x.problem));
    return f ? `\`\`\`json\n${JSON.stringify(f.spec)}\n\`\`\`` : "{}";
  },
  stream: async function* () {},
};

describe("AI dựng hình từ đề bài", () => {
  it("10 đề mẫu kiểu THPT → spec hợp lệ (task dung_hinh_khong_gian, có hướng dẫn hệ thống)", async () => {
    await boot(fakeAi);
    for (const f of fixtures) {
      const r = await post(f.problem);
      expect(r.statusCode, f.problem).toBe(200);
      expect(r.json().spec.points.length).toBeGreaterThan(0);
    }
    expect(seen.every((s) => s.task === "dung_hinh_khong_gian")).toBe(true);
    expect(String(seen[0]!.messages[0]!.content)).toContain("measures");
  });

  it("lần đầu sai định dạng → gửi lỗi cho AI sửa, lần hai đúng thì nhận", async () => {
    let n = 0;
    await boot({
      chat: async (task, messages) => {
        seen.push({ task, messages });
        return n++ === 0 ? JSON.stringify({ points: [{ type: "midpoint", id: "M", of: ["S", "C"] }], bodies: [] }) : JSON.stringify(fixtures[0]!.spec);
      },
      stream: async function* () {},
    });
    const r = await post(fixtures[0]!.problem);
    expect(r.statusCode).toBe(200);
    expect(String(seen[1]!.messages.at(-1)!.content)).toContain("Điểm chưa được định nghĩa");
  });

  it("AI trả rác hai lần → 503 để người dùng thử lại; đề rỗng → 400; chưa bật cổng → 503", async () => {
    await boot({ chat: async () => "xin lỗi, tôi không vẽ được", stream: async function* () {} });
    const r = await post("Cho hình chóp S.ABC có đáy là tam giác đều cạnh a.");
    expect(r.statusCode).toBe(503);
    expect(r.json().error).toContain("thử lại");
    expect((await post("ngắn")).statusCode).toBe(400);
    await app.close();
    await boot(undefined);
    expect((await post("Cho hình lập phương ABCD.A'B'C'D' cạnh a.")).statusCode).toBe(503);
  });

  it("ánh xạ tạm task qua AI_TASK_OVERRIDES", async () => {
    process.env.AI_TASK_OVERRIDES = JSON.stringify({ dung_hinh_khong_gian: "slide_dan_y" });
    try {
      await boot(fakeAi);
      expect((await post(fixtures[1]!.problem)).statusCode).toBe(200);
      expect(seen[0]!.task).toBe("slide_dan_y");
    } finally {
      delete process.env.AI_TASK_OVERRIDES;
    }
  });
});
