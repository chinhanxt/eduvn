import { useEffect, useState } from "react";

/** Đếm số lên (ease-out) khi `run`. */
export function useCount(to: number, run = true, ms = 1000, delay = 0) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const f = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - t0) / ms));
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, run, ms, delay]);
  return n;
}

/** Bật sau `ms` (cho chuỗi hoạt ảnh vào theo thứ tự). */
export function useAfter(ms: number, key?: unknown) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [ms, key]);
  return on;
}
