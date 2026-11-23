// server/src/subjects/dia/calc.ts
// Tính toán, chấm bài tất định, chọn dạng biểu đồ thích hợp và sinh nhận xét gợi ý tất định cho Địa lí (CTGDPT 2018 & TN THPT).
import { z } from "zod";
import { type DiaDataTable, extractYears } from "./verify";

export const roundTo = (n: number, decimals: number): number => {
  const p = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * p) / p;
};

export const fmtVn = (n: number, decimals = 1): string => {
  const r = roundTo(n, decimals);
  const fixed = decimals > 0 ? Math.abs(r).toFixed(decimals) : String(Math.round(Math.abs(r)));
  const [intPart, fracPart] = fixed.split(".");
  const grouped = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = r < 0 ? "-" : "";
  return fracPart ? `${sign}${grouped},${fracPart}` : `${sign}${grouped}`;
};

// ===================== 1. CÔNG THỨC ĐỊA LÍ CHUẨN =====================

export function calcTiTrong(part: number, total: number, decimals = 1): number {
  if (total <= 0) throw new Error("Tổng số liệu phải lớn hơn 0");
  return roundTo((part / total) * 100, decimals);
}

export function calcTocDoTangTruong(value: number, baseValue: number, decimals = 1): number {
  if (baseValue <= 0) throw new Error("Giá trị năm gốc phải lớn hơn 0");
  return roundTo((value / baseValue) * 100, decimals);
}

export function calcMucTangPhanTram(value: number, baseValue: number, decimals = 1): number {
  if (baseValue <= 0) throw new Error("Giá trị năm gốc phải lớn hơn 0");
  return roundTo(((value - baseValue) / baseValue) * 100, decimals);
}

export type PopUnit = "nguoi" | "nghin_nguoi" | "trieu_nguoi";
export type AreaUnit = "km2" | "nghin_km2";

const POP_MULT: Record<PopUnit, number> = { nguoi: 1, nghin_nguoi: 1_000, trieu_nguoi: 1_000_000 };
const AREA_MULT: Record<AreaUnit, number> = { km2: 1, nghin_km2: 1_000 };

export function calcMatDoDanSo(
  population: number,
  popUnit: PopUnit,
  area: number,
  areaUnit: AreaUnit,
  decimals = 0,
): number {
  if (area <= 0) throw new Error("Diện tích phải lớn hơn 0");
  const people = population * POP_MULT[popUnit];
  const km2 = area * AREA_MULT[areaUnit];
  return roundTo(people / km2, decimals);
}

export type OutputUnit = "ta" | "tan" | "nghin_tan" | "trieu_tan";
export type LandUnit = "ha" | "nghin_ha" | "trieu_ha";

const OUT_TO_TA: Record<OutputUnit, number> = { ta: 1, tan: 10, nghin_tan: 10_000, trieu_tan: 10_000_000 };
const LAND_TO_HA: Record<LandUnit, number> = { ha: 1, nghin_ha: 1_000, trieu_ha: 1_000_000 };

export function calcNangSuatTaHa(
  output: number,
  outputUnit: OutputUnit,
  area: number,
  areaUnit: LandUnit,
  decimals = 1,
): number {
  if (area <= 0) throw new Error("Diện tích gieo trồng phải lớn hơn 0");
  return roundTo((output * OUT_TO_TA[outputUnit]) / (area * LAND_TO_HA[areaUnit]), decimals);
}

export function calcBienDoNhiet(temps: number[], decimals = 1) {
  if (!temps.length) throw new Error("Thiếu dữ liệu nhiệt độ");
  const max = Math.max(...temps);
  const min = Math.min(...temps);
  const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
  return {
    max: roundTo(max, decimals),
    min: roundTo(min, decimals),
    maxMonth: temps.indexOf(max) + 1,
    minMonth: temps.indexOf(min) + 1,
    bienDo: roundTo(max - min, decimals),
    trungBinh: roundTo(mean, decimals),
  };
}

