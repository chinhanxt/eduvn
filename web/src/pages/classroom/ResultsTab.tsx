import { useMemo, useState } from "react";
import { Link } from "react-router";
import { vn } from "../../api";
import { MathText } from "../../math/MathText";
import { Region, SkelRows, errorOf, get, initialsOf, put, useListView, useRun, vnNum } from "../../portal/gv/kit";
import { binsOf, Histogram } from "../../ui/charts/Histogram";
import { Difficulty } from "../../ui/charts/Difficulty";
import { Button } from "../../ui/components/Button";
import { Badge } from "../../ui/components/Chip";
import { Dialog } from "../../ui/components/Dialog";
import { Input } from "../../ui/components/Field";
import { type Column, Table } from "../../ui/components/Table";
import { invalidate, useQuery } from "../../ui/data/query";
import { useUrlState } from "../../ui/data/urlState";
import type { ItemStat, ResultRow, ResultsPayload, SubmissionDetail } from "./types";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const LETTERS = "ABCD";
const LV: Record<string, [string, string]> = { NB: ["l1", "NB"], TH: ["l2", "TH"], VD: ["l3", "VD"] };
const band = (d: number): ["ok" | "accent" | "warn" | "danger", string] => (d >= 0.4 ? ["ok", "Tốt"] : d >= 0.3 ? ["accent", "Khá"] : d >= 0.2 ? ["warn", "Xem lại"] : ["danger", "Kém"]);
const resKey = (id: string) => `gv/ket-qua/${id}`;

