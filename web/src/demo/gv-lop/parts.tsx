/** Mảnh dùng chung của Gói B: đầu trang có nhãn mô phỏng, hẹn giờ theo pha, số đếm, giảm chuyển động. */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePageMeta } from "../../ui/shell/AppShell";
import { PageHead, type Primary } from "../../ui/shell/PageHead";
import { MockBadge } from "../kit";
import "./gv-lop.css";

export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Head({ title, tabs, primary, children }: { title: string; tabs?: ReactNode; primary?: Primary; children?: ReactNode }) {
  usePageMeta(title);
  return (
    <PageHead
      title={
        <span className="gl-h1">
          {title}
          <MockBadge />
        </span>
      }
      tabs={tabs}
      primary={primary}
    >
      {children}
    </PageHead>
  );
}

/** Chạy tuần tự các pha: trả chỉ số pha hiện tại (0 → durations.length). Đổi `key` để chạy lại. */
export function usePhases(durations: number[], run: boolean, key?: unknown) {
  const [i, setI] = useState(0);
  const sig = durations.join(",");
  useEffect(() => {
    setI(0);
    if (!run) return;
    if (reduced()) {
      setI(durations.length);
      return;
    }
    const ts: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    durations.forEach((ms, k) => {
      acc += ms;
      ts.push(setTimeout(() => setI(k + 1), acc));
    });
    return () => ts.forEach(clearTimeout);
  }, [sig, run, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return i;
}

/** Số đếm mượt từ giá trị đang hiện tới `target` trong `ms`. */
export function useTween(target: number, ms = 800): number {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (reduced()) {
      cur.current = target;
      setV(target);
      return;
    }
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const f = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      cur.current = from + (target - from) * (1 - Math.pow(1 - k, 3));
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** Đồng hồ rAF: số giây trôi khi `run` (cho mô phỏng chạy thật). */
export function useClock(run: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now() - t * 1000;
    const f = (now: number) => {
      setT((now - t0) / 1000);
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  return t;
}

/** Nhịp đều (ms) khi `run`: trả số nhịp đã qua. */
export function useTick(ms: number, run = true): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms, run]);
  return n;
}

export const vn1 = (n: number) => n.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const vn0 = (n: number) => Math.round(n).toLocaleString("vi-VN");

/** Số đếm lên từ 0 khi gắn kết (rồi bám theo target). */
export function useCountUp(target: number, ms = 900): number {
  const [t, setT] = useState(0);
  useEffect(() => setT(target), [target]);
  return useTween(t, ms);
}
