// server/src/subjects/su/wikidata.ts — khách Wikidata có cache cục bộ và giới hạn tốc độ (dùng cho tự kiểm Lịch sử).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type WikidataRecord, normKey } from "./verify";

type FetchLike = typeof fetch;

export type WikidataClientOpts = {
  cachePath?: string;
  /** Khoảng cách tối thiểu giữa hai yêu cầu mạng tới Wikidata (ms). Mặc định 300 ms. */
  minIntervalMs?: number;
  /** Thời gian sống của mục cache (ms). Mặc định 7 ngày. */
  ttlMs?: number;
  /** Bỏ qua gọi mạng thật (chỉ đọc cache). */
  offline?: boolean;
  userAgent?: string;
  fetchImpl?: FetchLike;
  now?: () => number;
};

type CacheEntry<T> = { at: number; value: T };
type DiskCache = {
  entities: Record<string, CacheEntry<WikidataRecord | null>>;
  searches: Record<string, CacheEntry<string[]>>;
};

/** Phân tích chuỗi thời gian Wikidata ("+1954-03-13T00:00:00Z", "-0208-00-00T00:00:00Z") → năm nguyên. */
export function parseWikidataYear(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = /^([+-])(\d{1,6})-/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[2]);
  if (!Number.isFinite(y) || y === 0) return null;
  return m[1] === "-" ? -y : y;
}

function claimYears(claims: Record<string, unknown[]>, prop: string): number[] {
  const out: number[] = [];
  for (const item of claims[prop] ?? []) {
    const val = (item as { mainsnak?: { datavalue?: { value?: { time?: string } } } })?.mainsnak?.datavalue?.value?.time;
    const y = parseWikidataYear(val);
    if (y !== null) out.push(y);
  }
  return out;
}

function claimCoords(claims: Record<string, unknown[]>): { lat: number; lon: number } | undefined {
  for (const item of claims.P625 ?? []) {
    const val = (item as { mainsnak?: { datavalue?: { value?: { latitude?: number; longitude?: number } } } })?.mainsnak?.datavalue?.value;
    if (val && typeof val.latitude === "number" && typeof val.longitude === "number") {
      return { lat: Math.round(val.latitude * 100000) / 100000, lon: Math.round(val.longitude * 100000) / 100000 };
    }
  }
  return undefined;
}

/** Phân tích một đối tượng entity từ `wbgetentities` thành WikidataRecord chuẩn hoá. */
export function parseWikidataEntity(qid: string, raw: Record<string, unknown>): WikidataRecord | null {
  if (!raw || raw.missing !== undefined) return null;
  const labels = (raw.labels ?? {}) as Record<string, { value?: string }>;
  const descs = (raw.descriptions ?? {}) as Record<string, { value?: string }>;
  const claims = (raw.claims ?? {}) as Record<string, unknown[]>;
  const label = labels.vi?.value ?? labels.en?.value ?? qid;
  const description = descs.vi?.value ?? descs.en?.value;
  const p585 = claimYears(claims, "P585");
  const p580 = claimYears(claims, "P580");
  const p582 = claimYears(claims, "P582");
  const p571 = claimYears(claims, "P571");
  const p569 = claimYears(claims, "P569");
  const p570 = claimYears(claims, "P570");
  const years = [...new Set([...p585, ...p580, ...p582, ...p571])].sort((a, b) => a - b);
  return {
    qid,
    label,
    ...(description && { description }),
    url: `https://www.wikidata.org/wiki/${qid}`,
    years,
    ...(p580[0] !== undefined && { startYear: p580[0] }),
    ...(p582[0] !== undefined && { endYear: p582[0] }),
    ...(p569[0] !== undefined && { birthYear: p569[0] }),
    ...(p570[0] !== undefined && { deathYear: p570[0] }),
    ...(claimCoords(claims) && { coords: claimCoords(claims) }),
  };
}

export type WikidataClient = {
  getEntity(qid: string): Promise<WikidataRecord | null>;
  searchBest(query: string, lang?: "vi" | "en"): Promise<WikidataRecord | null>;
  /** Nạp trước bản ghi đã kiểm (từ hạt giống cục bộ hoặc test) vào cache bộ nhớ. */
  seed(records: readonly WikidataRecord[]): void;
  stats(): { networkCalls: number; cacheHits: number };
};

