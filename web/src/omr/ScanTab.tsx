import { useEffect, useMemo, useRef, useState } from "react";
import { type ClassSummary, type ExamSummary, type KeyEntry, api } from "../api";
import { Icon } from "../ui/Icon";
import { type GroupRead, PX_MM, type Resp, type Warped, assemble, loadCv, readGroups, warpPage } from "./decode";
import { fileToImageData } from "./image";
import { SavedList, useSaved } from "./Saved";
import { type Roster, type SeatState, matchSeat, seatLabel } from "./seat";
import { type Group, type Template, buildTemplate } from "./template";
import { Btn, Dropzone, num, useLock, useToast } from "./ui";

type Page = { warped: Warped; reads: GroupRead[]; thumb: string };
type Sheet = {
  key: string;
  name: string;
  status: "queued" | "scanning" | "ready" | "error";
  error?: string;
  examId: string;
  code: string;
  qrOk: boolean;
  template: Template | null;
  pages: Record<number, Page>;
  overrides: Record<string, number>;
  sbd: string | null;
  studentId: string | null;
  ms: number;
  saved: { id: string; total: number; max: number } | null;
};
type SaveResult = { id: string; total: number; max: number; student: { fullName: string; seat: number | null } | null };
type Grade = { total: number; autoMax: number; items: { no: number; points: number | null; maxPoints?: number }[] };

function groupName(g: Group): string {
  if (g.kind === "id") return `SBD, cột ${g.sub + 1}`;
  if (g.kind === "mcq") return `Câu ${g.no}`;
  if (g.kind === "tf") return `Câu ${g.no} · ý ${"abcd"[g.sub]}`;
  return `Câu ${g.no} · cột ${g.sub + 1}`;
}

/** Trạng thái suy ra của một phiếu đã quét (dùng chung cho thẻ và "Lưu tất cả"). */
function derive(s: Sheet, roster: Roster | null) {
  const t = s.template!;
  const readOf = (g: Group) => s.pages[g.page]?.reads.find((r) => r.id === g.id);
  const pick = (g: Group) => s.overrides[g.id] ?? readOf(g)?.pick ?? -1;
  const asm = assemble(t, pick);
  const sbd = s.sbd ?? asm.sbd;
  const doubts = t.groups.filter((g) => readOf(g)?.state === "doubt");
  const open = doubts.filter((g) => !(g.id in s.overrides)).length;
  const missing = t.pages - Object.keys(s.pages).length;
  const match: SeatState | null = roster ? matchSeat(roster.students, sbd) : null;
  const studentId = s.studentId ?? (match?.status === "ok" ? match.student.id : null);
  const blocker = missing > 0 ? `Thiếu ${missing} trang` : open > 0 ? `Còn ${open} ô nghi vấn` : roster && !studentId ? "Chọn học sinh" : "";
  return { readOf, pick, asm, sbd, doubts, open, missing, match, studentId, blocker };
}

function thumbOf(w: Warped): string {
  const c = document.createElement("canvas");
  const k = 168 / w.w;
  c.width = 168;
  c.height = Math.round(w.h * k);
  const img = new ImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const v = w.gray[Math.floor(y / k) * w.w + Math.floor(x / k)]!;
      const o = (y * c.width + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.7);
}

const blank = (key: string, name: string): Sheet => ({ key, name, status: "queued", examId: "", code: "", qrOk: false, template: null, pages: {}, overrides: {}, sbd: null, studentId: null, ms: 0, saved: null });

