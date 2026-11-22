// server/src/subjects/dia/verify.ts
// Tự kiểm tất định môn Địa lí theo cơ chế huy hiệu "Đã kiểm" của P13 (server/src/domain/verify.ts).
// Không gọi AI để tự chấm nội dung của mình: mọi kiểm tra đều thuần toán học & tất định.
import { z } from "zod";
import type { Verification } from "../../domain/solution";

export type VerifyDetail = Verification["details"][number];

export const DiaSeriesSchema = z.object({
  ten: z.string().min(1),
  donVi: z.string().default(""),
  giaTri: z.array(z.number().finite()).min(1),
  kieu: z.enum(["cot", "duong", "mien", "tron", "thap"]).optional(),
  truc: z.enum(["trai", "phai"]).optional(),
});
export type DiaSeries = z.infer<typeof DiaSeriesSchema>;

export const DiaDataTableSchema = z.object({
  tieuDe: z.string().default(""),
  nhan: z.array(z.string().min(1)).min(1),
  /** Mốc năm thật (nếu trục hoành là chuỗi thời gian) */
  nam: z.array(z.number().int().min(1000).max(2100)).optional(),
  chuoi: z.array(DiaSeriesSchema).min(1),
  nguon: z.string().default(""),
});
export type DiaDataTable = z.infer<typeof DiaDataTableSchema>;

export const DiaChartCheckInputSchema = z.object({
  loaiBieuDo: z.enum(["cot", "cot-chong", "cot-100", "duong", "mien", "tron", "ket-hop", "nhiet-am", "thap"]),
  bang: DiaDataTableSchema,
  /** Trục tung (nếu có thông số hiển thị): min/max của trục chính và trục phụ */
  trucY: z.object({ min: z.number().finite(), max: z.number().finite() }).optional(),
  trucYPhai: z.object({ min: z.number().finite(), max: z.number().finite() }).optional(),
  /** Toạ độ x thực vẽ của từng mốc trên trục hoành (px hoặc tỉ lệ 0..1) để kiểm giãn cách năm thật */
  toaDoX: z.array(z.number().finite()).optional(),
  /** Giá trị hiển thị thực tế trên hình (chiều cao px của cột, góc độ quạt, hoặc giá trị y vẽ) để kiểm đúng tỉ lệ */
  tiLeHinh: z
    .array(
      z.object({
        chuoiIdx: z.number().int().min(0),
        diemIdx: z.number().int().min(0),
        giaTriDuLieu: z.number().finite(),
        kichThuocVe: z.number().finite(), // px chiều cao cột, góc độ quạt, hoặc toạ độ so với gốc 0
      }),
    )
    .optional(),
  /** Mọi chữ/nhận xét/nhãn đang hiển thị trên màn hình để đối chiếu nguồn số liệu */
  vanBanHienThi: z.string().optional(),
  /** Danh sách số hiển thị tường minh (nếu đã bóc sẵn) */
  soHienThi: z.array(z.number().finite()).optional(),
});
export type DiaChartCheckInput = z.infer<typeof DiaChartCheckInputSchema>;

const fmt = (n: number, dec = 2) => {
  const r = Math.round(n * 10 ** dec) / 10 ** dec;
  return String(r).replace(".", ",");
};

