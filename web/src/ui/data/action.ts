import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { isNetworkError } from "./http";

export type ActionCtx = { idempotencyKey: string };
export type ActionState<R> = { pending: boolean; done: boolean; error: unknown; data: R | undefined };
export type Action<A extends unknown[], R> = {
  /** Đang chạy → trả lại đúng promise đang chạy (không gửi lần hai). */
  run: (...args: A) => Promise<R>;
  reset: () => void;
  get: () => ActionState<R>;
  subscribe: (cb: () => void) => () => void;
};

export const newIdempotencyKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/**
 * Bộ chạy thao tác ghi: khoá trong lúc chạy; mỗi lần bấm một Idempotency-Key mới,
 * riêng lần thử lại sau lỗi mạng với cùng tham số thì dùng lại khoá cũ (server trả kết quả lần đầu nếu đã chạy).
 */
export function createAction<A extends unknown[], R>(fn: (ctx: ActionCtx, ...args: A) => Promise<R>): Action<A, R> {
  let state: ActionState<R> = { pending: false, done: false, error: undefined, data: undefined };
  let current: Promise<R> | null = null;
  let retry: { sig: string; key: string } | null = null;
  const subs = new Set<() => void>();
  const set = (s: Partial<ActionState<R>>) => {
    state = { ...state, ...s };
    subs.forEach((f) => f());
  };
  const sigOf = (args: A) => {
    try {
      return JSON.stringify(args);
    } catch {
      return null;
    }
  };
  return {
    run(...args) {
      if (current) return current;
      const sig = sigOf(args);
      const key = retry && sig !== null && retry.sig === sig ? retry.key : newIdempotencyKey();
      retry = null;
      set({ pending: true, done: false, error: undefined });
      const p = fn({ idempotencyKey: key }, ...args).then(
        (data) => {
          current = null;
          set({ pending: false, done: true, data });
          return data;
        },
        (error: unknown) => {
          current = null;
          if (isNetworkError(error) && sig !== null) retry = { sig, key };
          set({ pending: false, error });
          throw error;
        },
      );
      current = p;
      return p;
    },
    reset: () => set({ pending: false, done: false, error: undefined, data: undefined }),
    get: () => state,
    subscribe(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
  };
}

/** Hook: `const save = useAction((ctx, body) => request("/api/x", { method: "POST", body, idempotencyKey: ctx.idempotencyKey }))`. */
export function useAction<A extends unknown[], R>(fn: (ctx: ActionCtx, ...args: A) => Promise<R>, opts: { doneMs?: number } = {}): ActionState<R> & { run: (...args: A) => Promise<R>; reset: () => void } {
  const f = useRef(fn);
  f.current = fn;
  const ref = useRef<Action<A, R> | null>(null);
  ref.current ??= createAction<A, R>((ctx, ...args) => f.current(ctx, ...args));
  const a = ref.current;
  const state = useSyncExternalStore(a.subscribe, a.get, a.get);
  const doneMs = opts.doneMs ?? 2000;
  useEffect(() => {
    if (!state.done || doneMs <= 0) return;
    const t = setTimeout(() => a.get().done && !a.get().pending && a.reset(), doneMs);
    return () => clearTimeout(t);
  }, [state.done, doneMs, a]);
  const run = useCallback((...args: A) => a.run(...args), [a]);
  return { ...state, run, reset: a.reset };
}
