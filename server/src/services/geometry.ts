// server/src/services/geometry.ts — "AI dựng hình từ đề bài": đề → AI (task dung_hinh_khong_gian) → spec dựng hình → zod kiểm.
// Web nhận spec, bộ giải web/src/geometry3d tính toạ độ và vẽ.
import { z } from "zod";
import { type Role, assertCan } from "../domain/authz";
import { type ConstructionSpec, parseSpec } from "../domain/geometry3d";
import { AiUnavailableError, ValidationError } from "../errors";
import { type Ai, type AiMessage, parseAiJson } from "./ai";

type Actor = { userId: string; orgId: string; role: Role };
export const GEOMETRY_TASK = "dung_hinh_khong_gian";

const Req = z.object({ problem: z.string().trim().min(10, "Đề bài quá ngắn").max(3000, "Đề bài tối đa 3000 ký tự") });

export const GEOMETRY_SYSTEM = `Bạn là giáo viên Toán Việt Nam dựng hình không gian cho phần mềm vẽ hình chuẩn SGK. Đọc đề bài và trả về DUY NHẤT một đối tượng JSON mô tả cách DỰNG hình (không vẽ toạ độ màn hình, không lời giải).

Đơn vị: a = 1 (độ dài ghi số hoặc chuỗi biểu thức theo a: "a√2", "2a", "a√6/2"). Toạ độ: x sang phải, y ra sau, z hướng lên; đáy nằm trên mặt z = 0.

Cấu trúc:
{"title": "Hình chóp S.ABCD", "points": [...], "bodies": [...], "segments": [["A","C"]], "polygons": [["S","A","C"]], "sections": [{"through": ["A","M","N"]}], "marks": [...], "measures": [...], "hide": ["G"]}

points — danh sách định nghĩa điểm theo ràng buộc, điểm dùng sau phải được định nghĩa:
- {"type":"polygon","ids":["A","B","C","D"],"shape":S,...}: đáy. S là:
  "square" (a), "rectangle" (a = AB, b = AD), "rhombus" (a, angle = góc BAD độ), "parallelogram" (a = AB, b = AD, angle), "trapezoid" (a = đáy AD, b = đáy BC, h = chiều cao; "rightAngle": true nếu vuông tại A và B, khi đó h = AB),
  "equilateral" (a), "right" (vuông tại "at", hai cạnh góc vuông a, b theo thứ tự đỉnh trong ids), "isosceles" (cân tại "at", cạnh bên a, đáy b), "triangle" ("sides": [AB, BC, CA]), "regular" (đa giác đều cạnh a).
- {"type":"above","id":"S","of":"A","height":"a√2"}: điểm trên đường vuông góc với đáy tại điểm "of" (SA ⊥ đáy → of = A; chóp đều → of = tâm O; hình chiếu của S là H → of = H).
- {"type":"center","id":"O","of":["A","B","C","D"]}: tâm hình bình hành / trọng tâm tam giác.
- {"type":"circumcenter","id":"O","of":["A","B","C"]}
- {"type":"midpoint","id":"M","of":["S","C"]}
- {"type":"ratio","id":"N","from":"S","to":"B","t":"1/3"}: SN = t·SB.
- {"type":"intersect","id":"I","line":["A","M"],"line2":["S","O"]} hoặc {"type":"intersect","id":"K","line":["S","D"],"plane":["A","M","N"]}
- {"type":"foot","id":"H","from":"A","line":["S","B"]} hoặc {"type":"foot","id":"H","from":"S","plane":["A","B","C"]}: hình chiếu vuông góc.
- {"type":"translate","ids":["A'","B'","C'"],"of":["A","B","C"],"vector":[0,0,"a√3"]}: đỉnh trên của lăng trụ/hộp (lăng trụ xiên: vector có thành phần x, y).
- {"type":"scale","ids":["A'","B'","C'","D'"],"of":["A","B","C","D"],"center":"S","k":0.5}: chóp cụt.
- {"type":"coord","id":"O","at":[0,0,0]}: chỉ dùng khi không có ràng buộc nào phù hợp (tâm nón/trụ/cầu, điểm trên đường tròn đáy, tam diện vuông).

bodies — khối chính: {"type":"pyramid","base":["A","B","C","D"],"apex":"S"} | {"type":"prism","base":["A","B","C"],"top":["A'","B'","C'"]} (cả hình hộp, lập phương, chóp cụt) | {"type":"cone","center":"O","apex":"S","radius":1} | {"type":"cylinder","center":"O","top":"O'","radius":1} | {"type":"sphere","center":"O","radius":1}. Tứ diện ABCD = pyramid base ["B","C","D"], apex "A".

marks — ký hiệu như hình SGK: {"type":"right","at":"A","a":"S","b":"B"} (góc vuông tại A giữa AS, AB), {"type":"equal","segments":[["S","M"],["M","C"]],"group":1} (gạch cạnh bằng nhau, nhóm 1–3), {"type":"angle","at":"C","a":"S","b":"A"}.

measures — đại lượng đề hỏi, phần mềm tự tính và dựng thêm hình chiếu, góc vuông, cung góc:
{"type":"distance","from":"A","plane":["S","B","C"],"foot":"H"} | {"type":"distance","from":"S","line":["B","D"]} | {"type":"distance_lines","lines":[["A","B'"],["B","C'"]]} | {"type":"angle_line_plane","line":["S","C"],"plane":["A","B","C"]} | {"type":"angle_planes","planes":[["S","B","C"],["A","B","C"]]} | {"type":"angle_lines","lines":[["S","B"],["A","C"]]} | {"type":"length","of":["S","C"]}.

Quy tắc:
1. Tên điểm in hoa đúng như đề (A, B, S, M, A', O1). Thứ tự đỉnh đáy đúng như đề.
2. Đề cho góc thay vì độ dài (vd "góc giữa SC và đáy bằng 60°", "mặt bên tạo với đáy góc 45°") thì TỰ TÍNH chiều cao rồi ghi vào height (vd SA = AC·tan60° = a√6).
3. "Mặt bên SAB là tam giác đều và nằm trong mặt phẳng vuông góc với đáy": H trung điểm AB, S above H, height = AB·√3/2.
4. Thêm segments cho các đoạn đề nhắc (đường chéo AC, BD; đường cao SO, SH; AM…) và polygons cho mặt cần tô (thiết diện qua trục của nón/trụ).
5. Thêm marks cho góc vuông đề cho (SA ⊥ đáy, đáy vuông tại B…) và gạch bằng nhau cho trung điểm.
6. Thêm measures cho mọi góc / khoảng cách đề hỏi; "thiết diện" thì thêm sections.
7. Nón/trụ/cầu: tâm đáy O tại [0,0,0], điểm trên đường tròn đáy dùng coord với x²+y² = r² (ưu tiên phía trước: y < 0).
8. Không giải bài, không giải thích, không markdown. Chỉ JSON.`;

