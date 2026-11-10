// Chữ/công thức viết tay (ảnh PNG) → LaTeX qua LLM-vision của cổng AI (task `doc_anh_bai_lam`).
// Không dùng Pix2Text (MIT): kéo theo PyTorch + model ~1 GB, quá nặng cho máy chủ này; LLM-vision đã có sẵn và đọc tốt chữ Việt.
import { ValidationError } from "../errors";
import type { Ai } from "./ai";

export const INK_TASK = "doc_anh_bai_lam";
export const INK_SYSTEM = `Bạn nhận một ảnh chữ viết tay (chữ trắng/đen trên nền trơn) là MỘT công thức toán hoặc vài chữ.
Chỉ trả về mã LaTeX của công thức đó, trên một dòng, không có $…$, không có khối mã, không giải thích.
Ví dụ: \\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}. Nếu là chữ thường (không phải công thức) thì trả đúng chữ đó, dùng \\text{…} cho phần chữ trong công thức.
Nếu ảnh trống hoặc không đọc được, trả về chuỗi rỗng.`;

/** Gọt câu trả lời của AI về LaTeX thuần. */
export function cleanLatex(raw: string): string {
  let s = raw.trim().replace(/^```(?:latex|tex)?\s*|\s*```$/gi, "").trim();
  s = s.replace(/^\\\[|\\\]$/g, "").replace(/^\\\(|\\\)$/g, "").trim();
  s = s.replace(/^\$\$?|\$\$?$/g, "").trim();
  return s.replace(/\s*\n\s*/g, " ").slice(0, 500);
}

export async function inkToLatex(ai: Ai, imageBase64: string): Promise<string> {
  if (imageBase64.length > 8 * 1024 * 1024) throw new ValidationError(["Ảnh quá lớn"]);
  if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) throw new ValidationError(["Ảnh không hợp lệ"]);
  const out = await ai.chat(INK_TASK, [
    { role: "system", content: INK_SYSTEM },
    { role: "user", content: [{ type: "text", text: "Đọc công thức viết tay trong ảnh." }, { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }] },
  ]);
  return cleanLatex(out);
}
