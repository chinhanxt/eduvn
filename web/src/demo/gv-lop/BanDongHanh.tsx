import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useFakeStream, useTween, usePhases } from "../kit";
import { Button, Segmented } from "../../ui";
import { Icon } from "../../ui/Icon";
import { type CastId, Portrait } from "./Cast";
import { Head } from "./parts";

/** Bạn đồng hành AI cho HS: GV nặn tính cách bạn đồng hành, mở nhóm tranh luận AI, và phòng tập tư vấn (AI đóng vai phụ huynh). */
type Tab = "ban" | "tranh-luan" | "tu-van";
const TABS: { value: Tab; label: string }[] = [
  { value: "ban", label: "Bạn đồng hành" },
  { value: "tranh-luan", label: "Nhóm tranh luận" },
  { value: "tu-van", label: "Phòng tập tư vấn" },
];

export function BanDongHanh() {
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "ban");
  return (
    <div className="page gl gl-bdh">
      <Head title="Bạn đồng hành" tabs={<Segmented label="Chế độ" options={TABS} value={tab} onChange={setTab} />} primary={{ label: "Giao cho lớp", icon: "send" }} />
      {tab === "ban" ? <Companion /> : tab === "tranh-luan" ? <Debate /> : <Counsel />}
    </div>
  );
}

/* ============ 1. Nặn bạn đồng hành ============ */
const TRAITS = [
  { key: "hoi", label: "Hay hỏi lại" },
  { key: "hai", label: "Hài hước" },
  { key: "kien", label: "Kiên nhẫn" },
] as const;
type Traits = Record<(typeof TRAITS)[number]["key"], number>;

const REPLY: Record<keyof Traits, string> = {
  hoi: "Ừ, dài thật. Thế phần nào làm cậu ngán nhất: đọc đề hay tính toán? Chỉ ra một chỗ thôi, tớ với cậu xử lý chỗ đó trước.",
  hai: "Bài này dài như hàng chờ trà sữa giờ tan học ấy 😄 Nhưng tin vui: còn 2 câu là xong. Làm 1 câu rồi nghỉ 3 phút, chịu không?",
  kien: "Không sao đâu, mình chia nhỏ ra nhé. Câu 3 chỉ cần tìm hai nghiệm trước. Cậu thử bước đầu, tớ ngồi đây đợi.",
};
const top = (t: Traits) => (Object.keys(t) as (keyof Traits)[]).reduce((a, b) => (t[b] > t[a] ? b : a));

