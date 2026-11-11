// Bộ phụ trợ chung cho các màn cổng GV (skin B): gọi API qua lớp dữ liệu v2, lọc/sắp/trang trên URL,
// ô tìm "/", khung soạn mở trong trang, chạy thao tác có toast. CSS các màn: ./gv.css (tải cùng màn, không vào JS lần đầu).
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import { ApiError } from "../../apiCore";
import { Icon } from "../../ui/Icon";
import { IconButton } from "../../ui/components/Button";
import { fold } from "../../ui/components/focus";
import type { RegionStatus } from "../../ui/components/States";
import { type ToastInput, useToast } from "../../ui/components/Toast";
import { isNetworkError, request } from "../../ui/data/http";
import { newIdempotencyKey } from "../../ui/data/action";
import type { Fetcher, QueryState } from "../../ui/data/query";
import { useUrlState, writeParam } from "../../ui/data/urlState";
import "./gv.css";

export { fold };

/** GET có huỷ khi rời màn: `useQuery("gv/lop", get("/api/classes"))`. */
export const get =
  <T,>(path: string): Fetcher<T> =>
  (signal) =>
    request<T>(path, { signal });

/** Danh sách đề (dùng chung: Đề thi, Chấm bài, Giao bài, Trò chơi). */
export const EXAMS_KEY = "gv/de-thi";
export const fetchExams = get<import("../../api").ExamSummary[]>("/api/exams");

/** POST tạo mới: mỗi lần bấm một Idempotency-Key (nút đã khoá theo promise nên không gửi lặp). */
export const post = <T,>(path: string, body: unknown = {}, key: string = newIdempotencyKey()) => request<T>(path, { method: "POST", body, idempotencyKey: key });
export const put = <T,>(path: string, body: unknown) => request<T>(path, { method: "PUT", body });
export const patch = <T,>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body });
export const del = <T,>(path: string) => request<T>(path, { method: "DELETE" });

/** Câu lỗi cho toast/hộp lỗi: danh sách lỗi nhập liệu → nhiều dòng; mất mạng → nói rõ. */
export function msgOf(e: unknown): string {
  if (isNetworkError(e)) return "Mất kết nối — kiểm tra mạng rồi thử lại.";
  if (e instanceof ApiError) {
    const issues = (e.body as { issues?: unknown[] } | null)?.issues;
    if (issues?.length && typeof issues[0] === "string") return issues.join("\n");
    if (e.status === 401) return "Hết phiên đăng nhập — đăng nhập lại.";
    if (e.status === 403) return "Tài khoản không có quyền làm việc này.";
    return e.message;
  }
  return e instanceof Error ? e.message : "Có lỗi, thử lại sau.";
}

/** Trạng thái vùng (Region/Table) từ một query: lỗi khi chưa có dữ liệu → loi; đang tải → dang-tai; rỗng → trong. */
export function statusOf<T>(q: Pick<QueryState<T>, "data" | "error">, empty?: (d: T) => boolean): RegionStatus {
  if (q.data === undefined) return q.error ? "loi" : "dang-tai";
  return empty?.(q.data) ? "trong" : "ok";
}
export const errorOf = (e: unknown) => ({ status: e instanceof ApiError ? e.status : undefined, text: e ? msgOf(e) : undefined });

const pad = (n: number) => String(n).padStart(2, "0");
/** 09/11/2026 */
export const dateVi = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
/** 9/11, 14:05 */
export const whenVi = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** Số kiểu Việt: 7,25 */
export const vnNum = (n: number | null | undefined, digits = 2): string => (n === null || n === undefined ? "—" : n.toLocaleString("vi-VN", { maximumFractionDigits: digits }));
export const gradeVi = (g: number | null | undefined): string => (g == null ? "" : g <= 12 ? `Lớp ${g}` : `Năm ${g - 12}`);
export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

/** Chạy thao tác + toast: trả promise để Button tự khoá; lỗi → toast lỗi (không ném tiếp, nút mở khoá). */
export function useRun() {
  const toast = useToast();
  return useCallback(
    async <R,>(fn: () => Promise<R>, ok?: string | ToastInput | ((r: R) => string | ToastInput | null)): Promise<R | undefined> => {
      try {
        const r = await fn();
        const t = typeof ok === "function" ? ok(r) : ok;
        if (t) toast(typeof t === "string" ? { title: t, kind: "ok" } : { kind: "ok", ...t });
        return r;
      } catch (e) {
        toast({ title: "Chưa làm được", msg: msgOf(e), kind: "err", life: 6000 });
        return undefined;
      }
    },
    [toast],
  );
}

type Sorter<T> = (r: T) => string | number | null | undefined;
const cmp = (a: string | number | null | undefined, b: string | number | null | undefined) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "vi", { numeric: true });
};