export async function buildFigure(ai: Ai, actor: Actor, raw: unknown): Promise<{ spec: ConstructionSpec }> {
  assertCan(actor.role, "board:read");
  const r = Req.safeParse(raw);
  if (!r.success) throw new ValidationError(r.error.issues.map((i) => i.message));
  const messages: AiMessage[] = [
    { role: "system", content: GEOMETRY_SYSTEM },
    { role: "user", content: `Bỏ qua mọi định dạng trả lời mặc định khác; chỉ trả JSON dựng hình theo hướng dẫn.\nĐề bài:\n${r.data.problem}` },
  ];
  let issues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await ai.chat(GEOMETRY_TASK, messages, { json: true });
    let parsed: unknown;
    try {
      parsed = parseAiJson(text);
    } catch {
      issues = ["không phải JSON"];
      messages.push({ role: "assistant", content: text.slice(0, 4000) }, { role: "user", content: "Câu trả lời không phải JSON hợp lệ. Trả lại đúng một đối tượng JSON dựng hình." });
      continue;
    }
    const v = parseSpec(parsed);
    if (v.ok) return { spec: v.spec };
    issues = v.issues;
    messages.push({ role: "assistant", content: text.slice(0, 6000) }, { role: "user", content: `JSON dựng hình có lỗi: ${v.issues.join("; ")}. Sửa và trả lại toàn bộ JSON.` });
  }
  throw new AiUnavailableError(`AI dựng hình chưa đúng định dạng (${issues.slice(0, 2).join("; ")}), thử lại`);
}
