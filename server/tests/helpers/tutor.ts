import type { LightMyRequestResponse } from "fastify";
import JSZip from "jszip";
import { addMember, ensureUser } from "../../src/db/repo";
import { testApp } from "./app";
import { fakeTutorAi } from "./tutorAi";

export type T = Awaited<ReturnType<typeof testApp>> & { fake: ReturnType<typeof fakeTutorAi>; gv: Record<string, string>; hs: Record<string, string>; orgId: string; call: (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, headers?: Record<string, string>) => Promise<LightMyRequestResponse> };

/** App có AI giả; gv = giáo viên (chủ tổ chức), hs = học sinh trong cùng tổ chức. */
export async function tutorApp(aiOpts: Parameters<typeof fakeTutorAi>[0] = {}): Promise<T> {
  const fake = fakeTutorAi(aiOpts);
  const t = await testApp({ ai: fake.ai });
  const gv = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
  const me = (await t.app.inject({ method: "GET", url: "/api/me", headers: gv })).json();
  const orgId = me.org.id as string;
  const user = await ensureUser(t.db, { sub: "hs-1", name: "Minh" });
  await addMember(t.db, orgId, user.id, "student");
  const hs = { authorization: `Bearer ${await t.sign({ sub: "hs-1", name: "Minh" })}`, "x-org-id": orgId };
  const call: T["call"] = (method, url, payload, headers = gv) => t.app.inject({ method, url, headers, payload: payload as object });
  return { ...t, fake, gv, hs, orgId, call };
}

/** DOCX tối thiểu, mỗi phần tử = một trang (ngắt trang thật). */
export async function makeDocx(pages: string[]): Promise<string> {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = pages.map((p, i) => `${p.split("\n\n").map((para) => `<w:p><w:r><w:t>${esc(para)}</w:t></w:r></w:p>`).join("")}${i < pages.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ""}`).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return (await zip.generateAsync({ type: "nodebuffer" })).toString("base64");
}

export const TOAN8_PAGES = [
  "Bài 3. Những hằng đẳng thức đáng nhớ\n\nBình phương của một tổng. Với hai số a và b bất kì, ta có (a+b)^2 = a^2 + 2ab + b^2. Bình phương của một tổng bằng bình phương số thứ nhất, cộng hai lần tích số thứ nhất với số thứ hai, cộng bình phương số thứ hai.\n\nVí dụ: (x+3)^2 = x^2 + 6x + 9.",
  "Hiệu hai bình phương. Với hai số a và b, ta có a^2 - b^2 = (a-b)(a+b). Hiệu hai bình phương bằng tích của tổng hai số với hiệu của chúng.\n\nVí dụ: x^2 - 9 = (x-3)(x+3). Học sinh hay nhầm giữa bình phương của một hiệu và hiệu hai bình phương.",
  "Lập phương của một tổng. Với hai số a và b, (a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3. Công thức này dùng để khai triển các biểu thức có dạng lập phương và rút gọn đa thức bậc ba.",
];

export function parseSse(body: string): Record<string, unknown>[] {
  return body.split("\n\n").filter((b) => b.startsWith("data: ")).map((b) => JSON.parse(b.slice(6)) as Record<string, unknown>);
}

export async function makeKb(t: T, pages = TOAN8_PAGES) {
  const kb = (await t.call("POST", "/api/tutor/kbs", { name: "Toán 8 - Hằng đẳng thức", subject: "Toán", grade: 8 })).json();
  const doc = await t.call("POST", `/api/tutor/kbs/${kb.id}/docs`, { name: "toan8-bai3.docx", contentBase64: await makeDocx(pages) });
  return { kb, doc };
}
