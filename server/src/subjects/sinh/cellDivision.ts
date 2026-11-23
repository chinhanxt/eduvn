/** Đếm nhiễm sắc thể (NST), crômatit, tâm động và hàm lượng ADN qua các kì nguyên phân và giảm phân.
 *  Chuẩn CTGDPT 2018 (KHTN 9, Sinh học 10 & 12). Thuần, không I/O. */

export type DivisionType = "nguyen_phan" | "giam_phan";

export type MitosisPhaseId =
  | "gian_ki_g1"
  | "gian_ki_s_g2"
  | "ki_dau"
  | "ki_giua"
  | "ki_sau"
  | "ki_cuoi";

export type MeiosisPhaseId =
  | "gp_gian_ki_g2"
  | "gp1_ki_dau"
  | "gp1_ki_giua"
  | "gp1_ki_sau"
  | "gp1_ki_cuoi"
  | "gp2_ki_dau"
  | "gp2_ki_giua"
  | "gp2_ki_sau"
  | "gp2_ki_cuoi";

export type CellPhaseId = MitosisPhaseId | MeiosisPhaseId;

export type ChromosomeState = "don" | "kep";

export type PhaseSnapshot = {
  division: DivisionType;
  phase: CellPhaseId;
  order: number;
  labelVi: string;
  shortLabel: string;
  /** Bộ NST lưỡng bội gốc 2n của loài */
  twoN: number;
  /** Số NST trong MỖI tế bào ở kì này */
  chromosomes: number;
  /** Trạng thái NST: đơn ("don") hay kép ("kep") */
  state: ChromosomeState;
  /** Số crômatit trong MỖI tế bào (0 khi NST ở trạng thái đơn!) */
  chromatids: number;
  /** Số tâm động trong MỖI tế bào (luôn bằng số NST) */
  centromeres: number;
  /** Kí hiệu bộ NST (vd "2n đơn", "2n kép", "4n đơn", "n kép", "n đơn") */
  ploidyFormula: string;
  /** Hàm lượng ADN tương đối trong 1 tế bào (so với giao tử là 1C, tế bào G1 là 2C) */
  dnaRelativeC: number;
  /** Số tế bào xuất phát từ 1 tế bào mẹ ban đầu ở cuối/trong kì này */
  cellCount: number;
  /** Diễn biến chính ngắn gọn theo SGK 2018 */
  descriptionVi: string;
};

function assertValidTwoN(twoN: number): void {
  if (!Number.isInteger(twoN) || twoN < 2 || twoN % 2 !== 0) {
    throw new Error(`Bộ NST lưỡng bội 2n phải là số nguyên dương chẵn ≥ 2 (gặp ${twoN})`);
  }
}

export const MITOSIS_PHASES: readonly MitosisPhaseId[] = [
  "gian_ki_g1",
  "gian_ki_s_g2",
  "ki_dau",
  "ki_giua",
  "ki_sau",
  "ki_cuoi",
];

export const MEIOSIS_PHASES: readonly MeiosisPhaseId[] = [
  "gp_gian_ki_g2",
  "gp1_ki_dau",
  "gp1_ki_giua",
  "gp1_ki_sau",
  "gp1_ki_cuoi",
  "gp2_ki_dau",
  "gp2_ki_giua",
  "gp2_ki_sau",
  "gp2_ki_cuoi",
];

