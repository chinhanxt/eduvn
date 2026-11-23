import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { vn } from "../../api";
import { ApiError } from "../../apiCore";
import { ASG_KEY, bySubject, ddmm, fetchAssignments, type Scored, scoredOf, subjectsOf, summary } from "../../student/data";
import { HOC_PATH } from "../../student/paths";
import { clearSession } from "../../student/session";
import { ChartFrame, ChartTable, vnShort } from "../../ui/charts/core";
import { Skeleton } from "../../ui/components/Skeleton";
import { EmptyState, ErrorState } from "../../ui/components/States";
import { type Column, parseSort, Table } from "../../ui/components/Table";
import { Icon } from "../../ui/Icon";
import { useQuery } from "../../ui/data/query";
import { useUrlState } from "../../ui/data/urlState";
import { usePageMeta } from "../../ui/shell/AppShell";
import { subjectColor } from "../hocToday";
import { useLearner } from "./HocShell";
import { Mascot } from "./Mascot";
import { givenName, mascotLine, moodForScore } from "./mascot";
import "../../student/hs.css";

const PAGE = 10;
const sgn = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${vn(Math.abs(x))}`;

/** Đường điểm các bài theo thời gian, thang 0–10, vạch 5,0; điểm cuối đậm + có số. */
function ScoreLine({ rows }: { rows: readonly Scored[] }) {
  const H = 168;
  const table = <ChartTable caption="Điểm từng bài" head={["Bài", "Ngày", "Điểm"]} rows={rows.map((r) => [r.title, ddmm(r.dueAt), vnShort(r.score10)])} />;
  return (
    <ChartFrame height={H} table={table}>
      {(W) => {
        const m = { t: 20, r: 16, b: 24, l: 28 };
        const n = rows.length;
        const x = (i: number) => m.l + (n <= 1 ? (W - m.l - m.r) / 2 : (i / (n - 1)) * (W - m.l - m.r));
        const y = (v: number) => m.t + (1 - v / 10) * (H - m.t - m.b);
        const pts = rows.map((r, i) => `${x(i).toFixed(1)},${y(r.score10).toFixed(1)}`).join(" ");
        const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - 40) / 56))));
        return (
          <svg className="chart score-line" width={W} height={H} role="img" aria-label={`Điểm ${n} bài: ${rows.map((r) => vnShort(r.score10)).join(", ")}`}>
            <rect x={m.l} y={y(5)} width={W - m.l - m.r} height={y(0) - y(5)} fill="var(--danger-bg)" opacity=".55" />
            <g className="grid">
              {[0, 5, 10].map((v) => (
                <g key={v}>
                  <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} strokeDasharray={v === 5 ? "3 3" : undefined} />
                  <text x={m.l - 8} y={y(v) + 4} textAnchor="end">{v}</text>
                </g>
              ))}
            </g>
            <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="draw" />
            {rows.map((r, i) => {
              const last = i === n - 1;
              return (
                <g key={r.id} className="g" tabIndex={0} data-tip={`${vnShort(r.score10)}|${r.title} · ${ddmm(r.dueAt)}`}>
                  <circle cx={x(i)} cy={y(r.score10)} r={12} className="hit" />
                  <circle cx={x(i)} cy={y(r.score10)} r={last ? 5 : 3.5} fill={r.score10 < 5 ? "var(--danger)" : last ? "var(--accent)" : "var(--bg-raised)"} stroke={r.score10 < 5 ? "var(--danger)" : "var(--accent)"} strokeWidth={2} />
                  {((i % every === 0 && n - 1 - i >= every) || last) && <text x={x(i)} y={H - 6} textAnchor="middle">{ddmm(r.dueAt)}</text>}
                </g>
              );
            })}
            {n > 0 && <text x={x(n - 1)} y={y(rows[n - 1]!.score10) - 10} textAnchor={n > 1 ? "end" : "middle"} className="lbl-strong">{vnShort(rows[n - 1]!.score10)}</text>}
          </svg>
        );
      }}
    </ChartFrame>
  );
}

function Skel() {
  return (
    <div className="kqt" aria-busy="true" aria-label="Đang tải kết quả">
      <div className="kqt-stats">{[0, 1, 2, 3].map((i) => <div className="card" key={i}><Skeleton w={90} h={12} /><Skeleton w={70} h={34} style={{ marginTop: 10 }} /></div>)}</div>
      <div className="kqt-grid">
        <section className="card"><Skeleton w={160} h={18} /><Skeleton w="100%" h={168} style={{ marginTop: 16, borderRadius: 12 }} /></section>
        <section className="card"><Skeleton w={120} h={18} />{[0, 1, 2].map((i) => <Skeleton key={i} w="90%" h={14} style={{ marginTop: 16 }} />)}</section>
      </div>
    </div>
  );
}

/** "Kết quả" tổng hợp cổng Học: điểm trung bình, diễn biến điểm, theo môn, danh sách bài đã chấm (lọc môn ?mon=, sắp ?sap=, trang ?trang=). */
export function KetQua() {
  usePageMeta("Kết quả");
  const nav = useNavigate();
  const { session } = useLearner();
  const q = useQuery(session ? ASG_KEY : null, fetchAssignments, { staleMs: 15_000 });
  const [mon, setMon] = useUrlState<string>("mon", "");
  const [sap, setSap] = useUrlState<string>("sap", "-ngay");
  const [trang, setTrang] = useUrlState<number>("trang", 1);
  useEffect(() => {
    if (q.error instanceof ApiError && q.error.status === 401) clearSession();
  }, [q.error]);
  const all = q.data;
  const subjects = all ? subjectsOf(all) : [];
  const rows = useMemo(() => (all ? scoredOf(all, mon) : []), [all, mon]);
  const s = summary(rows);
  const subj = bySubject(all ? scoredOf(all) : []);
  const sorted = useMemo(() => {
    const p = parseSort(sap);
    const k = p?.key ?? "ngay";
    const val = (r: Scored) => (k === "diem" ? r.score10 : k === "ten" ? r.title : Date.parse(r.dueAt));
    const out = [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return typeof va === "string" ? va.localeCompare(vb as string, "vi") : va - (vb as number);
    });
    return p?.dir === "descending" ? out.reverse() : out;
  }, [rows, sap]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const page = Math.min(Math.max(1, trang), pages);
  const cols: Column<Scored>[] = [
    { key: "ten", header: "Bài", sortable: true, clip: true, cell: (r) => <span className="kqt-name"><i className="dot" style={{ background: subjectColor(r.subject, Math.max(0, subjects.indexOf(r.subject))) }} /><b>{r.title}</b></span> },
    { key: "mon", header: "Môn", hideSm: true, cell: (r) => r.subject },
    { key: "ngay", header: "Ngày", sortable: true, numeric: true, width: 90, cell: (r) => ddmm(r.dueAt) },
    { key: "diem", header: "Điểm", sortable: true, numeric: true, width: 84, cell: (r) => <b className={r.score10 < 5 ? "dn" : undefined}>{vn(r.score10)}</b> },
  ];

  if (!session)
    return (
      <div className="kqt">
        <h1 className="page-title">Kết quả</h1>
        <section className="card" style={{ marginTop: "var(--s-5)" }}>
          <EmptyState icon="key" title="Vào lớp để xem kết quả" text="Kết quả bài làm gắn với lớp của em. Nhập mã tham gia hoặc mã lớp + PIN một lần là xong." action={<Link className="btn primary" to={HOC_PATH.baiTap}><span>Vào lớp</span></Link>} />
        </section>
      </div>
    );

  const name = givenName(session.student.fullName);
  const mood = s.delta !== null && s.delta > 0 ? "khen" : moodForScore(s.last);
  return (
    <div className={q.stale ? "kqt is-stale" : "kqt"}>
      <div className="ba-head">
        <div>
          <h1 className="page-title">Kết quả</h1>
          <p className="caption">{all ? `${s.n} bài đã có điểm${mon ? ` · ${mon}` : ""}` : " "}</p>
        </div>
        <span className="grow" />
        {all && s.n > 0 && <Mascot key={mood} mood={mood} size={52} className="hide-sm" say={s.delta !== null && s.delta > 0 ? `Tiến bộ ${sgn(s.delta)} điểm${name ? `, ${name}` : ""}!` : mascotLine(mood, { name })} />}
      </div>
      {subjects.length > 1 && (
        <div className="ba-bar">
          <div className="ba-subj" role="group" aria-label="Môn">
            <button type="button" className="chip" aria-pressed={!mon} onClick={() => setMon("")}>Mọi môn</button>
            {subjects.map((x, i) => (
              <button type="button" key={x} className="chip" aria-pressed={mon === x} onClick={() => setMon(mon === x ? "" : x)}>
                <i className="dot" style={{ background: subjectColor(x, i) }} />
                {x}
              </button>
            ))}
          </div>
        </div>
      )}
      {!all && q.error ? (
        <ErrorState title="Không tải được kết quả" status={q.error instanceof ApiError ? q.error.status : undefined} onRetry={() => q.refetch()} />
      ) : !all ? (
        <Skel />
      ) : s.n === 0 ? (
        <section className="card">
          <EmptyState icon="chart" title="Chưa có bài nào có điểm" text="Nộp bài xong, điểm và nhận xét sẽ hiện ở đây." action={<Link className="btn primary" to={HOC_PATH.baiTap}><span>Xem bài cần làm</span></Link>} />
        </section>
      ) : (
        <>
          <div className="kqt-stats enter">
            <div className="card stat-c"><span className="caption">Điểm trung bình</span><b className="big">{vn(s.avg ?? 0)}</b><small>{s.n} bài</small></div>
            <div className="card stat-c">
              <span className="caption">Bài gần nhất</span>
              <b className="big">{vn(s.last ?? 0)}</b>
              <small>{s.delta === null ? "bài đầu tiên" : <span className={s.delta > 0 ? "up" : s.delta < 0 ? "dn" : undefined}>{sgn(s.delta)} so với bài trước</span>}</small>
            </div>
            <div className="card stat-c"><span className="caption">Cao nhất</span><b className="big">{vn(s.best ?? 0)}</b><small>trên 10</small></div>
            <div className="card stat-c"><span className="caption">Dưới 5,0</span><b className={s.below ? "big dn" : "big"}>{s.below}</b><small>{s.below ? "bài cần xem lại" : "không có bài nào"}</small></div>
          </div>
          <div className="kqt-grid">
            <section className="card" aria-label="Diễn biến điểm">
              <div className="hd"><h2>Diễn biến điểm</h2><span className="grow" /><span className="caption">thang 0–10 · vạch 5,0</span></div>
              <ScoreLine rows={rows.slice(-16)} />
            </section>
            <section className="card" aria-label="Theo môn">
              <div className="hd"><h2>Theo môn</h2></div>
              <ul className="kqt-subj">
                {subj.map((x, i) => (
                  <li key={x.subject}>
                    <button type="button" aria-pressed={mon === x.subject} onClick={() => setMon(mon === x.subject ? "" : x.subject)}>
                      <i className="dot" style={{ background: subjectColor(x.subject, Math.max(0, subjects.indexOf(x.subject))) }} />
                      <span className="t">{x.subject}<small>{x.n} bài · gần nhất {vn(x.last)}</small></span>
                      <b className={x.avg < 5 ? "dn" : undefined}>{vn(x.avg)}</b>
                    </button>
                    <span className="bar" style={{ ["--v" as string]: `${x.avg * 10}%`, ["--h" as string]: subjectColor(x.subject, i) }} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section className="panel kqt-table" aria-label="Các bài đã chấm">
            <div className="hd"><h2>Các bài đã chấm</h2></div>
            <Table
              label="Các bài đã chấm"
              columns={cols}
              rows={sorted.slice((page - 1) * PAGE, page * PAGE)}
              rowKey={(r) => r.id}
              sort={sap}
              onSort={(k) => setSap(k ?? "-ngay")}
              onRowClick={(r) => nav(HOC_PATH.ketQua(r.lastSubmissionId))}
              stale={q.stale}
              page={sorted.length > PAGE ? { page, pageSize: PAGE, total: sorted.length, onPage: setTrang } : undefined}
            />
            <p className="caption kqt-hint"><Icon name="info" size="sm" /> Bấm một bài để xem từng câu và lời giải.</p>
          </section>
        </>
      )}
    </div>
  );
}

