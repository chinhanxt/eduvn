// Kho tri thức (cổng GV): mỗi lớp/môn một kho tài liệu (PDF/DOCX/ghi chú/giáo án) → gia sư, giáo trình và AI soạn câu hỏi dùng chung.
// Cùng API với bản cũ (hoc/KhoTriThuc: /api/tutor/kbs, /drafts, /questions/generate); chỉ đổi giao diện theo chuẩn đẹp cổng GV.
import { useCallback, useEffect, useState } from "react";
import { api, errText } from "../../api";
import { type Kb, type KbDoc, toBase64, tutorApi } from "../../hoc/client";
import { MathText } from "../../math/MathText";
import { Icon } from "../../ui/Icon";
import { Button, IconButton } from "../../ui/components/Button";
import { Skeleton } from "../../ui/components/Skeleton";
import { PageHead } from "../../ui/shell/PageHead";
import { Art, artFor, EmptyHero } from "./Preview";
import "./gv.css";

type KbFull = Kb & { docs: KbDoc[] };
type Hit = { doc: string; page: number; score: number; text: string };
type Draft = { id: string; topic: string; body: { type: string; stem: string; level: string; options?: string[]; statements?: string[]; answer?: unknown; explanation?: string; rubric?: string } };
type LessonRow = { id: string; title: string };

const SRC = { upload: "Tệp tải lên", lesson: "Giáo án", text: "Ghi chú" } as const;
const LEVEL_VI: Record<string, string> = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng", VDC: "Vận dụng cao" };
const SAMPLE_KB = [
  { name: "Sinh học 8 · Cô Lan", subject: "Sinh học", grade: 8, docs: 12 },
  { name: "Lịch sử 12 · Kháng chiến", subject: "Lịch sử", grade: 12, docs: 9 },
  { name: "Ngữ văn 11 · Nghị luận", subject: "Ngữ văn", grade: 11, docs: 15 },
  { name: "Hoá học 10", subject: "Hoá học", grade: 10, docs: 7 },
];

const SAMPLE_DOCS: [string, string, string, string][] = [
  ["SGK Khoa học tự nhiên 8 — phần Sinh.pdf", "upload", "pdf", "Tệp tải lên · 214 trang · 380k chữ"],
  ["Bài 24 · Quang hợp ở cây xanh", "lesson", "GA", "Giáo án · 6 trang · 9k chữ"],
  ["Thí nghiệm lá khoai lang với iốt", "text", "GC", "Ghi chú · 1 trang · 2k chữ"],
  ["Đề kiểm tra giữa kì I — Sinh 8.docx", "upload", "docx", "Tệp tải lên · 4 trang · 6k chữ"],
];

function Shelf({ name, subject, grade, docs, on, onClick }: { name: string; subject: string; grade: number; docs: number; on?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      <span className="kb-art"><Art name={artFor(subject)} /></span>
      <span className="kb-t">
        <b>{name}</b>
        <small>{subject} · lớp {grade}</small>
      </span>
      <span className="kb-n" title={`${docs} tài liệu`}>{docs}<Icon name="clip" size="sm" /></span>
    </>
  );
  return onClick ? (
    <button type="button" className="kb-row" aria-current={on || undefined} onClick={onClick}>{inner}</button>
  ) : (
    <div className="kb-row">{inner}</div>
  );
}

function NewKb({ form, setForm, busy, onCreate, big }: { form: { name: string; subject: string; grade: number }; setForm: (f: { name: string; subject: string; grade: number }) => void; busy: boolean; onCreate: () => Promise<unknown>; big?: boolean }) {
  return (
    <form className={big ? "kb-new big" : "kb-new"} onSubmit={(e) => { e.preventDefault(); if (form.name.trim() && !busy) void onCreate(); }}>
      <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên kho" aria-label="Tên kho" data-testid="kb-name" />
      <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Môn" aria-label="Môn" />
      <input className="input num" type="number" min={1} max={16} value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })} aria-label="Lớp" title="Lớp" />
      <Button type="submit" variant="primary" icon="plus" disabled={!form.name.trim() || !form.subject.trim() || busy}>Tạo kho</Button>
    </form>
  );
}

