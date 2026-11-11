// web/src/omr/Saved.tsx — kết quả chấm từ ảnh đã lưu: bảng phân trang, xoá, ghi vào sổ điểm (thang 10).
import { useCallback, useEffect, useState } from "react";
import { type ClassSummary, api } from "../api";
import { Icon } from "../Icon";
import type { Roster } from "./seat";
import { Btn, num, useLock, useToast } from "./ui";

export type SavedRow = { id: string; kind: string; student: string; title: string; total: number; max: number; createdAt: string; body: { classId?: string | null; studentId?: string | null } };
const PER = 20;

export function useSaved(kind: "omr" | "essay") {
  const [rows, setRows] = useState<SavedRow[] | null>(null);
  const reload = useCallback(() => void api<SavedRow[]>(`/api/photo/results?kind=${kind}`).then(setRows).catch(() => setRows([])), [kind]);
  useEffect(reload, [reload]);
  return { rows, reload };
}

export function SavedList({ state }: { state: ReturnType<typeof useSaved> }) {
  const toast = useToast();
  const [gb, setGb] = useState("");
  const [page, setPage] = useState(0);
  const [del, deleting] = useLock();
  const rows = state.rows;
  if (rows === null) return <div className="pg-pane" style={{ marginTop: 16, padding: 12 }} aria-busy="true"><div className="pg-sk l" style={{ width: "30%" }} /></div>;
  if (rows.length === 0) return null;
  const pages = Math.ceil(rows.length / PER);
  const p = Math.min(page, pages - 1);
  const shown = rows.slice(p * PER, p * PER + PER);
  return (
    <section className="pg-pane" style={{ marginTop: 16 }} data-testid="saved">
      <div className="pg-ghd">Đã lưu <span className="n">{rows.length}</span></div>
      <table className="pg-table">
        <thead><tr><th>Học sinh</th><th>Bài</th><th className="r">Điểm</th><th>Lưu lúc</th><th className="x" /></tr></thead>
        <tbody>
          {shown.map((r) => (
            <FragmentRow key={r.id} r={r} open={gb === r.id} toggle={() => setGb(gb === r.id ? "" : r.id)}
              onDelete={() => void del(async () => {
                await api(`/api/photo/results/${r.id}`, { method: "DELETE" });
                toast("ok", "Đã xoá kết quả");
                state.reload();
              })} deleting={deleting} />
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="pg-gb" style={{ padding: "6px 12px", borderTop: "1px solid var(--line)" }}>
          <span className="mu num">{p * PER + 1}–{Math.min(rows.length, (p + 1) * PER)} trong {rows.length}</span>
          <span className="pg-sp" />
          <Btn kind="quiet sm" disabled={p === 0} onClick={() => setPage(p - 1)}><Icon name="chevl" />Trước</Btn>
          <Btn kind="quiet sm" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Sau<Icon name="chevr" /></Btn>
        </div>
      )}
    </section>
  );
}

function FragmentRow({ r, open, toggle, onDelete, deleting }: { r: SavedRow; open: boolean; toggle: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <>
      <tr>
        <td>{r.student || <span className="mu">—</span>}</td>
        <td>{r.title}</td>
        <td className="r"><b>{num(r.total)}</b> <span className="mu">/ {num(r.max)}</span></td>
        <td className="mu num">{new Date(r.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</td>
        <td className="x">
          <Btn kind="sm" onClick={toggle} aria-expanded={open} data-testid="gb-open"><Icon name="book" />Ghi sổ điểm</Btn>{" "}
          <Btn kind="quiet icon sm" aria-label="Xoá" disabled={deleting} onClick={onDelete}><Icon name="trash" /></Btn>
        </td>
      </tr>
      {open && <tr><td colSpan={5} style={{ background: "var(--bg-sunken)" }}><GradebookPanel row={r} /></td></tr>}
    </>
  );
}

/** Ghi điểm (quy thang 10) vào sổ điểm. Phiếu đã ghép HS lúc lưu → chỉ chọn cột. */
function GradebookPanel({ row }: { row: SavedRow }) {
  const toast = useToast();
  const linked = row.body.classId && row.body.studentId ? { classId: row.body.classId, studentId: row.body.studentId } : null;
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classId, setClassId] = useState(linked?.classId ?? "");
  const [roster, setRoster] = useState<Roster | null>(null);
  const [studentId, setStudentId] = useState(linked?.studentId ?? "");
  const [column, setColumn] = useState("");
  const [term, setTerm] = useState("HK1");
  const [go, busy] = useLock();
  useEffect(() => void api<ClassSummary[]>("/api/classes").then(setClasses).catch(() => setClasses([])), []);
  useEffect(() => {
    setRoster(null);
    if (!classId) return;
    void api<Roster>(`/api/photo/classes/${classId}/roster`).then((r) => {
      setRoster(r);
      setColumn(r.columns[0]?.name ?? "");
    });
  }, [classId]);
  const who = roster?.students.find((s) => s.id === studentId);
  return (
    <div className="pg-gb" data-testid="gb-panel">
      {linked ? (
        <span className="pg-tag ok"><Icon name="user" />{who ? `${who.seat ?? "—"} · ${who.fullName}` : row.student}{roster ? ` · ${roster.name}` : ""}</span>
      ) : (
        <>
          <select className="pg-in" value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} aria-label="Lớp"><option value="">Chọn lớp…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {roster && <select className="pg-in" value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="Học sinh" data-testid="gb-student"><option value="">Chọn học sinh…</option>{roster.students.map((s) => <option key={s.id} value={s.id}>{s.seat ?? "—"} · {s.fullName}</option>)}</select>}
        </>
      )}
      {roster && (
        <>
          <select className="pg-in" value={column} onChange={(e) => setColumn(e.target.value)} aria-label="Cột điểm">{roster.columns.map((c) => <option key={c.name}>{c.name}</option>)}</select>
          <select className="pg-in" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Học kỳ"><option>HK1</option><option>HK2</option></select>
          <Btn kind="pri sm" busy={busy} disabled={!studentId || !column} data-testid="gb-go"
            onClick={() => void go(async () => {
              const r = await api<{ score: number; column: string; class: string }>(`/api/photo/results/${row.id}/gradebook`, { method: "POST", body: { classId, studentId, column, term } });
              toast("ok", `Đã ghi ${num(r.score)} vào cột ${r.column} · ${r.class}`);
            })}>
            Ghi điểm thang 10
          </Btn>
        </>
      )}
    </div>
  );
}
