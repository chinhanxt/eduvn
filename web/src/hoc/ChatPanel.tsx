import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { errText } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { Markdown } from "./Markdown";
import { type Citation, type Msg, fileToDataUrl, streamChat, tutorApi } from "./client";

// P13: chế độ "Lời giải đầy đủ" — lời giải từng bước có hình + tự kiểm (tải trình xem khi dùng lần đầu)
const FullSolution = lazy(() => import("../solution/FullSolution").then((m) => ({ default: m.FullSolution })));
type ChatMsg = Msg & { solve?: string };

export type ChatCtx = { kbId: string | null; bookPageId?: string };

/** Khung chat gia sư dùng chung cho trang Gia sư và khung hỏi trên trang giáo trình. */
export function ChatPanel({ ctx, sessionId, onSession, onTitle, compact, starters }: { ctx: ChatCtx; sessionId: string | null; onSession: (id: string) => void; onTitle?: (id: string, title: string) => void; compact?: boolean; starters?: string[] }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "hint" | "full">("chat");
  const [level, setLevel] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [pop, setPop] = useState<Citation | null>(null);
  const sid = useRef<string | null>(sessionId);
  const abort = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    sid.current = sessionId;
    setHint("");
    if (!sessionId) {
      setMsgs([]);
      return;
    }
    if (busy) return;
    tutorApi<{ messages: Msg[] }>(`/sessions/${sessionId}`).then((s) => setMsgs(s.messages)).catch((e: unknown) => setError(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const el = log.current;
    if (el && stick.current) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight }));
  }, [msgs]);

  const send = useCallback(
    async (text: string, opts: { hint?: boolean } = {}) => {
      const message = text.trim();
      if (!message || busy) return;
      if (mode === "full" && !opts.hint) {
        setInput("");
        setMsgs((m) => [...m, { role: "user", content: message, citations: [] }, { role: "assistant", content: "", citations: [], solve: message }]);
        return;
      }
      setError(null);
      setHint("");
      setBusy(true);
      stick.current = true;
      const imgs = images;
      setImages([]);
      setInput("");
      setMsgs((m) => [...m, { role: "user", content: imgs.length ? `${message}\n\n[đính kèm ${imgs.length} ảnh]` : message, citations: [] }, { role: "assistant", content: "", citations: [] }]);
      const ac = new AbortController();
      abort.current = ac;
      const patchLast = (f: (m: Msg) => Msg) => setMsgs((all) => all.map((m, i) => (i === all.length - 1 ? f(m) : m)));
      try {
        await streamChat(
          { sessionId: sid.current ?? undefined, kbId: ctx.kbId ?? undefined, message, mode: opts.hint ?? mode === "hint" ? "hint" : "chat", hintLevel: level, images: imgs, context: ctx.bookPageId ? { bookPageId: ctx.bookPageId } : {} },
          (e) => {
            if (e.type === "meta") {
              sid.current = e.sessionId;
              onSession(e.sessionId);
              patchLast((m) => ({ ...m, citations: e.citations }));
            } else if (e.type === "delta") patchLast((m) => ({ ...m, content: m.content + e.text }));
            else if (e.type === "done") patchLast((m) => ({ ...m, id: e.messageId, citations: e.citations }));
            else if (e.type === "title" && sid.current) onTitle?.(sid.current, e.title);
            else if (e.type === "error") setError(e.message);
          },
          ac.signal,
        );
        if (sid.current && !ac.signal.aborted) tutorApi<{ hint: string }>(`/sessions/${sid.current}/ask-hint`, { method: "POST" }).then((h) => setHint(h.hint)).catch(() => {});
      } catch (e) {
        if (!ac.signal.aborted) setError(errText(e));
      } finally {
        setBusy(false);
        setMsgs((all) => all.filter((m, i) => !(i === all.length - 1 && m.role === "assistant" && !m.content)));
      }
    },
    [busy, ctx, images, level, mode, onSession, onTitle],
  );

  const attach = async (files: FileList | null) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/") && f.size < 4_000_000).slice(0, 3 - images.length);
    setImages([...images, ...(await Promise.all(list.map(fileToDataUrl)))]);
  };

  const more = () => {
    const next = Math.min(3, level + 1);
    setLevel(next);
    void send("Em vẫn chưa ra, gợi ý thêm cho em một chút nhé.", { hint: true });
  };

  const cited = (m: Msg) => m.citations;
  return (
    <div className={compact ? "chat-main mini-chat" : "chat-main"} style={compact ? { borderRadius: 16 } : undefined}>
      <div className="chat-top">
        <div className="tabs" role="group" aria-label="Chế độ">
          <button className={mode === "chat" ? "on" : ""} onClick={() => setMode("chat")}>Hỏi đáp</button>
          <button className={mode === "hint" ? "on" : ""} onClick={() => { setMode("hint"); setLevel(1); }} data-testid="mode-hint">Gợi ý từng bước</button>
          <button className={mode === "full" ? "on" : ""} onClick={() => setMode("full")} data-testid="mode-full">Lời giải đầy đủ</button>
        </div>
        {mode === "hint" && <span className="tag amber">Mức gợi ý {level}/3 · thầy cô sẽ không giải hộ</span>}
        {mode === "full" && <span className="tag green">Lời giải từng bước có hình · đáp số được tự kiểm</span>}
      </div>
      <div className="chat-log" ref={log} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} data-testid="chat-log">
        {msgs.length === 0 && (
          <div className="starters">
            {(starters ?? []).map((s) => <button key={s} onClick={() => void send(s)}>{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => m.solve ? (
          <Suspense key={i} fallback={<div className="bub assistant typing" />}>
            <FullSolution problem={m.solve} />
          </Suspense>
        ) : (
          <div key={i} className={`bub ${m.role}${busy && i === msgs.length - 1 && m.role === "assistant" ? " typing" : ""}`} data-testid={`msg-${m.role}`}>
            {m.role === "user" ? <MathText value={m.content} /> : <Markdown text={m.content} cites={cited(m)} onCite={setPop} />}
            {m.role === "assistant" && m.citations.length > 0 && !busy && (
              <div className="srcs">
                Nguồn: {m.citations.map((c) => <button key={c.n} onClick={() => setPop(c)}>[{c.n}] {c.doc}, trang {c.page}</button>)}
              </div>
            )}
          </div>
        ))}
        {hint && !busy && <button className="ghost-hint" onClick={() => setInput(hint)}>{hint}</button>}
        {mode === "hint" && !busy && msgs.length > 0 && level < 3 && <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={more}>Gợi ý thêm</button>}
      </div>
      {error && <div className="err" style={{ margin: "0 16px" }}>{error}</div>}
      <form className="chat-in" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        {images.length > 0 && <div className="thumbs">{images.map((u, i) => <img key={i} src={u} alt="Ảnh đính kèm" onClick={() => setImages(images.filter((_, j) => j !== i))} />)}</div>}
        <div className="box">
          <label className="btn ghost sm" style={{ cursor: "pointer" }} title="Chụp/đính kèm ảnh bài tập"><Icon name="upload" size={18} /><input type="file" accept="image/*" multiple hidden onChange={(e) => void attach(e.target.files)} /></label>
          <textarea value={input} rows={1} placeholder={mode === "full" ? "Dán đề bài — gia sư trả lời giải từng bước có hình." : "Em muốn hỏi gì? Dùng $…$ để gõ công thức."} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} data-testid="chat-input" />
          {busy ? <button type="button" className="btn ghost" onClick={() => abort.current?.abort()}>Dừng</button> : <button className="btn" disabled={!input.trim()} data-testid="chat-send">Gửi</button>}
        </div>
      </form>
      {pop && (
        <div className="src-pop" role="dialog">
          <button className="xbtn" style={{ float: "right" }} onClick={() => setPop(null)} aria-label="Đóng"><Icon name="x" size={16} /></button>
          <h3>[{pop.n}] {pop.doc} · trang {pop.page}</h3>
          <div style={{ color: "var(--muted)" }}>{pop.snippet}</div>
        </div>
      )}
    </div>
  );
}
