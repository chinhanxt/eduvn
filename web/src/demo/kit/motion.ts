/** Nhịp chuyển động dùng chung cho mọi màn mô phỏng: pha, số đếm, đồng hồ, định dạng số. Mọi hook tôn trọng prefers-reduced-motion. */
import { useEffect, useRef, useState } from "react";

export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOut3 = (k: number) => 1 - Math.pow(1 - k, 3);

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

/** Đếm nguyên 0 → n đều đặn trong `ms` (hàng hiện dần, mục sáng dần). Đổi `key` để chạy lại. */
export function useCount(n: number, ms: number, run = true, key?: unknown) {
  const [c, setC] = useState(0);
  useEffect(() => {
    setC(0);
    if (!run || n <= 0) return;
    if (reduced()) {
      setC(n);
      return;
    }
    let k = 0;
    const t = setInterval(() => {
      k++;
      setC(k);
      if (k >= n) clearInterval(t);
    }, ms / n);
    return () => clearInterval(t);
  }, [n, ms, run, key]);
  return c;
}

/** Số thực trượt mượt từ giá trị đang hiện tới `target` trong `ms` (lần đầu hiện ngay `target`). */
export function useTween(target: number, ms = 800, run = true): number {
  return useGlide(target, target, ms, run, 0);
}

/** Số đếm lên từ 0 tới `target` (sau `delay` ms), rồi bám theo `target` khi nó đổi. */
export function useCountUp(target: number, ms = 900, run = true, delay = 0): number {
  return useGlide(target, reduced() ? target : 0, ms, run, delay);
}

function useGlide(target: number, init: number, ms: number, run: boolean, delay: number): number {
  const [v, setV] = useState(init);
  const cur = useRef(init);
  useEffect(() => {
    if (!run) return;
    if (reduced()) {
      cur.current = target;
      setV(target);
      return;
    }
    const from = cur.current;
    const t0 = performance.now() + delay;
    let raf = 0;
    const f = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / ms));
      cur.current = from + (target - from) * easeOut3(k);
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, run, delay]);
  return v;
}

/** Đồng hồ rAF: số giây trôi khi `run` (giữ nguyên khi tạm dừng), `rate` tua nhanh. Trả [giây, tua tới]. */
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
  return [
    t,
    (s: number) => {
      base.current = s;
      setT(s);
    },
  ];
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

/** Bước tuần tự 0..n−1 (mỗi bước `ms`), `loop` thì quay lại 0. Trả [bước, đặt bước]. */
export function useSteps(n: number, ms: number, run: boolean, loop = false): [number, (i: number) => void] {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!run) return;
    const t = setTimeout(() => setI((x) => (x + 1 < n ? x + 1 : loop ? 0 : x)), ms);
    return () => clearTimeout(t);
  }, [i, n, ms, run, loop]);
  return [i, setI];
}

/** Bật sau `ms` (chuỗi hoạt ảnh vào theo thứ tự). Đổi `key` để chạy lại. */
export function useAfter(ms: number, key?: unknown) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), reduced() ? 0 : ms);
    return () => clearTimeout(t);
  }, [ms, key]);
  return on;
}

/** Số kiểu Việt: 7,2 · 1.240. */
export const fmt1 = (n: number) => n.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmt0 = (n: number) => Math.round(n).toLocaleString("vi-VN");