export function KhoTriThuc() {
  const [kbs, setKbs] = useState<Kb[] | null>(null);
  const [kb, setKb] = useState<KbFull | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", grade: 10 });
  const [note, setNote] = useState("");
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [gen, setGen] = useState({ topic: "", count: 5 });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocr, setOcr] = useState<{ name: string; done: number; total: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState(false);

  const loadKbs = useCallback(() => tutorApi<Kb[]>("/kbs").then(setKbs).catch((e: unknown) => (setError(errText(e)), setKbs([]))), []);
  const loadDrafts = useCallback(() => tutorApi<Draft[]>("/drafts").then(setDrafts).catch(() => {}), []);
  const open = useCallback((id: string) => tutorApi<KbFull>(`/kbs/${id}`).then((k) => (setKb(k), setHits(null))).catch((e: unknown) => setError(errText(e))), []);
  useEffect(() => {
    void loadKbs();
    void loadDrafts();
    api<LessonRow[]>("/api/lessons").then(setLessons).catch(() => {});
  }, [loadKbs, loadDrafts]);
  // Có kho mà chưa chọn → mở kho đầu tiên (màn không bao giờ có nửa phải trống).
  useEffect(() => {
    if (kbs?.[0] && !kb) void open(kbs[0].id);
  }, [kbs, kb, open]);

  useEffect(() => {
    if (busy !== "up" || !kb) return setOcr(null);
    const id = kb.id;
    const t = setInterval(() => void tutorApi<{ ocr: { name: string; done: number; total: number } | null }>(`/kbs/${id}/ocr`).then((r) => setOcr(r.ocr)).catch(() => {}), 1000);
    return () => clearInterval(t);
  }, [busy, kb?.id]);

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
    setAdding(false);
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
    setOk(`AI đã soạn ${r.created} câu, chờ duyệt bên dưới.`);
  });
  const decide = (id: string, approve: boolean) => run("dec", async () => {
    await tutorApi(`/drafts/${id}/${approve ? "approve" : "reject"}`, { method: "POST", body: {} });
    await loadDrafts();
  });

  const empty = kbs !== null && kbs.length === 0;
  return (
    <div className="kb-root">
      <PageHead title="Kho tri thức" primary={empty ? undefined : { label: "Tạo kho", icon: "plus", onClick: () => setAdding((a) => !a) }}>
        {kbs && kbs.length > 0 && <span className="caption hide-sm">{kbs.length} kho · {kbs.reduce((n, k) => n + k.docCount, 0)} tài liệu</span>}
      </PageHead>
      {error && <div className="note err" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {ok && <div className="note ok" role="status" style={{ marginBottom: 16 }}>{ok}</div>}

      {kbs === null && <div className="kb-layout"><div className="kb-list">{[0, 1, 2].map((i) => <Skeleton key={i} h={56} style={{ borderRadius: 8 }} />)}</div><Skeleton h={320} style={{ borderRadius: 10 }} /></div>}

      {empty && (
        <EmptyHero title="Tài liệu của thầy cô, AI đọc hết" action={<NewKb form={form} setForm={setForm} busy={!!busy} onCreate={createKb} big />} tag="Ví dụ kho" className="kb-empty">
          <div className="kb-layout">
            <div className="kb-list">{SAMPLE_KB.map((k, i) => <Shelf key={k.name} {...k} on={i === 0} onClick={() => undefined} />)}</div>
            <div className="kb-detail">
              <header className="kb-hd">
                <span className="kb-art lg"><Art name="la" /></span>
                <div className="grow"><h2>{SAMPLE_KB[0]!.name}</h2><small>Sinh học · lớp 8 · 12 tài liệu</small></div>
              </header>
              <ul className="kb-docs">
                {SAMPLE_DOCS.map(([n, src, ext, sub]) => (
                  <li key={n}><span className={`kb-ext ${src}`}>{ext}</span><span className="grow"><b>{n}</b><small>{sub}</small></span></li>
                ))}
              </ul>
            </div>
          </div>
        </EmptyHero>
      )}

      {kbs && kbs.length > 0 && (
        <div className="kb-layout">
          <nav className="kb-list" aria-label="Các kho">
            {adding && <NewKb form={form} setForm={setForm} busy={!!busy} onCreate={createKb} />}
            {kbs.map((k) => <Shelf key={k.id} name={k.name} subject={k.subject} grade={k.grade} docs={k.docCount} on={kb?.id === k.id} onClick={() => void open(k.id)} />)}
          </nav>

          <section className="kb-detail" aria-label={kb?.name ?? "Kho"}>
            {!kb ? (
              <Skeleton h={320} style={{ borderRadius: 10 }} />
            ) : (
              <>
                <header className="kb-hd">
                  <span className="kb-art lg"><Art name={artFor(kb.subject)} /></span>
                  <div className="grow">
                    <h2>{kb.name}</h2>
                    <small>{kb.subject} · lớp {kb.grade} · {kb.docs.length} tài liệu</small>
                  </div>
                  <IconButton icon="trash" label="Xoá kho" onClick={() => void delKb()} />
                </header>

                <label
                  className={drag ? "kb-drop on" : "kb-drop"}
                  onDragOver={(e) => (e.preventDefault(), setDrag(true))}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); }}
                  aria-busy={busy === "up" || undefined}
                >
                  <Icon name="upload" />
                  <span>{busy === "up" ? (ocr ? `AI đang đọc ảnh ${ocr.done}/${ocr.total} trang…` : "Đang lập chỉ mục…") : <>Thả tài liệu vào đây <small>PDF · DOCX · TXT · MD</small></>}</span>
                  {busy === "up" && ocr && <i className="kb-bar" style={{ ["--v" as string]: `${(ocr.done / Math.max(1, ocr.total)) * 100}%` }} data-testid="kb-ocr" />}
                  <input type="file" hidden multiple accept=".pdf,.docx,.txt,.md" onChange={(e) => void upload(e.target.files)} data-testid="kb-upload" />
                </label>

                {kb.docs.length > 0 ? (
                  <ul className="kb-docs">
                    {kb.docs.map((d) => (
                      <li key={d.id}>
                        <span className={`kb-ext ${d.source}`}>{d.source === "upload" ? (d.name.split(".").pop() ?? "tệp").slice(0, 4) : d.source === "lesson" ? "GA" : "GC"}</span>
                        <span className="grow"><b>{d.name}</b><small>{SRC[d.source as keyof typeof SRC] ?? d.source} · {d.pages} trang · {Math.round(d.chars / 1000)}k chữ</small></span>
                        <IconButton icon="trash" size="sm" label={`Xoá ${d.name}`} onClick={() => void delDoc(d.id)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="kb-muted">Kho chưa có tài liệu.</p>
                )}

                <div className="kb-more">
                  {lessons.length > 0 && (
                    <select className="select" value="" onChange={(e) => e.target.value && void addLesson(e.target.value)} aria-label="Thêm giáo án">
                      <option value="">Thêm từ giáo án…</option>
                      {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  )}
                  <div className="kb-note">
                    <textarea className="textarea" placeholder="Hoặc dán ghi chú, đoạn kiến thức…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} aria-label="Ghi chú" />
                    {note.trim().length > 0 && <Button size="sm" disabled={note.trim().length < 20 || !!busy} onClick={() => addNote()}>Thêm vào kho</Button>}
                  </div>
                </div>

                <div className="kb-tools">
                  <form className="kb-tool" onSubmit={(e) => { e.preventDefault(); void search(); }}>
                    <h3><Icon name="search" size="sm" />Thử tìm trong kho</h3>
                    <div className="row">
                      <input className="input" placeholder="vd: pha sáng của quang hợp" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm trong kho" />
                      <Button type="submit" disabled={!q.trim()}>Tìm</Button>
                    </div>
                    {hits?.map((h, i) => <div className="kb-hit" key={i}><span>{h.doc} · tr. {h.page}</span><p>{h.text.slice(0, 200)}</p></div>)}
                    {hits?.length === 0 && <p className="kb-muted">Không thấy đoạn nào.</p>}
                  </form>
                  <form className="kb-tool" onSubmit={(e) => { e.preventDefault(); if (gen.topic.trim() && !busy) void generate(); }}>
                    <h3><Icon name="spark" size="sm" />AI soạn câu hỏi từ kho</h3>
                    <div className="row">
                      <input className="input" value={gen.topic} onChange={(e) => setGen({ ...gen, topic: e.target.value })} placeholder="Chủ đề" aria-label="Chủ đề" />
                      <input className="input num" type="number" min={1} max={10} value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} aria-label="Số câu" title="Số câu" />
                      <Button type="submit" variant="primary" disabled={!gen.topic.trim() || !!busy}>{busy === "gen" ? "AI đang soạn…" : "Soạn"}</Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {drafts.length > 0 && (
        <section className="kb-drafts" aria-label="Câu hỏi chờ duyệt">
          <h3 className="gt-sec">Chờ duyệt vào ngân hàng <span>{drafts.length}</span></h3>
          {drafts.map((d) => (
            <article key={d.id} className="kb-draft">
              <div className="grow">
                <div className="meta"><span>{d.topic}</span><span>{LEVEL_VI[d.body.level] ?? d.body.level}</span></div>
                <div className="stem"><MathText value={d.body.stem} /></div>
                {d.body.options && <ol className="opts">{d.body.options.map((o, i) => <li key={i} className={d.body.answer === i ? "ok" : undefined}><MathText value={o} /></li>)}</ol>}
                {d.body.statements && <ol className="opts st">{d.body.statements.map((o, i) => <li key={i}><MathText value={o} /> <em>{(d.body.answer as boolean[])[i] ? "Đúng" : "Sai"}</em></li>)}</ol>}
                {typeof d.body.answer === "string" && <p className="ans">Đáp án: <MathText value={d.body.answer} /></p>}
                {d.body.explanation && <p className="ans">Lời giải: <MathText value={d.body.explanation} /></p>}
              </div>
              <div className="acts">
                <Button size="sm" variant="primary" icon="check" onClick={() => decide(d.id, true)}>Duyệt</Button>
                <Button size="sm" variant="ghost" onClick={() => decide(d.id, false)}>Bỏ</Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
