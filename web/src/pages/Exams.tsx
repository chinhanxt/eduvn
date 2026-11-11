import { useCallback, useEffect, useState } from "react";
import { ApiError, aiSkill, api, errText, getLinks, type ExamSummary, type Links } from "../api";
import { Icon } from "../Icon";

type Cell = { topic: string; level: string; type: string; count: number; yccd?: string };
type Shortage = { cell: Cell; need: number; have: number };
type Created = { ok: true; examId: string; codes: string[]; questionCount: number } | { ok: false; shortages: Shortage[] };

const TYPES = [["mcq", "Trắc nghiệm"], ["true_false", "Đúng/sai"], ["short_answer", "Trả lời ngắn"]] as const;

export function Exams() {
  const [list, setList] = useState<ExamSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => {
    api<ExamSummary[]>("/api/exams").then(setList).catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <h1>Đề thi</h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setCreating((c) => !c)} data-testid="new-exam"><Icon name="plus" size={18} />Tạo đề</button>
      </div>
      {creating && <Create onCreated={load} />}
      <div className="card">
        {list?.length === 0 ? (
          <div className="empty">—</div>
        ) : (
          list?.map((e) => <ExamRow key={e.id} e={e} />)
        )}
      </div>
    </>
  );
}

function ExamRow({ e }: { e: ExamSummary }) {
  const [links, setLinks] = useState<Links | null>(null);
  return (
    <div className="item" style={{ alignItems: "flex-start" }}>
      <div className="ic blue" style={{ margin: 0, width: 38, height: 38 }}><Icon name="exam" /></div>
      <div className="grow">
        {e.title}
        <small>{e.subject} {e.grade} · {e.codes.length} mã đề · {new Date(e.createdAt).toLocaleDateString("vi-VN")}</small>
        {links && <LinkList links={links} />}
      </div>
      <button className="dl" style={{ border: 0 }} onClick={() => void getLinks(e.id).then(setLinks)} aria-label="Tải Word"><Icon name="down" /></button>
    </div>
  );
}

function LinkList({ links }: { links: Links }) {
  return (
    <div className="chips" style={{ marginTop: 8 }}>
      {links.exams.map((l) => <a key={l.code} className="tag" href={l.url} data-testid="dl-exam">{l.code}</a>)}
      <a className="tag green" href={links.answerKey} data-testid="dl-key">Đáp án</a>
      <a className="tag violet" href={links.matrix} data-testid="dl-matrix">Ma trận</a>
    </div>
  );
}

