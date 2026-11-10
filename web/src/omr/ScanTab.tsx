import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { type ExamSummary, type KeyEntry, api } from "../api";
import { Icon } from "../Icon";
import { type GroupRead, PX_MM, type Warped, assemble, loadCv, readGroups, warpPage } from "./decode";
import { fileToImageData } from "./image";
import { type Group, type Template, buildTemplate } from "./template";

type Sheet = {
  key: string;
  name: string;
  examId: string;
  code: string;
  qrOk: boolean;
  template: Template;
  pages: Record<number, { warped: Warped; reads: GroupRead[] }>;
  overrides: Record<string, number>;
  sbd: string | null;
};
type Grade = { total: number; autoMax: number; items: { no: number; points: number | null }[] };
type Saved = { id: string; kind: string; student: string; title: string; total: number; max: number; createdAt: string };

const num = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);

function groupName(g: Group): string {
  if (g.kind === "id") return `Số báo danh, cột ${g.sub + 1}`;
  if (g.kind === "mcq") return `Câu ${g.no}`;
  if (g.kind === "tf") return `Câu ${g.no}, ý ${"abcd"[g.sub]}`;
  return `Câu ${g.no}, cột ${g.sub + 1}`;
}

export function ScanTab({ exams, examId }: { exams: ExamSummary[]; examId: string }) {
  const [code, setCode] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const keyCache = useRef(new Map<string, Promise<{ code: string; entries: KeyEntry[] }[]>>());
  const exam = exams.find((e) => e.id === examId);
  const codes = exam?.codes ?? [];
  useEffect(() => setCode(codes[0] ?? ""), [examId]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadSaved = () => api<Saved[]>("/api/photo/results?kind=omr").then(setSaved).catch(() => setSaved([]));
  useEffect(() => void loadSaved(), []);

  const keysOf = (id: string) => {
    if (!keyCache.current.has(id)) keyCache.current.set(id, api(`/api/exams/${id}/key`));
    return keyCache.current.get(id)!;
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    try {
      setBusy("Đang tải OpenCV…");
      const cv = await loadCv();
      let acc = sheets;
      for (const [i, f] of [...files].entries()) {
        setBusy(`Đang quét ảnh ${i + 1}/${files.length}…`);
        await new Promise((r) => setTimeout(r, 20));
        try {
          const warped = warpPage(cv, await fileToImageData(f));
          const exId = warped.qr?.examId ?? examId;
          const cd = warped.qr?.code ?? code;
          const page = warped.qr?.page ?? 0;
          const k = (await keysOf(exId)).find((x) => x.code === cd);
          if (!k) throw new Error(`Không có mã đề ${cd}`);
          const template = buildTemplate(k.entries, { title: exams.find((e) => e.id === exId)?.title ?? "", code: cd });
          const part = { warped, reads: readGroups(warped, template, page) };
          const last = acc[acc.length - 1];
          if (page > 0 && last && last.examId === exId && last.code === cd && !last.pages[page]) {
            acc = acc.map((s) => (s === last ? { ...s, pages: { ...s.pages, [page]: part } } : s));
          } else {
            acc = [...acc, { key: `${Date.now()}-${i}`, name: f.name, examId: exId, code: cd, qrOk: !!warped.qr, template, pages: { [page]: part }, overrides: {}, sbd: null }];
          }
          setSheets(acc);
        } catch (e) {
          setErr(`${f.name}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="bar" style={{ margin: 0 }}>
          <select className="inp" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Mã đề mặc định" data-testid="s-code">
            {codes.map((c) => <option key={c} value={c}>Mã đề {c} (nếu không đọc được QR)</option>)}
          </select>
          <label className="btn" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={18} />Chụp / chọn ảnh phiếu
            <input type="file" accept="image/*" multiple capture="environment" hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} data-testid="s-file" />
          </label>
          {busy && <span className="tag amber" data-testid="s-busy">{busy}</span>}
        </div>
        <small style={{ color: "var(--muted)" }}>Chụp cả tờ phiếu, thấy đủ 4 ô vuông đen ở góc. Ảnh xử lý ngay trong trình duyệt, không gửi ảnh lên máy chủ.</small>
      </div>
      {err && <div className="err">{err}</div>}
      {sheets.map((s) => (
        <SheetCard key={s.key} sheet={s} onChange={(n) => setSheets((l) => l.map((x) => (x.key === s.key ? n : x)))} onRemove={() => setSheets((l) => l.filter((x) => x.key !== s.key))} onSaved={() => void loadSaved()} />
      ))}
      <SavedList rows={saved} onChange={() => void loadSaved()} />
    </>
  );
}

function SheetCard({ sheet, onChange, onRemove, onSaved }: { sheet: Sheet; onChange: (s: Sheet) => void; onRemove: () => void; onSaved: () => void }) {
  const [grade, setGrade] = useState<Grade | null>(null);
  const [done, setDone] = useState("");
  const [open, setOpen] = useState(false);
  const pageOf = (g: Group) => sheet.pages[g.page];
  const pick = (g: Group) => sheet.overrides[g.id] ?? pageOf(g)?.reads.find((r) => r.id === g.id)?.pick ?? -1;
  const asm = useMemo(() => assemble(sheet.template, pick), [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  const sbd = sheet.sbd ?? asm.sbd;
  const doubts = sheet.template.groups.filter((g) => pageOf(g)?.reads.find((r) => r.id === g.id)?.state === "doubt");
  const missing = sheet.template.pages - Object.keys(sheet.pages).length;
  const edited = Object.keys(sheet.overrides).length;
  const respKey = JSON.stringify(asm.responses);

  useEffect(() => {
    setDone("");
    const t = setTimeout(() => {
      api<Grade>(`/api/exams/${sheet.examId}/grade`, { method: "POST", body: { code: sheet.code, responses: asm.responses } }).then(setGrade).catch(() => setGrade(null));
    }, 250);
    return () => clearTimeout(t);
  }, [respKey, sheet.examId, sheet.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    await api("/api/photo/omr", { method: "POST", body: { examId: sheet.examId, code: sheet.code, student: sbd, responses: asm.responses, doubts: doubts.length, edited } });
    setDone("Đã lưu");
    onSaved();
  };
  const choose = (g: Group, v: number) => onChange({ ...sheet, overrides: { ...sheet.overrides, [g.id]: v } });

  return (
    <div className="card" style={{ marginBottom: 16 }} data-testid="s-sheet">
      <div className="bar" style={{ marginBottom: 8 }}>
        <b>{sheet.name}</b>
        <span className="tag">Mã đề {sheet.code}</span>
        {!sheet.qrOk && <span className="tag amber">Không đọc được QR — dùng mã đề đã chọn</span>}
        {missing > 0 && <span className="tag amber">Thiếu {missing} trang</span>}
        <span className="sp" />
        <label className="lbl" style={{ gridAutoFlow: "column", alignItems: "center" }}>SBD
          <input className="inp w-m" value={sbd} onChange={(e) => onChange({ ...sheet, sbd: e.target.value })} data-testid="s-sbd" />
        </label>
        {grade && <span className="score" data-testid="s-total">{num(grade.total)}<small style={{ fontSize: 16, color: "var(--muted)" }}> / {num(grade.autoMax)}</small></span>}
        <button className="btn" onClick={() => void save()} disabled={!grade} data-testid="s-save"><Icon name="check" size={18} />Lưu điểm</button>
        <button className="xbtn" onClick={onRemove} aria-label="Bỏ phiếu"><Icon name="trash" size={18} /></button>
      </div>
      {done && <div className="ok-box">{done}</div>}
      {doubts.length > 0 ? (
        <>
          <p style={{ margin: "8px 0" }}><b data-testid="s-doubts">{doubts.length} ô nghi vấn</b> — bấm chọn đáp án đúng theo ảnh cắt (đã sửa {edited}).</p>
          <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {doubts.map((g) => {
              const part = pageOf(g)!;
              const read = part.reads.find((r) => r.id === g.id)!;
              const cur = pick(g);
              return (
                <div key={g.id} className="card" style={{ padding: 12, boxShadow: "none", border: "1px solid var(--line)" }} data-testid="s-doubt">
                  <div><b>{groupName(g)}</b> <span className="tag amber">{read.reason}</span></div>
                  <Crop warped={part.warped} g={g} />
                  <div className="chips">
                    {g.labels.map((l, i) => (
                      <button key={l + i} className={cur === i ? "chip on" : "chip"} onClick={() => choose(g, i)} title={`${Math.round(read.fills[i]! * 100)}% đậm`}>{l}</button>
                    ))}
                    <button className={cur === -1 ? "chip on" : "chip"} onClick={() => choose(g, -1)}>Trống</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ color: "var(--muted)", margin: "8px 0" }}>Không có ô nghi vấn.</p>
      )}
      <button className="btn ghost sm" onClick={() => setOpen(!open)} style={{ marginTop: 10 }}>{open ? "Ẩn" : "Xem"} đáp án đã đọc</button>
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {grade?.items.map((it) => {
            const r = asm.responses[it.no];
            const shown = typeof r === "number" ? "ABCD"[r] : Array.isArray(r) ? r.map((b) => (b === null ? "·" : b ? "Đ" : "S")).join("") : (r ?? "—");
            return <span key={it.no} className={it.points ? "tag green" : "tag amber"}>{it.no}: {shown}</span>;
          })}
        </div>
      )}
    </div>
  );
}

/** Ảnh cắt vùng một nhóm ô từ phiếu đã nắn. */
function Crop({ warped, g }: { warped: Warped; g: Group }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const [x0, y0, x1, y1] = g.box.map((v) => Math.max(0, Math.round(v * PX_MM))) as [number, number, number, number];
    const w = Math.min(warped.w, x1) - x0;
    const h = Math.min(warped.h, y1) - y0;
    const c = ref.current;
    if (!c || w <= 0 || h <= 0) return;
    c.width = w;
    c.height = h;
    const img = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = warped.gray[(y0 + y) * warped.w + x0 + x]!;
        const o = (y * w + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
        img.data[o + 3] = 255;
      }
    }
    c.getContext("2d")!.putImageData(img, 0, 0);
  }, [warped, g]);
  return <canvas ref={ref} style={{ width: "100%", maxHeight: 240, objectFit: "contain", background: "#fff", borderRadius: 8, margin: "8px 0" }} />;
}

type Roster = { id: string; name: string; columns: { name: string }[]; students: { id: string; code: string | null; fullName: string }[] };

/** Chọn lớp + cột + học sinh (tự khớp SBD với mã học sinh) rồi ghi điểm thang 10 vào sổ điểm. */
function GradebookPanel({ row }: { row: Saved }) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [column, setColumn] = useState("");
  const [term, setTerm] = useState("HK1");
  const [msg, setMsg] = useState("");
  useEffect(() => void api<{ id: string; name: string }[]>("/api/classes").then(setClasses).catch(() => setClasses([])), []);
  useEffect(() => {
    setRoster(null);
    if (!classId) return;
    void api<Roster>(`/api/classes/${classId}`).then((r) => {
      setRoster(r);
      setColumn(r.columns[0]?.name ?? "");
      setStudentId(r.students.find((s) => s.code && s.code === row.student.trim())?.id ?? "");
    });
  }, [classId, row.student]);
  const go = async () => {
    try {
      const r = await api<{ score: number; column: string; class: string }>(`/api/photo/results/${row.id}/gradebook`, { method: "POST", body: { classId, studentId, column, term } });
      setMsg(`Đã ghi ${num(r.score)} điểm vào cột ${r.column} lớp ${r.class}.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <div className="bar" style={{ margin: "6px 0" }} data-testid="gb-panel">
      <select className="inp" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Lớp"><option value="">Chọn lớp…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {roster && (
        <>
          <select className="inp" value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="Học sinh" data-testid="gb-student"><option value="">Chọn học sinh…</option>{roster.students.map((s) => <option key={s.id} value={s.id}>{s.fullName}{s.code ? ` (${s.code})` : ""}</option>)}</select>
          <select className="inp" value={column} onChange={(e) => setColumn(e.target.value)} aria-label="Cột điểm">{roster.columns.map((c) => <option key={c.name}>{c.name}</option>)}</select>
          <select className="inp" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Học kỳ"><option>HK1</option><option>HK2</option></select>
          <button className="btn sm" disabled={!studentId || !column} onClick={() => void go()} data-testid="gb-go">Ghi (thang 10)</button>
        </>
      )}
      {msg && <span className="tag green">{msg}</span>}
    </div>
  );
}

export function SavedList({ rows, onChange }: { rows: Saved[]; onChange: () => void }) {
  const [gb, setGb] = useState("");
  if (rows.length === 0) return null;
  return (
    <div className="card" data-testid="saved">
      <h3 style={{ marginTop: 0 }}>Đã lưu</h3>
      <table>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.id}>
            <tr>
              <td>{r.student || "—"}</td>
              <td>{r.title}</td>
              <td><b>{num(r.total)}</b> / {num(r.max)}</td>
              <td>{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
              <td><button className="btn ghost sm" onClick={() => setGb(gb === r.id ? "" : r.id)} data-testid="gb-open">Ghi vào sổ điểm</button></td>
              <td><button className="xbtn" aria-label="Xoá" onClick={() => void api(`/api/photo/results/${r.id}`, { method: "DELETE" }).then(onChange)}><Icon name="trash" size={18} /></button></td>
            </tr>
            {gb === r.id && <tr><td colSpan={6}><GradebookPanel row={r} /></td></tr>}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
