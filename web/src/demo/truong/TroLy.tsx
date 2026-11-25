import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/components/Button";
import { StreamingText } from "../../ui/components/StreamingText";
import { useToast } from "../../ui/components/Toast";
import { Icon } from "../../ui/Icon";
import { useFakeStream } from "../kit/useFakeStream";
import { fmt } from "./data";

/* ---------------- Câu trả lời mẫu của AI nhà trường (chỉ số tổng hợp) ---------------- */
type Viz = "ky-nang" | "khoi-10" | "du-gio" | "chung";
type Ans = { q: string; a: string; viz: Viz; src: string };
const PRESET: Ans[] = [
  {
    q: "Vì sao 11A3 tụt môn Văn?",
    a: "11A3 tụt 0,6 điểm Văn trong tháng 11. Nguyên nhân chính nằm ở đọc hiểu nghị luận: 27/40 em sai cùng dạng câu xác định luận điểm. Các kỹ năng khác gần như giữ nguyên.",
    viz: "ky-nang",
    src: "1.204 bài làm của 11A3 · tháng 10–11",
  },
  {
    q: "So sánh khối 10 với năm ngoái",
    a: "Khối 10 năm nay trung bình 7,1, cao hơn năm ngoái 0,3. Tăng rõ nhất ở Hoá nhờ luyện tập theo lỗ hổng. Toán vẫn là môn thấp nhất khối và gần như đứng yên.",
    viz: "khoi-10",
    src: "Điểm học kỳ I hai năm học · 2 lớp khối 10",
  },
  {
    q: "Lớp nào cần dự giờ tuần này?",
    a: "Đề xuất dự giờ 2 lớp. Lịch trống của thầy phù hợp với cả hai tiết dưới đây.",
    viz: "du-gio",
    src: "Bản đồ điểm tháng 11 · thời khoá biểu tuần 13",
  },
];
const fallback = (q: string): Ans => ({
  q,
  a: "Tôi chỉ trả lời bằng số tổng hợp của toàn trường, khối và lớp. Thầy có thể hỏi về điểm, chuyên cần, tín hiệu sức khoẻ hay so sánh giữa các lớp; tôi sẽ kèm biểu đồ và nguồn số liệu.",
  viz: "chung",
  src: "Quy tắc quyền riêng tư của trường",
});

const SKILLS = [
  { k: "Đọc hiểu nghị luận", v: 5.2, d: -1.4 },
  { k: "Viết đoạn", v: 6.5, d: 0 },
  { k: "Tiếng Việt", v: 6.8, d: -0.1 },
  { k: "Văn bản thơ", v: 7.0, d: 0.1 },
];
const K10 = [
  { k: "Hoá học", d: 0.6 },
  { k: "Tiếng Anh", d: 0.4 },
  { k: "Ngữ văn", d: 0.2 },
  { k: "Lịch sử", d: 0.2 },
  { k: "Toán", d: 0.1 },
  { k: "Sinh học", d: -0.1 },
];
const VISITS = [
  { cls: "11A3", sub: "Ngữ văn", why: "tụt 0,6 điểm", slot: "Thứ Năm · tiết 3" },
  { cls: "10A2", sub: "Toán", why: "TB 6,4, thấp nhất trường", slot: "Thứ Sáu · tiết 2" },
];

const sgn = (d: number) => (Math.abs(d) < 0.05 ? "±0" : `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}`);

