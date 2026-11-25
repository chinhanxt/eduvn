import { useEffect, useRef, useState } from "react";
import type { StreamState } from "../../ui";

/** Giả lập AI đang viết: đẩy dần `full` theo nhịp (dùng với <StreamingText>). `run` = false thì chờ; đổi `key` để chạy lại. */
export function useFakeStream(full: string, opts: { run?: boolean; cps?: number; delayMs?: number; key?: unknown } = {}) {
  const { run = true, cps = 55, delayMs = 350, key } = opts;
  const [text, setText] = useState("");
  const [state, setState] = useState<StreamState>("streaming");
  const stopped = useRef(false);
  useEffect(() => {
    if (!run) return;
    stopped.current = false;
    setText(""); setState("streaming");
    let i = 0, t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (stopped.current) return;
      i = Math.min(full.length, i + Math.max(1, Math.round(cps / 20 + Math.random() * 2)));
      setText(full.slice(0, i));
      if (i >= full.length) setState("done"); else t = setTimeout(tick, 50);
    };
    t = setTimeout(tick, delayMs);
    return () => clearTimeout(t);
  }, [full, run, cps, delayMs, key]);
  return { text, state, stop: () => { stopped.current = true; setState("stopped"); } };
}

/** Giả lập tiến trình 0→1 trong `ms` (cho thanh tiến độ, các bước AI). */
export function useFakeProgress(ms: number, run = true, key?: unknown) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!run) return; setP(0);
    const t0 = performance.now(); let raf = 0;
    const f = (now: number) => { const v = Math.min(1, (now - t0) / ms); setP(1 - Math.pow(1 - v, 2)); if (v < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
  }, [ms, run, key]);
  return p;
}
