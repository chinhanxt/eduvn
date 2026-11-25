import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { StreakDays } from "../../ui/charts/Heatmap";
import { Skeleton } from "../../ui/components/Skeleton";
import { ErrorState } from "../../ui/components/States";
import { Icon } from "../../ui/Icon";
import { useQuery } from "../../ui/data/query";
import { usePageMeta } from "../../ui/shell/AppShell";
import { heroAction, heroTitle, longDay, metricText, subjectColor } from "../hocToday";
import type { HocToday } from "../today";
import { fetchHocToday, HOC_TODAY_KEY } from "./data";
import { useLearner } from "./HocShell";
import { Mascot } from "./Mascot";
import { givenName, type Mood } from "./mascot";
import { HOC_PATH } from "../../student/paths";

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

/** Vòng tiến độ lớn (SVG, vẽ dần khi vào màn). */
const R = 80;
const C = 2 * Math.PI * R;
function Ring({ done, total, unit }: { done: number; total: number; unit: string }) {
  const p = Math.min(done, total) / Math.max(1, total);
  return (
    <div className="hn-ring" role="img" aria-label={`${done} trên ${total} ${unit}`}>
      <svg viewBox="0 0 184 184" aria-hidden="true">
        <circle className="tr" cx="92" cy="92" r={R} />
        <circle className="v" cx="92" cy="92" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - p)} style={{ ["--c" as string]: C }} />
      </svg>
      <div>
        <b>{done}<small>/{total}</small></b>
        <span>{unit}</span>
      </div>
    </div>
  );
}

const dueWord = (n: NonNullable<HocToday["next"]>) => `${hhmm(n.dueAt)} ${n.day === "Nay" ? "tối nay" : `${n.day} ${n.dayNum}`}`;

function Hero({ d, name }: { d: HocToday; name: string }) {
  const n = d.next;
  const eyebrow = `${longDay(d.date.weekday, d.date.day)}${d.student.className ? ` · Lớp ${d.student.className}` : ""}`;
  const today = d.days[d.days.length - 1]?.count ?? 0;
  const mood: Mood = !n ? "khen" : n.answered > 0 ? "dong-vien" : d.streak.current >= 2 ? "chuoi" : "chao";
  return (
    <section className="hn-hero" aria-label="Việc tiếp theo">
      <div className="hn-hero-t">
        <div className="hn-hello">
          <Mascot mood={mood} size={72} />
          <div>
            <div className="hh-eyebrow">{eyebrow}</div>
            <div className="hh-quiet" style={{ marginTop: 2 }}>{name ? `Chào ${name}` : "Chào em"}{d.streak.current >= 2 ? ` · ${d.streak.current} ngày liền` : ""}</div>
          </div>
        </div>
        <h1>{heroTitle(n)}</h1>
        {n ? (
          <p className="hn-what">
            <b>{n.title}</b>
            {n.teacher ? ` · ${n.teacher}` : ""}
          </p>
        ) : (
          <p className="hn-what">Ôn một chút hoặc hỏi gia sư điều em chưa chắc.</p>
        )}
        {n && (
          <div className="hn-meta">
            <span><Icon name="clock" size="sm" />Hạn {dueWord(n)}</span>
            <span><Icon name="timer" size="sm" />~{n.minutes} phút</span>
            {n.attemptsAllowed === 1 && <span><Icon name="lock" size="sm" />Làm 1 lần</span>}
          </div>
        )}
        <div className="hn-acts">
          {n ? (
            <Link className="btn lg primary" to={HOC_PATH.lamBai(n.assignmentId)}>
              <span>{heroAction(n)}</span>
              <Icon name="right" size="sm" />
            </Link>
          ) : d.canTutor ? (
            <Link className="btn lg primary" to="/hoc/luyen-tap">
              <span>Luyện tập</span>
              <Icon name="right" size="sm" />
            </Link>
          ) : (
            <Link className="btn lg primary" to={HOC_PATH.ketQua()}>
              <span>Xem kết quả</span>
              <Icon name="right" size="sm" />
            </Link>
          )}
        </div>
      </div>
      {n ? <Ring done={n.answered} total={n.total} unit="câu đã làm" /> : <Ring done={today} total={d.streak.goal} unit="câu hôm nay" />}
    </section>
  );
}

function Skel() {
  return (
    <div className="hn" aria-busy="true" aria-label="Đang tải">
      <div className="hn-main">
        <section className="hn-hero" aria-hidden="true">
          <div className="hn-hero-t">
            <div className="hn-hello"><Skeleton w={72} h={72} style={{ borderRadius: "50%" }} /><Skeleton w={180} h={12} /></div>
            <Skeleton w="62%" h={44} />
            <Skeleton w="48%" h={16} />
            <Skeleton w={200} h={48} style={{ borderRadius: 10 }} />
          </div>
          <div className="hn-ring"><svg viewBox="0 0 184 184"><circle className="tr" cx="92" cy="92" r={R} /></svg></div>
        </section>
        <div className="hn-subj" style={{ ["--n" as string]: 3 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "grid", gap: 10, padding: "20px 20px 16px 0" }}>
              <Skeleton w={90} h={14} />
              <Skeleton w={70} h={28} />
              <Skeleton w="80%" h={12} />
            </div>
          ))}
        </div>
      </div>
      <aside className="hn-rail">
        {[3, 2].map((n, i) => (
          <section key={i}>
            <Skeleton w={110} h={16} />
            {Array.from({ length: n }, (_, j) => (
              <Skeleton key={j} w="90%" h={14} style={{ marginTop: 16 }} />
            ))}
          </section>
        ))}
      </aside>
    </div>
  );
}

