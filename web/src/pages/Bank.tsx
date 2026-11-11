import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { aiSkill, type BankQuestion, type Question } from "../api";
import { blobToDataUrl, printSvg, svgToPngBlob } from "../geometry3d/figure";
import { FigureBuilder } from "../geometry3d/FigureBuilder";
import { MathEditor } from "../math/MathEditor";
import { MathText } from "../math/MathText";
import { SUBJECT_DEFAULT, FilterBar, FormPane, get, post, SearchBox, statusOf, errorOf, useListView, useOpenParam, useRun, gradeVi, useKeyN } from "../portal/gv/kit";
import { solutionStatus } from "../solution/api";
import { STATUS_TEXT, type VerifyStatus } from "../solution/types";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/components/Button";
import { Badge, Chip, Segmented } from "../ui/components/Chip";
import { Field, Input, Select } from "../ui/components/Field";
import { Skeleton } from "../ui/components/Skeleton";
import { type Column, Table } from "../ui/components/Table";
import { invalidate, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { PageHead } from "../ui/shell/PageHead";

// P13: lời giải từng bước (tải lười trình xem + KaTeX khi mở)
const SolutionDialog = lazy(() => import("../solution/SolutionDialog").then((m) => ({ default: m.SolutionDialog })));

const TYPE_LABEL: Record<Question["type"], string> = { mcq: "Trắc nghiệm", true_false: "Đúng/sai", short_answer: "Trả lời ngắn", essay: "Tự luận" };
const TYPES = Object.keys(TYPE_LABEL) as Question["type"][];
const LEVEL_VI = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng" } as const;
const LVL_CLS = { NB: "l1", TH: "l2", VD: "l3" } as const;
const LETTERS = "ABCD";
export const bankKey = (subject: string, grade: number) => `gv/ngan-hang/${subject}/${grade}`;
const GRADES = Array.from({ length: 16 }, (_, i) => i + 1);

/** /ngan-hang — mockup gv/ngan-hang.html: tab dạng câu · thanh lọc (môn, lớp, chủ đề, mức — trên URL) · bảng | xem trước. */
export function Bank() {
  usePageMeta("Ngân hàng câu hỏi");
  const [subject, setSubject] = useUrlState<string>("mon", SUBJECT_DEFAULT);
  const [grade, setGrade] = useUrlState<number>("lop", 10);
  const [type, setType] = useUrlState<string>("dang", "tat-ca", { mode: "push" });
  const [topics, setTopics] = useUrlState<string[]>("chu-de", []);
  const [levels, setLevels] = useUrlState<string[]>("muc", []);
  const [cur, setCur] = useUrlState<string>("cau", "");
  const [adding, setAdding] = useOpenParam();
  const [aiOpen, setAiOpen] = useOpenParam("ai");
  const [subj, setSubj] = useState(subject);
  useEffect(() => setSubj(subject), [subject]);
  const q = useQuery(bankKey(subject, grade), get<BankQuestion[]>(`/api/questions?subject=${encodeURIComponent(subject.trim() || "x")}&grade=${grade}&limit=2000`));
  const rows = q.data;
  const [solOf, setSolOf] = useState<Record<string, VerifyStatus>>({});
  const [solFor, setSolFor] = useState<BankQuestion | null>(null);
  useEffect(() => {
    if (rows?.length) solutionStatus(rows.map((x) => x.id)).then(setSolOf).catch(() => setSolOf({}));
  }, [rows]);
  useKeyN(() => setAdding(true));

  const byType = useMemo(() => {
    const m: Record<string, number> = { "tat-ca": rows?.length ?? 0 };
    for (const r of rows ?? []) m[r.type] = (m[r.type] ?? 0) + 1;
    return m;
  }, [rows]);
  const allTopics = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.topic, (m.get(r.topic) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const filter = useMemo(
    () => (r: BankQuestion) => (type === "tat-ca" || r.type === type) && (!topics.length || topics.includes(r.topic)) && (!levels.length || levels.includes(r.level)),
    [type, topics, levels],
  );
  const sorts = useMemo(() => ({ muc: (r: BankQuestion) => ({ NB: 1, TH: 2, VD: 3 })[r.level], "chu-de": (r: BankQuestion) => r.topic }), []);
  const v = useListView(rows, { text: (r) => `${r.stem} ${r.topic} ${r.id.slice(0, 8)}`, sorts, filter, pageSize: 20 });
  const sel = rows?.find((r) => r.id === cur) ?? v.rows[0] ?? null;
  const filtered = !!(v.q || topics.length || levels.length || type !== "tat-ca");
  const clear = () => (v.setQ(""), setTopics([]), setLevels([]), setType("tat-ca"));
  const reload = () => invalidate(bankKey(subject, grade));

  const cols: Column<BankQuestion>[] = [
    { key: "ma", header: "Mã", hideSm: true, width: 84, cell: (r) => <span className="mono muted" data-cur={sel?.id === r.id ? "1" : undefined}>Q-{r.id.slice(0, 4).toUpperCase()}</span> },
    {
      key: "cau",
      header: "Câu hỏi",
      cell: (r) => (
        <div className="q-cell">
          <div className="stem"><MathText value={r.stem} /></div>
          <span className="t-sub">{r.topic}{r.figure ? " · có hình" : ""}</span>
        </div>
      ),
    },
    { key: "muc", header: "Mức", sortable: true, width: 110, hideSm: true, cell: (r) => <span className={`lvl ${LVL_CLS[r.level]}`}>{LEVEL_VI[r.level]}</span> },
    { key: "dang", header: "Dạng", hideSm: true, width: 120, cell: (r) => <span className="caption">{TYPE_LABEL[r.type]}</span> },
    { key: "lg", header: "Lời giải", hideSm: true, width: 110, cell: (r) => (solOf[r.id] ? <Badge tone={solOf[r.id] === "verified" ? "ok" : solOf[r.id] === "mismatch" ? "warn" : "neutral"}>{solOf[r.id] === "verified" ? "Đã kiểm" : solOf[r.id] === "mismatch" ? "Lệch" : "Chưa kiểm"}</Badge> : <span className="muted">—</span>) },
  ];
  const tabs = (
    <nav className="tabs" aria-label="Dạng câu">
      {(["tat-ca", ...TYPES] as const).map((t) => (
        <a key={t} href={`?dang=${t}`} aria-current={type === t ? "page" : undefined} onClick={(e) => (e.preventDefault(), setType(t))}>
          {t === "tat-ca" ? "Tất cả" : TYPE_LABEL[t]}
          {rows && <span className="count">{(byType[t] ?? 0).toLocaleString("vi-VN")}</span>}
        </a>
      ))}
    </nav>
  );
  return (
    <>
      <PageHead title="Ngân hàng câu hỏi" tabs={tabs} primary={{ label: "Thêm câu", icon: "plus", kbd: "N", onClick: () => setAdding(true) }}>
        <Button size="sm" icon="spark" onClick={() => setAiOpen(!aiOpen)} data-testid="ai-q-open"><span className="hide-sm">AI soạn</span></Button>
      </PageHead>
      {aiOpen && <AiQuestions subject={subject} grade={grade} onClose={() => setAiOpen(false)} onSaved={reload} />}
      {adding && <AddForm subject={subject} grade={grade} topic={topics[0]} onClose={() => setAdding(false)} onDone={reload} />}
      <div className="split bank" style={{ marginTop: 0 }}>
        <section className="pane" aria-label="Danh sách câu hỏi">
          <FilterBar>
            <SearchBox value={v.q} onChange={v.setQ} placeholder="Tìm nội dung, mã câu…  /" label="Tìm câu hỏi" />
            <Input className="sm-in" aria-label="Môn" value={subj} onChange={(e) => setSubj(e.target.value)} onBlur={() => subj.trim() && subj !== subject && setSubject(subj.trim())} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} data-testid="f-subject" style={{ width: 110 }} />
            <Select aria-label="Lớp" value={grade} onChange={(e) => setGrade(Number(e.target.value))} data-testid="f-grade">
              {GRADES.map((g) => <option key={g} value={g}>{gradeVi(g)}</option>)}
            </Select>
            {(["NB", "TH", "VD"] as const).map((l) => <Chip key={l} pressed={levels.includes(l)} onClick={() => setLevels(levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l])}>{l}</Chip>)}
            <span className="grow" />
            {filtered && <Button variant="ghost" size="sm" onClick={clear}>Xoá lọc</Button>}
          </FilterBar>
          {allTopics.length > 1 && (
            <div className="fbar topics" aria-label="Chủ đề">
              {allTopics.slice(0, 12).map(([t, n]) => <Chip key={t} pressed={topics.includes(t)} count={n} onClick={() => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])}>{t}</Chip>)}
            </div>
          )}
          <div data-testid="q-table">
            <Table
              label="Câu hỏi"
              columns={cols}
              rows={v.rows}
              rowKey={(r) => r.id}
              status={statusOf(q) === "ok" && v.total === 0 ? "trong" : statusOf(q)}
              stale={q.stale}
              sort={v.sort}
              onSort={v.setSort}
              page={v.pageProp}
              onRowClick={(r) => setCur(r.id)}
              onRetry={q.refetch}
              error={errorOf(q.error)}
              skeletonRows={8}
              empty={rows?.length ? { icon: "search", title: "Không có câu nào khớp bộ lọc", text: "Thử bỏ bớt chủ đề hoặc mức độ.", action: <Button size="sm" onClick={clear}>Xoá lọc</Button> } : { icon: "bank", title: `Chưa có câu ${subject} ${gradeVi(grade).toLowerCase()}`, text: "Thêm câu thủ công hoặc để AI soạn theo yêu cầu cần đạt.", action: <Button size="sm" variant="primary" icon="spark" onClick={() => setAiOpen(true)}>AI soạn câu hỏi</Button> }}
            />
          </div>
        </section>
        <aside className="pane detail prev" aria-label="Xem trước">
          {sel ? <Preview key={sel.id} q={sel} sol={solOf[sel.id]} onSolution={() => setSolFor(sel)} /> : q.data ? <div className="empty"><div className="art"><Icon name="eye" size="lg" /></div><h3>Chọn một câu</h3><p>Nội dung, đáp án và lời giải hiện ở đây.</p></div> : <PreviewSkel />}
        </aside>
      </div>
      {solFor && (
        <Suspense fallback={null}>
          <SolutionDialog question={{ id: solFor.id, stem: solFor.stem }} onClose={() => setSolFor(null)} onStatus={(id, st) => setSolOf((m) => ({ ...m, [id]: st }))} />
        </Suspense>
      )}
    </>
  );
}