/** Tính số NST, crômatit, tâm động cho một kì cụ thể của nguyên phân hoặc giảm phân. */
export function countCellPhase(twoN: number, phase: CellPhaseId): PhaseSnapshot {
  assertValidTwoN(twoN);
  const n = twoN / 2;

  switch (phase) {
    // ——— NGUYÊN PHÂN ———
    case "gian_ki_g1":
      return {
        division: "nguyen_phan",
        phase,
        order: 0,
        labelVi: "Kì trung gian (pha G1)",
        shortLabel: "G1",
        twoN,
        chromosomes: twoN,
        state: "don",
        chromatids: 0,
        centromeres: twoN,
        ploidyFormula: "2n đơn",
        dnaRelativeC: 2,
        cellCount: 1,
        descriptionVi: "Tế bào sinh trưởng, tổng hợp chất cần thiết; NST ở dạng sợi mảnh đơn (chưa nhân đôi).",
      };
    case "gian_ki_s_g2":
      return {
        division: "nguyen_phan",
        phase,
        order: 1,
        labelVi: "Kì trung gian (sau pha S / G2)",
        shortLabel: "S–G2",
        twoN,
        chromosomes: twoN,
        state: "kep",
        chromatids: 2 * twoN,
        centromeres: twoN,
        ploidyFormula: "2n kép",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "ADN và NST đã nhân đôi thành NST kép gồm 2 crômatit chị em dính nhau ở tâm động.",
      };
    case "ki_dau":
      return {
        division: "nguyen_phan",
        phase,
        order: 2,
        labelVi: "Kì đầu (Nguyên phân)",
        shortLabel: "Kì đầu",
        twoN,
        chromosomes: twoN,
        state: "kep",
        chromatids: 2 * twoN,
        centromeres: twoN,
        ploidyFormula: "2n kép",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "Các NST kép bắt đầu đóng xoắn, co ngắn; màng nhân tiêu biến dần, thoi phân bào hình thành.",
      };
    case "ki_giua":
      return {
        division: "nguyen_phan",
        phase,
        order: 3,
        labelVi: "Kì giữa (Nguyên phân)",
        shortLabel: "Kì giữa",
        twoN,
        chromosomes: twoN,
        state: "kep",
        chromatids: 2 * twoN,
        centromeres: twoN,
        ploidyFormula: "2n kép",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "Các NST kép đóng xoắn cực đại và xếp thành 1 hàng trên mặt phẳng xích đạo của thoi phân bào.",
      };
    case "ki_sau":
      return {
        division: "nguyen_phan",
        phase,
        order: 4,
        labelVi: "Kì sau (Nguyên phân)",
        shortLabel: "Kì sau",
        twoN,
        chromosomes: 2 * twoN,
        state: "don",
        chromatids: 0,
        centromeres: 2 * twoN,
        ploidyFormula: "4n đơn",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "Hai crômatit chị em tách nhau ở tâm động thành 2 NST đơn và phân li đồng đều về 2 cực tế bào.",
      };
    case "ki_cuoi":
      return {
        division: "nguyen_phan",
        phase,
        order: 5,
        labelVi: "Kì cuối (Nguyên phân)",
        shortLabel: "Kì cuối",
        twoN,
        chromosomes: twoN,
        state: "don",
        chromatids: 0,
        centromeres: twoN,
        ploidyFormula: "2n đơn",
        dnaRelativeC: 2,
        cellCount: 2,
        descriptionVi: "NST dãn xoắn, màng nhân hình thành lại, phân chia tế bào chất tạo 2 tế bào con giống hệt nhau (2n).",
      };

    // ——— GIẢM PHÂN ———
    case "gp_gian_ki_g2":
      return {
        division: "giam_phan",
        phase,
        order: 0,
        labelVi: "Kì trung gian (trước Giảm phân I)",
        shortLabel: "Trung gian",
        twoN,
        chromosomes: twoN,
        state: "kep",
        chromatids: 2 * twoN,
        centromeres: twoN,
        ploidyFormula: "2n kép",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "ADN và NST nhân đôi 1 lần duy nhất tạo 2n NST kép, chuẩn bị bước vào Giảm phân I.",
      };
    case "gp1_ki_dau":
      return {
        division: "giam_phan",
        phase,
        order: 1,
        labelVi: "Kì đầu I (Giảm phân I)",
        shortLabel: "Đầu I",
        twoN,
        chromosomes: twoN,
        state: "kep",
        chromatids: 2 * twoN,
        centromeres: twoN,
        ploidyFormula: "2n kép",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "Các cặp NST kép tương đồng tiếp hợp (có thể trao đổi chéo), đóng xoắn dần; màng nhân tiêu biến.",
      };
    case "gp1_ki_giua":
      return {
        division: "giam_phan",
        phase,
        order: 2,
        labelVi: "Kì giữa I (Giảm phân I)",
        shortLabel: "Giữa I",
        twoN,
        chromosomes: twoN,
        state: "kep",
        chromatids: 2 * twoN,
        centromeres: twoN,
        ploidyFormula: "2n kép",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "Các cặp NST kép tương đồng đóng xoắn cực đại và xếp thành 2 hàng trên mặt phẳng xích đạo.",
      };
    case "gp1_ki_sau":
      return {
        division: "giam_phan",
        phase,
        order: 3,
        labelVi: "Kì sau I (Giảm phân I)",
        shortLabel: "Sau I",
        twoN,
        chromosomes: twoN,
        state: "kep",
        chromatids: 2 * twoN,
        centromeres: twoN,
        ploidyFormula: "2n kép",
        dnaRelativeC: 4,
        cellCount: 1,
        descriptionVi: "Mỗi NST kép trong cặp tương đồng phân li độc lập về 1 cực (không tách tâm động).",
      };
    case "gp1_ki_cuoi":
      return {
        division: "giam_phan",
        phase,
        order: 4,
        labelVi: "Kì cuối I (Giảm phân I)",
        shortLabel: "Cuối I",
        twoN,
        chromosomes: n,
        state: "kep",
        chromatids: 2 * n,
        centromeres: n,
        ploidyFormula: "n kép",
        dnaRelativeC: 2,
        cellCount: 2,
        descriptionVi: "Hình thành 2 tế bào con, mỗi tế bào chứa bộ đơn bội kép (n NST kép).",
      };
    case "gp2_ki_dau":
      return {
        division: "giam_phan",
        phase,
        order: 5,
        labelVi: "Kì đầu II (Giảm phân II)",
        shortLabel: "Đầu II",
        twoN,
        chromosomes: n,
        state: "kep",
        chromatids: 2 * n,
        centromeres: n,
        ploidyFormula: "n kép",
        dnaRelativeC: 2,
        cellCount: 2,
        descriptionVi: "Không có nhân đôi NST; n NST kép trong mỗi tế bào con co xoắn trở lại, thoi phân bào xuất hiện.",
      };
    case "gp2_ki_giua":
      return {
        division: "giam_phan",
        phase,
        order: 6,
        labelVi: "Kì giữa II (Giảm phân II)",
        shortLabel: "Giữa II",
        twoN,
        chromosomes: n,
        state: "kep",
        chromatids: 2 * n,
        centromeres: n,
        ploidyFormula: "n kép",
        dnaRelativeC: 2,
        cellCount: 2,
        descriptionVi: "Các NST kép (n) xếp thành 1 hàng trên mặt phẳng xích đạo trong mỗi tế bào.",
      };
    case "gp2_ki_sau":
      return {
        division: "giam_phan",
        phase,
        order: 7,
        labelVi: "Kì sau II (Giảm phân II)",
        shortLabel: "Sau II",
        twoN,
        chromosomes: twoN,
        state: "don",
        chromatids: 0,
        centromeres: twoN,
        ploidyFormula: "2n đơn",
        dnaRelativeC: 2,
        cellCount: 2,
        descriptionVi: "Crômatit chị em tách ở tâm động thành 2n NST đơn trong mỗi tế bào và tiến về 2 cực.",
      };
    case "gp2_ki_cuoi":
      return {
        division: "giam_phan",
        phase,
        order: 8,
        labelVi: "Kì cuối II (Giảm phân II)",
        shortLabel: "Cuối II",
        twoN,
        chromosomes: n,
        state: "don",
        chromatids: 0,
        centromeres: n,
        ploidyFormula: "n đơn",
        dnaRelativeC: 1,
        cellCount: 4,
        descriptionVi: "Tạo 4 tế bào con đơn bội (n NST đơn), hàm lượng ADN giảm một nửa so với tế bào ban đầu.",
      };
  }
}