/** 1. Kiểm tổng cơ cấu = 100 % (cho biểu đồ tròn, miền, cột chồng 100 %, bảng tỉ trọng). */
export function verifyStructure100(bang: DiaDataTable, tol = 0.2): VerifyDetail[] {
  const details: VerifyDetail[] = [];
  const nCols = bang.nhan.length;
  // Hai dạng nhập cơ cấu:
  // (a) Nhiều chuỗi (VD Nông-Lâm-Ngư / Công nghiệp / Dịch vụ) qua các năm (nhan = ["2010","2015",...]): mỗi cột năm có tổng các chuỗi = 100%.
  // (b) 1 chuỗi duy nhất cho 1 năm (VD biểu đồ tròn 1 năm với nhan = ["Nông nghiệp", "Công nghiệp", "Dịch vụ"]): tổng các phần tử chuỗi[0] = 100%.
  const singlePie = bang.chuoi.length === 1;

  if (singlePie) {
    const vals = bang.chuoi[0]!.giaTri;
    const neg = vals.filter((v) => v < 0);
    if (neg.length) {
      details.push({ ok: false, label: "Cơ cấu có giá trị âm", measured: neg.map((v) => fmt(v)).join(", "), expected: "≥ 0%" });
      return details;
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    const diff = Math.abs(sum - 100);
    details.push({
      ok: diff <= tol,
      label: diff <= tol ? "Tổng cơ cấu đạt 100 %" : `Tổng cơ cấu lệch khỏi 100 % (${fmt(sum)} %)`,
      expected: "100 %",
      measured: `${fmt(sum)} %`,
    });
    return details;
  }

  let allOk = true;
  const badCols: string[] = [];
  for (let i = 0; i < nCols; i++) {
    const colVals = bang.chuoi.map((s) => s.giaTri[i] ?? NaN);
    if (colVals.some((v) => !Number.isFinite(v))) {
      allOk = false;
      badCols.push(`${bang.nhan[i]}: thiếu số liệu`);
      continue;
    }
    if (colVals.some((v) => v < 0)) {
      allOk = false;
      badCols.push(`${bang.nhan[i]}: có thành phần âm`);
      continue;
    }
    const sum = colVals.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > tol) {
      allOk = false;
      badCols.push(`${bang.nhan[i]} = ${fmt(sum)}%`);
    }
  }
  if (allOk) {
    details.push({ ok: true, label: `Tổng cơ cấu cả ${nCols} mốc đều bằng 100 % (sai số ≤ ${fmt(tol)} %)`, expected: "100 %", measured: "100 %" });
  } else {
    details.push({ ok: false, label: `Tổng cơ cấu không bằng 100 % tại: ${badCols.join("; ")}`, expected: "100 %", measured: badCols.join("; ") });
  }
  return details;
}

/** Trích các mốc năm từ mảng `nam` hoặc nhãn trục hoành (vd "2010", "Năm 2015"). */
export function extractYears(bang: Pick<DiaDataTable, "nhan" | "nam">): number[] | null {
  if (bang.nam && bang.nam.length === bang.nhan.length) return bang.nam;
  const parsed: number[] = [];
  for (const lb of bang.nhan) {
    const m = /^\s*(?:năm\s*)?(1\d{3}|20\d{2})\s*$/i.exec(lb);
    if (!m) return null;
    parsed.push(Number(m[1]));
  }
  return parsed.length >= 2 ? parsed : null;
}

/** 2. Kiểm năm trên trục phải giãn đúng khoảng cách thật (lệch tuyến tính tối đa ≤ 2 % chiều rộng trục). */
export function verifyYearAxisSpacing(years: number[], xPositions: number[], tolRatio = 0.02): VerifyDetail {
  if (years.length !== xPositions.length) {
    return {
      ok: false,
      label: `Số mốc năm (${years.length}) không khớp số toạ độ trục X (${xPositions.length})`,
      expected: String(years.length),
      measured: String(xPositions.length),
    };
  }
  if (years.length < 2) {
    return { ok: true, label: "Ít hơn 2 mốc năm, không cần kiểm giãn khoảng cách" };
  }
  for (let i = 1; i < years.length; i++) {
    if (years[i]! <= years[i - 1]!) {
      return {
        ok: false,
        label: `Mốc năm không tăng dần: ${years[i - 1]} → ${years[i]}`,
        expected: "năm tăng dần",
        measured: years.join(", "),
      };
    }
    if (xPositions[i]! <= xPositions[i - 1]!) {
      return {
        ok: false,
        label: `Toạ độ X của năm ${years[i]} không nằm bên phải năm ${years[i - 1]}`,
      };
    }
  }
  const ySpan = years[years.length - 1]! - years[0]!;
  const xSpan = xPositions[xPositions.length - 1]! - xPositions[0]!;
  if (ySpan <= 0 || xSpan <= 0) {
    return { ok: false, label: "Khoảng năm hoặc độ rộng trục X bằng 0" };
  }
  let maxErr = 0;
  let worstYear = years[0]!;
  let worstActual = 0;
  let worstExpected = 0;
  for (let i = 1; i < years.length - 1; i++) {
    const rYear = (years[i]! - years[0]!) / ySpan;
    const rX = (xPositions[i]! - xPositions[0]!) / xSpan;
    const err = Math.abs(rX - rYear);
    if (err > maxErr) {
      maxErr = err;
      worstYear = years[i]!;
      worstActual = rX;
      worstExpected = rYear;
    }
  }
  if (maxErr > tolRatio) {
    return {
      ok: false,
      label: `Trục năm giãn sai tỉ lệ thật: năm ${worstYear} đặt ở ${fmt(worstActual * 100, 1)}% trục, đúng phải là ${fmt(worstExpected * 100, 1)}%`,
      expected: `${fmt(worstExpected * 100, 1)}%`,
      measured: `${fmt(worstActual * 100, 1)}%`,
    };
  }
  return {
    ok: true,
    label: `Khoảng cách ${years.length} mốc năm (${years[0]}–${years[years.length - 1]}) giãn đúng tỉ lệ thật (sai lệch tối đa ${fmt(maxErr * 100, 2)}%)`,
    expected: `≤ ${fmt(tolRatio * 100, 1)}%`,
    measured: `${fmt(maxErr * 100, 2)}%`,
  };
}

