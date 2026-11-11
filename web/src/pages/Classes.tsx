import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { dobVi, type ClassDetail, type ClassSummary, type Gradebook } from "../api";
import { fetchGvToday, GV_TODAY_KEY } from "../portal/gv/data";
import { pct } from "../portal/today";
import { CLASSES_KEY, bandsOf, gradebookKey, useKeyN, CodePill, del, openLink, FilterBar, FormPane, get, initialsOf, post, SearchBox, statusOf, errorOf, useListView, useOpenParam, useRun, vnNum } from "../portal/gv/kit";
import { Icon } from "../ui/Icon";
import { GradeBar } from "../ui/charts/GradeBar";
import { Button } from "../ui/components/Button";
import { Chip, Badge } from "../ui/components/Chip";
import { ConfirmDialog } from "../ui/components/Dialog";
import { Field, Input, Select, Textarea } from "../ui/components/Field";
import { Skeleton } from "../ui/components/Skeleton";
import { Region } from "../ui/components/States";
import { type Column, Table } from "../ui/components/Table";
import { Tabs } from "../ui/components/Tabs";
import { invalidate, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { PageHead } from "../ui/shell/PageHead";
import type { CredentialStatus } from "./classroom/types";

const AssignTab = lazy(() => import("./classroom/AssignTab").then((m) => ({ default: m.AssignTab })));
const AssignmentScoped = lazy(() => import("./classroom/ClassroomTabs").then((m) => ({ default: m.AssignmentScoped })));
const BadgesTab = lazy(() => import("./classroom/BadgesTab").then((m) => ({ default: m.BadgesTab })));

const schoolYearNow = () => {
  const d = new Date();
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};
export const classKey = (id: string) => `gv/lop/${id}`;
/** /lop-hoc — danh sách lớp (bảng v2: tìm, lọc năm học, sắp, trang trên URL) + học lực từ dữ liệu Hôm nay. */
export function Classes() {
  usePageMeta("Lớp học");
  const nav = useNavigate();
  const q = useQuery(CLASSES_KEY, get<ClassSummary[]>("/api/classes"));
  const today = useQuery(GV_TODAY_KEY, fetchGvToday);
  const stat = useMemo(() => new Map((today.data?.classes ?? []).map((c) => [c.id, c])), [today.data]);
  const [creating, setCreating] = useOpenParam();
  const [year, setYear] = useUrlState<string>("nam", "");
  const years = useMemo(() => [...new Set((q.data ?? []).map((c) => c.schoolYear))].sort().reverse(), [q.data]);
  const sorts = useMemo(() => ({ ten: (c: ClassSummary) => c.name, "si-so": (c: ClassSummary) => c.studentCount, tb: (c: ClassSummary) => stat.get(c.id)?.avg ?? null }), [stat]);
  const filter = useMemo(() => (year ? (c: ClassSummary) => c.schoolYear === year : undefined), [year]);
  const v = useListView(q.data, { text: (c) => `${c.name} ${c.subject ?? ""} ${c.schoolYear}`, sorts, defSort: "ten", filter });
  useKeyN(() => setCreating(true));

  const cols: Column<ClassSummary>[] = [
    {
      key: "ten",
      header: "Lớp",
      sortable: true,
      cell: (c) => (
        <Link to={`/lop-hoc/${c.id}`} className="t-title" onClick={(e) => e.stopPropagation()}>
          {c.name}
          <span className="t-sub">{c.subject ?? "Chưa đặt môn"}</span>
        </Link>
      ),
    },
    { key: "nam", header: "Năm học", hideSm: true, cell: (c) => <span className="num">{c.schoolYear}</span> },
    { key: "thang", header: "Thông tư", hideSm: true, cell: (c) => <Badge tone="outline">{c.scale}</Badge> },
    { key: "si-so", header: "Sĩ số", numeric: true, sortable: true, cell: (c) => c.studentCount },
    { key: "hoc-luc", header: "Học lực (số HS)", hideSm: true, width: "30%", cell: (c) => (stat.get(c.id) ? <GradeBar counts={stat.get(c.id)!.bands} height={18} /> : today.data ? <span className="caption">Chưa có điểm</span> : <Skeleton w="100%" h={18} />) },
    { key: "tb", header: "TB", numeric: true, sortable: true, cell: (c) => vnNum(stat.get(c.id)?.avg, 1) },
    { key: "dung-han", header: "Đúng hạn", numeric: true, hideSm: true, cell: (c) => pct(stat.get(c.id)?.onTime) },
  ];
  return (
    <>
      <PageHead title="Lớp học" primary={{ label: "Tạo lớp", icon: "plus", kbd: "N", onClick: () => setCreating(true) }}>
        {q.data && <span className="caption hide-sm">{q.data.length} lớp · {q.data.reduce((a, c) => a + c.studentCount, 0)} học sinh</span>}
      </PageHead>
      {creating && <NewClass onClose={() => setCreating(false)} onDone={(id) => (setCreating(false), id && nav(`/lop-hoc/${id}`))} />}
      <section className="pane" aria-label="Danh sách lớp">
        <FilterBar>
          <SearchBox value={v.q} onChange={v.setQ} placeholder="Tìm lớp, môn…  /" label="Tìm lớp" />
          {years.length > 1 && years.map((y) => <Chip key={y} pressed={year === y} onClick={() => setYear(year === y ? "" : y)}>{y}</Chip>)}
          <span className="grow" />
          {(v.q || year) && <Button variant="ghost" size="sm" onClick={() => (v.setQ(""), setYear(""))}>Xoá lọc</Button>}
        </FilterBar>
        <div data-testid="class-cards">
          <Table
            label="Lớp học"
            columns={cols}
            rows={v.rows}
            rowKey={(c) => c.id}
            status={statusOf(q, (d) => d.length === 0) === "ok" && v.total === 0 ? "trong" : statusOf(q, (d) => d.length === 0)}
            stale={q.stale}
            sort={v.sort}
            onSort={v.setSort}
            page={v.pageProp}
            onRowClick={(c) => nav(`/lop-hoc/${c.id}`)}
            onRetry={q.refetch}
            error={errorOf(q.error)}
            skeletonRows={5}
            empty={q.data?.length ? { icon: "search", title: "Không có lớp nào khớp", text: "Thử bỏ bộ lọc hoặc tìm tên khác.", action: <Button size="sm" onClick={() => (v.setQ(""), setYear(""))}>Xoá lọc</Button> } : { icon: "users", title: "Chưa có lớp nào", text: "Tạo lớp rồi dán danh sách hoặc nhập Excel học sinh.", action: <Button size="sm" variant="primary" icon="plus" onClick={() => setCreating(true)}>Tạo lớp</Button> }}
          />
        </div>
      </section>
    </>
  );
}

function NewClass({ onClose, onDone }: { onClose: () => void; onDone: (id: string | null) => void }) {
  const run = useRun();
  const [f, setF] = useState({ name: "", schoolYear: schoolYearNow(), subject: "", scale: "TT22" });
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    if (!f.name.trim()) return void setErr("Nhập tên lớp, ví dụ 10A1");
    setErr(null);
    return run(
      async () => {
        const r = await post<{ id?: string }>("/api/classes", { name: f.name.trim(), schoolYear: f.schoolYear, subject: f.subject.trim() || undefined, scale: f.scale });
        invalidate(CLASSES_KEY);
        invalidate(GV_TODAY_KEY);
        onDone(r?.id ?? null);
        return r;
      },
      `Đã tạo lớp ${f.name.trim()}`,
    );
  };
  return (
    <FormPane title="Tạo lớp" onClose={onClose} footer={<><Button onClick={onClose}>Huỷ</Button><Button variant="primary" icon="check" onClick={save} data-testid="c-save">Tạo lớp</Button></>}>
      <form className="fgrid" onSubmit={(e) => (e.preventDefault(), void save())}>
        <Field label="Tên lớp" error={err}><Input autoFocus placeholder="10A1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="c-name" /></Field>
        <Field label="Năm học"><Input value={f.schoolYear} onChange={(e) => setF({ ...f, schoolYear: e.target.value })} data-testid="c-year" /></Field>
        <Field label="Môn" hint="Để lọc ngân hàng câu hỏi khi giao bài"><Input placeholder="Toán" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} data-testid="c-subject" /></Field>
        <Field label="Thông tư đánh giá">
          <Select value={f.scale} onChange={(e) => setF({ ...f, scale: e.target.value })} data-testid="c-scale">
            <option value="TT22">TT22 · THCS, THPT</option>
            <option value="TT27">TT27 · Tiểu học</option>
          </Select>
        </Field>
        <button type="submit" hidden />
      </form>
    </FormPane>
  );
}