export function ScanTab({ exams, examId, classId, setClassId }: { exams: ExamSummary[]; examId: string; classId: string; setClassId: (v: string) => void }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [batch, setBatch] = useState({ done: 0, total: 0, phase: "" });
  const [saveAll, savingAll] = useLock();
  const saved = useSaved("omr");
  const queue = useRef<{ key: string; file: File }[]>([]);
  const running = useRef(false);
  const ctx = useRef({ examId, code, exams });
  ctx.current = { examId, code, exams };
  const keyCache = useRef(new Map<string, Promise<{ code: string; entries: KeyEntry[] }[]>>());
  const codes = exams.find((e) => e.id === examId)?.codes ?? [];
  // Trạng thái mới nhất + phiếu đang/đã gửi: chặn lưu trùng khi bấm dồn trước lúc React vẽ lại.
  const latest = useRef(sheets);
  latest.current = sheets;
  const sent = useRef(new Set<string>());

  useEffect(() => setCode(codes[0] ?? ""), [examId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => void api<ClassSummary[]>("/api/classes").then(setClasses).catch(() => setClasses([])), []);
  useEffect(() => {
    setRoster(null);
    if (classId) void api<Roster>(`/api/photo/classes/${classId}/roster`).then(setRoster).catch(() => setRoster(null));
  }, [classId]);

  const keysOf = (id: string) => {
    if (!keyCache.current.has(id)) {
      const p = api<{ code: string; entries: KeyEntry[] }[]>(`/api/exams/${id}/key`);
      p.catch(() => keyCache.current.delete(id));
      keyCache.current.set(id, p);
    }
    return keyCache.current.get(id)!;
  };
  const patch = (key: string, f: (s: Sheet) => Sheet) => setSheets((l) => l.map((x) => (x.key === key ? f(x) : x)));

  async function pump() {
    if (running.current) return;
    running.current = true;
    try {
      setBatch((b) => ({ ...b, phase: "Đang tải bộ quét (OpenCV)…" }));
      const cv = await loadCv();
      while (queue.current.length) {
        const { key, file } = queue.current.shift()!;
        patch(key, (s) => ({ ...s, status: "scanning" }));
        setBatch((b) => ({ ...b, phase: `Đang quét ${file.name}` }));
        await new Promise((r) => setTimeout(r, 16)); // để skeleton kịp vẽ
        try {
          const t0 = performance.now();
          const warped = warpPage(cv, await fileToImageData(file));
          const { examId: defExam, code: defCode, exams: list } = ctx.current;
          const exId = warped.qr?.examId ?? defExam;
          const cd = warped.qr?.code ?? defCode;
          const page = warped.qr?.page ?? 0;
          const k = (await keysOf(exId)).find((x) => x.code === cd);
          if (!k) throw new Error(warped.qr ? `Đề trên QR không có mã đề ${cd}` : "Không đọc được QR và chưa chọn mã đề dự phòng");
          const template = buildTemplate(k.entries, { title: list.find((e) => e.id === exId)?.title ?? "", code: cd });
          const part: Page = { warped, reads: readGroups(warped, template, page), thumb: thumbOf(warped) };
          const ms = performance.now() - t0;
          setSheets((l) => {
            // Trang 2+ của cùng phiếu (cùng đề, mã đề) ghép vào phiếu gần nhất còn thiếu trang đó.
            const host = page > 0 ? [...l].reverse().find((s) => s.status === "ready" && !s.saved && s.examId === exId && s.code === cd && !s.pages[page]) : undefined;
            if (host) return l.filter((s) => s.key !== key).map((s) => (s === host ? { ...s, pages: { ...s.pages, [page]: part }, ms: s.ms + ms } : s));
            return l.map((s) => (s.key === key ? { ...s, status: "ready", examId: exId, code: cd, qrOk: !!warped.qr, template, pages: { [page]: part }, ms } : s));
          });
        } catch (e) {
          patch(key, (s) => ({ ...s, status: "error", error: (e as Error).message || "Không quét được ảnh" }));
        }
        setBatch((b) => ({ ...b, done: b.done + 1 }));
      }
    } catch (e) {
      toast("err", `Không tải được bộ quét: ${(e as Error).message}`);
      setSheets((l) => l.map((s) => (s.status === "queued" || s.status === "scanning" ? { ...s, status: "error", error: "Bộ quét chưa tải được" } : s)));
      queue.current = [];
    } finally {
      running.current = false;
      setBatch((b) => ({ ...b, phase: "" }));
    }
  }

  const onFiles = (files: File[]) => {
    const items = files.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file }));
    queue.current.push(...items);
    setSheets((l) => [...l, ...items.map((x) => blank(x.key, x.file.name))]);
    setBatch((b) => (running.current ? { ...b, total: b.total + items.length } : { done: 0, total: items.length, phase: b.phase }));
    void pump();
  };

  async function saveSheet(s: Sheet): Promise<SaveResult | null> {
    if (sent.current.has(s.key)) return null;
    sent.current.add(s.key);
    try {
      return await postSheet(s);
    } catch (e) {
      sent.current.delete(s.key);
      throw e;
    }
  }
  async function postSheet(s: Sheet): Promise<SaveResult> {
    const d = derive(s, roster);
    const r = await api<SaveResult>("/api/photo/omr", {
      method: "POST",
      body: { examId: s.examId, code: s.code, student: d.sbd, classId: roster?.id, studentId: d.studentId ?? undefined, responses: d.asm.responses, doubts: d.doubts.length, edited: Object.keys(s.overrides).length },
    });
    patch(s.key, (x) => ({ ...x, saved: { id: r.id, total: r.total, max: r.max } }));
    return r;
  }

  const ready = sheets.filter((s) => s.status === "ready");
  const stats = useMemo(() => {
    let open = 0, unmatched = 0, pages = 0, ms = 0, savable = 0;
    for (const s of ready) {
      const d = derive(s, roster);
      open += d.open;
      if (roster && !d.studentId) unmatched++;
      pages += Object.keys(s.pages).length;
      ms += s.ms;
      if (!s.saved && !d.blocker) savable++;
    }
    return { open, unmatched, msPerPage: pages ? ms / pages : 0, savable };
  }, [sheets, roster]); // eslint-disable-line react-hooks/exhaustive-deps
  const scanning = batch.phase !== "" || sheets.some((s) => s.status === "queued" || s.status === "scanning");

  return (
    <>
      <div className="pg-tools">
        <label className="pg-field">
          Lớp (ghép SBD với số thứ tự HS)
          <select className="pg-in" value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="s-class">
            <option value="">Không ghép lớp</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.schoolYear}</option>)}
          </select>
        </label>
        <label className="pg-field">
          Mã đề dự phòng (khi không đọc được QR)
          <select className="pg-in" value={code} onChange={(e) => setCode(e.target.value)} data-testid="s-code">
            {codes.map((c) => <option key={c} value={c}>Mã đề {c}</option>)}
          </select>
        </label>
        <span className="pg-sp" />
        {sheets.length > 0 && (
          <>
            <Btn kind="quiet" onClick={() => setSheets((l) => l.filter((s) => !s.saved && s.status !== "error"))} disabled={scanning}>Dọn phiếu đã lưu / lỗi</Btn>
            <Btn kind="pri" busy={savingAll} disabled={stats.savable === 0 || scanning} data-testid="s-save-all"
              onClick={() => void saveAll(async () => {
                const todo = latest.current.filter((s) => s.status === "ready" && !s.saved && !derive(s, roster).blocker);
                let n = 0;
                for (const s of todo) if (await saveSheet(s)) n++;
                if (n) toast("ok", `Đã lưu ${n} phiếu`);
                saved.reload();
              })}>
              <Icon name="check" />{stats.savable ? `Lưu ${stats.savable} phiếu sẵn sàng` : "Lưu tất cả"}
            </Btn>
          </>
        )}
      </div>

      <Dropzone testId="s" capture compact={sheets.length > 0} title="Kéo thả ảnh phiếu vào đây" hint="Nhiều ảnh cùng lúc · chụp thẳng, thấy đủ 4 ô vuông đen ở góc · ảnh xử lý ngay trong trình duyệt, không gửi lên máy chủ" onFiles={onFiles} />

      {sheets.length > 0 && (
        <div className="pg-kpis" data-testid="s-kpis">
          <div><div className="k">Phiếu đã quét</div><div className="v">{ready.length}<small>/ {sheets.length}</small></div></div>
          <div><div className="k">Ô nghi vấn còn lại</div><div className={`v${stats.open ? " is-warn" : ""}`} data-testid="s-open">{stats.open}</div></div>
          <div><div className="k">Chưa khớp học sinh</div><div className={`v${stats.unmatched ? " is-warn" : ""}`}>{roster ? stats.unmatched : "—"}</div></div>
          <div><div className="k">Đã lưu</div><div className="v">{sheets.filter((s) => s.saved).length}</div></div>
          <div><div className="k">Thời gian quét</div><div className="v" data-testid="s-ms">{stats.msPerPage ? num(Math.round(stats.msPerPage)) : "—"}<small>ms/trang</small></div></div>
        </div>
      )}
      {scanning && batch.total > 0 && (
        <div style={{ margin: "-4px 0 12px" }} aria-live="polite">
          <div className="pg-meter"><i style={{ width: `${(batch.done / batch.total) * 100}%` }} /></div>
          <small className="mu" data-testid="s-progress">{batch.done}/{batch.total} ảnh · {batch.phase}</small>
        </div>
      )}

      <div className="pg-list">
        {sheets.map((s, i) =>
          s.status === "ready" ? (
            <SheetCard key={s.key} i={i} sheet={s} roster={roster} onChange={(f) => patch(s.key, f)} onRemove={() => setSheets((l) => l.filter((x) => x.key !== s.key))} onSave={() => saveSheet(latest.current.find((x) => x.key === s.key) ?? s)} onSaved={saved.reload} />
          ) : s.status === "error" ? (
            <div key={s.key} className="pg-card err" data-testid="s-error">
              <div className="pg-chd" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
                <span className="pg-tag is-danger"><Icon name="alert" />Lỗi</span>
                <div className="pg-meta"><span className="t">{s.name}</span><span className="mu">{s.error} — chụp lại thẳng hơn, đủ sáng, thấy đủ 4 mốc góc.</span></div>
                <Btn kind="quiet icon" aria-label="Bỏ ảnh" onClick={() => setSheets((l) => l.filter((x) => x.key !== s.key))}><Icon name="x" /></Btn>
              </div>
            </div>
          ) : (
            <div key={s.key} className="pg-card" aria-busy="true" data-testid="s-skeleton">
              <div className="pg-chd">
                <div className="pg-sk thumb" />
                <div className="pg-meta"><span className="t">{s.name}</span><span className="mu">{s.status === "scanning" ? "Đang tìm mốc góc, nắn ảnh, đọc ô…" : "Chờ quét"}</span><div className="pg-sk l" style={{ width: "45%" }} /></div>
                <div className="pg-who"><div className="pg-sk l" style={{ width: 84, height: 30 }} /></div>
                <div className="pg-score"><div className="pg-sk l" style={{ width: 80, height: 28, justifySelf: "end" }} /></div>
              </div>
            </div>
          ),
        )}
      </div>
      <SavedList state={saved} />
    </>
  );
}