export function calcLuongMuaNam(rains: number[]) {
  if (!rains.length) throw new Error("Thiếu dữ liệu lượng mưa");
  const total = roundTo(rains.reduce((a, b) => a + b, 0), 1);
  const max = Math.max(...rains);
  const min = Math.min(...rains);
  // Mùa mưa theo quy ước khí hậu VN: các tháng có lượng mưa >= 100 mm
  const muaMonths = rains.map((v, i) => (v >= 100 ? i + 1 : -1)).filter((m) => m > 0);
  return {
    tong: total,
    max,
    min,
    maxMonth: rains.indexOf(max) + 1,
    minMonth: rains.indexOf(min) + 1,
    thangMua: muaMonths,
    tongMuaMua: roundTo(muaMonths.reduce((acc, m) => acc + rains[m - 1]!, 0), 1),
  };
}

export function calcCanCanXnk(exportVal: number, importVal: number, decimals = 1) {
  return {
    canCan: roundTo(exportVal - importVal, decimals),
    tongKimNgach: roundTo(exportVal + importVal, decimals),
    trangThai: exportVal >= importVal ? "xuất siêu" : "nhập siêu",
  };
}

export function calcGiaTangTuNhien(birthPerMil: number, deathPerMil: number, decimals = 2): number {
  return roundTo((birthPerMil - deathPerMil) / 10, decimals);
}

// ===================== 2. CHẤM TẤT ĐỊNH BÀI TOÁN TÍNH TOÁN ĐỊA LÍ =====================

export const DiaCalcProblemSchema = z.discriminatedUnion("phepTinh", [
  z.object({
    phepTinh: z.literal("ti_trong"),
    giaTriThanhPhan: z.number().finite().nonnegative(),
    tongGiaTri: z.number().finite().positive(),
    lamTron: z.number().int().min(0).max(3).default(1),
  }),
  z.object({
    phepTinh: z.literal("toc_do_tang_truong"),
    giaTriNamSau: z.number().finite().nonnegative(),
    giaTriNamGoc: z.number().finite().positive(),
    lamTron: z.number().int().min(0).max(3).default(1),
  }),
  z.object({
    phepTinh: z.literal("muc_tang_phan_tram"),
    giaTriNamSau: z.number().finite().nonnegative(),
    giaTriNamGoc: z.number().finite().positive(),
    lamTron: z.number().int().min(0).max(3).default(1),
  }),
  z.object({
    phepTinh: z.literal("mat_do_dan_so"),
    danSo: z.number().finite().nonnegative(),
    donViDanSo: z.enum(["nguoi", "nghin_nguoi", "trieu_nguoi"]).default("nghin_nguoi"),
    dienTich: z.number().finite().positive(),
    donViDienTich: z.enum(["km2", "nghin_km2"]).default("km2"),
    lamTron: z.number().int().min(0).max(2).default(0),
  }),
  z.object({
    phepTinh: z.literal("nang_suat"),
    sanLuong: z.number().finite().nonnegative(),
    donViSanLuong: z.enum(["ta", "tan", "nghin_tan", "trieu_tan"]).default("nghin_tan"),
    dienTich: z.number().finite().positive(),
    donViDienTich: z.enum(["ha", "nghin_ha", "trieu_ha"]).default("nghin_ha"),
    lamTron: z.number().int().min(0).max(2).default(1),
  }),
  z.object({
    phepTinh: z.literal("bien_do_nhiet"),
    nhietDoThang: z.array(z.number().finite()).min(2),
    lamTron: z.number().int().min(0).max(2).default(1),
  }),
  z.object({
    phepTinh: z.literal("can_can_xnk"),
    xuatKhau: z.number().finite().nonnegative(),
    nhapKhau: z.number().finite().nonnegative(),
    donVi: z.string().default("tỉ USD"),
    lamTron: z.number().int().min(0).max(2).default(1),
  }),
  z.object({
    phepTinh: z.literal("gia_tang_tu_nhien"),
    tiSuatSinh: z.number().finite().nonnegative(),
    tiSuatTu: z.number().finite().nonnegative(),
    lamTron: z.number().int().min(0).max(3).default(2),
  }),
]);
export type DiaCalcProblem = z.infer<typeof DiaCalcProblemSchema>;

