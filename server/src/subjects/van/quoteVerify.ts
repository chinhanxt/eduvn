/**
 * Tự kiểm tất định trích dẫn văn học so với văn bản nguồn do GV tải lên.
 * Thuần, không I/O. Quy tắc bất biến: không có văn bản nguồn → luôn trả "Chưa kiểm" ("unchecked"),
 * tuyệt đối không để AI tự chấm trích dẫn của chính mình.
 */
import type { Verification } from "../../domain/solution";

export type QuoteMatchKind = "exact" | "minor_punct" | "mismatch" | "unchecked";

export type QuoteCheckItem = {
  quote: string;
  matchKind: QuoteMatchKind;
  ok: boolean | null;
  sourceLine?: number;
  matchedExcerpt?: string;
  diffHint?: string;
};

export type QuoteVerificationResult = {
  badge: "Đã kiểm" | "Lệch trích dẫn" | "Chưa kiểm";
  verification: Verification;
  hasSource: boolean;
  items: QuoteCheckItem[];
  summary: string;
};

/** Chuẩn hoá khoảng trắng, dấu ngoặc kép thông minh và Unicode NFC (giữ nguyên mọi dấu tiếng Việt). */
function normWhitespace(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chuẩn hoá sâu hơn: bỏ dấu câu và hạ chữ thường, NHƯNG giữ nguyên toàn bộ chữ và dấu thanh tiếng Việt. */
function tokenizeWords(s: string): { word: string; start: number; end: number }[] {
  const nfc = s.normalize("NFC");
  const out: { word: string; start: number; end: number }[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(nfc)) !== null) {
    out.push({ word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function lineOfOffset(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
}

/** Tìm cửa sổ từ giống nhất trong văn bản nguồn để chỉ rõ vị trí sai khác cho GV/HS. */
function findClosestWindow(
  quoteWords: string[],
  sourceTokens: { word: string; start: number; end: number }[],
  source: string,
): { excerpt: string; line: number; overlap: number } | null {
  if (!quoteWords.length || !sourceTokens.length) return null;
  const qSet = new Set(quoteWords);
  const winSize = Math.min(sourceTokens.length, Math.max(quoteWords.length, 3));
  let bestScore = 0;
  let bestStart = 0;

  for (let i = 0; i <= sourceTokens.length - winSize; i++) {
    let hit = 0;
    for (let j = 0; j < winSize; j++) {
      if (qSet.has(sourceTokens[i + j]!.word)) hit++;
    }
    if (hit > bestScore) {
      bestScore = hit;
      bestStart = i;
    }
  }
  const overlap = bestScore / Math.max(1, quoteWords.length);
  if (overlap < 0.4) return null;
  const first = sourceTokens[bestStart]!;
  const last = sourceTokens[bestStart + winSize - 1]!;
  return {
    excerpt: source.slice(first.start, last.end),
    line: lineOfOffset(source, first.start),
    overlap,
  };
}

/** Đối chiếu một trích dẫn với văn bản nguồn (hỗ trợ cắt đoạn bằng dấu "..." hoặc "…"). */
export function verifySingleQuote(
  rawQuote: string,
  sourceText: string | null | undefined,
  opts: { strictPunctuation?: boolean } = {},
): QuoteCheckItem {
  const quote = rawQuote.normalize("NFC").trim().replace(/^[“"«]+|[”"»]+$/g, "").trim();
  if (!sourceText || !sourceText.trim()) {
    return {
      quote,
      matchKind: "unchecked",
      ok: null,
      diffHint: "Chưa có văn bản nguồn GV tải lên",
    };
  }
  const srcNfc = sourceText.normalize("NFC");
  const segments = quote
    .split(/\s*(?:\.{3}|…)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return { quote, matchKind: "unchecked", ok: null, diffHint: "Trích dẫn trống" };
  }

  const normSrc = normWhitespace(srcNfc);
  const srcTokens = tokenizeWords(srcNfc);

  let allExact = true;
  let allWordsMatch = true;
  let firstLine: number | undefined;
  let firstMatched: string | undefined;
  let cursorWordIdx = 0;

  for (const seg of segments) {
    const normSeg = normWhitespace(seg);
    const exactIdx = normSrc.indexOf(normSeg);
    if (exactIdx !== -1) {
      if (firstLine === undefined) {
        // ước lượng dòng từ bản gốc bằng từ đầu tiên
        const segTokens = tokenizeWords(seg);
        if (segTokens.length) {
          const hitIdx = findExactTokenSequence(srcTokens, segTokens.map((t) => t.word), cursorWordIdx);
          if (hitIdx !== -1) {
            firstLine = lineOfOffset(srcNfc, srcTokens[hitIdx]!.start);
            cursorWordIdx = hitIdx + segTokens.length;
          }
        }
        firstMatched = normSeg;
      }
      continue;
    }

    allExact = false;
    const segWords = tokenizeWords(seg).map((t) => t.word);
    const hitIdx = findExactTokenSequence(srcTokens, segWords, cursorWordIdx);
    if (hitIdx !== -1) {
      const startOff = srcTokens[hitIdx]!.start;
      const endOff = srcTokens[hitIdx + segWords.length - 1]!.end;
      if (firstLine === undefined) {
        firstLine = lineOfOffset(srcNfc, startOff);
        firstMatched = srcNfc.slice(startOff, endOff);
      }
      cursorWordIdx = hitIdx + segWords.length;
    } else {
      allWordsMatch = false;
      const closest = findClosestWindow(segWords, srcTokens, srcNfc);
      return {
        quote,
        matchKind: "mismatch",
        ok: false,
        sourceLine: closest?.line,
        matchedExcerpt: closest?.excerpt,
        diffHint: closest
          ? `Không khớp nguyên văn (gần nhất ở dòng ${closest.line}: “${closest.excerpt}”)`
          : "Không tìm thấy đoạn trích này trong văn bản nguồn",
      };
    }
  }

  if (allExact) {
    return {
      quote,
      matchKind: "exact",
      ok: true,
      sourceLine: firstLine,
      matchedExcerpt: firstMatched,
    };
  }
  if (allWordsMatch) {
    const ok = !opts.strictPunctuation;
    return {
      quote,
      matchKind: ok ? "minor_punct" : "mismatch",
      ok,
      sourceLine: firstLine,
      matchedExcerpt: firstMatched,
      diffHint: ok
        ? "Khớp từng chữ (chỉ khác nhẹ chữ hoa hoặc dấu câu)"
        : `Lệch dấu câu/chữ hoa so với nguyên văn: “${firstMatched}”`,
    };
  }
  return { quote, matchKind: "mismatch", ok: false, diffHint: "Không khớp nguyên văn" };
}

function findExactTokenSequence(
  src: { word: string }[],
  needle: string[],
  startFrom: number,
): number {
  if (!needle.length || needle.length > src.length) return -1;
  for (let i = Math.max(0, startFrom); i <= src.length - needle.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (src[i + j]!.word !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

/** Rút mọi trích dẫn đặt trong ngoặc kép (“…”, "…", «…») từ bài văn hoặc lời giải. */
export function extractQuotesFromText(text: string, minWords = 2): string[] {
  const nfc = text.normalize("NFC");
  const out: string[] = [];
  const re = /(?:“([^”\n]{2,400})”|"([^"\n]{2,400})"|«([^»\n]{2,400})»)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(nfc)) !== null) {
    const q = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (tokenizeWords(q).length >= minWords) out.push(q);
  }
  return out;
}

/** Tự kiểm danh sách trích dẫn đối chiếu với văn bản nguồn GV tải lên. */
export function verifyQuotes(
  quotes: readonly string[],
  sourceText: string | null | undefined,
  opts: { strictPunctuation?: boolean } = {},
): QuoteVerificationResult {
  const hasSource = Boolean(sourceText && sourceText.trim());
  const cleanQuotes = quotes.map((q) => q.trim()).filter(Boolean);

  if (!hasSource) {
    return {
      badge: "Chưa kiểm",
      hasSource: false,
      items: cleanQuotes.map((q) => ({ quote: q, matchKind: "unchecked", ok: null, diffHint: "Chưa có văn bản nguồn GV tải lên" })),
      verification: {
        status: "unchecked",
        details: [
          {
            ok: null,
            label: "Chưa có văn bản nguồn do giáo viên tải lên — không thể đối chiếu nguyên văn",
          },
        ],
      },
      summary: "Chưa kiểm: chưa có văn bản nguồn GV tải lên.",
    };
  }

  if (cleanQuotes.length === 0) {
    return {
      badge: "Chưa kiểm",
      hasSource: true,
      items: [],
      verification: { status: "unchecked", details: [{ ok: null, label: "Không có trích dẫn nào cần kiểm" }] },
      summary: "Chưa có trích dẫn để kiểm.",
    };
  }

  const items = cleanQuotes.map((q) => verifySingleQuote(q, sourceText, opts));
  const failCount = items.filter((it) => it.ok === false).length;
  const okCount = items.filter((it) => it.ok === true).length;

  const details: Verification["details"] = items.slice(0, 40).map((it, i) => ({
    ok: it.ok,
    label: `Trích dẫn ${i + 1}: “${it.quote.slice(0, 60)}${it.quote.length > 60 ? "…" : ""}”`,
    expected: it.matchedExcerpt?.slice(0, 120),
    measured: it.diffHint?.slice(0, 120) ?? (it.sourceLine ? `Khớp dòng ${it.sourceLine}` : "Khớp nguyên văn"),
  }));

  if (failCount > 0) {
    return {
      badge: "Lệch trích dẫn",
      hasSource: true,
      items,
      verification: { status: "mismatch", details },
      summary: `Phát hiện ${failCount}/${items.length} trích dẫn chưa khớp nguyên văn văn bản nguồn.`,
    };
  }
  return {
    badge: "Đã kiểm",
    hasSource: true,
    items,
    verification: { status: "verified", details },
    summary: `Đã kiểm nguyên văn: ${okCount}/${items.length} trích dẫn khớp văn bản nguồn.`,
  };
}

/** Rút trích dẫn trong văn bản (bài làm/lời giải) và đối chiếu trực tiếp với văn bản nguồn. */
export function verifyQuotesInText(
  bodyText: string,
  sourceText: string | null | undefined,
  opts: { strictPunctuation?: boolean; minWords?: number } = {},
): QuoteVerificationResult {
  const quotes = extractQuotesFromText(bodyText, opts.minWords ?? 2);
  return verifyQuotes(quotes, sourceText, opts);
}
