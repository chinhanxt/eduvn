import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Skeleton } from "../../ui/components/Skeleton";
import { EmptyState, ErrorState } from "../../ui/components/States";
import { useQuery } from "../../ui/data/query";
import { useUrlState } from "../../ui/data/urlState";
import { usePageMeta } from "../../ui/shell/AppShell";
import { PageHead } from "../../ui/shell/PageHead";
import { initialsOf } from "../me";
import { filterTasks, GV_VIEWS, type GvTask, type GvToday, type GvView, pct, signed, taskKey, taskStatus, viewCounts, vn1 } from "../today";
import { fetchGvToday, GV_TODAY_KEY } from "./data";

const VIEW_LABEL: Record<GvView, string> = { "tat-ca": "Tất cả", "can-lam": "Cần làm", "cho-cham": "Chờ chấm", "hoc-sinh": "Học sinh" };
const narrow = () => window.matchMedia?.("(max-width: 1180px)").matches;
const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

function Kpis({ d }: { d: GvToday | undefined }) {
  const k = d?.kpis;
  const cell = (label: string, v: React.ReactNode, small?: React.ReactNode) => (
    <div>
      <div className="k">{label}</div>
      <div className="v">{d ? v : <Skeleton w={56} h={22} style={{ margin: "3px 0" }} />}{d && small}</div>
    </div>
  );
  const delta = (x: number | null | undefined, digits = 1, unit = "") => (x == null ? null : <small className={x > 0 ? "up" : x < 0 ? "dn" : "mu"}>{signed(x, digits, unit)}</small>);
  return (
    <section className="kpis" aria-label="Chỉ số">
      {cell("Chờ chấm", k?.pendingGrading.value, k && k.pendingGrading.today > 0 ? <small className="up">+{k.pendingGrading.today} hôm nay</small> : null)}
      {cell("Nộp đúng hạn · 4 tuần", pct(k?.onTime.value), delta(k?.onTime.delta, 0))}
      {cell("Điểm TB tuần", k?.weekAvg.value == null ? "—" : vn1(k.weekAvg.value), delta(k?.weekAvg.delta))}
      {cell("HS cần quan tâm", k?.attention.value, k ? <small className="mu">{k.attention.classes} lớp</small> : null)}
      {cell("Tiết hôm nay", k?.lessonsToday.value, k?.lessonsToday.first ? <small className="mu ell" title={k.lessonsToday.first}>{k.lessonsToday.first}</small> : null)}
      {cell("Hạn hôm nay", k?.dueToday.value, k?.dueToday.times.length ? <small className="mu ell">{k.dueToday.times.join(" · ")}</small> : null)}
    </section>
  );
}

function TaskRow({ t, selected, onPick }: { t: GvTask; selected: boolean; onPick: () => void }) {
  const st = taskStatus(t);
  return (
    <div className="rowi" role="option" aria-selected={selected} tabIndex={selected ? 0 : -1} onClick={onPick} data-key={t.id}>
      <span className={`st ${st.cls}`} style={{ ["--p" as string]: `${st.pct}%` }} title={st.label} />
      <span className="mono id">{t.id}</span>
      <span className="t" title={t.title}>{t.title}</span>
      <span className="cls">{t.className}</span>
      <span className="pr">
        {t.progress ? (
          <>
            <span className="meter"><i style={{ ["--v" as string]: `${st.pct}%` }} /></span>
            {t.progress.done}/{t.progress.total}
          </>
        ) : (
          t.note
        )}
      </span>
      <span className={t.hot ? "due hot" : "due"}>{t.dueLabel}</span>
      <kbd>{taskKey(t)}</kbd>
    </div>
  );
}

function SkelRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div className="rowi" key={i} aria-hidden="true" style={{ cursor: "default" }}>
          <Skeleton circle w={16} h={16} />
          <Skeleton className="id" w={84} h={10} />
          <Skeleton w={`${[70, 54, 62, 48, 58, 66][i % 6]}%`} h={12} />
          <Skeleton w={36} h={10} />
          <Skeleton className="pr" w={90} h={6} />
          <Skeleton w={40} h={10} style={{ justifySelf: "end" }} />
          <kbd style={{ visibility: "hidden" }} />
        </div>
      ))}
    </>
  );
}

function DetailSkel() {
  return (
    <div aria-hidden="true">
      <div className="dhd">
        <Skeleton w={96} h={10} />
        <Skeleton w="80%" h={16} style={{ marginTop: 8 }} />
      </div>
      <div className="props">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ display: "contents" }}>
            <Skeleton w={56} h={10} />
            <Skeleton w={`${[60, 70, 50, 64, 56][i]}%`} h={10} />
          </span>
        ))}
      </div>
      <div className="dsec">
        <Skeleton w="100%" h={150} />
      </div>
    </div>
  );
}

