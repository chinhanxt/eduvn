import { useState } from "react";
import { Button, Icon, Segmented, StreamingText, useToast } from "../../ui";
import { NUMBERS, useFakeStream } from "../kit";
import { KPIS, ROWS, SUBJECTS, TEACHER_ROWS, avg, fmt, schoolAvg, type ClassRow } from "./data";
import { useAfter, useCount } from "./hooks";

const SPAN = 1.2; // ±1,2 điểm quanh TB toàn trường là màu đậm nhất

function cellStyle(v: number) {
  const d = Math.max(-1, Math.min(1, (v - schoolAvg) / SPAN));
  const p = Math.round(Math.abs(d) * 100);
  const pole = d < 0 ? "var(--div-neg-2)" : "var(--div-pos-2)";
  return { background: `color-mix(in oklab, ${pole} ${p}%, var(--div-mid))`, color: p > 58 ? "#fff" : "var(--ink)" };
}

function Kpi({ k, i }: { k: (typeof KPIS)[number]; i: number }) {
  const n = useCount(k.value, true, 1100, 120 + i * 90);
  return (
    <div className={k.alert ? "tr-kpi alert" : "tr-kpi"} style={{ ["--i" as string]: i }}>
      <b className="num">{k.dec ? fmt(n, k.dec) : Math.round(n).toLocaleString("vi-VN")}</b>
      <span>
        {k.alert && <Icon name="alert" size="sm" />}
        {k.label}
        {k.delta && <em className="up">{k.delta}</em>}
      </span>
    </div>
  );
}

