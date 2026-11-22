/**
 * Bộ phân tích công thức hoá học tất định (recursive-descent parser).
 * Hỗ trợ:
 *  - Ngoặc lồng nhau: (), [], {} (vd: Ca(OH)2, Al2(SO4)3, Fe4[Fe(CN)6]3, [Cu(NH3)4](OH)2)
 *  - Tinh thể ngậm nước / muối kép (hydrat): CuSO4.5H2O, Na2CO3·10H2O, KAl(SO4)2·12H2O
 *  - Ion đa nguyên tử & đơn nguyên tử: SO4^2-, MnO4-, Fe3+, NH4+, Cr2O7^2-, [Fe(CN)6]^4-, SO₄²⁻, Fe³⁺, e-
 *  - Trạng thái chất tuỳ chọn: (s), (l), (g), (aq), ↓, ↑
 *  - Chuẩn hoá chỉ số dưới Unicode (₀–₉) và mũ điện tích (⁰–⁹⁺⁻).
 */
import { elementBySymbol } from "./periodicTable";

export type PhysicalStateTag = "s" | "l" | "g" | "aq";

export interface ParsedFormula {
  raw: string;
  /** Dạng chuẩn hoá ASCII không kèm trạng thái (vd: "CuSO4.5H2O", "MnO4-", "Fe3+"). */
  canonical: string;
  /** Số nguyên tử mỗi nguyên tố (không bao gồm electron tự do). */
  atoms: Record<string, number>;
  /** Điện tích ion nguyên (vd: Fe3+ → +3, SO4^2- → -2, e- → -1, phân tử trung hoà → 0). */
  charge: number;
  /** Có phải hạt electron tự do (e⁻) dùng trong bán phản ứng oxi hoá – khử hay không. */
  isElectron: boolean;
  /** Trạng thái chất nếu có ghi kèm. */
  state?: PhysicalStateTag;
  /** Ký hiệu kết tủa ↓ hoặc bay hơi ↑ nếu có. */
  precipitateOrGas?: "↓" | "↑";
  /** Khối lượng mol theo IUPAC 2021 (g/mol). */
  molarMassIupac: number;
  /** Khối lượng mol làm tròn theo SGK Việt Nam (g/mol). */
  molarMassSgk: number;
}

const SUB_MAP: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};
const SUP_MAP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-",
};

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

function normalizeFormulaText(raw: string): string {
  let s = raw.normalize("NFC").trim();
  // Ký hiệu trừ Unicode → ASCII '-'
  s = s.replace(/[−–‐‑]/g, "-");
  // Ký hiệu chấm hydrat • · ∗ * → '.'
  s = s.replace(/[·•∗*]/g, ".");
  // Chuẩn hoá chỉ số dưới Unicode → số thường
  s = s.replace(/[₀-₉]/g, (c) => SUB_MAP[c] ?? c);
  // Gom cụm số mũ Unicode ở cuối thành ^...
  s = s.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻])$/, (m) => "^" + m.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, (c) => SUP_MAP[c] ?? c));
  // Dạng LaTeX phổ biến: _{2}, ^{2-}, \mathrm{...}
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, "$1").replace(/_\{(\d+)\}/g, "$1").replace(/\^\{([0-9]*[+-]|[+-][0-9]*)\}/g, "^$1");
  return s.replace(/\s+/g, "");
}

/** Tách trạng thái (s)/(l)/(g)/(aq), ↓, ↑ ở cuối công thức. */
function stripState(s: string): { core: string; state?: PhysicalStateTag; arrow?: "↓" | "↑" } {
  let core = s;
  let arrow: "↓" | "↑" | undefined;
  if (core.endsWith("↓") || core.endsWith("↑")) {
    arrow = core.slice(-1) as "↓" | "↑";
    core = core.slice(0, -1);
  }
  let state: PhysicalStateTag | undefined;
  const m = /\((s|l|g|aq)\)$/.exec(core);
  if (m) {
    state = m[1] as PhysicalStateTag;
    core = core.slice(0, -m[0].length);
  }
  return { core, state, arrow };
}

