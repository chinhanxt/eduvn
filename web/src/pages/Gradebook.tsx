import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { LEVELS, api, errText, exportClass, vn, type AttStatus, type ClassSummary, type Gradebook as Gb } from "../api";
import { Icon } from "../Icon";

type Tab = "diem" | "diem-danh" | "nhan-xet";
const ATT: { v: AttStatus; label: string }[] = [
  { v: "present", label: "Có mặt" },
  { v: "excused", label: "Vắng có phép" },
  { v: "unexcused", label: "Vắng không phép" },
];
const today = () => new Date().toISOString().slice(0, 10);

export function Gradebook() {
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [gb, setGb] = useState<Gb | null>(null);
  const [tab, setTab] = useState<Tab>("diem");
  const [term, setTerm] = useState<"HK1" | "HK2">("HK1");
  const [error, setError] = useState<string | null>(null);
  const id = params.get("lop") ?? classes?.[0]?.id ?? "";

  useEffect(() => {
    api<ClassSummary[]>("/api/classes").then(setClasses).catch((e: unknown) => setError(errText(e)));
  }, []);
  const load = useCallback(() => {
    if (!id) return;
    api<Gb>(`/api/classes/${id}/gradebook?term=${term}`).then(setGb).catch((e: unknown) => setError(errText(e)));
  }, [id, term]);
  useEffect(() => {
    setGb(null);
    load();
  }, [load]);

  return (
    <>
      <h1>Sổ điểm</h1>
      <div className="bar">
        <select className="inp" value={id} onChange={(e) => setParams({ lop: e.target.value })} aria-label="Lớp" data-testid="gb-class">
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.schoolYear}</option>)}
        </select>
        <div className="tabs">
          {([["diem", "Điểm"], ["diem-danh", "Điểm danh"], ["nhan-xet", "Nhận xét"]] as const).map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{l}</button>
          ))}
        </div>
        {tab === "diem" && (
          <div className="tabs" data-testid="term-toggle">
            {(["HK1", "HK2"] as const).map((t) => <button key={t} className={term === t ? "on" : ""} onClick={() => setTerm(t)} data-testid={`term-${t}`}>{t}</button>)}
          </div>
        )}
        <span className="sp" />
        <button className="btn" disabled={!id} onClick={() => void exportClass(id, "gradebook", term)} data-testid="export-gb"><Icon name="down" size={18} />Xuất Excel</button>
      </div>
      {error && <div className="err">{error}</div>}
      {classes?.length === 0 && <div className="card"><div className="empty">—</div></div>}
      {gb && gb.students.length === 0 && <div className="card"><div className="empty">—</div></div>}
      {gb && gb.students.length > 0 && tab === "diem" && <Scores gb={gb} term={term} reload={load} setError={setError} />}
      {gb && gb.students.length > 0 && tab === "diem-danh" && <Attendance gb={gb} reload={load} setError={setError} />}
      {gb && gb.students.length > 0 && tab === "nhan-xet" && <Comments gb={gb} term={term} setTerm={setTerm} reload={load} setError={setError} />}
    </>
  );
}

type P = { gb: Gb; reload: () => void; setError: (e: string | null) => void };

