/** Bảng mã di truyền chuẩn (64 bộ ba mARN 5'→3'), phiên mã (ADN → mARN) và dịch mã (mARN → chuỗi axit amin).
 *  Hỗ trợ cả kí hiệu SGK GDPT 2018 (A, T, G, C, U) và truyền thống (A, T, G, X, U). Thuần, không I/O. */

export type NucleotideNotation = "2018" | "truyen_thong";

export type AminoAcidInfo = {
  code3: string;
  code1: string;
  nameVi: string;
  isStop?: boolean;
  isStart?: boolean;
};

/** 64 bộ ba mã sao mARN (chiều 5' → 3') theo bảng mã di truyền chuẩn (Universal Genetic Code). */
export const GENETIC_CODE: Readonly<Record<string, AminoAcidInfo>> = {
  // U__
  UUU: { code3: "Phe", code1: "F", nameVi: "Phenylalanine" },
  UUC: { code3: "Phe", code1: "F", nameVi: "Phenylalanine" },
  UUA: { code3: "Leu", code1: "L", nameVi: "Leucine" },
  UUG: { code3: "Leu", code1: "L", nameVi: "Leucine" },
  UCU: { code3: "Ser", code1: "S", nameVi: "Serine" },
  UCC: { code3: "Ser", code1: "S", nameVi: "Serine" },
  UCA: { code3: "Ser", code1: "S", nameVi: "Serine" },
  UCG: { code3: "Ser", code1: "S", nameVi: "Serine" },
  UAU: { code3: "Tyr", code1: "Y", nameVi: "Tyrosine" },
  UAC: { code3: "Tyr", code1: "Y", nameVi: "Tyrosine" },
  UAA: { code3: "Stop", code1: "*", nameVi: "Mã kết thúc", isStop: true },
  UAG: { code3: "Stop", code1: "*", nameVi: "Mã kết thúc", isStop: true },
  UGU: { code3: "Cys", code1: "C", nameVi: "Cysteine" },
  UGC: { code3: "Cys", code1: "C", nameVi: "Cysteine" },
  UGA: { code3: "Stop", code1: "*", nameVi: "Mã kết thúc", isStop: true },
  UGG: { code3: "Trp", code1: "W", nameVi: "Tryptophan" },
  // C__
  CUU: { code3: "Leu", code1: "L", nameVi: "Leucine" },
  CUC: { code3: "Leu", code1: "L", nameVi: "Leucine" },
  CUA: { code3: "Leu", code1: "L", nameVi: "Leucine" },
  CUG: { code3: "Leu", code1: "L", nameVi: "Leucine" },
  CCU: { code3: "Pro", code1: "P", nameVi: "Proline" },
  CCC: { code3: "Pro", code1: "P", nameVi: "Proline" },
  CCA: { code3: "Pro", code1: "P", nameVi: "Proline" },
  CCG: { code3: "Pro", code1: "P", nameVi: "Proline" },
  CAU: { code3: "His", code1: "H", nameVi: "Histidine" },
  CAC: { code3: "His", code1: "H", nameVi: "Histidine" },
  CAA: { code3: "Gln", code1: "Q", nameVi: "Glutamine" },
  CAG: { code3: "Gln", code1: "Q", nameVi: "Glutamine" },
  CGU: { code3: "Arg", code1: "R", nameVi: "Arginine" },
  CGC: { code3: "Arg", code1: "R", nameVi: "Arginine" },
  CGA: { code3: "Arg", code1: "R", nameVi: "Arginine" },
  CGG: { code3: "Arg", code1: "R", nameVi: "Arginine" },
  // A__
  AUU: { code3: "Ile", code1: "I", nameVi: "Isoleucine" },
  AUC: { code3: "Ile", code1: "I", nameVi: "Isoleucine" },
  AUA: { code3: "Ile", code1: "I", nameVi: "Isoleucine" },
  AUG: { code3: "Met", code1: "M", nameVi: "Methionine", isStart: true },
  ACU: { code3: "Thr", code1: "T", nameVi: "Threonine" },
  ACC: { code3: "Thr", code1: "T", nameVi: "Threonine" },
  ACA: { code3: "Thr", code1: "T", nameVi: "Threonine" },
  ACG: { code3: "Thr", code1: "T", nameVi: "Threonine" },
  AAU: { code3: "Asn", code1: "N", nameVi: "Asparagine" },
  AAC: { code3: "Asn", code1: "N", nameVi: "Asparagine" },
  AAA: { code3: "Lys", code1: "K", nameVi: "Lysine" },
  AAG: { code3: "Lys", code1: "K", nameVi: "Lysine" },
  AGU: { code3: "Ser", code1: "S", nameVi: "Serine" },
  AGC: { code3: "Ser", code1: "S", nameVi: "Serine" },
  AGA: { code3: "Arg", code1: "R", nameVi: "Arginine" },
  AGG: { code3: "Arg", code1: "R", nameVi: "Arginine" },
  // G__
  GUU: { code3: "Val", code1: "V", nameVi: "Valine" },
  GUC: { code3: "Val", code1: "V", nameVi: "Valine" },
  GUA: { code3: "Val", code1: "V", nameVi: "Valine" },
  GUG: { code3: "Val", code1: "V", nameVi: "Valine" },
  GCU: { code3: "Ala", code1: "A", nameVi: "Alanine" },
  GCC: { code3: "Ala", code1: "A", nameVi: "Alanine" },
  GCA: { code3: "Ala", code1: "A", nameVi: "Alanine" },
  GCG: { code3: "Ala", code1: "A", nameVi: "Alanine" },
  GAU: { code3: "Asp", code1: "D", nameVi: "Aspartic acid" },
  GAC: { code3: "Asp", code1: "D", nameVi: "Aspartic acid" },
  GAA: { code3: "Glu", code1: "E", nameVi: "Glutamic acid" },
  GAG: { code3: "Glu", code1: "E", nameVi: "Glutamic acid" },
  GGU: { code3: "Gly", code1: "G", nameVi: "Glycine" },
  GGC: { code3: "Gly", code1: "G", nameVi: "Glycine" },
  GGA: { code3: "Gly", code1: "G", nameVi: "Glycine" },
  GGG: { code3: "Gly", code1: "G", nameVi: "Glycine" },
};

