import { type ReactNode, useEffect, useRef, useState } from "react";
import { MockBadge } from "../kit";
import { usePageMeta } from "../../ui/shell/AppShell";
import "./hoc-demo.css";

export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Đầu màn mô phỏng: tiêu đề serif lớn + nhãn Bản mô phỏng; bên phải là điều khiển/nút chính. */
export function DemoHead({ title, eyebrow, lead, children }: { title: string; eyebrow?: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  usePageMeta(title);
  return (
    <header className="dm-head">
      <div className="dm-head-t">
        {lead}
        <div>
          <div className="dm-eyebrow">
            {eyebrow}
            <MockBadge />
          </div>
          <h1 className="dm-title">{title}</h1>
        </div>
      </div>
      {children && <div className="dm-head-acts">{children}</div>}
    </header>
  );
}

/** Số đếm lên (0 → target) trong `ms`, chạy lại khi target đổi (từ giá trị đang hiện). */
export function useCount(target: number, ms = 900, run = true): number {
  const [v, setV] = useState(reduced() ? target : 0);
  const cur = useRef(v);
  useEffect(() => {
    if (!run) return;
    if (reduced()) {
      setV(target);
      cur.current = target;
      return;
    }
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const f = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      cur.current = from + (target - from) * e;
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, run]);
  return v;
}

/** Bước tuần tự 0..n (mỗi bước `ms`), `loop` thì quay lại 0. Trả [bước, đặt bước]. */
export function useSteps(n: number, ms: number, run: boolean, loop = false): [number, (i: number) => void] {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!run) return;
    const t = setTimeout(() => setI((x) => (x + 1 < n ? x + 1 : loop ? 0 : x)), ms);
    return () => clearTimeout(t);
  }, [i, n, ms, run, loop]);
  return [i, setI];
}

/** Đồng hồ rAF: số giây trôi khi `run`. */
export function useClock(run: boolean, rate = 1): [number, (s: number) => void] {
  const [t, setT] = useState(0);
  const base = useRef(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let last = performance.now();
    const f = (now: number) => {
      base.current += (Math.max(0, now - last) / 1000) * rate;
      last = now;
      setT(base.current);
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [run, rate]);
  return [t, (s: number) => { base.current = s; setT(s); }];
}

/** Ảnh đại diện tròn có màu riêng theo người (hue). */
export function Face({ name, hue, size = 40, ring }: { name: string; hue: number; size?: number; ring?: boolean }) {
  const ini = name.split(/\s+/).slice(-2).map((w) => w[0]).join("").toLocaleUpperCase("vi");
  return (
    <span className={ring ? "dm-face ring" : "dm-face"} style={{ width: size, height: size, fontSize: size * 0.38, ["--h" as string]: hue }} aria-hidden="true">
      {ini}
    </span>
  );
}

/** Thanh mức tin cậy mảnh. */
export function Conf({ v, label = true }: { v: number; label?: boolean }) {
  return (
    <span className="dm-conf" title={`Tin cậy ${Math.round(v * 100)}%`}>
      <span className="tr"><i style={{ width: `${v * 100}%` }} /></span>
      {label && <b className="num">{Math.round(v * 100)}%</b>}
    </span>
  );
}

export const fmt1 = (n: number) => n.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
