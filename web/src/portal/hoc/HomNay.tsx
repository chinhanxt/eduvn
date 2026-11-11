import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { StreakDays } from "../../ui/charts/Heatmap";
import { RingBig } from "../../ui/components/Progress";
import { Skeleton } from "../../ui/components/Skeleton";
import { EmptyState, ErrorState } from "../../ui/components/States";
import { Icon } from "../../ui/Icon";
import { useQuery } from "../../ui/data/query";
import { usePageMeta } from "../../ui/shell/AppShell";
import { heroAction, heroTitle, longDay, metricText, subjectColor, subjectIcon } from "../hocToday";
import type { HocToday } from "../today";
import { fetchHocToday, HOC_TODAY_KEY } from "./data";
import { useLearner } from "./HocShell";

// Biểu đồ thành thạo nằm dưới thẻ việc tiếp theo: tải riêng (giữ JS lần đầu < 100 KB).
const DotPlot = lazy(() => import("../../ui/charts/DotPlot").then((m) => ({ default: m.DotPlot })));
const MasterySkel = ({ n }: { n: number }) => (
  // cùng chiều cao DotPlot (18 + 30/hàng + 22) + dòng "Xem dạng bảng" → không xô lệch khi biểu đồ về
  <div aria-hidden="true" style={{ paddingTop: 18, minHeight: 18 + n * 30 + 22 + 28 }}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", height: 30 }}>
        <Skeleton w={150} h={12} />
        <Skeleton w={`${[70, 55, 45, 30, 60, 50, 40, 65][i % 8]}%`} h={8} />
      </div>
    ))}
  </div>
);

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });

function Hero({ d }: { d: HocToday }) {
  const n = d.next;
  const eyebrow = `${longDay(d.date.weekday, d.date.day)}${d.student.className ? ` · Lớp ${d.student.className}` : ""}`;
  return (
    <section className="page-head hero-field" aria-label="Việc tiếp theo">
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{heroTitle(n)}</h1>
        <p className="sub">
          {n ? (
            <>
              {n.title}
              {n.teacher ? ` của ${n.teacher}` : ""} — hạn {hhmm(n.dueAt)} {n.day === "Nay" ? "tối nay" : `${n.day} ${n.dayNum}`}.
            </>
          ) : (
            "Không còn bài nào đến hạn. Ôn một chút hoặc hỏi gia sư điều em chưa chắc."
          )}
        </p>
      </div>
      {n && (
        <RingBig value={n.answered} max={Math.max(1, n.total)} label={`Đã làm ${n.answered} trên ${n.total} câu`}>
          <b>{n.answered}/{n.total}</b>
          <span>câu đã làm</span>
        </RingBig>
      )}
      {n && (
        <div className="meta">
          <span><Icon name="clock" size="sm" />Hạn {hhmm(n.dueAt)}</span>
          <span><Icon name="timer" size="sm" />Khoảng {n.minutes} phút</span>
          {n.attemptsAllowed === 1 && <span><Icon name="lock" size="sm" />Làm 1 lần</span>}
        </div>
      )}
      <div className="acts">
        {n ? (
          <Link className="btn lg primary on-field" to={`/hoc/hs/bai/${n.assignmentId}`}>
            <span>{heroAction(n)}</span>
            <Icon name="right" size="sm" />
          </Link>
        ) : (
          <>
            {d.canTutor && (
              <Link className="btn lg primary on-field" to="/hoc/luyen-tap">
                <span>Luyện tập</span>
                <Icon name="right" size="sm" />
              </Link>
            )}
            <Link className="btn lg ghost-field" to="/hoc/hs">
              <span>Xem bài đã làm</span>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function Skel() {
  return (
    <div className="today-hoc" aria-busy="true" aria-label="Đang tải">
      <div style={{ minWidth: 0 }}>
        <section className="page-head hero-field" aria-hidden="true">
          <div style={{ position: "relative", zIndex: 1 }}>
            <Skeleton w={180} h={12} className="on-field" />
            <Skeleton w="62%" h={40} className="on-field" style={{ marginTop: 12 }} />
            <Skeleton w="80%" h={16} className="on-field" style={{ marginTop: 12 }} />
          </div>
          <div className="ringbig" style={{ ["--p" as string]: "0%" }}><div /></div>
          <div className="acts"><Skeleton w={180} h={48} className="on-field" style={{ borderRadius: 10 }} /></div>
        </section>
        <div className="subjects">
          {[0, 1, 2].map((i) => (
            <div className="subj card-skel" key={i}>
              <Skeleton w={110} h={24} />
              <Skeleton w={70} h={26} />
              <Skeleton w="80%" h={12} />
            </div>
          ))}
        </div>
        <section className="card" style={{ marginTop: "var(--s-4)" }}>
          <Skeleton w="50%" h={20} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", height: 30 }}>
              <Skeleton w={150} h={12} />
              <Skeleton w={`${[70, 55, 45, 30, 60][i]}%`} h={8} />
            </div>
          ))}
        </section>
      </div>
      <aside className="rail">
        {[3, 1, 2].map((n, i) => (
          <section className="card" key={i}>
            <Skeleton w={110} h={18} />
            {Array.from({ length: n }, (_, j) => (
              <Skeleton key={j} w="90%" h={14} style={{ marginTop: 14 }} />
            ))}
          </section>
        ))}
      </aside>
    </div>
  );
}

/** Màn "Hôm nay" cổng Học (mockup hoc/hom-nay.html, skin C): một lần gọi /api/hoc/hom-nay. */
export function HomNay() {
  usePageMeta("Hôm nay");
  const { auth } = useLearner();
  const q = useQuery(auth ? `${HOC_TODAY_KEY}:${auth}` : null, fetchHocToday(auth ?? "hs"));
  const d = q.data;
  if (!d && q.error) return <ErrorState title="Không tải được trang Hôm nay" onRetry={() => q.refetch()} />;
  if (!d) return <Skel />;
  const account = auth === "user";
  const subjLink = account ? "/hoc/giao-trinh" : "/hoc/hs";
  return (
    <div className={q.stale ? "today-hoc is-stale" : "today-hoc"}>
      <div style={{ minWidth: 0 }}>
        <Hero d={d} />
        {d.subjects.length > 0 && (
          <div className="subjects enter" style={{ ["--n" as string]: d.subjects.length }}>
            {d.subjects.map((s, i) => {
              const c = subjectColor(s.subject, i);
              const m = metricText(s.metric);
              return (
                <Link key={s.subject} className="subj tint" style={{ ["--h" as string]: c }} to={s.metric.kind === "cards" && account ? "/hoc/luyen-tap" : subjLink}>
                  <div className="tr">
                    <span className="ic" style={{ color: c }}><Icon name={subjectIcon(s.subject)} /></span>
                    <h3>{s.subject}</h3>
                  </div>
                  <span className="pct"><b>{m.big}</b>{m.small}</span>
                  <div className="next">
                    {s.next ? (
                      <>
                        {s.next.title}
                        <small>{s.next.when}</small>
                      </>
                    ) : (
                      <small>Chưa có bài sắp tới</small>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <section className="card" style={{ marginTop: "var(--s-4)" }} aria-label="Mức thành thạo">
          <div className="hd">
            <h2>{d.mastery ? `${d.mastery.subject} — em vững chủ đề nào?` : "Em vững chủ đề nào?"}</h2>
            <span className="grow" />
            {account && <Link className="btn sm" to="/hoc/giao-trinh">Mở giáo trình</Link>}
          </div>
          {d.mastery && d.mastery.rows.length > 0 ? (
            <>
              <Suspense fallback={<MasterySkel n={d.mastery.rows.length} />}>
                <DotPlot rows={d.mastery.rows.map((r) => ({ label: r.topic, v: r.pct }))} refValue={50} refLabel="50%" labelW={160} nullLabel="chưa đủ câu" />
              </Suspense>
              <p className="caption" style={{ marginTop: "var(--s-2)" }}>
                Thang 0–100%, vạch 50%; tính từ bài làm{account ? " và thẻ ôn" : ""} 30 ngày.{" "}
                {d.mastery.weakest && (
                  <>
                    <b>{d.mastery.weakest.topic} {d.mastery.weakest.pct}%</b>
                    {d.canTutor ? " — hỏi gia sư để luyện thêm chủ đề này." : " — làm thêm bài để vững hơn."}
                  </>
                )}
              </p>
            </>
          ) : (
            <EmptyState icon="chart" title="Chưa đủ dữ liệu" text="Làm ít nhất 3 câu mỗi chủ đề để thấy mức thành thạo." />
          )}
        </section>
      </div>

      <aside className="rail" aria-label="Bên cạnh">
        <section className="card">
          <div className="hd">
            <h2>Sắp tới</h2>
            <span className="grow" />
            <span className="chipc">{d.upcoming.length} bài</span>
          </div>
          {d.upcoming.length === 0 ? (
            <EmptyState icon="check" title="Không còn bài nào" text="Bài mới cô thầy giao sẽ hiện ở đây." />
          ) : (
            <ul className="due">
              {d.upcoming.map((u) => {
                const inner = (
                  <>
                    <span className={u.hot ? "d hot" : "d"}><small>{u.day}</small><b>{u.dayNum}</b></span>
                    <span className="t">
                      {u.title}
                      <small>
                        {u.subject} · {u.answered > 0 ? `${u.answered}/${u.total} câu` : `${u.total} câu`}
                        {u.attemptsAllowed === 1 ? " · làm 1 lần" : ""}
                      </small>
                    </span>
                  </>
                );
                return <li key={u.assignmentId}>{u.canStart ? <Link to={`/hoc/hs/bai/${u.assignmentId}`}>{inner}</Link> : <div>{inner}</div>}</li>;
              })}
            </ul>
          )}
        </section>
        {d.review && (
          <section className="card">
            <div className="hd"><h2>Ôn hôm nay</h2></div>
            <div className="review">
              <span className="n">{d.review.due}</span>
              <div className="grow">
                <b>thẻ đến hạn</b>
                <div className="caption">{d.review.due ? `~${d.review.minutes} phút` : "Đã ôn xong hôm nay"}</div>
              </div>
              <Link className="btn" to="/hoc/luyen-tap">
                <Icon name="play" size="sm" />
                <span>Ôn</span>
              </Link>
            </div>
          </section>
        )}
        <section className="card">
          <div className="hd">
            <h2>{d.days.length} ngày qua</h2>
            <span className="grow" />
            <span className="caption">mục tiêu {d.streak.goal} câu/ngày</span>
          </div>
          <StreakDays days={d.days} goal={d.streak.goal} />
        </section>
      </aside>
    </div>
  );
}