export type DiaCalcGradeResult = {
  correct: boolean;
  expected: number;
  expectedFormatted: string;
  unit: string;
  studentValue: number | null;
  formula: string;
  steps: string[];
  feedback: string;
};

/** Đọc số thực từ câu trả lời ngắn của HS (hỗ trợ phẩy thập phân, chấm hàng nghìn, kèm đơn vị như "24,5 %", "1.460 người/km²"). */
export function parseStudentNumeric(raw: string): number | null {
  const s = raw.normalize("NFC").trim().replace(/[−–]/g, "-");
  const m = /(-?(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?))/.exec(s);
  if (!m) return null;
  let numStr = m[1]!;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(numStr)) {
    numStr = numStr.replace(/\./g, "").replace(",", ".");
  } else {
    numStr = numStr.replace(",", ".");
  }
  const v = Number(numStr);
  return Number.isFinite(v) ? v : null;
}

export function solveDiaCalc(problem: DiaCalcProblem): { expected: number; unit: string; formula: string; steps: string[] } {
  switch (problem.phepTinh) {
    case "ti_trong": {
      const exact = (problem.giaTriThanhPhan / problem.tongGiaTri) * 100;
      const expected = roundTo(exact, problem.lamTron);
      return {
        expected,
        unit: "%",
        formula: "Tỉ trọng (%) = (Giá trị thành phần / Tổng giá trị) × 100",
        steps: [
          `Thay số: (${fmtVn(problem.giaTriThanhPhan, 2)} / ${fmtVn(problem.tongGiaTri, 2)}) × 100 = ${fmtVn(exact, problem.lamTron + 2)} %`,
          `Làm tròn ${problem.lamTron} chữ số thập phân: ${fmtVn(expected, problem.lamTron)} %`,
        ],
      };
    }
    case "toc_do_tang_truong": {
      const exact = (problem.giaTriNamSau / problem.giaTriNamGoc) * 100;
      const expected = roundTo(exact, problem.lamTron);
      return {
        expected,
        unit: "%",
        formula: "Tốc độ tăng trưởng (%) = (Giá trị năm sau / Giá trị năm gốc) × 100",
        steps: [
          `Lấy năm gốc = 100 %. Thay số: (${fmtVn(problem.giaTriNamSau, 2)} / ${fmtVn(problem.giaTriNamGoc, 2)}) × 100 = ${fmtVn(exact, problem.lamTron + 2)} %`,
          `Làm tròn ${problem.lamTron} chữ số thập phân: ${fmtVn(expected, problem.lamTron)} %`,
        ],
      };
    }
    case "muc_tang_phan_tram": {
      const exact = ((problem.giaTriNamSau - problem.giaTriNamGoc) / problem.giaTriNamGoc) * 100;
      const expected = roundTo(exact, problem.lamTron);
      return {
        expected,
        unit: "%",
        formula: "Mức tăng/giảm (%) = [(Năm sau − Năm gốc) / Năm gốc] × 100",
        steps: [
          `Thay số: [(${fmtVn(problem.giaTriNamSau, 2)} − ${fmtVn(problem.giaTriNamGoc, 2)}) / ${fmtVn(problem.giaTriNamGoc, 2)}] × 100 = ${fmtVn(exact, problem.lamTron + 2)} %`,
          `Làm tròn: ${fmtVn(expected, problem.lamTron)} %`,
        ],
      };
    }
    case "mat_do_dan_so": {
      const people = problem.danSo * POP_MULT[problem.donViDanSo];
      const km2 = problem.dienTich * AREA_MULT[problem.donViDienTich];
      const exact = people / km2;
      const expected = roundTo(exact, problem.lamTron);
      return {
        expected,
        unit: "người/km²",
        formula: "Mật độ dân số (người/km²) = Dân số (người) / Diện tích (km²)",
        steps: [
          `Đổi đơn vị: Dân số = ${fmtVn(people, 0)} người; Diện tích = ${fmtVn(km2, 2)} km²`,
          `Chia: ${fmtVn(people, 0)} / ${fmtVn(km2, 2)} = ${fmtVn(exact, 2)} người/km² → Làm tròn: ${fmtVn(expected, problem.lamTron)} người/km²`,
        ],
      };
    }
    case "nang_suat": {
      const ta = problem.sanLuong * OUT_TO_TA[problem.donViSanLuong];
      const ha = problem.dienTich * LAND_TO_HA[problem.donViDienTich];
      const exact = ta / ha;
      const expected = roundTo(exact, problem.lamTron);
      return {
        expected,
        unit: "tạ/ha",
        formula: "Năng suất (tạ/ha) = Sản lượng (tạ) / Diện tích (ha)",
        steps: [
          `Đổi đơn vị: Sản lượng = ${fmtVn(ta, 0)} tạ; Diện tích = ${fmtVn(ha, 0)} ha`,
          `Chia: ${fmtVn(ta, 0)} / ${fmtVn(ha, 0)} = ${fmtVn(exact, 2)} tạ/ha → Làm tròn: ${fmtVn(expected, problem.lamTron)} tạ/ha`,
        ],
      };
    }
    case "bien_do_nhiet": {
      const r = calcBienDoNhiet(problem.nhietDoThang, problem.lamTron);
      return {
        expected: r.bienDo,
        unit: "°C",
        formula: "Biên độ nhiệt năm (°C) = Nhiệt độ tháng cao nhất − Nhiệt độ tháng thấp nhất",
        steps: [
          `Tháng cao nhất: T${r.maxMonth} (${fmtVn(r.max, 1)} °C); Tháng thấp nhất: T${r.minMonth} (${fmtVn(r.min, 1)} °C)`,
          `Biên độ nhiệt = ${fmtVn(r.max, 1)} − ${fmtVn(r.min, 1)} = ${fmtVn(r.bienDo, problem.lamTron)} °C`,
        ],
      };
    }
    case "can_can_xnk": {
      const r = calcCanCanXnk(problem.xuatKhau, problem.nhapKhau, problem.lamTron);
      return {
        expected: r.canCan,
        unit: problem.donVi,
        formula: "Cán cân xuất nhập khẩu = Trị giá xuất khẩu − Trị giá nhập khẩu",
        steps: [
          `Thay số: ${fmtVn(problem.xuatKhau, 2)} − ${fmtVn(problem.nhapKhau, 2)} = ${fmtVn(r.canCan, problem.lamTron)} ${problem.donVi} (${r.trangThai})`,
        ],
      };
    }
    case "gia_tang_tu_nhien": {
      const exact = (problem.tiSuatSinh - problem.tiSuatTu) / 10;
      const expected = roundTo(exact, problem.lamTron);
      return {
        expected,
        unit: "%",
        formula: "Tỉ lệ gia tăng tự nhiên (%) = (Tỉ suất sinh ‰ − Tỉ suất tử ‰) / 10",
        steps: [
          `Thay số: (${fmtVn(problem.tiSuatSinh, 2)} − ${fmtVn(problem.tiSuatTu, 2)}) / 10 = ${fmtVn(exact, problem.lamTron + 1)} %`,
          `Làm tròn: ${fmtVn(expected, problem.lamTron)} %`,
        ],
      };
    }
  }
}