/** Tab "Kết quả" (mockup gv/ket-qua.html): dải chỉ số · Hình 1 phổ điểm · Hình 2 độ khó · phân tích từng câu · HS cần quan tâm · bảng điểm + chấm tự luận. */
export function ResultsTab({ assignmentId }: { assignmentId: string }) {
  const q = useQuery(resKey(assignmentId), get<ResultsPayload>(`/api/assignments/${assignmentId}/results`));
  const [all, setAll] = useUrlState<string>("cau", "");
  const [open, setOpen] = useUrlState<string>("bai-lam", "", { mode: "push" });
  const r = q.data;
  const sorts = useMemo(() => ({ tt: (x: ResultRow) => x.seat, ten: (x: ResultRow) => x.fullName.split(/\s+/).pop() ?? "", diem: (x: ResultRow) => x.score10 }), []);
  const v = useListView(r?.rows, { text: (x) => x.fullName, sorts, defSort: "tt", pageSize: 50, prefix: "bd" });
  if (!r)
    return (
      <>
        <section className="kpis" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i}><div className="k">&nbsp;</div><div className="v"><span className="skel" style={{ display: "block", width: 56, height: 22, margin: "3px 0" }} /></div></div>)}</section>
        <Region className="pane mt" label="Kết quả" status={q.error ? "loi" : "dang-tai"} error={errorOf(q.error)} onRetry={q.refetch} skeletonRows={6} />
      </>
    );
  const s = r.stats;
  const scored = s.distribution.reduce((a, b) => a + b, 0);
  const pass = s.distribution.slice(5).reduce((a, b) => a + b, 0);
  const items = [...s.items].sort((a, b) => (a.p ?? 2) - (b.p ?? 2));
  const hard = items.filter((i) => i.p !== null && i.p < 0.4);
  const shown = all === "tat-ca" ? items : items.slice(0, 5);
  const wrongOf = (i: ItemStat) => i.choices.filter((c) => !c.correct).sort((a, b) => b.count - a.count)[0];
  const itemCols: Column<ItemStat>[] = [
    { key: "cau", header: "Câu", cell: (i) => <span className="row" style={{ gap: 6 }}><b>Câu {i.label}</b>{LV[i.level] && <span className={`lvl ${LV[i.level]![0]} hide-sm`}>{LV[i.level]![1]}</span>}</span> },
    { key: "chu-de", header: "Chủ đề", hideSm: true, clip: true, cell: (i) => i.topic },
    { key: "p", header: "% đúng", numeric: true, cell: (i) => (i.p === null ? "—" : <span className={i.p < 0.4 ? "hbar low" : "hbar"}><i style={{ ["--v" as string]: pct(i.p) }} />{pct(i.p)}</span>) },
    { key: "sai", header: "Sai phổ biến nhất", hideSm: true, cell: (i) => { const w = wrongOf(i); return w && w.count ? <span>Chọn <b><MathText value={w.choice} /></b> ({pct(w.count / Math.max(1, i.n))})</span> : <span className="muted">—</span>; } },
    { key: "d", header: "Phân biệt", numeric: true, hideSm: true, cell: (i) => (i.d === null ? <span className="muted" title="Cần ít nhất 10 bài">—</span> : <Badge tone={band(i.d)[0]} icon="">{vnNum(i.d)} · {band(i.d)[1]}</Badge>) },
    { key: "co", header: "", numeric: true, cell: (i) => (i.flag ? <Badge tone="warn">{i.flag}</Badge> : null) },
  ];
  const atCols: Column<ResultsPayload["stats"]["atRisk"][number]>[] = [
    { key: "ten", header: "Học sinh", cell: (a) => <div className="who"><span className="avatar sm hide-sm">{initialsOf(a.fullName)}</span><span>{a.fullName}<small>{a.seat ? `STT ${a.seat}` : ""}</small></span></div> },
    { key: "diem", header: "Bài này", numeric: true, cell: (a) => <span className={a.score10 != null && a.score10 < 5 ? "low-score" : "muted"}>{vnNum(a.score10)}</span> },
    { key: "ly-do", header: "Lý do", cell: (a) => <span className="row wrap" style={{ gap: 4 }}>{a.reasons.map((x) => <Badge key={x} tone={x.startsWith("Rời") ? "warn" : "danger"}>{x}</Badge>)}</span> },
  ];
  const rowCols: Column<ResultRow>[] = [
    { key: "tt", header: "TT", numeric: true, sortable: true, width: 48, cell: (x) => x.seat ?? "—" },
    { key: "ten", header: "Học sinh", sortable: true, cell: (x) => x.fullName },
    { key: "tt-bai", header: "Trạng thái", cell: (x) => <span className="row wrap" style={{ gap: 4 }}>{x.status === null ? <span className="muted">Chưa vào</span> : x.status === "in_progress" ? <Badge tone="accent">Đang làm</Badge> : x.status === "auto_submitted" ? <Badge tone="warn">Tự nộp hết giờ</Badge> : <Badge tone="ok">Đã nộp</Badge>}{x.pending > 0 && <Badge tone="accent" icon="pen">{x.pending} câu chờ chấm</Badge>}</span> },
    { key: "diem", header: "Điểm /10", numeric: true, sortable: true, cell: (x) => <span data-testid="lh-score" className={x.score10 != null && x.score10 < 5 ? "low-score" : undefined}>{vnNum(x.score10)}</span> },
    { key: "luot", header: "Lượt", numeric: true, hideSm: true, cell: (x) => x.attempts },
    { key: "xem", header: "", numeric: true, cell: (x) => (x.submissionId && x.status !== "in_progress" ? <Button size="sm" variant="ghost" onClick={() => setOpen(x.submissionId!)}>{x.pending > 0 ? "Chấm" : "Xem bài"}</Button> : null) },
  ];
  return (
    <>
      <section className="kpis" aria-label="Chỉ số">
        <div><div className="k">Đã nộp</div><div className="v" data-testid="lh-kpi-submit">{s.submitted}/{s.rosterSize} <small className="mu">{pct(s.submitRate)}</small></div></div>
        <div><div className="k">Điểm trung bình</div><div className="v">{vnNum(s.mean)}</div></div>
        <div><div className="k">Trung vị</div><div className="v">{vnNum(s.median)}</div></div>
        <div><div className="k">Đạt (≥ 5,0)</div><div className="v">{scored ? `${Math.round((pass / scored) * 100)}%` : "—"} <small className="mu">{pass}/{scored}</small></div></div>
        <div><div className="k">Cao nhất</div><div className="v">{s.best ? vnNum(s.best.score10) : "—"} {s.best && <small className="mu ell" title={s.best.fullName}>{s.best.fullName}</small>}</div></div>
        <div><div className="k">Thấp nhất</div><div className="v">{s.worst ? vnNum(s.worst.score10) : "—"} {s.worst && <small className="mu ell" title={s.worst.fullName}>{s.worst.fullName}</small>}</div></div>
      </section>
      <div className="figs">
        <figure className="pane">
          <div className="ghd"><span className="no">HÌNH 1</span> Phổ điểm <span className="grow" /><span className="n">{scored} bài đã chấm</span></div>
          <div className="fig">
            {scored ? <Histogram bins={binsOf(s.distribution)} median={s.median} height={220} /> : <p className="caption" style={{ padding: "40px 0", textAlign: "center" }}>Phổ điểm hiện khi có bài đã chấm.</p>}
            <figcaption>Số HS theo khoảng 1 điểm; vạch: ngưỡng 5,0. {scored ? <b>{scored - pass} em dưới ngưỡng.</b> : null}</figcaption>
          </div>
        </figure>
        <figure className="pane">
          <div className="ghd"><span className="no">HÌNH 2</span> Độ khó từng câu <span className="grow" /><span className="n">% làm đúng</span></div>
          <div className="fig">
            {items.some((i) => i.p !== null) ? <Difficulty rows={items.filter((i) => i.p !== null).slice(0, 12).map((i) => ({ label: `Câu ${i.label}`, p: Math.round((i.p ?? 0) * 100), topic: i.topic }))} flag={40} rowH={22} /> : <p className="caption" style={{ padding: "40px 0", textAlign: "center" }}>Chưa đủ bài nộp để tính.</p>}
            <figcaption>Nền xám: dưới 40% — nên chữa lại. {hard.length ? <b>{hard.length} câu dưới 40%: {hard.slice(0, 4).map((i) => i.label).join(", ")}.</b> : "Không câu nào dưới 40%."}</figcaption>
          </div>
        </figure>
      </div>
      <section className="pane mt" aria-label="Phân tích từng câu">
        <div className="ghd">Phân tích từng câu <span className="n">{items.length} câu · sắp theo % đúng tăng dần</span></div>
        <div data-testid="lh-items"><Table label="Phân tích từng câu" dense columns={itemCols} rows={shown} rowKey={(i) => i.questionId} status={items.length ? "ok" : "trong"} empty={{ icon: "chart", title: "Chưa có số liệu câu hỏi" }} /></div>
        {items.length > 5 && (
          <div className="ghd" style={{ borderBottom: 0, borderRadius: "0 0 var(--r-md) var(--r-md)" }}>
            <span className="n" style={{ fontWeight: 400 }}>Hiện {shown.length}/{items.length} câu · </span>
            <button type="button" className="link" style={{ border: 0, background: "none", padding: 0, fontSize: 12 }} onClick={() => setAll(all ? "" : "tat-ca")}>{all ? "thu gọn" : `xem cả ${items.length}`}</button>
            <span className="n" style={{ fontWeight: 400 }}>· Phân biệt &lt; 0,2: câu quá dễ hoặc lỗi đề</span>
          </div>
        )}
      </section>
      <section className="pane mt" aria-label="Học sinh cần quan tâm">
        <div className="ghd">Học sinh cần quan tâm <span className="n">{s.atRisk.length} · dưới 5,0 · rời tab nhiều · chưa nộp</span></div>
        <Table label="Học sinh cần quan tâm" dense columns={atCols} rows={s.atRisk} rowKey={(a) => a.studentId} status={s.atRisk.length ? "ok" : "trong"} empty={{ icon: "ok", title: "Không em nào cần quan tâm", text: "Tất cả đạt ngưỡng và không có dấu hiệu bất thường." }} />
      </section>
      <section className="pane mt" aria-label="Bảng điểm">
        <div className="ghd">Bảng điểm <span className="n">{r.rows.length} học sinh</span><span className="grow" /><Link className="btn ghost sm" to={`/so-diem?lop=${r.assignment.classId}`}>Sổ điểm</Link></div>
        <div data-testid="lh-results"><Table label="Bảng điểm" dense columns={rowCols} rows={v.rows} rowKey={(x) => x.studentId} sort={v.sort} onSort={v.setSort} page={v.pageProp} stale={q.stale} status={r.rows.length ? "ok" : "trong"} empty={{ icon: "users", title: "Lớp chưa có học sinh" }} /></div>
      </section>
      {open && <SubmissionView assignmentId={assignmentId} submissionId={open} onClose={() => setOpen("")} />}
    </>
  );
}

