import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useFakeProgress, useFakeStream, Face, useClock } from "../kit";
import { Button, StreamingText } from "../../ui";
import { Icon } from "../../ui/Icon";
import { DemoHead } from "./parts";

/** Sổ tay học tập (kiểu open-notebook): sổ nguồn, hỏi có trích dẫn, podcast 2 giọng có sóng âm, ghi chú + Co-Writer. */
const SOURCES = [
  { id: 1, icon: "book", t: "SGK Hoá học 10 · Bài 15", s: "PDF · 12 trang" },
  { id: 2, icon: "video", t: "Video thầy Long", s: "14 phút · có phụ đề" },
  { id: 3, icon: "pen", t: "Ghi chú trên lớp", s: "Ảnh chụp vở · 2 trang" },
  { id: 4, icon: "image", t: "Thí nghiệm Fe + CuSO₄", s: "Ảnh · nhóm 3" },
];

const ANSWERS: Record<string, string> = {
  "Chất khử khác chất oxi hoá thế nào?": `Chất khử là chất nhường electron, số oxi hoá tăng [1]. Chất oxi hoá là chất nhận electron, số oxi hoá giảm [1].

Trong thí nghiệm của nhóm: Fe + CuSO₄ → FeSO₄ + Cu. Sắt nhường 2 electron nên là chất khử, ion Cu²⁺ nhận electron nên là chất oxi hoá [4].

Mẹo nhớ của thầy Long: “Khử cho, O nhận” [2].`,
  "Vì sao đinh sắt đổi màu?": `Lớp đồng bám lên bề mặt đinh sắt nên đinh chuyển màu đỏ nâu [4]. Đó là Cu sinh ra khi Cu²⁺ nhận electron từ Fe [1].

Dung dịch nhạt màu xanh dần vì ion Cu²⁺ giảm đi [3].`,
  "Cách cân bằng nhanh?": `Dùng thăng bằng electron: tổng electron nhường bằng tổng electron nhận [1].

Bốn bước: xác định số oxi hoá, viết quá trình, tìm hệ số chung, đặt hệ số vào phương trình [2].`,
};
const QS = Object.keys(ANSWERS);

/** Kịch bản podcast: [người nói, câu, bắt đầu (s)]. Mai = c5, Nam = c1. */
const SCRIPT: [0 | 1, string][] = [
  [0, "Chào cả nhà! Hôm nay Mai và Nam nói về phản ứng oxi hoá – khử."],
  [1, "Nghe tên thì sợ, nhưng thật ra chỉ là chuyện cho và nhận electron thôi."],
  [0, "Đúng rồi. Chất nào cho electron thì là chất khử."],
  [1, "Còn chất nhận electron là chất oxi hoá. Thầy Long có câu: “Khử cho, O nhận”."],
  [0, "Thí nghiệm đinh sắt trong CuSO₄ là ví dụ đẹp nhất: sắt cho, đồng nhận."],
  [1, "Thế nên đinh sắt khoác lên mình một lớp đồng đỏ nâu!"],
];
const LINE = 3.2; // giây mỗi câu (mô phỏng)
const HOSTS = [
  { name: "Mai", hue: 340, color: "var(--c5)" },
  { name: "Nam", hue: 205, color: "var(--c1)" },
];

export function SoTay() {
  const [on, setOn] = useState(() => new Set([1, 2, 3, 4]));
  const [hl, setHl] = useState<number | null>(null);
  return (
    <div className="dm st">
      <DemoHead title="Sổ tay học tập" eyebrow={<span>Hoá học · Phản ứng oxi hoá – khử</span>} />
      <div className="st-grid">
        <aside className="st-src" aria-label="Nguồn">
          <h2>Nguồn <span className="num">{on.size}</span></h2>
          <ul>
            {SOURCES.map((s) => (
              <li key={s.id} className={hl === s.id ? "hl" : undefined}>
                <label>
                  <input
                    type="checkbox"
                    checked={on.has(s.id)}
                    onChange={() =>
                      setOn((x) => {
                        const n = new Set(x);
                        if (n.has(s.id)) n.delete(s.id);
                        else n.add(s.id);
                        return n;
                      })
                    }
                  />
                  <span className="ic"><Icon name={s.icon} size="sm" /></span>
                  <span className="tx">
                    <b>{s.t}</b>
                    <small>{s.s}</small>
                  </span>
                  <span className="no num">{s.id}</span>
                </label>
              </li>
            ))}
          </ul>
          <button type="button" className="st-add"><Icon name="plus" size="sm" />Thêm nguồn</button>
        </aside>
        <Chat onCite={setHl} />
        <aside className="st-studio" aria-label="Studio">
          <Podcast />
          <CoWriter />
        </aside>
      </div>
    </div>
  );
}

