import { Icon } from "../../ui/Icon";
import { LIGHTS, type Light, type ParentView } from "./data";
import { NgheBtn, type Speak } from "./HomNay";

/** Tuần này: 7 vòng tròn ngày tô màu + một câu tổng kết. */
export default function Tuan({ v, sp }: { v: ParentView; sp: Speak }) {
  const used = (["xanh", "vang", "do"] as Light[]).filter((l) => v.week.some((d) => d.light === l));
  return (
    <div className="ph-page">
      <h1 className="ph-h1">Tuần này</h1>
      <ol className="ph-week" aria-label={v.week.map((d) => `${d.d}: ${LIGHTS[d.light].word}`).join(", ")}>
        {v.week.map((d, i) => (
          <li key={d.d} className={`is-${d.light}`} style={{ ["--i" as string]: i }}>
            <span className="dot" aria-hidden="true">
              <Icon name={LIGHTS[d.light].icon} />
            </span>
            <b>{d.d}</b>
          </li>
        ))}
      </ol>
      <ul className="ph-key">
        {used.map((l) => (
          <li key={l} className={`is-${l}`}>
            <span className="dot" aria-hidden="true"><Icon name={LIGHTS[l].icon} /></span>
            {LIGHTS[l].word}
          </li>
        ))}
      </ul>
      <p className="ph-say">{v.weekSay}</p>
      <NgheBtn id="week" text={`Tuần này của ${v.child.short}. ${v.weekSay}`} sp={sp} className="wide" />
    </div>
  );
}
