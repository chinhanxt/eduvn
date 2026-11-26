import { type ReactNode, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { vn } from "../../api";
import { ApiError } from "../../apiCore";
import { ASG_KEY, bySubject, ddmm, fetchAssignments, type Scored, scoredOf, subjectsOf, summary } from "../../student/data";
import { HOC_PATH } from "../../student/paths";
import { clearSession } from "../../student/session";
import { ChartFrame, ChartTable, vnShort } from "../../ui/charts/core";
import { Skeleton } from "../../ui/components/Skeleton";
import { ErrorState } from "../../ui/components/States";
import { type Column, parseSort, Table } from "../../ui/components/Table";
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
  const H = 220;
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
    <div aria-busy="true" aria-label="Đang tải kết quả">
      <div className="kqt-top">
        <div className="kqt-fig"><Skeleton w={120} h={12} /><Skeleton w={140} h={64} style={{ marginTop: 10 }} /><Skeleton w="90%" h={40} style={{ marginTop: 20 }} /></div>
        <Skeleton w="100%" h={200} style={{ borderRadius: 12 }} />
      </div>
    </div>
  );
}

// Bản xem trước khi chưa có điểm: đường điểm mẫu, mờ.
const GHOST: Scored[] = [6.5, 7, 5.5, 7.5, 8, 7.25, 8.5].map((v, i) => ({ id: `g${i}`, title: "", subject: "", dueAt: new Date(Date.UTC(2026, 10, 10 + i * 2)).toISOString(), score10: v, lastSubmissionId: "" }) as unknown as Scored);

/** Trống = đường điểm mẫu mờ + một nút chính. */
function Empty({ title, text, action }: { title: string; text: string; action: ReactNode }) {
  return (
    <section className="kqt-empty">
      <div className="kqt-ghost" aria-hidden="true"><ScoreLine rows={GHOST} /></div>
      <div className="kqt-empty-t">
        <Mascot mood="chao" size={72} />
        <h2>{title}</h2>
        <p>{text}</p>
        {action}
      </div>
    </section>
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
        <header className="hh"><div><div className="hh-eyebrow">Điểm và nhận xét</div><h1 className="hh-title">Kết quả</h1></div></header>
        <Empty title="Vào lớp để xem kết quả" text="Nhập mã lớp + PIN một lần là xong." action={<Link className="btn primary" to={HOC_PATH.baiTap}><span>Vào lớp</span></Link>} />
      </div>
    );

  const name = givenName(session.student.fullName);
  const mood = s.delta !== null && s.delta > 0 ? "khen" : moodForScore(s.last);
  return (
    <div className={q.stale ? "kqt is-stale" : "kqt"}>
      <header className="hh">
        <div>
          <div className="hh-eyebrow">{all ? `${s.n} bài đã có điểm${mon ? ` · ${mon}` : ""}` : " "}</div>
          <h1 className="hh-title">Kết quả</h1>
        </div>
        {all && s.n > 0 && <Mascot key={mood} mood={mood} size={56} className="hide-sm" say={s.delta !== null && s.delta > 0 ? `Tiến bộ ${sgn(s.delta)} điểm${name ? `, ${name}` : ""}!` : mascotLine(mood, { name })} />}
      </header>
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
        <Empty title="Chưa có bài nào có điểm" text="Nộp bài xong, điểm sẽ hiện ở đây." action={<Link className="btn primary" to={HOC_PATH.baiTap}><span>Xem bài cần làm</span></Link>} />
      ) : (
        <>
          <section className="kqt-top hh-in" aria-label="Diễn biến điểm">
            <div className="kqt-fig">
              <span className="hh-eyebrow">Điểm trung bình</span>
              <b className="kqt-avg">{vn(s.avg ?? 0)}</b>
              <dl className="kqt-stats">
                <div><dt>Gần nhất</dt><dd>{vn(s.last ?? 0)}{s.delta !== null && <small className={s.delta > 0 ? "up" : s.delta < 0 ? "dn" : undefined}>{sgn(s.delta)}</small>}</dd></div>
                <div><dt>Cao nhất</dt><dd>{vn(s.best ?? 0)}</dd></div>
                <div><dt>Dưới 5</dt><dd className={s.below ? "dn" : undefined}>{s.below}</dd></div>
              </dl>
            </div>
            <div className="kqt-chart">
              <ScoreLine rows={rows.slice(-16)} />
            </div>
          </section>
          {subj.length > 0 && (
            <section className="kqt-subj-w" aria-label="Theo môn">
              <h2 className="hh-sec">Theo môn</h2>
              <ul className="kqt-subj">
                {subj.map((x, i) => (
                  <li key={x.subject} style={{ ["--h" as string]: subjectColor(x.subject, Math.max(0, subjects.indexOf(x.subject) >= 0 ? subjects.indexOf(x.subject) : i)) }}>
                    <button type="button" aria-pressed={mon === x.subject} onClick={() => setMon(mon === x.subject ? "" : x.subject)}>
                      <span className="t">{x.subject}<small>{x.n} bài · gần nhất {vn(x.last)}</small></span>
                      <span className="bar"><i style={{ width: `${x.avg * 10}%` }} /></span>
                      <b className={x.avg < 5 ? "dn" : undefined}>{vn(x.avg)}</b>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="kqt-table" aria-label="Các bài đã chấm">
            <h2 className="hh-sec">Các bài đã chấm<small>bấm để xem từng câu</small></h2>
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
          </section>
        </>
      )}
    </div>
  );
}

