import { Icon } from "../../ui/Icon";
import { LIGHTS, type Light, type ParentView } from "./data";
import { NgheBtn, type Speak } from "./HomNay";

/** Tuần này: 7 chấm ngày trong một nhóm thẻ + một câu tổng kết. */
export default function Tuan({ v, sp }: { v: ParentView; sp: Speak }) {
  const used = (["xanh", "vang", "do"] as Light[]).filter((l) => v.week.some((d) => d.light === l));
  return (
    <div className="ph-page">
      <div className="ph-title">
        <h1>Tuần này</h1>
      </div>
      <section className="ph-card ph-week-card">
        <ol className="ph-week" aria-label={v.week.map((d) => `${d.d}: ${LIGHTS[d.light].word}`).join(", ")}>
          {v.week.map((d, i) => (
            <li key={d.d} className={`is-${d.light}`} style={{ ["--i" as string]: i }}>
              <span className="pip" aria-hidden="true">
                <Icon name={LIGHTS[d.light].icon} />
              </span>
              <b>{d.d}</b>
            </li>
          ))}
        </ol>
        <hr />
        <p className="ph-say">{v.weekSay}</p>
      </section>
      <ul className="ph-key">
        {used.map((l) => (
          <li key={l} className={`is-${l}`}>
            <i className="pip" aria-hidden="true" />
            {LIGHTS[l].word}
          </li>
        ))}
      </ul>
      <NgheBtn id="week" text={`Tuần này của ${v.child.short}. ${v.weekSay}`} sp={sp} className="wide" />
    </div>
  );
}
