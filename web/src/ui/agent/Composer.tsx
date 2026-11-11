import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { Icon } from "../Icon";
import type { Attachment, Capability, SendInput } from "./types";

export const MAX_IMAGES = 3;
export const MAX_TEXT_CHARS = 60_000;
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|html?|tex|py|js|ts|tsx|jsx|java|c|cpp|h|cs|go|rs|sql|ya?ml|ini|log)$/i;
const IMAGE_MAX_EDGE = 1600;

/** Ảnh lớn → thu về cạnh 1600 px, JPEG 0,85 (giữ đủ nét để đọc đề, nhẹ cho cổng AI). */
async function imageToDataUrl(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => no(new Error("Không đọc được ảnh"));
      i.src = url;
    });
    const k = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Đọc tệp đính kèm: ảnh → data URL; tệp chữ/mã → chữ (cắt ở 60.000 ký tự). Loại khác → lỗi tiếng Việt. */
export async function readAttachment(f: File): Promise<Attachment> {
  if (f.type.startsWith("image/")) return { kind: "image", name: f.name || "ảnh", dataUrl: await imageToDataUrl(f) };
  if (f.type.startsWith("text/") || TEXT_EXT.test(f.name) || f.type === "application/json") {
    const text = await f.text();
    return { kind: "text", name: f.name, text: text.slice(0, MAX_TEXT_CHARS) };
  }
  throw new Error(`Chưa đọc được tệp “${f.name}” — đính ảnh hoặc tệp chữ (.txt, .md, .csv, mã nguồn…)`);
}

/**
 * Khung soạn của trợ lý: ô chữ tự giãn, Enter gửi (Shift+Enter xuống dòng), đính ảnh/tệp chữ (chọn, dán, kéo thả),
 * chọn năng lực, nút Gửi ↔ Dừng. Gửi khoá đến khi xong (chặn bấm lặp).
 */
export function Composer({
  onSend,
  onStop,
  busy,
  capabilities = [],
  capability,
  onCapability,
  placeholder = "Hỏi gia sư, hoặc gửi ảnh bài tập…",
  disabled,
  onError,
  autoFocus,
}: {
  onSend: (input: SendInput) => Promise<unknown> | void;
  onStop?: () => Promise<unknown> | void;
  busy?: boolean;
  capabilities?: Capability[];
  capability?: string;
  onCapability?: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [drag, setDrag] = useState(false);
  const [menu, setMenu] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cap = capabilities.find((c) => c.id === capability) ?? capabilities[0];

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => (document.removeEventListener("mousedown", close), document.removeEventListener("keydown", esc));
  }, [menu]);

  const add = async (list: FileList | File[]) => {
    for (const f of Array.from(list)) {
      try {
        const a = await readAttachment(f);
        setFiles((cur) => {
          if (a.kind === "image" && cur.filter((x) => x.kind === "image").length >= MAX_IMAGES) {
            onError?.(`Tối đa ${MAX_IMAGES} ảnh mỗi câu hỏi`);
            return cur;
          }
          return cur.length >= 6 ? cur : [...cur, a];
        });
      } catch (e) {
        onError?.((e as Error).message);
      }
    }
  };

  const canSend = !!text.trim() && !sending && !busy && !disabled;
  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend({ message: text.trim(), capability: cap?.id ?? "chat", attachments: files });
      setText("");
      setFiles([]);
    } catch (e) {
      onError?.((e as Error).message || "Chưa gửi được, em thử lại nhé");
    } finally {
      setSending(false);
      ta.current?.focus();
    }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length) {
      e.preventDefault();
      void add(imgs);
    }
  };

  return (
    <div
      className={`ag-composer${drag ? " is-drag" : ""}`}
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void add(e.dataTransfer.files);
      }}
    >
      {!!files.length && (
        <ul className="ag-files" aria-label="Tệp đính kèm">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="ag-file">
              {f.kind === "image" ? <img src={f.dataUrl} alt="" /> : <Icon name="clip" size="sm" />}
              <span className="ag-file-name">{f.name}</span>
              <button type="button" className="ag-file-x" aria-label={`Bỏ ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>
                <Icon name="x" size="sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        ref={ta}
        rows={1}
        value={text}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Câu hỏi cho gia sư"
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onPaste={onPaste}
      />
      <div className="ag-composer-row">
        <IconButton icon="clip" label="Đính ảnh hoặc tệp" size="sm" variant="ghost" onClick={() => fileIn.current?.click()} disabled={disabled} />
        <input ref={fileIn} type="file" hidden multiple accept="image/*,.txt,.md,.csv,.json,.tex,.py,.js,.ts,.html,.xml" onChange={(e) => (e.target.files && void add(e.target.files), (e.target.value = ""))} />
        {cap && (
          <div className="ag-cap" ref={menuRef}>
            <button type="button" className="chip" aria-haspopup="menu" aria-expanded={menu} disabled={capabilities.length < 2} onClick={() => setMenu((m) => !m)}>
              <Icon name={cap.icon} size="sm" />
              {cap.title}
              {capabilities.length > 1 && <Icon name="down" size="sm" />}
            </button>
            {menu && (
              <div className="ag-cap-menu" role="menu" aria-label="Chọn năng lực">
                {capabilities.map((c) => (
                  <button key={c.id} type="button" role="menuitemradio" aria-checked={c.id === cap.id} onClick={() => (onCapability?.(c.id), setMenu(false), ta.current?.focus())}>
                    <Icon name={c.icon} size="sm" />
                    <span>
                      <b>{c.title}</b>
                      <small>{c.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <span className="grow" />
        <span className="ag-kbd caption">Enter gửi · Shift+Enter xuống dòng</span>
        {busy && onStop ? (
          <Button size="sm" icon="stop" onClick={onStop}>
            Dừng
          </Button>
        ) : (
          <Button size="sm" variant="primary" icon="send" busy={sending} disabled={!canSend} onClick={send} aria-label="Gửi">
            Gửi
          </Button>
        )}
      </div>
      {drag && <div className="ag-drop">Thả ảnh hoặc tệp vào đây</div>}
    </div>
  );
}