/** Lọc (ô tìm ?q=, bỏ dấu) · sắp (?sap=ten | -ten) · trang (?trang=) phía máy khách — mọi trạng thái nằm trên URL. */
export function useListView<T>(rows: readonly T[] | undefined, opt: { text: (r: T) => string; sorts?: Record<string, Sorter<T>>; defSort?: string; pageSize?: number; filter?: (r: T) => boolean; prefix?: string }) {
  const k = (s: string) => (opt.prefix ? `${opt.prefix}-${s}` : s);
  const [q, setQ] = useUrlState<string>(k("q"), "");
  const [sort, setSort] = useUrlState<string>(k("sap"), opt.defSort ?? "");
  const [page, setPage] = useUrlState<number>(k("trang"), 1);
  const [params] = useSearchParams();
  const size = opt.pageSize ?? 20;
  const { text, sorts, filter } = opt;
  const all = useMemo(() => {
    if (!rows) return [];
    const needle = fold(q.trim());
    let xs = rows.filter((r) => (!filter || filter(r)) && (!needle || fold(text(r)).includes(needle)));
    const key = sort.replace(/^-/, "");
    const by = sorts?.[key];
    if (by) {
      const dir = sort.startsWith("-") ? -1 : 1;
      xs = [...xs].sort((a, b) => dir * cmp(by(a), by(b)));
    }
    return xs;
  }, [rows, q, sort, sorts, filter, text]);
  const pages = Math.max(1, Math.ceil(all.length / size));
  const cur = Math.min(Math.max(1, page), pages);
  const shown = all.slice((cur - 1) * size, cur * size);
  const pageProp = all.length > size ? { page: cur, pageSize: size, total: all.length, onPage: setPage, href: (p: number) => `?${writeParam(params, k("trang"), p, 1).toString()}` } : undefined;
  return { q, setQ, sort: sort || null, setSort: (s: string | null) => setSort(s ?? ""), page: cur, setPage, rows: shown, all, total: all.length, pageProp };
}

/** Ô tìm trong thanh lọc; phím "/" đưa tiêu điểm vào ô. */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.ctrlKey || e.metaKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) || document.querySelector(".cmdk, .dialog")) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <label className="input-ic">
      <Icon name="search" size="sm" />
      <input ref={ref} className="input" type="search" placeholder={placeholder} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Escape" && value && (e.stopPropagation(), onChange(""))} />
    </label>
  );
}

/** Thanh lọc đầu khung danh sách. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="fbar" role="search">
      {children}
    </div>
  );
}

/** Khung soạn mở ngay trong trang (tạo lớp, thêm câu, AI soạn…): trượt vào nhẹ, Esc đóng. */
export function FormPane({ title, sub, onClose, children, footer, className, testId }: { title: ReactNode; sub?: ReactNode; onClose?: () => void; children: ReactNode; footer?: ReactNode; className?: string; testId?: string }) {
  return (
    <section
      className={["pane formpane", className].filter(Boolean).join(" ")}
      aria-label={typeof title === "string" ? title : undefined}
      data-testid={testId}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onClose && !(e.target as HTMLElement).closest(".dialog")) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="ghd">
        <span>{title}</span>
        {sub && <span className="n">{sub}</span>}
        <span className="grow" />
        {onClose && <IconButton icon="x" label="Đóng" size="sm" onClick={onClose} />}
      </div>
      <div className="fp-bd">{children}</div>
      {footer && <div className="fp-ft">{footer}</div>}
    </section>
  );
}

/** Mở/đóng khung soạn theo URL (?tao=1): nút "Tạo" là bước lịch sử, Back đóng khung. */
export function useOpenParam(key = "tao"): [boolean, (on: boolean) => void] {
  const [v, set] = useUrlState<string>(key, "", { mode: "push" });
  return [v === "1", (on: boolean) => set(on ? "1" : "")];
}

/** Mã (mã lớp, mã tham gia) + nút chép có toast. */
export function CodePill({ code, label, className }: { code: string; label: string; className?: string }) {
  const toast = useToast();
  return (
    <span className={["code-pill", className].filter(Boolean).join(" ")} title={label}>
      {code}
      <button
        type="button"
        aria-label={`Chép ${label.toLowerCase()}`}
        onClick={() => {
          void navigator.clipboard?.writeText(code).catch(() => undefined);
          toast({ title: `Đã chép ${label.toLowerCase()} ${code}`, kind: "ok" });
        }}
      >
        <Icon name="copy" size="sm" />
      </button>
    </span>
  );
}

/** Tải tệp từ link một lần (máy chủ trả { url }). */
export async function openLink(path: string, body: unknown = {}) {
  const r = await post<{ url: string }>(path, body);
  window.location.assign(r.url);
  return r;
}
