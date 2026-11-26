import { useState } from "react";
import { useSearchParams } from "react-router";
import { useFakeStream, Face, useClock } from "../kit";
import { Segmented, StreamingText } from "../../ui";
import { Icon } from "../../ui/Icon";
import { DemoHead } from "./parts";

/** Đọc & xem: đọc tài liệu nhập vai (hỏi chính tác giả/nhân vật) và học qua video có ghi chú theo mốc. */
type Mode = "doc" | "xem";
const MODES: { value: Mode; label: string }[] = [
  { value: "doc", label: "Đọc nhập vai" },
  { value: "xem", label: "Xem có ghi chú" },
];

export function DocXem() {
  const [sp, setSp] = useSearchParams();
  const mode: Mode = sp.get("xem") === "video" ? "xem" : "doc";
  return (
    <div className="dm dx">
      <DemoHead title="Đọc & xem" eyebrow={<span>{mode === "doc" ? "Ngữ văn 10 · Bình Ngô đại cáo" : "Sinh học · Di truyền Mendel"}</span>}>
        <Segmented label="Cách học" options={MODES} value={mode} onChange={(v) => setSp(v === "doc" ? {} : { xem: "video" }, { replace: true })} />
      </DemoHead>
      {mode === "doc" ? <Doc /> : <Xem />}
    </div>
  );
}

/* ---------------- Đọc nhập vai ---------------- */
const LINES = ["Việc nhân nghĩa cốt ở yên dân,", "Quân điếu phạt trước lo trừ bạo.", "Như nước Đại Việt ta từ trước,", "Vốn xưng nền văn hiến đã lâu.", "Núi sông bờ cõi đã chia,", "Phong tục Bắc Nam cũng khác."];
const ROLES = [
  { id: "trai", name: "Nguyễn Trãi", hue: 32, sub: "Tác giả" },
  { id: "linh", name: "Lính Lam Sơn", hue: 140, sub: "Nhân vật" },
  { id: "phe-binh", name: "Nhà phê bình", hue: 260, sub: "Người đọc" },
] as const;
type RoleId = (typeof ROLES)[number]["id"];
const QA: { q: string; a: Record<RoleId, string> }[] = [
  {
    q: "Vì sao mở đầu bằng “nhân nghĩa”?",
    a: {
      trai: "Ta mở đầu bằng nhân nghĩa vì đó là lẽ phải làm nền cho cả bài cáo. Nhân nghĩa là yên dân và trừ bạo. Có lẽ phải ấy, cuộc khởi nghĩa của ta là chính nghĩa, còn giặc là kẻ tàn bạo.",
      linh: "Tôi chỉ là lính Lam Sơn, nhưng nghe câu ấy là hiểu: mình cầm gươm không để cướp đất, mà để dân được yên.",
      "phe-binh": "Hai câu đầu là luận đề của cả bài: tư tưởng nhân nghĩa gắn với yên dân, trừ bạo. Các phần sau đều là dẫn chứng và lập luận cho luận đề này.",
    },
  },
  {
    q: "Câu “Núi sông bờ cõi đã chia” để làm gì?",
    a: {
      trai: "Ta muốn khẳng định Đại Việt có lãnh thổ riêng, phong tục riêng. Đã là một nước độc lập thì kẻ xâm lược không có lẽ gì đứng được.",
      linh: "Nghe câu ấy anh em trong quân ai cũng thấy tự hào: đất này là của mình, từ núi đến sông.",
      "phe-binh": "Đây là một dẫn chứng về chủ quyền: lãnh thổ và phong tục. Cùng với văn hiến, lịch sử, nó tạo nên khái niệm quốc gia khá đầy đủ.",
    },
  },
];

