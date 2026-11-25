import { useEffect, useState } from "react";
import { Button } from "../../ui";
import { Icon } from "../../ui/Icon";
import { DemoHead } from "./parts";

/** Lịch học: tuần 23–29/11, AI xếp giờ ôn vào đúng lúc sắp quên và đúng khung giờ học tốt nhất (20–22h). */
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DATES = [23, 24, 25, 26, 27, 28, 29];
const TODAY = 2;
const NOW = 19.67; // 19:40
const H0 = 7, H1 = 23;

type Ev = { d: number; s: number; e: number; t: string; kind: "lop" | "hd" | "han" | "on"; color?: string; sub?: string };
const FIXED: Ev[] = [
  ...[0, 1, 2, 3, 4, 5].map((d): Ev => ({ d, s: 7, e: 11.5, t: "Trên lớp", kind: "lop" })),
  { d: 1, s: 14, e: 16, t: "CLB Hoá học", kind: "hd" },
  { d: 3, s: 15, e: 16.5, t: "Thể dục", kind: "hd" },
  { d: 2, s: 14, e: 15.5, t: "Học thêm Toán", kind: "hd" },
  { d: 4, s: 21.5, e: 22, t: "Hạn: đoạn văn 200 chữ", kind: "han" },
  { d: 0, s: 16, e: 17, t: "Bóng rổ", kind: "hd" },
];
const AI: Ev[] = [
  { d: 2, s: 20, e: 20.42, t: "Ôn công thức lượng giác", sub: "sắp quên · 25′", kind: "on", color: "var(--c1)" },
  { d: 3, s: 20.5, e: 21, t: "Bất phương trình · 3 bài", sub: "vá lỗ hổng · 30′", kind: "on", color: "var(--c8)" },
  { d: 4, s: 20, e: 20.5, t: "Đọc hiểu nghị luận", sub: "trước hạn nộp · 30′", kind: "on", color: "var(--c5)" },
  { d: 5, s: 20.5, e: 21.25, t: "Ôn tập cả tuần", sub: "45′", kind: "on", color: "var(--c3)" },
  { d: 6, s: 20, e: 20.33, t: "Bảo toàn khối lượng", sub: "sắp quên · 20′", kind: "on", color: "var(--c7)" },
];
const FORGET = [
  { t: "Công thức lượng giác", keep: 0.64, when: "Tối nay 20:00", color: "var(--c1)" },
  { t: "Bảo toàn khối lượng", keep: 0.71, when: "CN 20:00", color: "var(--c7)" },
  { t: "Hàm số bậc hai", keep: 0.86, when: "Tuần sau", color: "var(--c3)" },
];
const hm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export function Lich() {
  const [placed, setPlaced] = useState(false);
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!placed) return;
    const t = setTimeout(() => setToast(true), 1500);
    return () => clearTimeout(t);
  }, [placed]);
  const evs = [...FIXED, ...(placed ? AI : [])];
  return (
    <div className="dm lc">
      <DemoHead title="Lịch học" eyebrow={<span>Tuần 23 – 29/11</span>}>
        <Button variant="primary" icon="spark" onClick={() => (placed ? (setPlaced(false), setToast(false)) : setPlaced(true))}>
          {placed ? "Xếp lại" : "Xếp lịch ôn"}
        </Button>
      </DemoHead>
      <div className="lc-main">
        <div className="lc-cal" role="grid" aria-label="Lịch tuần">
          <div className="lc-hd">
            <span />
            {DAYS.map((d, i) => (
              <span key={d} className={i === TODAY ? "today" : undefined}>
                {d}
                <b className="num">{DATES[i]}</b>
              </span>
            ))}
          </div>
          <div className="lc-body" style={{ ["--rows" as string]: H1 - H0 }}>
            <div className="lc-hours">
              {Array.from({ length: H1 - H0 }, (_, i) => (
                <span key={i} className="num">{H0 + i}h</span>
              ))}
            </div>
            <div className="lc-cols">
              <div className="lc-best" style={{ top: `calc(${20 - H0} * var(--hh))`, height: `calc(2 * var(--hh))` }}>
                <span>Giờ học tốt nhất</span>
              </div>
              {DAYS.map((_, d) => (
                <div key={d} className={d === TODAY ? "lc-col today" : "lc-col"}>
                  {evs
                    .filter((e) => e.d === d)
                    .map((e, i) => (
                      <div
                        key={e.t}
                        className={`lc-ev ${e.kind}`}
                        style={{ top: `calc(${e.s - H0} * var(--hh))`, height: `calc(${e.e - e.s} * var(--hh) - 2px)`, ["--ec" as string]: e.color ?? "var(--ink-3)", animationDelay: e.kind === "on" ? `${AI.indexOf(e) * 160}ms` : `${i * 30}ms` }}
                        title={`${hm(e.s)}–${hm(e.e)} ${e.t}`}
                      >
                        {e.kind === "on" && <Icon name="spark" size="sm" />}
                        <b>{e.t}</b>
                        {e.sub && <small>{e.sub}</small>}
                      </div>
                    ))}
                  {d === TODAY && <div className="lc-now" style={{ top: `calc(${NOW - H0} * var(--hh))` }}><i /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <ol className="lc-agenda" aria-label="Lịch mấy ngày tới">
          {[2, 3, 4, 5, 6].map((d) => (
            <li key={d}>
              <h3>{d === TODAY ? "Hôm nay" : DAYS[d]} <span className="num">{DATES[d]}/11</span></h3>
              {evs
                .filter((e) => e.d === d && e.kind !== "lop")
                .sort((a, b) => a.s - b.s)
                .map((e) => (
                  <div key={e.t} className={`lc-ag ${e.kind}`} style={{ ["--ec" as string]: e.color ?? "var(--ink-3)" }}>
                    <time className="num">{hm(e.s)}</time>
                    <span>{e.t}{e.sub && <small>{e.sub}</small>}</span>
                  </div>
                ))}
            </li>
          ))}
        </ol>
        <aside className="lc-side">
          <h2>Sắp quên</h2>
          <ul>
            {FORGET.map((f) => (
              <li key={f.t}>
                <span className="lc-ring" style={{ ["--p" as string]: `${f.keep * 100}%`, ["--rc" as string]: f.color }}>
                  <b className="num">{Math.round(f.keep * 100)}</b>
                </span>
                <div>
                  <b>{f.t}</b>
                  <span className={placed ? "when on" : "when"}>{placed ? <><Icon name="check" size="sm" />{f.when}</> : "Chưa có giờ ôn"}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className={toast ? "lc-push in" : "lc-push"} role="status">
            <span className="lc-push-ic"><Icon name="bell" size="sm" /></span>
            <div>
              <b>20:00 · Nhắc ôn</b>
              <span>Lượng giác sắp quên rồi, 25 phút thôi nhé.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
