import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "../../ui/components/Button";
import { Segmented } from "../../ui/components/Chip";
import { Icon } from "../../ui/Icon";
import { HIDE_UNDER, WELL_CLASSES, WELL_WEEKS } from "./data";

/* ---------------- Hoạt hình "AI phối hợp": HS → GV → phụ huynh ---------------- */
type Hop = { title: string; text: string };
type Scene = { hs: Hop; gv: Hop; ph: Hop; pay: [string, string]; blocked?: boolean; log: string };
const SCENES: Record<"hoc" | "tai", Scene> = {
  hoc: {
    hs: { title: "Bí 3 ngày", text: "Bất phương trình bậc hai, lặp lỗi đổi chiều dấu." },
    gv: { title: "Vào “3 em cần giúp”", text: "Kèm gợi ý giảng lại bằng ví dụ đời thực và video 5 phút." },
    ph: { title: "Tối nay hỏi con 1 câu", text: "Lời đời thường, có đọc to, gửi qua Zalo." },
    pay: ["chủ đề · số ngày bí", "1 câu hỏi kèm con"],
    log: "2 lần chia sẻ · chỉ phần được phép · đã ghi nhật ký",
  },
  tai: {
    hs: { title: "Dấu hiệu quá tải", text: "Thức khuya 2 tuần, điểm tụt, bỏ dở bài liên tục." },
    gv: { title: "Chỉ GV chủ nhiệm nhận", text: "Gợi ý trò chuyện riêng. Không gắn nhãn, không chẩn đoán." },
    ph: { title: "Không tự gửi", text: "GV chủ nhiệm quyết định có báo gia đình hay không." },
    pay: ["tín hiệu · không chẩn đoán", "dừng ở GV"],
    blocked: true,
    log: "1 lần chia sẻ · nhà trường không thấy tên · đã ghi nhật ký",
  },
};

const mq = "(max-width: 720px)";
const useNarrow = () =>
  useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(mq);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(mq).matches,
    () => false,
  );

/** Hình học sân khấu: ngang (máy tính) hoặc dọc (điện thoại). Toạ độ theo viewBox. */
function geo(narrow: boolean) {
  if (narrow) {
    const W = 360, H = 560;
    const n = [
      [52, 64],
      [52, 280],
      [52, 496],
    ] as const;
    const p1 = `M52 64 C -8 140, -8 204, 52 280`;
    const p2 = `M52 280 C -8 356, -8 420, 52 496`;
    return { W, H, n, p1, p2 };
  }
  const W = 1000, H = 305;
  const n = [
    [150, 96],
    [500, 96],
    [850, 96],
  ] as const;
  const p1 = `M150 96 C 250 -6, 400 -6, 500 96`;
  const p2 = `M500 96 C 600 -6, 750 -6, 850 96`;
  return { W, H, n, p1, p2 };
}

const NODES = [
  { icon: "cap", who: "AI học sinh", sub: "Một em 10A1" },
  { icon: "board", who: "AI GV chủ nhiệm", sub: "cô Hà · 10A1" },
  { icon: "home", who: "AI phụ huynh", sub: "Gia đình em" },
];