const DNA_COMP: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
const DNA_TO_RNA: Record<string, string> = { A: "U", T: "A", G: "C", C: "G" };
const RNA_COMP: Record<string, string> = { A: "U", U: "A", G: "C", C: "G" };

function stripStrandDecorations(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/3'|5'|3′|5′/g, "")
    .replace(/[\s\-–—·.,]/g, "")
    .toUpperCase();
}

export function normalizeDnaSequence(raw: string): string {
  const s = stripStrandDecorations(raw).replace(/X/g, "C");
  if (!s) throw new Error("Trình tự ADN không được để trống");
  if (!/^[ATGC]+$/.test(s)) {
    const bad = [...new Set(s.replace(/[ATGC]/g, ""))].join(", ");
    throw new Error(`Trình tự ADN chứa kí tự không hợp lệ: ${bad} (chỉ dùng A, T, G, C hoặc X)`);
  }
  return s;
}

export function normalizeRnaSequence(raw: string): string {
  const s = stripStrandDecorations(raw).replace(/X/g, "C");
  if (!s) throw new Error("Trình tự mARN không được để trống");
  if (!/^[AUGC]+$/.test(s)) {
    const bad = [...new Set(s.replace(/[AUGC]/g, ""))].join(", ");
    throw new Error(`Trình tự mARN chứa kí tự không hợp lệ: ${bad} (chỉ dùng A, U, G, C hoặc X)`);
  }
  return s;
}

export function formatNotation(seq: string, notation: NucleotideNotation = "2018"): string {
  return notation === "truyen_thong" ? seq.replace(/C/g, "X") : seq;
}

export type TranscriptionResult = {
  templateDna3to5: string;
  codingDna5to3: string;
  mrna5to3: string;
  codons: string[];
  anticodons3to5: string[];
};

/** Phiên mã từ mạch khuôn ADN chiều 3' → 5' sang mARN chiều 5' → 3'. */
export function transcribeFromTemplate(
  templateDna3to5Raw: string,
  notation: NucleotideNotation = "2018",
): TranscriptionResult {
  const tpl = normalizeDnaSequence(templateDna3to5Raw);
  const coding = [...tpl].map((b) => DNA_COMP[b]!).join("");
  const mrna = [...tpl].map((b) => DNA_TO_RNA[b]!).join("");
  const codons: string[] = [];
  const anticodons3to5: string[] = [];
  for (let i = 0; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    codons.push(formatNotation(c, notation));
    const anti = [...c].map((b) => RNA_COMP[b]!).join("");
    anticodons3to5.push(formatNotation(anti, notation));
  }
  return {
    templateDna3to5: formatNotation(tpl, notation),
    codingDna5to3: formatNotation(coding, notation),
    mrna5to3: formatNotation(mrna, notation),
    codons,
    anticodons3to5,
  };
}

