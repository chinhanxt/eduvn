// web/src/pages/Diagrams.tsx — danh sách sơ đồ tư duy / lưu đồ
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, type DiagramSummary, errText, gradeLabel } from "../api";
import { makeNode, sampleDoc } from "../diagram/ops";
import type { DiagramDoc, DiagramKind } from "../diagram/types";
import { Icon } from "../Icon";
import { SUBJECT_DEFAULT } from "./Bank";

const blank = (kind: DiagramKind): DiagramDoc => ({ version: 1, kind, nodes: [makeNode(kind, kind === "mind" ? "Chủ đề" : "Bắt đầu", { x: -60, y: -20, shape: kind === "mind" ? "round" : "ellipse" })], edges: [] });

export function Diagrams() {
  const nav = useNavigate();
  const [rows, setRows] = useState<DiagramSummary[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", subject: SUBJECT_DEFAULT, grade: "10", topic: "", kind: "mind" as DiagramKind, sample: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<DiagramSummary[]>("/api/diagrams").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const title = form.title.trim();
    if (!title) return setError("Nhập tên sơ đồ");
    setBusy(true);
    try {
      const doc = form.sample ? sampleDoc(form.kind) : blank(form.kind);
      const r = await api<DiagramSummary>("/api/diagrams", { method: "POST", body: { title, subject: form.subject, topic: form.topic, grade: Math.min(16, Math.max(1, Math.round(Number(form.grade)) || 10)), doc } });
      nav(`/so-do/${r.id}`);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (b: DiagramSummary) => {
    if (!confirm(`Xoá sơ đồ "${b.title}"?`)) return;
    setError(null);
    try {
      await api(`/api/diagrams/${b.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(errText(e));
    }
  };

  return (
    <>
      <h1>Sơ đồ</h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setAdding((a) => !a)} data-testid="sd-new"><Icon name="plus" size={18} />Tạo</button>
      </div>
      {error && <div className="err">{error}</div>}
      {adding && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={(e) => void create(e)}>
          <div className="formrow">
            <label className="lbl">Tên sơ đồ<input className="inp" style={{ width: 260 }} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="sd-title" /></label>
            <label className="lbl">Loại
              <select className="inp" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as DiagramKind })} data-testid="sd-kind">
                <option value="mind">Sơ đồ tư duy</option>
                <option value="flow">Lưu đồ</option>
              </select>
            </label>
            <label className="lbl">Môn<input className="inp w-m" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
            <label className="lbl">Chủ đề<input className="inp w-m" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></label>
            <label className="lbl" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={form.sample} onChange={(e) => setForm({ ...form, sample: e.target.checked })} data-testid="sd-sample" />Bắt đầu từ mẫu</label>
            <button className="btn" disabled={busy} data-testid="sd-create"><Icon name="check" size={18} />Tạo</button>
          </div>
        </form>
      )}
      {rows?.length === 0 && <div className="card empty">Chưa có sơ đồ</div>}
      <div className="cards">
        {rows?.map((b) => (
          <div className="cls" key={b.id} data-testid="sd-card">
            <Link to={`/so-do/${b.id}`} style={{ textDecoration: "none" }}>
              <div className="ic violet" style={{ marginBottom: 10 }}><Icon name="graph" /></div>
              <div style={{ fontWeight: 600 }}>{b.title}</div>
              <div className="meta">{b.kind === "mind" ? "Sơ đồ tư duy" : "Lưu đồ"} · {b.subject} · {gradeLabel(b.grade)}{b.topic ? ` · ${b.topic}` : ""}</div>
            </Link>
            <div className="cnt">{b.nodeCount} hình<span style={{ flex: 1 }} /><button className="xbtn" onClick={() => void remove(b)} aria-label="Xoá"><Icon name="trash" size={16} /></button></div>
          </div>
        ))}
      </div>
    </>
  );
}
