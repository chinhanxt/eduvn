import { useNavigate } from "react-router";
import { Icon } from "../../ui/Icon";
import { Face, Loa } from "./bits";
import { LIGHTS, type ParentView } from "./data";
import type { useSpeak } from "./speak";

export type Speak = ReturnType<typeof useSpeak>;

/** Nút Nghe dùng chung: to, có sóng âm khi đang đọc. */
export function NgheBtn({ id, text, sp, className }: { id: string; text: string; sp: Speak; className?: string }) {
  const on = sp.id === id;
  return (
    <button type="button" className={["ph-big", "fill", on && "on", className].filter(Boolean).join(" ")} onClick={() => sp.toggle(id, text)} aria-pressed={on}>
      <Loa on={on} />
      <span>{on ? "Dừng" : "Nghe"}</span>
    </button>
  );
}

/** Hôm nay: một khối trạng thái thật lớn + Nghe / Hỏi cô + Kèm con 10 phút. */
export function HomNay({ v, sp, onKem }: { v: ParentView; sp: Speak; onKem: () => void }) {
  const nav = useNavigate();
  const L = LIGHTS[v.light];
  return (
    <div className="ph-today">
      <section className={`ph-state is-${v.light}`} aria-label={`${v.child.short}: ${L.word}. ${v.reason}`}>
        <div className="who">
          <Face name={v.child.name} hue={v.child.avatarHue} size={64} />
          <h1>{v.child.short}</h1>
        </div>
        <div className="verdict">
          <span className="disc" aria-hidden="true">
            <Icon name={L.icon} />
          </span>
          <b>{L.word}</b>
        </div>
        <p className="why">
          {v.reason.split(" · ").map((r, k) => (
            <span key={k}>
              {k > 0 && " · "}
              {r}
            </span>
          ))}
        </p>
      </section>

      <div className="ph-pair">
        <NgheBtn id="today" text={v.read} sp={sp} />
        <button type="button" className="ph-big soft" onClick={() => nav(`/phu-huynh/${v.slug}/hoi-co`)}>
          <Icon name="mic" />
          <span>Hỏi cô</span>
        </button>
      </div>

      <button type="button" className="ph-big line wide" onClick={onKem}>
        <Icon name="timer" />
        <span>Kèm con 10 phút</span>
      </button>
    </div>
  );
}
