/** /gv/studio — Studio hoạt hình (mô phỏng): AI chọn skill trong kho 87 skill → viết kịch bản cảnh → vẽ dần hoạt hình "Giấy học thuật" → tự kiểm từng khung và tự sửa. */
import { useMemo, useState } from "react";
import { Button } from "../../ui/components/Button";
import { Icon } from "../../ui/Icon";
import { Head } from "./common";
import { useCount, usePhases } from "../kit";

const GROUPS: [string, string[]][] = [
  ["Nét & hình", ["Vẽ nét", "Tô dần", "Viền tay", "Mũi tên cong", "Mũi tên lượn", "Khung nhấn", "Gạch chân", "Khoanh tròn", "Lưới giấy", "Bóng đổ nhẹ", "Nét đứt chạy", "Điểm sáng"]],
  ["Chuyển động", ["Hiện lên", "Trượt vào", "Biến hình", "Nối cảnh", "Lắc nhẹ", "Quỹ đạo", "Rơi", "Bay lên", "Lan toả", "Xoay chậm", "Đi theo đường", "Tách – gộp"]],
  ["Chữ & số", ["Chữ hiện dần", "Nhãn chú thích", "Số đếm lên", "Công thức dựng", "Đổi chữ", "Chú giải", "Phụ đề", "Tiêu đề cảnh", "Trích dẫn", "Bảng chữ"]],
  ["Biểu đồ", ["Cột mọc", "Đường vẽ dần", "Tròn chia phần", "Thang đo", "Bản đồ nhiệt", "Trục số", "Dòng thời gian", "Sơ đồ cây", "Lưu đồ", "Phễu"]],
  ["Khoa học", ["Mặt trời toả sáng", "Sóng nước", "Bốc hơi", "Mây tụ", "Mưa rơi", "Dòng chảy", "Tế bào phân chia", "Phân tử xoay", "Dòng điện", "Lực và vectơ", "Quang hợp", "Tuần hoàn máu", "Con lắc", "Lăng kính"]],
  ["Địa lí", ["Bản đồ phóng", "Địa hình nổi", "Gió mùa", "Dòng hải lưu", "Lát cắt địa chất", "Mùa và quỹ đạo", "Biểu đồ nhiệt – ẩm", "Dân số tháp", "Đường đồng mức", "La bàn"]],
  ["Lịch sử", ["Mũi tiến quân", "Bản đồ chiến dịch", "Cuộn thư", "Chân dung", "Dấu mốc", "So sánh hai thời"]],
  ["Toán", ["Đồ thị hàm", "Hình không gian", "Phép biến hình", "Tam giác đồng dạng", "Xác suất cây", "Tích phân diện tích", "Dãy số", "Vectơ cộng"]],
  ["Máy quay", ["Lia ngang", "Đẩy vào chậm", "Theo vật", "Cắt cảnh khớp", "Mở rộng"]],
];
const SKILLS = GROUPS.flatMap(([g, ns]) => ns.map((n) => ({ g, n })));
const PICK = ["Mặt trời toả sáng", "Sóng nước", "Bốc hơi", "Mây tụ", "Đi theo đường", "Mưa rơi", "Dòng chảy", "Nhãn chú thích"].map((n) => SKILLS.findIndex((s) => s.n === n));
const SCENES = [
  { t: "Bốc hơi", c: "var(--gs-c2)", w: 3 },
  { t: "Ngưng tụ", c: "var(--gs-c4)", w: 2.4 },
  { t: "Mưa", c: "var(--gs-c1)", w: 2 },
  { t: "Dòng chảy", c: "var(--gs-c3)", w: 2.4 },
];
const CHECKS = 8;
const BAD = 4;