// Bản xem trước khi chưa đủ dữ liệu thành thạo: chủ đề mẫu nhiều môn, mờ.
const GHOST = [
  { label: "Đọc hiểu văn bản", v: 64 },
  { label: "Cân bằng phản ứng", v: 82 },
  { label: "Thì hiện tại hoàn thành", v: 71 },
  { label: "Hàm số bậc hai", v: 46 },
];

/** Màn "Hôm nay" cổng Học: một lần gọi /api/hoc/hom-nay. Đầu trang có Mầm + việc tiếp theo + vòng tiến độ; môn học, thành thạo, cột Sắp tới / Ôn / chuỗi ngày. */
export function HomNay() {
  usePageMeta("Hôm nay");
  const { auth } = useLearner();
  const q = useQuery(auth ? `${HOC_TODAY_KEY}:${auth}` : null, fetchHocToday(auth ?? "hs"));
  const d = q.data;
  if (!d && q.error) return <ErrorState title="Không tải được trang Hôm nay" onRetry={() => q.refetch()} />;
  if (!d) return <Skel />;
  const account = auth === "user";
  const subjLink = account ? "/hoc/giao-trinh" : HOC_PATH.baiTap;
  const name = givenName(d.student.name);
  return (
    <div className={q.stale ? "hn is-stale" : "hn"}>
      <div className="hn-main">
        <Hero d={d} name={name} />
        {d.subjects.length > 0 && (
          <nav className="hn-subj" aria-label="Môn học" style={{ ["--n" as string]: Math.min(4, d.subjects.length) }}>
            {d.subjects.map((s, i) => {
              const m = metricText(s.metric);
              return (
                <Link key={s.subject} className="hh-in" style={{ ["--h" as string]: subjectColor(s.subject, i), ["--i" as string]: i }} to={s.metric.kind === "cards" && account ? "/hoc/luyen-tap" : subjLink}>
                  <span className="nm">{s.subject}</span>
                  <span className="mt"><b>{m.big}</b>{m.small}</span>
                  <span className="nx">{s.next ? <>{s.next.title} <small>· {s.next.when}</small></> : <small>Chưa có bài sắp tới</small>}</span>
                </Link>
              );
            })}
          </nav>
        )}
        <section className="hn-mast" aria-label="Mức thành thạo">
          <h2 className="hh-sec">
            Em vững chủ đề nào?
            {d.mastery && <small>{d.mastery.subject} · 30 ngày</small>}
          </h2>
          {d.mastery && d.mastery.rows.length > 0 ? (
            <>
              <Suspense fallback={<MasterySkel n={d.mastery.rows.length} />}>
                <DotPlot rows={d.mastery.rows.map((r) => ({ label: r.topic, v: r.pct }))} refValue={50} refLabel="50%" labelW={170} nullLabel="chưa đủ câu" />
              </Suspense>
              {d.mastery.weakest && (
                <p className="caption">
                  <b>{d.mastery.weakest.topic} {d.mastery.weakest.pct}%</b>
                  {d.canTutor ? " — hỏi gia sư để luyện thêm." : " — làm thêm bài để vững hơn."}
                </p>
              )}
            </>
          ) : (
            <div className="hn-ghost-w">
              <div className="hn-ghost" aria-hidden="true">
                <Suspense fallback={<MasterySkel n={GHOST.length} />}>
                  <DotPlot rows={GHOST} refValue={50} refLabel="50%" labelW={170} />
                </Suspense>
              </div>
              <p>Làm 3 câu mỗi chủ đề để thấy mức của em</p>
            </div>
          )}
        </section>
      </div>

      <aside className="hn-rail" aria-label="Bên cạnh">
        <section>
          <h2 className="hh-sec">Sắp tới<small>{d.upcoming.length} bài</small></h2>
          {d.upcoming.length === 0 ? (
            <p className="hh-quiet">Bài mới thầy cô giao sẽ hiện ở đây.</p>
          ) : (
            <ul className="hn-due">
              {d.upcoming.map((u, i) => {
                const inner = (
                  <>
                    <span className={u.hot ? "d hot" : "d"}><small>{u.day}</small><b>{u.dayNum}</b></span>
                    <span className="t">
                      {u.title}
                      <small>
                        <i style={{ background: subjectColor(u.subject, i) }} />
                        {u.subject} · {u.answered > 0 ? `${u.answered}/${u.total} câu` : `${u.total} câu`}
                      </small>
                    </span>
                  </>
                );
                return <li key={u.assignmentId}>{u.canStart ? <Link to={HOC_PATH.lamBai(u.assignmentId)}>{inner}</Link> : <div>{inner}</div>}</li>;
              })}
            </ul>
          )}
        </section>
        {d.review && (
          <section>
            <h2 className="hh-sec">Ôn hôm nay</h2>
            <div className="hn-rev">
              <span className="n">{d.review.due}</span>
              <div className="grow">
                <b>thẻ đến hạn</b>
                <div className="caption">{d.review.due ? `~${d.review.minutes} phút` : "Đã ôn xong"}</div>
              </div>
              <Link className="btn" to="/hoc/luyen-tap">
                <Icon name="play" size="sm" />
                <span>Ôn</span>
              </Link>
            </div>
          </section>
        )}
        <section>
          <h2 className="hh-sec">{d.days.length} ngày qua<small>mục tiêu {d.streak.goal} câu/ngày</small></h2>
          <StreakDays days={d.days} goal={d.streak.goal} />
        </section>
      </aside>
    </div>
  );
}
