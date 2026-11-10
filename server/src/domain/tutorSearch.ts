// Port từ DeepTutor deeptutor/services/rag (chia đoạn SentenceSplitter 512/50, truy hồi) và
// deeptutor/services/rag/source_pages.py (Apache-2.0), đã sửa: viết lại bằng TypeScript,
// bỏ embedding, thay bằng BM25 thuần cho tiếng Việt (NFC + bỏ dấu cho chỉ mục phụ).
// Thuần, không I/O.

/** Bỏ dấu tiếng Việt, hạ chữ thường. */
export function foldVi(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();
}

const STOP = new Set(
  "la va cua the nao gi co khong cac nhung cho duoc trong voi de khi thi ma nay do em hay hoac se da nhu o tu den theo ve cung rat nen vi sao bao nhieu".split(" "),
);

const WORD = /[\p{L}\p{N}]+/gu;

/** Token cho chỉ mục: âm tiết không dấu + cặp âm tiết liền kề + âm tiết có dấu (tiền tố "~", phân biệt "má"/"ma"). */
export function tokenize(text: string): string[] {
  const words = (text.normalize("NFC").toLowerCase().match(WORD) ?? []) as string[];
  const out: string[] = [];
  let prev: string | null = null;
  for (const w of words) {
    const f = foldVi(w);
    if (STOP.has(f)) {
      prev = null;
      continue;
    }
    out.push(f);
    if (f !== w) out.push(`~${w}`);
    if (prev) out.push(`${prev}_${f}`);
    prev = f;
  }
  return out;
}

export type Chunk = { page: number; idx: number; text: string };

/** Chia chữ theo trang thành đoạn ~size ký tự, gói theo đoạn văn, nối đuôi `overlap` ký tự khi phải cắt cứng. */
export function chunkPages(pages: string[], opts: { size?: number; overlap?: number } = {}): Chunk[] {
  const size = opts.size ?? 700;
  const overlap = opts.overlap ?? 80;
  const out: Chunk[] = [];
  let idx = 0;
  pages.forEach((raw, i) => {
    const page = i + 1;
    const paras = raw
      .normalize("NFC")
      .split(/\n{2,}|\r\n{2,}/)
      .map((p) => p.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
    let buf = "";
    const flush = () => {
      const t = buf.trim();
      if (t.length >= 12) out.push({ page, idx: idx++, text: t });
      buf = "";
    };
    for (const p of paras) {
      if (p.length > size) {
        flush();
        let start = 0;
        while (start < p.length) {
          let end = Math.min(p.length, start + size);
          if (end < p.length) {
            const cut = Math.max(p.lastIndexOf(". ", end), p.lastIndexOf("; ", end), p.lastIndexOf(", ", end));
            if (cut > start + size * 0.5) end = cut + 1;
          }
          buf = p.slice(start, end);
          flush();
          if (end >= p.length) break;
          start = Math.max(start + 1, end - overlap);
        }
      } else if (buf.length + p.length + 1 > size) {
        flush();
        buf = p;
      } else {
        buf = buf ? `${buf}\n${p}` : p;
      }
    }
    flush();
  });
  return out;
}

export type SearchHit<T> = { item: T; score: number };

/** BM25 (k1=1.5, b=0.75) trên chỉ mục ngược; dựng một lần, tìm vài mili-giây với hàng nghìn đoạn. */
export class Bm25<T extends { text: string }> {
  private readonly postings = new Map<string, [number, number][]>();
  private readonly lens: number[] = [];
  private readonly avg: number;
  constructor(readonly items: T[], private readonly k1 = 1.5, private readonly b = 0.75) {
    let total = 0;
    items.forEach((it, di) => {
      const tf = new Map<string, number>();
      const toks = tokenize(it.text);
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      this.lens.push(toks.length);
      total += toks.length;
      for (const [t, n] of tf) {
        const list = this.postings.get(t);
        if (list) list.push([di, n]);
        else this.postings.set(t, [[di, n]]);
      }
    });
    this.avg = items.length ? total / items.length : 0;
  }
  get size(): number {
    return this.items.length;
  }
  search(query: string, k = 5): SearchHit<T>[] {
    const N = this.items.length;
    if (!N) return [];
    const scores = new Map<number, number>();
    for (const t of new Set(tokenize(query))) {
      const list = this.postings.get(t);
      if (!list) continue;
      const idf = Math.log(1 + (N - list.length + 0.5) / (list.length + 0.5));
      // Cặp âm tiết và âm tiết có dấu đặc hiệu hơn → nhỉnh hơn một chút.
      const w = t.includes("_") ? 1.4 : t.startsWith("~") ? 1.15 : 1;
      for (const [di, n] of list) {
        const norm = n * (this.k1 + 1) / (n + this.k1 * (1 - this.b + (this.b * this.lens[di]!) / (this.avg || 1)));
        scores.set(di, (scores.get(di) ?? 0) + w * idf * norm);
      }
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([di, score]) => ({ item: this.items[di]!, score }));
  }
}

/** Các số trích dẫn [n] có trong câu trả lời, theo thứ tự xuất hiện. */
export function citedNumbers(text: string): number[] {
  const seen: number[] = [];
  for (const m of text.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen;
}