export const ClassHead = () => (
  <thead>
    <tr>
      <th>Lớp</th>
      <th className="r hide-sm">Sĩ số</th>
      <th style={{ width: "44%" }}>Học lực (số HS)</th>
      <th className="r">TB</th>
      <th className="r">Δ tháng</th>
      <th className="r hide-sm">Nộp đúng hạn</th>
    </tr>
  </thead>
);
function ClassSkel() {
  return (
    <table className="ctable" aria-hidden="true">
      <ClassHead />
      <tbody>
        {[0, 1, 2].map((i) => (
          <tr key={i}>
            <td><Skeleton w={72} h={12} /></td>
            <td className="hide-sm"><Skeleton w={24} h={12} style={{ marginLeft: "auto" }} /></td>
            <td><Skeleton w="100%" h={18} style={{ borderRadius: 4 }} /></td>
            <td><Skeleton w={28} h={12} style={{ marginLeft: "auto" }} /></td>
            <td><Skeleton w={32} h={12} style={{ marginLeft: "auto" }} /></td>
            <td className="hide-sm"><Skeleton w={32} h={12} style={{ marginLeft: "auto" }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
const Classes = lazy(() => import("./HomNayClasses").then((m) => ({ default: m.Classes })));
const Detail = lazy(() => import("./HomNayDetail").then((m) => ({ default: m.Detail })));

/** Màn "Hôm nay" cổng GV (mockup gv/hom-nay.html, skin B): một lần gọi /api/gv/hom-nay. */
export function HomNay() {
  usePageMeta("Hôm nay");
  const navigate = useNavigate();
  const q = useQuery(GV_TODAY_KEY, fetchGvToday);
  const d = q.data;
  const [view, setView] = useUrlState<string>("xem", "tat-ca", { mode: "push" });
  const v: GvView = (GV_VIEWS as readonly string[]).includes(view) ? (view as GvView) : "tat-ca";
  const counts = d ? viewCounts(d) : null;
  const list = useMemo(() => (d ? filterTasks(d.tasks, v) : []), [d, v]);
  const [sel, setSel] = useState(0);
  useEffect(() => {
    // mặc định chọn việc gấp nhất có chi tiết (bài đang chấm), không thì việc đầu
    const i = list.findIndex((t) => t.kind === "grade");
    setSel(i >= 0 ? i : 0);
  }, [list]);
  const cur = list[sel] ?? null;

  const open = useCallback((t: GvTask | null) => t && navigate(t.href), [navigate]);
  const pick = (i: number) => {
    setSel(i);
    if (narrow()) open(list[i] ?? null);
  };
  useEffect(() => {
    let lastG = 0;
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector(".cmdk")) return;
      const k = e.key.toLowerCase();
      // "G rồi chữ" là phím tắt điều hướng của khung (G C = Chấm bài) — không hiểu nhầm thành phím của màn
      if (k === "g") {
        lastG = Date.now();
        return;
      }
      if (Date.now() - lastG < 1200) {
        lastG = 0;
        return;
      }
      if (k === "j" || k === "k") {
        e.preventDefault();
        setSel((s) => Math.max(0, Math.min(list.length - 1, s + (k === "j" ? 1 : -1))));
      } else if (e.key === "Enter" && (e.target as HTMLElement).closest?.(".rowi")) open(cur);
      else if (k === "n") navigate("/de-thi");
      else if ((k === "c" && cur?.kind === "grade") || (k === "o" && cur?.kind === "lesson") || (k === "r" && cur?.kind === "due")) open(cur);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [list, cur, open, navigate]);
  useEffect(() => {
    (document.querySelector(`.rowi[aria-selected="true"]`) as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
  }, [sel]);

  const tabs = (
    <nav className="tabs" aria-label="Lọc">
      {GV_VIEWS.map((x) => (
        <a
          key={x}
          href={`?xem=${x}`}
          aria-current={x === v ? "page" : undefined}
          onClick={(e) => {
            e.preventDefault();
            setView(x);
          }}
        >
          {VIEW_LABEL[x]} {counts && <span className="count">{counts[x]}</span>}
        </a>
      ))}
    </nav>
  );
  const err = !!q.error && !d;
  const groups: [string, GvTask[]][] = [
    ["Hôm nay", list.filter((t) => t.group === "today")],
    ["Tuần này", list.filter((t) => t.group === "week")],
  ];
  let idx = -1;

  return (
    <>
      <PageHead title="Hôm nay" tabs={tabs} primary={{ label: "Tạo đề", icon: "plus", kbd: "N", to: "/de-thi" }} />
      <Kpis d={d} />
      <div className="split">
        <div className="stack" style={{ gap: "var(--s-4)" }}>
          {v === "hoc-sinh" ? (
            <section className={q.stale ? "pane is-stale" : "pane"} aria-label="Học sinh cần quan tâm" aria-busy={q.loading || undefined}>
              <div className="ghd">Cần quan tâm <span className="n">{d?.attention.length ?? ""}</span></div>
              {!d && !err && <SkelRows n={5} />}
              {err && <ErrorState onRetry={() => q.refetch()} />}
              {d && d.attention.length === 0 && <EmptyState icon="users" title="Không em nào cần quan tâm" text="Em có 3 bài gần nhất trung bình dưới 5 hoặc bỏ từ 2 bài trong 4 tuần sẽ hiện ở đây." />}
              {d?.attention.map((a) => (
                <Link className="rowi att" key={`${a.classId}-${a.studentId}`} to={`/lop-hoc/${a.classId}`}>
                  <span className="avatar sm">{initialsOf(a.fullName)}</span>
                  <span className="t">{a.fullName}</span>
                  <span className="cls">{a.className}</span>
                  <span className="pr">{a.reasons.join(" · ")}</span>
                  <span className="due">{a.last == null ? "—" : vn1(a.last)}</span>
                </Link>
              ))}
            </section>
          ) : (
            <section className={q.stale ? "pane is-stale" : "pane"} aria-label="Việc" aria-busy={q.loading || undefined}>
              {!d && !err && (
                <>
                  <div className="ghd">Hôm nay</div>
                  <SkelRows n={6} />
                </>
              )}
              {err && <ErrorState onRetry={() => q.refetch()} />}
              {d && list.length === 0 && (
                <EmptyState icon="check" title={v === "tat-ca" ? "Hôm nay không còn việc" : `Không có việc “${VIEW_LABEL[v]}”`} text="Việc mới (bài nộp, hạn chấm, tiết dạy có ngày) sẽ hiện ở đây." action={<Link className="btn sm" to="/lop-hoc">Xem lớp học</Link>} />
              )}
              {d && list.length > 0 && (
                <div role="listbox" aria-label="Việc theo hạn" className="enter">
                  {groups.map(([label, rows]) =>
                    rows.length ? (
                      <div key={label} role="group" aria-label={label}>
                        <div className="ghd">{label} <span className="n">{rows.length}</span></div>
                        {rows.map((t) => {
                          idx += 1;
                          const i = idx;
                          return <TaskRow key={`${t.id}-${i}`} t={t} selected={i === sel} onPick={() => pick(i)} />;
                        })}
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </section>
          )}

          <section className={q.stale ? "pane is-stale" : "pane"} aria-label="Lớp">
            {d && d.classes.length === 0 ? (
              <EmptyState icon="users" title="Chưa có lớp" text="Tạo lớp hoặc nhập danh sách từ Excel." action={<Link className="btn sm primary" to="/lop-hoc">Tạo lớp</Link>} />
            ) : (
              <>
                {d ? (
                  <Suspense fallback={<ClassSkel />}>
                    <Classes d={d} />
                  </Suspense>
                ) : (
                  <ClassSkel />
                )}
              </>
            )}
          </section>
          <div className="keys">
            <span><kbd>J</kbd> <kbd>K</kbd> lên/xuống</span>
            <span><kbd>↵</kbd> mở</span>
            <span><kbd>C</kbd> chấm</span>
            <span><kbd>O</kbd> mở tiết</span>
            <span><kbd>N</kbd> tạo đề</span>
            <span><kbd>G</kbd> <kbd>L</kbd> lớp học</span>
            <span><kbd>Ctrl</kbd> <kbd>K</kbd> lệnh</span>
          </div>
        </div>

        <aside className={q.stale ? "pane detail is-stale" : "pane detail"} aria-label="Chi tiết" aria-live="polite">
          {d ? (
            v === "hoc-sinh" ? (
              <EmptyState icon="users" title="Học sinh cần quan tâm" text="Bấm tên em để mở lớp, xem bài làm và nhắn phụ huynh." />
            ) : (
              <Suspense fallback={<DetailSkel />}>
                <Detail t={cur} now={d.now} />
              </Suspense>
            )
          ) : err ? null : (
            <DetailSkel />
          )}
        </aside>
      </div>
    </>
  );
}
