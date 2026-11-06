// web/src/math/MathEditor.tsx
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";
import { VN_SHORTCUTS } from "./keyboard";
import { mathStore } from "./mathStore";
import { escapeText, splitMath } from "./segments";
import { VoiceButton } from "./VoiceButton";

const ZW = "​";

/** Một <math-field> đã cấu hình: gõ tắt VN, báo cho bàn phím dùng chung khi được mở. */
export function makeMathField(latex: string, onInput: () => void, onExit: (forward: boolean) => void): MathfieldElement {
  const mf = new MathfieldElement();
  mf.mathVirtualKeyboardPolicy = "manual";
  mf.smartFence = true;
  mf.value = latex;
  mf.addEventListener("mount", () => {
    mf.inlineShortcuts = { ...mf.inlineShortcuts, ...VN_SHORTCUTS };
  }, { once: true });
  mf.addEventListener("input", onInput);
  mf.addEventListener("focus", () => mathStore.set({ mf, exit: () => onExit(true) }));
  mf.addEventListener("blur", () =>
    setTimeout(() => {
      if (document.activeElement?.tagName !== "MATH-FIELD" && mathStore.get()?.mf === mf) mathStore.set(null);
    }, 120),
  );
  mf.addEventListener("move-out", (e) => {
    e.preventDefault();
    onExit((e as CustomEvent<{ direction: string }>).detail.direction !== "backward");
  });
  return mf;
}

function serialize(root: HTMLElement): string {
  let out = "";
  const nodes = [...root.childNodes];
  const isFormula = (n: Node | undefined) => n instanceof HTMLElement && n.classList.contains("me-wrap") && !!(n.firstChild as MathfieldElement).value.trim();
  const text = (raw: string, next: Node | undefined) => {
    let e = escapeText(raw);
    // chữ kết thúc bằng \ rồi tới công thức: thêm một \ để $ mở công thức không bị hiểu là \$
    if (isFormula(next) && /(?:^|[^\\])(?:\\\\)*\\$/.test(e)) e += "\\";
    return e;
  };
  nodes.forEach((n, i) => {
    if (n.nodeType === Node.TEXT_NODE) out += text((n.nodeValue ?? "").replaceAll(ZW, ""), nodes[i + 1]);
    else if (n instanceof HTMLElement && n.classList.contains("me-wrap")) {
      const v = (n.firstChild as MathfieldElement).value.trim();
      if (v) out += `$${v}$`;
    } else out += text(n.textContent ?? "", nodes[i + 1]);
  });
  return out.replace(/ /g, " ");
}

type EditorProps = { value: string; onChange: (v: string) => void; placeholder?: string; testId?: string };

/** Ô chữ + công thức chen giữa. Không điều khiển: muốn nạp giá trị mới thì đổi `key`. */
export function MathEditor({ value, onChange, placeholder, testId }: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const emit = () => {
    if (ref.current) changeRef.current(serialize(ref.current));
  };

  function placeCaretAfter(wrap: HTMLElement) {
    const r = document.createRange();
    const n = wrap.nextSibling;
    if (n && n.nodeType === Node.TEXT_NODE) r.setStart(n, (n.nodeValue ?? "").length);
    else r.setStartAfter(wrap);
    r.collapse(true);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }

  function exitMath(wrap: HTMLElement, forward: boolean) {
    const root = ref.current;
    if (!root) return;
    const mf = wrap.firstChild as MathfieldElement;
    if (!mf.value.trim()) {
      const n = wrap.nextSibling;
      wrap.remove();
      if (n?.nodeValue === ZW) n.remove();
      emit();
      root.focus();
      mathStore.set(null);
      return;
    }
    root.focus();
    if (forward) placeCaretAfter(wrap);
    else {
      const r = document.createRange();
      r.setStartBefore(wrap);
      r.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(r);
    }
    mathStore.set(null);
  }

  function makeWrap(latex: string): HTMLSpanElement {
    const wrap = document.createElement("span");
    wrap.className = "me-wrap";
    wrap.contentEditable = "false";
    wrap.append(makeMathField(latex, emit, (fwd) => exitMath(wrap, fwd)));
    return wrap;
  }

  function insertMath(latex = "", focus = true) {
    const root = ref.current;
    if (!root) return;
    const sel = getSelection();
    let r: Range;
    const anchor = sel?.anchorNode ?? null;
    const anchorEl = anchor instanceof Element ? anchor : anchor?.parentElement;
    if (sel && sel.rangeCount && anchor && root.contains(anchor) && !anchorEl?.closest(".me-wrap")) r = sel.getRangeAt(0);
    else {
      r = document.createRange();
      r.selectNodeContents(root);
      r.collapse(false);
    }
    const wrap = makeWrap(latex);
    r.deleteContents();
    r.insertNode(wrap);
    wrap.after(document.createTextNode(ZW));
    if (focus) setTimeout(() => (wrap.firstChild as MathfieldElement).focus(), 30);
    else placeCaretAfter(wrap);
    emit();
  }

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.replaceChildren();
    for (const seg of splitMath(value)) {
      if (seg.kind === "text") root.append(seg.value);
      else root.append(makeWrap(seg.value), ZW);
    }
    // giá trị ban đầu chỉ nạp một lần (component không điều khiển)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") e.preventDefault();
    if (e.key === "$" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m")) {
      e.preventDefault();
      insertMath();
    }
  };
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " ");
    for (const s of splitMath(text)) {
      if (s.kind === "text") document.execCommand("insertText", false, s.value);
      else insertMath(s.value, false);
    }
    emit();
  };

  return (
    <div className="me-box">
      <div ref={ref} className="me-rich" contentEditable suppressContentEditableWarning data-ph={placeholder} data-testid={testId} onInput={emit} onKeyDown={onKeyDown} onPaste={onPaste} />
      <div className="me-tools">
        <button type="button" className="me-fx" title="Chèn công thức (gõ $ hoặc Ctrl+M)" onMouseDown={(e) => e.preventDefault()} onClick={() => insertMath()}>
          <i>ƒx</i>
        </button>
        <VoiceButton onLatex={(l) => insertMath(l, false)} />
      </div>
    </div>
  );
}

type FieldProps = { value: string; onChange: (v: string) => void; onEnter?: () => void; testId?: string; autoFocus?: boolean };

/** Ô chỉ một công thức (giá trị = LaTeX). Không điều khiển. */
export function MathField({ value, onChange, onEnter, testId, autoFocus }: FieldProps) {
  const host = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const enterRef = useRef(onEnter);
  enterRef.current = onEnter;
  useEffect(() => {
    const mf = makeMathField(value, () => changeRef.current(mf.value), () => mf.blur());
    if (testId) mf.dataset.testid = testId;
    mf.addEventListener("keydown", (e) => {
      if ((e as globalThis.KeyboardEvent).key === "Enter") {
        e.preventDefault();
        enterRef.current?.();
      }
    });
    host.current?.replaceChildren(mf);
    if (autoFocus) setTimeout(() => mf.focus(), 30);
    return () => {
      if (mathStore.get()?.mf === mf) mathStore.set(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="me-field" ref={host} />;
}