/** Chữ có trích dẫn [n] → nút số nhỏ, rê vào thì sáng nguồn bên trái. */
function cited(text: string, onCite: (n: number | null) => void): ReactNode {
  return text.split("\n").map((ln, i) =>
    ln ? (
      <p key={i}>
        {ln.split(/(\[\d\])/).map((part, j) => {
          const m = /^\[(\d)\]$/.exec(part);
          if (!m) return part;
          const n = Number(m[1]);
          return (
            <button key={j} type="button" className="st-cite" onMouseEnter={() => onCite(n)} onMouseLeave={() => onCite(null)} onFocus={() => onCite(n)} onBlur={() => onCite(null)}>
              {n}
            </button>
          );
        })}
      </p>
    ) : null,
  );
}

function Chat({ onCite }: { onCite: (n: number | null) => void }) {
  const [msgs, setMsgs] = useState<string[]>([QS[0]!]);
  const [draft, setDraft] = useState("");
  const ask = (q: string) => setMsgs((m) => [...m, q]);
  return (
    <section className="st-chat" aria-label="Hỏi sổ tay">
      <div className="st-thread">
        {msgs.map((q, i) => (
          <Turn key={i} q={q} onCite={onCite} />
        ))}
      </div>
      <div className="st-sugg">
        {QS.filter((q) => !msgs.includes(q)).map((q) => (
          <button key={q} type="button" onClick={() => ask(q)}>{q}</button>
        ))}
      </div>
      <form
        className="st-ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) ask(draft.trim());
          setDraft("");
        }}
      >
        <input className="input" placeholder="Hỏi về các nguồn của em…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Câu hỏi" />
        <button type="submit" className="btn icon ghost" aria-label="Gửi"><Icon name="send" /></button>
      </form>
    </section>
  );
}

function Turn({ q, onCite }: { q: string; onCite: (n: number | null) => void }) {
  const ans = ANSWERS[q] ?? `Trong các nguồn của em, phần gần nhất nằm ở SGK bài 15 [1] và video của thầy Long [2]. Em xem lại đoạn “thăng bằng electron” nhé.`;
  const s = useFakeStream(ans, { cps: 80, delayMs: 500 });
  return (
    <div className="st-turn">
      <div className="st-q">{q}</div>
      <StreamingText text={s.text} state={s.state} className="st-a" render={(t) => cited(t, onCite)} />
    </div>
  );
}

/* ---------------- Podcast 2 giọng ---------------- */
const BARS = 72;
function Podcast() {
  const [made, setMade] = useState(false);
  const [busy, setBusy] = useState(false);
  const gen = useFakeProgress(3000, busy);
  useEffect(() => {
    if (busy && gen >= 1) {
      setBusy(false);
      setMade(true);
    }
  }, [busy, gen]);
  const step = gen < 0.34 ? 0 : gen < 0.7 ? 1 : 2;
  return (
    <section className="st-pod">
      <div className="st-pod-h">
        <h2>Podcast</h2>
        <div className="st-hosts">
          {HOSTS.map((h) => (
            <span key={h.name} className="st-host">
              <i style={{ background: h.color }} />
              {h.name}
            </span>
          ))}
        </div>
      </div>
      {made ? (
        <Player />
      ) : busy ? (
        <ol className="st-gen">
          {["Đọc 4 nguồn", "Viết kịch bản 2 giọng", "Lồng tiếng"].map((t, i) => (
            <li key={t} className={i < step ? "ok" : i === step ? "now" : undefined}>
              <i>{i < step && <Icon name="check" size="sm" />}</i>
              {t}
            </li>
          ))}
          <div className="st-gen-bar"><i style={{ width: `${gen * 100}%` }} /></div>
        </ol>
      ) : (
        <div className="st-pod-empty">
          <Wave t={0} total={1} idle />
          <Button variant="primary" icon="mic" onClick={() => setBusy(true)}>Tạo podcast</Button>
        </div>
      )}
    </section>
  );
}