/** Tách phần điện tích ở cuối công thức (nếu có). */
function extractCharge(s: string): { body: string; charge: number } {
  // Trường hợp electron tự do: e-, e^-, e^1-, e
  if (/^e(\^?1?-)?$/.test(s)) {
    if (s === "e") return { body: "e", charge: -1 };
    return { body: "e", charge: -1 };
  }
  // Dạng có dấu mũ tường minh: ^2+, ^3-, ^+, ^-, ^+2, ^-2
  const explicit = /\^(\d*)([+-])$/.exec(s) ?? /\^([+-])(\d*)$/.exec(s);
  if (explicit) {
    const signStr = explicit[1] === "+" || explicit[1] === "-" ? explicit[1] : explicit[2]!;
    const magStr = explicit[1] === "+" || explicit[1] === "-" ? explicit[2]! : explicit[1]!;
    const mag = magStr ? Number(magStr) : 1;
    if (!Number.isInteger(mag) || mag <= 0 || mag > 12) throw new Error(`Điện tích không hợp lệ trong "${s}"`);
    return { body: s.slice(0, -explicit[0].length), charge: signStr === "+" ? mag : -mag };
  }
  // Dạng không có dấu ^ nhưng kết thúc bằng + hoặc -: Fe3+, MnO4-, SO42- (chú ý phân biệt chỉ số dưới với điện tích!)
  // Nếu kết thúc bằng [+-] ngay sau chữ cái hoặc ngoặc đóng: Na+, Cl-, OH-, NH4+, MnO4-, Fe(CN)6]4-
  if (s.endsWith("+") || s.endsWith("-")) {
    const sign = s.endsWith("+") ? 1 : -1;
    const withoutSign = s.slice(0, -1);
    // Nếu trước dấu có ngoặc đóng rồi số: [SO4]2-, [Fe(CN)6]4-, (SO4)2-
    const afterClose = /([)\]}])(\d+)$/.exec(withoutSign);
    if (afterClose) {
      const mag = Number(afterClose[2]);
      if (mag <= 0 || mag > 12) throw new Error(`Điện tích không hợp lệ trong "${s}"`);
      return { body: withoutSign.slice(0, -afterClose[2]!.length), charge: sign * mag };
    }
    // Đơn nguyên tử ion: Fe2+, Fe3+, Cu2+, O2-, S2-, N3-, Al3+, Ca2+, Cr3+
    const mono = /^([A-Z][a-z]?)(\d)$/.exec(withoutSign);
    if (mono && elementBySymbol(mono[1]!)) {
      const mag = Number(mono[2]);
      // Ngoại lệ duy nhất có thể là ion phân tử đồng hạch như O2- (superoxide), I3-, N3- — nếu muốn chỉ rõ chỉ số nên viết O2^-,
      // còn với kim loại/đơn nguyên tử phổ biến (Fe2+, Cu2+, Al3+, Ca2+, Mg2+, Zn2+, S2-, O2-, Cl-, Na+) thì số cuối là điện tích.
      return { body: mono[1]!, charge: sign * mag };
    }
    // Các ion phổ biến không viết ^: NH4+, H3O+, MnO4-, NO3-, ClO3-, ClO4-, HCO3-, HSO4-, H2PO4-, CH3COO-, OH-, CN-, SCN-
    // Số liền trước +/- là chỉ số nguyên tử, điện tích là ±1 (muốn điện tích ≥ 2 trên ion đa nguyên tử phải viết ^2- hoặc [SO4]2- hoặc SO4^2-).
    return { body: withoutSign, charge: sign };
  }
  return { body: s, charge: 0 };
}