function PreviewSkel() {
  return (
    <div aria-hidden="true">
      <div className="dhd"><Skeleton w={120} h={10} /><Skeleton w="70%" h={16} style={{ marginTop: 8 }} /></div>
      <div style={{ padding: "14px 16px", display: "grid", gap: 8 }}><Skeleton w="100%" h={14} /><Skeleton w="86%" h={14} /><Skeleton w="60%" h={14} /></div>
      <div style={{ padding: "0 16px 14px", display: "grid", gap: 6 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} w="100%" h={32} />)}</div>
    </div>
  );
}

function Preview({ q, sol, onSolution }: { q: BankQuestion; sol?: VerifyStatus; onSolution: () => void }) {
  return (
    <div style={{ animation: "rise var(--dur-2) var(--ease-out) both" }}>
      <div className="dhd">
        <span className="mono">Q-{q.id.slice(0, 4).toUpperCase()}</span> <Badge>{TYPE_LABEL[q.type]}</Badge>
        <h2 style={{ marginTop: 6 }}>{q.topic}</h2>
      </div>
      <div className="stem-read"><MathText value={q.stem} /></div>
      {q.figure && <img className="q-fig" src={q.figure} alt="Hình vẽ kèm câu hỏi" />}
      {q.options && (
        <ul className="opts">
          {q.options.map((o, i) => (
            <li key={i} className={q.answer === i ? "ok" : undefined}>
              <b>{LETTERS[i]}</b><span><MathText value={o} /></span>{q.answer === i && <span className="pick"><Icon name="check" size="sm" />Đáp án</span>}
            </li>
          ))}
        </ul>
      )}
      {q.statements && (
        <ul className="opts">
          {q.statements.map((o, i) => {
            const t = Array.isArray(q.answer) ? q.answer[i] : undefined;
            return (
              <li key={i} className={t ? "ok" : undefined}>
                <b>{"abcd"[i]})</b><span><MathText value={o} /></span><span className="pick">{t ? "Đúng" : "Sai"}</span>
              </li>
            );
          })}
        </ul>
      )}
      {q.type === "short_answer" && <p className="note ok" style={{ margin: "0 16px 12px" }}>Đáp án: <MathText value={String(q.answer)} /></p>}
      {q.type === "essay" && q.rubric && <p className="note" style={{ margin: "0 16px 12px" }}>Hướng chấm ({q.points ?? 1} điểm): <MathText value={q.rubric} /></p>}
      <dl className="props" style={{ margin: 0, borderTop: "1px solid var(--line)" }}>
        <dt>Mức độ</dt><dd><span className={`lvl ${LVL_CLS[q.level]}`}>{LEVEL_VI[q.level]}</span></dd>
        <dt>Môn · lớp</dt><dd>{q.subject} · {gradeVi(q.grade)}</dd>
        <dt>Lời giải</dt><dd>{sol ? STATUS_TEXT[sol] : "Chưa có"}</dd>
        {q.explanation && <><dt>Giải thích</dt><dd><MathText value={q.explanation} /></dd></>}
      </dl>
      <div className="dact" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Button size="sm" variant="primary" icon={sol === "verified" ? "checkc" : "spark"} onClick={onSolution} data-testid="q-solution">{sol ? "Xem lời giải" : "Lời giải từng bước"}</Button>
      </div>
    </div>
  );
}