/** step: 0 HS sáng · 1 đi HS→GV · 2 GV sáng · 3 đi GV→PH · 4 PH (hoặc bị chặn) · 5 ghi nhật ký */
function Coordinate() {
  const [kind, setKind] = useState<"hoc" | "tai">("hoc");
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(-1);
  const [t, setT] = useState(0); // tiến độ chặng đang đi 0..1
  const narrow = useNarrow();
  const g = geo(narrow);
  const sc = SCENES[kind];
  const path1 = useRef<SVGPathElement>(null);
  const path2 = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState<[number, number] | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, f: () => void) => timers.push(setTimeout(f, reduce ? 0 : ms));
    const travel = (el: SVGPathElement | null, ms: number, stopAt = 1) => {
      if (!el) return;
      const len = el.getTotalLength();
      const t0 = performance.now();
      const f = (now: number) => {
        const p = Math.min(1, (now - t0) / ms);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const v = e * stopAt;
        const q = el.getPointAtLength(len * v);
        setT(v);
        setPt([q.x, q.y]);
        if (p < 1) raf = requestAnimationFrame(f);
      };
      raf = requestAnimationFrame(f);
    };
    setStep(-1);
    setPt(null);
    setT(0);
    at(300, () => setStep(0));
    at(1500, () => {
      setStep(1);
      travel(path1.current, reduce ? 1 : 1500);
    });
    at(3100, () => {
      setStep(2);
      setPt(null);
    });
    at(4400, () => {
      setStep(3);
      travel(path2.current, reduce ? 1 : 1500, sc.blocked ? 0.5 : 1);
    });
    at(6000, () => {
      setStep(4);
      if (!sc.blocked) setPt(null);
    });
    at(7000, () => setStep(5));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [kind, run, narrow, sc.blocked]);

  const lit = (i: number) => (i === 0 ? step >= 0 : i === 1 ? step >= 2 : step >= 4 && !sc.blocked);
  const said = (i: number) => (i === 0 ? step >= 0 : i === 1 ? step >= 2 : step >= 4);
  const hop = [sc.hs, sc.gv, sc.ph];
  const trail1 = step < 1 ? 0 : step === 1 ? t : 1;
  const trail2 = step < 3 ? 0 : step === 3 ? t : sc.blocked ? 0.5 : 1;
  const blockedNow = sc.blocked && step >= 4;
  const pct = (x: number, y: number) => ({ left: `${(x / g.W) * 100}%`, top: `${(y / g.H) * 100}%` });

  return (
    <section className="tr-sec co" aria-labelledby="tr-co">
      <div className="tr-sec-h">
        <h2 id="tr-co">AI phối hợp</h2>
        <Segmented
          label="Tình huống"
          value={kind}
          onChange={setKind}
          options={[
            { value: "hoc", label: "Học tập" },
            { value: "tai", label: "Quá tải" },
          ]}
        />
        <span className="grow" />
        <Button variant="ghost" icon="refresh" onClick={() => setRun((r) => r + 1)}>
          Phát lại
        </Button>
      </div>
      <div className={narrow ? "co-stage v" : "co-stage"} style={{ aspectRatio: `${g.W} / ${g.H}` }} onClick={() => step >= 5 && setRun((r) => r + 1)} title={step >= 5 ? "Bấm để phát lại" : undefined}>
        <svg viewBox={`0 0 ${g.W} ${g.H}`} aria-hidden="true">
          <path d={g.p1} className="co-road" />
          <path d={g.p2} className={sc.blocked ? "co-road cut" : "co-road"} />
          <path ref={path1} d={g.p1} className="co-trail" pathLength={1} style={{ strokeDashoffset: 1 - trail1 }} />
          <path ref={path2} d={g.p2} className={blockedNow ? "co-trail stop" : "co-trail"} pathLength={1} style={{ strokeDashoffset: 1 - trail2 }} />
          {pt && (
            <g className={blockedNow ? "co-pkt stop" : "co-pkt"} transform={`translate(${pt[0]} ${pt[1]})`}>
              <circle r="22" className="halo" />
              <circle r="9" className="core" />
            </g>
          )}
        </svg>
        {pt && (step === 1 || step === 3 || blockedNow) && (
          <span className={blockedNow ? "co-pay stop" : "co-pay"} style={pct(pt[0] + (narrow ? 34 : 0), pt[1] - (narrow ? 0 : 34))}>
            {blockedNow ? "dừng ở GV" : sc.pay[step === 1 ? 0 : 1]}
          </span>
        )}
        {NODES.map((n, i) => (
          <div key={n.who} className={["co-node", lit(i) && "on", i === 2 && blockedNow && "locked"].filter(Boolean).join(" ")} style={pct(g.n[i]![0], g.n[i]![1])}>
            <span className="disc">
              <Icon name={i === 2 && blockedNow ? "lock" : n.icon} />
            </span>
            <span className="cap">
              <b>{n.who}</b>
              <small>{n.sub}</small>
              <span className={said(i) ? "say on" : "say"} key={`${kind}-${run}`}>
                <strong>{hop[i]!.title}</strong>
                <span>{hop[i]!.text}</span>
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className={step >= 5 ? "co-log on" : "co-log"}>
        <Icon name="checkc" size="sm" />
        {sc.log}
      </p>
    </section>
  );
}

/* ---------------- Tín hiệu quá tải (tổng hợp) ---------------- */
function Weeks() {
  const max = Math.max(...WELL_WEEKS);
  const last = WELL_WEEKS.length - 1;
  return (
    <div className="wk" role="img" aria-label={`Tín hiệu quá tải 8 tuần: ${WELL_WEEKS.join(", ")}`}>
      {WELL_WEEKS.map((v, i) => (
        <div key={i} className={i === last ? "wk-c now" : "wk-c"} style={{ ["--i" as string]: i }} title={`Tuần ${i + 5}: ${v} tín hiệu`}>
          <i style={{ height: `${(v / max) * 100}%` }}>{i === last && <b className="num">{v}</b>}</i>
          <small>T{i + 5}</small>
        </div>
      ))}
    </div>
  );
}

function ByClass() {
  const shown = WELL_CLASSES.filter((c) => c.n >= HIDE_UNDER);
  const hidden = WELL_CLASSES.filter((c) => c.n < HIDE_UNDER);
  const max = Math.max(...shown.map((c) => c.n));
  return (
    <div className="bc">
      {shown.map((c, i) => (
        <div key={c.id} className="bc-row" style={{ ["--i" as string]: i }}>
          <b>{c.id}</b>
          <span className="bar"><i style={{ width: `${(c.n / max) * 100}%` }} /></span>
          <span className="num">{c.n}</span>
        </div>
      ))}
      <div className="bc-row hid" style={{ ["--i" as string]: shown.length }}>
        <b>{hidden.length} lớp</b>
        <span className="bar"><i className="hatch" /></span>
        <span className="lock"><Icon name="eyeoff" size="sm" /> dưới {HIDE_UNDER} em</span>
      </div>
    </div>
  );
}

/** Nhà trường — Sức khoẻ tinh thần (chỉ số tổng hợp) + hoạt hình AI phối hợp có quyền. */
export default function SucKhoe() {
  return (
    <div className="tr-page">
      <div className="tr-head">
        <p className="eyebrow">Tuần 12 · số tổng hợp</p>
        <h1>Sức khoẻ & phối hợp</h1>
      </div>
      <Coordinate />
      <div className="tr-grid even">
        <section className="tr-sec" aria-labelledby="tr-wk">
          <div className="tr-sec-h">
            <h2 id="tr-wk">Tín hiệu quá tải</h2>
          </div>
          <Weeks />
          <ul className="tr-rules">
            <li><Icon name="user" size="sm" /> Chỉ GV chủ nhiệm nhận</li>
            <li><Icon name="ban" size="sm" /> Không gắn nhãn</li>
            <li><Icon name="eyeoff" size="sm" /> Nhóm dưới {HIDE_UNDER} em: ẩn</li>
          </ul>
        </section>
        <section className="tr-sec" aria-labelledby="tr-bc">
          <div className="tr-sec-h">
            <h2 id="tr-bc">Theo lớp</h2>
          </div>
          <ByClass />
        </section>
      </div>
    </div>
  );
}
