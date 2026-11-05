import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { api, dobVi, errText, exportClass, type ClassDetail, type ClassSummary } from "../api";
import { Icon } from "../Icon";

const schoolYearNow = () => {
  const d = new Date();
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};
const SCALE_VI = { TT22: "TT22", TT27: "TT27" } as const;

export function Classes() {
  const [rows, setRows] = useState<ClassSummary[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api<ClassSummary[]>("/api/classes").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <h1>Lớp & học viên</h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setAdding((a) => !a)} data-testid="new-class"><Icon name="plus" size={18} />Tạo lớp</button>
      </div>
      {error && <div className="err">{error}</div>}
      {adding && <NewClass onDone={() => { setAdding(false); load(); }} />}
      {rows?.length === 0 && !adding && <div className="card"><div className="empty">—</div></div>}
      <div className="cards" data-testid="class-cards">
        {rows?.map((c) => (
          <Link key={c.id} to={`/lop-hoc/${c.id}`} className="cls" data-testid="class-card">
            <div className="big">{c.name}</div>
            <div className="meta">{c.schoolYear}{c.subject ? ` · ${c.subject}` : ""}</div>
            <div className="cnt"><Icon name="users" size={18} />{c.studentCount}<span className="tag violet" style={{ marginLeft: "auto" }}>{SCALE_VI[c.scale]}</span></div>
          </Link>
        ))}
      </div>
    </>
  );
}

function NewClass({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(schoolYearNow());
  const [subject, setSubject] = useState("");
  const [scale, setScale] = useState("TT22");
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/classes", { method: "POST", body: { name, schoolYear: year, subject: subject || undefined, scale } });
      onDone();
    } catch (err) {
      setError(errText(err));
    }
  };
  return (
    <form className="card" style={{ marginBottom: 16 }} onSubmit={(e) => void submit(e)}>
      {error && <div className="err">{error}</div>}
      <div className="formrow">
        <label className="lbl">Lớp<input className="inp w-s" placeholder="10A1" value={name} onChange={(e) => setName(e.target.value)} data-testid="c-name" /></label>
        <label className="lbl">Năm học<input className="inp w-m" value={year} onChange={(e) => setYear(e.target.value)} data-testid="c-year" /></label>
        <label className="lbl">Môn<input className="inp w-m" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="c-subject" /></label>
        <label className="lbl">Thông tư
          <select className="inp" value={scale} onChange={(e) => setScale(e.target.value)} data-testid="c-scale">
            <option value="TT22">TT22 · THCS, THPT</option><option value="TT27">TT27 · Tiểu học</option>
          </select>
        </label>
        <button className="btn" data-testid="c-save"><Icon name="check" size={18} />Lưu</button>
      </div>
    </form>
  );
}

export function ClassDetailPage() {
  const { id = "" } = useParams();
  const [c, setC] = useState<ClassDetail | null>(null);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<ClassDetail>(`/api/classes/${id}`).then(setC).catch((e: unknown) => setError(errText(e)));
  }, [id]);
  useEffect(load, [load]);

  type AddResult = { added: number; warnings: string[] };
  const done = (r: AddResult) => {
    setWarnings(r.warnings);
    setNotice(`Đã thêm ${r.added} học viên`);
    setError(null);
    load();
  };
  const addText = async () => {
    try {
      done(await api<AddResult>(`/api/classes/${id}/students`, { method: "POST", body: { text } }));
      setText("");
      setPaste(false);
    } catch (e) {
      setError(errText(e));
    }
  };
  const upload = async (f: File) => {
    if (f.size > 2 * 1024 * 1024) {
      setError("File Excel quá lớn (tối đa 2 MB)");
      if (file.current) file.current.value = "";
      return;
    }
    const buf = new Uint8Array(await f.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    try {
      done(await api<AddResult>(`/api/classes/${id}/students/xlsx`, { method: "POST", body: { contentBase64: btoa(bin) } }));
    } catch (e) {
      setError(errText(e));
    }
    if (file.current) file.current.value = "";
  };
  const remove = async (sid: string) => {
    const who = c?.students.find((s) => s.id === sid)?.fullName ?? "học viên này";
    if (!confirm(`Xoá ${who}? Điểm, điểm danh và nhận xét của học viên cũng sẽ mất.`)) return;
    await api(`/api/classes/${id}/students/${sid}`, { method: "DELETE" }).catch((e: unknown) => setError(errText(e)));
    load();
  };

  if (!c) return error ? <div className="err">{error}</div> : null;
  return (
    <>
      <Link to="/lop-hoc" className="back"><Icon name="back" size={18} />Lớp học</Link>
      <h1>{c.name} <small style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>{c.schoolYear}{c.subject ? ` · ${c.subject}` : ""} · {c.scale}</small></h1>
      <div className="bar">
        <button className="btn ghost" onClick={() => setPaste((p) => !p)} data-testid="paste-toggle"><Icon name="clip" size={18} />Dán danh sách</button>
        <button className="btn ghost" onClick={() => file.current?.click()} data-testid="upload-btn"><Icon name="upload" size={18} />Tải Excel</button>
        <input ref={file} type="file" accept=".xlsx" hidden data-testid="upload-input" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        <span className="sp" />
        <Link to={`/so-diem?lop=${c.id}`} className="btn ghost" style={{ textDecoration: "none" }}><Icon name="grade" size={18} />Sổ điểm</Link>
        <button className="btn" onClick={() => void exportClass(c.id, "class_list")} data-testid="export-list"><Icon name="down" size={18} />Xuất Excel</button>
      </div>
      {error && <div className="err">{error}</div>}
      {notice && <div className="ok-box" data-testid="notice">{notice}</div>}
      {warnings.length > 0 && <div className="warn" data-testid="warnings">{warnings.join("\n")}</div>}
      {paste && (
        <div className="card" style={{ marginBottom: 16 }}>
          <textarea className="inp" placeholder={"Họ tên ; Ngày sinh ; Giới tính ; Ghi chú\nNguyễn Văn An ; 05/03/2010 ; Nam"} value={text} onChange={(e) => setText(e.target.value)} data-testid="paste-text" />
          <div style={{ marginTop: 12 }}><button className="btn" onClick={() => void addText()} data-testid="paste-save"><Icon name="check" size={18} />Thêm</button></div>
        </div>
      )}
      <div className="card">
        {c.students.length === 0 ? (
          <div className="empty">—</div>
        ) : (
          <table data-testid="student-table">
            <thead><tr><th>STT</th><th>Mã</th><th>Họ và tên</th><th>Ngày sinh</th><th>Giới tính</th><th>Ghi chú</th><th /></tr></thead>
            <tbody>
              {c.students.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td><td>{s.code}</td><td>{s.fullName}</td><td>{dobVi(s.dob)}</td><td>{s.gender}</td><td>{s.note}</td>
                  <td><button className="xbtn" onClick={() => void remove(s.id)} aria-label="Xoá"><Icon name="trash" size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