function Create({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState(10);
  const [variants, setVariants] = useState(2);
  const [duration, setDuration] = useState(45);
  const [cells, setCells] = useState<Cell[]>([{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 }]);
  const [result, setResult] = useState<Created | null>(null);
  const [links, setLinks] = useState<Links | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const askAi = async () => {
    setAiBusy(true);
    setError(null);
    setAiNote(null);
    try {
      const r = await aiSkill<{ title: string; durationMinutes: number; matrix: { subject: string; grade: number; cells: Cell[] }; report: { totalPoints: number; warnings: string[]; levelRatio: Record<string, { percent: number }> } }>("ma-tran", { description: aiText, subject: subject.trim() || undefined });
      setTitle(r.title);
      setSubject(r.matrix.subject);
      setGrade(r.matrix.grade);
      setDuration(r.durationMinutes);
      setCells(r.matrix.cells);
      setAiNote(`AI đã điền ma trận: ${r.matrix.cells.length} ô, tổng ${String(r.report.totalPoints).replace(".", ",")} điểm; NB ${r.report.levelRatio.NB?.percent ?? 0}% – TH ${r.report.levelRatio.TH?.percent ?? 0}% – VD ${r.report.levelRatio.VD?.percent ?? 0}%. ${r.report.warnings.join(" ")} Hãy kiểm tra, sửa rồi bấm Tạo.`);
    } catch (e) {
      setError(errText(e));
    } finally {
      setAiBusy(false);
    }
  };

  const setCell = (i: number, patch: Partial<Cell>) => setCells(cells.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setLinks(null);
    try {
      const r = await api<Created>("/api/exams", { method: "POST", body: { title, matrix: { subject, grade, cells }, variants, durationMinutes: duration } });
      setResult(r);
      if (r.ok) {
        setLinks(await getLinks(r.examId));
        onCreated();
      }
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 400 ? "Điền đủ tên đề và ma trận" : err.message) : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {error && <div className="err">{error}</div>}
      <div className="formrow" data-testid="ai-matrix">
        <label className="lbl" style={{ flex: 1 }}>AI lập ma trận + đặc tả (CV 7991) từ mô tả đề
          <input className="inp" style={{ width: "100%" }} placeholder="vd: Giữa kì 1 Toán 10, 45 phút, chủ đề Mệnh đề, Tập hợp, tỉ lệ NB 40% TH 30% VD 30%" value={aiText} onChange={(e) => setAiText(e.target.value)} data-testid="ai-matrix-text" />
        </label>
        <button className="btn" disabled={aiBusy || aiText.trim().length < 5} onClick={() => void askAi()} data-testid="ai-matrix-run"><Icon name="spark" size={18} />{aiBusy ? "Đang lập…" : "AI lập ma trận"}</button>
      </div>
      {aiNote && <div className="warn" data-testid="ai-matrix-note">{aiNote}</div>}
      <div className="formrow">
        <label className="lbl">Tên đề<input className="inp w-m" style={{ width: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="e-title" /></label>
        <label className="lbl">Môn<input className="inp w-m" value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value))} /></label>
        <label className="lbl">Số mã đề<input className="inp w-s" type="number" min={1} max={24} value={variants} onChange={(e) => setVariants(Number(e.target.value))} data-testid="e-variants" /></label>
        <label className="lbl">Phút<input className="inp w-s" type="number" min={5} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></label>
      </div>
      {cells.map((c, i) => (
        <div className="formrow" key={i} data-testid="cell">
          <label className="lbl">Chủ đề<input className="inp w-m" value={c.topic} onChange={(e) => setCell(i, { topic: e.target.value })} /></label>
          <label className="lbl">Mức
            <select className="inp" value={c.level} onChange={(e) => setCell(i, { level: e.target.value })}>
              <option value="NB">Nhận biết</option><option value="TH">Thông hiểu</option><option value="VD">Vận dụng</option>
            </select>
          </label>
          <label className="lbl">Loại
            <select className="inp" value={c.type} onChange={(e) => setCell(i, { type: e.target.value })}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="lbl">Số câu<input className="inp w-s" type="number" min={1} value={c.count} onChange={(e) => setCell(i, { count: Number(e.target.value) })} /></label>
          <label className="lbl">Yêu cầu cần đạt<input className="inp" style={{ width: 240 }} placeholder="tuỳ chọn" value={c.yccd ?? ""} onChange={(e) => setCell(i, { yccd: e.target.value })} data-testid="cell-yccd" /></label>
          <button className="btn ghost sm" disabled={cells.length === 1} onClick={() => setCells(cells.filter((_, j) => j !== i))} aria-label="Xoá dòng"><Icon name="trash" size={16} /></button>
        </div>
      ))}
      <div className="bar" style={{ marginBottom: 0 }}>
        <button className="btn ghost sm" onClick={() => setCells([...cells, { topic: cells[0]?.topic ?? "", level: "TH", type: "mcq", count: 1 }])}><Icon name="plus" size={16} />Dòng</button>
        <span className="sp" />
        <button className="btn" disabled={busy || !title.trim()} onClick={() => void submit()} data-testid="e-create"><Icon name="check" size={18} />Tạo</button>
      </div>
      {result && !result.ok && (
        <div className="err" style={{ marginTop: 14 }} data-testid="shortages">
          {result.shortages.map((s, i) => (
            <div key={i}>{s.cell.topic} · {s.cell.level} · {TYPES.find((t) => t[0] === s.cell.type)?.[1]}: có {s.have}/{s.need}</div>
          ))}
        </div>
      )}
      {result?.ok && links && (
        <div className="ok-box" style={{ marginTop: 14 }} data-testid="created">
          <b>{result.questionCount} câu</b>
          <div className="chips" style={{ marginTop: 8 }}>
            {links.exams.map((l) => <a key={l.code} className="tag" href={l.url} data-testid="dl-exam">{l.code}</a>)}
            <a className="tag green" href={links.answerKey} data-testid="dl-key">Đáp án</a>
            <a className="tag violet" href={links.matrix} data-testid="dl-matrix">Ma trận</a>
          </div>
        </div>
      )}
    </div>
  );
}
