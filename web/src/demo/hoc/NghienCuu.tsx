import { type ReactNode, useState } from "react";
import { useFakeStream } from "../kit";
import { Button, StreamingText } from "../../ui";
import { Icon } from "../../ui/Icon";
import { DemoHead, useClock } from "./parts";

/** Nghiên cứu sâu: câu hỏi → cây truy vấn toả ra → nguồn (đọc, đánh dấu) → báo cáo có trích dẫn. */
const QUESTION = "Vì sao Điện Biên Phủ trở thành trận quyết chiến?";
type Src = { n: number; name: string; kind: string };
const BRANCHES: { q: string[]; src: Src[] }[] = [
  { q: ["Vị trí địa lí", "của Điện Biên Phủ"], src: [{ n: 1, name: "SGK Lịch sử 12", kind: "S" }, { n: 2, name: "Atlat Địa lí Việt Nam", kind: "A" }, { n: 3, name: "Bảo tàng Chiến thắng ĐBP", kind: "B" }] },
  { q: ["Kế hoạch Na-va", "của Pháp"], src: [{ n: 4, name: "Tư liệu Viện Sử học", kind: "V" }, { n: 5, name: "SGK Lịch sử 12", kind: "S" }] },
  { q: ["Chủ trương", "Đông Xuân 1953–1954"], src: [{ n: 6, name: "Văn kiện Đảng", kind: "Đ" }, { n: 7, name: "Hồi ký Võ Nguyên Giáp", kind: "H" }] },
  { q: ["Diễn biến", "và kết quả"], src: [{ n: 8, name: "Bảo tàng Lịch sử Quân sự", kind: "B" }, { n: 9, name: "Báo Nhân Dân tư liệu", kind: "N" }, { n: 10, name: "SGK Lịch sử 12", kind: "S" }] },
];
const ALL = BRANCHES.flatMap((b) => b.src);
const REPORT = `Điện Biên Phủ là một thung lũng lòng chảo rộng ở Tây Bắc, gần biên giới Lào, giữ vị trí chiến lược [1][2].

Theo kế hoạch Na-va, Pháp xây dựng nơi đây thành tập đoàn cứ điểm mạnh nhất Đông Dương, mong thu hút và tiêu diệt chủ lực ta [4].

Ta chọn Điện Biên Phủ làm điểm quyết chiến chiến lược và đổi phương châm từ “đánh nhanh, giải quyết nhanh” sang “đánh chắc, tiến chắc” [6][7].

Chiến dịch thắng lợi ngày 7/5/1954, tạo thế buộc Pháp ký Hiệp định Giơ-ne-vơ [8][10].`;

const T_ROOT = 0.3, T_Q = 0.9, T_SRC = 2.9, T_READ = 5.2, T_WRITE = 7.6;
const ANG = [-140, -40, 40, 140];

export function NghienCuu() {
  const [run, setRun] = useState(0);
  return <Research key={run} again={() => setRun((r) => r + 1)} />;
}

