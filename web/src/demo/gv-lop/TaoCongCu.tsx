import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "../../ui";
import { Icon } from "../../ui/Icon";
import type { Level, ThumbKind, Tool } from "./khoData";
import { Thumb } from "./Thumb";
import { usePhases, useClock, useTween, fmt1 } from "../kit";

/** Xưởng AI tạo công cụ ngay trước mắt: hiểu yêu cầu → khối hiện dần → lắp lại thành công cụ chạy được → tự kiểm → lưu vào kho. */
export type Blueprint = "conlac" | "cungcau" | "chung";
export const blueprintOf = (q: string): Blueprint => (/con lắc|dao động|pendul/i.test(q) ? "conlac" : /cung|cầu|giá|thị trường/i.test(q) ? "cungcau" : "chung");

type Spec = { name: string; subject: string; level: Level; topic: string; kind: ThumbKind; blocks: [string, string][]; checks: string[] };
const SPECS: Record<Blueprint, (q: string) => Spec> = {
  conlac: () => ({
    name: "Con lắc đơn – chiều dài dây",
    subject: "Vật lí",
    level: "THPT",
    topic: "Vật lí 11 · Dao động",
    kind: "pendulum",
    blocks: [["play", "Mô phỏng"], ["chart", "Đồ thị T – l"], ["sigma", "Công thức"], ["sliders", "Thanh trượt"]],
    checks: ["Chu kì khớp T = 2π√(l/g), sai số 0,2%", "Kéo thanh trượt mượt 60 khung/giây", "Chạy offline, không cần mạng", "Đọc rõ trên điện thoại"],
  }),
  cungcau: () => ({
    name: "Cung – cầu giá lúa",
    subject: "GDCD/KTPL",
    level: "THPT",
    topic: "KTPL 10 · Cơ chế thị trường",
    kind: "curves",
    blocks: [["chart", "Đồ thị cung – cầu"], ["target", "Giá cân bằng"], ["sigma", "Công thức"], ["sliders", "Thanh trượt"]],
    checks: ["Điểm cân bằng khớp lời giải đại số", "Giá không âm ở mọi vị trí thanh trượt", "Chạy offline, không cần mạng", "Đọc rõ trên điện thoại"],
  }),
  chung: (q) => ({
    name: q.length > 42 ? `${q.slice(0, 40)}…` : q.charAt(0).toLocaleUpperCase("vi") + q.slice(1),
    subject: "Toán",
    level: "THPT",
    topic: "Tự gắn môn theo nội dung",
    kind: "wave",
    blocks: [["chart", "Đồ thị"], ["target", "Số đo"], ["sigma", "Công thức"], ["sliders", "Thanh trượt"]],
    checks: ["Công thức khớp đồ thị ở 200 điểm thử", "Kéo thanh trượt mượt 60 khung/giây", "Chạy offline, không cần mạng", "Đọc rõ trên điện thoại"],
  }),
};

const STEPS = ["Hiểu yêu cầu", "Dựng khối", "Chạy thử", "Tự kiểm", "Lưu vào kho"];
const D = [1300, 520, 520, 520, 520, 1100, 650, 650, 650, 650, 900];