export function gradeDiaCalculation(rawProblem: DiaCalcProblem, studentResponse: string): DiaCalcGradeResult {
  const problem = DiaCalcProblemSchema.parse(rawProblem);
  const solved = solveDiaCalc(problem);
  const studentValue = parseStudentNumeric(studentResponse);
  // Sai số chấp nhận đúng bằng nửa bậc làm tròn + epsilon nhỏ (không chấp nhận sai bậc đơn vị!)
  const tol = problem.lamTron === 0 ? 0.5001 : 0.5 * 10 ** -problem.lamTron + 1e-6;
  const correct = studentValue !== null && Math.abs(studentValue - solved.expected) <= tol;
  const expectedFormatted = `${fmtVn(solved.expected, problem.lamTron)} ${solved.unit}`.trim();

  let feedback: string;
  if (studentValue === null) {
    feedback = `Chưa đọc được giá trị số trong bài làm. Đáp án đúng là ${expectedFormatted}.`;
  } else if (correct) {
    feedback = `Chính xác! Đáp số là ${expectedFormatted}.`;
  } else if (Math.abs(studentValue * 100 - solved.expected) <= tol * 100 || Math.abs(studentValue / 100 - solved.expected) <= tol) {
    feedback = `Chưa đúng (có thể em quên nhân/chia 100 hoặc đổi sai đơn vị). Em tính ${fmtVn(studentValue, 2)}, đáp án đúng là ${expectedFormatted}.`;
  } else if (
    problem.phepTinh === "mat_do_dan_so" &&
    (Math.abs(studentValue * 1000 - solved.expected) <= 2 || Math.abs(studentValue / 1000 - solved.expected) <= 2)
  ) {
    feedback = `Chưa đúng — chú ý đổi đơn vị dân số về "người" (×1.000 nếu là nghìn người) trước khi chia diện tích (km²). Đáp án đúng: ${expectedFormatted}.`;
  } else {
    feedback = `Chưa đúng. Em ghi ${fmtVn(studentValue, problem.lamTron + 1)}, đáp án đúng là ${expectedFormatted}.`;
  }

  return {
    correct,
    expected: solved.expected,
    expectedFormatted,
    unit: solved.unit,
    studentValue,
    formula: solved.formula,
    steps: solved.steps,
    feedback,
  };
}

