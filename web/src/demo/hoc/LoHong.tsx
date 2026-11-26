import { useState } from "react";
import { Button } from "../../ui";
import { Icon } from "../../ui/Icon";
import { DemoHead } from "./parts";
import { Face, useClock } from "../kit";

/** Vòng lặp lỗ hổng: Phát hiện → Bài vừa sức → Kiểm lại → Ghi nhớ, tự chạy thành vòng; mỗi vòng vá một lỗ hổng (Toán rồi Văn). */
const STATIONS = [
  { label: "Phát hiện", icon: "search" },
  { label: "Bài vừa sức", icon: "layers" },
  { label: "Kiểm lại", icon: "checkc" },
  { label: "Ghi nhớ", icon: "bookmark" },
] as const;
const D = 3.4; // giây mỗi chặng

type Gap = { id: string; subject: string; color: string; topic: string; error: string; answers: number[]; items: { q: string; lv: string }[]; from: number; to: number; review: string };
const GAPS: Gap[] = [
  {
    id: "bdt", subject: "Toán", color: "var(--c1)", topic: "Bất phương trình bậc hai", error: "Đổi chiều khi nhân số âm", answers: [1, 0, 0, 1, 0, 0],
    items: [{ q: "−3x + 9 > 0", lv: "Dễ hơn" }, { q: "−2x² + 8 ≥ 0", lv: "Vừa sức" }, { q: "(x − 1)(3 − x) > 0", lv: "Khó hơn chút" }],
    from: 42, to: 58, review: "28/11",
  },
  {
    id: "doc", subject: "Ngữ văn", color: "var(--c5)", topic: "Đọc hiểu nghị luận", error: "Đọc thiếu yêu cầu đề", answers: [1, 0, 1, 0, 0, 1],
    items: [{ q: "Gạch chân hai yêu cầu trong đề", lv: "Dễ hơn" }, { q: "Tìm luận điểm của đoạn 2", lv: "Vừa sức" }, { q: "Trả lời đủ ý một câu hỏi kép", lv: "Khó hơn chút" }],
    from: 48, to: 61, review: "29/11",
  },
];
const NOTEBOOK = [
  { gap: "bdt", subject: "Toán", color: "var(--c1)", q: "−2x > 6  ⇒  x > −3", why: "Đổi chiều khi nhân số âm" },
  { gap: "doc", subject: "Ngữ văn", color: "var(--c5)", q: "Câu 3: nêu hai tác dụng của phép lặp", why: "Đọc thiếu yêu cầu đề" },
  { subject: "Hoá học", color: "var(--c3)", q: "Cân bằng Fe + HNO₃ loãng", why: "Sai hệ số electron", fixed: true },
  { subject: "Tiếng Anh", color: "var(--c7)", q: "has gone / has been", why: "Nhầm nghĩa hai thì", due: "30/11" },
  { subject: "Lịch sử", color: "var(--c4)", q: "Mốc kết thúc chiến dịch Điện Biên Phủ", why: "Nhớ nhầm ngày", fixed: true },
];