function parseSinglePart(part: string): Record<string, number> {
  if (!part) throw new Error("Công thức rỗng");
  let i = 0;

  const readNumber = (): number => {
    const start = i;
    while (i < part.length && part[i]! >= "0" && part[i]! <= "9") i++;
    if (i === start) return 1;
    const n = Number(part.slice(start, i));
    if (!Number.isInteger(n) || n <= 0) throw new Error(`Chỉ số nguyên tử phải dương trong "${part}"`);
    return n;
  };

  const parseGroup = (expectedClose: string | null): Record<string, number> => {
    const counts: Record<string, number> = {};
    let hadItem = false;
    while (i < part.length) {
      const ch = part[i]!;
      if (ch === ")" || ch === "]" || ch === "}") {
        if (ch !== expectedClose) throw new Error(`Dấu ngoặc "${ch}" không khớp trong "${part}"`);
        if (!hadItem) throw new Error(`Ngoặc rỗng trong "${part}"`);
        i++;
        return counts;
      }
      if (ch in OPEN_TO_CLOSE) {
        const close = OPEN_TO_CLOSE[ch]!;
        i++;
        const inner = parseGroup(close);
        const mult = readNumber();
        for (const [el, cnt] of Object.entries(inner)) {
          counts[el] = (counts[el] ?? 0) + cnt * mult;
        }
        hadItem = true;
        continue;
      }
      if (ch >= "A" && ch <= "Z") {
        let sym = ch;
        i++;
        while (i < part.length && part[i]! >= "a" && part[i]! <= "z") {
          sym += part[i]!;
          i++;
        }
        if (!elementBySymbol(sym)) {
          throw new Error(`Không tồn tại nguyên tố "${sym}" trong bảng tuần hoàn (công thức "${part}")`);
        }
        const mult = readNumber();
        counts[sym] = (counts[sym] ?? 0) + mult;
        hadItem = true;
        continue;
      }
      throw new Error(`Ký tự không hợp lệ "${ch}" tại vị trí ${i + 1} trong "${part}"`);
    }
    if (expectedClose !== null) throw new Error(`Thiếu dấu đóng "${expectedClose}" trong "${part}"`);
    if (!hadItem) throw new Error(`Công thức không có nguyên tố hợp lệ: "${part}"`);
    return counts;
  };

  return parseGroup(null);
}

/**
 * Phân tích một công thức hoá học (hỗ trợ ngoặc lồng, hydrat, ion, trạng thái).
 * Ném Error tiếng Việt rõ ràng nếu công thức không hợp lệ.
 */
export function parseFormula(raw: string): ParsedFormula {
  const norm = normalizeFormulaText(raw);
  if (!norm) throw new Error("Công thức hoá học rỗng");

  const { core, state, arrow } = stripState(norm);
  if (!core) throw new Error(`Công thức không hợp lệ: "${raw}"`);

  const { body, charge } = extractCharge(core);
  if (body === "e") {
    return {
      raw,
      canonical: "e-",
      atoms: {},
      charge: -1,
      isElectron: true,
      ...(state ? { state } : {}),
      molarMassIupac: 0,
      molarMassSgk: 0,
    };
  }

  // Tách hydrat bằng dấu chấm '.' (vd: CuSO4.5H2O → ["CuSO4", "5H2O"])
  const segments = body.split(".");
  if (segments.some((seg) => seg.length === 0)) {
    throw new Error(`Dấu phân tách hydrat "." sai vị trí trong "${raw}"`);
  }

  const atoms: Record<string, number> = {};
  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    let seg = segments[sIdx]!;
    let segMult = 1;
    // Hệ số đầu phân đoạn hydrat (vd: 5H2O, 10H2O; phân đoạn đầu không chấp nhận hệ số phản ứng)
    if (sIdx > 0) {
      const m = /^(\d+)(.+)$/.exec(seg);
      if (m) {
        segMult = Number(m[1]);
        if (segMult <= 0) throw new Error(`Hệ số hydrat phải dương trong "${raw}"`);
        seg = m[2]!;
      }
    }
    const partAtoms = parseSinglePart(seg);
    for (const [el, cnt] of Object.entries(partAtoms)) {
      atoms[el] = (atoms[el] ?? 0) + cnt * segMult;
    }
  }

  let molarMassIupac = 0;
  let molarMassSgk = 0;
  for (const [sym, cnt] of Object.entries(atoms)) {
    const el = elementBySymbol(sym)!;
    molarMassIupac += el.atomicMass * cnt;
    molarMassSgk += el.sgkMass * cnt;
  }

  const chargeText =
    charge === 0 ? "" : `${Math.abs(charge) > 1 ? `^${Math.abs(charge)}` : ""}${charge > 0 ? "+" : "-"}`;

  return {
    raw,
    canonical: `${body}${chargeText}`,
    atoms,
    charge,
    isElectron: false,
    ...(state ? { state } : {}),
    ...(arrow ? { precipitateOrGas: arrow } : {}),
    molarMassIupac: Math.round(molarMassIupac * 10000) / 10000,
    molarMassSgk: Math.round(molarMassSgk * 1000) / 1000,
  };
}

