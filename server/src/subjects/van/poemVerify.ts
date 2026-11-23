/**
 * Tự kiểm tất định thể thơ tiếng Việt (đếm âm tiết, phân loại thanh Bằng–Trắc, kiểm vần chính/thông, gợi ý ngắt nhịp).
 * Thuần, không I/O. Phục vụ huy hiệu "Đã kiểm" (cơ chế P13) cho gói môn Ngữ văn.
 */
import type { Verification } from "../../domain/solution";

export const POEM_FORMS = [
  "luc_bat",
  "song_that_luc_bat",
  "that_ngon_tu_tuyet",
  "that_ngon_bat_cu",
  "ngu_ngon",
  "tu_do",
] as const;
export type PoemForm = (typeof POEM_FORMS)[number];

export const POEM_FORM_LABEL: Record<PoemForm, string> = {
  luc_bat: "Lục bát",
  song_that_luc_bat: "Song thất lục bát",
  that_ngon_tu_tuyet: "Thất ngôn tứ tuyệt",
  that_ngon_bat_cu: "Thất ngôn bát cú",
  ngu_ngon: "Thơ năm chữ (Ngũ ngôn)",
  tu_do: "Thơ tự do",
};

export type ToneGroup = "B" | "T";
export type ToneName = "ngang" | "huyen" | "sac" | "hoi" | "nga" | "nang";

export type SyllableInfo = {
  raw: string;
  clean: string;
  tone: ToneName;
  group: ToneGroup;
  rime: string;
};

export type LineAnalysis = {
  lineNumber: number;
  text: string;
  syllables: SyllableInfo[];
  count: number;
  expectedCount?: number;
  rhythm: string;
};

export type RhymeCheck = {
  fromLine: number;
  fromPos: number;
  fromWord: string;
  toLine: number;
  toPos: number;
  toWord: string;
  kind: "chinh" | "thong" | "lech";
  ok: boolean;
  note: string;
};

export type PoemVerificationResult = {
  form: PoemForm;
  formLabel: string;
  badge: "Đã kiểm" | "Lệch luật" | "Chưa kiểm";
  verification: Verification;
  lines: LineAnalysis[];
  rhymes: RhymeCheck[];
  summary: string;
};

const COMBINING_TONE: Record<string, ToneName> = {
  "\u0300": "huyen",
  "\u0301": "sac",
  "\u0309": "hoi",
  "\u0303": "nga",
  "\u0323": "nang",
};

