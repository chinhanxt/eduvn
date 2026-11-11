import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "./Button";

export type StreamState = "streaming" | "done" | "stopped" | "error";
/**
 * Chữ AI đang viết: cập nhật DOM theo khung hình (requestAnimationFrame) thay vì render lại React mỗi mẩu,
 * con trỏ nháy khi đang viết, luôn có nút Dừng; dừng thì giữ phần đã viết.
 * `text` = toàn bộ chữ đã nhận (tăng dần). Giảm chuyển động → hiện ngay cả đoạn.
 */
export function StreamingText({ text, state, onStop, className, progress, render }: { text: string; state: StreamState; onStop?: () => void; className?: string; progress?: number | null; render?: (shown: string) => ReactNode }) {
  if (render) return <StreamingRich text={text} state={state} onStop={onStop} className={className} progress={progress} render={render} />;
  return <StreamingPlain text={text} state={state} onStop={onStop} className={className} progress={progress} />;
}

/** Tốc độ hiện chữ: ~90 ký tự/giây, đuổi kịp nhanh hơn khi tụt xa. */
const step = (dt: number, behind: number) => Math.max(1, Math.round((dt / 1000) * Math.max(90, behind * 4)));
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function Acts({ state, onStop }: { state: StreamState; onStop?: () => void }) {
  return (
    <div className="stream-acts">
      {state === "streaming" && onStop && (
        <Button size="sm" icon="stop" onClick={onStop}>
          Dừng
        </Button>
      )}
      {state === "stopped" && <span>Đã dừng — giữ phần đã viết.</span>}
      {state === "error" && <span style={{ color: "var(--danger)" }}>Bị ngắt giữa chừng — giữ phần đã viết.</span>}
    </div>
  );
}
function Bar({ progress }: { progress?: number | null }) {
  return <div className={progress == null ? "stream-bar" : "stream-bar det"} style={progress == null ? undefined : { ["--p" as string]: `${Math.round(progress * 100)}%` }} role="progressbar" aria-label="AI đang viết" />;
}

/** Bản có định dạng (markdown, công thức): render lại theo khung hình, mỗi khung tối đa một lần. */
function StreamingRich({ text, state, onStop, className, progress, render }: { text: string; state: StreamState; onStop?: () => void; className?: string; progress?: number | null; render: (shown: string) => ReactNode }) {
  const [n, setN] = useState(() => (state === "streaming" && !reduced() ? 0 : text.length));
  const target = useRef(text);
  target.current = text;
  useEffect(() => {
    if (state !== "streaming" || reduced()) {
      setN(target.current.length);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setN((cur) => (cur < target.current.length ? Math.min(target.current.length, cur + step(now - last, target.current.length - cur)) : cur));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);
  const shown = state === "streaming" ? text.slice(0, n) : text;
  return (
    <div className="stream-wrap" aria-busy={state === "streaming" || undefined}>
      {state === "streaming" && !text && <Bar progress={progress} />}
      <div className={[className, state === "streaming" && "caret-end"].filter(Boolean).join(" ")} aria-live="polite">
        {render(shown)}
      </div>
      <Acts state={state} onStop={onStop} />
    </div>
  );
}

function StreamingPlain({ text, state, onStop, className, progress }: { text: string; state: StreamState; onStop?: () => void; className?: string; progress?: number | null }) {
  const el = useRef<HTMLDivElement>(null);
  const shown = useRef(0);
  const target = useRef(text);
  target.current = text;
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (state !== "streaming" || reduced()) {
      shown.current = target.current.length;
      node.textContent = target.current;
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const want = target.current.length;
      if (shown.current < want) {
        const n = step(now - last, want - shown.current);
        shown.current = Math.min(want, shown.current + n);
        node.textContent = target.current.slice(0, shown.current);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);
  useEffect(() => {
    if (state !== "streaming" && el.current) el.current.textContent = text;
  }, [text, state]);
  return (
    <div className="stream-wrap" aria-busy={state === "streaming" || undefined}>
      {state === "streaming" && <Bar progress={progress} />}
      <div ref={el} className={[className ?? "read", state === "streaming" && "caret"].filter(Boolean).join(" ")} aria-live="polite" style={{ whiteSpace: "pre-wrap" }} />
      <Acts state={state} onStop={onStop} />
    </div>
  );
}