export function Studio() {
  const [run, setRun] = useState(0);
  const [chosen, setChosen] = useState<number[]>(PICK);
  const [q, setQ] = useState("");
  const ph = usePhases([2600, 1500, 7400, 3800], run > 0, run);
  const lit = useCount(PICK.length, 2300, run > 0 && ph === 0, run);
  const counting = useCount(CHECKS, 3400, run > 0 && ph === 3, run);
  const checked = ph >= 4 ? CHECKS : counting;
  const going = run > 0;
  const shownSkills = !going ? [] : ph === 0 ? chosen.slice(0, lit) : chosen;
  const flagged = ph === 3 && checked > BAD && checked < CHECKS - 1;
  const fixed = !going || (ph === 3 && checked >= CHECKS - 1) || ph >= 4;
  const match = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? new Set(SKILLS.flatMap((s, i) => (s.n.toLowerCase().includes(k) || s.g.toLowerCase().includes(k) ? [i] : []))) : null;
  }, [q]);
  const toggle = (i: number) => setChosen((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  const status = !going ? null : ["Chọn skill", "Viết kịch bản", "Vẽ hoạt hình", "Tự kiểm khung", "Xong"][ph];

  return (
    <>
      <Head title="Studio hoạt hình" primary={{ label: going ? "Sáng tác lại" : "Sáng tác", icon: "spark", onClick: () => setRun((r) => r + 1) }} />
      <div className="gs-st">
        <aside className="gs-kho" aria-label="Kho skill">
          <div className="gs-kho-h">
            <b className="num">{SKILLS.length}</b>
            <span>skill</span>
            <label className="gs-kho-q">
              <Icon name="search" size="sm" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm skill" aria-label="Tìm skill" />
            </label>
          </div>
          <div className={["gs-dots", going && ph === 0 && "scan", match && "filter"].filter(Boolean).join(" ")} role="group" aria-label="Bảng skill">
            {SKILLS.map((s, i) => {
              const on = shownSkills.includes(i);
              return (
                <button
                  key={s.n}
                  type="button"
                  title={`${s.n} · ${s.g}`}
                  aria-pressed={on}
                  className={match?.has(i) ? "hit" : undefined}
                  style={{ ["--i" as string]: i }}
                  onClick={() => toggle(i)}
                />
              );
            })}
          </div>
          <ol className="gs-picked">
            {shownSkills.map((i) => (
              <li key={i}>
                <span>{SKILLS[i]!.n}</span>
                <small>{SKILLS[i]!.g}</small>
                <button type="button" aria-label={`Bỏ ${SKILLS[i]!.n}`} onClick={() => toggle(i)}><Icon name="x" size="sm" /></button>
              </li>
            ))}
          </ol>
        </aside>

        <section className="gs-st-main">
          <div className="gs-st-topic">
            <span className="eyebrow">Địa lí 10</span>
            <h2>Vòng tuần hoàn của nước</h2>
            {status && <span className="gs-st-status" key={status}>{ph < 4 && <i className="gs-scan" />}{status}</span>}
          </div>
          <div className="gs-st-canvas">
            <WaterCycle key={run} mode={!going ? "still" : ph >= 2 ? "run" : "blank"} flagged={flagged} fixed={fixed} />
          </div>
          <div className={["gs-scenes", going && ph >= 1 && "on", going && ph === 2 && "play"].filter(Boolean).join(" ")}>
            {SCENES.map((s, i) => (
              <div key={s.t} style={{ flexGrow: s.w, ["--c" as string]: s.c, ["--i" as string]: i }}>
                <span>{s.t}</span>
              </div>
            ))}
            <b className="gs-scenes-head" />
          </div>
          <div className={going && ph >= 3 ? "gs-checks on" : "gs-checks"} aria-label="Tự kiểm khung">
            {Array.from({ length: CHECKS }, (_, i) => {
              const st = i >= checked ? "todo" : i === BAD && !fixed ? "bad" : i === BAD ? "fixed" : "ok";
              return (
                <div key={i} data-st={st}>
                  <span className="num">{String((i + 1) * 30).padStart(3, "0")}</span>
                  <Icon name={st === "bad" ? "alert" : st === "todo" ? "clock" : "check"} size="sm" />
                </div>
              );
            })}
            <p className="gs-checks-t">
              {flagged ? <><Icon name="alert" size="sm" />Khung 150: nhãn “Mưa” đè lên mây · đang dời</> : fixed ? <><Icon name="checkc" size="sm" />8/8 khung đạt · chữ không đè, đủ tương phản, trong lề</> : null}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

/** Cảnh vòng tuần hoàn của nước — mọi nét tự vẽ theo mốc thời gian (--d). */
function WaterCycle({ mode, flagged, fixed }: { mode: "still" | "run" | "blank"; flagged: boolean; fixed: boolean }) {
  const d = (s: number) => ({ ["--d" as string]: `${s}s` });
  return (
    <svg viewBox="0 0 960 540" className={`gs-wc ${mode}`} role="img" aria-label="Hoạt hình vòng tuần hoàn của nước">
      <rect width={960} height={540} className="wc-bg" />
      <g className="wc-sun fade" style={d(0.2)}>
        <circle cx={110} cy={96} r={40} className="wc-sun-c draw" pathLength={1} style={d(0.2)} />
        <g className="wc-rays">
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <path key={i} d={`M${110 + Math.cos(a) * 54} ${96 + Math.sin(a) * 54} L${110 + Math.cos(a) * 70} ${96 + Math.sin(a) * 70}`} />;
          })}
        </g>
      </g>
      <path className="wc-sea fade" d="M0 420 Q 60 410 120 420 T 240 420 T 360 420 T 480 424 L480 540 L0 540 Z" style={d(0.5)} />
      <path className="wc-wave draw" pathLength={1} d="M20 450 Q 60 440 100 450 T 180 450 T 260 450 T 340 450" style={d(0.6)} />
      <path className="wc-wave draw" pathLength={1} d="M60 480 Q 100 470 140 480 T 220 480 T 300 480 T 380 480" style={d(0.8)} />
      <path className="wc-land fade" d="M430 540 L430 430 C 470 420, 520 330, 560 300 L 620 350 L 760 210 L 860 330 L 960 380 L960 540 Z" style={d(0.9)} />
      <path className="wc-ridge draw" pathLength={1} d="M430 430 C 470 420, 520 330, 560 300 L 620 350 L 760 210 L 860 330 L 960 380" style={d(0.9)} />
      <g className="wc-evap">
        {[150, 230, 310].map((x, i) => (
          <path key={x} className="flow" pathLength={1} d={`M${x} 405 C ${x - 22} 365, ${x + 22} 325, ${x} 285 S ${x + 18} 235, ${x + 6} 215`} style={d(1.7 + i * 0.2)} />
        ))}
      </g>
      <g className="wc-cloud" style={d(3)}>
        <g className="wc-cloud-in">
          {[[400, 150, 34], [440, 128, 42], [486, 146, 36], [440, 164, 30]].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} className="pop" style={d(3 + i * 0.12)} />
          ))}
          <path className="wc-cloud-base" d="M372 168 H 516" />
        </g>
        <text x={440} y={66} className="wc-lbl-t rise" style={d(3.6)}>Ngưng tụ</text>
      </g>
      <g className="wc-rain" style={d(5.3)}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${640 + i * 11} ${204 + (i % 3) * 14} l-5 26`} style={d(5.3 + (i % 5) * 0.14)} />
        ))}
      </g>
      <path className="wc-river draw" pathLength={1} d="M745 250 C 720 320, 640 360, 560 420 S 470 470, 420 440" style={d(6.1)} />
      <path className="wc-river-flow" d="M745 250 C 720 320, 640 360, 560 420 S 470 470, 420 440" style={d(7)} />
      <g className="wc-lbl">
        <text x={236} y={192} className="rise" style={d(2.3)}>Bốc hơi</text>
        <g className={["wc-move", fixed && "fixed"].filter(Boolean).join(" ")}>
          <text x={705} y={150} className="rise" style={d(5.7)}>Mưa</text>
          {flagged && <rect x={668} y={120} width={74} height={42} rx={4} className="wc-flag" />}
        </g>
        <text x={610} y={470} className="rise" style={d(6.9)}>Dòng chảy</text>
      </g>
    </svg>
  );
}