/** Toàn bộ chuỗi các kì cho thanh trượt mô phỏng phân bào. */
export function listDivisionTimeline(twoN: number, division: DivisionType): PhaseSnapshot[] {
  const list = division === "nguyen_phan" ? MITOSIS_PHASES : MEIOSIS_PHASES;
  return list.map((p) => countCellPhase(twoN, p));
}

export type MitosisRoundsResult = {
  twoN: number;
  initialCells: number;
  rounds: number;
  daughterCells: number;
  totalChromosomesInDaughters: number;
  /** Số NST đơn tương đương môi trường nội bào cung cấp: a · 2n · (2^k − 1) */
  chromosomesSuppliedByEnv: number;
  /** Số NST hoàn toàn mới từ nguyên liệu môi trường: a · 2n · (2^k − 2) (với k ≥ 1) */
  completelyNewChromosomes: number;
};

/** Tính số tế bào con và số NST môi trường cung cấp sau k lần nguyên phân liên tiếp từ a tế bào (2n). */
export function calculateMitosisRounds(twoN: number, initialCells: number, rounds: number): MitosisRoundsResult {
  assertValidTwoN(twoN);
  if (!Number.isInteger(initialCells) || initialCells < 1) throw new Error("Số tế bào ban đầu phải là số nguyên dương");
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 30) throw new Error("Số lần nguyên phân phải là số nguyên trong 0..30");
  const factor = 2 ** rounds;
  const daughterCells = initialCells * factor;
  return {
    twoN,
    initialCells,
    rounds,
    daughterCells,
    totalChromosomesInDaughters: daughterCells * twoN,
    chromosomesSuppliedByEnv: initialCells * twoN * (factor - 1),
    completelyNewChromosomes: rounds >= 1 ? initialCells * twoN * (factor - 2) : 0,
  };
}

/** Tính số giao tử tạo ra khi giảm phân từ `cells` tế bào sinh dục chín. */
export function calculateGametogenesis(twoN: number, cells: number, sex: "duc" | "cai") {
  assertValidTwoN(twoN);
  if (!Number.isInteger(cells) || cells < 1) throw new Error("Số tế bào sinh dục phải là số nguyên dương");
  const n = twoN / 2;
  if (sex === "duc") {
    return {
      sex,
      n,
      gametes: cells * 4,
      polarBodies: 0,
      chromosomesInGametes: cells * 4 * n,
    };
  }
  return {
    sex,
    n,
    gametes: cells,
    polarBodies: cells * 3,
    chromosomesInGametes: cells * n,
  };
}

/** Tìm tất cả các kì khớp với số đo (NST, crômatit, tâm động) của một tế bào đang phân bào. */
export function matchPhasesByCounts(
  twoN: number,
  division: DivisionType,
  obs: { chromosomes: number; chromatids: number; centromeres?: number },
): PhaseSnapshot[] {
  return listDivisionTimeline(twoN, division).filter(
    (p) =>
      p.chromosomes === obs.chromosomes &&
      p.chromatids === obs.chromatids &&
      (obs.centromeres === undefined || p.centromeres === obs.centromeres),
  );
}