/** Lấy trình tự mạch khuôn 3' → 5' từ mạch mã hoá 5' → 3' (rồi phiên mã). */
export function transcribeFromCoding(
  codingDna5to3Raw: string,
  notation: NucleotideNotation = "2018",
): TranscriptionResult {
  const coding = normalizeDnaSequence(codingDna5to3Raw);
  const tpl = [...coding].map((b) => DNA_COMP[b]!).join("");
  return transcribeFromTemplate(tpl, notation);
}

export type TranslatedStep = {
  index: number;
  codon: string;
  anticodon3to5: string;
  code3: string;
  code1: string;
  nameVi: string;
};

export type TranslationResult = {
  mrna5to3: string;
  startIndex: number;
  stopCodon: string | null;
  steps: TranslatedStep[];
  chainCode3: string;
  chainCode1: string;
  chainNameVi: string;
  /** Số axit amin do ribôxôm lắp ghép (tính cả Met mở đầu — chuỗi pôlipeptit sơ khai). */
  rawAminoAcidCount: number;
  /** Số axit amin trong chuỗi pôlipeptit hoàn chỉnh (đã cắt Met mở đầu nếu mở đầu bằng AUG). */
  matureAminoAcidCount: number;
  /** Số liên kết peptit trong chuỗi sơ khai (= rawAminoAcidCount - 1) và số phân tử H2O giải phóng. */
  peptideBonds: number;
  /** Số liên kết peptit trong chuỗi hoàn chỉnh (= matureAminoAcidCount - 1). */
  maturePeptideBonds: number;
  tRnaCount: number;
};

export type TranslateOptions = {
  /** Mặc định true: quét tìm bộ ba mở đầu AUG đầu tiên; false: dịch ngay từ nucleotide đầu tiên (khung 0). */
  requireStartCodon?: boolean;
  notation?: NucleotideNotation;
};

/** Dịch mã chuỗi mARN (5' → 3') theo bảng mã di truyền chuẩn. */
export function translateMrna(mrna5to3Raw: string, opts: TranslateOptions = {}): TranslationResult {
  const requireStart = opts.requireStartCodon ?? true;
  const notation = opts.notation ?? "2018";
  const mrna = normalizeRnaSequence(mrna5to3Raw);

  let startIndex = 0;
  if (requireStart) {
    startIndex = mrna.indexOf("AUG");
    if (startIndex === -1) {
      return {
        mrna5to3: formatNotation(mrna, notation),
        startIndex: -1,
        stopCodon: null,
        steps: [],
        chainCode3: "",
        chainCode1: "",
        chainNameVi: "",
        rawAminoAcidCount: 0,
        matureAminoAcidCount: 0,
        peptideBonds: 0,
        maturePeptideBonds: 0,
        tRnaCount: 0,
      };
    }
  }

  const steps: TranslatedStep[] = [];
  let stopCodon: string | null = null;

  for (let i = startIndex; i + 3 <= mrna.length; i += 3) {
    const c = mrna.slice(i, i + 3);
    const info = GENETIC_CODE[c];
    if (!info) throw new Error(`Bộ ba không xác định: ${c}`);
    if (info.isStop) {
      stopCodon = formatNotation(c, notation);
      break;
    }
    const anti = [...c].map((b) => RNA_COMP[b]!).join("");
    steps.push({
      index: steps.length + 1,
      codon: formatNotation(c, notation),
      anticodon3to5: formatNotation(anti, notation),
      code3: info.code3,
      code1: info.code1,
      nameVi: info.nameVi,
    });
  }

  const rawCount = steps.length;
  const startsWithMet = steps[0]?.code3 === "Met" && requireStart;
  const matureCount = startsWithMet ? Math.max(0, rawCount - 1) : rawCount;

  return {
    mrna5to3: formatNotation(mrna, notation),
    startIndex,
    stopCodon,
    steps,
    chainCode3: steps.map((s) => s.code3).join("-"),
    chainCode1: steps.map((s) => s.code1).join(""),
    chainNameVi: steps.map((s) => s.nameVi).join(" – "),
    rawAminoAcidCount: rawCount,
    matureAminoAcidCount: matureCount,
    peptideBonds: Math.max(0, rawCount - 1),
    maturePeptideBonds: Math.max(0, matureCount - 1),
    tRnaCount: rawCount,
  };
}

/** Phiên mã + dịch mã liên hoàn từ mạch khuôn ADN 3' → 5'. */
export function expressGeneFromTemplate(
  templateDna3to5Raw: string,
  opts: TranslateOptions = {},
): { transcription: TranscriptionResult; translation: TranslationResult } {
  const transcription = transcribeFromTemplate(templateDna3to5Raw, opts.notation);
  const translation = translateMrna(transcription.mrna5to3, opts);
  return { transcription, translation };
}
