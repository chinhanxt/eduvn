import { type ReactNode, useEffect, useRef, useState } from "react";

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Số đếm lên từ `from` đến `to` (bỏ qua hiệu ứng khi người dùng tắt chuyển động). */
export function CountUp({ to, from = 0, delay = 0, ms = 900 }: { to: number; from?: number; delay?: number; ms?: number }) {
  const [v, setV] = useState(reducedMotion() ? to : from);
  useEffect(() => {
    if (reducedMotion()) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / ms));
      setV(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    setV(from);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, from, delay, ms]);
  return <span className="num">{v}</span>;
}

/** Ảnh đại diện chữ cái đầu, màu theo tên (dịu, đồng điệu bảng màu). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const w = name.trim().split(/\s+/);
  const ini = (w.length > 1 ? (w[0]?.[0] ?? "") + (w[w.length - 1]?.[0] ?? "") : name.slice(0, 2)).toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) % 360;
  return (
    <span className="av" style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(145deg, hsl(${h} 42% 52%), hsl(${(h + 30) % 360} 40% 34%))` }} aria-hidden="true">
      {ini}
    </span>
  );
}

/** Vòng tiến độ SVG; `value` 0–1. Chỉ đổi stroke-dashoffset (mượt, rẻ). */
export function Ring({ value, size, stroke, tone = "gold", children }: { value: number; size: number; stroke: number; tone?: "gold" | "amber" | "red" | "ice"; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring ${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle className="ring-fg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function Flame({ n }: { n: number }) {
  return (
    <span className="flame" title={`Chuỗi ${n} câu đúng`}>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2c.5 3.200-3 5-3 8.500 0 1.200.6 2.200 1.500 2.800-.1-1.600.6-3 1.500-4.300.9 1.300 2.500 2.500 2.500 4.800a3.500 3.500 0 0 1-7 0c0-.700.200-1.300.500-1.900C6.700 13 6 14.400 6 16a6 6 0 0 0 12 0c0-4.500-4-6-6-14Z" /></svg>
      {n}
    </span>
  );
}

/** Pháo giấy nhẹ (~60 hạt, ~2 s) trên canvas phủ màn hình. Tắt khi giảm chuyển động. */
export function confetti(canvas: HTMLCanvasElement, origin = 0.5): () => void {
  if (reducedMotion()) return () => undefined;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => undefined;
  const W = (canvas.width = canvas.clientWidth);
  const H = (canvas.height = canvas.clientHeight);
  const cols = ["#f1c65b", "#e8edff", "#6fa8ff", "#5fd1b8", "#e58fa9"];
  const ps = Array.from({ length: 70 }, () => ({ x: W * origin, y: H * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * cols.length)] as string }));
  let raf = 0;
  const t0 = performance.now();
  const step = (t: number) => {
    const k = (t - t0) / 2400;
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += 0.42;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (k < 1) raf = requestAnimationFrame(step);
    else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export function useOnce(fn: () => void | (() => void), key: unknown) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => ref.current(), [key]);
}