/** 3. Kiểm biểu đồ đúng tỉ lệ dữ liệu (trục cột bắt đầu từ 0, kích thước vẽ tỉ lệ tuyến tính dữ liệu, chuẩn nhiệt-ẩm Atlat). */
export function verifyChartScale(input: DiaChartCheckInput): VerifyDetail[] {
  const details: VerifyDetail[] = [];
  const { loaiBieuDo, bang, trucY, trucYPhai, tiLeHinh } = input;

  // Kiểm độ dài các chuỗi khớp số nhãn
  for (const s of bang.chuoi) {
    if (s.giaTri.length !== bang.nhan.length) {
      details.push({
        ok: false,
        label: `Chuỗi "${s.ten}" có ${s.giaTri.length} giá trị, lệch với ${bang.nhan.length} nhãn trục`,
        expected: String(bang.nhan.length),
        measured: String(s.giaTri.length),
      });
    }
  }

  // Biểu đồ cột / cột chồng / nhiệt-ẩm / miền: trục tung phải bắt đầu từ 0 để không bóp méo tỉ lệ
  const needsZeroBase = ["cot", "cot-chong", "cot-100", "mien", "nhiet-am", "ket-hop"].includes(loaiBieuDo);
  if (needsZeroBase && trucY) {
    if (trucY.min !== 0) {
      details.push({
        ok: false,
        label: `Trục tung biểu đồ ${loaiBieuDo} bắt đầu từ ${fmt(trucY.min)} thay vì 0 (bóp méo tỉ lệ cột)`,
        expected: "0",
        measured: fmt(trucY.min),
      });
    } else {
      details.push({ ok: true, label: "Trục tung bắt đầu từ 0, bảo toàn đúng tỉ lệ cột", expected: "0", measured: "0" });
    }
  }

  // Kiểm max trục tung bao phủ hết dữ liệu
  if (trucY) {
    const leftSeries = loaiBieuDo === "nhiet-am" || loaiBieuDo === "ket-hop"
      ? bang.chuoi.filter((s, idx) => (s.truc ? s.truc === "trai" : idx === 0))
      : bang.chuoi;
    const maxVal = loaiBieuDo === "cot-chong" || loaiBieuDo === "mien"
      ? Math.max(...bang.nhan.map((_, i) => leftSeries.reduce((acc, s) => acc + (s.giaTri[i] ?? 0), 0)))
      : Math.max(...leftSeries.flatMap((s) => s.giaTri));
    if (trucY.max < maxVal - 1e-6) {
      details.push({
        ok: false,
        label: `Đỉnh trục tung (${fmt(trucY.max)}) nhỏ hơn giá trị lớn nhất (${fmt(maxVal)})`,
        expected: `≥ ${fmt(maxVal)}`,
        measured: fmt(trucY.max),
      });
    }
  }

  // Kiểm đặc thù biểu đồ nhiệt–ẩm kiểu Atlat
  if (loaiBieuDo === "nhiet-am") {
    if (bang.nhan.length !== 12) {
      details.push({
        ok: false,
        label: `Biểu đồ nhiệt–ẩm phải đủ 12 tháng, hiện có ${bang.nhan.length}`,
        expected: "12 tháng",
        measured: `${bang.nhan.length} tháng`,
      });
    }
    if (bang.chuoi.length < 2) {
      details.push({ ok: false, label: "Biểu đồ nhiệt–ẩm cần đủ 2 đại lượng: lượng mưa (cột) và nhiệt độ (đường)" });
    } else {
      const rain = bang.chuoi.find((s) => s.kieu === "cot" || s.truc === "trai") ?? bang.chuoi[0]!;
      const temp = bang.chuoi.find((s) => s.kieu === "duong" || s.truc === "phai") ?? bang.chuoi[1]!;
      if (rain.giaTri.some((v) => v < 0)) {
        details.push({ ok: false, label: "Lượng mưa có giá trị âm" });
      }
      if (temp.giaTri.some((v) => v < -50 || v > 60)) {
        details.push({ ok: false, label: "Nhiệt độ vượt phạm vi vật lí (−50 °C đến 60 °C)" });
      }
      if (trucY && trucYPhai && trucYPhai.max > 0) {
        const ratio = trucY.max / trucYPhai.max;
        // Quy ước Atlat Địa lí Việt Nam trang 9 (khí hậu nhiệt đới gió mùa): tỉ lệ 10:1 (300–400 mm ↔ 30–40 °C),
        // Gaussen chuẩn 2:1, hoặc bội 5:1–25:1 với trạm mưa lớn (Huế, Bắc Quang). Chặn tỉ lệ méo (< 1,8 hoặc > 30).
        const standardOk = ratio >= 1.8 && ratio <= 30;
        details.push({
          ok: standardOk,
          label: standardOk
            ? `Hai trục nhiệt–ẩm hợp quy ước Atlat (mưa 0–${fmt(trucY.max, 0)} mm, nhiệt ${fmt(trucYPhai.min, 0)}–${fmt(trucYPhai.max, 0)} °C, tỉ lệ ${fmt(ratio, 1)} mm/°C)`
            : `Tỉ lệ hai trục nhiệt–ẩm (${fmt(ratio, 1)} mm/°C) bất hợp lí so với quy ước Atlat (2–25 mm/°C)`,
          expected: "2–25 mm/°C (Atlat VN chuẩn 10 mm/°C)",
          measured: `${fmt(ratio, 1)} mm/°C`,
        });
      }
    }
  }

  // Kiểm tỉ lệ hình vẽ thực tế so với giá trị dữ liệu (sai số tương đối ≤ 1 %)
  if (tiLeHinh && tiLeHinh.length >= 2) {
    const bySeries = new Map<number, typeof tiLeHinh>();
    for (const item of tiLeHinh) {
      const arr = bySeries.get(item.chuoiIdx) ?? [];
      arr.push(item);
      bySeries.set(item.chuoiIdx, arr);
    }
    for (const [sIdx, pts] of bySeries) {
      const nonZero = pts.filter((p) => Math.abs(p.giaTriDuLieu) > 1e-9);
      if (nonZero.length < 2) continue;
      // Dùng điểm có giá trị lớn nhất làm chuẩn tỉ lệ (px / đơn vị)
      const ref = nonZero.reduce((a, b) => (Math.abs(b.giaTriDuLieu) > Math.abs(a.giaTriDuLieu) ? b : a));
      const scale = ref.kichThuocVe / ref.giaTriDuLieu;
      let maxRelErr = 0;
      let badPoint: (typeof pts)[number] | null = null;
      for (const p of pts) {
        const expectedSize = p.giaTriDuLieu * scale;
        const denom = Math.max(1, Math.abs(ref.kichThuocVe));
        const err = Math.abs(p.kichThuocVe - expectedSize) / denom;
        if (err > maxRelErr) {
          maxRelErr = err;
          badPoint = p;
        }
      }
      if (maxRelErr > 0.015 && badPoint) {
        details.push({
          ok: false,
          label: `Chuỗi ${sIdx + 1} sai tỉ lệ hình vẽ tại mục ${badPoint.diemIdx + 1}: lệch ${fmt(maxRelErr * 100, 1)}% so với dữ liệu`,
          expected: fmt(badPoint.giaTriDuLieu * scale, 1),
          measured: fmt(badPoint.kichThuocVe, 1),
        });
      } else {
        details.push({
          ok: true,
          label: `Chuỗi ${sIdx + 1}: hình vẽ khớp tỉ lệ dữ liệu (sai lệch ≤ ${fmt(maxRelErr * 100, 2)}%)`,
          expected: "≤ 1,5%",
          measured: `${fmt(maxRelErr * 100, 2)}%`,
        });
      }
    }
  }

  return details;
}