/** Bản đồ điểm: lớp × môn, màu phân kỳ quanh TB toàn trường. */
function HeatMap({ subject, onPick }: { subject: number | null; onPick: (i: number | null) => void }) {
  const pin = useAfter(1500);
  return (
    <section className="tr-sec tr-heat" aria-labelledby="tr-hm">
      <div className="tr-sec-h">
        <h2 id="tr-hm">Bản đồ điểm</h2>
        <span className="grow" />
        <span className="tr-legend" aria-hidden="true">
          <span>thấp</span>
          <i className="ramp" />
          <span>cao</span>
        </span>
      </div>
      <div className="hm" role="table" aria-label="Điểm trung bình theo lớp và môn">
        <div className="hm-row hd" role="row">
          <span role="columnheader" />
          {SUBJECTS.map((s, j) => (
            <button key={s} type="button" role="columnheader" className={subject === j ? "on" : undefined} onClick={() => onPick(subject === j ? null : j)} title={`So sánh môn ${s}`}>
              {s.replace("Tiếng ", "T. ").replace(" học", "").replace("Lịch sử", "Sử").replace("Địa lí", "Địa")}
            </button>
          ))}
        </div>
        {ROWS.map((r, i) => (
          <div key={r.id} className="hm-row" role="row">
            <span role="rowheader" className="rh">{r.id}</span>
            {r.now.map((v, j) => {
              const hot = r.id === "11A3" && j === 1;
              const dim = subject !== null && subject !== j;
              return (
                <span
                  key={j}
                  role="cell"
                  className={["c", hot && "hot", hot && pin && "pin", dim && "dim"].filter(Boolean).join(" ")}
                  style={{ ...cellStyle(v), ["--d" as string]: `${(i + j) * 28}ms` }}
                  data-tip={`${r.id} · ${SUBJECTS[j]}: ${fmt(v)} (tháng trước ${fmt(r.prev[j]!)})`}
                >
                  {fmt(v)}
                  {hot && <i className="flag">−{fmt(NUMBERS.class11A3VanDrop)}</i>}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function Spark({ pts }: { pts: number[] }) {
  const w = 160, h = 48, lo = Math.min(...pts) - 0.2, hi = Math.max(...pts) + 0.2;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * (w - 8) + 4, h - 4 - ((p - lo) / (hi - lo)) * (h - 8)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1]!;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} pathLength={1} />
      <circle cx={last[0]} cy={last[1]} r="4.5" />
    </svg>
  );
}

const ADVICE =
  "Tụt tập trung ở đọc hiểu nghị luận, 27/40 em sai cùng dạng câu. Đề xuất: tổ Văn dự giờ 11A3 tuần này và giao bài phân hoá 3 mức cho phần nghị luận.";

function Alerts() {
  const toast = useToast();
  const go = useAfter(1900);
  const s = useFakeStream(ADVICE, { run: go, delayMs: 200 });
  const [sent, setSent] = useState(false);
  return (
    <section className="tr-sec tr-alerts" aria-labelledby="tr-al">
      <div className="tr-sec-h">
        <h2 id="tr-al">Cảnh báo sớm</h2>
      </div>
      <div className="al-main">
        <div className="al-top">
          <span className="al-big num">−{fmt(NUMBERS.class11A3VanDrop)}</span>
          <span className="al-what">
            <b>11A3 · Ngữ văn</b>
            <small>so với tháng trước</small>
          </span>
          <Spark pts={[6.9, 6.8, 6.9, 6.8, 6.7, 6.1]} />
        </div>
        <div className="al-ai">
          <span className="al-ai-h"><Icon name="spark" size="sm" /> AI nhà trường</span>
          <StreamingText text={s.text} state={s.state} className="al-ai-t" />
        </div>
        <Button
          variant="primary"
          icon={sent ? "check" : "send"}
          disabled={sent}
          onClick={() =>
            new Promise<void>((ok) =>
              setTimeout(() => {
                setSent(true);
                toast({ title: "Đã giao tổ Văn", msg: "Thầy Bảo và tổ trưởng nhận việc kèm số liệu.", kind: "ok" });
                ok();
              }, 700),
            )
          }
        >
          {sent ? "Đã giao" : "Giao tổ Văn"}
        </Button>
      </div>
      <div className="al-kids">
        <span className="al-n num">{NUMBERS.earlyWarnings}</span>
        <span className="al-dots" aria-hidden="true">
          {Array.from({ length: NUMBERS.earlyWarnings }, (_, i) => (
            <i key={i} style={{ ["--i" as string]: i }} />
          ))}
        </span>
        <span className="al-kids-t">
          <b>em cần chú ý</b>
          <small><Icon name="lock" size="sm" /> Tên chỉ GV chủ nhiệm thấy</small>
        </span>
      </div>
    </section>
  );
}

type Row = { id: string; sub?: string; prev: number; now: number };

function Dumbbell({ rows, lo, hi, hot }: { rows: Row[]; lo: number; hi: number; hot?: string }) {
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="db" role="list">
      {rows.map((r, i) => {
        const up = r.now - r.prev > -0.05;
        const d = r.now - r.prev;
        return (
          <div key={r.id} role="listitem" className={["db-row", r.id === hot && "hot"].filter(Boolean).join(" ")} style={{ ["--i" as string]: i }} title={`${r.id}: ${fmt(r.prev)} → ${fmt(r.now)}`}>
            <span className="db-l">
              <b>{r.id}</b>
              {r.sub && <small>{r.sub}</small>}
            </span>
            <span className="db-track">
              <i className={up ? "seg up" : "seg dn"} style={{ left: x(Math.min(r.prev, r.now)), width: `calc(${x(Math.max(r.prev, r.now))} - ${x(Math.min(r.prev, r.now))})` }} />
              <i className="dot prev" style={{ left: x(r.prev) }} />
              <i className={up ? "dot now up" : "dot now dn"} style={{ left: x(r.now) }} />
            </span>
            <span className={up ? "db-v up" : "db-v dn"}>
              <b className="num">{fmt(r.now)}</b>
              <small className="num">{Math.abs(d) < 0.05 ? "±0" : `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}`}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Compare({ subject, onPick }: { subject: number | null; onPick: (i: number | null) => void }) {
  const [by, setBy] = useState<"lop" | "gv">("lop");
  const pick = (r: ClassRow): Row =>
    subject === null ? { id: r.id, prev: avg(r.prev), now: avg(r.now) } : { id: r.id, prev: r.prev[subject]!, now: r.now[subject]! };
  const cls = ROWS.map(pick).sort((a, b) => a.now - b.now);
  const gv = [...TEACHER_ROWS].sort((a, b) => a.now - b.now).map((t) => ({ id: t.name, sub: t.subject, prev: t.prev, now: t.now }));
  return (
    <section className="tr-sec tr-cmp" aria-labelledby="tr-cmp">
      <div className="tr-sec-h">
        <h2 id="tr-cmp">So sánh</h2>
        <Segmented
          label="So sánh theo"
          value={by}
          onChange={setBy}
          options={[
            { value: "lop", label: "Lớp" },
            { value: "gv", label: "Giáo viên" },
          ]}
        />
        <span className="grow" />
        {by === "lop" && (
          <button type="button" className={subject === null ? "chip" : "chip"} aria-pressed={subject !== null} onClick={() => onPick(subject === null ? 1 : null)}>
            {subject === null ? "Mọi môn" : SUBJECTS[subject]}
            {subject !== null && <Icon name="x" size="sm" />}
          </button>
        )}
        <span className="tr-legend sm" aria-hidden="true">
          <i className="o" /> tháng trước <i className="f" /> tháng này
        </span>
      </div>
      {by === "lop" ? (
        <Dumbbell key={`l${subject}`} rows={cls} lo={Math.floor(Math.min(...cls.flatMap((r) => [r.now, r.prev])) * 2) / 2 - 0.25} hi={Math.ceil(Math.max(...cls.flatMap((r) => [r.now, r.prev])) * 2) / 2 + 0.25} hot="11A3" />
      ) : (
        <Dumbbell key="g" rows={gv} lo={6} hi={8.25} />
      )}
      {by === "gv" && <p className="tr-note"><Icon name="info" size="sm" /> Để hỗ trợ, không để xếp hạng. GV chỉ thấy số của mình.</p>}
    </section>
  );
}

/** Nhà trường — Toàn trường: KPI, bản đồ điểm lớp × môn, cảnh báo sớm, so sánh lớp/GV. */
export default function ToanTruong() {
  const [subject, setSubject] = useState<number | null>(null);
  return (
    <div className="tr-page">
      <div className="tr-head">
        <p className="eyebrow">Học kỳ I · tháng 11</p>
        <h1>Toàn trường</h1>
      </div>
      <div className="tr-kpis">
        {KPIS.map((k, i) => (
          <Kpi key={k.label} k={k} i={i} />
        ))}
      </div>
      <div className="tr-grid">
        <HeatMap subject={subject} onPick={setSubject} />
        <Alerts />
      </div>
      <Compare subject={subject} onPick={setSubject} />
    </div>
  );
}