export function Workshop({ q, run, onSaved, onClose }: { q: string; run: number; onSaved: (t: Tool) => void; onClose: () => void }) {
  const bp = blueprintOf(q);
  const spec = SPECS[bp](q);
  const p = usePhases(D, true, run);
  const blocks = Math.min(4, p);
  const live = p >= 5;
  const checks = Math.max(0, Math.min(4, p - 5));
  const saved = p >= 11;
  const step = p < 1 ? 0 : p < 5 ? 1 : p < 6 ? 2 : p < 10 ? 3 : saved ? 5 : 4;
  const autoplay = live && p < 10;
  const sent = useRef(-1);
  useEffect(() => {
    if (saved && sent.current !== run) {
      sent.current = run;
      onSaved({ id: `ai-${run}`, name: spec.name, subject: spec.subject, level: spec.level, src: "ai", kind: spec.kind, uses: 0, by: "bạn", isNew: true });
    }
  }, [saved, run]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="gl-ws" aria-label="AI đang tạo công cụ">
      <header className="gl-ws-head">
        <div className="gl-ws-q">
          <span className="gl-eyebrow">Yêu cầu</span>
          <q>{q}</q>
        </div>
        <div className="gl-ws-tags">
          {p >= 1 && (
            <>
              <span style={{ animationDelay: "0ms" }}>{spec.topic}</span>
              <span style={{ animationDelay: "120ms" }}>{spec.level}</span>
              <span style={{ animationDelay: "240ms" }}>4 khối dựng sẵn</span>
            </>
          )}
        </div>
        <button type="button" className="gl-x" aria-label="Đóng xưởng" onClick={onClose}>
          <Icon name="x" size="sm" />
        </button>
      </header>

      <div className="gl-ws-body">
        <ol className="gl-ws-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? "done" : i === step ? "on" : undefined}>
              <i>{i < step ? <Icon name="check" size="sm" /> : i === step ? <Icon name="loader" size="sm" className="gl-spin" /> : null}</i>
              {s}
            </li>
          ))}
        </ol>

        <div className={`gl-ws-canvas bp-${bp}${live ? " live" : ""}`}>
          {bp === "conlac" ? (
            <Pendulum blocks={blocks} live={live} auto={autoplay} spec={spec} />
          ) : bp === "cungcau" ? (
            <Market blocks={blocks} live={live} auto={autoplay} spec={spec} />
          ) : (
            <Generic blocks={blocks} live={live} auto={autoplay} spec={spec} />
          )}
          {p === 0 && (
            <div className="gl-ws-think">
              <Icon name="spark" /> Đang đọc yêu cầu…
            </div>
          )}
          {autoplay && checks < 1 && <span className="gl-ws-try"><Icon name="pointer" size="sm" /> AI đang thử kéo</span>}
        </div>

        <div className="gl-ws-side">
          <ul className="gl-ws-checks" aria-label="Tự kiểm">
            {spec.checks.map((c, i) => (
              <li key={c} className={i < checks ? "ok" : live && i === checks ? "run" : undefined}>
                <i>{i < checks ? <Icon name="check" size="sm" /> : null}</i>
                {c}
              </li>
            ))}
          </ul>
          {saved ? (
            <div className="gl-ws-saved">
              <div className="gl-ws-made">
                <Thumb kind={spec.kind} color="var(--gl-c4)" />
                <span>
                  <span className="gl-src-tag ai">Mới · AI tạo</span>
                  <b>{spec.name}</b>
                </span>
              </div>
              <span className="gl-ws-savedt"><Icon name="check" size="sm" /> Đã lưu vào kho</span>
              <div className="gl-ws-acts">
                <Button size="sm" variant="primary" icon="plus">Gắn vào bài</Button>
                <Button size="sm" variant="ghost" icon="users">Chia sẻ tổ</Button>
              </div>
            </div>
          ) : (
            <div className="gl-ws-pending">{p >= 10 ? "Đang lưu…" : " "}</div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Ô khối: trước khi chạy là khối dựng sẵn (viền đứt + nhãn), lúc chạy thì nội dung thật hiện lên. */
function Region({ area, i, blocks, live, spec, children }: { area: string; i: number; blocks: number; live: boolean; spec: Spec; children: ReactNode }) {
  const b = spec.blocks[i]!;
  const shown = blocks > i;
  return (
    <div className={["gl-reg", shown && "in", live && "live"].filter(Boolean).join(" ")} style={{ gridArea: area }}>
      <div className="gl-reg-block" aria-hidden={live}>
        <Icon name={b[0]} />
        <span>{b[1]}</span>
      </div>
      <div className="gl-reg-body">{children}</div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt, ends }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string; ends?: [string, string] }) {
  return (
    <label className="gl-slider">
      <span className="gl-slider-l">
        {label} <b className="num">{fmt(value)}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--v" as string]: `${((value - min) / (max - min)) * 100}%` }} />
      {ends && (
        <span className="gl-slider-e">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      )}
    </label>
  );
}

/** Giá trị do AI tự kéo khi chạy thử; người dùng chạm vào thì trả quyền điều khiển. */
function useDriven(init: number, auto: boolean, f: (t: number) => number): [number, (v: number) => void] {
  const [v, setV] = useState<number | null>(null);
  const [t] = useClock(auto);
  const frozen = useRef(init);
  if (auto && v === null) frozen.current = f(t);
  return [v ?? frozen.current, setV];
}

/* ---------- Con lắc đơn ---------- */
const G = 9.8;
function Pendulum({ blocks, live, auto, spec }: { blocks: number; live: boolean; auto: boolean; spec: Spec }) {
  const [l, setL] = useDriven(1, auto, (t) => 1.15 + 0.55 * Math.sin(t * 0.9 - 0.4));
  const T = 2 * Math.PI * Math.sqrt(l / G);
  const [t] = useClock(live);
  const th = 0.38 * Math.cos((2 * Math.PI * t) / T);
  const L = 44 + l * 86;
  const bx = 150 + L * Math.sin(th);
  const by = 22 + L * Math.cos(th);
  const gx = (x: number) => 28 + ((x - 0.2) / 1.8) * 176;
  const gy = (y: number) => 120 - ((y - 0.8) / 2.2) * 104;
  const curve = Array.from({ length: 37 }, (_, i) => {
    const x = 0.2 + (i * 1.8) / 36;
    return `${i ? "L" : "M"}${gx(x).toFixed(1)} ${gy(2 * Math.PI * Math.sqrt(x / G)).toFixed(1)}`;
  }).join(" ");
  return (
    <div className="gl-tool">
      <Region area="sim" i={0} blocks={blocks} live={live} spec={spec}>
        <svg viewBox="0 0 300 250" className="gl-sim">
          <path d="M110 22h80" className="gl-ink" />
          <path d={`M150 22 A${L} ${L} 0 0 0 ${150 + L * Math.sin(-0.38)} ${22 + L * Math.cos(0.38)}`} className="gl-arc" />
          <path d={`M150 22 A${L} ${L} 0 0 1 ${150 + L * Math.sin(0.38)} ${22 + L * Math.cos(0.38)}`} className="gl-arc" />
          <path d={`M150 22 L${bx} ${by}`} className="gl-string" />
          <circle cx={bx} cy={by} r="13" className="gl-bob" />
          <text x="160" y={22 + L / 2} className="gl-cap">l = {fmt1(l)} m</text>
        </svg>
      </Region>
      <Region area="graph" i={1} blocks={blocks} live={live} spec={spec}>
        <svg viewBox="0 0 220 140" className="gl-mini">
          <path d="M28 124V10M28 124h184" className="gl-axis" />
          <text x="30" y="10" className="gl-cap sm">T (s)</text>
          <text x="210" y="138" className="gl-cap sm" textAnchor="end">l (m)</text>
          <path d={curve} className="gl-curve thin" />
          <circle cx={gx(l)} cy={gy(T)} r="5" className="gl-pt" />
        </svg>
      </Region>
      <Region area="formula" i={2} blocks={blocks} live={live} spec={spec}>
        <div className="gl-formula">
          <span>T = 2π√(l / g)</span>
          <b className="num">T = {T.toFixed(2).replace(".", ",")} s</b>
        </div>
      </Region>
      <Region area="ctrl" i={3} blocks={blocks} live={live} spec={spec}>
        <Slider label="Chiều dài dây" value={l} min={0.2} max={2} step={0.01} onChange={setL} fmt={(v) => `${fmt1(v)} m`} ends={["0,2 m", "2,0 m"]} />
      </Region>
    </div>
  );
}

/* ---------- Cung – cầu giá lúa ---------- */
function Market({ blocks, live, auto, spec }: { blocks: number; live: boolean; auto: boolean; spec: Spec }) {
  const [s, setS] = useDriven(0, auto, (t) => 1.4 * Math.sin(t * 0.8));
  const [e, setE] = useDriven(0, auto, (t) => 1.2 + 1.2 * Math.sin(t * 0.55 + 1));
  const a = 12 + e, b = 0.8, c = 2 + s, d = 0.6;
  const Q = Math.max(0, (a - c) / (b + d));
  const P = a - b * Q;
  const x = (q: number) => 34 + q * 22;
  const y = (pp: number) => 216 - pp * 12.4;
  const price = useTween(P * 1000, 260);
  return (
    <div className="gl-tool">
      <Region area="sim" i={0} blocks={blocks} live={live} spec={spec}>
        <svg viewBox="0 0 320 240" className="gl-sim">
          <path d="M34 216V12M34 216h276" className="gl-axis" />
          <text x="38" y="14" className="gl-cap sm">Giá (nghìn đ/kg)</text>
          <text x="306" y="232" className="gl-cap sm" textAnchor="end">Sản lượng (triệu tấn)</text>
          <path d={`M${x(0)} ${y(a)} L${x(12)} ${y(a - b * 12)}`} className="gl-dem" />
          <path d={`M${x(0)} ${y(c)} L${x(12)} ${y(c + d * 12)}`} className="gl-sup" />
          <text x={x(12) - 2} y={y(a - b * 12) - 8} className="gl-cap sm" textAnchor="end">Cầu</text>
          <text x={x(12) - 2} y={y(c + d * 12) - 8} className="gl-cap sm" textAnchor="end">Cung</text>
          <path d={`M${x(Q)} ${y(P)}V216M${x(Q)} ${y(P)}H34`} className="gl-guide dash" />
          <circle cx={x(Q)} cy={y(P)} r="7" className="gl-pt" />
        </svg>
      </Region>
      <Region area="graph" i={1} blocks={blocks} live={live} spec={spec}>
        <div className="gl-readout">
          <span>Giá cân bằng</span>
          <b className="num">{Math.round(price / 50) * 50 > 0 ? (Math.round(price / 50) * 50).toLocaleString("vi-VN") : "0"}</b>
          <small>đ/kg · {fmt1(Q)} triệu tấn</small>
        </div>
      </Region>
      <Region area="formula" i={2} blocks={blocks} live={live} spec={spec}>
        <div className="gl-formula sm">
          <span>Cầu: P = {fmt1(a)} − 0,8Q</span>
          <span>Cung: P = {fmt1(c)} + 0,6Q</span>
        </div>
      </Region>
      <Region area="ctrl" i={3} blocks={blocks} live={live} spec={spec}>
        <div className="gl-ctrl2">
          <Slider label="Mùa vụ" value={s} min={-2} max={3} step={0.05} onChange={setS} fmt={(v) => (v > 0.3 ? "mất mùa" : v < -0.3 ? "được mùa" : "bình thường")} ends={["Được mùa", "Mất mùa"]} />
          <Slider label="Xuất khẩu" value={e} min={-2} max={4} step={0.05} onChange={setE} fmt={(v) => (v > 0.3 ? "tăng" : v < -0.3 ? "giảm" : "giữ")} ends={["Giảm", "Tăng"]} />
        </div>
      </Region>
    </div>
  );
}

/* ---------- Yêu cầu khác: đồ thị + thanh trượt ---------- */
function Generic({ blocks, live, auto, spec }: { blocks: number; live: boolean; auto: boolean; spec: Spec }) {
  const [A, setA] = useDriven(1, auto, (t) => 1.2 + 0.6 * Math.sin(t));
  const [B, setB] = useDriven(1, auto, (t) => 1.4 + 0.7 * Math.sin(t * 0.7));
  const [ph] = useClock(live);
  const pts = Array.from({ length: 121 }, (_, i) => {
    const xx = (i / 120) * 4 * Math.PI;
    return `${i ? "L" : "M"}${(20 + i * 2.33).toFixed(1)} ${(120 - A * 40 * Math.sin(B * xx - ph)).toFixed(1)}`;
  }).join(" ");
  return (
    <div className="gl-tool">
      <Region area="sim" i={0} blocks={blocks} live={live} spec={spec}>
        <svg viewBox="0 0 320 240" className="gl-sim">
          <path d="M20 120h290M20 20v200" className="gl-axis" />
          <path d={pts} className="gl-curve" />
        </svg>
      </Region>
      <Region area="graph" i={1} blocks={blocks} live={live} spec={spec}>
        <div className="gl-readout">
          <span>Chu kì</span>
          <b className="num">{fmt1((2 * Math.PI) / B)}</b>
          <small>biên độ {fmt1(A)}</small>
        </div>
      </Region>
      <Region area="formula" i={2} blocks={blocks} live={live} spec={spec}>
        <div className="gl-formula">
          <span>y = A · sin(B·x)</span>
        </div>
      </Region>
      <Region area="ctrl" i={3} blocks={blocks} live={live} spec={spec}>
        <div className="gl-ctrl2">
          <Slider label="A" value={A} min={0.2} max={2} step={0.01} onChange={setA} fmt={fmt1} />
          <Slider label="B" value={B} min={0.3} max={3} step={0.01} onChange={setB} fmt={fmt1} />
        </div>
      </Region>
    </div>
  );
}