const ONSETS = ["ngh", "ng", "nh", "ch", "tr", "th", "ph", "kh", "gh", "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "x"];
const VOWEL_BASE = new Set(["a", "ă", "â", "e", "ê", "i", "o", "ô", "ơ", "u", "ư", "y"]);

/** Loại bỏ dấu thanh (giữ nguyên nguyên âm có mũ/móc: ă, â, ê, ô, ơ, ư và đ). */
export function stripToneMarks(word: string): { toneless: string; tone: ToneName } {
  const nfd = word.normalize("NFD").toLowerCase();
  let tone: ToneName = "ngang";
  let out = "";
  for (const ch of nfd) {
    if (COMBINING_TONE[ch]) {
      tone = COMBINING_TONE[ch]!;
    } else {
      out += ch;
    }
  }
  return { toneless: out.normalize("NFC"), tone };
}

export function toneGroupOf(tone: ToneName): ToneGroup {
  return tone === "ngang" || tone === "huyen" ? "B" : "T";
}

/** Tách phần vần (âm đệm + âm chính + âm cuối) của một tiếng Việt. */
export function extractRime(word: string): string {
  const clean = word.normalize("NFC").replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (!clean) return "";
  const { toneless } = stripToneMarks(clean);
  if (!toneless) return "";

  // Trường hợp đặc biệt: "gi" và "qu"
  if (toneless.startsWith("gi")) {
    const rest = toneless.slice(2);
    if (!rest) return "i";
    // "giê..." (giết, giếng) -> nguyên âm đôi iê, âm đầu chỉ là g
    if (rest.startsWith("ê")) return "i" + rest;
    // "gi" + nguyên âm khác (gia, giang, gió, giờ, giữ) -> âm đầu là gi
    if (VOWEL_BASE.has(rest[0]!)) return rest;
    // "gìn", "gỉ" -> âm đầu là g, phần vần bắt đầu từ i
    return toneless.slice(1);
  }
  if (toneless.startsWith("qu")) {
    const rest = toneless.slice(2);
    if (!rest) return "u";
    // qu + ê/e/i/y đơn (quê, que, quí, quy) -> vần là phần sau qu; qu + yê/a/ă/â/o/ô (quyên, quang, quốc) -> giữ u đệm
    if (rest.startsWith("yê") || /^[aăâoôơ]/.test(rest)) return "u" + rest;
    return rest;
  }

  for (const onset of ONSETS) {
    if (toneless.startsWith(onset)) {
      const rest = toneless.slice(onset.length);
      if (rest && [...rest].some((c) => VOWEL_BASE.has(c))) return rest;
    }
  }
  return toneless;
}

/** Chuẩn hoá nguyên âm tương đương chính tả (i/y ở cuối hoặc đơn độc). */
function normRime(rime: string): string {
  if (rime === "y") return "i";
  if (rime.endsWith("y") && !rime.endsWith("ay") && !rime.endsWith("ây") && !rime.endsWith("uy")) {
    return rime.slice(0, -1) + "i";
  }
  return rime;
}

/** Bỏ âm đệm o/u (oa->a, oai->ai, uyên->iên, uê->ê) để xét vần thông cổ điển. */
function dropGlide(rime: string): string {
  if (rime.startsWith("uyê")) return "iê" + rime.slice(3);
  if (rime.startsWith("uy")) return "i" + rime.slice(2);
  if (rime.startsWith("oa")) return "a" + rime.slice(2);
  if (rime.startsWith("oă")) return "ă" + rime.slice(2);
  if (rime.startsWith("oe")) return "e" + rime.slice(2);
  if (rime.startsWith("uê")) return "ê" + rime.slice(2);
  if (rime.startsWith("uâ")) return "â" + rime.slice(2);
  if (rime.startsWith("ua") && rime.length > 2) return "a" + rime.slice(2);
  if (rime.startsWith("uơ")) return "ơ" + rime.slice(2);
  return rime;
}

/** Các nhóm vần thông chuẩn thi pháp tiếng Việt (cổ điển & hiện đại). */
const THONG_GROUPS: readonly (readonly string[])[] = [
  ["ơi", "ươi"],
  ["oi", "oai", "ôi"],
  ["ui", "ôi"],
  ["ên", "iên", "uyên"],
  ["inh", "ênh"],
  ["anh", "ênh", "oanh"],
  ["ương", "ơng", "uông", "ông"],
  ["ươn", "ơn", "uôn", "ôn"],
  ["uôi", "ôi"],
  ["iêu", "êu", "ươu"],
  ["ai", "ay"],
  ["ao", "au"],
  ["an", "oan", "ang", "oang"],
  ["at", "oat"],
  ["on", "oan"],
  ["a", "oa", "ia", "ưa", "ua"],
  ["e", "oe", "ê", "uê"],
  ["i", "y", "uy"],
  ["u", "ư"],
  ["o", "ô", "ơ"],
];

export function compareRhyme(
  a: SyllableInfo,
  b: SyllableInfo,
  opts: { requireSameToneGroup?: boolean } = {},
): { ok: boolean; kind: "chinh" | "thong" | "lech" } {
  const requireSame = opts.requireSameToneGroup ?? true;
  if (requireSame && a.group !== b.group) return { ok: false, kind: "lech" };
  const ra = normRime(a.rime);
  const rb = normRime(b.rime);
  if (!ra || !rb) return { ok: false, kind: "lech" };
  if (ra === rb) return { ok: true, kind: "chinh" };
  const ga = normRime(dropGlide(ra));
  const gb = normRime(dropGlide(rb));
  if (ga === gb) return { ok: true, kind: "thong" };
  for (const grp of THONG_GROUPS) {
    if ((grp.includes(ra) || grp.includes(ga)) && (grp.includes(rb) || grp.includes(gb))) {
      return { ok: true, kind: "thong" };
    }
  }
  return { ok: false, kind: "lech" };
}

/** Tách các tiếng trong một dòng thơ (bỏ dấu câu, dấu gạch nối ngắt từ). */
export function tokenizePoemLine(line: string): SyllableInfo[] {
  const cleaned = line
    .normalize("NFC")
    .replace(/[—–\-/]+/g, " ")
    .replace(/[.,;:!?…"“”'‘’()\[\]«»*]+/g, " ")
    .trim();
  if (!cleaned) return [];
  return cleaned
    .split(/\s+/)
    .filter((tok) => /\p{L}/u.test(tok))
    .map((raw) => {
      const clean = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      const { tone } = stripToneMarks(clean);
      return {
        raw,
        clean,
        tone,
        group: toneGroupOf(tone),
        rime: extractRime(clean),
      };
    });
}

function defaultRhythm(form: PoemForm, count: number, lineIdx: number): string {
  if (form === "luc_bat") return count === 6 ? "2/2/2" : count === 8 ? "4/4" : `${count}`;
  if (form === "song_that_luc_bat") {
    const pos = lineIdx % 4;
    if (pos === 0 || pos === 1) return "3/4";
    return pos === 2 ? "2/2/2" : "4/4";
  }
  if (form === "that_ngon_tu_tuyet" || form === "that_ngon_bat_cu") return "4/3";
  if (form === "ngu_ngon") return "2/3";
  return count >= 6 ? `${Math.floor(count / 2)}/${count - Math.floor(count / 2)}` : `${count}`;
}

/** Tách bài thơ thành các dòng có chữ (bỏ dòng trống). */
export function splitPoemLines(text: string): string[] {
  return text
    .normalize("NFC")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Đoán thể thơ từ số tiếng từng dòng. */
export function detectPoemForm(text: string): PoemForm {
  const counts = splitPoemLines(text).map((l) => tokenizePoemLine(l).length);
  if (counts.length === 0) return "tu_do";
  if (counts.length >= 2 && counts.length % 2 === 0 && counts.every((c, i) => c === (i % 2 === 0 ? 6 : 8))) {
    return "luc_bat";
  }
  if (counts.length >= 4 && counts.length % 4 === 0 && counts.every((c, i) => c === [7, 7, 6, 8][i % 4])) {
    return "song_that_luc_bat";
  }
  if (counts.length === 4 && counts.every((c) => c === 7)) return "that_ngon_tu_tuyet";
  if (counts.length === 8 && counts.every((c) => c === 7)) return "that_ngon_bat_cu";
  if (counts.length >= 2 && counts.every((c) => c === 5)) return "ngu_ngon";
  return "tu_do";
}

/** Tự kiểm tất định thể thơ (đếm âm tiết, kiểm vần và thanh điệu theo luật). */
export function verifyPoem(text: string, expectedForm?: PoemForm): PoemVerificationResult {
  const rawLines = splitPoemLines(text);
  const form = expectedForm ?? detectPoemForm(text);
  const formLabel = POEM_FORM_LABEL[form];

  if (rawLines.length === 0) {
    return {
      form,
      formLabel,
      badge: "Chưa kiểm",
      verification: { status: "unchecked", details: [{ ok: null, label: "Đoạn thơ trống, chưa có dữ liệu kiểm" }] },
      lines: [],
      rhymes: [],
      summary: "Chưa có dòng thơ để kiểm.",
    };
  }

  const lines: LineAnalysis[] = rawLines.map((l, idx) => {
    const syllables = tokenizePoemLine(l);
    return {
      lineNumber: idx + 1,
      text: l,
      syllables,
      count: syllables.length,
      rhythm: defaultRhythm(form, syllables.length, idx),
    };
  });

  const details: Verification["details"] = [];
  const rhymes: RhymeCheck[] = [];

  const checkPair = (
    fromLineIdx: number,
    fromPos1: number,
    toLineIdx: number,
    toPos1: number,
    expectedTone: ToneGroup | null,
    label: string,
    allowFallbackPos?: number,
  ) => {
    const la = lines[fromLineIdx];
    const lb = lines[toLineIdx];
    if (!la || !lb) return;
    const sa = la.syllables[fromPos1 - 1];
    let sb = lb.syllables[toPos1 - 1];
    let usedPos = toPos1;
    if (!sa || !sb) {
      rhymes.push({
        fromLine: fromLineIdx + 1,
        fromPos: fromPos1,
        fromWord: sa?.clean ?? "—",
        toLine: toLineIdx + 1,
        toPos: toPos1,
        toWord: sb?.clean ?? "—",
        kind: "lech",
        ok: false,
        note: `${label}: thiếu tiếng ở vị trí gieo vần`,
      });
      details.push({ ok: false, label, expected: `có đủ tiếng ở vị trí ${fromPos1}–${toPos1}`, measured: "thiếu tiếng" });
      return;
    }

    let cmp = compareRhyme(sa, sb, { requireSameToneGroup: expectedTone !== null });
    let toneOk = expectedTone === null || (sa.group === expectedTone && sb.group === expectedTone);
    let noteSuffix = "";

    // Lục bát biến thể: tiếng 6 lục gieo vào tiếng 4 bát
    if ((!cmp.ok || !toneOk) && allowFallbackPos && lb.syllables[allowFallbackPos - 1]) {
      const alt = lb.syllables[allowFallbackPos - 1]!;
      const altCmp = compareRhyme(sa, alt, { requireSameToneGroup: expectedTone !== null });
      const altTone = expectedTone === null || (sa.group === expectedTone && alt.group === expectedTone);
      if (altCmp.ok && altTone) {
        sb = alt;
        usedPos = allowFallbackPos;
        cmp = altCmp;
        toneOk = altTone;
        noteSuffix = " (biến thể tiếng 4)";
      }
    }

    const ok = cmp.ok && toneOk;
    const kind = ok ? cmp.kind : "lech";
    const note = ok
      ? `${label}: “${sa.clean}” – “${sb.clean}” (${kind === "chinh" ? "vần chính" : "vần thông"}${noteSuffix})`
      : `${label}: “${sa.clean}” (${sa.rime}/${sa.group}) chưa hiệp vần với “${sb.clean}” (${sb.rime}/${sb.group})`;

    rhymes.push({
      fromLine: fromLineIdx + 1,
      fromPos: fromPos1,
      fromWord: sa.clean,
      toLine: toLineIdx + 1,
      toPos: usedPos,
      toWord: sb.clean,
      kind,
      ok,
      note,
    });
    details.push({
      ok,
      label: `${label} (c.${fromLineIdx + 1}→c.${toLineIdx + 1})`,
      expected: expectedTone ? `hiệp vần ${expectedTone === "B" ? "bằng" : "trắc"}` : "hiệp vần",
      measured: `${sa.clean} – ${sb.clean}`,
    });
  };

  if (form === "luc_bat") {
    const evenOk = lines.length >= 2 && lines.length % 2 === 0;
    details.push({
      ok: evenOk,
      label: "Số dòng lục bát (chẵn, ≥ 2)",
      expected: "số dòng chẵn ≥ 2",
      measured: `${lines.length} dòng`,
    });
    lines.forEach((l, i) => {
      l.expectedCount = i % 2 === 0 ? 6 : 8;
      details.push({
        ok: l.count === l.expectedCount,
        label: `Số tiếng dòng ${l.lineNumber} (${i % 2 === 0 ? "lục" : "bát"})`,
        expected: `${l.expectedCount} tiếng`,
        measured: `${l.count} tiếng`,
      });
    });
    for (let i = 0; i + 1 < lines.length; i += 2) {
      checkPair(i, 6, i + 1, 6, "B", "Vần lưng 6–6", 4);
      if (i + 2 < lines.length) {
        checkPair(i + 1, 8, i + 2, 6, "B", "Vần chân 8–6");
      }
    }
  } else if (form === "song_that_luc_bat") {
    const quadOk = lines.length >= 4 && lines.length % 4 === 0;
    details.push({
      ok: quadOk,
      label: "Số dòng song thất lục bát (bội của 4)",
      expected: "bội của 4 dòng",
      measured: `${lines.length} dòng`,
    });
    const pat = [7, 7, 6, 8];
    lines.forEach((l, i) => {
      l.expectedCount = pat[i % 4];
      details.push({
        ok: l.count === l.expectedCount,
        label: `Số tiếng dòng ${l.lineNumber}`,
        expected: `${l.expectedCount} tiếng`,
        measured: `${l.count} tiếng`,
      });
    });
    for (let i = 0; i + 3 < lines.length; i += 4) {
      checkPair(i, 7, i + 1, 5, "T", "Vần trắc thất 1–thất 2");
      checkPair(i + 1, 7, i + 2, 6, "B", "Vần bằng thất 2–lục");
      checkPair(i + 2, 6, i + 3, 6, "B", "Vần lưng lục–bát", 4);
      if (i + 4 < lines.length) {
        checkPair(i + 3, 8, i + 4, 5, "B", "Vần nối khổ bát–thất 1");
      }
    }
  } else if (form === "that_ngon_tu_tuyet" || form === "that_ngon_bat_cu") {
    const needLines = form === "that_ngon_tu_tuyet" ? 4 : 8;
    details.push({
      ok: lines.length === needLines,
      label: `Số dòng ${formLabel}`,
      expected: `${needLines} dòng`,
      measured: `${lines.length} dòng`,
    });
    lines.forEach((l) => {
      l.expectedCount = 7;
      details.push({
        ok: l.count === 7,
        label: `Số tiếng dòng ${l.lineNumber}`,
        expected: "7 tiếng",
        measured: `${l.count} tiếng`,
      });
    });
    const evenIndices = form === "that_ngon_tu_tuyet" ? [1, 3] : [1, 3, 5, 7];
    for (let k = 0; k + 1 < evenIndices.length; k++) {
      const a = evenIndices[k]!;
      const b = evenIndices[k + 1]!;
      if (a < lines.length && b < lines.length) {
        checkPair(a, 7, b, 7, "B", `Độc vận bằng câu ${a + 1}–${b + 1}`);
      }
    }
  } else if (form === "ngu_ngon") {
    lines.forEach((l) => {
      l.expectedCount = 5;
      details.push({
        ok: l.count === 5,
        label: `Số tiếng dòng ${l.lineNumber}`,
        expected: "5 tiếng",
        measured: `${l.count} tiếng`,
      });
    });
    // Kiểm vần linh hoạt trong mỗi khổ 4 dòng (aabb, abab, abcb, abba)
    for (let i = 0; i + 3 < lines.length; i += 4) {
      const end = (idx: number) => lines[idx]?.syllables[lines[idx]!.count - 1];
      const e0 = end(i), e1 = end(i + 1), e2 = end(i + 2), e3 = end(i + 3);
      if (e0 && e1 && e2 && e3) {
        const p13 = compareRhyme(e1, e3, { requireSameToneGroup: false });
        const p02 = compareRhyme(e0, e2, { requireSameToneGroup: false });
        const p01 = compareRhyme(e0, e1, { requireSameToneGroup: false });
        const p23 = compareRhyme(e2, e3, { requireSameToneGroup: false });
        const p03 = compareRhyme(e0, e3, { requireSameToneGroup: false });
        const p12 = compareRhyme(e1, e2, { requireSameToneGroup: false });
        const anyRhyme = p13.ok || (p01.ok && p23.ok) || (p03.ok && p12.ok) || p02.ok;
        details.push({
          ok: anyRhyme,
          label: `Gieo vần khổ ${Math.floor(i / 4) + 1} (dòng ${i + 1}–${i + 4})`,
          expected: "vần chân (aabb/abab/abcb/abba)",
          measured: `${e0.clean} / ${e1.clean} / ${e2.clean} / ${e3.clean}`,
        });
      }
    }
  } else {
    // Thơ tự do: kiểm độ dài biến thiên, ghi nhận hồ sơ số tiếng
    const uniqueCounts = new Set(lines.map((l) => l.count));
    details.push({
      ok: true,
      label: "Hồ sơ thơ tự do",
      expected: "nhịp linh hoạt",
      measured: `${lines.length} dòng (${lines.map((l) => l.count).join("–")} tiếng; ${uniqueCounts.size} độ dài)`,
    });
  }

  const hasFail = details.some((d) => d.ok === false);
  const status: Verification["status"] = hasFail ? "mismatch" : "verified";
  const badge = hasFail ? "Lệch luật" : "Đã kiểm";
  const passCount = details.filter((d) => d.ok === true).length;
  const failCount = details.filter((d) => d.ok === false).length;
  const summary = hasFail
    ? `${formLabel}: phát hiện ${failCount}/${details.length} mục lệch luật âm tiết hoặc vần.`
    : `${formLabel}: đạt ${passCount}/${details.length} tiêu chí âm tiết & vần.`;

  return {
    form,
    formLabel,
    badge,
    verification: { status, details: details.slice(0, 40) },
    lines,
    rhymes,
    summary,
  };
}
