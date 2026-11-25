import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MINH_ANH, useFakeProgress } from "../kit";
import { Button, IconButton, Segmented, useToast } from "../../ui";
import { Icon } from "../../ui/Icon";
import { ACCESS_LOG, CURVES, HOURS, INSIGHTS, type Insight, MEMORY, type Memory, SCORES_BEFORE, THRESHOLD, WHO_SEES, YEARS } from "./hoSoData";
import { Conf, DemoHead, Face, fmt1, useCount } from "./parts";

type View = "ban-do" | "ai-biet" | "hoc-ba";
const VIEWS: { value: View; label: string }[] = [
  { value: "ban-do", label: "Bản đồ" },
  { value: "ai-biet", label: "AI biết gì về em" },
  { value: "hoc-ba", label: "Học bạ sống" },
];

/** Hồ sơ AI của Minh Anh: bản đồ năng lực · đường quên · nhận định có bằng chứng; "AI biết gì về em" (sửa · quên); học bạ sống lớp 6 → ĐH. */
export function HoSo() {
  const [sp, setSp] = useSearchParams();
  const view = (VIEWS.some((v) => v.value === sp.get("xem")) ? sp.get("xem") : "ban-do") as View;
  return (
    <div className="dm hs">
      <DemoHead title="Hồ sơ của Minh Anh" eyebrow={<span>Lớp 10A1 · AI của em</span>} lead={<Face name={MINH_ANH.name} hue={MINH_ANH.avatarHue} size={56} ring />}>
        <Segmented label="Phần hồ sơ" options={VIEWS} value={view} onChange={(v) => setSp(v === "ban-do" ? {} : { xem: v }, { replace: true })} />
      </DemoHead>
      {view === "ban-do" && <BanDo />}
      {view === "ai-biet" && <AiBiet />}
      {view === "hoc-ba" && <HocBa />}
    </div>
  );
}

/* ---------------- Bản đồ ---------------- */
function BanDo() {
  const [open, setOpen] = useState<string | null>("doi-chieu");
  const pick = (subject: string) => {
    const hit = INSIGHTS.find((i) => i.subject === subject);
    if (hit) setOpen(hit.id);
  };
  const sel = INSIGHTS.find((i) => i.id === open)?.subject;
  return (
    <>
      <section className="hs-top">
        <Radar onPick={pick} sel={sel} />
        <div className="hs-ins" role="list" aria-label="AI nhận định">
          <div className="dm-eyebrow">AI nhận định · bấm để xem bằng chứng</div>
          {INSIGHTS.map((it, i) => (
            <InsightRow key={it.id} it={it} i={i} open={open === it.id} onToggle={() => setOpen(open === it.id ? null : it.id)} />
          ))}
        </div>
      </section>
      <section className="hs-bottom">
        <Forget />
        <div className="hs-side">
          <Rhythm />
          <Goal />
        </div>
      </section>
    </>
  );
}

const AX = Object.entries(MINH_ANH.scores);
const R = 150;
const rr = (v: number) => (R * Math.max(0, v - 3)) / 7;
const at = (i: number, r: number) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / AX.length;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
};
const poly = (vals: number[]) => vals.map((v, i) => at(i, rr(v)).map((n) => n.toFixed(1)).join(",")).join(" ");