/** Trích mọi số thực từ văn bản tiếng Việt (nhận dấu phẩy thập phân 24,5 và chấm hàng nghìn 1.460 hoặc 14.002.598). */
export function extractNumbersFromText(text: string): number[] {
  // Bỏ mã tháng T1..T12, tên vùng kiểu QL1A, NĐ/QH15
  const cleaned = text.replace(/\b(?:T|Tháng\s*|QL|QH|NĐ|TT|CV|P)\d+\b/gi, " ");
  const out: number[] = [];
  const re = /(?<![\p{L}\d])[-−]?(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?![\p{L}\d])/gu;
  for (const m of cleaned.matchAll(re)) {
    let raw = m[0].replace("−", "-");
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
      raw = raw.replace(/\./g, "").replace(",", ".");
    } else {
      raw = raw.replace(",", ".");
    }
    const v = Number(raw);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

/** Sinh tập tất cả các số có trong bảng nguồn hoặc tính ra được bằng phép tính Địa lí hợp lệ từ bảng nguồn. */
export function buildDerivableNumberSet(bang: DiaDataTable): number[] {
  const vals = new Set<number>();
  const add = (n: number) => {
    if (!Number.isFinite(n)) return;
    vals.add(n);
    vals.add(Math.abs(n));
  };

  // 1. Các mốc năm & hiệu khoảng năm
  const years = extractYears(bang);
  if (years) {
    for (const y of years) add(y);
    for (let i = 0; i < years.length; i++) {
      for (let j = i + 1; j < years.length; j++) add(years[j]! - years[i]!);
    }
  }

  // 2. Giá trị gốc và quy đổi đơn vị thập phân (×10, ×100, ×1000, /1000...)
  const allRaw: number[] = [];
  for (const s of bang.chuoi) {
    for (const v of s.giaTri) {
      add(v);
      allRaw.push(v);
      for (const k of [10, 100, 1000, 1e6, 0.1, 0.01, 0.001, 1e-6]) add(v * k);
    }
    // Thống kê trong từng chuỗi: tổng, trung bình, max, min, biên độ (max-min), tỉ số, tốc độ tăng trưởng
    const sum = s.giaTri.reduce((a, b) => a + b, 0);
    const mean = sum / s.giaTri.length;
    const mx = Math.max(...s.giaTri);
    const mn = Math.min(...s.giaTri);
    add(sum);
    add(mean);
    add(mx);
    add(mn);
    add(mx - mn);
    if (mn !== 0) add(mx / mn);
    for (let i = 0; i < s.giaTri.length; i++) {
      const a = s.giaTri[i]!;
      // Tỉ trọng trong tổng chuỗi
      if (sum !== 0) add((a / sum) * 100);
      for (let j = 0; j < s.giaTri.length; j++) {
        if (i === j) continue;
        const b = s.giaTri[j]!;
        add(b - a);
        if (a !== 0) {
          add(b / a);
          add((b / a) * 100); // tốc độ tăng trưởng (%)
          add((b / a) * 100 - 100); // mức tăng/giảm (%)
        }
      }
    }
    // Tổng các khoảng liên tiếp (VD: tổng lượng mưa mùa mưa T5–T10 & tỉ trọng mùa mưa trong cả năm!)
    if (s.giaTri.length <= 16) {
      for (let i = 0; i < s.giaTri.length; i++) {
        let partial = 0;
        for (let j = i; j < s.giaTri.length; j++) {
          partial += s.giaTri[j]!;
          add(partial);
          if (sum !== 0) add((partial / sum) * 100);
        }
      }
    }
  }

  // 3. Phép tính liên chuỗi tại cùng mốc i (tổng cột, tỉ trọng %, hiệu/cán cân, tỉ số/mật độ/năng suất)
  const nCols = bang.nhan.length;
  for (let i = 0; i < nCols; i++) {
    const col = bang.chuoi.map((s) => s.giaTri[i]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const colSum = col.reduce((a, b) => a + b, 0);
    add(colSum);
    for (const v of col) {
      if (colSum !== 0) add((v / colSum) * 100);
    }
    for (let p = 0; p < col.length; p++) {
      for (let q = 0; q < col.length; q++) {
        if (p === q) continue;
        const a = col[p]!, b = col[q]!;
        add(a + b);
        add(a - b);
        if (b !== 0) {
          add(a / b);
          add((a / b) * 10); // năng suất tạ/ha từ nghìn tấn / nghìn ha
          add((a / b) * 100); // tỉ trọng hoặc %
          add((a / b) * 1000); // mật độ từ nghìn người / km²
          add((a / b) * 1e6); // mật độ từ triệu người / km²
          add((a / b) * 0.1); // tỉ suất gia tăng tự nhiên từ ‰ sang %
        }
      }
    }
  }
  // 4. Hiệu tỉ trọng giữa các mốc (chuyển dịch cơ cấu: tăng/giảm bao nhiêu điểm %)
  if (bang.chuoi.length >= 2 && nCols >= 2) {
    const shares: number[][] = bang.chuoi.map((s, si) =>
      bang.nhan.map((_, i) => {
        const tot = bang.chuoi.reduce((acc, st) => acc + (st.giaTri[i] ?? 0), 0);
        return tot ? ((s.giaTri[i] ?? 0) / tot) * 100 : NaN;
      }),
    );
    for (const row of shares) {
      for (let i = 0; i < row.length; i++) {
        for (let j = i + 1; j < row.length; j++) {
          add(row[j]! - row[i]!);
        }
      }
    }
  }

  return [...vals];
}

/** 4. Kiểm mọi số liệu trên màn hình phải có trong bảng nguồn hoặc tính ra được từ nguồn. */
export function verifyNumbersFromSource(
  bang: DiaDataTable,
  displayedNumbers: number[],
  opts: { allowSmallIntegers?: boolean; allowCommonConstants?: boolean } = {},
): VerifyDetail {
  const allowSmall = opts.allowSmallIntegers ?? true;
  const allowConst = opts.allowCommonConstants ?? true;
  const derivable = buildDerivableNumberSet(bang);
  const commonConsts = new Set([0, 100, 360]); // 0, 100% (năm gốc/tổng cơ cấu), 360°

  const isSupported = (num: number): boolean => {
    if (allowSmall && Number.isInteger(num) && num >= 0 && num <= 12) return true;
    if (allowConst && commonConsts.has(num)) return true;
    // Khớp theo quy tắc làm tròn hợp lệ (nguyên, 1 chữ số thập phân, 2 chữ số thập phân hoặc sai số tương đối 0,5%)
    const numStr = String(Math.abs(num));
    const dec = numStr.includes(".") ? numStr.split(".")[1]!.length : 0;
    const roundTol = dec === 0 ? 0.55 : dec === 1 ? 0.06 : 0.006;
    for (const d of derivable) {
      if (Math.abs(num - d) <= Math.max(roundTol, Math.abs(d) * 0.005)) return true;
    }
    return false;
  };

  const uniqueNums = [...new Set(displayedNumbers.filter((n) => Number.isFinite(n)))];
  const unsupported = uniqueNums.filter((n) => !isSupported(n));
  if (unsupported.length > 0) {
    return {
      ok: false,
      label: `Phát hiện ${unsupported.length} số liệu không có trong nguồn và không tính ra được: ${unsupported.slice(0, 6).map((x) => fmt(x)).join(", ")}`,
      expected: "100% số liệu khớp nguồn hoặc tính ra được",
      measured: unsupported.slice(0, 6).map((x) => fmt(x)).join(", "),
    };
  }
  return {
    ok: true,
    label: `Đã đối chiếu ${uniqueNums.length} số liệu hiển thị: tất cả có trong bảng nguồn hoặc tính ra được`,
    expected: "khớp nguồn",
    measured: `${uniqueNums.length}/${uniqueNums.length}`,
  };
}

/** 5. Kiểm chủ quyền lãnh thổ trên dữ liệu bản đồ TopoJSON (Hoàng Sa, Trường Sa thuộc Việt Nam). */
export function verifyGeoSovereignty(topo: unknown): VerifyDetail {
  if (!topo || typeof topo !== "object") {
    return { ok: false, label: "Dữ liệu bản đồ không hợp lệ" };
  }
  const t = topo as { objects?: Record<string, { geometries?: Array<{ id?: string; properties?: Record<string, unknown> }> }> };
  const objects = t.objects ?? {};
  const islands = objects.islands?.geometries ?? [];
  const hasHoangSa = islands.some((g) => g.id === "hoang-sa" && (g.properties?.iso === "VNM" || g.properties?.chuQuyen === "Việt Nam"));
  const hasTruongSa = islands.some((g) => g.id === "truong-sa" && (g.properties?.iso === "VNM" || g.properties?.chuQuyen === "Việt Nam"));
  if (!hasHoangSa || !hasTruongSa) {
    const missing = [!hasHoangSa && "Hoàng Sa", !hasTruongSa && "Trường Sa"].filter(Boolean).join(", ");
    return {
      ok: false,
      label: `Bản đồ thiếu khẳng định chủ quyền Việt Nam đối với: ${missing}`,
      expected: "Hoàng Sa + Trường Sa (VNM)",
      measured: missing,
    };
  }
  return {
    ok: true,
    label: "Chủ quyền bản đồ hợp lệ: có đủ Quần đảo Hoàng Sa (Đà Nẵng) và Quần đảo Trường Sa (Khánh Hòa) thuộc Việt Nam",
    expected: "Hoàng Sa + Trường Sa (VNM)",
    measured: "Đầy đủ",
  };
}

/** Hàm tổng hợp tự kiểm tất định theo hợp đồng huy hiệu "Đã kiểm" (P13). */
export function verifyDiaChart(rawInput: DiaChartCheckInput): Verification {
  const input = DiaChartCheckInputSchema.parse(rawInput);
  const details: VerifyDetail[] = [];

  // 1. Tỉ lệ biểu đồ
  details.push(...verifyChartScale(input));

  // 2. Tổng cơ cấu = 100 % (cho tròn, miền, cột 100%)
  if (["tron", "mien", "cot-100"].includes(input.loaiBieuDo)) {
    details.push(...verifyStructure100(input.bang));
  }

  // 3. Khoảng cách năm giãn đúng tỉ lệ thật
  const years = extractYears(input.bang);
  if (years && input.toaDoX && years.length >= 3) {
    details.push(verifyYearAxisSpacing(years, input.toaDoX));
  }

  // 4. Số liệu hiển thị có trong nguồn hoặc tính ra được
  const displayed: number[] = [...(input.soHienThi ?? [])];
  if (input.vanBanHienThi) {
    displayed.push(...extractNumbersFromText(input.vanBanHienThi));
  }
  if (displayed.length > 0) {
    details.push(verifyNumbersFromSource(input.bang, displayed));
  }

  const status: Verification["status"] = details.some((d) => d.ok === false)
    ? "mismatch"
    : details.some((d) => d.ok === true)
      ? "verified"
      : "unchecked";

  return {
    status,
    details: details.slice(0, 40).map((d) => ({
      ...d,
      label: d.label.slice(0, 200),
      expected: d.expected?.slice(0, 120),
      measured: d.measured?.slice(0, 120),
    })),
  };
}
