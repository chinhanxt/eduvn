import { useCallback } from "react";
import { useSearchParams } from "react-router";

/** Slug tiếng Việt không dấu: "Hàm số bậc hai" → "ham-so-bac-hai". */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type UrlValue = string | number | string[];
/** Trang/tab đổi → pushState (Back quay lại được); lọc/tìm → replaceState. */
export const PUSH_KEYS = new Set(["trang", "tab", "page"]);

export function readParam<T extends UrlValue>(params: URLSearchParams, key: string, def: T): T {
  const raw = params.get(key);
  if (raw === null || raw === "") return def;
  if (Array.isArray(def)) return raw.split(",").filter(Boolean) as T;
  if (typeof def === "number") {
    const n = Number(raw);
    return (Number.isFinite(n) ? n : def) as T;
  }
  return raw as T;
}

const same = (a: UrlValue, b: UrlValue) => (Array.isArray(a) && Array.isArray(b) ? a.join(",") === b.join(",") : a === b);

/** Trả URLSearchParams mới; giá trị bằng mặc định hoặc rỗng thì bỏ khỏi URL; đổi bộ lọc thì về trang 1. */
export function writeParam(params: URLSearchParams, key: string, value: UrlValue, def: UrlValue): URLSearchParams {
  const next = new URLSearchParams(params);
  const str = Array.isArray(value) ? value.join(",") : String(value);
  if (same(value, def) || str === "") next.delete(key);
  else next.set(key, str);
  if (!PUSH_KEYS.has(key)) next.delete("trang");
  return next;
}

export const historyMode = (key: string, force?: "push" | "replace"): "push" | "replace" => force ?? (PUSH_KEYS.has(key) ? "push" : "replace");

/** State đồng bộ với query string: `const [lop, setLop] = useUrlState("lop", "")`. */
export function useUrlState<T extends UrlValue>(key: string, def: T, opts: { mode?: "push" | "replace" } = {}): [T, (v: T) => void] {
  const [params, setParams] = useSearchParams();
  const value = readParam(params, key, def);
  const defSig = Array.isArray(def) ? def.join(",") : String(def);
  const set = useCallback(
    (v: T) => setParams((p) => writeParam(p, key, v, def), { replace: historyMode(key, opts.mode) === "replace" }),
    [key, defSig, opts.mode, setParams], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return [value, set];
}
