import { useState } from "react";
import { useSearchParams } from "react-router";
import { useFakeStream, useCountUp, usePhases, useTween } from "../kit";
import { Segmented } from "../../ui";
import { Icon } from "../../ui/Icon";
import { Head } from "./parts";

/** Chống ChatGPT làm hộ: (1) AI biến đề dễ chép thành đề chống AI, đồng hồ "ChatGPT làm hộ được" tụt dần;
 *  (2) nhận diện bài nghi AI viết bằng tín hiệu (quá trình viết, giọng văn), không kết luận thay GV. */
type Mode = "de" | "nhan-dien";
const MODES: { value: Mode; label: string }[] = [
  { value: "de", label: "Đề chống AI" },
  { value: "nhan-dien", label: "Nhận diện bài" },
];

export function ChongChatGpt() {
  const [sp] = useSearchParams();
  const [mode, setMode] = useState<Mode>((sp.get("che-do") as Mode) || "de");
  const [run, setRun] = useState(0);
  return (
    <div className="page gl gl-cg">
      <Head
        title="Chống ChatGPT"
        tabs={<Segmented label="Chế độ" options={MODES} value={mode} onChange={setMode} />}
        primary={mode === "de" ? { label: run ? "Biến đổi lại" : "Biến đổi đề", icon: "shield", onClick: () => setRun((r) => r + 1) } : { label: "Hẹn trao đổi", icon: "chat" }}
      />
      {mode === "de" ? <AntiAi run={run} /> : <Detect />}
    </div>
  );
}

/* ============ 1. Đề chống AI ============ */
const BEFORE = "Phân tích vẻ đẹp hình tượng người lính trong bài thơ Tây Tiến.";
const STEPS = [
  { tag: "Gắn trải nghiệm riêng", add: "Liên hệ một lần em xa nhà lâu nhất.", to: 71 },
  { tag: "Dùng dữ liệu tại lớp", add: "Bắt đầu từ câu thơ em đã chọn trong buổi đọc 21/11.", to: 52 },
  { tag: "Nộp cả quá trình", add: "Kèm 2 bản nháp có ghi chú lề.", to: 31 },
  { tag: "Bảo vệ miệng", add: "Trả lời 2 câu hỏi của cô trong 2 phút.", to: 14 },
];

function AntiAi({ run }: { run: number }) {
  const p = usePhases([500, ...STEPS.map(() => 1500)], run > 0, run);
  const n = run ? Math.max(0, p - 1) : 0;
  const risk = useTween(n ? STEPS[n - 1]!.to : 92, 900);
  return (
    <div className="gl-aa">
      <Gauge v={risk} />
      <div className="gl-aa-task">
        <span className="gl-eyebrow">Ngữ văn 12 · bài viết ở nhà</span>
        <p className={n ? "gl-aa-before dim" : "gl-aa-before"}>{BEFORE}</p>
        <ol className="gl-aa-adds">
          {STEPS.slice(0, n).map((s) => (
            <li key={s.tag}>
              <span className="gl-aa-tag">
                <Icon name="shield" size="sm" />
                {s.tag}
              </span>
              <Typed text={s.add} />
            </li>
          ))}
        </ol>
        {!run && (
          <p className="gl-aa-hint">
            <Icon name="info" size="sm" /> Đề này ChatGPT làm trọn trong 20 giây.
          </p>
        )}
      </div>
    </div>
  );
}

function Typed({ text }: { text: string }) {
  const s = useFakeStream(text, { cps: 60, delayMs: 200 });
  return <p className={s.state === "streaming" ? "caret" : undefined}>{s.text}</p>;
}

/** Đồng hồ nửa vòng: % ChatGPT làm hộ được (đỏ → xanh). */
function Gauge({ v }: { v: number }) {
  const a = Math.PI * (1 - v / 100);
  const R = 120;
  const nx = 150 + R * 0.82 * Math.cos(a);
  const ny = 150 - R * 0.82 * Math.sin(a);
  const hue = 8 + (1 - v / 100) * 132;
  return (
    <figure className="gl-gauge" aria-label={`ChatGPT làm hộ được ${Math.round(v)}%`}>
      <svg viewBox="0 0 300 170">
        <path d="M30 150 A120 120 0 0 1 270 150" className="gl-gauge-tr" />
        <path d="M30 150 A120 120 0 0 1 270 150" className="gl-gauge-v" pathLength={100} style={{ strokeDasharray: `${v} 100`, stroke: `hsl(${hue} 62% 44%)` }} />
        <line x1="150" y1="150" x2={nx} y2={ny} className="gl-gauge-n" />
        <circle cx="150" cy="150" r="7" className="gl-gauge-c" />
      </svg>
      <figcaption>
        <b className="num" style={{ color: `hsl(${hue} 62% 40%)` }}>{Math.round(v)}%</b>
        <span>ChatGPT làm hộ được</span>
      </figcaption>
    </figure>
  );
}

