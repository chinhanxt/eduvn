// web/src/solution/StepTutor.tsx — "Chưa hiểu bước này": ngăn bên (điện thoại: tấm dưới) mở gia sư P6 ở chế độ gợi ý từng bước.
// Lượt đầu tự gửi ngữ cảnh (đề + các bước trước + bước đang vướng); chữ stream gom theo khung hình; Gợi ý thêm (mức 1→3), hỏi tiếp, Dừng.
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { errText } from "../api";
import { type HintAsk, staffHint } from "./api";
import { Rich } from "./Rich";

type Turn = { role: "user" | "assistant"; text: string; label?: string };

export function StepTutor({ message, title, onClose, ask = staffHint }: { message: string; title: string; onClose: () => void; ask?: HintAsk }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(1);
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const session = useRef<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);

  const send = useCallback(
    async (text: string, hintLevel: number, label?: string) => {
      if (busy) return;
      setErr(null);
      setBusy(true);
      setTurns((t) => [...t, { role: "user", text, label }, { role: "assistant", text: "" }]);
      const ac = new AbortController();
      abort.current = ac;
      // gom chữ theo khung hình: không re-render từng mẩu
      let pending = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        const add = pending;
        pending = "";
        if (add) setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, text: x.text + add } : x)));
      };
      try {
        await ask(
          { sessionId: session.current, message: text, hintLevel },
          (e) => {
            if (e.type === "meta") session.current = e.sessionId;
            else if (e.type === "delta") {
              pending += e.text;
              raf ||= requestAnimationFrame(flush);
            } else if (e.type === "error") setErr(e.message);
          },
          ac.signal,
        );
      } catch (e) {
        if (!ac.signal.aborted) setErr(errText(e));
      } finally {
        if (raf) cancelAnimationFrame(raf);
        flush();
        setBusy(false);
        setTurns((t) => t.filter((x, i) => !(i === t.length - 1 && x.role === "assistant" && !x.text && !pending)));
      }
    },
    [ask, busy],
  );

  // lượt đầu gửi sau một nhịp: StrictMode gắn/gỡ/gắn lại không gửi hai lần
  const first = useRef({ message, title, send });
  useEffect(() => {
    const t = setTimeout(() => void first.current.send(first.current.message, 1, first.current.title), 0);
    return () => {
      clearTimeout(t);
      abort.current?.abort();
    };
  }, []);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const more = () => {
    const next = Math.min(3, level + 1);
    setLevel(next);
    void send("Em vẫn chưa hiểu, thầy/cô gợi ý thêm một chút nữa nhé.", next, `Gợi ý thêm (mức ${next}/3)`);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    void send(t, level);
  };

  return (
    <div className="sol-sheet-wrap" onClick={onClose}>
      <div className="sol-sheet" role="dialog" aria-modal="true" aria-label="Gia sư gợi ý bước này" tabIndex={-1} ref={panel} onClick={(e) => e.stopPropagation()}>
        <header className="sol-sheet-head">
          <div>
            <div className="sol-eyebrow">Gia sư · gợi ý từng bước</div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="sol-icon-btn" onClick={onClose} aria-label="Đóng">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <p className="sol-sheet-note">Gia sư không giải hộ — chỉ gợi ý để em tự hiểu vì sao làm như vậy. Mức gợi ý {level}/3.</p>
        <div className="sol-sheet-log" ref={log} aria-live="polite" aria-busy={busy}>
          {turns.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="sol-turn-user">{t.label ?? t.text}</div>
            ) : (
              <div key={i} className={`sol-turn-ai${busy && i === turns.length - 1 ? " sol-typing" : ""}`}>
                {t.text ? <Rich text={t.text} /> : <span className="sol-skel-lines" aria-label="Gia sư đang viết"><i /><i /><i /></span>}
              </div>
            ),
          )}
          {err && <p className="sol-err" role="alert">{err}</p>}
        </div>
        <form className="sol-sheet-in" onSubmit={submit}>
          <textarea value={input} rows={2} placeholder="Em nghĩ… / Em vẫn chưa rõ chỗ…" aria-label="Trả lời gia sư" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }} />
          <div className="sol-sheet-acts">
            {busy ? (
              <button type="button" className="sol-btn" onClick={() => abort.current?.abort()}>Dừng</button>
            ) : (
              <>
                {level < 3 && turns.length > 0 && <button type="button" className="sol-btn" onClick={more}>Gợi ý thêm</button>}
                <button className="sol-btn primary" disabled={!input.trim()}>Gửi</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
