import { useEffect, useRef, useState } from "react";
import { Icon } from "../../ui/Icon";
import { Karaoke, Loa } from "./bits";
import type { ParentView } from "./data";
import type { Speak } from "./HomNay";

/** Kèm con 10 phút: mỗi màn một bước, chữ rất to, tự đọc; nút Tiếp lớn ở đáy; bước cuối là ✓ lớn. */
export default function KemNgay({ v, sp, onClose }: { v: ParentView; sp: Speak; onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = v.steps[i];
  const done = !step;
  const close = useRef(onClose);
  close.current = onClose;
  const box = useRef<HTMLDivElement>(null);
  const you = v.you[0]!.toUpperCase() + v.you.slice(1);
  const say = step ? `${step.text} ${step.tip ?? ""}` : `${you} đã làm rất tốt.`;
  const key = `kem-${i}`;

  useEffect(() => {
    box.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    const t = setTimeout(() => sp.speak(key, say), 450);
    return () => clearTimeout(t);
    // sp ổn định (useCallback): chỉ đọc lại khi sang bước mới
  }, [i]);

  const reading = sp.id === key;
  return (
    <div className="ph-run" role="dialog" aria-modal="true" aria-label="Kèm con 10 phút" ref={box} tabIndex={-1}>
      <div className="ph-run-col">
        <div className="ph-run-top">
          <span className="ph-run-n">{done ? "Xong" : `Bước ${i + 1} / ${v.steps.length}`}</span>
          <button type="button" className="ph-ghost" onClick={onClose}>
            <Icon name="x" />
            <span>Thoát</span>
          </button>
        </div>

        <div className="ph-run-body" key={i}>
          {done ? (
            <>
              <span className="ph-ok" aria-hidden="true">
                <svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-17" /></svg>
              </span>
              <p className="ph-run-t">{you} đã làm rất tốt</p>
              <p className="ph-run-tip">Cô Hà sẽ biết tối nay con được kèm.</p>
            </>
          ) : (
            <>
              <span className="ph-run-num" aria-hidden="true">{i + 1}</span>
              {reading ? <Karaoke text={step.text} at={sp.word} className="ph-run-t" /> : <p className="ph-run-t">{step.text}</p>}
              {step.tip && <p className="ph-run-tip">{step.tip}</p>}
              <button type="button" className="ph-ghost" onClick={() => sp.toggle(key, say)}>
                <Loa on={reading} />
                <span>{reading ? "Dừng" : "Nghe lại"}</span>
              </button>
            </>
          )}
        </div>

        <div className="ph-run-foot">
          <div className="ph-dots" aria-hidden="true">
            {v.steps.map((_, k) => (
              <i key={k} className={k < i ? "done" : k === i ? "now" : undefined} />
            ))}
          </div>
          {done ? (
            <button type="button" className="ph-big fill wide" onClick={onClose}>
              <Icon name="home" />
              <span>Về trang chính</span>
            </button>
          ) : (
            <button type="button" className="ph-big fill wide" onClick={() => (sp.stop(), setI((x) => x + 1))}>
              <span>Tiếp</span>
              <Icon name="arrowr" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
