import { useEffect, useRef } from "react";

/**
 * Tooltip chung cho biểu đồ: phần tử có data-tip="giá trị|nhãn" (rê chuột hoặc tiêu điểm bàn phím).
 * Gắn một lần ở gốc cổng: <ChartTooltip />.
 */
export function ChartTooltip() {
  const tip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tip.current;
    if (!el) return;
    const b = el.querySelector("b")!;
    const s = el.querySelector("span")!;
    const show = (t: Element) => {
      const [v, l] = (t.getAttribute("data-tip") ?? "").split("|");
      b.textContent = v ?? "";
      s.textContent = l ?? "";
      const r = t.getBoundingClientRect();
      el.style.left = `${r.left + r.width / 2}px`;
      el.style.top = `${r.top}px`;
      el.classList.add("on");
    };
    const hide = () => el.classList.remove("on");
    const move = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-tip]");
      if (t) show(t);
      else hide();
    };
    const focus = (e: FocusEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-tip]");
      if (t) show(t);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("scroll", hide, { capture: true });
    };
  }, []);
  return (
    <div className="tip" ref={tip} role="tooltip" aria-hidden="true">
      <b />
      <span />
    </div>
  );
}