/** Sóng âm: mỗi vạch thuộc một người nói (theo câu); vạch đã phát đậm, đang phát nhảy theo nhịp. */
function Wave({ t, total, idle }: { t: number; total: number; idle?: boolean }) {
  const amp = useMemo(() => Array.from({ length: BARS }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43 + 1))), []);
  const at = (t / total) * BARS;
  return (
    <div className={idle ? "st-wave idle" : "st-wave"} aria-hidden="true">
      {amp.map((a, i) => {
        const who = SCRIPT[Math.min(SCRIPT.length - 1, Math.floor((i / BARS) * SCRIPT.length))]![0];
        const live = !idle && Math.abs(i - at) < 2.5;
        const jitter = live ? 0.6 + 0.4 * Math.abs(Math.sin(t * 9 + i)) : 1;
        return <i key={i} className={i < at ? "done" : live ? "live" : undefined} style={{ height: `${Math.round(a * jitter * 100)}%`, ["--wc" as string]: HOSTS[who]!.color }} />;
      })}
    </div>
  );
}

function Player() {
  const total = SCRIPT.length * LINE;
  const [play, setPlay] = useState(true);
  const [t, setT] = useClock(play);
  const tt = Math.min(total, t);
  useEffect(() => {
    if (t >= total && play) setPlay(false);
  }, [t, total, play]);
  const idx = Math.min(SCRIPT.length - 1, Math.floor(tt / LINE));
  const [who, line] = SCRIPT[idx]!;
  const fake = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const scale = 245 / total; // phát mô phỏng 4:05
  return (
    <div className="st-player">
      <div className="st-speakers">
        {HOSTS.map((h, i) => (
          <span key={h.name} className={play && i === who ? "talk" : undefined} style={{ ["--wc" as string]: h.color }}>
            <Face name={h.name} hue={h.hue} size={48} />
            {h.name}
          </span>
        ))}
      </div>
      <Wave t={tt} total={total} />
      <div className="st-ctl">
        <button type="button" aria-label={play ? "Dừng" : "Phát"} onClick={() => (tt >= total ? (setT(0), setPlay(true)) : setPlay(!play))}>
          <Icon name={play ? "pause" : "play"} />
        </button>
        <span className="num">{fake(tt * scale)} / {fake(total * scale)}</span>
        <span className="speed">1×</span>
      </div>
      <blockquote className="st-line" key={idx} style={{ ["--wc" as string]: HOSTS[who]!.color }}>
        <cite>{HOSTS[who]!.name}</cite>
        {line}
      </blockquote>
    </div>
  );
}

/* ---------------- Ghi chú + Co-Writer ---------------- */
function CoWriter() {
  const [ghost, setGhost] = useState(false);
  const [took, setTook] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGhost(true), 1800);
    return () => clearTimeout(t);
  }, []);
  const accept = () => ghost && setTook(true);
  return (
    <section className="st-note">
      <h2>Ghi chú</h2>
      <div className="st-paper" tabIndex={0} onKeyDown={(e) => e.key === "Tab" && ghost && !took && (e.preventDefault(), accept())} role="textbox" aria-label="Ghi chú của em">
        <p>Chất khử: nhường e, số oxi hoá tăng.</p>
        <p>
          {took ? (
            <span className="took">Chất oxi hoá: nhận e, số oxi hoá giảm.</span>
          ) : ghost ? (
            <button type="button" className="ghost" onClick={accept}>
              Chất oxi hoá: nhận e, số oxi hoá giảm. <kbd>Tab</kbd>
            </button>
          ) : (
            <span className="caret-blink" />
          )}
        </p>
      </div>
    </section>
  );
}