function SheetCard({ i, sheet, roster, onChange, onRemove, onSave, onSaved }: { i: number; sheet: Sheet; roster: Roster | null; onChange: (f: (s: Sheet) => Sheet) => void; onRemove: () => void; onSave: () => Promise<SaveResult | null>; onSaved: () => void }) {
  const toast = useToast();
  const [grade, setGrade] = useState<Grade | null>(null);
  const [open, setOpen] = useState(false);
  const [save, saving] = useLock();
  const d = derive(sheet, roster);
  const respKey = JSON.stringify(d.asm.responses);
  const locked = !!sheet.saved;

  useEffect(() => {
    const t = setTimeout(() => {
      api<Grade>(`/api/exams/${sheet.examId}/grade`, { method: "POST", body: { code: sheet.code, responses: d.asm.responses } }).then(setGrade).catch(() => setGrade(null));
    }, 200);
    return () => clearTimeout(t);
  }, [respKey, sheet.examId, sheet.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (g: Group, v: number) => onChange((s) => ({ ...s, overrides: { ...s.overrides, [g.id]: v } }));
  const first = sheet.pages[0] ?? Object.values(sheet.pages)[0]!;

  return (
    <div className={`pg-card${locked ? " saved" : ""}`} style={{ "--i": i } as React.CSSProperties} data-testid="s-sheet">
      <div className="pg-chd">
        <img className="pg-thumb" src={first.thumb} alt={`Ảnh nắn của ${sheet.name}`} />
        <div className="pg-meta">
          <span className="t" title={sheet.name}>{sheet.name}</span>
          <div className="row">
            <span className="pg-tag is-acc">Mã đề {sheet.code}</span>
            {sheet.qrOk ? <span className="pg-tag is-ok"><Icon name="qr" />QR</span> : <span className="pg-tag is-warn"><Icon name="alert" />Không đọc được QR</span>}
            {d.missing > 0 && <span className="pg-tag is-warn"><Icon name="alert" />Thiếu {d.missing} trang</span>}
            {d.doubts.length > 0 ? (
              <span className={`pg-tag ${d.open ? "is-warn" : "is-ok"}`} data-testid="s-doubts"><Icon name={d.open ? "alert" : "check"} />{d.open ? `${d.open}/${d.doubts.length} ô nghi vấn` : `Đã sửa ${d.doubts.length} ô`}</span>
            ) : (
              <span className="pg-tag is-ok"><Icon name="check" />Không ô nghi vấn</span>
            )}
            <span className="mu num">{num(Math.round(sheet.ms))} ms</span>
          </div>
        </div>
        <div className="pg-who">
          <label className="pg-field" style={{ gridAutoFlow: "column", alignItems: "center", gap: 6 }}>
            SBD
            <input className="pg-in sbd" value={d.sbd} inputMode="numeric" maxLength={6} disabled={locked} onChange={(e) => onChange((s) => ({ ...s, sbd: e.target.value.replace(/\D/g, ""), studentId: null }))} data-testid="s-sbd" />
          </label>
          {roster && (
            d.match?.status === "ok" && !sheet.studentId ? (
              <button className="pg-tag is-ok" style={{ border: 0, cursor: locked ? "default" : "pointer" }} disabled={locked} title="Bấm để chọn học sinh khác" onClick={() => d.match?.status === "ok" && onChange((s) => ({ ...s, studentId: d.match?.status === "ok" ? d.match.student.id : null }))} data-testid="s-match">
                <Icon name="user" />{seatLabel(d.match)}
              </button>
            ) : (
              <select className={`pg-in${d.studentId ? "" : " need"}`} value={d.studentId ?? ""} disabled={locked} onChange={(e) => onChange((s) => ({ ...s, studentId: e.target.value || null }))} aria-label="Chọn học sinh" data-testid="s-pick">
                <option value="">{d.match ? `${seatLabel(d.match)} — chọn tay…` : "Chọn học sinh…"}</option>
                {roster.students.map((st) => <option key={st.id} value={st.id}>{st.seat ?? "—"} · {st.fullName}</option>)}
              </select>
            )
          )}
        </div>
        <div className="pg-score">
          {grade ? <span className="v" data-testid="s-total">{num(grade.total)}<small> / {num(grade.autoMax)}</small></span> : <div className="pg-sk l" style={{ width: 80, height: 28, justifySelf: "end" }} />}
          <span className="mu">điểm trắc nghiệm</span>
        </div>
        <div className="pg-cacts">
          {locked ? (
            <span className="pg-tag is-ok"><Icon name="checkc" />Đã lưu {num(sheet.saved!.total)} / {num(sheet.saved!.max)}</span>
          ) : (
            <Btn kind="pri sm" busy={saving} disabled={!!d.blocker} data-testid="s-save"
              onClick={() => void save(async () => {
                const r = await onSave();
                if (!r) return;
                toast("ok", `Đã lưu ${num(r.total)}/${num(r.max)}${r.student ? ` — ${r.student.fullName}` : ""}`);
                onSaved();
              })}>
              <Icon name="check" />Lưu điểm
            </Btn>
          )}
          {d.blocker && !locked && <span className="note is-warn">{d.blocker}</span>}
          <span className="pg-sp" />
          <Btn kind="quiet sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Ẩn" : "Xem"} đáp án đã đọc</Btn>
          <Btn kind="quiet icon sm" onClick={onRemove} aria-label="Bỏ phiếu"><Icon name="trash" /></Btn>
        </div>
      </div>
      {d.doubts.length > 0 && !locked && (
        <div className="pg-doubts">
          {d.doubts.map((g) => {
            const part = sheet.pages[g.page]!;
            const read = d.readOf(g)!;
            const cur = d.pick(g);
            const fixed = g.id in sheet.overrides;
            return (
              <div key={g.id} className={`pg-doubt${fixed ? " fixed" : ""}`} data-testid="s-doubt">
                <div className="h">
                  <Icon name={fixed ? "check" : "alert"} size="sm" />{groupName(g)}
                  <span className="pg-sp" />
                  <span className={`pg-tag ${fixed ? "" : "is-warn"}`}>{fixed ? "đã sửa" : read.reason}</span>
                </div>
                <Crop warped={part.warped} g={g} />
                <div className="pg-opts" role="group" aria-label={`Chọn đáp án ${groupName(g)}`}>
                  {g.labels.map((l, k) => (
                    <button key={l + k} className="pg-opt" aria-pressed={cur === k} onClick={() => choose(g, k)} title={`${Math.round(read.fills[k]! * 100)}% đậm`}>
                      {l}<i className="f" style={{ transform: `scaleX(${Math.min(1, read.fills[k]!)})` }} />
                    </button>
                  ))}
                  <button className="pg-opt" aria-pressed={cur === -1} onClick={() => choose(g, -1)}>Trống</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && (
        <div className="pg-strip">
          {grade?.items.map((it) => {
            const r: Resp | undefined = d.asm.responses[it.no];
            const shown = typeof r === "number" ? "ABCD"[r] : Array.isArray(r) ? r.map((b) => (b === null ? "·" : b ? "Đ" : "S")).join("") : (r ?? "—");
            return <span key={it.no} className={it.points === null ? "" : it.points > 0 ? "ok" : "no"}>{it.no}: {shown}</span>;
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
  return <canvas ref={ref} />;
}