const ASCII_TO_SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const ASCII_TO_SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" };

/** Định dạng công thức hoá học sang Unicode chuẩn đẹp (H₂SO₄, CuSO₄·5H₂O, Fe³⁺, SO₄²⁻). */
export function formatFormulaUnicode(rawOrParsed: string | ParsedFormula): string {
  const p = typeof rawOrParsed === "string" ? parseFormula(rawOrParsed) : rawOrParsed;
  if (p.isElectron) return "e⁻";
  const body = p.canonical.replace(/\^?\d*[+-]$/, "");
  const formattedBody = body
    .split(".")
    .map((seg, idx) => {
      if (idx > 0) {
        const m = /^(\d+)(.+)$/.exec(seg);
        if (m) return `${m[1]}${m[2]!.replace(/(?<=[A-Za-z)\]}])(\d+)/g, (d) => d.replace(/\d/g, (x) => ASCII_TO_SUB[x] ?? x))}`;
      }
      return seg.replace(/(?<=[A-Za-z)\]}])(\d+)/g, (d) => d.replace(/\d/g, (x) => ASCII_TO_SUB[x] ?? x));
    })
    .join("·");
  const chargeStr =
    p.charge === 0
      ? ""
      : `${Math.abs(p.charge) > 1 ? String(Math.abs(p.charge)) : ""}${p.charge > 0 ? "+" : "-"}`.replace(/./g, (c) => ASCII_TO_SUP[c] ?? c);
  const stateStr = p.state ? `(${p.state})` : "";
  const arrowStr = p.precipitateOrGas ?? "";
  return `${formattedBody}${chargeStr}${stateStr}${arrowStr}`;
}

/** Định dạng công thức sang HTML (<sub> / <sup>) an toàn, có escape. */
export function formatFormulaHtml(rawOrParsed: string | ParsedFormula): string {
  const p = typeof rawOrParsed === "string" ? parseFormula(rawOrParsed) : rawOrParsed;
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  if (p.isElectron) return "e<sup>−</sup>";
  const body = p.canonical.replace(/\^?\d*[+-]$/, "");
  const formattedBody = body
    .split(".")
    .map((seg, idx) => {
      if (idx > 0) {
        const m = /^(\d+)(.+)$/.exec(seg);
        if (m) return `${esc(m[1]!)}${esc(m[2]!).replace(/(?<=[A-Za-z)\]}])(\d+)/g, "<sub>$1</sub>")}`;
      }
      return esc(seg).replace(/(?<=[A-Za-z)\]}])(\d+)/g, "<sub>$1</sub>");
    })
    .join("·");
  const chargeHtml =
    p.charge === 0 ? "" : `<sup>${Math.abs(p.charge) > 1 ? Math.abs(p.charge) : ""}${p.charge > 0 ? "+" : "−"}</sup>`;
  const stateStr = p.state ? `(${p.state})` : "";
  const arrowStr = p.precipitateOrGas ?? "";
  return `${formattedBody}${chargeHtml}${stateStr}${arrowStr}`;
}
