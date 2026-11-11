import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { LEVELS, aiSkill, vn, type AttStatus, type ClassSummary, type Gradebook as Gb } from "../api";
import { Region, CLASSES_KEY, bandsOf, errorOf, get, gradebookKey, msgOf, openLink, put, statusOf, useRun, vnNum } from "../portal/gv/kit";
import { GradeBar } from "../ui/charts/GradeBar";
import { Button } from "../ui/components/Button";
import { Badge, Segmented } from "../ui/components/Chip";
import { Input, Select } from "../ui/components/Field";
import { Skeleton } from "../ui/components/Skeleton";
import { Tabs } from "../ui/components/Tabs";
import { useToast } from "../ui/components/Toast";
import { invalidate, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";

type Tab = "diem" | "diem-danh" | "nhan-xet";
type Term = "HK1" | "HK2";
const ATT: { value: AttStatus; label: string }[] = [
  { value: "present", label: "Có mặt" },
  { value: "excused", label: "P" },
  { value: "unexcused", label: "K" },
];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** /so-diem?lop=&tab=diem|diem-danh|nhan-xet&ky=HK1|HK2 — sổ điểm điện tử theo TT22/TT27. */
export function Gradebook() {
  usePageMeta("Sổ điểm");
  const classes = useQuery(CLASSES_KEY, get<ClassSummary[]>("/api/classes"));
  const [lop, setLop] = useUrlState<string>("lop", "");
  const [tabRaw, setTab] = useUrlState<string>("tab", "diem", { mode: "push" });
  const [kyRaw, setKy] = useUrlState<string>("ky", "HK1");
  const tab = (["diem", "diem-danh", "nhan-xet"].includes(tabRaw) ? tabRaw : "diem") as Tab;
  const term: Term = kyRaw === "HK2" ? "HK2" : "HK1";
  const id = lop || classes.data?.[0]?.id || "";
  const gbq = useQuery(id ? gradebookKey(id, term) : null, get<Gb>(`/api/classes/${id}/gradebook?term=${term}`));
  const gb = gbq.data;
  const run = useRun();
  const st = classes.data?.length === 0 ? "trong" : statusOf(classes);
  return (
    <>
      <div className="page-head bar">
        <h1>Sổ điểm</h1>
        <Tabs className="head-tabs" label="Mục sổ điểm" value={tab} onChange={setTab} items={[{ value: "diem", label: "Điểm" }, { value: "diem-danh", label: "Điểm danh" }, { value: "nhan-xet", label: "Nhận xét" }]} />
        <div className="acts">
          {classes.data ? (
            <Select value={id} onChange={(e) => setLop(e.target.value)} aria-label="Lớp" data-testid="gb-class" style={{ height: 30, fontSize: 13, width: "auto" }}>
              {classes.data.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.schoolYear}</option>)}
            </Select>
          ) : (
            <Skeleton w={140} h={30} style={{ borderRadius: 6 }} />
          )}
          <Segmented label="Học kỳ" value={term} onChange={setKy} options={[{ value: "HK1", label: "HK I" }, { value: "HK2", label: "HK II" }]} />
          <Button size="sm" icon="down" disabled={!id} onClick={() => run(() => openLink(`/api/classes/${id}/export`, { kind: "gradebook", term }), "Đang tải sổ điểm .xlsx")} data-testid="export-gb">Xuất Excel</Button>
        </div>
      </div>
      {st !== "ok" ? (
        <Region className="pane" label="Sổ điểm" status={st} onRetry={classes.refetch} error={errorOf(classes.error)} skeletonRows={8} empty={{ icon: "users", title: "Chưa có lớp nào", text: "Tạo lớp và thêm học sinh để mở sổ điểm.", action: <Link className="btn primary sm" to="/lop-hoc?tao=1">Tạo lớp</Link> }} />
      ) : !gb ? (
        <Region className="pane" label="Sổ điểm" status={gbq.error ? "loi" : "dang-tai"} onRetry={gbq.refetch} error={errorOf(gbq.error)} skeletonRows={8} />
      ) : gb.students.length === 0 ? (
        <Region className="pane" label="Sổ điểm" status="trong" empty={{ icon: "users", title: `${gb.class.name} chưa có học sinh`, text: "Thêm học sinh ở trang lớp rồi quay lại nhập điểm.", action: <Link className="btn primary sm" to={`/lop-hoc/${gb.class.id}?dan=1`}>Thêm học sinh</Link> }} />
      ) : (
        <>
          {tab === "diem" && <Scores gb={gb} term={term} stale={gbq.stale} />}
          {tab === "diem-danh" && <Attendance gb={gb} />}
          {tab === "nhan-xet" && <Comments gb={gb} term={term} />}
        </>
      )}
    </>
  );
}

