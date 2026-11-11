import { useEffect, useMemo, useState } from "react";
import { vn } from "../../api";
import { Region, FilterBar, SearchBox, errorOf, get, initialsOf, useListView } from "../../portal/gv/kit";
import { Icon } from "../../ui/Icon";
import { Badge } from "../../ui/components/Chip";
import { type Column, Table } from "../../ui/components/Table";
import { useQuery } from "../../ui/data/query";
import { useUrlState } from "../../ui/data/urlState";
import type { MonitorPayload, MonitorRow, MonitorState } from "./types";

const POLL_MS = 5000;
const STATE_VI: Record<MonitorState, ["neutral" | "accent" | "ok" | "warn", string]> = { chua_vao: ["neutral", "Chưa vào"], dang_lam: ["accent", "Đang làm"], da_nop: ["ok", "Đã nộp"], tu_nop: ["warn", "Tự nộp hết giờ"] };
type Filter = "tat-ca" | "chua-vao" | "dang-lam" | "da-nop";
const MATCH: Record<Filter, (r: MonitorRow) => boolean> = {
  "tat-ca": () => true,
  "chua-vao": (r) => r.state === "chua_vao",
  "dang-lam": (r) => r.state === "dang_lam",
  "da-nop": (r) => r.state === "da_nop" || r.state === "tu_nop",
};

/** Tab "Theo dõi": hỏi lại mỗi 5 giây (máy chủ cache 2 giây) — ai đang làm, đã nộp, rời tab mấy lần. Lọc trên URL (?trang-thai=). */
export function MonitorTab({ assignmentId }: { assignmentId: string }) {
  const q = useQuery(`gv/theo-doi/${assignmentId}`, get<MonitorPayload>(`/api/assignments/${assignmentId}/monitor`), { staleMs: 2000 });
  const { refetch } = q;
  const [since, setSince] = useState(0);
  useEffect(() => setSince(0), [q.updatedAt]);
  useEffect(() => {
    const poll = window.setInterval(() => document.visibilityState === "visible" && void refetch(), POLL_MS);
    const sec = window.setInterval(() => setSince((s) => s + 1), 1000);
    return () => (window.clearInterval(poll), window.clearInterval(sec));
  }, [refetch]);
  const m = q.data;
  const [f, setF] = useUrlState<string>("trang-thai", "tat-ca");
  const filter = (f in MATCH ? f : "tat-ca") as Filter;
  const sorts = useMemo(() => ({ tt: (r: MonitorRow) => r.seat, ten: (r: MonitorRow) => r.fullName.split(/\s+/).pop() ?? "", roi: (r: MonitorRow) => r.leaveCount, tien: (r: MonitorRow) => (r.state === "chua_vao" ? -1 : r.answered / Math.max(1, r.total)) }), []);
  const v = useListView(m?.rows, { text: (r) => r.fullName, sorts, defSort: "tt", filter: MATCH[filter], pageSize: 50 });
  if (!m) return <Region className="pane" label="Theo dõi" status={q.error ? "loi" : "dang-tai"} error={errorOf(q.error)} onRetry={q.refetch} skeletonRows={8} />;
  const done = m.counts.da_nop + m.counts.tu_nop;
  const ago = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.parse(m.serverNow) - Date.parse(iso)) / 1000)) + since : null);
  const cards: [Filter, string, number, string][] = [
    ["tat-ca", "Cả lớp", m.rows.length, "học sinh"],
    ["chua-vao", "Chưa vào", m.counts.chua_vao, m.rows.length ? `${Math.round((m.counts.chua_vao / m.rows.length) * 100)}%` : ""],
    ["dang-lam", "Đang làm", m.counts.dang_lam, "trực tiếp"],
    ["da-nop", "Đã nộp", done, m.counts.tu_nop ? `${m.counts.tu_nop} tự nộp` : ""],
  ];
  const cols: Column<MonitorRow>[] = [
    { key: "tt", header: "TT", numeric: true, sortable: true, width: 48, cell: (r) => r.seat ?? "—" },
    { key: "ten", header: "Học sinh", sortable: true, cell: (r) => <div className="who"><span className="avatar sm hide-sm">{initialsOf(r.fullName)}</span><span>{r.fullName}</span></div> },
    { key: "tt-lam", header: "Trạng thái", cell: (r) => <Badge tone={STATE_VI[r.state][0]}>{r.state === "dang_lam" ? `Đang làm · ${r.answered}/${r.total}` : r.state === "chua_vao" ? "Chưa vào" : `${STATE_VI[r.state][1]} · ${vn(r.score10)}`}</Badge> },
    {
      key: "tien",
      header: "Tiến độ",
      sortable: true,
      hideSm: true,
      width: 180,
      cell: (r) => {
        const pg = r.state === "chua_vao" ? 0 : r.state === "dang_lam" ? r.answered : r.total;
        return (
          <span className="meter-n" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span className="meter" style={{ flex: 1, height: 4, background: "var(--line)" }}><i style={{ ["--v" as string]: `${(pg / Math.max(1, r.total)) * 100}%`, background: r.state === "dang_lam" ? undefined : "var(--ok)" }} /></span>
            <span className="num muted">{pg}/{r.total}</span>
          </span>
        );
      },
    },
    { key: "roi", header: "Rời tab", numeric: true, sortable: true, cell: (r) => <span className={r.leaveCount >= 5 ? "low-score" : r.leaveCount >= 2 ? "warn-t" : "muted"} title="Số lần thoát khỏi trang làm bài"><Icon name="eyeoff" size="sm" style={{ verticalAlign: "-3px", marginRight: 4 }} />{r.leaveCount}</span> },
    { key: "cn", header: "Cập nhật", numeric: true, hideSm: true, cell: (r) => <span className="muted">{r.state === "chua_vao" ? "—" : r.state === "dang_lam" ? `${ago(r.updatedAt)} giây trước` : "đã nộp"}</span> },
  ];
  return (
    <>
      <section className="kpis pick k4" aria-label="Lọc theo trạng thái">
        {cards.map(([k, label, n, sub]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setF(k)} data-testid={`lh-count-${k}`}>
            <div className="k">{label}</div>
            <div className="v">{n} {sub && <small className="mu">{sub}</small>}</div>
          </button>
        ))}
      </section>
      <section className="pane mt" aria-label="Học sinh làm bài">
        <FilterBar>
          <SearchBox value={v.q} onChange={v.setQ} placeholder="Tìm học sinh  /" label="Tìm học sinh" />
          <span className="grow" />
          <span className="live-dot" aria-live="polite">
            <i />Trực tiếp · <span className="num">{since ? `cập nhật ${since} giây trước` : "vừa cập nhật"}</span>
          </span>
        </FilterBar>
        <div data-testid="lh-monitor">
          <Table label="Theo dõi làm bài" dense columns={cols} rows={v.rows} rowKey={(r) => r.studentId} sort={v.sort} onSort={v.setSort} page={v.pageProp} stale={false} status={v.total ? "ok" : "trong"} empty={{ icon: "users", title: "Không em nào ở trạng thái này", text: "Chọn ô khác ở dải trên để xem." }} />
        </div>
      </section>
    </>
  );
}