function VizView({ viz }: { viz: Viz }) {
  const toast = useToast();
  const [booked, setBooked] = useState<string[]>([]);
  if (viz === "ky-nang")
    return (
      <div className="ai-viz sk" role="img" aria-label={SKILLS.map((s) => `${s.k} ${fmt(s.v)}`).join(", ")}>
        {SKILLS.map((s, i) => (
          <div key={s.k} className={s.d < -0.5 ? "sk-row hot" : "sk-row"} style={{ ["--i" as string]: i }}>
            <span>{s.k}</span>
            <span className="bar"><i style={{ width: `${(s.v / 10) * 100}%` }} /></span>
            <b className="num">{fmt(s.v)}</b>
            <small className={s.d < -0.05 ? "num dn" : "num"}>{sgn(s.d)}</small>
          </div>
        ))}
      </div>
    );
  if (viz === "khoi-10") {
    const m = 0.8;
    return (
      <div className="ai-viz dv" role="img" aria-label={K10.map((s) => `${s.k} ${sgn(s.d)}`).join(", ")}>
        {K10.map((s, i) => (
          <div key={s.k} className="dv-row" style={{ ["--i" as string]: i }}>
            <span>{s.k}</span>
            <span className="axis">
              <i className={s.d >= 0 ? "pos" : "neg"} style={{ width: `${(Math.abs(s.d) / m) * 50}%` }} />
            </span>
            <small className={s.d < 0 ? "num dn" : "num up"}>{sgn(s.d)}</small>
          </div>
        ))}
      </div>
    );
  }
  if (viz === "du-gio")
    return (
      <ul className="ai-viz vs">
        {VISITS.map((v, i) => {
          const on = booked.includes(v.cls);
          return (
            <li key={v.cls} style={{ ["--i" as string]: i }}>
              <b className="vcls">{v.cls}</b>
              <span className="what">
                <b>{v.sub}</b>
                <small>{v.why}</small>
              </span>
              <span className="slot"><Icon name="cal" size="sm" /> {v.slot}</span>
              <Button
                size="sm"
                variant={on ? "default" : "primary"}
                icon={on ? "check" : "plus"}
                disabled={on}
                onClick={() => {
                  setBooked((b) => [...b, v.cls]);
                  toast({ title: `Đã xếp dự giờ ${v.cls}`, msg: `${v.slot}. GV bộ môn nhận thông báo.`, kind: "ok" });
                }}
              >
                {on ? "Đã xếp" : "Xếp lịch"}
              </Button>
            </li>
          );
        })}
      </ul>
    );
  return null;
}

function Answer({ ans, live }: { ans: Ans; live: boolean }) {
  const s = useFakeStream(ans.a, { run: live, delayMs: 700 });
  const text = live ? s.text : ans.a;
  const state = live ? s.state : "done";
  return (
    <div className="ai-a">
      <span className="ai-mark" aria-hidden="true"><Icon name="spark" size="sm" /></span>
      <div className="ai-body">
        {live && !s.text ? (
          <p className="ai-think"><i /><i /><i /> Đang tổng hợp số liệu</p>
        ) : (
          <StreamingText text={text} state={state} onStop={live ? s.stop : undefined} className="ai-t" />
        )}
        {state !== "streaming" && (
          <>
            <VizView viz={ans.viz} />
            <p className="ai-src"><Icon name="layers" size="sm" /> {ans.src}</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Nhà trường — Trò chuyện với AI nhà trường (AI tại trường, chỉ số tổng hợp, có biểu đồ + nguồn). */
export default function TroLy() {
  const [msgs, setMsgs] = useState<Ans[]>([PRESET[0]!]);
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, PRESET.find((p) => p.q === t) ?? fallback(t)]);
    setQ("");
  };
  useEffect(() => {
    if (msgs.length > 1) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);
  const asked = new Set(msgs.map((m) => m.q));
  return (
    <div className="tr-page ai">
      <div className="tr-head">
        <p className="eyebrow">AI nhà trường</p>
        <h1>Hỏi số liệu</h1>
        <p className="ai-local"><Icon name="lock" size="sm" /> Chạy trên máy chủ của trường · chỉ số tổng hợp</p>
      </div>
      <div className="ai-thread">
        {msgs.map((m, i) => (
          <div key={i} className="ai-turn">
            <p className="ai-q">{m.q}</p>
            <Answer ans={m} live={i === msgs.length - 1} />
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="ai-dock">
        <div className="ai-sug">
          {PRESET.filter((p) => !asked.has(p.q)).map((p) => (
            <button key={p.q} type="button" className="chip" onClick={() => ask(p.q)}>
              {p.q}
            </button>
          ))}
        </div>
        <form
          className="ai-in"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hỏi về điểm, lớp, chuyên cần…" aria-label="Câu hỏi cho AI nhà trường" />
          <Button variant="primary" icon="send" type="submit" aria-label="Gửi" />
        </form>
      </div>
    </div>
  );
}
