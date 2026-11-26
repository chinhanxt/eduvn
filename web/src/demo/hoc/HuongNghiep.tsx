import { useState } from "react";
import { Link } from "react-router";
import { useFakeProgress, fmt1, useCountUp } from "../kit";
import { Button } from "../../ui";
import { Icon } from "../../ui/Icon";
import { DemoHead } from "./parts";

/** Ôn thi & hướng nghiệp: điểm dự kiến theo tổ hợp, "nếu vá lỗ hổng" thì sao, ôn đúng chỗ lợi nhất, gợi ý ngành – trường từ hồ sơ. */
const NEED = 27.5;
const MIN = 18, MAX = 30;
const SUBJ = [
  { s: "Toán", now: 7.4, fix: 8.6, color: "var(--c1)" },
  { s: "Hoá học", now: 8.7, fix: 9.0, color: "var(--c3)" },
  { s: "Tiếng Anh", now: 8.5, fix: 8.6, color: "var(--c7)" },
];
const GAINS = [
  { t: "Bất phương trình bậc hai", s: "Toán", gain: 0.6, h: 4, color: "var(--c1)" },
  { t: "Lượng giác", s: "Toán", gain: 0.4, h: 3, color: "var(--c1)" },
  { t: "Điện phân", s: "Hoá học", gain: 0.2, h: 2, color: "var(--c3)" },
  { t: "Câu bị động", s: "Tiếng Anh", gain: 0.1, h: 1, color: "var(--c7)" },
  { t: "Hình học không gian", s: "Toán", gain: 0.3, h: 5, color: "var(--c1)" },
];
const MAJORS = [
  { m: "Công nghệ thông tin", u: "ĐH Bách khoa", fit: 0.86, why: ["Toán đang lên", "Tiếng Anh 8,2", "Thích ví dụ đời thực"] },
  { m: "Kỹ thuật Hoá học", u: "ĐH Bách khoa", fit: 0.82, why: ["Hoá 8,6", "Mê thí nghiệm từ lớp 7"] },
  { m: "Khoa học dữ liệu", u: "ĐH Khoa học Tự nhiên", fit: 0.78, why: ["Toán và Anh vững", "Thích tìm quy luật"] },
  { m: "Dược học", u: "ĐH Dược", fit: 0.64, why: ["Hoá mạnh", "Sinh mới ở mức khá"] },
];

export function HuongNghiep() {
  const [fix, setFix] = useState(false);
  const total = SUBJ.reduce((a, x) => a + (fix ? x.fix : x.now), 0);
  const v = useCountUp(total, 1100);
  const p = useFakeProgress(1400);
  const [sel, setSel] = useState(0);
  const ang = (x: number) => -180 + ((Math.min(MAX, Math.max(MIN, x)) - MIN) / (MAX - MIN)) * 180;
  const pt = (a: number, r: number) => [Math.cos((a * Math.PI) / 180) * r, Math.sin((a * Math.PI) / 180) * r] as const;
  const arc = (a0: number, a1: number, r: number) => {
    const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  };
  const shown = MIN + (v - MIN) * Math.min(1, p * 1.2);
  const [nx, ny] = pt(ang(NEED), 150);
  const gapLeft = Math.max(0, NEED - v);
  const maxGain = Math.max(...GAINS.map((g) => g.gain / g.h));
  return (
    <div className="dm hn">
      <DemoHead title="Ôn thi & chọn ngành" eyebrow={<span>Mục tiêu: Bách khoa · CNTT</span>}>
        <Button variant="primary" icon={fix ? "undo" : "spark"} onClick={() => setFix(!fix)}>{fix ? "Về hiện tại" : "Nếu vá lỗ hổng"}</Button>
      </DemoHead>
      <section className="hn-top">
        <figure className="hn-gauge" aria-label={`Điểm dự kiến ${fmt1(total)} trên mức cần ${fmt1(NEED)}`}>
          <svg viewBox="-190 -180 380 210">
            <path d={arc(-180, 0, 140)} className="trk" />
            <path d={arc(-180, ang(shown), 140)} className={fix ? "fill fix" : "fill"} />
            {[18, 21, 24, 27, 30].map((t) => {
              const [x, y] = pt(ang(t), 112);
              return <text key={t} x={x} y={y + 4} textAnchor="middle" className="tk num">{t}</text>;
            })}
            <line x1={pt(ang(NEED), 126)[0]} y1={pt(ang(NEED), 126)[1]} x2={nx} y2={ny} className="need" />
            <text x={nx + 6} y={ny - 6} className="need-l">cần {fmt1(NEED)}</text>
            <g style={{ transform: `rotate(${ang(shown) + 90}deg)` }} className="needle">
              <line x1={0} y1={8} x2={0} y2={-120} />
              <circle r={9} />
            </g>
          </svg>
          <div className="hn-val">
            <b className="num">{fmt1(v)}</b>
            <span>{gapLeft > 0.05 ? <>còn <b className="num">{fmt1(gapLeft)}</b> điểm</> : "đạt mục tiêu"}</span>
          </div>
        </figure>
        <div className="hn-subj">
          <div className="dm-eyebrow">Tổ hợp D07</div>
          {SUBJ.map((x) => {
            const val = fix ? x.fix : x.now;
            return (
              <div key={x.s} className="hn-s" style={{ ["--sc" as string]: x.color }}>
                <span className="n">{x.s}</span>
                <div className="bar"><i style={{ width: `${(val / 10) * 100 * Math.min(1, p * 1.3)}%` }} /></div>
                <b className="num">{fmt1(val)}</b>
                {fix && x.fix > x.now && <em className="num">+{fmt1(x.fix - x.now)}</em>}
              </div>
            );
          })}
        </div>
      </section>
      <section className="hn-sec">
        <div className="hn-sec-h">
          <h2>Ôn chỗ lợi nhất trước</h2>
          <span>điểm thêm / giờ ôn</span>
        </div>
        <ol className="hn-gain">
          {GAINS.map((g, i) => (
            <li key={g.t} style={{ ["--sc" as string]: g.color, ["--d" as string]: `${i * 80}ms` }}>
              <span className="rk num">{i + 1}</span>
              <span className="t">{g.t}<small>{g.s} · {g.h} giờ</small></span>
              <div className="bar"><i style={{ width: `${(g.gain / g.h / maxGain) * 100}%` }} /></div>
              <b className="num">+{fmt1(g.gain)}</b>
            </li>
          ))}
        </ol>
      </section>
      <section className="hn-sec">
        <div className="hn-sec-h">
          <h2>Ngành hợp với em</h2>
          <span>từ hồ sơ lớp 6 đến nay</span>
        </div>
        <div className="hn-majors">
          <ol>
            {MAJORS.map((m, i) => (
              <li key={m.m}>
                <button type="button" aria-pressed={i === sel} onClick={() => setSel(i)}>
                  <span className="hn-fit" style={{ ["--p" as string]: `${m.fit * 100 * Math.min(1, p * 1.2)}%` }}><b className="num">{Math.round(m.fit * 100)}</b></span>
                  <span className="t">
                    <b>{m.m}</b>
                    <small>{m.u}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="hn-why" key={sel}>
            <div className="dm-eyebrow">Vì sao hợp</div>
            <p>{MAJORS[sel]!.m}</p>
            <ul>
              {MAJORS[sel]!.why.map((w) => (
                <li key={w}><Icon name="check" size="sm" />{w}</li>
              ))}
            </ul>
            <Link to="/hoc/ho-so" className="hs-link">Xem bằng chứng trong hồ sơ <Icon name="right" size="sm" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