function Scores({ gb, term, reload, setError }: P & { term: "HK1" | "HK2" }) {
  const tt27 = gb.class.scale === "TT27";
  const [bad, setBad] = useState<string | null>(null);
  const save = async (sid: string, col: string, raw: string, old: number | undefined) => {
    if (raw.trim() === vn(old)) return;
    const key = `${sid}:${col}`;
    try {
      await api(`/api/classes/${gb.class.id}/scores`, { method: "PUT", body: { term, column: col, scores: { [sid]: raw } } });
      setBad(null);
      setError(null);
    } catch (e) {
      setBad(key);
      setError(errText(e));
    }
    reload();
  };
  return (
    <div className="card sgrid">
      <table data-testid="score-grid">
        <thead>
          <tr><th>STT</th><th>Họ và tên</th>{gb.columns.map((c) => <th key={c.name}>{c.name}<br /><small style={{ color: "var(--muted)" }}>×{c.weight}</small></th>)}{!tt27 && <th>ĐTB {term}</th>}{!tt27 && term === "HK2" && <th>ĐTB cả năm</th>}</tr>
        </thead>
        <tbody>
          {gb.students.map((s, i) => (
            <tr key={s.id}>
              <td>{i + 1}</td><td>{s.fullName}</td>
              {gb.columns.map((c) => (
                <td key={`${s.id}:${c.name}:${s.scores[c.name] ?? ""}`}>
                  <input
                    className={bad === `${s.id}:${c.name}` ? "bad" : ""}
                    defaultValue={vn(s.scores[c.name])}
                    inputMode={tt27 ? "numeric" : "decimal"}
                    aria-label={`${s.fullName} ${c.name}`}
                    data-testid={`sc-${i}-${c.name}`}
                    onBlur={(e) => void save(s.id, c.name, e.target.value, s.scores[c.name])}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
                </td>
              ))}
              {!tt27 && <td className="dtb" data-testid={`dtb-${i}`}>{vn(s.dtb)}</td>}
              {!tt27 && term === "HK2" && <td className="dtb" data-testid={`dtby-${i}`}>{vn(s.dtbYear)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Attendance({ gb, reload, setError }: P) {
  const [date, setDate] = useState(today());
  const [rec, setRec] = useState<Record<string, AttStatus>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(false);
    api<Record<string, AttStatus>>(`/api/classes/${gb.class.id}/attendance?date=${date}`).then(setRec).catch(() => setRec({}));
  }, [gb.class.id, date]);
  const save = async () => {
    const records: Record<string, string> = {};
    for (const s of gb.students) records[s.id] = rec[s.id] ?? "present";
    try {
      await api(`/api/classes/${gb.class.id}/attendance`, { method: "PUT", body: { date, records } });
      setSaved(true);
      setError(null);
      reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <div className="card">
      <div className="bar">
        <input type="date" className="inp" value={date} onChange={(e) => setDate(e.target.value)} data-testid="att-date" aria-label="Ngày" />
        <button className="btn ghost sm" onClick={() => setRec(Object.fromEntries(gb.students.map((s) => [s.id, "present" as AttStatus])))}>Tất cả có mặt</button>
        <span className="sp" />
        {saved && <span className="tag green">Đã lưu</span>}
        <button className="btn" onClick={() => void save()} data-testid="att-save"><Icon name="check" size={18} />Lưu</button>
      </div>
      <table data-testid="att-table">
        <thead><tr><th>STT</th><th>Họ và tên</th><th>Trạng thái</th><th>Vắng cả kỳ (P / K)</th></tr></thead>
        <tbody>
          {gb.students.map((s, i) => (
            <tr key={s.id}>
              <td>{i + 1}</td><td>{s.fullName}</td>
              <td>
                <select className="inp" value={rec[s.id] ?? ""} onChange={(e) => setRec({ ...rec, [s.id]: e.target.value as AttStatus })} aria-label={`Điểm danh ${s.fullName}`} data-testid={`att-${i}`}>
                  <option value="" disabled>—</option>
                  {ATT.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
                </select>
              </td>
              <td>{s.attendance.excused} / {s.attendance.unexcused}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Comments({ gb, term, setTerm, reload, setError }: P & { term: "HK1" | "HK2"; setTerm: (t: "HK1" | "HK2") => void }) {
  const levels = LEVELS[gb.class.scale];
  const [draft, setDraft] = useState<Record<string, { text: string; level: string }>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setDraft(Object.fromEntries(gb.students.map((s) => [s.id, s.comments[term] ?? { text: "", level: levels[0] }])));
    setSaved(false);
  }, [gb, term, levels]);
  const save = async () => {
    const items = gb.students
      .filter((s) => (draft[s.id]?.text ?? "").trim() !== "")
      .map((s) => ({ student: s.id, text: draft[s.id]?.text ?? "", level: draft[s.id]?.level ?? levels[0] }));
    try {
      await api(`/api/classes/${gb.class.id}/comments`, { method: "PUT", body: { term, items } });
      setSaved(true);
      setError(null);
      reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  const set = (sid: string, patch: Partial<{ text: string; level: string }>) => setDraft({ ...draft, [sid]: { text: "", level: levels[0], ...draft[sid], ...patch } });
  return (
    <div className="card">
      <div className="bar">
        <div className="tabs">
          {(["HK1", "HK2"] as const).map((t) => <button key={t} className={term === t ? "on" : ""} onClick={() => setTerm(t)}>{t === "HK1" ? "Học kỳ 1" : "Học kỳ 2"}</button>)}
        </div>
        <span className="tag violet">{gb.class.scale}</span>
        <span className="sp" />
        {saved && <span className="tag green">Đã lưu</span>}
        <button className="btn" onClick={() => void save()} data-testid="cm-save"><Icon name="check" size={18} />Lưu</button>
      </div>
      <table data-testid="cm-table">
        <thead><tr><th>STT</th><th>Họ và tên</th>{gb.class.scale !== "TT27" && <th>ĐTB</th>}<th>Nhận xét (20–400 ký tự)</th><th>Mức</th></tr></thead>
        <tbody>
          {gb.students.map((s, i) => (
            <tr key={s.id} className="cm-row">
              <td>{i + 1}</td><td>{s.fullName}</td>{gb.class.scale !== "TT27" && <td className="dtb">{vn(s.dtb)}</td>}
              <td><textarea className="cm" value={draft[s.id]?.text ?? ""} onChange={(e) => set(s.id, { text: e.target.value })} aria-label={`Nhận xét ${s.fullName}`} data-testid={`cm-${i}`} /></td>
              <td>
                <select className="inp" value={draft[s.id]?.level ?? levels[0]} onChange={(e) => set(s.id, { level: e.target.value })} aria-label={`Mức ${s.fullName}`} data-testid={`lv-${i}`}>
                  {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
