import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api, errText, type LessonSummary as PlanSummary } from "../api";
import { Icon } from "../Icon";
import { BASE, type LessonSummary } from "../ailesson/lib";
import { NhapButton } from "../xuat-ban/Nhap";

const statusText = (s: LessonSummary): string => (s.status === "done" ? `${s.sceneCount} cảnh` : s.status === "error" ? "Lỗi — mở để sinh tiếp" : `${s.progress.stage} (${s.progress.done}/${s.progress.total || "…"})`);

export function AiLessons() {
  const nav = useNavigate();
  const [rows, setRows] = useState<LessonSummary[] | null>(null);
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [req, setReq] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [count, setCount] = useState("7");
  const [planId, setPlanId] = useState("");
  const [mat, setMat] = useState<{ name: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<LessonSummary[]>(BASE).then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (rows?.some((r) => r.status === "queued" || r.status === "running")) {
      const t = setTimeout(load, 3000);
      return () => clearTimeout(t);
    }
  }, [rows, load]);
  useEffect(() => {
    if (open) api<PlanSummary[]>("/api/lessons").then(setPlans).catch(() => setPlans([]));
  }, [open]);

  const upload = async (f: File) => {
    setBusy(true);
    setError(null);
    try {
      const b64 = await toBase64(f);
      const r = await api<{ name: string; text: string }>(`${BASE}/tai-lieu`, { method: "POST", body: { name: f.name, contentBase64: b64 } });
      setMat({ name: r.name, text: r.text });
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string }>(BASE, {
        method: "POST",
        body: { requirement: req, ...(subject && { subject }), ...(grade && { grade: Number(grade) }), sceneCount: Number(count), ...(planId && { lessonPlanId: planId }), ...(mat && { materialText: mat.text, materialName: mat.name }) },
      });
      nav(`/bai-giang-ai/${r.id}`);
    } catch (e) {
      setError(errText(e));
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá bài giảng này?")) return;
    await api(`${BASE}/${id}`, { method: "DELETE" }).catch((e: unknown) => setError(errText(e)));
    load();
  };

  return (
    <>
      <h1>Bài giảng AI</h1>
      <div className="bar">
        <span className="sp" />
        <NhapButton onDone={(r) => nav(`/bai-giang-ai/${r.id}`)} />
        <button className="btn" onClick={() => setOpen((o) => !o)} data-testid="ail-new"><Icon name="spark" size={18} />Soạn bài bằng AI</button>
      </div>
      {error && <div className="err">{error}</div>}
      {open && (
        <div className="card" style={{ marginBottom: 16 }} data-testid="ail-form">
          <label className="lbl">Bạn muốn dạy gì?
            <textarea className="inp" value={req} onChange={(e) => setReq(e.target.value)} placeholder="vd: Toán 8 — Hằng đẳng thức đáng nhớ, có ví dụ và bài luyện tập" data-testid="ail-req" />
          </label>
          <div className="formrow" style={{ marginTop: 10 }}>
            <label className="lbl">Môn<input className="inp w-m" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Toán" /></label>
            <label className="lbl">Lớp (1–12)<input className="inp w-s" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
            <label className="lbl">Số cảnh<input className="inp w-s" type="number" min={3} max={12} value={count} onChange={(e) => setCount(e.target.value)} /></label>
            <label className="lbl">Dựa trên giáo án
              <select className="inp" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">— Không —</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.subject} {p.grade}</option>)}
              </select>
            </label>
            <div className="lbl">Tài liệu (PDF/DOCX/TXT)
              <input ref={file} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
              <button className="btn ghost" type="button" onClick={() => file.current?.click()} disabled={busy}><Icon name="upload" size={18} />{mat ? mat.name : "Tải lên"}</button>
            </div>
          </div>
          <button className="btn" disabled={busy || req.trim().length < 3} onClick={() => void create()} data-testid="ail-create"><Icon name="check" size={18} />Bắt đầu soạn</button>
        </div>
      )}
      {rows?.length === 0 && <div className="card"><div className="empty">Chưa có bài giảng AI nào. Bấm "Soạn bài bằng AI" để bắt đầu.</div></div>}
      {rows && rows.length > 0 && (
        <div className="card" data-testid="ail-list">
          {rows.map((r) => (
            <div key={r.id} className="item" data-testid="ail-row">
              <div className="ic violet" style={{ margin: 0, width: 38, height: 38 }}><Icon name="present" /></div>
              <div className="grow">
                <a href={`/bai-giang-ai/${r.id}`} onClick={(e) => { e.preventDefault(); nav(`/bai-giang-ai/${r.id}`); }}>{r.title}</a>
                <small>{r.subject}{r.grade ? ` ${r.grade}` : ""} · {statusText(r)} · {new Date(r.updatedAt).toLocaleDateString("vi-VN")}</small>
              </div>
              <button className="btn ghost sm" onClick={() => void remove(r.id)} aria-label="Xoá"><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function toBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Không đọc được tệp"));
    r.readAsDataURL(f);
  });
}
