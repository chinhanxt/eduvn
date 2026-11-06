/** Gõ tắt kiểu Việt cho MathLive (áp dụng khi gõ bằng bàn phím thật). */
export const VN_SHORTCUTS: Record<string, string> = {
  can: "\\sqrt{#?}", can3: "\\sqrt[3]{#?}", goc: "\\widehat{#?}", vt: "\\overrightarrow{#?}",
  he: "\\begin{cases}#?\\\\#?\\end{cases}", hoac: "\\left[\\begin{array}{l}#?\\\\#?\\end{array}\\right.",
  vc: "\\infty", vg: "\\perp", ss: "\\parallel", tp: "\\int_{#?}^{#?}", thuoc: "\\in", do: "^{\\circ}",
  ">=": "\\ge", "<=": "\\le", "!=": "\\ne", "=>": "\\Rightarrow", "<=>": "\\Leftrightarrow",
};
export const HINTS: [string, string][] = [["x^2", "x^2"], ["1/2", "\\frac{1}{2}"], ["can", "\\sqrt{x}"], ["pi", "\\pi"], [">=", "\\ge"], ["goc", "\\widehat{A}"], ["vt", "\\overrightarrow{AB}"], ["he", "\\{"]];

export const TAB_NAMES = ["Cơ bản", "Hàm số", "Hình học", "Giải tích · Tổ hợp"] as const;
export type TabName = (typeof TAB_NAMES)[number];

export const SETS: Record<TabName, [string, string][]> = {
  "Cơ bản": [
    ["x", "x"], ["y", "y"], ["a", "a"], ["b", "b"], ["(\\square)", "\\left(#0\\right)"], ["[\\square]", "\\left[#0\\right]"],
    ["\\square^2", "#@^{2}"], ["\\square^{\\square}", "#@^{#?}"], ["\\sqrt{\\square}", "\\sqrt{#0}"], ["\\sqrt[3]{\\square}", "\\sqrt[3]{#0}"], ["\\frac{\\square}{\\square}", "\\frac{#0}{#?}"], ["|\\square|", "\\left|#0\\right|"],
    ["\\pi", "\\pi"], ["\\pm", "\\pm"], ["<", "<"], [">", ">"], ["\\le", "\\le"], ["\\ge", "\\ge"],
    ["\\ne", "\\ne"], ["\\approx", "\\approx"], ["\\%", "\\%"], ["^{\\circ}", "^{\\circ}"], [";", ";"], ["\\square_{\\square}", "#@_{#?}"],
  ],
  "Hàm số": [
    ["\\sin", "\\sin"], ["\\cos", "\\cos"], ["\\tan", "\\tan"], ["\\cot", "\\cot"], ["\\log_{\\square}", "\\log_{#?}"], ["\\ln", "\\ln"],
    ["e^{\\square}", "e^{#?}"], ["f(x)", "f(x)"], ["f'(x)", "f'(x)"], ["y'", "y'"], ["\\infty", "\\infty"], ["\\mathbb{R}", "\\mathbb{R}"],
    ["[a;b]", "\\left[#?;#?\\right]"], ["(a;b)", "\\left(#?;#?\\right)"], ["[a;b)", "\\left[#?;#?\\right)"], ["(a;b]", "\\left(#?;#?\\right]"], ["\\mathbb{R}\\setminus\\{\\}", "\\mathbb{R}\\setminus\\left\\{#?\\right\\}"], ["\\in", "\\in"],
    ["\\sin^2", "\\sin^2"], ["\\cos^2", "\\cos^2"], ["\\frac{\\pi}{2}", "\\frac{\\pi}{2}"], ["k2\\pi", "k2\\pi"], ["\\Rightarrow", "\\Rightarrow"], ["\\Leftrightarrow", "\\Leftrightarrow"],
  ],
  "Hình học": [
    ["\\widehat{ABC}", "\\widehat{#?}"], ["\\overrightarrow{AB}", "\\overrightarrow{#?}"], ["\\triangle", "\\triangle "], ["\\perp", "\\perp"], ["\\parallel", "\\parallel"], ["^{\\circ}", "^{\\circ}"],
    ["\\in", "\\in"], ["\\notin", "\\notin"], ["\\subset", "\\subset"], ["\\cap", "\\cap"], ["\\cup", "\\cup"], ["\\varnothing", "\\varnothing"],
    ["\\backsim", "\\backsim"], ["=", "="], ["\\cdot", "\\cdot"], ["(\\alpha)", "\\left(\\alpha\\right)"], ["S_{ABC}", "S_{#?}"], ["V", "V"],
    ["\\vec{0}", "\\overrightarrow{0}"], ["\\cos(\\vec a,\\vec b)", "\\cos\\left(#?,#?\\right)"], ["d(A,P)", "d\\left(#?,#?\\right)"], ["\\alpha", "\\alpha"], ["\\beta", "\\beta"], ["\\Delta", "\\Delta"],
  ],
  "Giải tích · Tổ hợp": [
    ["\\lim\\limits_{x\\to a}", "\\lim\\limits_{x\\to#?}"], ["\\lim\\limits_{x\\to+\\infty}", "\\lim\\limits_{x\\to+\\infty}"], ["\\int", "\\int"], ["\\int_a^b", "\\int_{#?}^{#?}"], ["\\sum", "\\sum_{#?}^{#?}"], ["dx", "\\,dx"],
    ["n!", "#@!"], ["C_n^k", "C_{#?}^{#?}"], ["A_n^k", "A_{#?}^{#?}"], ["P_n", "P_{#?}"], ["\\to", "\\to"], ["\\infty", "\\infty"],
    ["\\begin{cases}\\square\\\\\\square\\end{cases}", "\\begin{cases}#?\\\\#?\\end{cases}"], ["\\left[\\begin{array}{l}\\square\\\\\\square\\end{array}\\right.", "\\left[\\begin{array}{l}#?\\\\#?\\end{array}\\right."], ["\\Rightarrow", "\\Rightarrow"], ["\\Leftrightarrow", "\\Leftrightarrow"], ["\\forall", "\\forall"], ["\\exists", "\\exists"],
    ["\\log_a b", "\\log_{#?}#?"], ["F(x)", "F(x)"], ["\\left.F\\right|_a^b", "\\left.#?\\right|_{#?}^{#?}"], ["\\Delta", "\\Delta"], ["\\overline{x}", "\\overline{#?}"], ["\\lvert\\square\\rvert", "\\left|#0\\right|"],
  ],
};
export const NUM = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ",", "="];
export const OPS: [string, string][] = [["+", "+"], ["-", "-"], ["\\times", "\\cdot"], [":", ":"]];
