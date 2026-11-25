import { Icon } from "../../ui/Icon";
import { Face, Karaoke, Loa } from "./bits";
import { LIGHTS, type ParentView } from "./data";
import type { useSpeak } from "./speak";

type Speak = ReturnType<typeof useSpeak>;

const today = () => {
  const d = new Date();
  const thu = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][d.getDay()];
  return `${thu}, ${d.getDate()}/${d.getMonth() + 1}`;
};

/** Phụ huynh — Con hôm nay: đèn xanh/vàng/đỏ, 4 điều chính, nút Nghe đọc to. */
export function ConHomNay({ v, sp }: { v: ParentView; sp: Speak }) {
  const reading = sp.id === "today";
  const greet = `${v.you} ${v.guardian.split(" ").pop()}`;
  return (
    <section className="ph-today" aria-labelledby="ph-h">
      <div className="ph-hi">
        <Face name={v.child.name} hue={v.child.avatarHue} />
        <div>
          <p className="ph-eyebrow">{today()} · Chào {greet}</p>
          <h1 id="ph-h" className="ph-title">{v.child.short} hôm nay</h1>
        </div>
      </div>

      <div className={`ph-light is-${v.light}`} role="img" aria-label={`Đèn ${LIGHTS.find((l) => l.id === v.light)!.label}`}>
        <div className="ph-lamps">
          {LIGHTS.map((l, i) => (
            <span key={l.id} className={l.id === v.light ? `lamp ${l.id} on` : `lamp ${l.id}`} style={{ ["--i" as string]: i }}>
              <Icon name={l.icon} />
              <small>{l.label}</small>
            </span>
          ))}
        </div>
        <p className="ph-head">{v.headline}</p>
      </div>

      <ul className="ph-facts">
        {v.facts.map((f, i) => (
          <li key={f.text} className={f.tone ? `t-${f.tone}` : undefined} style={{ ["--i" as string]: i }}>
            <Icon name={f.icon} />
            <span>{f.text}</span>
          </li>
        ))}
      </ul>

      <button type="button" className={reading ? "ph-listen on" : "ph-listen"} onClick={() => sp.toggle("today", v.read)} aria-pressed={reading}>
        <Loa on={reading} />
        <span>{reading ? "Dừng" : "Nghe"}</span>
        {reading && <i className="ph-eq" aria-hidden="true"><b /><b /><b /><b /></i>}
      </button>
      <div className={reading ? "ph-read open" : "ph-read"} aria-hidden={!reading}>
        <div>
          <Karaoke text={v.read} at={reading ? sp.word : -1} className="ph-read-p" />
        </div>
      </div>
    </section>
  );
}

/** Việc tối nay: 10 phút chia 3 bước, lời đời thường, mỗi bước nghe được. */
export function ToiNay({ v, sp, onStart }: { v: ParentView; sp: Speak; onStart?: () => void }) {
  const total = v.steps.reduce((a, s) => a + s.min, 0);
  return (
    <section className="ph-tonight" id="kem-con" aria-labelledby="ph-tn">
      <div className="ph-sec-h">
        <Icon name="moon" />
        <h2 id="ph-tn">Tối nay kèm con {total} phút</h2>
      </div>
      <div className="ph-bar" aria-hidden="true">
        {v.steps.map((s, i) => (
          <span key={i} style={{ flex: s.min, ["--i" as string]: i }}>
            <b>{s.min}′</b>
          </span>
        ))}
      </div>
      <ol className="ph-steps">
        {v.steps.map((s, i) => {
          const key = `step-${i}`;
          const on = sp.id === key;
          return (
            <li key={i} style={{ ["--i" as string]: i }}>
              <span className="n">{i + 1}</span>
              <div className="body">
                {on ? <Karaoke text={s.text} at={sp.word} className="t" /> : <p className="t">{s.text}</p>}
                {s.hint && <p className="h">{s.hint}</p>}
              </div>
              <button type="button" className={on ? "ph-mini on" : "ph-mini"} onClick={() => sp.toggle(key, `${s.text} ${s.hint ?? ""}`)} aria-label={on ? "Dừng đọc" : `Nghe bước ${i + 1}`}>
                <Loa on={on} />
              </button>
            </li>
          );
        })}
      </ol>
      <p className="ph-calm">{v.calm}</p>
      {onStart && (
        <button type="button" className="ph-start" onClick={onStart}>
          <Icon name="timer" />
          <span>Bắt đầu</span>
        </button>
      )}
    </section>
  );
}
