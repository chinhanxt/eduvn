import { type ReactNode, useEffect, useRef } from "react";
import { Icon } from "../Icon";
import { EmptyState, ErrorState, type RegionStatus } from "./States";
import { Skeleton } from "./Skeleton";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Số: căn phải + tabular. */
  numeric?: boolean;
  sortable?: boolean;
  width?: number | string;
  /** Ẩn trên điện thoại (≤ 720 px). */
  hideSm?: boolean;
  /** Cắt chữ một dòng (cột co giãn). */
  clip?: boolean;
};
/** "ten" tăng, "-ten" giảm (đúng cú pháp ?sap= trên URL). */
export type SortKey = string | null;
export const parseSort = (s: SortKey): { key: string; dir: "ascending" | "descending" } | null => (s ? (s.startsWith("-") ? { key: s.slice(1), dir: "descending" } : { key: s, dir: "ascending" }) : null);
export const nextSort = (cur: SortKey, key: string): SortKey => {
  const p = parseSort(cur);
  if (!p || p.key !== key) return key;
  return p.dir === "ascending" ? `-${key}` : null;
};
/** Dải trang có "…": [1, "…", 4, 5, 6, "…", 12]. */
export function pageItems(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export type TableProps<T> = {
  label: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  status?: RegionStatus;
  stale?: boolean;
  dense?: boolean;
  sort?: SortKey;
  onSort?: (s: SortKey) => void;
  /** Chọn hàng loạt: tập khoá đã chọn + đổi. */
  selected?: ReadonlySet<string>;
  onSelect?: (next: Set<string>) => void;
  /** Thanh thao tác khi có hàng được chọn. */
  bulk?: (selected: ReadonlySet<string>) => ReactNode;
  onRowClick?: (row: T) => void;
  empty?: { icon?: string; title: ReactNode; text?: ReactNode; action?: ReactNode };
  error?: { status?: number; text?: ReactNode };
  onRetry?: () => unknown;
  /** Phân trang phía máy chủ: trang bắt đầu từ 1. */
  page?: { page: number; pageSize: number; total: number; onPage: (p: number) => void; href?: (p: number) => string };
  maxHeight?: number | string;
  skeletonRows?: number;
};

/** Bảng dữ liệu v2: đầu bảng dính, sắp xếp (aria-sort), chọn hàng loạt, phân trang "21–40 trong 96", 4 trạng thái vùng. */
export function Table<T>(p: TableProps<T>) {
  const status = p.status ?? "ok";
  const sel = p.selected;
  const allKeys = p.rows.map(p.rowKey);
  const allOn = !!sel && allKeys.length > 0 && allKeys.every((k) => sel.has(k));
  const someOn = !!sel && allKeys.some((k) => sel.has(k));
  const head = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (head.current) head.current.indeterminate = someOn && !allOn;
  }, [someOn, allOn]);
  const sortP = parseSort(p.sort ?? null);
  const cols = p.columns;
  const span = cols.length + (sel ? 1 : 0);
  const toggle = (k: string) => {
    if (!sel || !p.onSelect) return;
    const n = new Set(sel);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    p.onSelect(n);
  };
  const cellCls = (c: Column<T>) => [c.numeric && "r", c.hideSm && "hide-sm", c.clip && "clip"].filter(Boolean).join(" ") || undefined;

  let body: ReactNode;
  if (status === "dang-tai") {
    body = Array.from({ length: p.skeletonRows ?? 6 }, (_, i) => (
      <tr key={i} aria-hidden="true">
        {sel && <td className="w-check"><Skeleton w={16} h={16} /></td>}
        {cols.map((c, j) => (
          <td key={c.key} className={cellCls(c)}>
            <Skeleton w={c.numeric ? 36 : `${[72, 54, 64, 46][(i + j) % 4]}%`} style={c.numeric ? { marginLeft: "auto" } : undefined} />
          </td>
        ))}
      </tr>
    ));
  } else if (status === "trong" || status === "loi" || !p.rows.length) {
    body = (
      <tr>
        <td colSpan={span} style={{ padding: 0 }}>
          {status === "loi" ? <ErrorState status={p.error?.status} text={p.error?.text} onRetry={p.onRetry} /> : <EmptyState {...(p.empty ?? { title: "Chưa có dữ liệu" })} />}
        </td>
      </tr>
    );
  } else {
    body = p.rows.map((r) => {
      const k = p.rowKey(r);
      const on = sel?.has(k) ?? false;
      return (
        <tr key={k} aria-selected={sel ? on : undefined} onClick={p.onRowClick ? () => p.onRowClick!(r) : undefined} style={p.onRowClick ? { cursor: "pointer" } : undefined}>
          {sel && (
            <td className="w-check" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" className="check" checked={on} onChange={() => toggle(k)} aria-label="Chọn hàng" />
            </td>
          )}
          {cols.map((c) => (
            <td key={c.key} className={cellCls(c)}>
              {c.clip ? <div>{c.cell(r)}</div> : c.cell(r)}
            </td>
          ))}
        </tr>
      );
    });
  }

  const pg = p.page;
  const pages = pg ? Math.max(1, Math.ceil(pg.total / pg.pageSize)) : 1;
  return (
    <div aria-busy={status === "dang-tai" || p.stale || undefined}>
      {sel && p.bulk && sel.size > 0 && (
        <div className="bulkbar" role="region" aria-label="Thao tác hàng loạt">
          <span className="num">Đã chọn {sel.size}</span>
          <span className="grow" />
          {p.bulk(sel)}
          <button type="button" className="btn ghost sm" onClick={() => p.onSelect?.(new Set())}>
            Bỏ chọn
          </button>
        </div>
      )}
      <div className={["table-wrap", p.stale && status === "ok" && "is-stale"].filter(Boolean).join(" ")} style={p.maxHeight ? { ["--table-max" as string]: typeof p.maxHeight === "number" ? `${p.maxHeight}px` : p.maxHeight } : undefined}>
        <table className={p.dense ? "data dense" : "data"} aria-label={p.label}>
          <thead>
            <tr>
              {sel && (
                <th className="w-check">
                  <input ref={head} type="checkbox" className="check" checked={allOn} onChange={() => p.onSelect?.(allOn ? new Set([...sel].filter((k) => !allKeys.includes(k))) : new Set([...sel, ...allKeys]))} aria-label="Chọn tất cả" disabled={status !== "ok"} />
                </th>
              )}
              {cols.map((c) => {
                const active = sortP?.key === c.key;
                return (
                  <th key={c.key} className={cellCls(c)} style={c.width !== undefined ? { width: c.width } : undefined} aria-sort={active ? sortP!.dir : c.sortable ? "none" : undefined}>
                    {c.sortable && p.onSort ? (
                      <button type="button" className="sort" aria-sort={active ? sortP!.dir : undefined} onClick={() => p.onSort!(nextSort(p.sort ?? null, c.key))}>
                        {c.header}
                        <Icon name={active ? (sortP!.dir === "ascending" ? "up" : "dn") : "sort"} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {pg && pg.total > 0 && status === "ok" && (
        <nav className="pager" aria-label="Phân trang">
          <span className="num">
            {(pg.page - 1) * pg.pageSize + 1}–{Math.min(pg.total, pg.page * pg.pageSize)} trong {pg.total.toLocaleString("vi-VN")}
          </span>
          <div className="pages">
            <PageLink p={pg.page - 1} disabled={pg.page <= 1} pg={pg} label="Trang trước">
              <Icon name="left" size="sm" />
            </PageLink>
            {pageItems(pg.page, pages).map((it, i) =>
              it === "…" ? (
                <span key={`e${i}`} aria-hidden="true">
                  …
                </span>
              ) : (
                <PageLink key={it} p={it} current={it === pg.page} pg={pg} label={`Trang ${it}`}>
                  {it}
                </PageLink>
              ),
            )}
            <PageLink p={pg.page + 1} disabled={pg.page >= pages} pg={pg} label="Trang sau">
              <Icon name="right" size="sm" />
            </PageLink>
          </div>
        </nav>
      )}
    </div>
  );
}

function PageLink({ p, disabled, current, pg, label, children }: { p: number; disabled?: boolean; current?: boolean; pg: NonNullable<TableProps<unknown>["page"]>; label: string; children: ReactNode }) {
  return (
    <a
      href={pg.href ? pg.href(p) : `?trang=${p}`}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled && !current) pg.onPage(p);
      }}
    >
      {children}
    </a>
  );
}
