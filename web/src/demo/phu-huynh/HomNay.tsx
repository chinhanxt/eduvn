import { Fragment } from "react";
import { useNavigate } from "react-router";
import { Icon } from "../../ui/Icon";
import { Face } from "../kit/Face";
import { Loa } from "./bits";
import { LIGHTS, type ParentView } from "./data";
import type { useSpeak } from "./speak";

export type Speak = ReturnType<typeof useSpeak>;

/** Nút Nghe dùng chung (nút chính đặc kiểu iOS), có sóng âm khi đang đọc. */
export function NgheBtn({ id, text, sp, className }: { id: string; text: string; sp: Speak; className?: string }) {
  const on = sp.id === id;
  return (
    <button type="button" className={["ph-btn", "fill", on && "on", className].filter(Boolean).join(" ")} onClick={() => sp.toggle(id, text)} aria-pressed={on}>
      <Loa on={on} />
      <span>{on ? "Dừng" : "Nghe"}</span>
    </button>
  );
}

/** Vòng tiến độ nhỏ kiểu Activity rings. */
export function Ring({ value, total, light }: { value: number; total: number; light: string }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <span className={`ph-ring is-${light}`} role="img" aria-label={`Đã làm ${value} trên ${total} bài`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={R} className="trk" />
        <circle cx="32" cy="32" r={R} className="val" strokeDasharray={C} style={{ ["--off" as string]: `${C * (1 - value / total)}px`, ["--len" as string]: `${C}px` }} />
      </svg>
      <b>{value}/{total}</b>
      <small>bài</small>
    </span>
  );
}

/** Hôm nay: Large Title tên con, thẻ trạng thái, Nghe / Hỏi cô, hàng "Kèm con 10 phút". */
export function HomNay({ v, sp, onKem }: { v: ParentView; sp: Speak; onKem: () => void }) {
  const nav = useNavigate();
  const L = LIGHTS[v.light];
  return (
    <div className="ph-page">
      <div className="ph-title">
        <Face name={v.child.name} hue={v.child.avatarHue} size={44} />
        <h1>{v.child.short}</h1>
      </div>

      <section className="ph-card ph-status" aria-label={`Hôm nay: ${L.word}. ${v.reason}`}>
        <div className="txt">
          <p className="cap">Hôm nay</p>
          <p className={`word is-${v.light}`}>
            <i className="pip" aria-hidden="true" />
            {L.word}
          </p>
          <p className="why">
            {v.reason.split(" · ").map((r, k) => (
              <Fragment key={k}>
                {k > 0 && " · "}
                <span>{r}</span>
              </Fragment>
            ))}
          </p>
        </div>
        <Ring value={v.done[0]} total={v.done[1]} light={v.light} />
      </section>

      <div className="ph-pair">
        <NgheBtn id="today" text={v.read} sp={sp} />
        <button type="button" className="ph-btn tint" onClick={() => nav(`/phu-huynh/${v.slug}/hoi-co`)}>
          <Icon name="mic" />
          <span>Hỏi cô</span>
        </button>
      </div>

      <div className="ph-group">
        <p className="ph-sec">Tối nay</p>
        <div className="ph-card list">
          <button type="button" className="ph-cell" onClick={onKem}>
            <span className="ico" aria-hidden="true"><Icon name="timer" /></span>
            <span className="lbl">
              Kèm con 10 phút
              <small>{v.steps.length} bước, có đọc to</small>
            </span>
            <Icon name="chevr" className="chev" />
          </button>
        </div>
      </div>
    </div>
  );
}