function Doc() {
  const [role, setRole] = useState<RoleId>("trai");
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState(0);
  const r = ROLES.find((x) => x.id === role)!;
  const ans = QA[qi]!.a[role];
  const s = useFakeStream(ans, { cps: 70, delayMs: 450, key: `${role}-${qi}` });
  return (
    <div className="dx-doc">
      <article className="dx-paper" aria-label="Văn bản">
        {[
          { label: "Luận đề", from: 0, to: 2 },
          { label: "Dẫn chứng", from: 2, to: 6 },
        ].map((g, gi) => (
          <div key={g.label} className={`dx-grp g${gi}`}>
            <span className="lb">{g.label}</span>
            <div className="ls">
              {LINES.slice(g.from, g.to).map((ln, j) => {
                const i = g.from + j;
                return (
                  <button key={i} type="button" className={i === sel ? "on" : undefined} onClick={() => { setSel(i); setQi(i >= 4 ? 1 : 0); }}>
                    {ln}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <footer>Nguyễn Trãi · bản dịch Bùi Kỷ</footer>
      </article>
      <section className="dx-chat" aria-label="Trò chuyện nhập vai">
        <div className="dx-roles" role="group" aria-label="Nói chuyện với">
          {ROLES.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === role} onClick={() => setRole(x.id)}>
              <Face name={x.name} hue={x.hue} size={36} />
              <span>
                <b>{x.name}</b>
                <small>{x.sub}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="dx-q">{QA[qi]!.q}</div>
        <div className="dx-a" key={`${role}-${qi}`}>
          <Face name={r.name} hue={r.hue} size={40} />
          <div>
            <cite>{r.name}</cite>
            <StreamingText text={s.text} state={s.state} className="dx-a-t" />
          </div>
        </div>
        <div className="dx-more">
          {QA.map((x, i) =>
            i === qi ? null : (
              <button key={x.q} type="button" onClick={() => { setQi(i); setSel(i ? 4 : 0); }}>
                {x.q}
              </button>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Xem video có ghi chú ---------------- */
const LEN = 240; // giây video (mô phỏng)
const RATE = 10;
type Note = { at: number; t: string; mine?: boolean };
const NOTES0: Note[] = [
  { at: 34, t: "Tính trạng trội · lặn" },
  { at: 96, t: "F1 đồng loạt hạt vàng" },
  { at: 190, t: "F2 phân li 3 : 1" },
];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Xem() {
  const [play, setPlay] = useState(true);
  const [raw, setT] = useClock(play, RATE);
  const t = raw % LEN;
  const [notes, setNotes] = useState<Note[]>(NOTES0);
  const [fresh, setFresh] = useState<number | null>(null);
  const add = () => {
    const at = Math.round(t);
    setNotes((n) => [...n, { at, t: at < 80 ? "Hạt vàng trội, hạt xanh lặn" : at < 170 ? "Aa × Aa cho 4 tổ hợp" : "Ba vàng, một xanh", mine: true }].sort((a, b) => a.at - b.at));
    setFresh(at);
  };
  const cur = [...notes].reverse().find((n) => n.at <= t);
  return (
    <div className="dx-xem">
      <figure className="dx-video">
        <Punnett t={t} />
        <div className="dx-tl">
          <button type="button" className="pp" aria-label={play ? "Dừng" : "Phát"} onClick={() => setPlay(!play)}>
            <Icon name={play ? "pause" : "play"} />
          </button>
          <div className="track" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setT(((e.clientX - r.left) / r.width) * LEN); }}>
            <i className="fill" style={{ width: `${(t / LEN) * 100}%` }} />
            {notes.map((n) => (
              <button key={`${n.at}-${n.t}`} type="button" className={[n.mine && "mine", fresh === n.at && "fresh"].filter(Boolean).join(" ") || undefined} style={{ left: `${(n.at / LEN) * 100}%` }} title={n.t} aria-label={`${mmss(n.at)} ${n.t}`} onClick={(e) => { e.stopPropagation(); setT(n.at); }} />
            ))}
          </div>
          <span className="num">{mmss(t)} / {mmss(LEN)}</span>
        </div>
      </figure>
      <aside className="dx-notes">
        <div className="dx-notes-h">
          <h2>Ghi chú theo mốc</h2>
        </div>
        <button type="button" className="btn primary" onClick={add}><Icon name="bookmark" size="sm" /><span>Ghi chú tại {mmss(t)}</span></button>
        <ol>
          {notes.map((n) => (
            <li key={`${n.at}-${n.t}`} className={[cur === n && "cur", fresh === n.at && "fresh"].filter(Boolean).join(" ") || undefined}>
              <button type="button" onClick={() => setT(n.at)}>
                <time className="num">{mmss(n.at)}</time>
                <span>{n.t}</span>
                {n.mine && <em>AI tóm tắt</em>}
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

/** Khung bài giảng "giấy học thuật": P → F1 → bảng Punnett F2, hiện theo thời gian video. */
function Punnett({ t }: { t: number }) {
  const sc = t < 60 ? 0 : t < 150 ? 1 : 2;
  const pea = (x: number, y: number, yellow: boolean, r = 16, k?: string) => <circle key={k} cx={x} cy={y} r={r} className={yellow ? "pea y" : "pea g"} />;
  const cells = [
    ["AA", true], ["Aa", true], ["Aa", true], ["aa", false],
  ] as const;
  return (
    <svg viewBox="0 0 640 360" className="dx-sc" role="img" aria-label="Lai một cặp tính trạng: F2 phân li 3 vàng : 1 xanh">
      <rect width={640} height={360} className="bg" />
      {sc === 0 && (
        <g className="dx-scene" key="s0">
          <text x={320} y={92} textAnchor="middle" className="h">Lai một cặp tính trạng</text>
          {pea(250, 190, true, 30)}
          <text x={250} y={250} textAnchor="middle" className="l">Hạt vàng · trội</text>
          {pea(390, 190, false, 30)}
          <text x={390} y={250} textAnchor="middle" className="l">Hạt xanh · lặn</text>
        </g>
      )}
      {sc === 1 && (
        <g className="dx-scene" key="s1">
          <text x={70} y={90} className="k">P</text>
          {pea(180, 82, true)}
          <text x={180} y={124} textAnchor="middle" className="g2">AA</text>
          <text x={260} y={90} textAnchor="middle" className="x">×</text>
          {pea(340, 82, false)}
          <text x={340} y={124} textAnchor="middle" className="g2">aa</text>
          <path d="M260,150 L260,190" className="arr" />
          <text x={70} y={250} className="k">F1</text>
          {[0, 1, 2, 3, 4].map((i) => pea(150 + i * 60, 242, true, 16, `f${i}`))}
          <text x={300} y={300} textAnchor="middle" className="g2">Aa · 100% hạt vàng</text>
        </g>
      )}
      {sc === 2 && (
        <g className="dx-scene" key="s2">
          <text x={60} y={70} className="k">F2</text>
          <text x={240} y={70} textAnchor="middle" className="g2">A</text>
          <text x={330} y={70} textAnchor="middle" className="g2">a</text>
          <text x={168} y={130} textAnchor="middle" className="g2">A</text>
          <text x={168} y={220} textAnchor="middle" className="g2">a</text>
          {cells.map(([g, y], i) => {
            const cx = 240 + (i % 2) * 90, cy = 125 + Math.floor(i / 2) * 90;
            const on = t >= 155 + i * 8;
            return (
              <g key={g + i} className={on ? "cell on" : "cell"}>
                <rect x={cx - 42} y={cy - 40} width={84} height={84} rx={10} />
                {pea(cx, cy - 6, y, 15)}
                <text x={cx} y={cy + 32} textAnchor="middle" className="g3">{g}</text>
              </g>
            );
          })}
          <g className={t >= 190 ? "ratio on" : "ratio"}>
            <text x={500} y={170} textAnchor="middle" className="big">3 : 1</text>
            <text x={500} y={204} textAnchor="middle" className="l">vàng : xanh</text>
          </g>
        </g>
      )}
    </svg>
  );
}
