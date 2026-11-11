// Khung màn "danh sách tài liệu" của cổng GV (slide, bảng giảng, sơ đồ, trò chơi, văn bản):
// đầu trang (tiêu đề · đếm · nút chính) · khung soạn trong trang · thanh lọc (tìm + chip) · bảng v2 (sắp, trang trên URL).
import { type ReactNode, useMemo } from "react";
import { Button } from "../../ui/components/Button";
import { Chip } from "../../ui/components/Chip";
import { type Column, Table } from "../../ui/components/Table";
import type { QueryState } from "../../ui/data/query";
import { useUrlState } from "../../ui/data/urlState";
import { type Primary, PageHead } from "../../ui/shell/PageHead";
import { errorOf, FilterBar, SearchBox, statusOf, useListView } from "./kit";

type Sorter<T> = (r: T) => string | number | null | undefined;
export type DocListProps<T> = {
  title: string;
  caption?: ReactNode;
  q: QueryState<T[]> & { refetch: () => unknown };
  columns: Column<T>[];
  rowKey: (r: T) => string;
  text: (r: T) => string;
  sorts?: Record<string, Sorter<T>>;
  defSort?: string;
  /** Chip lọc theo một trường (?loai=…). */
  facet?: { key: string; label: string; of: (r: T) => string; name?: (v: string) => string };
  primary?: Primary;
  acts?: ReactNode;
  form?: ReactNode;
  onRowClick?: (r: T) => void;
  empty: { icon: string; title: string; text: string; action?: ReactNode };
  searchHint: string;
  testId?: string;
};

export function DocList<T>(p: DocListProps<T>) {
  const [facet, setFacet] = useUrlState<string>(p.facet?.key ?? "loai", "");
  const values = useMemo(() => (p.facet ? [...new Set((p.q.data ?? []).map(p.facet.of))].sort() : []), [p.q.data, p.facet]);
  const of = p.facet?.of;
  const filter = useMemo(() => (facet && of ? (r: T) => of(r) === facet : undefined), [facet, of]);
  const v = useListView(p.q.data, { text: p.text, sorts: p.sorts, defSort: p.defSort, filter });
  const st = statusOf(p.q);
  const clear = () => (v.setQ(""), setFacet(""));
  return (
    <>
      <PageHead title={p.title} primary={p.primary}>
        {p.q.data && p.caption && <span className="caption hide-sm">{p.caption}</span>}
        {p.acts}
      </PageHead>
      {p.form}
      <section className="pane" aria-label={p.title} data-testid={p.testId}>
        <FilterBar>
          <SearchBox value={v.q} onChange={v.setQ} placeholder={`${p.searchHint}  /`} label={`Tìm trong ${p.title.toLowerCase()}`} />
          {p.facet && values.length > 1 && (
            <div className="row wrap" role="group" aria-label={p.facet.label} style={{ gap: 6 }}>
              {values.map((x) => <Chip key={x} pressed={facet === x} onClick={() => setFacet(facet === x ? "" : x)}>{p.facet!.name?.(x) ?? x}</Chip>)}
            </div>
          )}
          <span className="grow" />
          {(v.q || facet) && <Button size="sm" variant="ghost" onClick={clear}>Xoá lọc</Button>}
        </FilterBar>
        <Table
          label={p.title}
          columns={p.columns}
          rows={v.rows}
          rowKey={p.rowKey}
          status={st === "ok" && v.total === 0 ? "trong" : st}
          stale={p.q.stale}
          sort={v.sort}
          onSort={v.setSort}
          page={v.pageProp}
          onRowClick={p.onRowClick}
          onRetry={p.q.refetch}
          error={errorOf(p.q.error)}
          skeletonRows={6}
          empty={p.q.data?.length ? { icon: "search", title: "Không có mục nào khớp", text: "Thử bỏ lọc hoặc tìm từ khác.", action: <Button size="sm" onClick={clear}>Xoá lọc</Button> } : p.empty}
        />
      </section>
    </>
  );
}