// ===================== 3. CHỌN DẠNG BIỂU ĐỒ THÍCH HỢP (LUẬT TẤT ĐỊNH THPT) =====================

export type DiaChartIntent =
  | "auto"
  | "co_cau"
  | "chuyen_dich_co_cau"
  | "toc_do_tang_truong"
  | "quy_mo_so_sanh"
  | "hai_dai_luong"
  | "nhiet_am";

export type ChartSuggestion = {
  dangTotNhat: "tron" | "mien" | "duong" | "cot" | "cot-chong" | "ket-hop" | "nhiet-am";
  tenDang: string;
  lyDo: string;
  luuYVe: string[];
  dangPhuHopKhac: string[];
};

export function suggestChartType(bang: DiaDataTable, intent: DiaChartIntent = "auto"): ChartSuggestion {
  const nLabels = bang.nhan.length;
  const nSeries = bang.chuoi.length;
  const years = extractYears(bang);
  const units = new Set(bang.chuoi.map((s) => s.donVi.trim().toLowerCase()).filter(Boolean));
  const isMonths12 = nLabels === 12 && bang.nhan.every((x) => /^(t|th|tháng\s*)?\d{1,2}$/i.test(x.trim()));
  const hasTempRain =
    isMonths12 &&
    nSeries === 2 &&
    bang.chuoi.some((s) => s.donVi.includes("mm") || /mưa/i.test(s.ten)) &&
    bang.chuoi.some((s) => s.donVi.includes("°C") || /nhiệt/i.test(s.ten));

  // Kiểm có phải dữ liệu cơ cấu (tổng ≈ 100%)
  const sumsTo100 =
    nSeries >= 2 &&
    bang.nhan.every((_, i) => {
      const sum = bang.chuoi.reduce((a, s) => a + (s.giaTri[i] ?? 0), 0);
      return Math.abs(sum - 100) <= 0.5;
    });

  if (intent === "nhiet_am" || (intent === "auto" && hasTempRain)) {
    return {
      dangTotNhat: "nhiet-am",
      tenDang: "Biểu đồ kết hợp nhiệt – ẩm (kiểu Atlat)",
      lyDo: "Bảng gồm 2 đại lượng khí hậu 12 tháng có đơn vị khác nhau là lượng mưa (mm) và nhiệt độ (°C).",
      luuYVe: [
        "Cột màu xanh lam biểu diễn lượng mưa (trục trái, mm, bắt đầu từ 0).",
        "Đường màu đỏ son biểu diễn nhiệt độ (trục phải, °C).",
        "Tô nền mùa mưa (các tháng có lượng mưa ≥ 100 mm liên tiếp).",
      ],
      dangPhuHopKhac: ["Kết hợp cột – đường"],
    };
  }

  if (intent === "hai_dai_luong" || (intent === "auto" && nSeries === 2 && units.size === 2)) {
    return {
      dangTotNhat: "ket-hop",
      tenDang: "Biểu đồ kết hợp (Cột – Đường)",
      lyDo: `Bảng thể hiện 2 đại lượng có đơn vị khác nhau (${[...units].join(" và ")}) nhưng có mối quan hệ qua ${nLabels} mốc.`,
      luuYVe: [
        "Dựng 2 trục tung ghi rõ 2 đơn vị khác nhau; trục cột bắt đầu từ 0.",
        years && years.length >= 3 ? "Giãn khoảng cách các năm trên trục hoành đúng tỉ lệ thật." : "Sắp xếp nhãn trục hoành rõ ràng, đủ chú giải.",
      ],
      dangPhuHopKhac: [],
    };
  }

  if (intent === "toc_do_tang_truong") {
    return {
      dangTotNhat: "duong",
      tenDang: "Biểu đồ đường (tốc độ tăng trưởng)",
      lyDo: "Yêu cầu thể hiện tốc độ tăng trưởng (hoặc diễn biến biến động) qua chuỗi thời gian.",
      luuYVe: [
        "Lấy năm đầu tiên làm năm gốc = 100 %; các năm sau tính bằng (Giá trị / Năm gốc) × 100.",
        "Khoảng cách giữa các mốc năm trên trục hoành bắt buộc giãn đúng tỉ lệ thật.",
      ],
      dangPhuHopKhac: [],
    };
  }

  if (intent === "chuyen_dich_co_cau" || (intent === "co_cau" && nLabels >= 4 && nSeries >= 2)) {
    return {
      dangTotNhat: "mien",
      tenDang: "Biểu đồ miền",
      lyDo: `Thể hiện sự chuyển dịch cơ cấu của ${nSeries} thành phần qua ${nLabels} mốc năm (≥ 4 mốc).`,
      luuYVe: [
        "Chuyển số liệu sang % (tổng mỗi năm = 100 %), trục tung từ 0 đến 100 %.",
        "Khoảng cách các năm trên trục hoành phải giãn đúng tỉ lệ thật; năm đầu nằm sát trục tung.",
      ],
      dangPhuHopKhac: ["Cột chồng 100 %"],
    };
  }

  if (intent === "co_cau" || (intent === "auto" && sumsTo100 && nLabels <= 3)) {
    return {
      dangTotNhat: "tron",
      tenDang: "Biểu đồ tròn",
      lyDo: `Thể hiện cơ cấu (tỉ trọng) của ${nSeries > 1 ? nSeries : nLabels} thành phần ở ${nSeries > 1 ? nLabels : 1} mốc thời gian (≤ 3 năm).`,
      luuYVe: [
        "Tổng tỉ trọng mỗi hình tròn phải bằng 100 %.",
        "Vẽ từ tia 12 giờ thuận chiều kim đồng hồ; nếu so sánh quy mô và cơ cấu giữa 2–3 năm, tính bán kính tỉ lệ căn bậc hai tổng giá trị.",
      ],
      dangPhuHopKhac: ["Cột chồng 100 %"],
    };
  }

  if (intent === "auto" && sumsTo100 && nLabels >= 4) {
    return {
      dangTotNhat: "mien",
      tenDang: "Biểu đồ miền",
      lyDo: `Dữ liệu có tổng từng năm bằng 100 % qua ${nLabels} mốc năm — biểu đồ miền thể hiện rõ nhất sự chuyển dịch cơ cấu.`,
      luuYVe: [
        "Tổng các miền tại mọi năm luôn bằng 100 %.",
        "Giãn đúng khoảng cách năm thật trên trục hoành.",
      ],
      dangPhuHopKhac: ["Cột chồng 100 %"],
    };
  }

  if (intent === "auto" && years && years.length >= 4 && units.size <= 1 && nSeries <= 4) {
    return {
      dangTotNhat: "duong",
      tenDang: "Biểu đồ đường",
      lyDo: `Chuỗi thời gian dài (${years[0]}–${years[years.length - 1]}, ${years.length} mốc) cùng đơn vị — biểu đồ đường làm nổi bật xu hướng biến động.`,
      luuYVe: [
        "Khoảng cách giữa các năm trên trục hoành bắt buộc giãn đúng tỉ lệ thật.",
        "Ghi số liệu tại các điểm đặc trưng, tránh đè nhãn.",
      ],
      dangPhuHopKhac: ["Biểu đồ cột"],
    };
  }

  return {
    dangTotNhat: "cot",
    tenDang: nSeries > 1 ? "Biểu đồ cột ghép" : "Biểu đồ cột đơn",
    lyDo: `Thể hiện quy mô và so sánh trực quan giữa ${nLabels} đối tượng/mốc thời gian${nSeries > 1 ? ` với ${nSeries} đại lượng cùng đơn vị` : ""}.`,
    luuYVe: [
      "Trục tung luôn bắt đầu từ 0 để đảm bảo đúng tỉ lệ độ cao cột.",
      years && years.length >= 3 ? "Giữ khoảng cách giữa các nhóm cột tỉ lệ với khoảng cách năm thật." : "Bề rộng cột bằng nhau, ghi số liệu trên đầu cột.",
    ],
    dangPhuHopKhac: nSeries > 1 ? ["Cột chồng"] : ["Biểu đồ đường"],
  };
}