function Scores({ gb, term, stale }: { gb: Gb; term: Term; stale: boolean }) {
  const tt27 = gb.class.scale === "TT27";
  const toast = useToast();
  const [bad, setBad] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const key = gradebookKey(gb.class.id, term);
  const save = async (sid: string, col: string, raw: string, old: number | undefined) => {
    if (raw.trim() === vn(old)) return;
    const k = `${sid}:${col}`;
    try {
      await put(`/api/classes/${gb.class.id}/scores`, { term, column: col, scores: { [sid]: raw } });
      setBad(null);
      setOk(k);
      setTimeout(() => setOk((x) => (x === k ? null : x)), 1200);
      invalidate(key);
    } catch (e) {
      setBad(k);
      toast({ title: "Chưa lưu được điểm", msg: msgOf(e), kind: "err", life: 6000 });
    }
  };
  const dtbs = gb.students.map((s) => s.dtb);
  const scored = dtbs.filter((x): x is number => x != null);
  const mean = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const empty = gb.students.reduce((a, s) => a + gb.columns.filter((c) => s.scores[c.name] === undefined).length, 0);
  return (
    <>
      <section className="kpis" aria-label="Tóm tắt">
        <div><div className="k">Sĩ số</div><div className="v">{gb.students.length}</div></div>
        <div><div className="k">ĐTB lớp {term === "HK1" ? "HK I" : "HK II"}</div><div className="v">{vnNum(mean, 1)} <small className="mu">{scored.length} có ĐTB</small></div></div>
        <div><div className="k">Dưới 5,0</div><div className="v">{scored.filter((x) => x < 5).length}</div></div>
        <div><div className="k">Ô chưa nhập</div><div className="v">{empty} <small className="mu">/ {gb.students.length * gb.columns.length}</small></div></div>
        <div style={{ gridColumn: "span 2" }}><div className="k">Học lực · số HS</div><div style={{ marginTop: 6 }}><GradeBar counts={bandsOf(dtbs)} height={20} /></div></div>
      </section>
      <section className={stale ? "pane mt is-stale" : "pane mt"} aria-label="Bảng điểm">
        <div className="ghd">Điểm {term === "HK1" ? "học kỳ I" : "học kỳ II"} · {gb.class.name} <span className="n">{tt27 ? "TT27 · mức đạt" : "TT22 · thang 10, Enter để lưu"}</span></div>
        <div className="table-wrap" style={{ ["--table-max" as string]: "calc(100dvh - 300px)" }}>
          <table className="data dense sheet" data-testid="score-grid">
            <thead>
              <tr>
                <th className="r" style={{ width: 44 }}>TT</th>
                <th className="sticky-c">Học sinh</th>
                {gb.columns.map((c) => <th key={c.name} className="r">{c.name} <span className="muted">×{c.weight}</span></th>)}
                {!tt27 && <th className="r">ĐTB</th>}
                {!tt27 && term === "HK2" && <th className="r">Cả năm</th>}
              </tr>
            </thead>
            <tbody>
              {gb.students.map((s, i) => (
                <tr key={s.id}>
                  <td className="r muted">{i + 1}</td>
                  <td className="sticky-c">{s.fullName}</td>
                  {gb.columns.map((c) => {
                    const k = `${s.id}:${c.name}`;
                    return (
                      <td key={`${k}:${s.scores[c.name] ?? ""}`} className="r">
                        <input
                          className={["cell-in", bad === k && "bad", ok === k && "saved"].filter(Boolean).join(" ")}
                          defaultValue={vn(s.scores[c.name])}
                          inputMode={tt27 ? "numeric" : "decimal"}
                          aria-label={`${s.fullName} ${c.name}`}
                          aria-invalid={bad === k || undefined}
                          data-testid={`sc-${i}-${c.name}`}
                          onBlur={(e) => void save(s.id, c.name, e.target.value, s.scores[c.name])}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") (e.currentTarget.value = vn(s.scores[c.name])), e.currentTarget.blur();
                          }}
                        />
                      </td>
                    );
                  })}
                  {!tt27 && <td className={s.dtb != null && s.dtb < 5 ? "r low-score" : "r"} style={{ fontWeight: 600 }} data-testid={`dtb-${i}`}>{vn(s.dtb)}</td>}
                  {!tt27 && term === "HK2" && <td className="r" data-testid={`dtby-${i}`}>{vn(s.dtbYear)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Attendance({ gb }: { gb: Gb }) {
  const [date, setDate] = useState(today());
  const q = useQuery(`gv/diem-danh/${gb.class.id}/${date}`, get<Record<string, AttStatus>>(`/api/classes/${gb.class.id}/attendance?date=${date}`));
  const [rec, setRec] = useState<Record<string, AttStatus>>({});
  useEffect(() => setRec(q.data ?? {}), [q.data]);
  const run = useRun();
  const dirty = useMemo(() => gb.students.some((s) => (rec[s.id] ?? "present") !== (q.data?.[s.id] ?? "present")) || !q.data || Object.keys(q.data).length === 0, [rec, q.data, gb.students]);
  const counts = { present: 0, excused: 0, unexcused: 0 } as Record<AttStatus, number>;
  for (const s of gb.students) counts[rec[s.id] ?? "present"]++;
  const save = () =>
    run(async () => {
      const records = Object.fromEntries(gb.students.map((s) => [s.id, rec[s.id] ?? "present"]));
      await put(`/api/classes/${gb.class.id}/attendance`, { date, records });
      invalidate(`gv/diem-danh/${gb.class.id}/${date}`);
      invalidate(`gv/so-diem/${gb.class.id}`);
    }, { title: `Đã lưu điểm danh ${date.split("-").reverse().join("/")}`, msg: `${counts.present} có mặt · ${counts.excused} P · ${counts.unexcused} K` });
  return (
    <section className="pane" aria-label="Điểm danh">
      <div className="fbar">
        <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} data-testid="att-date" aria-label="Ngày" style={{ width: 160 }} />
        <Button size="sm" variant="ghost" onClick={() => setRec(Object.fromEntries(gb.students.map((s) => [s.id, "present" as AttStatus])))}>Tất cả có mặt</Button>
        <span className="caption"><b className="num">{counts.present}</b> có mặt · <b className="num">{counts.excused}</b> có phép · <b className="num">{counts.unexcused}</b> không phép</span>
        <span className="grow" />
        <Button size="sm" variant="primary" icon="check" disabled={!q.data} onClick={save} doneLabel="Đã lưu" data-testid="att-save">{dirty ? "Lưu điểm danh" : "Lưu lại"}</Button>
      </div>
      <div className={q.stale ? "table-wrap is-stale" : "table-wrap"}>
        <table className="data dense" data-testid="att-table">
          <thead><tr><th className="r" style={{ width: 44 }}>TT</th><th>Học sinh</th><th>Hôm nay</th><th className="r hide-sm">Vắng cả kỳ (P / K)</th></tr></thead>
          <tbody>
            {gb.students.map((s, i) => (
              <tr key={s.id}>
                <td className="r muted">{i + 1}</td>
                <td>{s.fullName}</td>
                <td>{q.data ? <Segmented label={`Điểm danh ${s.fullName}`} value={rec[s.id] ?? "present"} onChange={(v) => setRec({ ...rec, [s.id]: v })} options={ATT} /> : <Skeleton w={150} h={26} />}</td>
                <td className="r hide-sm">{s.attendance.excused} / {s.attendance.unexcused}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Comments({ gb, term }: { gb: Gb; term: Term }) {
  const levels = LEVELS[gb.class.scale] as readonly string[];
  const [draft, setDraft] = useState<Record<string, { text: string; level: string }>>({});
  const [flag, setFlag] = useState<Record<string, string[]>>({});
  const run = useRun();
  useEffect(() => {
    setDraft(Object.fromEntries(gb.students.map((s) => [s.id, s.comments[term] ?? { text: "", level: levels[0]! }])));
    setFlag({});
  }, [gb, term, levels]);
  const [aiBusy, setAiBusy] = useState(false);
  const suggest = () => {
    setAiBusy(true);
    return run(async () => {
      const empty = gb.students.filter((s) => (draft[s.id]?.text ?? "").trim() === "").map((s) => s.id);
      const r = await aiSkill<{ items: { student: string; text: string; level: string; issues: string[] }[] }>("nhan-xet", { classId: gb.class.id, term, students: empty.length ? empty : undefined });
      setDraft((d) => ({ ...d, ...Object.fromEntries(r.items.map((x) => [x.student, { text: x.text, level: x.level }])) }));
      setFlag(Object.fromEntries(r.items.filter((x) => x.issues.length).map((x) => [x.student, x.issues])));
      return r;
    }, (r) => ({ title: `AI đã gợi ý ${r.items.length} nhận xét`, msg: r.items.some((x) => x.issues.length) ? `${r.items.filter((x) => x.issues.length).length} cái cần xem lại — sửa trước khi lưu` : "Đọc lại, sửa rồi lưu", kind: "info" })).finally(() => setAiBusy(false));
  };
  const save = () =>
    run(async () => {
      const items = gb.students.filter((s) => (draft[s.id]?.text ?? "").trim() !== "").map((s) => ({ student: s.id, text: draft[s.id]?.text ?? "", level: draft[s.id]?.level ?? levels[0] }));
      await put(`/api/classes/${gb.class.id}/comments`, { term, items });
      invalidate(`gv/so-diem/${gb.class.id}`);
      return items.length;
    }, (n) => `Đã lưu ${n} nhận xét ${term === "HK1" ? "HK I" : "HK II"}`);
  const set = (sid: string, p: Partial<{ text: string; level: string }>) => setDraft({ ...draft, [sid]: { text: "", level: levels[0]!, ...draft[sid], ...p } });
  const filled = gb.students.filter((s) => (draft[s.id]?.text ?? "").trim()).length;
  return (
    <section className="pane" aria-label="Nhận xét">
      <div className="fbar">
        <Badge tone="outline">{gb.class.scale}</Badge>
        <span className="caption">Đã viết <b className="num">{filled}</b>/{gb.students.length} · 20–400 ký tự, không nêu tên học sinh</span>
        <span className="grow" />
        <Button size="sm" icon="spark" busy={aiBusy} onClick={suggest} data-testid="cm-ai">AI gợi ý ô trống</Button>
        <Button size="sm" variant="primary" icon="check" onClick={save} doneLabel="Đã lưu" data-testid="cm-save">Lưu nhận xét</Button>
      </div>
      <div className="table-wrap">
        <table className="data dense cm-t" data-testid="cm-table">
          <thead><tr><th className="r" style={{ width: 44 }}>TT</th><th style={{ width: 180 }}>Học sinh</th>{gb.class.scale !== "TT27" && <th className="r hide-sm" style={{ width: 60 }}>ĐTB</th>}<th>Nhận xét</th><th style={{ width: 150 }}>Mức</th></tr></thead>
          <tbody>
            {gb.students.map((s, i) => {
              const t = draft[s.id]?.text ?? "";
              const n = t.trim().length;
              return (
                <tr key={s.id} className={aiBusy && !t.trim() ? "ai-wait" : undefined}>
                  <td className="r muted">{i + 1}</td>
                  <td>{s.fullName}</td>
                  {gb.class.scale !== "TT27" && <td className="r hide-sm">{vn(s.dtb)}</td>}
                  <td>
                    <textarea className="textarea cm" rows={2} value={t} onChange={(e) => set(s.id, { text: e.target.value })} aria-label={`Nhận xét ${s.fullName}`} aria-invalid={(n > 0 && (n < 20 || n > 400)) || undefined} data-testid={`cm-${i}`} />
                    {(flag[s.id] || (n > 0 && (n < 20 || n > 400))) && <span className="t-sub" style={{ color: "var(--warn)" }}>{flag[s.id]?.join(" · ") ?? (n < 20 ? `Ngắn quá (${n}/20)` : `Dài quá (${n}/400)`)}</span>}
                  </td>
                  <td>
                    <Select value={draft[s.id]?.level ?? levels[0]} onChange={(e) => set(s.id, { level: e.target.value })} aria-label={`Mức ${s.fullName}`} data-testid={`lv-${i}`} style={{ height: 30, fontSize: 13 }}>
                      {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