function Companion() {
  const [t, setT] = useState<Traits>({ hoi: 0.4, hai: 0.75, kien: 0.6 });
  const [ver, setVer] = useState(0);
  const mood = top(t);
  const s = useFakeStream(REPLY[mood], { key: `${mood}-${ver}`, cps: 46, delayMs: 700 });
  const set = (k: keyof Traits, v: number) => setT((x) => ({ ...x, [k]: v }));
  const focus = useTween(t.kien * 0.5 + t.hai * 0.35 + t.hoi * 0.15, 700);
  // đường tập trung 0–20 phút của Khánh Duy: tụt quanh phút 14; có Nhú gợi nghỉ ở phút 11 thì giữ được nhịp
  const sig = (x: number) => 1 / (1 + Math.exp(-x));
  const f = (m: number, boost: number) => {
    const base = 0.82 - 0.012 * m - 0.46 * sig((m - 14) * 0.9) + 0.035 * Math.sin(m * 1.4);
    const lift = boost * (0.5 * sig((m - 11.5) * 1.6) - 0.12 * Math.exp(-((m - 11.3) ** 2) / 0.4));
    return Math.max(0.08, Math.min(0.95, base + lift));
  };
  const X = (m: number) => m * 34;
  const Y = (v: number) => 112 - v * 100;
  const line = (boost: number) => Array.from({ length: 81 }, (_, i) => `${i ? "L" : "M"}${X(i / 4).toFixed(1)} ${Y(f(i / 4, boost)).toFixed(1)}`).join(" ");
  return (
    <div className="gl-comp">
      <section className="gl-comp-me">
        <div className="gl-comp-face" style={{ ["--hai" as string]: t.hai }}>
          <Portrait id="nhu" size={168} talk={s.state === "streaming" && !!s.text} />
        </div>
        <h2>Nhú</h2>
        <p className="gl-muted">Bạn đồng hành của Khánh Duy · 10A1</p>
        <div className="gl-traits">
          {TRAITS.map((tr) => (
            <label key={tr.key} className={mood === tr.key ? "on" : undefined}>
              <span>{tr.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={t[tr.key]}
                onChange={(e) => set(tr.key, Number(e.target.value))}
                onPointerUp={() => setVer((v) => v + 1)}
                onKeyUp={() => setVer((v) => v + 1)}
                style={{ ["--v" as string]: `${t[tr.key] * 100}%` }}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="gl-comp-chat" aria-label="Xem trước trò chuyện">
        <div className="gl-bub them">
          <Portrait id="khanhDuy" size={34} />
          <p>Bài này dài quá, em chán rồi.</p>
          <time>21:14</time>
        </div>
        <div className="gl-bub me" key={`${mood}-${ver}`}>
          <p className={s.state === "streaming" ? "caret" : undefined}>{s.text || <span className="gl-dots"><i /><i /><i /></span>}</p>
          <Portrait id="nhu" size={34} />
        </div>
        <figure className="gl-focus">
          <figcaption>
            <span className="gl-eyebrow">Độ tập trung · buổi tối 20 phút</span>
            <span className="gl-focus-k">
              <i className="a" /> có Nhú <i className="b" /> không có
            </span>
          </figcaption>
          <svg viewBox="0 0 680 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 112H680" className="gl-axis" />
            <path d={`M${X(14)} 4V112`} className="gl-guide dash" />
            <path d={line(0)} className="gl-focus-b" />
            <path d={line(focus)} className="gl-focus-a" />
            <circle cx={X(11)} cy={Y(f(11, focus))} r="5" className="gl-pt" />
          </svg>
          <div className="gl-focus-x">
            <span>0′</span>
            <span style={{ left: "55%" }}>Nhú gợi nghỉ</span>
            <span style={{ left: "70%" }}>mốc hay nản</span>
            <span style={{ right: 0 }}>20′</span>
          </div>
        </figure>
      </section>
    </div>
  );
}

/* ============ 2. Nhóm tranh luận ============ */
type Arg = { who: CastId; side: "ung" | "phan" | "trong"; text: string; tag: string };
const ARGS: Arg[] = [
  { who: "su", side: "ung", tag: "Dẫn chứng", text: "Nhóm học trên mạng giúp cả lớp hỏi bài lúc 10 giờ tối, khi thầy cô không trực." },
  { who: "tun", side: "phan", tag: "Số liệu", text: "Trung bình HS lướt 3,2 giờ mỗi ngày, gần bằng thời gian tự học." },
  { who: "su", side: "ung", tag: "Phản biện", text: "Vấn đề là cách dùng, không phải công cụ. Bỏ mạng xã hội là bỏ luôn kho học liệu." },
  { who: "tun", side: "phan", tag: "Lập luận", text: "Thuật toán được thiết kế để giữ chân, HS khó tự dừng dù biết cách dùng." },
  { who: "bon", side: "trong", tag: "Trọng tài", text: "Cả hai đều có lý. Luận điểm mạnh nhất: thuật toán giữ chân. Ý cần thêm: giải pháp cụ thể." },
];
const WEIGHT = [0.12, -0.14, 0.1, -0.16, 0];

function Debate() {
  const [run, setRun] = useState(0);
  const p = usePhases([600, 3200, 3200, 3200, 3200, 3600], true, run);
  const n = Math.min(ARGS.length, p);
  const pos = useTween(ARGS.slice(0, n).reduce((a, _, i) => a + WEIGHT[i]!, 0), 900);
  const cur = ARGS[n - 1];
  const s = useFakeStream(cur?.text ?? "", { run: !!cur, key: `${run}-${n}`, cps: 52, delayMs: 300 });
  return (
    <div className="gl-deb">
      <div className="gl-deb-topic">
        <span className="gl-eyebrow">Ngữ văn 11 · Nghị luận xã hội · 11A3</span>
        <h2>Mạng xã hội: lợi nhiều hơn hại với học sinh?</h2>
      </div>

      <div className="gl-rope" aria-label="Cán cân tranh luận">
        <div className="gl-rope-side ung">
          <Portrait id="su" size={56} talk={cur?.who === "su" && s.state === "streaming"} />
          <b>Ủng hộ</b>
        </div>
        <div className="gl-rope-track">
          <i className="gl-rope-mid" />
          <span className="gl-rope-knot" style={{ left: `${50 - pos * 100}%` }} />
        </div>
        <div className="gl-rope-side phan">
          <Portrait id="tun" size={56} talk={cur?.who === "tun" && s.state === "streaming"} />
          <b>Phản đối</b>
        </div>
      </div>

      <div className="gl-deb-cols">
        {(["ung", "phan"] as const).map((side) => (
          <ol key={side} className={`gl-deb-col ${side}`}>
            {ARGS.slice(0, n).map((a, i) =>
              a.side === side ? (
                <li key={i} className={i === n - 1 ? "now" : undefined}>
                  <span className="gl-deb-tag">{a.tag}</span>
                  <p className={i === n - 1 && s.state === "streaming" ? "caret" : undefined}>{i === n - 1 ? s.text : a.text}</p>
                </li>
              ) : null,
            )}
          </ol>
        ))}
      </div>

      {cur?.side === "trong" && (
        <div className="gl-deb-judge">
          <Portrait id="bon" size={44} talk={s.state === "streaming"} />
          <p className={s.state === "streaming" ? "caret" : undefined}>{s.text}</p>
        </div>
      )}
      <div className="gl-deb-acts">
        <Button size="sm" icon="mic" variant="ghost">Chen vào</Button>
        <Button size="sm" icon="refresh" variant="ghost" onClick={() => setRun((r) => r + 1)}>Tranh luận lại</Button>
      </div>
    </div>
  );
}

/* ============ 3. Phòng tập tư vấn ============ */
type Choice = { text: string; score: [number, number, number]; note: string; reply: string; mood: number };
const ROUNDS: { tu: string; choices: Choice[] }[] = [
  {
    tu: "Cô gọi tôi lên chắc thằng Duy lại hư gì. Nó lười thôi cô ạ, về tôi nói nó.",
    choices: [
      { text: "Dạ không ạ. Cháu gọi bác vì dạo này Duy hay thức khuya, cháu lo cho em.", score: [0.9, 0.7, 0.4], mood: 0.35, note: "Mở đầu bằng quan tâm, không phải lỗi.", reply: "Ờ… thức khuya thật. Đêm nào tôi cũng thấy đèn phòng nó sáng." },
      { text: "Điểm Toán của Duy tụt từ 6,8 xuống 5,6 trong 2 tuần ạ.", score: [0.3, 0.9, 0.2], mood: -0.2, note: "Số liệu đúng nhưng vào thẳng điểm kém dễ khiến phụ huynh phòng thủ.", reply: "Đấy, tôi đã bảo mà. Về tôi cấm điện thoại luôn." },
      { text: "Bác về nhắc em chăm hơn giúp cháu nhé.", score: [0.2, 0.3, 0.1], mood: -0.3, note: "Đẩy việc cho phụ huynh, chưa hiểu nguyên nhân.", reply: "Nhắc mãi rồi cô ơi, nó có nghe đâu." },
    ],
  },
  {
    tu: "Mà tôi già rồi, chữ nghĩa bây giờ tôi chịu, kèm nó sao được.",
    choices: [
      { text: "Bác không cần giảng bài đâu ạ. Tối bác chỉ cần hỏi Duy một câu, cháu gửi sẵn qua Zalo, có đọc to.", score: [0.8, 0.9, 0.95], mood: 0.45, note: "Giao việc vừa sức, có công cụ hỗ trợ cụ thể.", reply: "Một câu thôi à? Thế thì tôi làm được." },
      { text: "Bác thử cho em đi học thêm xem sao ạ.", score: [0.3, 0.5, 0.4], mood: 0, note: "Giải pháp tốn kém, chưa gắn với nguyên nhân.", reply: "Học thêm thì lại về khuya hơn chứ cô." },
    ],
  },
];

function Counsel() {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<Choice[]>([]);
  const cur = ROUNDS[round];
  const last = picked[picked.length - 1];
  const mood = useTween(picked.reduce((a, c) => a + c.mood, -0.2), 900);
  const sc = [0, 1, 2].map((k) => (picked.length ? picked.reduce((a, c) => a + c.score[k as 0 | 1 | 2], 0) / picked.length : 0));
  const answered = picked.length > round;
  const tuLine = useFakeStream(answered ? picked[round]!.reply : cur?.tu ?? "", { key: `${round}-${answered}-${picked.length}`, cps: 44, delayMs: 600 });
  useEffect(() => {
    if (!answered || tuLine.state !== "done" || round >= ROUNDS.length - 1) return;
    const t = setTimeout(() => setRound((r) => r + 1), 1100);
    return () => clearTimeout(t);
  }, [tuLine.state, answered, round]);
  const showChoices = cur && !answered && tuLine.state === "done";
  const finished = picked.length === ROUNDS.length;
  const hist = ROUNDS.slice(0, round + 1);
  return (
    <div className="gl-cs">
      <section className="gl-cs-stage">
        <div className="gl-cs-tu" style={{ ["--m" as string]: mood }}>
          <span className="gl-cs-ring" />
          <Portrait id="bacTu" size={120} talk={tuLine.state === "streaming" && !!tuLine.text} />
          <b>Bác Tư</b>
          <small>ông nội Khánh Duy · AI đóng vai</small>
          <span className="gl-cs-mood">{mood > 0.2 ? "Đã cởi mở" : mood > -0.05 ? "Đang nghe" : "Phòng thủ"}</span>
        </div>
        <div className="gl-cs-talk">
          {hist.map((r, i) => (
            <div key={i} className="gl-cs-turn">
              <div className="gl-bub them">
                <Portrait id="bacTu" size={30} />
                <p className={i === round && !answered && tuLine.state === "streaming" ? "caret" : undefined}>{i === round && !answered ? tuLine.text : r.tu}</p>
              </div>
              {picked[i] && (
                <>
                  <div className="gl-bub me plain">
                    <p>{picked[i]!.text}</p>
                  </div>
                  <div className="gl-bub them">
                    <Portrait id="bacTu" size={30} />
                    <p className={i === round && tuLine.state === "streaming" ? "caret" : undefined}>{i === round ? tuLine.text : picked[i]!.reply}</p>
                  </div>
                </>
              )}
            </div>
          ))}
          {showChoices && (
            <div className="gl-cs-choices" role="group" aria-label="Cô sẽ nói">
              {cur.choices.map((c) => (
                <button key={c.text} type="button" onClick={() => setPicked((p) => [...p, c])}>
                  {c.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="gl-cs-coach" aria-label="Huấn luyện viên AI">
        <span className="gl-eyebrow">Huấn luyện viên</span>
        {["Đồng cảm", "Rõ ràng", "Gợi hướng"].map((k, i) => (
          <Meter key={k} label={k} v={sc[i]!} />
        ))}
        <p className="gl-cs-note">{last ? last.note : "Chọn câu trả lời. AI chấm từng câu theo 3 tiêu chí."}</p>
        {finished && (
          <div className="gl-cs-done">
            <b className="num">{Math.round(((sc[0]! + sc[1]! + sc[2]!) / 3) * 100)}</b>
            <span>điểm buổi tập</span>
            <Button size="sm" variant="ghost" icon="refresh" onClick={() => { setPicked([]); setRound(0); }}>
              Tập lại
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Meter({ label, v }: { label: string; v: number }) {
  const x = useTween(v, 800);
  return (
    <div className="gl-meter">
      <span>{label}</span>
      <i><em style={{ width: `${x * 100}%` }} /></i>
      <b className="num">{Math.round(x * 100)}</b>
    </div>
  );
}