/* ============ 2. Nhận diện bài ============ */
const ESSAY: { t: string; s: number }[] = [
  { t: "Tây Tiến là một bài thơ hay mà em rất thích, nhất là đoạn tả đường hành quân.", s: 0.12 },
  { t: "Hình tượng người lính Tây Tiến hiện lên với vẻ đẹp hào hùng, bi tráng, mang đậm cảm hứng lãng mạn.", s: 0.78 },
  { t: "Bằng bút pháp tương phản đặc sắc, Quang Dũng đã khắc hoạ thành công sự hy sinh cao cả, đồng thời làm nổi bật lý tưởng sống cao đẹp của thế hệ thanh niên thời kỳ kháng chiến.", s: 0.93 },
  { t: "Qua đó, tác phẩm góp phần khẳng định giá trị nhân văn sâu sắc và vị trí quan trọng trong nền văn học Việt Nam hiện đại.", s: 0.9 },
  { t: "Đọc câu “Mắt trừng gửi mộng qua biên giới”, em nhớ ông nội kể về những năm đi bộ đội.", s: 0.08 },
];
/** Nhịp gõ 40 phút (ký tự/phút); phút 24 dán một lúc 1.240 ký tự. */
const TYPING = [40, 55, 62, 30, 0, 48, 66, 58, 44, 20, 0, 0, 36, 52, 61, 49, 33, 12, 0, 0, 0, 0, 0, 0, 1240, 0, 0, 18, 24, 30, 22, 0, 0, 14, 26, 31, 19, 8, 0, 0];

function Detect() {
  const p = usePhases([600, 1700, 900, 900, 900], true);
  const scan = p >= 1;
  const qs = useFakeStream("1. Em chọn chi tiết “bi tráng” từ câu thơ nào?\n2. “Bút pháp tương phản” ở đoạn em thích là gì?\n3. Ông nội em kể chuyện gì làm em nhớ đến bài thơ?", { run: p >= 4, cps: 70 });
  const score = useCountUp(p >= 3 ? 74 : 0, 1100);
  return (
    <div className="gl-dt">
      <article className={scan ? "gl-dt-essay scan" : "gl-dt-essay"}>
        <header>
          <span className="gl-eyebrow">Bài nộp · 11A3 · Lê Gia Hân</span>
          <span className="gl-dt-when">Nộp 21:31 · 612 chữ</span>
        </header>
        <p>
          {ESSAY.map((e, i) => (
            <span key={i} className="gl-dt-s" style={{ ["--s" as string]: scan ? e.s : 0, transitionDelay: `${300 + i * 280}ms` }}>
              {e.t}{" "}
            </span>
          ))}
        </p>
        <footer>
          <span><i className="hi" /> giống văn máy</span>
          <span><i className="lo" /> giọng riêng của em</span>
        </footer>
      </article>

      <aside className="gl-dt-side">
        <section>
          <span className="gl-eyebrow">Quá trình viết · 40 phút</span>
          <div className="gl-dt-bars" aria-label="Nhịp gõ theo phút">
            {TYPING.map((v, i) => (
              <i key={i} className={v > 200 ? "paste" : undefined} style={{ height: `${Math.min(100, (v / 70) * 100)}%`, animationDelay: `${i * 22}ms` }} />
            ))}
            {p >= 2 && <span className="gl-dt-paste">Dán 1.240 ký tự · 21:04</span>}
          </div>
        </section>
        <section className={p >= 3 ? "gl-dt-sig in" : "gl-dt-sig"}>
          <div className="gl-dt-score">
            <b className="num">{Math.round(score)}</b>
            <span>
              Mức nghi vấn
              <small>tín hiệu, không phải kết luận</small>
            </span>
          </div>
          <ul>
            <li><Icon name="clip" size="sm" /> Đoạn giữa được dán, không gõ</li>
            <li><Icon name="trend" size="sm" /> Câu dài gấp đôi 3 bài trước của em</li>
            <li><Icon name="quote" size="sm" /> Mở và kết là giọng riêng của em</li>
          </ul>
        </section>
        {p >= 4 && (
          <section className="gl-dt-ask">
            <span className="gl-eyebrow">Gợi ý hỏi lại em (2 phút)</span>
            <p className={qs.state === "streaming" ? "caret" : undefined}>{qs.text}</p>
          </section>
        )}
      </aside>
    </div>
  );
}
