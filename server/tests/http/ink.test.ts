import { afterEach, describe, expect, it } from "vitest";
import type { Ai } from "../../src/services/ai";
import { cleanLatex, INK_TASK } from "../../src/services/ink";
import { testApp } from "../helpers/app";

let t: Awaited<ReturnType<typeof testApp>> | undefined;
afterEach(async () => {
  await t?.app.close();
  t = undefined;
});

describe("viết tay → LaTeX", () => {
  it("cleanLatex gọt $, khối mã, \\[ \\]", () => {
    expect(cleanLatex("```latex\n$$x^2+1$$\n```")).toBe("x^2+1");
    expect(cleanLatex("\\[\\frac{a}{b}\\]")).toBe("\\frac{a}{b}");
    expect(cleanLatex("$a$")).toBe("a");
  });

  it("route gửi ảnh PNG tới task doc_anh_bai_lam và trả LaTeX sạch; cần đăng nhập", async () => {
    const seen: { task: string; img: boolean }[] = [];
    const ai: Ai = {
      async chat(task, m) {
        seen.push({ task, img: JSON.stringify(m).includes("data:image/png;base64,iVBOR") });
        return "```\n$\\sqrt{x}+1$\n```";
      },
      async *stream() {},
    };
    const tt = await testApp({ ai });
    t = tt;
    const auth = { authorization: `Bearer ${await tt.sign({ sub: "gv-1", name: "Cô Lan" })}` };
    const body = { imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" };
    const res = await tt.app.inject({ method: "POST", url: "/api/ink/latex", headers: auth, payload: body });
    expect(res.json()).toEqual({ latex: "\\sqrt{x}+1" });
    expect(seen).toEqual([{ task: INK_TASK, img: true }]);
    expect((await tt.app.inject({ method: "POST", url: "/api/ink/latex", payload: body })).statusCode).toBe(401);
    expect((await tt.app.inject({ method: "POST", url: "/api/ink/latex", headers: auth, payload: { imageBase64: "<<not base64 at all>>>>" } })).statusCode).toBe(400);
  });
});
