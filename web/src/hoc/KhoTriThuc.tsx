import { useCallback, useEffect, useState } from "react";
import { errText } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { type Kb, type KbDoc, tutorApi, toBase64 } from "./client";

type KbFull = Kb & { docs: KbDoc[] };
type Hit = { doc: string; page: number; score: number; text: string };
type Draft = { id: string; topic: string; body: { type: string; stem: string; level: string; options?: string[]; statements?: string[]; answer?: unknown; explanation?: string; rubric?: string } };
type LessonRow = { id: string; title: string };

const SRC = { upload: "Tệp tải lên", lesson: "Giáo án EDUVN", text: "Ghi chú" } as const;

export function KhoTriThuc() {
  const [kbs, setKbs] = useState<Kb[]>([]);
  const [kb, setKb] = useState<KbFull | null>(null);
  const [form, setForm] = useState({ name: "", subject: "Toán", grade: 8 });
  const [note, setNote] = useState("");
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [gen, setGen] = useState({ topic: "", count: 5 });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const loadKbs = useCallback(() => tutorApi<Kb[]>("/kbs").then(setKbs).catch((e: unknown) => setError(errText(e))), []);
  const loadDrafts = useCallback(() => tutorApi<Draft[]>("/drafts").then(setDrafts).catch(() => {}), []);
  const open = useCallback((id: string) => tutorApi<KbFull>(`/kbs/${id}`).then(setKb).catch((e: unknown) => setError(errText(e))), []);
  useEffect(() => {
    void loadKbs();
    void loadDrafts();
    import("../api").then(({ api }) => api<LessonRow[]>("/api/lessons").then(setLessons)).catch(() => {});
  }, [loadKbs, loadDrafts]);

  const run = async (label: string, f: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    setOk(null);
    try {
      await f();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const createKb = () => run("kb", async () => {
    const k = await tutorApi<Kb>("/kbs", { method: "POST", body: form });
    await loadKbs();
    await open(k.id);
    setForm({ ...form, name: "" });
  });
  const upload = (files: FileList | null) => run("up", async () => {
    for (const f of files ?? []) {
      await tutorApi(`/kbs/${kb!.id}/docs`, { method: "POST", body: { name: f.name, contentBase64: toBase64(await f.arrayBuffer()) } });
    }
    await open(kb!.id);
    await loadKbs();
    setOk("Đã nạp tài liệu và lập chỉ mục.");
  });
  const addNote = () => run("note", async () => {
    await tutorApi(`/kbs/${kb!.id}/docs`, { method: "POST", body: { name: "Ghi chú", text: note } });
    setNote("");
    await open(kb!.id);
  });
  const addLesson = (id: string) => run("lesson", async () => {
    await tutorApi(`/kbs/${kb!.id}/docs`, { method: "POST", body: { lessonPlanId: id } });
    await open(kb!.id);
  });
  const delDoc = (id: string) => run("del", async () => {
    if (!confirm("Xoá tài liệu này khỏi kho?")) return;
    await tutorApi(`/kbs/${kb!.id}/docs/${id}`, { method: "DELETE" });
    await open(kb!.id);
  });
  const delKb = () => run("delkb", async () => {
    if (!confirm("Xoá cả kho tri thức này?")) return;
    await tutorApi(`/kbs/${kb!.id}`, { method: "DELETE" });
    setKb(null);
    await loadKbs();
  });
  const search = () => run("s", async () => setHits((await tutorApi<{ hits: Hit[] }>(`/kbs/${kb!.id}/search?q=${encodeURIComponent(q)}&k=5`)).hits));
  const generate = () => run("gen", async () => {
    const r = await tutorApi<{ created: number }>("/questions/generate", { method: "POST", body: { kbId: kb!.id, subject: kb!.subject, grade: kb!.grade, topic: gen.topic, count: gen.count } });
    await loadDrafts();
    setOk(`AI đã soạn ${r.created} câu, đang chờ thầy cô duyệt bên dưới.`);
  });
  const decide = (id: string, approve: boolean) => run("dec", async () => {
    await tutorApi(`/drafts/${id}/${approve ? "approve" : "reject"}`, { method: "POST", body: {} });
    await loadDrafts();
  });

  return (
    <>
      <h1>Kho tri thức</h1>
      {error && <div className="err">{error}</div>}
      {ok && <div className="ok-box">{ok}</div>}
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="card">
            <h2>Các kho theo lớp/môn</h2>
            {kbs.map((k) => (
              <button key={k.id} className="item" style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }} onClick={() => void open(k.id)}>
                <div className="grow">{k.name}<small>{k.subject} · lớp {k.grade} · {k.docCount} tài liệu</small></div>
              </button>
            ))}
            {kbs.length === 0 && <div className="empty">Chưa có kho nào.</div>}
            <div className="formrow" style={{ marginTop: 14 }}>
              <label className="lbl">Tên kho<input className="inp w-m" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="kb-name" /></label>
              <label className="lbl">Môn<input className="inp w-m" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
              <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })} /></label>
              <button className="btn" disabled={!form.name.trim() || !!busy} onClick={() => void createKb()}><Icon name="plus" size={18} />Tạo kho</button>
            </div>
          </div>
          <div className="card">
            <h2>Duyệt câu hỏi AI soạn ({drafts.length})</h2>
            {drafts.length === 0 && <div className="empty">Không có câu nào chờ duyệt.</div>}
            {drafts.map((d) => (
              <div className="item" key={d.id} style={{ alignItems: "flex-start" }}>
                <div className="grow">
                  <span className="tag">{d.body.type}</span> <span className="tag violet">{d.body.level}</span> {d.topic}
                  <div style={{ marginTop: 4 }}><MathText value={d.body.stem} /></div>
                  {d.body.options && <small>{d.body.options.map((o, i) => <div key={i}>{"ABCD"[i]}. <MathText value={o} />{d.body.answer === i ? " ✓" : ""}</div>)}</small>}
                  {d.body.statements && <small>{d.body.statements.map((o, i) => <div key={i}>{"abcd"[i]}) <MathText value={o} /> — {(d.body.answer as boolean[])[i] ? "Đúng" : "Sai"}</div>)}</small>}
                  {typeof d.body.answer === "string" && <small>Đáp án: <MathText value={d.body.answer} /></small>}
                  {d.body.explanation && <small>Lời giải: <MathText value={d.body.explanation} /></small>}
                </div>
                <button className="btn sm" onClick={() => void decide(d.id, true)}>Duyệt vào ngân hàng</button>
                <button className="btn ghost sm" onClick={() => void decide(d.id, false)}>Bỏ</button>
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          {!kb && <div className="card"><div className="empty">Chọn một kho để thêm tài liệu.</div></div>}
          {kb && (
            <>
              <div className="card">
                <div className="bar"><h2 style={{ margin: 0 }}>{kb.name}</h2><span className="sp" /><button className="xbtn" onClick={() => void delKb()} aria-label="Xoá kho"><Icon name="trash" size={16} /></button></div>
                {kb.docs.map((d) => (
                  <div className="item" key={d.id}>
                    <div className="grow">{d.name}<small>{SRC[d.source as keyof typeof SRC] ?? d.source} · {d.pages} trang · {Math.round(d.chars / 1000)}k chữ</small></div>
                    <button className="xbtn" onClick={() => void delDoc(d.id)} aria-label="Xoá"><Icon name="trash" size={16} /></button>
                  </div>
                ))}
                {kb.docs.length === 0 && <div className="empty">Kho chưa có tài liệu.</div>}
                <div className="bar" style={{ marginTop: 14 }}>
                  <label className="btn" style={{ cursor: "pointer" }}><Icon name="upload" size={18} />{busy === "up" ? "Đang lập chỉ mục…" : "Tải PDF / DOCX / TXT / MD"}<input type="file" hidden multiple accept=".pdf,.docx,.txt,.md" onChange={(e) => void upload(e.target.files)} data-testid="kb-upload" /></label>
                  {lessons.length > 0 && (
                    <select className="inp" value="" onChange={(e) => e.target.value && void addLesson(e.target.value)} aria-label="Thêm giáo án">
                      <option value="">+ Thêm giáo án EDUVN…</option>
                      {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  )}
                </div>
                <textarea className="inp" placeholder="Hoặc dán ghi chú/đoạn kiến thức vào đây…" value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 70 }} />
                <div style={{ marginTop: 8 }}><button className="btn ghost sm" disabled={note.trim().length < 20 || !!busy} onClick={() => void addNote()}>Thêm ghi chú vào kho</button></div>
              </div>
              <div className="card">
                <h2>Thử tìm trong kho</h2>
                <div className="formrow"><input className="inp" style={{ flex: 1 }} placeholder="vd hiệu hai bình phương" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} /><button className="btn ghost" onClick={() => void search()}>Tìm</button></div>
                {hits?.map((h, i) => <div className="item" key={i}><div className="grow"><span className="tag">{h.doc}, trang {h.page}</span><small>{h.text.slice(0, 200)}</small></div></div>)}
                {hits?.length === 0 && <div className="empty">Không thấy đoạn nào.</div>}
              </div>
              <div className="card">
                <h2>AI soạn câu hỏi cho ngân hàng từ kho này</h2>
                <div className="formrow">
                  <label className="lbl" style={{ flex: 1 }}>Chủ đề<input className="inp w-l" value={gen.topic} onChange={(e) => setGen({ ...gen, topic: e.target.value })} placeholder="vd Hằng đẳng thức" /></label>
                  <label className="lbl">Số câu<input className="inp w-s" type="number" min={1} max={10} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} /></label>
                  <button className="btn" disabled={!gen.topic.trim() || !!busy} onClick={() => void generate()}>{busy === "gen" ? "AI đang soạn…" : "Soạn câu hỏi"}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
