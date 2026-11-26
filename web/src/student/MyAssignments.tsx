import { useEffect, useState } from "react";
import { Link } from "react-router";
import { vn } from "../api";
import { ApiError } from "../apiCore";
import { fetchHocToday, HOC_TODAY_KEY } from "../portal/hoc/data";
import { Mascot } from "../portal/hoc/Mascot";
import { givenName, mascotLine, type Mood } from "../portal/hoc/mascot";
import { subjectColor } from "../portal/hocToday";
import { Badge, Segmented } from "../ui/components/Chip";
import { Meter } from "../ui/components/Progress";
import { Skeleton } from "../ui/components/Skeleton";
import { ErrorState } from "../ui/components/States";
import { Icon } from "../ui/Icon";
import { useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { formatCountdown } from "./clock";
import { ASG_KEY, ASG_VIEWS, type AsgView, asgAction, asgCounts, ddmm, dueTone, fetchAssignments, filterAsg, subjectsOf } from "./data";
import { HOC_PATH } from "./paths";
import { clearSession, loadSession } from "./session";
import type { MyAssignment } from "./types";
import "./hs.css";

// Hàng mẫu mờ dưới trạng thái trống (nhiều môn, không dữ liệu thật).
const GHOST: [string, string, string][] = [
  ["Hoá học", "Cân bằng phản ứng oxi hoá – khử", "Luyện tập · 8 câu"],
  ["Tiếng Anh", "Unit 5 · Reading", "Luyện tập · 10 câu"],
  ["Lịch sử", "Kháng chiến chống Pháp 1945–1954", "Kiểm tra · 15 phút"],
];

const VIEW_VI: Record<AsgView, string> = { "can-lam": "Cần làm", "da-nop": "Đã nộp", "tat-ca": "Tất cả" };
const STATE: Record<MyAssignment["state"], [tone: "neutral" | "ok" | "warn" | "danger" | "accent" | "outline", icon: string, label: string]> = {
  chua_mo: ["neutral", "lock", "Chưa mở"],
  chua_lam: ["outline", "exam", "Chưa làm"],
  dang_lam: ["accent", "play", "Đang làm"],
  da_nop: ["ok", "check", "Đã nộp"],
  qua_han: ["danger", "alert", "Quá hạn"],
};
/** "21:00 14/11" theo giờ Việt Nam (toLocaleString vi-VN ra "14-11" ở Chrome). */
const at = (iso: string) => `${new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false })} ${ddmm(iso)}`;

/** Đồng hồ cho hạn nộp: mỗi giây khi có bài sắp hết hạn trong 1 giờ, không thì mỗi 30 giây. */
function useNow(fast: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), fast ? 1000 : 30_000);
    return () => window.clearInterval(iv);
  }, [fast]);
  return now;
}

function Card({ a, now, i, hue }: { a: MyAssignment; now: number; i: number; hue: string }) {
  const act = asgAction(a);
  const tone = dueTone(a, now);
  const [bt, bi, bl] = STATE[a.state];
  const due = a.state === "da_nop" ? `Nộp xong · hạn ${at(a.dueAt)}` : a.state === "qua_han" ? `Hạn ${at(a.dueAt)} đã qua` : a.state === "chua_mo" ? `Mở lúc ${at(a.opensAt)}` : formatCountdown(Date.parse(a.dueAt) - now);
  return (
    <article className={`asg st-${a.state}`} style={{ ["--h" as string]: hue, ["--i" as string]: Math.min(i, 8) }} data-testid="hs-asg">
      <div className="asg-main">
        <div className="asg-top">
          <span className="asg-subj">{a.subject}</span>
          <Badge tone={bt} icon={bi}>{bl}</Badge>
        </div>
        <h3>{a.title}</h3>
        <div className="asg-meta">
          <span>{a.kind === "test" ? "Kiểm tra" : "Luyện tập"}</span>
          <span>{a.questionCount} câu</span>
          <span>{a.durationMinutes ? `${a.durationMinutes} phút` : "Không giới hạn giờ"}</span>
          <span>Lượt {a.attemptsUsed}/{a.attemptsAllowed}</span>
        </div>
      </div>
      <div className="asg-side">
        {a.state === "dang_lam" && (
          <div className="asg-prog">
            <Meter value={(100 * a.answered) / Math.max(1, a.questionCount)} label={`Đã làm ${a.answered} trên ${a.questionCount} câu`} />
            <small>{a.answered}/{a.questionCount} câu</small>
          </div>
        )}
        {a.score10 !== null && (
          <span className="asg-score" aria-label={`Điểm ${vn(a.score10)} trên 10`}>
            <b>{vn(a.score10)}</b>/10
          </span>
        )}
        <span className={`asg-due ${tone}`}>
          <Icon name={tone === "late" ? "alert" : tone === "ok" ? "checkc" : "clock"} size="sm" />
          {due}
        </span>
      </div>
      <div className="asg-acts">
        {a.state === "da_nop" && a.canStart && a.lastSubmissionId && (
          <Link className="btn ghost" to={HOC_PATH.ketQua(a.lastSubmissionId)}>
            <span>Lượt trước</span>
          </Link>
        )}
        {act.to ? (
          <Link className={act.primary ? "btn primary" : "btn"} to={act.to} data-testid="hs-start">
            <span>{act.label}</span>
            <Icon name={act.icon} size="sm" />
          </Link>
        ) : (
          <button type="button" className="btn" disabled>
            <Icon name={act.icon} size="sm" />
            <span>{act.label}</span>
          </button>
        )}
      </div>
    </article>
  );
}

