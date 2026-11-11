import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { aiSkill, type LessonBody, type LessonDetail, type LessonSummary } from "../api";
import { dateVi, del, errorOf, FilterBar, FormPane, get, gradeVi, openLink, post, SearchBox, statusOf, useKeyN, useListView, useOpenParam, useRun } from "../portal/gv/kit";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/components/Button";
import { Chip } from "../ui/components/Chip";
import { ConfirmDialog } from "../ui/components/Dialog";
import { Field, Input, Select } from "../ui/components/Field";
import { Skeleton } from "../ui/components/Skeleton";
import { Region } from "../ui/components/States";
import { type Column, Table } from "../ui/components/Table";
import { invalidate, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { PageHead } from "../ui/shell/PageHead";

const TITLES = ["Mở đầu (Xác định vấn đề/nhiệm vụ học tập)", "Hình thành kiến thức mới", "Luyện tập", "Vận dụng"];
const STEPS = ["Chuyển giao nhiệm vụ", "Thực hiện nhiệm vụ", "Báo cáo, thảo luận", "Kết luận, nhận định"] as const;
export const LESSONS_KEY = "gv/giao-an";
export const fetchLessons = get<LessonSummary[]>("/api/lessons");

/** /giao-an — danh sách giáo án (bảng v2: tìm, lọc môn, sắp, trang trên URL) + AI soạn giáo án 5512 (?tao=1). */
export function Lessons() {
  usePageMeta("Giáo án");
  const nav = useNavigate();
  const q = useQuery(LESSONS_KEY, fetchLessons);
  const [ai, setAi] = useOpenParam();
  const [mon, setMon] = useUrlState<string>("mon", "");
  useKeyN(() => setAi(true));
  const subjects = useMemo(() => [...new Set((q.data ?? []).map((l) => l.subject))].sort(), [q.data]);
  const sorts = useMemo(() => ({ ten: (l: LessonSummary) => l.title, tiet: (l: LessonSummary) => l.periods, sua: (l: LessonSummary) => l.updatedAt }), []);
  const filter = useMemo(() => (mon ? (l: LessonSummary) => l.subject === mon : undefined), [mon]);
  const v = useListView(q.data, { text: (l) => `${l.title} ${l.subject}`, sorts, defSort: "-sua", filter });
  const cols: Column<LessonSummary>[] = [
    { key: "ten", header: "Bài dạy", sortable: true, cell: (l) => <Link className="t-title" to={`/giao-an/${l.id}`} onClick={(e) => e.stopPropagation()}>{l.title}</Link> },
    { key: "mon", header: "Môn · lớp", cell: (l) => <span className="caption">{l.subject} · {gradeVi(l.grade)}</span> },
    { key: "tiet", header: "Số tiết", numeric: true, sortable: true, hideSm: true, cell: (l) => l.periods },
    { key: "sua", header: "Sửa lần cuối", numeric: true, sortable: true, hideSm: true, cell: (l) => dateVi(l.updatedAt) },
  ];
  return (
    <>
      <PageHead title="Giáo án" primary={{ label: "AI soạn giáo án", icon: "spark", kbd: "N", onClick: () => setAi(true) }}>
        {q.data && <span className="caption hide-sm">{q.data.length} giáo án · mẫu CV 5512</span>}
      </PageHead>
      {ai && <AiLessonForm onClose={() => setAi(false)} />}
      <section className="pane" aria-label="Danh sách giáo án" data-testid="lesson-cards">
        <FilterBar>
          <SearchBox value={v.q} onChange={v.setQ} placeholder="Tìm tên bài…  /" label="Tìm giáo án" />
          {subjects.length > 1 && subjects.map((s) => <Chip key={s} pressed={mon === s} onClick={() => setMon(mon === s ? "" : s)}>{s}</Chip>)}
        </FilterBar>
        <Table
          label="Giáo án"
          columns={cols}
          rows={v.rows}
          rowKey={(l) => l.id}
          status={statusOf(q) === "ok" && v.total === 0 ? "trong" : statusOf(q)}
          stale={q.stale}
          sort={v.sort}
          onSort={v.setSort}
          page={v.pageProp}
          onRowClick={(l) => nav(`/giao-an/${l.id}`)}
          onRetry={q.refetch}
          error={errorOf(q.error)}
          skeletonRows={6}
          empty={q.data?.length ? { icon: "search", title: "Không có giáo án nào khớp", text: "Thử bỏ lọc môn hoặc tìm tên khác." } : { icon: "book", title: "Chưa có giáo án", text: "Nhập tên bài và số tiết — AI soạn đủ 4 hoạt động theo CV 5512 để cô/thầy sửa.", action: <Button size="sm" variant="primary" icon="spark" onClick={() => setAi(true)}>AI soạn giáo án</Button> }}
        />
      </section>
    </>
  );
}

function AiLessonForm({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const run = useRun();
  const [f, setF] = useState({ subject: "Toán", grade: 10, title: "", periods: 2, note: "" });
  const [busy, setBusy] = useState(false);
  const go = () => {
    setBusy(true);
    return run(async () => {
      const r = await aiSkill<{ id: string }>("giao-an", { ...f, title: f.title.trim(), note: f.note.trim() || undefined });
      invalidate(LESSONS_KEY);
      nav(`/giao-an/${r.id}`);
      return r;
    }, `Đã soạn giáo án “${f.title.trim()}”`).finally(() => setBusy(false));
  };
  return (
    <FormPane
      title="AI soạn giáo án"
      sub="CV 5512 · 4 hoạt động"
      onClose={onClose}
      testId="ai-lesson-form"
      footer={<><span className="caption">{busy ? "AI soạn từng mục, khoảng 1–3 phút — có thể mở trang khác, giáo án vẫn được lưu." : "Bản nháp để cô/thầy sửa, không dùng nguyên văn."}</span><Button onClick={onClose}>Huỷ</Button><Button variant="primary" icon="spark" disabled={!f.title.trim() || !f.subject.trim()} onClick={go} data-testid="ai-lesson-run">Soạn</Button></>}
    >
      <div className="fgrid">
        <div className="wide"><Field label="Tên bài / chủ đề"><Input autoFocus value={f.title} placeholder="Hàm số bậc hai" onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="ai-lesson-title" /></Field></div>
        <Field label="Môn"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Lớp"><Select value={f.grade} onChange={(e) => setF({ ...f, grade: Number(e.target.value) })}>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i + 1}>{gradeVi(i + 1)}</option>)}</Select></Field>
        <Field label="Số tiết"><Input type="number" min={1} max={20} value={f.periods} onChange={(e) => setF({ ...f, periods: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} /></Field>
        <div className="full"><Field label="Ghi chú cho AI" hint="tuỳ chọn — vd: lớp đông, có máy chiếu, ưu tiên hoạt động nhóm"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
      </div>
      {busy && (
        <div className="ai-run" aria-busy="true">
          <div className="stream-bar" />
          <ol className="steps">
            <li className="done"><span className="dot"><Icon name="check" /></span>Đọc yêu cầu cần đạt</li>
            <li className="now"><span className="dot" />Soạn mục tiêu + 4 hoạt động</li>
            <li><span className="dot" />Kiểm cấu trúc 5512</li>
          </ol>
        </div>
      )}
    </FormPane>
  );
}

function Body({ a }: { a: LessonBody }) {
  const steps = [a.steps.assign, a.steps.perform, a.steps.report, a.steps.conclude];
  return (
    <>
      <p><b>a) Mục tiêu:</b> {a.goal}</p>
      <p><b>b) Nội dung:</b> {a.content}</p>
      <p><b>c) Sản phẩm:</b> {a.product}</p>
      <p><b>d) Tổ chức thực hiện:</b></p>
      <ol>{steps.map((s, i) => <li key={i}><i>{STEPS[i]}:</i> {s}</li>)}</ol>
    </>
  );
}

