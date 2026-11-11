import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { isAbort } from "./http";
import { subscribeOnline, isOnline } from "./online";

export type Fetcher<T> = (signal: AbortSignal) => Promise<T>;
export type QueryState<T> = {
  data: T | undefined;
  error: unknown;
  /** Chưa có dữ liệu và đang tải → skeleton. */
  loading: boolean;
  /** Có dữ liệu cũ, đang làm tươi nền → UI mờ nhẹ. */
  stale: boolean;
  fetching: boolean;
  updatedAt: number;
};
type Entry = {
  data?: unknown;
  error?: unknown;
  ts: number;
  promise?: Promise<unknown>;
  ctrl?: AbortController;
  fetcher?: Fetcher<unknown>;
  staleMs: number;
  subs: Set<() => void>;
  snap: QueryState<unknown>;
};

export const STALE_MS = 30_000;
const cache = new Map<string, Entry>();
let clock: () => number = () => Date.now();
/** Chỉ dùng trong test. */
export const _setClock = (f: () => number) => (clock = f);
export function _resetCache(): void {
  for (const e of cache.values()) e.ctrl?.abort();
  cache.clear();
}

function entry(key: string): Entry {
  let e = cache.get(key);
  if (!e) {
    e = { ts: 0, staleMs: STALE_MS, subs: new Set(), snap: snapOf({ ts: 0 } as Entry) };
    cache.set(key, e);
  }
  return e;
}
function snapOf(e: Entry): QueryState<unknown> {
  const fetching = !!e.promise;
  return { data: e.data, error: e.error, loading: fetching && e.data === undefined, stale: fetching && e.data !== undefined, fetching, updatedAt: e.ts };
}
function notify(e: Entry) {
  e.snap = snapOf(e);
  e.subs.forEach((f) => f());
}

function run<T>(key: string, e: Entry): Promise<T> {
  if (e.promise) return e.promise as Promise<T>;
  const fetcher = e.fetcher;
  if (!fetcher) return Promise.reject(new Error(`query "${key}" chưa có fetcher`));
  const ctrl = new AbortController();
  const p = fetcher(ctrl.signal).then(
    (data) => {
      if (e.promise !== p) return data;
      Object.assign(e, { data, error: undefined, ts: clock(), promise: undefined, ctrl: undefined });
      notify(e);
      return data;
    },
    (err: unknown) => {
      if (e.promise === p) {
        e.promise = undefined;
        e.ctrl = undefined;
        if (!isAbort(err)) e.error = err;
        notify(e);
      }
      throw err;
    },
  );
  e.promise = p;
  e.ctrl = ctrl;
  notify(e);
  return p as Promise<T>;
}

/**
 * Lấy dữ liệu theo key: đang bay → dùng chung promise; có dữ liệu còn tươi → trả ngay;
 * có dữ liệu cũ (quá staleMs) → trả ngay + làm tươi nền; chưa có → tải.
 */
export function query<T>(key: string, fetcher?: Fetcher<T>, opts: { staleMs?: number; force?: boolean } = {}): Promise<T> {
  const e = entry(key);
  if (fetcher) e.fetcher = fetcher as Fetcher<unknown>;
  if (opts.staleMs !== undefined) e.staleMs = opts.staleMs;
  const fresh = e.data !== undefined && clock() - e.ts < e.staleMs;
  if (e.data !== undefined && !opts.force) {
    if (!fresh) run(key, e).catch(() => undefined);
    return Promise.resolve(e.data as T);
  }
  return run<T>(key, e);
}

/** Tải trước (rê chuột/tiêu điểm vào link): không ném lỗi, không tải lại nếu còn tươi. */
export function prefetch<T>(key: string, fetcher?: Fetcher<T>): Promise<void> {
  return query(key, fetcher).then(
    () => undefined,
    () => undefined,
  );
}

/** Đánh dấu cũ mọi key bắt đầu bằng prefix; key đang có người xem thì tải lại ngay. */
export function invalidate(prefix: string): void {
  for (const [key, e] of cache) {
    if (!key.startsWith(prefix)) continue;
    e.ts = 0;
    if (e.subs.size && e.fetcher) {
      e.ctrl?.abort();
      e.promise = undefined;
      run(key, e).catch(() => undefined);
    }
  }
}

/** Ghi đè dữ liệu (cập nhật lạc quan); trả hàm hoàn tác. */
export function setQueryData<T>(key: string, update: T | ((old: T | undefined) => T)): () => void {
  const e = entry(key);
  const prev = { data: e.data, ts: e.ts };
  e.data = typeof update === "function" ? (update as (o: T | undefined) => T)(e.data as T | undefined) : update;
  e.ts = clock();
  notify(e);
  return () => {
    Object.assign(e, prev);
    notify(e);
  };
}

export const getQueryState = <T>(key: string): QueryState<T> => entry(key).snap as QueryState<T>;

export function subscribeQuery(key: string, cb: () => void): () => void {
  const e = entry(key);
  e.subs.add(cb);
  return () => {
    e.subs.delete(cb);
    // Rời màn: không còn ai xem và chưa có dữ liệu → huỷ request.
    if (!e.subs.size && e.promise && e.data === undefined) {
      e.ctrl?.abort();
      e.promise = undefined;
      e.ctrl = undefined;
      notify(e);
    }
  };
}

/** Làm tươi các key đang được xem và đã cũ (khi tab lấy lại tiêu điểm / có mạng lại). */
export function refreshStale(): void {
  for (const [key, e] of cache) if (e.subs.size && e.fetcher && clock() - e.ts >= e.staleMs) run(key, e).catch(() => undefined);
}

let bound = false;
function bindRefresh() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("focus", refreshStale);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refreshStale());
  let wasOnline = isOnline();
  subscribeOnline(() => {
    const now = isOnline();
    if (now && !wasOnline) refreshStale();
    wasOnline = now;
  });
}

const EMPTY: QueryState<never> = { data: undefined, error: undefined, loading: false, stale: false, fetching: false, updatedAt: 0 };

/** key = null → tạm không tải (phụ thuộc dữ liệu khác). */
export function useQuery<T>(key: string | null, fetcher: Fetcher<T>, opts: { staleMs?: number } = {}): QueryState<T> & { refetch: () => Promise<T | undefined> } {
  const f = useRef(fetcher);
  f.current = fetcher;
  const sub = useCallback((cb: () => void) => (key ? subscribeQuery(key, cb) : () => undefined), [key]);
  const get = useCallback(() => (key ? getQueryState<T>(key) : (EMPTY as QueryState<T>)), [key]);
  const state = useSyncExternalStore(sub, get, get);
  useEffect(() => {
    bindRefresh();
    if (key) query<T>(key, (s) => f.current(s), opts).catch(() => undefined);
  }, [key, opts.staleMs]); // eslint-disable-line react-hooks/exhaustive-deps
  const refetch = useCallback(() => (key ? query<T>(key, (s) => f.current(s), { force: true }).catch(() => undefined) : Promise.resolve(undefined)), [key]);
  return { ...state, refetch };
}