type ClassTab = "hoc-vien" | "giao-bai" | "theo-doi" | "ket-qua" | "the-lop";
const TAB_IDS: ClassTab[] = ["hoc-vien", "giao-bai", "theo-doi", "ket-qua", "the-lop"];

/** /lop-hoc/:id — mockup gv/lop.html: đầu trang (mã lớp, Nhập Excel, Giao bài) · tab mục lớp (?tab=) · Học sinh: chỉ số + danh sách | hồ sơ. */
export function ClassDetailPage() {
  const { id = "" } = useParams();
  const q = useQuery(classKey(id), get<ClassDetail>(`/api/classes/${id}`));
  const creds = useQuery(`gv/lop/${id}/the`, get<CredentialStatus>(`/api/classes/${id}/credentials`));
  const [tabRaw, setTab] = useUrlState<string>("tab", "hoc-vien", { mode: "push" });
  const tab: ClassTab = (TAB_IDS as string[]).includes(tabRaw) ? (tabRaw as ClassTab) : "hoc-vien";
  const [, setNewAsg] = useUrlState<string>("tao", "", { mode: "push" });
  const c = q.data;
  usePageMeta(c ? `${c.name}${c.subject ? ` · ${c.subject}` : ""}` : "Lớp học", [{ label: "Lớp học", to: "/lop-hoc" }, { label: c?.name ?? "…" }]);
  const run = useRun();
  const file = useRef<HTMLInputElement>(null);
  const upload = (f: File) =>
    run(async () => {
      if (f.size > 2 * 1024 * 1024) throw new Error("File Excel quá lớn (tối đa 2 MB)");
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const r = await post<{ added: number; warnings: string[] }>(`/api/classes/${id}/students/xlsx`, { contentBase64: btoa(bin) });
      invalidate(`gv/lop/${id}`);
      invalidate(`gv/so-diem/${id}`);
      invalidate(CLASSES_KEY);
      return r;
    }, (r) => ({ title: `Đã thêm ${r.added} học sinh`, msg: r.warnings.length ? r.warnings.slice(0, 3).join(" · ") : undefined, kind: r.warnings.length ? "info" : "ok" })).finally(() => file.current && (file.current.value = ""));

  if (q.error && !c) return <Region status="loi" label="Lớp học" error={errorOf(q.error)} onRetry={q.refetch} />;
  const join = creds.data?.joinCode;
  const tabs = [
    { value: "hoc-vien" as const, label: "Học sinh", count: c?.students.length },
    { value: "giao-bai" as const, label: "Bài tập" },
    { value: "theo-doi" as const, label: "Theo dõi" },
    { value: "ket-qua" as const, label: "Kết quả" },
    { value: "the-lop" as const, label: "Thẻ lớp" },
  ];
  return (
    <>
      <div className="page-head bar">
        <h1>{c ? `${c.name}${c.subject ? ` · ${c.subject}` : ""}` : <Skeleton w={180} h={22} />}</h1>
        {join && <CodePill code={join} label="Mã tham gia lớp" className="hide-sm" />}
        {c && <span className="caption hide-sm">{c.schoolYear} · {c.scale}</span>}
        <span className="grow" />
        <div className="acts">
          <Button size="sm" icon="upload" onClick={() => file.current?.click()} data-testid="upload-btn"><span className="hide-sm">Nhập Excel</span></Button>
          <input ref={file} type="file" accept=".xlsx" hidden data-testid="upload-input" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          <Button size="sm" variant="primary" icon="send" onClick={() => { setTab("giao-bai"); setNewAsg("1"); }}>Giao bài</Button>
        </div>
      </div>
      <Tabs className="ptabs" label="Mục lớp" items={tabs} value={tab} onChange={(t) => setTab(t)} />
      {c ? (
        <Suspense fallback={<Region status="dang-tai" label="Đang tải" skeletonRows={5} />}>
          {tab === "hoc-vien" && <Roster c={c} reload={q.refetch} />}
          {tab === "giao-bai" && <AssignTab classId={c.id} subject={c.subject} className={c.name} rosterSize={c.students.length} />}
          {(tab === "theo-doi" || tab === "ket-qua") && <AssignmentScoped classId={c.id} tab={tab} />}
          {tab === "the-lop" && <BadgesTab classId={c.id} />}
        </Suspense>
      ) : (
        <Region status="dang-tai" label="Đang tải lớp" skeletonRows={6} />
      )}
    </>
  );
}

