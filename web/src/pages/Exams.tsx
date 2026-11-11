import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../apiCore";
import { aiSkill, type ExamSummary, type Links } from "../api";
import { dateVi, EXAMS_KEY, fetchExams, errorOf, FilterBar, gradeVi, post, SearchBox, statusOf, useListView, useOpenParam, useRun, useKeyN } from "../portal/gv/kit";
import { Icon } from "../ui/Icon";
import { Button, IconButton } from "../ui/components/Button";
import { Badge } from "../ui/components/Chip";
import { Field, Input, Select } from "../ui/components/Field";
import { type Column, Table } from "../ui/components/Table";
import { invalidate, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { PageHead } from "../ui/shell/PageHead";

type Cell = { topic: string; level: string; type: string; count: number; yccd?: string };
type Shortage = { cell: Cell; need: number; have: number };
type Created = { ok: true; examId: string; codes: string[]; questionCount: number } | { ok: false; shortages: Shortage[] };
const TYPES = [["mcq", "Trắc nghiệm"], ["true_false", "Đúng/sai"], ["short_answer", "Trả lời ngắn"]] as const;
const LEVELS = [["NB", "Nhận biết"], ["TH", "Thông hiểu"], ["VD", "Vận dụng"]] as const;
const typeVi = (t: string) => TYPES.find((x) => x[0] === t)?.[1] ?? t;

/** /de-thi — danh sách đề | chi tiết (tải mã đề, đáp án, ma trận; in phiếu, chấm). ?tao=1: soạn đề từ ma trận (mockup gv/soan-de.html). */
export function Exams() {
  const [creating, setCreating] = useOpenParam();
  usePageMeta(creating ? "Soạn đề" : "Đề thi", creating ? [{ label: "Đề thi", to: "/de-thi" }, { label: "Soạn đề mới" }] : undefined);
  useKeyN(() => setCreating(true));
  return creating ? <Compose onClose={() => setCreating(false)} /> : <ExamList onNew={() => setCreating(true)} />;
}

function ExamList({ onNew }: { onNew: () => void }) {
  const q = useQuery(EXAMS_KEY, fetchExams);
  const [cur, setCur] = useUrlState<string>("de", "");
  const sorts = useMemo(() => ({ ten: (e: ExamSummary) => e.title, ngay: (e: ExamSummary) => e.createdAt }), []);
  const v = useListView(q.data, { text: (e) => `${e.title} ${e.subject} ${e.grade}`, sorts, defSort: "-ngay" });
  const sel = q.data?.find((e) => e.id === cur) ?? v.rows[0] ?? null;
  const cols: Column<ExamSummary>[] = [
    { key: "ten", header: "Đề", sortable: true, cell: (e) => <span data-cur={sel?.id === e.id ? "1" : undefined}><span className="t-title">{e.title}</span><span className="t-sub">{e.subject} · {gradeVi(e.grade)}</span></span> },
    { key: "ma", header: "Mã đề", hideSm: true, cell: (e) => <span className="mono">{e.codes.join(" · ")}</span> },
    { key: "ngay", header: "Ngày tạo", numeric: true, sortable: true, cell: (e) => dateVi(e.createdAt) },
  ];
  return (
    <>
      <PageHead title="Đề thi" primary={{ label: "Soạn đề", icon: "plus", kbd: "N", onClick: onNew }}>
        {q.data && <span className="caption hide-sm">{q.data.length} đề</span>}
      </PageHead>
      <div className="split" style={{ marginTop: 0 }}>
        <section className="pane" aria-label="Danh sách đề">
          <FilterBar>
            <SearchBox value={v.q} onChange={v.setQ} placeholder="Tìm tên đề, môn…  /" label="Tìm đề" />
          </FilterBar>
          <Table
            label="Đề thi"
            columns={cols}
            rows={v.rows}
            rowKey={(e) => e.id}
            status={statusOf(q) === "ok" && v.total === 0 ? "trong" : statusOf(q)}
            stale={q.stale}
            sort={v.sort}
            onSort={v.setSort}
            page={v.pageProp}
            onRowClick={(e) => setCur(e.id)}
            onRetry={q.refetch}
            error={errorOf(q.error)}
            skeletonRows={6}
            empty={q.data?.length ? { icon: "search", title: "Không có đề nào khớp", text: "Thử tìm tên khác." } : { icon: "exam", title: "Chưa có đề nào", text: "Điền ma trận (hoặc mô tả để AI lập), hệ thống lấy câu từ ngân hàng và trộn mã đề.", action: <Button size="sm" variant="primary" icon="plus" onClick={onNew}>Soạn đề</Button> }}
          />
        </section>
        <aside className="pane detail" aria-label="Chi tiết đề">{sel ? <ExamDetail key={sel.id} e={sel} /> : <div className="empty"><div className="art"><Icon name="exam" size="lg" /></div><h3>Chọn một đề</h3><p>Tải mã đề, đáp án, ma trận; in phiếu hoặc chấm.</p></div>}</aside>
      </div>
    </>
  );
}

function ExamDetail({ e }: { e: ExamSummary }) {
  const run = useRun();
  const [links, setLinks] = useState<Links | null>(null);
  const load = () =>
    run(async () => {
      const l = await post<Links>(`/api/exams/${e.id}/links`);
      setLinks(l);
      return l;
    }, (l) => ({ title: "Link tải đã sẵn sàng", msg: `Hết hạn sau ${l.expiresInMinutes} phút`, kind: "info" }));
  return (
    <div style={{ animation: "rise var(--dur-2) var(--ease-out) both" }}>
      <div className="dhd"><span className="mono">{e.codes.length} mã đề</span><h2>{e.title}</h2></div>
      <dl className="props" style={{ margin: 0 }}>
        <dt>Môn · lớp</dt><dd>{e.subject} · {gradeVi(e.grade)}</dd>
        <dt>Mã đề</dt><dd className="mono">{e.codes.join(", ")}</dd>
        <dt>Ngày tạo</dt><dd>{dateVi(e.createdAt)}</dd>
      </dl>
      <div className="dsec">
        <h3>Tệp Word <span>{links ? `hết hạn sau ${links.expiresInMinutes} phút` : "tạo link khi cần"}</span></h3>
        {links ? (
          <div className="row wrap" style={{ gap: 6 }}>
            {links.exams.map((l) => <a key={l.code} className="btn sm" href={l.url} data-testid="dl-exam"><Icon name="down" size="sm" /><span>Mã {l.code}</span></a>)}
            <a className="btn sm" href={links.answerKey} data-testid="dl-key"><Icon name="check" size="sm" /><span>Đáp án</span></a>
            <a className="btn sm" href={links.matrix} data-testid="dl-matrix"><Icon name="list" size="sm" /><span>Ma trận</span></a>
          </div>
        ) : (
          <Button size="sm" icon="down" onClick={load}>Lấy link tải .docx</Button>
        )}
      </div>
      <div className="dact">
        <Link className="btn" to={`/cham-bai?che-do=in&de=${e.id}`}><Icon name="printer" size="sm" /><span>In phiếu trả lời</span></Link>
        <Link className="btn" to={`/cham-bai?che-do=quet&de=${e.id}`}><Icon name="camera" size="sm" /><span>Quét phiếu để chấm</span></Link>
        <Link className="btn" to={`/tro-choi?tao=1&de=${e.id}`}><Icon name="game" size="sm" /><span>Làm trò chơi ôn tập</span></Link>
      </div>
    </div>
  );
}

/** Soạn đề: ma trận (AI lập từ mô tả hoặc tự điền) bên trái · kiểm tra tự động + kết quả bên phải. */
function Compose({ onClose }: { onClose: () => void }) {
  const run = useRun();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState(10);
  const [variants, setVariants] = useState(2);
  const [duration, setDuration] = useState(45);
  const [cells, setCells] = useState<Cell[]>([{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 }]);
  const [aiText, setAiText] = useState("");
  const [aiWarn, setAiWarn] = useState<string[]>([]);
  const [shortages, setShortages] = useState<Shortage[] | null>(null);
  const setCell = (i: number, p: Partial<Cell>) => (setShortages(null), setCells(cells.map((c, j) => (j === i ? { ...c, ...p } : c))));
  const total = cells.reduce((a, c) => a + (c.count || 0), 0);
  const byLevel = LEVELS.map(([l]) => cells.filter((c) => c.level === l).reduce((a, c) => a + (c.count || 0), 0));
  const byType = TYPES.map(([t]) => cells.filter((c) => c.type === t).reduce((a, c) => a + (c.count || 0), 0));
  const askAi = () =>
    run(async () => {
      const r = await aiSkill<{ title: string; durationMinutes: number; matrix: { subject: string; grade: number; cells: Cell[] }; report: { totalPoints: number; warnings: string[] } }>("ma-tran", { description: aiText, subject: subject.trim() || undefined });
      setTitle(r.title);
      setSubject(r.matrix.subject);
      setGrade(r.matrix.grade);
      setDuration(r.durationMinutes);
      setCells(r.matrix.cells);
      setAiWarn(r.report.warnings);
      setShortages(null);
      return r;
    }, (r) => ({ title: `AI đã lập ma trận ${r.matrix.cells.length} ô`, msg: "Kiểm tra, sửa rồi bấm Tạo đề." }));
  const create = () =>
    run(async () => {
      let r: Created;
      try {
        r = await post<Created>("/api/exams", { title: title.trim(), matrix: { subject, grade, cells }, variants, durationMinutes: duration });
      } catch (e) {
        // thiếu câu trong ngân hàng → 422 kèm danh sách ô thiếu
        if (e instanceof ApiError && e.status === 422 && (e.body as Created | null)?.ok === false) r = e.body as Created;
        else throw e;
      }
      if (!r.ok) {
        setShortages(r.shortages);
        throw new Error(`Ngân hàng thiếu câu ở ${r.shortages.length} ô — xem bên phải`);
      }
      invalidate(EXAMS_KEY);
      nav(`/de-thi?de=${r.examId}`);
      return r;
    }, (r) => ({ title: `Đã tạo đề “${title.trim()}”`, msg: `${r.questionCount} câu · ${r.codes.length} mã đề` }));
  const checks: [boolean | null, string][] = [
    [total > 0, `${total} câu · ${byLevel.map((n, i) => `${LEVELS[i]![0]} ${n}`).join(" / ")}`],
    [total ? byLevel[0]! / total <= 0.5 : null, total ? `Nhận biết ${Math.round((byLevel[0]! / total) * 100)}% (nên ≤ 50%)` : "Chưa có câu"],
    [!!title.trim(), title.trim() ? "Đã đặt tên đề" : "Chưa đặt tên đề"],
    [shortages === null ? null : shortages.length === 0, shortages === null ? "Đủ câu trong ngân hàng: kiểm khi bấm Tạo đề" : shortages.length ? `Thiếu câu ở ${shortages.length} ô` : "Đủ câu"],
  ];
  return (
    <>
      <div className="page-head bar">
        <h1>{title.trim() || "Đề mới"}</h1>
        <Badge>Nháp</Badge>
        <span className="grow" />
        <div className="acts">
          <Button size="sm" icon="x" onClick={onClose}>Huỷ</Button>
          <Button size="sm" variant="primary" icon="check" disabled={!title.trim() || total === 0} onClick={create} data-testid="e-create">Tạo đề</Button>
        </div>
      </div>
      <div className="work compose">
        <aside>
          <section className="pane" aria-label="AI lập ma trận" data-testid="ai-matrix">
            <div className="ghd"><Icon name="spark" size="sm" /> AI lập ma trận <span className="n">CV 7991</span></div>
            <div className="fp-bd">
              <Field label="Mô tả đề" hint="vd: Giữa kì 1 Toán 10, 45 phút, Mệnh đề + Tập hợp, NB 40% TH 30% VD 30%">
                <Input value={aiText} onChange={(e) => setAiText(e.target.value)} data-testid="ai-matrix-text" />
              </Field>
              <Button size="sm" icon="spark" disabled={aiText.trim().length < 5} onClick={askAi} data-testid="ai-matrix-run">Lập ma trận</Button>
              {aiWarn.length > 0 && <p className="note warn" data-testid="ai-matrix-note">{aiWarn.join("\n")}</p>}
            </div>
          </section>
          <section className="pane" aria-label="Thông tin đề">
            <div className="ghd">Thông tin đề</div>
            <div className="fp-bd fgrid two">
              <div className="full"><Field label="Tên đề"><Input value={title} placeholder="KT giữa kỳ I · Toán 10" onChange={(e) => setTitle(e.target.value)} data-testid="e-title" /></Field></div>
              <Field label="Môn"><Input value={subject} onChange={(e) => (setSubject(e.target.value), setShortages(null))} /></Field>
              <Field label="Lớp"><Select value={grade} onChange={(e) => (setGrade(Number(e.target.value)), setShortages(null))}>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i + 1}>{gradeVi(i + 1)}</option>)}</Select></Field>
              <Field label="Số mã đề"><Input type="number" min={1} max={24} value={variants} onChange={(e) => setVariants(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} data-testid="e-variants" /></Field>
              <Field label="Thời gian (phút)"><Input type="number" min={5} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 45)} /></Field>
            </div>
          </section>
        </aside>
        <div style={{ display: "grid", gap: "var(--s-4)", minWidth: 0 }}>
          <section className="pane" aria-label="Ma trận">
            <div className="ghd">Ma trận <span className="n">{cells.length} dòng · {total} câu</span><span className="grow" /><Button size="sm" variant="ghost" icon="plus" onClick={() => setCells([...cells, { topic: cells[cells.length - 1]?.topic ?? "", level: "TH", type: "mcq", count: 1 }])}>Thêm dòng</Button></div>
            <div className="table-wrap">
              <table className="data dense matrix-t">
                <thead><tr><th>Chủ đề</th><th>Mức</th><th>Dạng</th><th className="r">Số câu</th><th className="hide-sm">Yêu cầu cần đạt</th><th /></tr></thead>
                <tbody>
                  {cells.map((c, i) => {
                    const short = shortages?.find((s) => s.cell.topic === c.topic && s.cell.level === c.level && s.cell.type === c.type);
                    return (
                      <tr key={i} data-testid="cell" className={short ? "flag" : undefined}>
                        <td><Input aria-label="Chủ đề" value={c.topic} onChange={(e) => setCell(i, { topic: e.target.value })} />{short && <span className="t-sub" style={{ color: "var(--danger)" }}>Ngân hàng có {short.have}/{short.need} câu</span>}</td>
                        <td><Select aria-label="Mức" value={c.level} onChange={(e) => setCell(i, { level: e.target.value })}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></td>
                        <td><Select aria-label="Dạng" value={c.type} onChange={(e) => setCell(i, { type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></td>
                        <td className="r"><Input aria-label="Số câu" type="number" min={1} value={c.count} onChange={(e) => setCell(i, { count: Math.max(1, Number(e.target.value) || 1) })} style={{ width: 64, textAlign: "right" }} /></td>
                        <td className="hide-sm"><Input aria-label="Yêu cầu cần đạt" placeholder="tuỳ chọn" value={c.yccd ?? ""} onChange={(e) => setCell(i, { yccd: e.target.value })} data-testid="cell-yccd" /></td>
                        <td className="r"><IconButton icon="trash" label="Xoá dòng" size="sm" disabled={cells.length === 1} onClick={() => setCells(cells.filter((_, j) => j !== i))} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td colSpan={3}><b>Tổng</b> <span className="caption">{byType.map((n, i) => (n ? `${typeVi(TYPES[i]![0])} ${n}` : "")).filter(Boolean).join(" · ")}</span></td><td className="r"><b className="num">{total}</b></td><td className="hide-sm caption">{byLevel.map((n, i) => `${LEVELS[i]![0]} ${n}`).join(" · ")}</td><td /></tr></tfoot>
              </table>
            </div>
          </section>
          <section className="pane" aria-label="Kiểm tra tự động" data-testid="shortages">
            <div className="ghd">Kiểm tra tự động <span className="n">{checks.filter((c) => c[0]).length} đạt · {checks.filter((c) => c[0] === false).length} cần xem</span></div>
            <ul className="checks">
              {checks.map(([ok, t], i) => (
                <li key={i} className={ok === null ? "na" : ok ? "ok" : "warn"}><Icon name={ok === null ? "info" : ok ? "ok" : "alert"} size="sm" /><span>{t}</span></li>
              ))}
              {shortages?.map((s, i) => (
                <li key={`s${i}`} className="warn"><Icon name="alert" size="sm" /><span>{s.cell.topic} · {s.cell.level} · {typeVi(s.cell.type)}: ngân hàng có {s.have}/{s.need} câu — <Link className="link" to={`/ngan-hang?ai=1&chu-de=${encodeURIComponent(s.cell.topic)}`}>AI soạn thêm</Link></span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
