// web/src/math/MathKeyboard.tsx
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { HINTS, NUM, OPS, SETS, TAB_NAMES, type TabName } from "./keyboard";
import { mathStore } from "./mathStore";
import { texMarkup } from "./MathText";

/** Bàn phím toán VN, gắn một lần ở App; hiện khi có ô toán đang mở. */
export function MathKeyboard() {
  const active = useSyncExternalStore(mathStore.subscribe, mathStore.get);
  const [tab, setTab] = useState<TabName>(TAB_NAMES[0]);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--kb-h", active ? `${ref.current?.offsetHeight ?? 0}px` : "0px");
  }, [active, tab]);

  const insert = (ins: string) => active?.mf.executeCommand(["insert", ins, { focus: true, feedback: false, selectionMode: "placeholder" }]);
  const cmd = (c: "deleteBackward" | "moveToPreviousChar" | "moveToNextChar") => active?.mf.executeCommand(c);
  const key = (label: string, ins: string, cls = "") => (
    <button type="button" key={label + ins} className={`kb-key ${cls}`} onClick={() => insert(ins)} dangerouslySetInnerHTML={{ __html: texMarkup(label) }} />
  );

  return (
    <div ref={ref} className={active ? "kb on" : "kb"} onMouseDown={(e) => e.preventDefault()} data-testid="math-kb" aria-hidden={!active}>
      <div className="kb-head">
        <div className="kb-tabs">
          {TAB_NAMES.map((t) => (
            <button type="button" key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="kb-hints">
          Gõ nhanh
          {HINTS.map(([k, l]) => (
            <span key={k} className="kb-hint"><code>{k}</code><span dangerouslySetInnerHTML={{ __html: texMarkup(l) }} /></span>
          ))}
        </div>
      </div>
      <div className="kb-keys">
        <div className="kb-g kb-6">{SETS[tab].map(([l, i]) => key(l, i, l.length > 22 ? "small" : ""))}</div>
        <div className="kb-g kb-3">{NUM.map((n) => key(n === "," ? "{,}" : n, n === "," ? "{,}" : n, "num"))}</div>
        <div className="kb-g kb-1">{OPS.map(([l, i]) => key(l, i, "op"))}</div>
        <div className="kb-g kb-ctl">
          <button type="button" className="kb-key ctl kb-del" onClick={() => cmd("deleteBackward")} title="Xoá"><Icon name="del" /></button>
          <button type="button" className="kb-key ctl" onClick={() => cmd("moveToPreviousChar")} title="Sang trái"><Icon name="left" /></button>
          <button type="button" className="kb-key ctl" onClick={() => cmd("moveToNextChar")} title="Sang phải"><Icon name="right" /></button>
          <button type="button" className="kb-key kb-done" onClick={() => active?.exit()} data-testid="kb-done">Xong</button>
        </div>
      </div>
    </div>
  );
}