type Row = ClassDetail["students"][number] & { dtb: number | null; att: { excused: number; unexcused: number } | null; i: number };

function Roster({ c, reload }: { c: ClassDetail; reload: () => unknown }) {
  const gbq = useQuery(gradebookKey(c.id, "HK1"), get<Gradebook>(`/api/classes/${c.id}/gradebook?term=HK1`));
  const gb = gbq.data;
  const [paste, setPaste] = useOpenParam("dan");
  const [hs, setHs] = useUrlState<string>("hs", "");
  const [weak, setWeak] = useUrlState<string>("loc", "");
  const [toDel, setToDel] = useState<Row | null>(null);
  const run = useRun();
  const byId = useMemo(() => new Map((gb?.students ?? []).map((s) => [s.id, s])), [gb]);
  const rows = useMemo<Row[]>(() => c.students.map((s, i) => ({ ...s, i: i + 1, dtb: byId.get(s.id)?.dtb ?? null, att: byId.get(s.id)?.attendance ?? null })), [c.students, byId]);
  const sorts = useMemo(() => ({ stt: (r: Row) => r.i, ten: (r: Row) => r.fullName.split(/\s+/).pop() ?? r.fullName, tb: (r: Row) => r.dtb, vang: (r: Row) => (r.att ? r.att.excused + r.att.unexcused : null) }), []);
  const filter = useMemo(() => (weak === "yeu" ? (r: Row) => r.dtb != null && r.dtb < 5 : weak === "chua-diem" ? (r: Row) => r.dtb == null : undefined), [weak]);
  const v = useListView(rows, { text: (r) => `${r.fullName} ${r.code ?? ""}`, sorts, defSort: "stt", filter, pageSize: 20 });
  const cur = rows.find((r) => r.id === hs) ?? null;
  const aside = useRef<HTMLElement>(null);
  useEffect(() => {
    // màn hẹp: hồ sơ nằm dưới danh sách → cuộn tới khi chọn
    if (hs && window.matchMedia?.("(max-width: 1180px)").matches) aside.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [hs]);
  const dtbs = rows.map((r) => r.dtb);
  const scored = dtbs.filter((x): x is number => x != null);
  const mean = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const absent = rows.reduce((a, r) => a + (r.att ? r.att.excused + r.att.unexcused : 0), 0);
  const girls = rows.filter((r) => /^n[ữu]/i.test(r.gender ?? "")).length;
  const nWeak = scored.filter((x) => x < 5).length;
  const cell = (k: string, val: React.ReactNode, small?: React.ReactNode) => (
    <div>
      <div className="k">{k}</div>
      <div className="v">{gb || k === "Sĩ số" ? val : <Skeleton w={48} h={22} style={{ margin: "3px 0" }} />}{small}</div>
    </div>
  );
  const remove = async (r: Row) => {
    await run(async () => {
      await del(`/api/classes/${c.id}/students/${r.id}`);
      if (hs === r.id) setHs("");
      invalidate(`gv/lop/${c.id}`);
      invalidate(`gv/so-diem/${c.id}`);
      invalidate(CLASSES_KEY);
    }, `Đã xoá ${r.fullName}`);
  };
  const cols: Column<Row>[] = [
    { key: "stt", header: "TT", numeric: true, sortable: true, width: 48, cell: (r) => <span data-cur={r.id === hs ? "1" : undefined}>{r.i}</span> },
    { key: "ten", header: "Học sinh", sortable: true, cell: (r) => <div className="who"><span className="avatar sm hide-sm">{initialsOf(r.fullName)}</span><span>{r.fullName}<small>{r.code ?? "—"}</small></span></div> },
    { key: "ngay", header: "Ngày sinh", hideSm: true, cell: (r) => <span className="num">{dobVi(r.dob) || "—"}</span> },
    { key: "gt", header: "Giới tính", hideSm: true, cell: (r) => r.gender || "—" },
    { key: "tb", header: "ĐTB HK I", numeric: true, sortable: true, cell: (r) => (gb ? <span className={r.dtb != null && r.dtb < 5 ? "low-score" : undefined}>{vnNum(r.dtb)}</span> : <Skeleton w={28} style={{ marginLeft: "auto" }} />) },
    { key: "vang", header: "Vắng P/K", numeric: true, sortable: true, hideSm: true, cell: (r) => (r.att ? `${r.att.excused}/${r.att.unexcused}` : "—") },
    { key: "ghi-chu", header: "Ghi chú", hideSm: true, width: "26%", cell: (r) => r.note || <span className="muted">—</span> },
  ];
  return (
    <>
      <section className="kpis" aria-label="Tóm tắt lớp">
        {cell("Sĩ số", rows.length, <small className="mu">{girls ? `${girls} nữ` : ""}</small>)}
        {cell("ĐTB HK I", vnNum(mean, 1), <small className="mu">{scored.length}/{rows.length} có điểm</small>)}
        {cell("Dưới 5,0", nWeak, <small className={nWeak ? "dn" : "mu"}>{nWeak ? "cần quan tâm" : "không em nào"}</small>)}
        {cell("Vắng cả kỳ", absent, <small className="mu">buổi</small>)}
        <div style={{ gridColumn: "span 2" }}>
          <div className="k">Học lực HK I · số HS</div>
          <div style={{ marginTop: 6 }}>{gb ? <GradeBar counts={bandsOf(dtbs)} height={20} /> : <Skeleton w="100%" h={20} />}</div>
        </div>
      </section>
      {paste && <PasteStudents classId={c.id} onClose={() => setPaste(false)} onDone={() => (setPaste(false), reload())} />}
      <div className="split roster">
        <section className="pane" aria-label="Danh sách học sinh">
          <FilterBar>
            <SearchBox value={v.q} onChange={v.setQ} placeholder="Tên hoặc mã học sinh  /" label="Tìm học sinh" />
            <Chip pressed={weak === "yeu"} onClick={() => setWeak(weak === "yeu" ? "" : "yeu")} count={nWeak}>Dưới 5,0</Chip>
            <Chip pressed={weak === "chua-diem"} onClick={() => setWeak(weak === "chua-diem" ? "" : "chua-diem")}>Chưa có điểm</Chip>
            <span className="grow" />
            <Button size="sm" variant="ghost" icon="clip" onClick={() => setPaste(true)} data-testid="paste-toggle"><span className="hide-sm">Dán danh sách</span></Button>
            <Button size="sm" variant="ghost" icon="down" onClick={() => run(() => openLink(`/api/classes/${c.id}/export`, { kind: "class_list" }), "Đang tải danh sách lớp .xlsx")} data-testid="export-list"><span className="hide-sm">Xuất Excel</span></Button>
          </FilterBar>
          <div data-testid="student-table">
            <Table
              label="Học sinh"
              dense
              columns={cols}
              rows={v.rows}
              rowKey={(r) => r.id}
              sort={v.sort}
              onSort={v.setSort}
              page={v.pageProp}
              onRowClick={(r) => setHs(r.id === hs ? "" : r.id)}
              status={rows.length === 0 ? "trong" : v.total === 0 ? "trong" : "ok"}
              empty={rows.length === 0 ? { icon: "users", title: "Lớp chưa có học sinh", text: emptyText(c), action: <Button size="sm" variant="primary" icon="clip" onClick={() => setPaste(true)}>Dán danh sách</Button> } : { icon: "search", title: "Không em nào khớp", text: "Thử bỏ bộ lọc hoặc tìm tên khác." }}
            />
          </div>
        </section>
        <aside ref={aside} className="pane detail" aria-label="Hồ sơ học sinh" style={{ scrollMarginTop: 64 }}>
          {cur ? <Profile r={cur} gb={gb} classId={c.id} onDelete={() => setToDel(cur)} /> : <div className="empty"><div className="art"><Icon name="user" size="lg" /></div><h3>Chọn một học sinh</h3><p>Bấm vào hàng để xem điểm từng cột, điểm danh và nhận xét.</p></div>}
        </aside>
      </div>
      <ConfirmDialog open={!!toDel} title={`Xoá ${toDel?.fullName ?? ""} khỏi lớp?`} text="Điểm, điểm danh và nhận xét của học sinh này cũng bị xoá. Không hoàn tác được." confirmLabel="Xoá học sinh" onConfirm={() => toDel && remove(toDel)} onClose={() => setToDel(null)} />
    </>
  );
}
const emptyText = (c: ClassDetail) => `Dán danh sách từ Excel/Zalo hoặc bấm “Nhập Excel” ở đầu trang để thêm học sinh vào ${c.name}.`;

function Profile({ r, gb, classId, onDelete }: { r: Row; gb: Gradebook | undefined; classId: string; onDelete: () => void }) {
  const s = gb?.students.find((x) => x.id === r.id);
  const cm = s?.comments.HK1;
  return (
    <div key={r.id} style={{ animation: "rise var(--dur-2) var(--ease-out) both" }}>
      <div className="sp-hd">
        <span className="avatar">{initialsOf(r.fullName)}</span>
        <div>
          <h2>{r.fullName}</h2>
          <small>{[r.code, r.gender, dobVi(r.dob)].filter(Boolean).join(" · ") || "Chưa có thông tin"}</small>
        </div>
      </div>
      <dl className="props" style={{ margin: 0 }}>
        <dt>ĐTB HK I</dt>
        <dd>{s?.dtb != null ? <b className={s.dtb < 5 ? "low-score" : undefined}>{vnNum(s.dtb)}</b> : "—"}</dd>
        <dt>Vắng</dt>
        <dd>{s ? `${s.attendance.excused} có phép · ${s.attendance.unexcused} không phép` : "—"}</dd>
        <dt>Ghi chú</dt>
        <dd>{r.note || "—"}</dd>
      </dl>
      <div className="dsec">
        <h3>Điểm HK I <span>thang 0–10</span></h3>
        {gb && gb.columns.length ? (
          <ul className="hist-list">
            {gb.columns.map((col) => {
              const x = s?.scores[col.name];
              return (
                <li key={col.name}>
                  <span>{col.name} <span className="muted">×{col.weight}</span></span>
                  <b className={x != null && x < 5 ? "low-score" : undefined}>{vnNum(x)}</b>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="caption">{gb ? "Sổ điểm chưa có cột điểm." : "Đang tải…"}</p>
        )}
      </div>
      <div className="dsec">
        <h3>Nhận xét HK I <span>{cm ? cm.level : "chưa có"}</span></h3>
        <p className="note">{cm?.text || "Chưa có nhận xét. Mở Sổ điểm → Nhận xét để AI gợi ý theo TT22."}</p>
      </div>
      <div className="dact">
        <Link className="btn" to={`/so-diem?lop=${classId}`}><Icon name="chart" size="sm" /><span>Mở sổ điểm</span></Link>
        <Button variant="ghost" icon="trash" className="danger" onClick={onDelete}>Xoá khỏi lớp</Button>
      </div>
    </div>
  );
}

function PasteStudents({ classId, onClose, onDone }: { classId: string; onClose: () => void; onDone: () => void }) {
  const run = useRun();
  const [text, setText] = useState("");
  const n = text.split("\n").filter((l) => l.trim()).length;
  const save = () =>
    run(async () => {
      const r = await post<{ added: number; warnings: string[] }>(`/api/classes/${classId}/students`, { text });
      invalidate(`gv/so-diem/${classId}`);
      invalidate(CLASSES_KEY);
      setText("");
      onDone();
      return r;
    }, (r) => ({ title: `Đã thêm ${r.added} học sinh`, msg: r.warnings.length ? r.warnings.slice(0, 3).join(" · ") : undefined, kind: r.warnings.length ? "info" : "ok" }));
  return (
    <FormPane title="Dán danh sách học sinh" sub="mỗi dòng một em" onClose={onClose} footer={<><span className="caption">{n ? `${n} dòng` : "Họ tên ; Ngày sinh ; Giới tính ; Ghi chú"}</span><Button onClick={onClose}>Huỷ</Button><Button variant="primary" icon="check" disabled={!n} onClick={save} data-testid="paste-save">Thêm {n || ""} học sinh</Button></>}>
      <Field label="Danh sách" hint="Dán từ Excel hoặc Zalo; ngăn cách bằng dấu ; hoặc Tab. Chỉ họ tên là bắt buộc.">
        <Textarea autoFocus rows={6} placeholder={"Nguyễn Văn An ; 05/03/2010 ; Nam\nTrần Thị Bình ; 12/08/2010 ; Nữ"} value={text} onChange={(e) => setText(e.target.value)} data-testid="paste-text" />
      </Field>
    </FormPane>
  );
}