/** /giao-an/:id — đọc giáo án trên "giấy" serif, mục lục dính bên trái; tải Word, làm slide, xoá. */
export function LessonDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const q = useQuery(`gv/giao-an/${id}`, get<LessonDetail>(`/api/lessons/${id}`));
  const l = q.data;
  usePageMeta(l?.title ?? "Giáo án", [{ label: "Giáo án", to: "/giao-an" }, { label: l?.title ?? "…" }]);
  const run = useRun();
  const [toDel, setToDel] = useState(false);
  if (!l)
    return q.error ? (
      <Region className="pane" label="Giáo án" status="loi" error={errorOf(q.error)} onRetry={q.refetch} />
    ) : (
      <>
        <div className="page-head bar"><Skeleton w={280} h={22} /></div>
        <div className="work toc-l"><aside><div className="pane" style={{ height: 240 }} /></aside><article className="pane"><div className="paper" aria-busy="true">{[90, 70, 84, 60, 76, 88, 50].map((w, i) => <Skeleton key={i} w={`${w}%`} h={14} style={{ margin: "10px 0" }} />)}</div></article></div>
      </>
    );
  const { plan } = l;
  const h = plan.header;
  return (
    <>
      <div className="page-head bar">
        <h1>{l.title}</h1>
        <span className="caption hide-sm">{l.subject} · {gradeVi(l.grade)} · {l.periods} tiết · sửa {dateVi(l.updatedAt)}</span>
        <div className="acts">
          <Button size="sm" variant="ghost" icon="trash" className="danger" onClick={() => setToDel(true)}>Xoá</Button>
          <Button size="sm" icon="slide" onClick={() => run(async () => { await post("/api/slides", { lessonPlanId: l.id }); invalidate("gv/slide"); }, { title: "Đã tạo bộ slide từ giáo án", action: { label: "Mở", run: () => nav("/slide") } })}>Làm slide</Button>
          <Button size="sm" variant="primary" icon="down" onClick={() => run(() => openLink(`/api/lessons/${l.id}/export`), "Đang tải giáo án .docx")} data-testid="export-lesson">Tải Word</Button>
        </div>
      </div>
      <div className="work toc-l">
        <aside>
          <nav className="pane" aria-label="Mục lục">
            <div className="ghd">Mục lục</div>
            <ul className="toc">
              <li><a href="#muc-tieu">I. Mục tiêu</a></li>
              <li><a href="#thiet-bi">II. Thiết bị dạy học</a></li>
              <li><a href="#tien-trinh">III. Tiến trình dạy học</a></li>
              {plan.activities.map((a, i) => <li key={i} className="lv2"><a href={`#hd-${i + 1}`}>Hoạt động {i + 1}{a.name ? `: ${a.name}` : ""}</a></li>)}
            </ul>
          </nav>
        </aside>
        <article className="pane" data-testid="lesson-view">
          <div className="paper">
            <div className="hdr">
              <div><b>{h.school || "Trường"}</b>{h.department || "Tổ chuyên môn"}</div>
              <div className="c"><b>KẾ HOẠCH BÀI DẠY</b>{l.title}</div>
              <div className="rt"><b>{l.subject} · {gradeVi(l.grade)}</b>{l.periods} tiết{h.teacher ? ` · ${h.teacher}` : ""}</div>
            </div>
            <h2 id="muc-tieu">I. Mục tiêu</h2>
            <h3>1. Kiến thức</h3>
            <ul>{plan.objectives.knowledge.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <h3>2. Năng lực</h3>
            <p><i>Năng lực chung</i></p>
            <ul>{plan.objectives.competencies.general.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <p><i>Năng lực đặc thù</i></p>
            <ul>{plan.objectives.competencies.specific.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <h3>3. Phẩm chất</h3>
            <ul>{plan.objectives.qualities.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <h2 id="thiet-bi">II. Thiết bị dạy học và học liệu</h2>
            <ul>{plan.materials.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <h2 id="tien-trinh">III. Tiến trình dạy học</h2>
            {plan.activities.map((a, i) => (
              <section key={i} className="act" id={`hd-${i + 1}`} data-testid="lesson-activity">
                <b>Hoạt động {i + 1}: {TITLES[i]}{a.name ? ` — ${a.name}` : ""}</b>
                {a.subs.length > 0 ? a.subs.map((s, j) => <div key={j} className="sub-act"><p><i>Hoạt động 2.{j + 1}{s.name ? `: ${s.name}` : ""}</i></p><Body a={s} /></div>) : <Body a={a} />}
              </section>
            ))}
          </div>
        </article>
      </div>
      <ConfirmDialog
        open={toDel}
        title={`Xoá giáo án “${l.title}”?`}
        text="Bộ slide đã tạo từ giáo án này vẫn giữ. Không hoàn tác được."
        confirmLabel="Xoá giáo án"
        onClose={() => setToDel(false)}
        onConfirm={() => run(async () => { await del(`/api/lessons/${l.id}`); invalidate(LESSONS_KEY); nav("/giao-an"); }, "Đã xoá giáo án")}
      />
    </>
  );
}