function answerOf(it: SubmissionDetail["items"][number]) {
  if (it.response === null || it.response === undefined) return <span className="muted">—</span>;
  if (it.type === "mcq" && typeof it.response === "number") return LETTERS[it.response];
  if (it.type === "true_false" && Array.isArray(it.response)) return it.response.map((b) => (b === null ? "_" : b ? "Đ" : "S")).join("");
  if (it.type === "short_answer") return <MathText value={`$${String(it.response)}$`} />;
  return String(it.response);
}

/** Hộp xem một bài làm (?bai-lam=); câu tự luận chấm điểm ngay trong hộp. */
function SubmissionView({ assignmentId, submissionId, onClose }: { assignmentId: string; submissionId: string; onClose: () => void }) {
  const q = useQuery(`gv/bai-lam/${submissionId}`, get<SubmissionDetail>(`/api/assignments/${assignmentId}/submissions/${submissionId}`));
  const d = q.data;
  const [pts, setPts] = useState<Record<string, string>>({});
  const run = useRun();
  const essays = d?.items.filter((x) => x.type === "essay") ?? [];
  const save = () =>
    run(async () => {
      const points = Object.fromEntries(Object.entries(pts).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Number(v.replace(",", "."))]));
      await put(`/api/assignments/${assignmentId}/submissions/${submissionId}/grades`, { points });
      invalidate(resKey(assignmentId));
      invalidate(`gv/bai-lam/${submissionId}`);
      onClose();
    }, `Đã lưu điểm tự luận${d ? ` cho ${d.student.fullName}` : ""}`);
  return (
    <Dialog
      open
      onClose={onClose}
      title={d ? `${d.student.fullName} · mã đề ${d.submission.variantCode}` : "Bài làm"}
      footer={
        <>
          <Button onClick={onClose}>Đóng</Button>
          {essays.length > 0 && <Button variant="primary" icon="check" onClick={save} data-testid="lh-grade-save">Lưu điểm tự luận</Button>}
        </>
      }
    >
      <div className="dialog-wide-body">
        {!d ? (
          q.error ? <p className="note err">Không tải được bài làm.</p> : <SkelRows rows={4} />
        ) : (
          <>
            <p className="caption">Điểm <b className="num">{vn(d.submission.score)}</b> / {vn(d.submission.maxScore)} · rời tab {d.submission.leaveCount} lần{d.events.some((e) => e.kind === "leave") ? ` (${d.events.filter((e) => e.kind === "leave").map((e) => new Date(e.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })).join(", ")})` : ""}</p>
            {d.items.map((it, i) => (
              <div key={it.no} className="ditem">
                <div className="row"><b>Câu {i + 1}</b><span className="caption">{vn(it.points) || "—"} / {vn(it.maxPoints)} điểm</span></div>
                <div className="stem"><MathText value={it.stem} /></div>
                <div className="caption">Trả lời: {answerOf(it)}{it.key && <> · Đáp án: <MathText value={it.key} /></>}</div>
                {it.type === "essay" && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {it.rubric && <p className="note"><MathText value={it.rubric} /></p>}
                    <label className="check-row">Điểm (tối đa {vn(it.maxPoints)})<Input style={{ width: 90 }} inputMode="decimal" defaultValue={it.points === null ? "" : vn(it.points)} onChange={(e) => setPts({ ...pts, [String(it.no)]: e.target.value })} data-testid={`lh-essay-${it.no}`} /></label>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Dialog>
  );
}