export function AsgSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="asg-list" aria-busy="true" aria-label="Đang tải bài tập">
      {Array.from({ length: n }, (_, i) => (
        <div className="asg skel-card" key={i}>
          <div className="asg-main">
            <Skeleton w={64} h={12} />
            <Skeleton w={`${[58, 44, 50][i % 3]}%`} h={22} style={{ marginTop: 10 }} />
            <Skeleton w="40%" h={12} style={{ marginTop: 10 }} />
          </div>
          <div className="asg-side"><Skeleton w={140} h={14} /></div>
          <div className="asg-acts"><Skeleton w={120} h={40} style={{ borderRadius: 10 }} /></div>
        </div>
      ))}
    </div>
  );
}

/** "Bài tập" cổng Học: thẻ bài theo hạn, lọc Cần làm/Đã nộp/Tất cả + môn trong URL (?xem=, ?mon=). */
export function MyAssignments() {
  usePageMeta("Bài tập");
  const q = useQuery(ASG_KEY, fetchAssignments, { staleMs: 15_000 });
  const [view, setView] = useUrlState<string>("xem", "can-lam");
  const [mon, setMon] = useUrlState<string>("mon", "");
  const v: AsgView = (ASG_VIEWS as readonly string[]).includes(view) ? (view as AsgView) : "can-lam";
  const rows = q.data;
  const now = useNow(!!rows?.some((a) => a.state !== "da_nop" && Math.abs(Date.parse(a.dueAt) - Date.now()) < 3600_000));
  useEffect(() => {
    // phiên mã lớp hết hạn/bị thu hồi → về màn đăng nhập (khung theo dõi sự kiện phiên)
    if (q.error instanceof ApiError && q.error.status === 401) clearSession();
  }, [q.error]);
  const subjects = rows ? subjectsOf(rows) : [];
  const counts = rows ? asgCounts(rows, mon) : null;
  const shown = rows ? filterAsg(rows, v, mon) : [];
  const name = givenName(loadSession()?.student.fullName);
  const left = rows ? asgCounts(rows)["can-lam"] : 0;
  // chuỗi ngày học: dữ liệu Hôm nay khung đã tải (cùng khoá cache)
  const streak = useQuery(`${HOC_TODAY_KEY}:hs`, fetchHocToday("hs")).data?.streak.current ?? 0;
  const mood: Mood = rows && rows.length > 0 && left === 0 ? "khen" : streak >= 2 ? "chuoi" : "chao";
  const say = mood === "chuoi" ? `${mascotLine("chuoi", { streak, name })} ${left > 0 ? `Còn ${left} bài.` : ""}`.trim() : mascotLine(mood, { name, left });
  return (
    <div className="ba">
      <header className="hh">
        <div className="hh-t">
          <div>
            <div className="hh-eyebrow">{rows ? `${left > 0 ? `${left} bài cần làm` : "Không còn bài cần làm"} · ${rows.length} bài trong lớp` : " "}</div>
            <h1 className="hh-title">Bài tập</h1>
          </div>
        </div>
        {rows && <Mascot key={mood} mood={mood} size={56} say={say} className="hide-sm" />}
      </header>
      <div className="ba-bar">
        <Segmented label="Lọc bài" value={v} onChange={(x) => setView(x)} options={ASG_VIEWS.map((k) => ({ value: k, label: <>{VIEW_VI[k]}{counts && <span className="num muted"> {counts[k]}</span>}</> }))} />
        {subjects.length > 1 && (
          <div className="ba-subj" role="group" aria-label="Môn">
            <button type="button" className="chip" aria-pressed={!mon} onClick={() => setMon("")}>Mọi môn</button>
            {subjects.map((s, i) => (
              <button type="button" key={s} className="chip" aria-pressed={mon === s} onClick={() => setMon(mon === s ? "" : s)}>
                <i className="dot" style={{ background: subjectColor(s, i) }} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {!rows && q.error ? (
        <ErrorState title="Không tải được danh sách bài" status={q.error instanceof ApiError ? q.error.status : undefined} onRetry={() => q.refetch()} />
      ) : !rows ? (
        <AsgSkeleton />
      ) : shown.length === 0 ? (
        <section className="ba-empty-w">
          <div className="ba-empty">
            <Mascot mood={v === "can-lam" ? "khen" : "chao"} size={88} />
            <h2>{v === "can-lam" ? "Em đã làm hết bài rồi!" : v === "da-nop" ? "Chưa nộp bài nào" : "Chưa có bài nào"}</h2>
            <p>{v === "can-lam" ? "Bài mới thầy cô giao sẽ hiện ở đây." : mon ? `Môn ${mon} chưa có bài trong mục này.` : "Thầy cô giao bài là em thấy ngay."}</p>
            {v !== "tat-ca" && <button type="button" className="btn" onClick={() => setView("tat-ca")}>Xem tất cả bài</button>}
          </div>
          <div className="asg-list ba-ghost" aria-hidden="true">
            {GHOST.map(([subject, title, meta], i) => (
              <div className="asg" key={title} style={{ ["--h" as string]: `var(--c${[5, 3, 7][i]})` }}>
                <div className="asg-main">
                  <div className="asg-top"><span className="asg-subj">{subject}</span></div>
                  <h3>{title}</h3>
                  <div className="asg-meta"><span>{meta}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className={q.stale ? "asg-list enter-list is-stale" : "asg-list enter-list"} key={`${v}:${mon}`}>
          {shown.map((a, i) => <Card key={a.id} a={a} now={now} i={i} hue={subjectColor(a.subject, Math.max(0, subjects.indexOf(a.subject)))} />)}
        </div>
      )}
    </div>
  );
}
