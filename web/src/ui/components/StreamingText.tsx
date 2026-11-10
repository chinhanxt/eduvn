import { useEffect, useRef } from "react";
import { Button } from "./Button";

export type StreamState = "streaming" | "done" | "stopped" | "error";
/**
 * Chữ AI đang viết: cập nhật DOM theo khung hình (requestAnimationFrame) thay vì render lại React mỗi mẩu,
 * con trỏ nháy khi đang viết, luôn có nút Dừng; dừng thì giữ phần đã viết.
 * `text` = toàn bộ chữ đã nhận (tăng dần). Giảm chuyển động → hiện ngay cả đoạn.
 */
export function StreamingText({ text, state, onStop, className, progress }: { text: string; state: StreamState; onStop?: () => void; className?: string; progress?: number | null }) {
  const el = useRef<HTMLDivElement>(null);
  const shown = useRef(0);
  const target = useRef(text);
  target.current = text;
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (state !== "streaming" || reduce) {
      shown.current = target.current.length;
      node.textContent = target.current;
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const want = target.current.length;
      if (shown.current < want) {
        // ~90 ký tự/giây, đuổi kịp nhanh hơn khi tụt xa
        const n = Math.max(1, Math.round(((now - last) / 1000) * Math.max(90, (want - shown.current) * 4)));
        shown.current = Math.min(want, shown.current + n);
        node.textContent = target.current.slice(0, shown.current);
      }
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [state]);
  useEffect(() => {
    if (state !== "streaming" && el.current) el.current.textContent = text;
  }, [text, state]);
  return (
    <div className="stream-wrap" aria-busy={state === "streaming" || undefined}>
      {state === "streaming" && <div className={progress == null ? "stream-bar" : "stream-bar det"} style={progress == null ? undefined : { ["--p" as string]: `${Math.round(progress * 100)}%` }} role="progressbar" aria-label="AI đang viết" />}
      <div ref={el} className={[className ?? "read", state === "streaming" && "caret"].filter(Boolean).join(" ")} aria-live="polite" style={{ whiteSpace: "pre-wrap" }} />
      <div className="stream-acts">
        {state === "streaming" && onStop && (
          <Button size="sm" icon="stop" onClick={onStop}>
            Dừng
          </Button>
        )}
        {state === "stopped" && <span>Đã dừng — giữ phần đã viết.</span>}
        {state === "error" && <span style={{ color: "var(--danger)" }}>Bị ngắt giữa chừng — giữ phần đã viết.</span>}
      </div>
    </div>
  );
}