export function createWikidataClient(opts: WikidataClientOpts = {}): WikidataClient {
  const minIntervalMs = opts.minIntervalMs ?? 300;
  const ttlMs = opts.ttlMs ?? 7 * 86_400_000;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => Date.now());
  const ua = opts.userAgent ?? "EDUVN-HistoryVerifier/1.0 (https://github.com/chinhanxt/eduvn; educational)";

  const store: DiskCache = { entities: {}, searches: {} };
  if (opts.cachePath) {
    try {
      const parsed = JSON.parse(readFileSync(opts.cachePath, "utf8")) as Partial<DiskCache>;
      if (parsed.entities) Object.assign(store.entities, parsed.entities);
      if (parsed.searches) Object.assign(store.searches, parsed.searches);
    } catch {
      // chưa có tệp cache hoặc tệp hỏng → tạo mới khi ghi
    }
  }

  let networkCalls = 0;
  let cacheHits = 0;
  let lastCallAt = 0;
  let queue: Promise<void> = Promise.resolve();

  function persist() {
    if (!opts.cachePath) return;
    try {
      mkdirSync(path.dirname(opts.cachePath), { recursive: true });
      writeFileSync(opts.cachePath, JSON.stringify(store), "utf8");
    } catch {
      // không để lỗi ghi cache làm hỏng kiểm chứng
    }
  }

  async function apiGet(params: Record<string, string>): Promise<Record<string, unknown>> {
    // Xếp hàng tuần tự để bảo đảm tôn trọng giới hạn tốc độ minIntervalMs
    let release!: () => void;
    const wait = queue;
    queue = new Promise<void>((r) => {
      release = r;
    });
    await wait;
    try {
      const elapsed = now() - lastCallAt;
      if (lastCallAt > 0 && elapsed < minIntervalMs) {
        await new Promise((r) => setTimeout(r, minIntervalMs - elapsed));
      }
      lastCallAt = now();
      networkCalls += 1;
      const qs = new URLSearchParams({ ...params, format: "json" }).toString();
      const res = await fetchImpl(`https://www.wikidata.org/w/api.php?${qs}`, {
        headers: { "user-agent": ua, accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    } finally {
      release();
    }
  }

  function isFresh<T>(e: CacheEntry<T> | undefined): boolean {
    return Boolean(e && now() - e.at <= ttlMs);
  }

  async function getEntity(qid: string): Promise<WikidataRecord | null> {
    const clean = qid.trim().toUpperCase();
    if (!/^Q\d+$/.test(clean)) return null;
    const hit = store.entities[clean];
    if (hit && isFresh(hit)) {
      cacheHits += 1;
      return hit.value;
    }
    if (opts.offline) return hit?.value ?? null;
    try {
      const data = await apiGet({
        action: "wbgetentities",
        ids: clean,
        props: "claims|labels|descriptions",
        languages: "vi|en",
      });
      const entities = (data.entities ?? {}) as Record<string, Record<string, unknown>>;
      const rec = parseWikidataEntity(clean, entities[clean] ?? {});
      store.entities[clean] = { at: now(), value: rec };
      persist();
      return rec;
    } catch {
      return hit?.value ?? null;
    }
  }

  async function searchBest(query: string, lang: "vi" | "en" = "vi"): Promise<WikidataRecord | null> {
    const k = `${lang}:${normKey(query)}`;
    if (!query.trim()) return null;
    const cachedIds = store.searches[k];
    let qids: string[];
    if (cachedIds && isFresh(cachedIds)) {
      cacheHits += 1;
      qids = cachedIds.value;
    } else if (opts.offline) {
      qids = cachedIds?.value ?? [];
    } else {
      try {
        const data = await apiGet({
          action: "wbsearchentities",
          search: query.trim(),
          language: lang,
          limit: "3",
        });
        const items = (data.search ?? []) as { id?: string }[];
        qids = items.map((x) => x.id).filter((id): id is string => typeof id === "string" && /^Q\d+$/.test(id));
        store.searches[k] = { at: now(), value: qids };
        persist();
      } catch {
        qids = cachedIds?.value ?? [];
      }
    }
    for (const qid of qids) {
      const rec = await getEntity(qid);
      if (rec) return rec;
    }
    return null;
  }

  function seed(records: readonly WikidataRecord[]) {
    const at = now();
    for (const r of records) {
      store.entities[r.qid] = { at, value: r };
      store.searches[`vi:${normKey(r.label)}`] = { at, value: [r.qid] };
    }
  }

  return {
    getEntity,
    searchBest,
    seed,
    stats: () => ({ networkCalls, cacheHits }),
  };
}