export function LoHong() {
  const [run, setRun] = useState(true);
  const [t, setT] = useClock(run);
  const lapLen = D * STATIONS.length;
  const lap = Math.floor(t / lapLen);
  const inLap = t - lap * lapLen;
  const stage = Math.min(STATIONS.length - 1, Math.floor(inLap / D));
  const p = (inLap - stage * D) / D;
  const gap = GAPS[lap % GAPS.length]!;
  const done = (id: string) => GAPS.findIndex((g) => g.id === id) < lap || (gap.id === id && stage === 3 && p > 0.35);
  const frac = (stage + p) / STATIONS.length;
  const ang = -90 + 360 * frac;
  const R = 160;
  const jump = (i: number) => setT(lap * lapLen + i * D + 0.01);
  return (
    <div className="dm lh">
      <DemoHead title="Vòng lặp lỗ hổng" eyebrow={<span>Tự chạy sau mỗi bài làm</span>}>
        <span className="lh-lap num">Vòng {lap + 1} · đã vá {GAPS.filter((g) => done(g.id)).length + 2}</span>
        <Button variant="primary" icon={run ? "pause" : "play"} onClick={() => setRun(!run)}>{run ? "Tạm dừng" : "Chạy tiếp"}</Button>
      </DemoHead>
      <div className="lh-main">
        <div className="lh-ring" style={{ ["--gc" as string]: gap.color }}>
          <svg viewBox="-200 -200 400 400" aria-hidden="true">
            <circle r={R} className="trk" />
            <circle r={R} className="arc" pathLength={1} style={{ strokeDashoffset: 1 - frac }} transform="rotate(-90)" />
            {[0, 1, 2, 3].map((i) => {
              const a = ((-90 + i * 90 + 45) * Math.PI) / 180;
              return <path key={i} d="M-6,-7 L4,0 L-6,7" transform={`translate(${Math.cos(a) * R},${Math.sin(a) * R}) rotate(${-90 + i * 90 + 45 + 90})`} className="chev" />;
            })}
            <g transform={`rotate(${ang})`}>
              <circle cx={R} cy={0} r={18} className="glow" />
              <circle cx={R} cy={0} r={8} className="dot" />
            </g>
          </svg>
          {STATIONS.map((s, i) => (
            <button key={s.label} type="button" className={["lh-st", `p${i}`, i === stage && "on", i < stage && "past"].filter(Boolean).join(" ")} onClick={() => jump(i)}>
              <span className="ic"><Icon name={s.icon} /></span>
              <span className="lb">{s.label}</span>
            </button>
          ))}
          <div className="lh-center" key={`${lap}-${stage}`}>
            <Center gap={gap} stage={stage} p={p} />
          </div>
        </div>
        <div className="lh-detail" key={`${lap}-${stage}-d`}>
          <div className="lh-gap">
            <span className="lh-subj" style={{ ["--sc" as string]: gap.color }}>{gap.subject}</span>
            <b>{gap.topic}</b>
          </div>
          <Detail gap={gap} stage={stage} p={p} />
        </div>
      </div>
      <section className="lh-book">
        <h2>Sổ câu sai</h2>
        <ul>
          {NOTEBOOK.map((n) => {
            const fixed = n.fixed || (n.gap ? done(n.gap) : false);
            const active = n.gap === gap.id && !fixed;
            return (
              <li key={n.q} className={[active && "active", fixed && n.gap && "just"].filter(Boolean).join(" ") || undefined}>
                <span className="lh-subj" style={{ ["--sc" as string]: n.color }}>{n.subject}</span>
                <span className="q">{n.q}</span>
                <span className="why">{n.why}</span>
                <span className={fixed ? "st ok" : active ? "st now" : "st"}>
                  {fixed ? <><Icon name="check" size="sm" />Đã vá</> : active ? "Đang luyện" : `Ôn ${n.due ?? "sau"}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Center({ gap, stage, p }: { gap: Gap; stage: number; p: number }) {
  if (stage === 0) {
    const wrong = gap.answers.filter((a) => !a).length;
    return (
      <>
        <b className="big num">{wrong}<small>/{gap.answers.length}</small></b>
        <span>câu sai cùng một lỗi</span>
      </>
    );
  }
  if (stage === 1)
    return (
      <>
        <b className="big num">{Math.min(3, 1 + Math.floor(p * 4))}</b>
        <span>bài AI vừa soạn riêng</span>
      </>
    );
  if (stage === 2) {
    const v = gap.from + (gap.to - gap.from) * Math.min(1, Math.max(0, (p - 0.35) / 0.5));
    return (
      <>
        <b className="big num">{Math.round(v)}<small>%</small></b>
        <span>thành thạo</span>
      </>
    );
  }
  return (
    <>
      <b className="big num">3<small> ngày</small></b>
      <span>ôn lại để nhớ lâu</span>
    </>
  );
}

function Detail({ gap, stage, p }: { gap: Gap; stage: number; p: number }) {
  if (stage === 0)
    return (
      <div className="lh-d">
        <div className="lh-answers">
          {gap.answers.map((a, i) => (
            <span key={i} className={a ? "ok" : p > 0.15 + i * 0.07 ? "bad on" : "bad"} style={{ animationDelay: `${i * 70}ms` }}>
              <Icon name={a ? "check" : "x"} size="sm" />
            </span>
          ))}
        </div>
        <div className={p > 0.6 ? "lh-found in" : "lh-found"}>
          <Icon name="spark" size="sm" />
          <span>AI tìm ra: <b>{gap.error}</b></span>
        </div>
      </div>
    );
  if (stage === 1)
    return (
      <ol className="lh-items">
        {gap.items.map((it, i) => (
          <li key={it.q} className={p > i * 0.25 ? "in" : undefined}>
            <span className="lv"><i style={{ width: `${40 + i * 25}%` }} />{it.lv}</span>
            <span className="q">{it.q}</span>
          </li>
        ))}
      </ol>
    );
  if (stage === 2)
    return (
      <div className="lh-d">
        <ol className="lh-items checked">
          {gap.items.map((it, i) => (
            <li key={it.q} className="in">
              <span className={p > 0.1 + i * 0.12 ? "tick on" : "tick"}><Icon name="check" size="sm" /></span>
              <span className="q">{it.q}</span>
            </li>
          ))}
        </ol>
        <div className="lh-mastery">
          <i style={{ width: `${gap.from + (gap.to - gap.from) * Math.min(1, Math.max(0, (p - 0.35) / 0.5))}%` }} />
          <span className="was" style={{ left: `${gap.from}%` }} />
        </div>
      </div>
    );
  return (
    <div className="lh-d">
      <div className={p > 0.15 ? "lh-card in" : "lh-card"}>
        <Icon name="bookmark" size="sm" />
        <div>
          <b>{gap.error}</b>
          <span>Hẹn ôn {gap.review}</span>
        </div>
      </div>
      <div className="lh-tell">
        {[
          { n: "Lê Thu Hà", h: 28, t: "Cô Hà biết em đã vá" },
          { n: "Nguyễn Thị Hồng", h: 340, t: "Mẹ nhận tin tối nay" },
        ].map((x, i) => (
          <span key={x.n} className={p > 0.4 + i * 0.15 ? "in" : undefined}>
            <Face name={x.n} hue={x.h} size={28} />
            {x.t}
          </span>
        ))}
      </div>
    </div>
  );
}
