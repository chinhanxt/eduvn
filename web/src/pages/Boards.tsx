// web/src/pages/Boards.tsx
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, type BoardSummary, errText, gradeLabel } from "../api";
import { Icon } from "../Icon";
import { SUBJECT_DEFAULT } from "./Bank";

export function Boards() {
  const nav = useNavigate();
  const [rows, setRows] = useState<BoardSummary[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", subject: SUBJECT_DEFAULT, grade: "10", topic: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<BoardSummary[]>("/api/boards").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const title = form.title.trim();
    if (!title) {
      setError("Nhập tên bài");
      return;
    }
    setBusy(true);
    try {
      const b = await api<BoardSummary>("/api/boards", { method: "POST", body: { ...form, title, grade: Math.min(16, Math.max(1, Math.round(Number(form.grade)) || 10)) } });
      nav(`/bang-giang/${b.id}`);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (b: BoardSummary) => {
    if (!confirm(`Xoá bài giảng "${b.title}"?`)) return;
    setError(null);
    try {
      await api(`/api/boards/${b.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(errText(e));
    }
  };

  return (
    <>
      <h1>Bảng giảng</h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setAdding((a) => !a)} data-testid="bg-new"><Icon name="plus" size={18} />Tạo</button>
      </div>
      {error && <div className="err">{error}</div>}
      {adding && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={(e) => void create(e)}>
          <div className="formrow">
            <label className="lbl">Tên bài<input className="inp" style={{ width: 280 }} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="bg-title" /></label>
            <label className="lbl">Môn<input className="inp w-m" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
            <label className="lbl">Chủ đề<input className="inp w-m" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} data-testid="bg-topic" /></label>
            <button className="btn" disabled={busy} data-testid="bg-create"><Icon name="check" size={18} />Tạo</button>
          </div>
        </form>
      )}
      {rows?.length === 0 && <div className="card empty">Chưa có bài giảng</div>}
      <div className="cards">
        {rows?.map((b) => (
          <div className="cls" key={b.id} data-testid="bg-card">
            <Link to={`/bang-giang/${b.id}`} style={{ textDecoration: "none" }}>
              <div className="ic violet" style={{ marginBottom: 10 }}><Icon name="board" /></div>
              <div style={{ fontWeight: 600 }}>{b.title}</div>
              <div className="meta">{b.subject} · {gradeLabel(b.grade)}{b.topic ? ` · ${b.topic}` : ""}</div>
            </Link>
            <div className="cnt">{b.pageCount} trang<span style={{ flex: 1 }} /><button className="xbtn" onClick={() => void remove(b)} aria-label="Xoá"><Icon name="trash" size={16} /></button></div>
          </div>
        ))}
      </div>
    </>
  );
}