/** Radar năng lực 7 môn: đa giác lớn dần từ tâm (mỗi trục trễ một nhịp), lớp nét đứt = 3 tháng trước. */
function Radar({ onPick, sel }: { onPick: (s: string) => void; sel?: string }) {
  const p = useFakeProgress(1700);
  const k = (i: number) => {
    const x = Math.min(1, Math.max(0, (p * 1.45 - i * 0.065) / 1));
    return 1 - Math.pow(1 - x, 3);
  };
  const now = AX.map(([, v], i) => 3 + (v - 3) * k(i));
  const before = AX.map(([s]) => SCORES_BEFORE[s] ?? 3);
  return (
    <figure className="hs-radar" aria-label="Bản đồ năng lực 7 môn">
      <svg viewBox="-235 -215 470 440" role="img" aria-label={AX.map(([s, v]) => `${s} ${fmt1(v)}`).join(", ")}>
        {[4, 6, 8, 10].map((g) => (
          <polygon key={g} points={poly(AX.map(() => g))} className="hs-grid" />
        ))}
        {AX.map((_, i) => {
          const [x, y] = at(i, R);
          return <line key={i} x1={0} y1={0} x2={x} y2={y} className="hs-axis" />;
        })}
        <polygon points={poly(before)} className="hs-before" style={{ opacity: p > 0.85 ? 1 : 0 }} />
        <polygon points={poly(now)} className="hs-now" />
        {AX.map(([s, v], i) => {
          const [x, y] = at(i, rr(now[i] ?? 3));
          const [lx, ly] = at(i, R + 34);
          const on = sel === s;
          return (
            <g key={s} className={on ? "hs-v on" : "hs-v"} onClick={() => onPick(s)} role="button" tabIndex={0} aria-label={`${s}: ${fmt1(v)}`} onKeyDown={(e) => e.key === "Enter" && onPick(s)}>
              <circle cx={x} cy={y} r={on ? 7 : 4.5} />
              <text x={lx} y={ly - 6} textAnchor={Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end"} className="hs-lab">
                {s}
              </text>
              <text x={lx} y={ly + 13} textAnchor={Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end"} className="hs-val num">
                {fmt1(3 + (v - 3) * k(i))}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="hs-legend">
        <span><i className="now" />Bây giờ</span>
        <span><i className="before" />3 tháng trước</span>
      </figcaption>
    </figure>
  );
}

function InsightRow({ it, i, open, onToggle }: { it: Insight; i: number; open: boolean; onToggle: () => void }) {
  return (
    <div className={open ? "hs-row open" : "hs-row"} role="listitem" style={{ ["--d" as string]: `${i * 60}ms`, ["--tc" as string]: it.color }}>
      <button type="button" className="hs-row-h" aria-expanded={open} onClick={onToggle}>
        <span className="hs-tag">{it.tag}</span>
        <span className="hs-txt">
          {it.guess && <em>Có vẻ </em>}
          {it.guess ? it.text.charAt(0).toLocaleLowerCase("vi") + it.text.slice(1) : it.text}
        </span>
        <span className="hs-stat num">{it.stat}</span>
        <Icon name="chev" size="sm" className="hs-chev" />
      </button>
      <div className="hs-ev" aria-hidden={!open}>
        <div className="hs-ev-in">
          <div className="hs-ev-meta">
            <span>Tin cậy</span>
            <Conf v={it.conf} />
            {it.guess && <span className="hs-guess">suy đoán · cần thêm bằng chứng</span>}
          </div>
          {it.slip && (
            <div className="hs-slip">
              <span className="bad">{it.slip.pre}<s>{it.slip.wrong}</s>{it.slip.post}</span>
              <Icon name="right" size="sm" />
              <span className="good">{it.slip.pre}<b>{it.slip.right}</b>{it.slip.post}</span>
            </div>
          )}
          <ul>
            {it.ev.map((e) => (
              <li key={e.t}>
                <Icon name={e.icon} size="sm" />
                <div>
                  <b>{e.t}</b>
                  <span>{e.s}</span>
                </div>
                <time>{e.when}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Đường quên: mỗi khái niệm một đường suy giảm, bật lên khi ôn; chạm ngưỡng = lúc nên ôn. */
function Forget() {
  const p = useFakeProgress(2200);
  const [hl, setHl] = useState<string | null>(null);
  const W = 720, H = 230, L = 8, Rr = 712, T = 18, B = 196;
  const x = (d: number) => L + ((d + 14) / 28) * (Rr - L);
  const y = (r: number) => B - ((r - 0.3) / 0.7) * (B - T);
  const paths = useMemo(
    () =>
      CURVES.map((c) => {
        const last = c.reviews.length - 1;
        const sLast = (c.cross - c.reviews[last]!) / -Math.log(THRESHOLD);
        // độ nhớ tại ngày d: suy giảm mũ kể từ lần ôn gần nhất (trước lần ôn đầu: học từ 2 ngày trước khung)
        const ret = (d: number) => {
          let idx = -1;
          c.reviews.forEach((r, i) => r <= d && (idx = i));
          const t0 = idx < 0 ? -16 : c.reviews[idx]!;
          return Math.max(0.3, Math.exp(-(d - t0) / (idx === last ? sLast : c.s0)) * (idx < 0 ? 0.95 : 1));
        };
        const pts: string[] = [];
        for (let d = c.reviews[0]; d <= 14.001; d += 0.25) {
          if ((c.reviews as readonly number[]).includes(d) && pts.length) pts.push(`L${x(d).toFixed(1)},${y(ret(d - 0.001)).toFixed(1)}`);
          pts.push(`${pts.length ? "L" : "M"}${x(d).toFixed(1)},${y(ret(d)).toFixed(1)}`);
        }
        return { ...c, d: pts.join(" ") };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const reveal = L + p * (Rr - L);
  return (
    <figure className="hs-forget">
      <div className="hs-sec-h">
        <h2>Đường quên</h2>
        <div className="hs-keys">
          {CURVES.map((c) => (
            <button type="button" key={c.id} onMouseEnter={() => setHl(c.id)} onMouseLeave={() => setHl(null)} onFocus={() => setHl(c.id)} onBlur={() => setHl(null)} style={{ ["--cc" as string]: c.color }}>
              <i />
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="hs-forget-sc">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Lượng giác sắp quên vào ngày mai; Bảo toàn khối lượng sau 4 ngày; Hàm số bậc hai sau 12 ngày">
        <defs>
          <clipPath id="hs-clip">
            <rect x={0} y={0} width={reveal} height={H} />
          </clipPath>
          <clipPath id="hs-past">
            <rect x={0} y={0} width={x(0)} height={H} />
          </clipPath>
          <clipPath id="hs-fut">
            <rect x={x(0)} y={0} width={W} height={H} />
          </clipPath>
        </defs>
        <rect x={L} y={y(THRESHOLD)} width={Rr - L} height={B - y(THRESHOLD)} className="hs-zone" />
        <line x1={L} x2={Rr} y1={y(THRESHOLD)} y2={y(THRESHOLD)} className="hs-thr" />
        <text x={L + 6} y={B - 8} className="hs-small">vùng dễ quên</text>
        <line x1={x(0)} x2={x(0)} y1={T - 8} y2={B} className="hs-today" />
        <text x={x(0)} y={B + 22} textAnchor="middle" className="hs-small strong">Hôm nay</text>
        <text x={L} y={B + 22} className="hs-small">2 tuần trước</text>
        <text x={Rr} y={B + 22} textAnchor="end" className="hs-small">2 tuần tới</text>
        <g clipPath="url(#hs-clip)">
          {paths.map((c) => (
            <g key={c.id} className={hl && hl !== c.id ? "hs-curve dim" : "hs-curve"} style={{ ["--cc" as string]: c.color }}>
              <path d={c.d} clipPath="url(#hs-past)" />
              <path d={c.d} clipPath="url(#hs-fut)" className="fut" />
              {c.reviews.map((rv) => (
                <circle key={rv} cx={x(rv)} cy={y(1)} r={3.5} className="rev" />
              ))}
            </g>
          ))}
        </g>
        {CURVES.map((c, i) => {
          const show = reveal >= x(c.cross);
          return (
            <g key={c.id} className={show ? "hs-due on" : "hs-due"} style={{ ["--cc" as string]: c.color }}>
              {i === 0 && <circle cx={x(c.cross)} cy={y(THRESHOLD)} r={7} className="pulse" />}
              <circle cx={x(c.cross)} cy={y(THRESHOLD)} r={5.5} className="dot" />
              {i === 0 && (
                <text x={x(c.cross) + 10} y={y(THRESHOLD) - 12} className="hs-due-l">
                  Ôn ngày mai
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
    </figure>
  );
}

function Rhythm() {
  const p = useFakeProgress(1200);
  return (
    <div className="hs-rhythm">
      <h2>Nhịp học</h2>
      <div className="hs-hours" role="img" aria-label="Học hiệu quả nhất 20–22h">
        {HOURS.map((h, i) => (
          <i key={i} className={i >= 14 && i <= 16 ? "hot" : undefined} style={{ height: `${Math.max(6, h * 100 * Math.min(1, p * 1.6 - i * 0.03))}%` }} />
        ))}
      </div>
      <div className="hs-hours-x num">
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <b>20–22h</b>
      </div>
      <div className="hs-facts">
        <span><Icon name="timer" size="sm" />25 phút / phiên</span>
        <span><Icon name="bulb" size="sm" />Ví dụ đời thực</span>
      </div>
    </div>
  );
}

function Goal() {
  const now = useCount(24.6, 1300);
  return (
    <div className="hs-goal">
      <h2>Mục tiêu</h2>
      <div className="hs-goal-t">Bách khoa · CNTT</div>
      <div className="hs-goal-bar" aria-label="Điểm dự kiến 24,6 trên mức cần 27,5">
        <i style={{ width: `${((now - 18) / (30 - 18)) * 100}%` }} />
        <span className="mark" style={{ left: `${((27.5 - 18) / 12) * 100}%` }} />
      </div>
      <div className="hs-goal-x num">
        <span><b>{fmt1(now)}</b> dự kiến</span>
        <span>cần 27,5</span>
      </div>
      <Link to="/hoc/huong-nghiep" className="hs-link">Lộ trình đạt mục tiêu <Icon name="right" size="sm" /></Link>
    </div>
  );
}

/* ---------------- AI biết gì về em ---------------- */
function AiBiet() {
  const toast = useToast();
  const [data, setData] = useState(MEMORY);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [leaving, setLeaving] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const total = data.reduce((a, g) => a + g.items.length, 0);
  const forget = (m: Memory) => {
    setLeaving(m.id);
    setTimeout(() => {
      const snapshot = data;
      setData((d) => d.map((g) => ({ ...g, items: g.items.filter((x) => x.id !== m.id) })));
      setLeaving(null);
      toast({ title: "AI đã quên điều này", msg: m.text, undo: () => setData(snapshot) });
    }, 320);
  };
  const save = (m: Memory) => {
    const text = draft.trim();
    setEdit(null);
    if (!text || text === m.text) return;
    setData((d) => d.map((g) => ({ ...g, items: g.items.map((x) => (x.id === m.id ? { ...x, text, src: "Em sửa", conf: 1, when: "vừa xong", guess: false } : x)) })));
    setFresh(m.id);
    setTimeout(() => setFresh(null), 1600);
    toast({ title: "Đã sửa", msg: "AI sẽ dùng thông tin mới từ giờ.", kind: "ok" });
  };
  return (
    <div className="hs-biet">
      <div className="hs-biet-main">
        <div className="hs-trust">
          <span><Icon name="lock" size="sm" />Lưu trên máy chủ của trường</span>
          <span><Icon name="eye" size="sm" />Em xem và sửa được tất cả</span>
          <span><Icon name="shield" size="sm" />Mẹ đồng ý ngày 02/09</span>
        </div>
        <div className="hs-count num">
          <b>{total}</b> điều AI đang nhớ về em
        </div>
        {data.map((g) =>
          g.items.length ? (
            <section key={g.group} className="hs-mem-g">
              <h3><Icon name={g.icon} size="sm" />{g.group}</h3>
              <ul>
                {g.items.map((m) => (
                  <li key={m.id} className={[leaving === m.id && "out", fresh === m.id && "fresh"].filter(Boolean).join(" ") || undefined}>
                    {edit === m.id ? (
                      <form
                        className="hs-edit"
                        onSubmit={(e) => {
                          e.preventDefault();
                          save(m);
                        }}
                      >
                        <input className="input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Sửa điều AI nhớ" onKeyDown={(e) => e.key === "Escape" && setEdit(null)} />
                        <Button size="sm" variant="primary" type="submit">Lưu</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Huỷ</Button>
                      </form>
                    ) : (
                      <>
                        <div className="hs-mem-t">
                          <p>{m.guess && <em>Có vẻ </em>}{m.guess ? m.text.charAt(0).toLocaleLowerCase("vi") + m.text.slice(1) : m.text}</p>
                          <div className="hs-mem-m">
                            <span>{m.src}</span>
                            <Conf v={m.conf} label={false} />
                            <time>{m.when}</time>
                          </div>
                        </div>
                        <div className="hs-mem-a">
                          <IconButton icon="pen" label="Sửa" size="sm" onClick={() => { setEdit(m.id); setDraft(m.text); }} />
                          <IconButton icon="eraser" label="Quên điều này" size="sm" onClick={() => forget(m)} />
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>
      <aside className="hs-biet-side">
        <h2>Ai thấy gì</h2>
        <ul className="hs-who">
          {WHO_SEES.map((w) => (
            <li key={w.role}>
              <Face name={w.name} hue={w.hue} size={34} />
              <div>
                <b>{w.role}</b>
                <span>{w.sees}</span>
              </div>
            </li>
          ))}
        </ul>
        <h2>Nhật ký truy cập</h2>
        <ul className="hs-log">
          {ACCESS_LOG.map((a) => (
            <li key={a.what}>
              <Icon name={a.icon} size="sm" />
              <span><b>{a.who}</b> {a.what}</span>
              <time>{a.when}</time>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

/* ---------------- Học bạ sống ---------------- */
function HocBa() {
  const toast = useToast();
  const p = useFakeProgress(2400);
  const [sel, setSel] = useState(YEARS.findIndex((y) => y.now));
  const W = 1000, H = 220, pad = 44;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (YEARS.length - 1);
  const y = (v: number) => 180 - ((v - 5.5) / 3.5) * 150;
  const nowI = YEARS.findIndex((yy) => yy.now);
  const line = (a: number, b: number) => YEARS.slice(a, b + 1).map((yy, j) => `${j ? "L" : "M"}${x(a + j)},${y(yy.v)}`).join(" ");
  const area = `${line(0, nowI)} L${x(nowI)},200 L${x(0)},200 Z`;
  const yr = YEARS[sel]!;
  const exportIt = () =>
    new Promise<void>((res) =>
      setTimeout(() => {
        res();
        toast({ title: "Đã xuất hồ sơ", msg: "hoc-ba-minh-anh.pdf · kèm bản dữ liệu mang sang trường mới", kind: "ok" });
      }, 1400),
    );
  return (
    <div className="hs-hocba">
      <div className="hs-hocba-h">
        <p className="hs-own">Hồ sơ là của em, đi cùng em từ lớp 6 lên đại học.</p>
        <Button variant="primary" icon="down" onClick={exportIt}>Xuất hồ sơ</Button>
      </div>
      <div className="hs-tl-wrap">
        <svg viewBox={`0 0 ${W} ${H + 70}`} className="hs-tl" role="img" aria-label="Năng lực tổng từ lớp 6 (6,1) đến lớp 10 (7,4), dự kiến đại học 8,5">
          <defs>
            <clipPath id="hs-tl-clip">
              <rect x={0} y={0} width={pad + p * (W - pad)} height={H + 70} />
            </clipPath>
            <linearGradient id="hs-tl-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity=".18" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={pad} x2={W - pad} y1={232} y2={232} className="hs-tl-base" />
          {[
            [3.5, "Lên cấp 3 · AI bàn giao"],
            [6.5, "Lên đại học"],
          ].map(([at, t]) => (
            <g key={t as string} className="hs-band">
              <line x1={x(at as number)} x2={x(at as number)} y1={20} y2={240} />
              <text x={x(at as number)} y={12} textAnchor="middle">{t}</text>
            </g>
          ))}
          <g clipPath="url(#hs-tl-clip)">
            <path d={area} fill="url(#hs-tl-fill)" />
            <path d={line(0, nowI)} className="hs-tl-line" />
            <path d={line(nowI, YEARS.length - 1)} className="hs-tl-line proj" />
          </g>
          {YEARS.map((yy, i) => {
            const shown = p * (W - pad) + pad >= x(i) - 2;
            const on = i === sel;
            return (
              <g key={yy.k} className={["hs-node", shown && "in", yy.proj && "proj", yy.now && "now", on && "on"].filter(Boolean).join(" ")} onClick={() => setSel(i)} role="button" tabIndex={0} aria-label={`${yy.label} ${yy.year}`} onKeyDown={(e) => e.key === "Enter" && setSel(i)}>
                <line x1={x(i)} x2={x(i)} y1={y(yy.v) + 8} y2={226} className="stem" />
                <circle cx={x(i)} cy={y(yy.v)} r={on ? 9 : 6} className="pt" />
                {yy.now && <circle cx={x(i)} cy={y(yy.v)} r={15} className="halo" />}
                <text x={x(i)} y={y(yy.v) - 16} textAnchor="middle" className="v num">{fmt1(yy.v)}</text>
                <circle cx={x(i)} cy={232} r={on ? 6 : 4} className="tick" />
                <text x={x(i)} y={256} textAnchor="middle" className="k">{yy.label}</text>
                <text x={x(i)} y={274} textAnchor="middle" className="yr num">{yy.year}</text>
                <rect x={x(i) - 50} y={0} width={100} height={H + 70} fill="transparent" />
              </g>
            );
          })}
        </svg>
      </div>
      <ol className="hs-vtl">
        {YEARS.map((yy) => (
          <li key={yy.k} className={[yy.proj && "proj", yy.now && "now"].filter(Boolean).join(" ") || undefined}>
            <i />
            <div>
              <b>{yy.label}</b>
              <span className="num">{yy.year} · {fmt1(yy.v)}</span>
              <p>{yy.moment}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="hs-year" key={yr.k}>
        <div className="hs-year-k">
          <span className="dm-eyebrow">{yr.proj ? "Dự kiến" : yr.now ? "Bây giờ" : yr.year}</span>
          <b>{yr.label}</b>
          <span>{yr.place}</span>
        </div>
        <blockquote>{yr.moment}</blockquote>
        <dl>
          {!yr.proj && (
            <div>
              <dt>Mạnh nhất</dt>
              <dd>{yr.best}</dd>
            </div>
          )}
          <div>
            <dt>{yr.proj ? "Ghi chú" : "AI ghi nhận"}</dt>
            <dd>{yr.note}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