function AddForm({ subject, grade, topic: topic0, onClose, onDone }: { subject: string; grade: number; topic?: string; onClose: () => void; onDone: () => void }) {
  const run = useRun();
  const [topic, setTopic] = useState(topic0 ?? "");
  const [level, setLevel] = useState<"NB" | "TH" | "VD">("NB");
  const [formKey, setFormKey] = useState(0);
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [figure, setFigure] = useState<string | null>(null);
  const [figOpen, setFigOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    if (!topic.trim() || !stem.trim() || options.some((o) => !o.trim())) return void setErr("Điền chủ đề, câu hỏi và đủ 4 phương án.");
    setErr(null);
    return run(async () => {
      await post("/api/questions", { type: "mcq", subject, grade, topic: topic.trim(), level, stem, options, answer, ...(figure ? { figure } : {}) });
      setStem("");
      setFigure(null);
      setOptions(["", "", "", ""]);
      setAnswer(0);
      setFormKey((k) => k + 1);
      onDone();
    }, { title: "Đã thêm câu vào ngân hàng", msg: "Khung vẫn mở để thêm câu tiếp." });
  };
  return (
    <FormPane
      title="Thêm câu trắc nghiệm"
      sub={`${subject} · ${gradeVi(grade)}`}
      onClose={onClose}
      footer={<>{err && <span className="caption" style={{ color: "var(--danger)" }}>{err}</span>}<Button onClick={onClose}>Đóng</Button><Button variant="primary" icon="check" onClick={save} data-testid="q-save">Lưu câu</Button></>}
    >
      <div className="fgrid">
        <Field label="Chủ đề"><Input value={topic} placeholder="Hàm số bậc hai" onChange={(e) => setTopic(e.target.value)} data-testid="q-topic" /></Field>
        <div className="wide"><span className="lbl-sm">Mức độ</span><Segmented label="Mức độ" value={level} onChange={setLevel} options={(["NB", "TH", "VD"] as const).map((l) => ({ value: l, label: LEVEL_VI[l] }))} /></div>
      </div>
      <div>
        <span className="lbl-sm">Câu hỏi</span>
        <MathEditor key={`stem-${formKey}`} value={stem} onChange={setStem} placeholder="Câu hỏi — gõ $ để chèn công thức" testId="q-stem" />
      </div>
      <div className="row wrap">
        <Button size="sm" variant="ghost" icon="box" onClick={() => setFigOpen(true)} data-testid="q-figure">{figure ? "Dựng lại hình vẽ" : "Chèn hình không gian"}</Button>
        {figure && (
          <>
            <img className="q-fig" src={figure} alt="Hình vẽ kèm câu hỏi" data-testid="q-figure-img" />
            <Button size="sm" variant="ghost" onClick={() => setFigure(null)}>Bỏ hình</Button>
          </>
        )}
      </div>
      <div className="opt-edit" role="radiogroup" aria-label="Phương án và đáp án đúng">
        {options.map((o, i) => (
          <label key={i} className={answer === i ? "on" : undefined}>
            <input type="radio" name="ans" checked={answer === i} onChange={() => setAnswer(i)} aria-label={`Đáp án ${LETTERS[i]}`} />
            <b>{LETTERS[i]}</b>
            <div style={{ flex: 1, minWidth: 0 }}>
              <MathEditor key={`opt-${i}-${formKey}`} value={o} onChange={(val) => setOptions((p) => p.map((x, j) => (j === i ? val : x)))} placeholder={`Phương án ${LETTERS[i]}`} testId={`q-opt-${i}`} />
            </div>
          </label>
        ))}
        <span className="caption">Chọn ô tròn bên trái phương án đúng.</span>
      </div>
      {figOpen && (
        <div className="fg-modal" onClick={() => setFigOpen(false)}>
          <div className="fg-dlg" onClick={(e) => e.stopPropagation()}>
            <FigureBuilder
              initialProblem={stem.replace(/\$/g, "")}
              startWithAi={stem.trim().length > 20}
              doneLabel="Chèn vào câu hỏi"
              onCancel={() => setFigOpen(false)}
              onDone={async (r) => {
                const { svg, w, h } = printSvg(r.spec, r.view);
                setFigure(await blobToDataUrl(await svgToPngBlob(svg, w, h, 2)));
                setFigOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </FormPane>
  );
}

/** AI viết câu hỏi bám YCCĐ → xem trước → chọn câu → thêm vào ngân hàng. */
function AiQuestions({ subject, grade, onClose, onSaved }: { subject: string; grade: number; onClose: () => void; onSaved: () => void }) {
  const run = useRun();
  const [f, setF] = useState({ topic: "", yccd: "", level: "TH", type: "mcq", count: 3 });
  const [drafts, setDrafts] = useState<BankQuestion[]>([]);
  const [pick, setPick] = useState<string[]>([]);
  const [rejected, setRejected] = useState(0);
  const [busy, setBusy] = useState(false);
  const gen = () => {
    setBusy(true);
    return run(async () => {
      const r = await aiSkill<{ questions: BankQuestion[]; rejected: unknown[] }>("cau-hoi", { subject, grade, ...f, yccd: f.yccd.trim() || undefined });
      setDrafts(r.questions);
      setPick(r.questions.map((_, i) => String(i)));
      setRejected(r.rejected.length);
      return r;
    }, (r) => ({ title: `AI đã viết ${r.questions.length} câu`, msg: r.rejected.length ? `${r.rejected.length} câu lỗi đã bị loại` : "Xem lại rồi chọn câu muốn thêm", kind: "info" })).finally(() => setBusy(false));
  };
  const save = () =>
    run(async () => {
      const chosen = drafts.filter((_, i) => pick.includes(String(i)));
      for (const q of chosen) await post("/api/questions", q);
      setDrafts([]);
      onSaved();
      return chosen.length;
    }, (n) => `Đã thêm ${n} câu vào ngân hàng`);
  return (
    <FormPane
      title="AI soạn câu hỏi theo yêu cầu cần đạt"
      sub={`${subject} · ${gradeVi(grade)}`}
      onClose={onClose}
      testId="ai-q-form"
      footer={
        drafts.length > 0 ? (
          <>
            {rejected > 0 && <span className="caption">{rejected} câu AI viết lỗi đã bị loại</span>}
            <Button onClick={gen}>Viết lại</Button>
            <Button variant="primary" icon="check" disabled={!pick.length} onClick={save} data-testid="ai-q-save">Thêm {pick.length} câu vào ngân hàng</Button>
          </>
        ) : (
          <>
            <span className="caption">Bỏ trống YCCĐ: AI tự lấy theo CT GDPT 2018</span>
            <Button variant="primary" icon="spark" disabled={!f.topic.trim()} onClick={gen} data-testid="ai-q-run">Viết câu hỏi</Button>
          </>
        )
      }
    >
      <div className="fgrid">
        <Field label="Chủ đề"><Input value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} data-testid="ai-q-topic" /></Field>
        <div className="wide"><Field label="Yêu cầu cần đạt"><Input placeholder="tuỳ chọn" value={f.yccd} onChange={(e) => setF({ ...f, yccd: e.target.value })} /></Field></div>
        <Field label="Mức"><Select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>{(["NB", "TH", "VD"] as const).map((l) => <option key={l} value={l}>{LEVEL_VI[l]}</option>)}</Select></Field>
        <Field label="Dạng"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}<option value="mix">Nhiều dạng</option></Select></Field>
        <Field label="Số câu"><Input type="number" min={1} max={10} value={f.count} onChange={(e) => setF({ ...f, count: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} /></Field>
      </div>
      {busy && drafts.length === 0 && (
        <div className="ai-run" aria-busy="true">
          <div className="row"><Badge tone="accent" icon="spark">AI đang viết</Badge><span className="caption">{f.count} câu · thường 20–60 giây</span></div>
          <div className="stream-bar" />
          {Array.from({ length: Math.min(3, f.count) }, (_, i) => <Skeleton key={i} w={`${[86, 72, 64][i]}%`} h={12} />)}
        </div>
      )}
      {drafts.length > 0 && (
        <div className="pick-list">
          {drafts.map((q, i) => (
            <label key={i} className="pick" style={{ alignItems: "flex-start" }} data-testid="ai-q-draft">
              <input type="checkbox" checked={pick.includes(String(i))} onChange={() => setPick(pick.includes(String(i)) ? pick.filter((x) => x !== String(i)) : [...pick, String(i)])} aria-label={`Chọn câu ${i + 1}`} style={{ marginTop: 3 }} />
              <span className="g">
                <span className="row" style={{ gap: 6, marginBottom: 4 }}><Badge>{TYPE_LABEL[q.type]}</Badge><span className={`lvl ${LVL_CLS[q.level]}`}>{q.level}</span></span>
                <span style={{ display: "block" }}><MathText value={q.stem} /></span>
                {q.options?.map((o, j) => <span key={j} style={{ display: "block", color: q.answer === j ? "var(--ok)" : undefined }}>{LETTERS[j]}. <MathText value={o} /></span>)}
                {q.statements?.map((o, j) => <span key={j} style={{ display: "block" }}>{"abcd"[j]}) <MathText value={o} /> — {(q.answer as boolean[])[j] ? "Đúng" : "Sai"}</span>)}
                {q.type === "short_answer" && <span style={{ display: "block" }}>Đáp án: <MathText value={String(q.answer)} /></span>}
                {q.type === "essay" && <span style={{ display: "block" }}>Thang chấm: <MathText value={q.rubric ?? ""} /> ({q.points} điểm)</span>}
              </span>
            </label>
          ))}
        </div>
      )}
    </FormPane>
  );
}
