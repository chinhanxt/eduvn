// web/src/math/VoiceButton.tsx
import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { texMarkup } from "./MathText";
import { viToLatex } from "./viToLatex";

type Rec = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
type RecCtor = new () => Rec;

/** Đọc công thức bằng giọng nói (Chrome/Edge) hoặc gõ câu đọc → công thức. */
export function VoiceButton({ onLatex }: { onLatex: (latex: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const rec = useRef<Rec | null>(null);
  const latex = text.trim() ? viToLatex(text) : "";

  const start = () => {
    setOpen(true);
    setText("");
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "vi-VN";
    r.interimResults = true;
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };
  const close = () => {
    rec.current?.stop();
    setOpen(false);
  };
  const insert = () => {
    if (latex) onLatex(latex);
    close();
  };

  return (
    <span className="me-voice-wrap">
      <button type="button" className="me-mic" title="Đọc công thức" onMouseDown={(e) => e.preventDefault()} onClick={() => (open ? close() : start())}>
        <Icon name="mic" size={16} />
      </button>
      {open && (
        <div className={listening ? "me-voice listen" : "me-voice"} data-testid="voice">
          <div className="me-voice-hd">
            <span className="me-voice-dot"><Icon name="mic" size={16} /></span>
            {listening ? "Đang nghe…" : "Đọc hoặc gõ câu đọc"}
          </div>
          <input autoFocus value={text} placeholder="vd: x bình phương trừ ba" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => (e.key === "Enter" ? insert() : e.key === "Escape" ? close() : undefined)} />
          <div className="me-voice-out">
            <span className="me-tex" dangerouslySetInnerHTML={{ __html: latex ? texMarkup(latex) : "" }} />
            <button type="button" disabled={!latex} onClick={insert}>Chèn</button>
          </div>
        </div>
      )}
    </span>
  );
}
