import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, errText, type LessonSummary as PlanSummary } from "../api";
import { BASE, type LessonSummary } from "../ailesson/lib";
import { Icon } from "../ui/Icon";
import { Button, IconButton } from "../ui/components/Button";
import { Skeleton } from "../ui/components/Skeleton";
import { PageHead } from "../ui/shell/PageHead";
import { Art, artFor, EmptyHero, samples, Thumb } from "../portal/gv/Preview";
import "../portal/gv/gv.css";

const statusText = (s: LessonSummary): string => (s.status === "done" ? `${s.sceneCount} cảnh` : s.status === "error" ? "Lỗi — mở để sinh tiếp" : `${s.progress.stage} (${s.progress.done}/${s.progress.total || "…"})`);
const IDEAS = ["Địa lí 12 — Khí hậu nhiệt đới gió mùa, có bản đồ", "Tiếng Anh 10 — Câu bị động qua tin tức", "Sinh học 8 — Quang hợp, có thí nghiệm"];

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
  const ask = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    api<LessonSummary[]>(BASE).then(setRows).catch((e: unknown) => (setError(errText(e)), setRows((r) => r ?? [])));
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
  useEffect(() => {
    if (open) ask.current?.focus();
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

  const form = (
    <form className="ail-new" data-testid="ail-form" onSubmit={(e) => { e.preventDefault(); if (!busy && req.trim().length >= 3) void create(); }}>
      <div className="ail-ask">
        <Icon name="spark" />
        <textarea ref={ask} value={req} onChange={(e) => setReq(e.target.value)} placeholder="Bạn muốn dạy gì? Môn, lớp, chủ đề, điều muốn nhấn…" rows={2} aria-label="Yêu cầu bài giảng" data-testid="ail-req" />
      </div>
      <div className="ail-ideas">{IDEAS.map((x) => <button type="button" key={x} onClick={() => (setReq(x), ask.current?.focus())}>“{x}”</button>)}</div>
      <div className="ail-opts">
        <label><span>Môn</span><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Tự nhận" /></label>
        <label className="sm"><span>Lớp</span><input className="input" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="—" /></label>
        <label className="sm"><span>Số cảnh</span><input className="input" type="number" min={3} max={12} value={count} onChange={(e) => setCount(e.target.value)} /></label>
        <label className="wide"><span>Dựa trên giáo án</span>
          <select className="select" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Không</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.subject} {p.grade}</option>)}
          </select>
        </label>
        <div className="file"><span>Tài liệu</span>
          <input ref={file} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <Button type="button" icon={mat ? "check" : "upload"} onClick={() => file.current?.click()} disabled={busy}>{mat ? mat.name : "PDF · DOCX"}</Button>
        </div>
        <Button type="submit" variant="primary" icon="spark" disabled={busy || req.trim().length < 3} data-testid="ail-create">{busy ? "Đang gửi…" : "Soạn bài"}</Button>
      </div>
    </form>
  );

  return (
    <>
      <PageHead title="Bài giảng AI" primary={rows?.length ? { label: open ? "Đóng" : "Soạn bài", icon: open ? "x" : "spark", onClick: () => setOpen((o) => !o) } : undefined}>
        {rows && rows.length > 0 && <span className="caption hide-sm">{rows.length} bài · slide, giọng đọc, quiz, video</span>}
      </PageHead>
      {error && <div className="note err" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {rows === null && <div className="gv-grid">{[0, 1, 2, 3].map((i) => <div key={i}><Skeleton h={140} style={{ borderRadius: 10 }} /><Skeleton w="70%" h={14} style={{ marginTop: 10 }} /></div>)}</div>}
      {rows?.length === 0 && !open && (
        <EmptyHero title="Một câu, thành bài giảng" sub="Slide, lời giảng có giọng đọc, câu hỏi, mô phỏng — xuất PowerPoint hoặc video." action={<Button variant="primary" size="lg" icon="spark" onClick={() => setOpen(true)} data-testid="ail-new">Soạn bài bằng AI</Button>}>
          {samples(4, 5).map((s, i) => <Thumb key={s.title} s={s} badge={["7 cảnh · 11 phút", "6 cảnh · 9 phút", "8 cảnh · 14 phút", "5 cảnh · 8 phút"][i]} />)}
        </EmptyHero>
      )}
      {open && form}
      {rows && rows.length > 0 && (
        <div className="gv-grid ail-list" data-testid="ail-list">
          {rows.map((r) => {
            const run = r.status === "queued" || r.status === "running";
            return (
              <div key={r.id} className="ail-card" data-testid="ail-row">
                <Link className="gv-thumb" to={`/bai-giang-ai/${r.id}`}>
                  <span className="pic">
                    <Art name={artFor(r.subject)} />
                    {run && <span className="ail-run"><i style={{ width: `${r.progress.total ? (r.progress.done / r.progress.total) * 100 : 8}%` }} /></span>}
                    <span className={`tb ${r.status}`}>{r.status === "done" ? <><Icon name="play" size="sm" />{r.sceneCount} cảnh</> : r.status === "error" ? "Cần sinh tiếp" : "AI đang soạn…"}</span>
                  </span>
                  <b>{r.title}</b>
                  <small title={statusText(r)}>{[r.subject, r.grade ? `lớp ${r.grade}` : null, new Date(r.updatedAt).toLocaleDateString("vi-VN")].filter(Boolean).join(" · ")}</small>
                </Link>
                <IconButton className="del" size="sm" icon="trash" label="Xoá" onClick={() => void remove(r.id)} />
              </div>
            );
          })}
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