function Research({ again }: { again: () => void }) {
  const [t] = useClock(true);
  const [hl, setHl] = useState<number | null>(null);
  const s = useFakeStream(REPORT, { run: t >= T_WRITE, cps: 90, delayMs: 0 });
  const shown = (i: number) => t >= T_SRC + i * 0.22;
  const read = (i: number) => t >= T_READ + i * 0.2;
  const nFound = ALL.filter((_, i) => shown(i)).length;
  const nRead = ALL.filter((_, i) => read(i)).length;
  const phase = t < T_Q ? 0 : t < T_SRC ? 1 : t < T_READ ? 2 : t < T_WRITE ? 3 : 4;
  const PH = ["Đọc câu hỏi", "Tách thành 4 hướng", `Tìm nguồn · ${nFound}`, `Đọc nguồn · ${nRead}/${ALL.length}`, s.state === "done" ? "Xong báo cáo" : "Viết báo cáo"];
  let k = 0;
  return (
    <div className="dm nc">
      <DemoHead title="Nghiên cứu sâu" eyebrow={<span>Lịch sử · dự án nhóm</span>}>
        <Button variant="primary" icon="refresh" onClick={again}>Chạy lại</Button>
      </DemoHead>
      <div className="nc-q">
        <Icon name="search" />
        <span>{QUESTION}</span>
      </div>
      <div className="nc-phase" aria-live="polite">
        {PH.map((p, i) => (
          <span key={i} className={i < phase ? "ok" : i === phase ? "now" : undefined}>{p}</span>
        ))}
      </div>
      <div className="nc-main">
        <figure className="nc-tree" aria-label={`Cây truy vấn: ${BRANCHES.map((b) => b.q.join(" ")).join("; ")}`}>
          <svg viewBox="-360 -255 720 510">
            {BRANCHES.map((b, bi) => {
              const a = (ANG[bi]! * Math.PI) / 180;
              const qx = Math.cos(a) * 150, qy = Math.sin(a) * 120;
              const qOn = t >= T_Q + bi * 0.35;
              return (
                <g key={bi}>
                  <path d={`M0,0 Q${qx * 0.5},${qy * 0.1} ${qx},${qy}`} className={qOn ? "edge on" : "edge"} pathLength={1} />
                  {b.src.map((sr, si) => {
                    const idx = k++;
                    const spread = (si - (b.src.length - 1) / 2) * 25;
                    const sa = ((ANG[bi]! + spread) * Math.PI) / 180;
                    const sx = Math.cos(sa) * 290, sy = Math.sin(sa) * 228;
                    const on = shown(idx), rd = read(idx);
                    const right = sx > 0;
                    return (
                      <g key={sr.n} className={["src", on && "on", rd && "read", hl === sr.n && "hl"].filter(Boolean).join(" ")} onMouseEnter={() => setHl(sr.n)} onMouseLeave={() => setHl(null)}>
                        <path d={`M${qx},${qy} C${qx + (sx - qx) * 0.5},${qy} ${qx + (sx - qx) * 0.5},${sy} ${sx},${sy}`} className="edge2" pathLength={1} />
                        <g transform={`translate(${sx},${sy})`}>
                          <rect x={-13} y={-13} width={26} height={26} rx={7} className="chip" />
                          <text y={4.5} textAnchor="middle" className="kind">{rd ? "✓" : sr.kind}</text>
                          <text x={right ? 20 : -20} y={-2} textAnchor={right ? "start" : "end"} className="nm">{sr.name}</text>
                          <text x={right ? 20 : -20} y={13} textAnchor={right ? "start" : "end"} className="no">[{sr.n}]</text>
                          <text x={right ? 20 : -20} y={6} textAnchor={right ? "start" : "end"} className="no-m">{sr.n}</text>
                        </g>
                      </g>
                    );
                  })}
                  <g className={qOn ? "qn on" : "qn"} transform={`translate(${qx},${qy})`}>
                    <circle r={9} />
                    {b.q.map((ln, li) => (
                      <text key={li} x={0} y={(qy < 0 ? -38 : 30) + li * 16} textAnchor="middle">{ln}</text>
                    ))}
                  </g>
                </g>
              );
            })}
            <g className={t >= T_ROOT ? "root on" : "root"}>
              <circle r={44} className="halo" />
              <circle r={30} />
              <circle cx={-4} cy={-4} r={9} className="mg" />
              <line x1={3} y1={3} x2={11} y2={11} className="mg" />
            </g>
          </svg>
        </figure>
        <section className="nc-report" aria-label="Báo cáo">
          <div className="nc-report-h">
            <h2>Báo cáo</h2>
            <span className="num">{nRead} nguồn đã đọc</span>
          </div>
          {t >= T_WRITE ? (
            <StreamingText text={s.text} state={s.state} className="nc-text" render={(x) => cite(x, setHl)} />
          ) : (
            <div className="nc-skel" aria-hidden="true">
              {[92, 100, 76, 0, 100, 88, 64].map((w, i) => (w ? <i key={i} style={{ width: `${w}%` }} /> : <br key={i} />))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function cite(text: string, onHl: (n: number | null) => void): ReactNode {
  return text.split("\n").map((ln, i) =>
    ln ? (
      <p key={i}>
        {ln.split(/(\[\d+\])/).map((part, j) => {
          const m = /^\[(\d+)\]$/.exec(part);
          if (!m) return part;
          const n = Number(m[1]);
          return (
            <button key={j} type="button" className="st-cite" onMouseEnter={() => onHl(n)} onMouseLeave={() => onHl(null)} onFocus={() => onHl(n)} onBlur={() => onHl(null)}>
              {n}
            </button>
          );
        })}
      </p>
    ) : null,
  );
}