// ===================== 4. NHẬN XÉT GỢI Ý TẤT ĐỊNH (100% SỐ LIỆU TỪ BẢNG) =====================

export function buildDeterministicCommentary(bang: DiaDataTable): string[] {
  const bullets: string[] = [];
  const nLabels = bang.nhan.length;
  const nSeries = bang.chuoi.length;
  const years = extractYears(bang);

  // Trường hợp khí hậu 12 tháng (nhiệt–ẩm)
  if (nLabels === 12 && nSeries === 2 && bang.chuoi.some((s) => s.donVi.includes("mm")) && bang.chuoi.some((s) => s.donVi.includes("°C"))) {
    const rain = bang.chuoi.find((s) => s.donVi.includes("mm"))!;
    const temp = bang.chuoi.find((s) => s.donVi.includes("°C"))!;
    const tStat = calcBienDoNhiet(temp.giaTri, 1);
    const rStat = calcLuongMuaNam(rain.giaTri);
    bullets.push(
      `Nhiệt độ trung bình năm đạt ${fmtVn(tStat.trungBinh, 1)} °C; tháng nóng nhất là T${tStat.maxMonth} (${fmtVn(tStat.max, 1)} °C), tháng lạnh nhất là T${tStat.minMonth} (${fmtVn(tStat.min, 1)} °C), biên độ nhiệt năm ${fmtVn(tStat.bienDo, 1)} °C.`,
    );
    bullets.push(
      `Tổng lượng mưa cả năm đạt ${fmtVn(rStat.tong, 0)} mm; mưa nhiều nhất vào T${rStat.maxMonth} (${fmtVn(rStat.max, 0)} mm) và ít nhất vào T${rStat.minMonth} (${fmtVn(rStat.min, 0)} mm).`,
    );
    if (rStat.thangMua.length >= 3) {
      const pctRain = calcTiTrong(rStat.tongMuaMua, rStat.tong, 1);
      bullets.push(
        `Mùa mưa tập trung vào các tháng T${rStat.thangMua[0]}–T${rStat.thangMua[rStat.thangMua.length - 1]} (mưa ≥ 100 mm/tháng), đóng góp ${fmtVn(rStat.tongMuaMua, 0)} mm (chiếm ${fmtVn(pctRain, 1)} % tổng lượng mưa cả năm).`,
      );
    }
    return bullets;
  }

  // Trường hợp cơ cấu (tổng mỗi năm ≈ 100%)
  const isStructure =
    nSeries >= 2 &&
    bang.nhan.every((_, i) => Math.abs(bang.chuoi.reduce((a, s) => a + (s.giaTri[i] ?? 0), 0) - 100) <= 0.5);

  if (isStructure && nLabels >= 2) {
    const first = bang.nhan[0]!;
    const last = bang.nhan[nLabels - 1]!;
    const dominant = bang.chuoi.reduce((a, b) => ((b.giaTri[nLabels - 1] ?? 0) > (a.giaTri[nLabels - 1] ?? 0) ? b : a));
    bullets.push(
      `Giai đoạn ${first}–${last}, cơ cấu có sự chuyển dịch rõ rệt; đến mốc ${last}, ${dominant.ten} chiếm tỉ trọng lớn nhất (${fmtVn(dominant.giaTri[nLabels - 1]!, 1)} %).`,
    );
    for (const s of bang.chuoi) {
      const v0 = s.giaTri[0]!;
      const v1 = s.giaTri[nLabels - 1]!;
      const delta = roundTo(v1 - v0, 1);
      const dir = delta > 0 ? "tăng" : delta < 0 ? "giảm" : "ổn định";
      bullets.push(
        `${s.ten}: ${dir} ${fmtVn(Math.abs(delta), 1)} % (từ ${fmtVn(v0, 1)} % ở ${first} ${delta >= 0 ? "lên" : "xuống"} ${fmtVn(v1, 1)} % ở ${last}).`,
      );
    }
    return bullets;
  }

  // Trường hợp chuỗi thời gian hoặc so sánh tổng quát
  for (const s of bang.chuoi) {
    const v0 = s.giaTri[0]!;
    const v1 = s.giaTri[nLabels - 1]!;
    const mx = Math.max(...s.giaTri);
    const mn = Math.min(...s.giaTri);
    const iMx = s.giaTri.indexOf(mx);
    const iMn = s.giaTri.indexOf(mn);
    const u = s.donVi ? ` ${s.donVi}` : "";
    if (years && nLabels >= 2 && v0 > 0) {
      const ratio = roundTo(v1 / v0, 2);
      const growth = calcTocDoTangTruong(v1, v0, 1);
      const delta = roundTo(v1 - v0, 1);
      const dir = delta > 0 ? "tăng" : delta < 0 ? "giảm" : "không đổi";
      bullets.push(
        `${s.ten} giai đoạn ${years[0]}–${years[nLabels - 1]} ${dir} ${fmtVn(Math.abs(delta), 1)}${u} (từ ${fmtVn(v0, 1)} lên ${fmtVn(v1, 1)}${u}, đạt ${fmtVn(growth, 1)} % so với năm ${years[0]}, gấp ${fmtVn(ratio, 2)} lần).`,
      );
    } else {
      bullets.push(
        `${s.ten}: cao nhất tại ${bang.nhan[iMx]} (${fmtVn(mx, 1)}${u}), thấp nhất tại ${bang.nhan[iMn]} (${fmtVn(mn, 1)}${u}), chênh lệch ${fmtVn(mx - mn, 1)}${u}.`,
      );
    }
  }
  return bullets;
}
