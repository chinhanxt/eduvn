/** /gv/day-theo-nang-luc — Dạy theo năng lực (mô phỏng): AI gợi ý hoạt động dạy học tích cực, bánh xe năng lực/phẩm chất CTGDPT 2018 sáng dần, tiết 45 phút tự xếp. */
import { useEffect, useState } from "react";
import { Button } from "../../ui/components/Button";
import { Icon } from "../../ui/Icon";
import { CLASSES, NUMBERS, fmt1, useFakeStream, useCount } from "../kit";
import { Head } from "./common";

const C10A1 = CLASSES.find((c) => c.id === "10A1")!;

const CHUNG = ["Tự chủ và tự học", "Giao tiếp và hợp tác", "Giải quyết vấn đề và sáng tạo"];
const PHAM_CHAT = ["Yêu nước", "Nhân ái", "Chăm chỉ", "Trung thực", "Trách nhiệm"];
const PHASES = [
  { t: "Khởi động", m: 5 },
  { t: "Hình thành kiến thức", m: 15 },
  { t: "Luyện tập", m: 15 },
  { t: "Vận dụng", m: 10 },
];
type Act = { n: string; how: string; ph: number; ch: number[]; dt: number[]; pc: number[] };
type Subj = { id: string; label: string; cls: string; dac: string[]; why: string; acts: Act[] };
const SUBJ: Subj[] = [
  {
    id: "toan", label: "Toán 10 · Bất phương trình", cls: "10A1", dac: ["Tư duy và lập luận", "Mô hình hoá", "Giải quyết vấn đề", "Giao tiếp toán học", "Công cụ, phương tiện"],
    why: `Lớp ${C10A1.size} em, ${NUMBERS.needHelp.length} em cần giúp bất phương trình. Ưu tiên nhóm nhỏ có vai trò rõ và trạm theo trình độ.`,
    acts: [
      { n: "Đoán số cốc", how: "Cặp đôi đoán khoảng số cốc bán ra có lãi, kiểm lại bằng đồ thị", ph: 0, ch: [1], dt: [1], pc: [2] },
      { n: "Khăn trải bàn", how: "Nhóm 4, mỗi em xét dấu một tam thức rồi ghép thành quy tắc", ph: 1, ch: [1, 0], dt: [0, 3], pc: [4] },
      { n: "Trạm 3 mức", how: "Ba trạm dễ, vừa, khó; AI xếp từng em vào trạm vừa sức", ph: 2, ch: [0, 2], dt: [2, 4], pc: [2, 3] },
      { n: "Định giá cốc chanh", how: "Nhóm lập phương án giá bán cho quầy nước chanh hội trại của lớp", ph: 3, ch: [2], dt: [1, 2], pc: [4] },
    ],
  },
  {
    id: "van", label: "Ngữ văn 11 · Nghị luận", cls: "11A3", dac: ["Đọc", "Viết", "Nói và nghe", "Văn học"],
    why: `Lớp 11A3 tụt ${fmt1(NUMBERS.class11A3VanDrop)} điểm môn Văn so với tháng trước. Tăng hoạt động đọc có mục đích và nói trước nhóm.`,
    acts: [
      { n: "Tranh biện 60 giây", how: "Hai bạn tranh luận nhanh một nhận định gây tranh cãi", ph: 0, ch: [1], dt: [2], pc: [3] },
      { n: "Mảnh ghép luận điểm", how: "Mỗi nhóm chuyên sâu một luận điểm rồi ghép lại", ph: 1, ch: [1, 0], dt: [0], pc: [4] },
      { n: "Sơ đồ lập luận", how: "Vẽ sơ đồ luận điểm – lí lẽ – bằng chứng của văn bản", ph: 2, ch: [2], dt: [0, 1], pc: [2] },
      { n: "Viết đoạn phản biện", how: "Viết 150 chữ phản biện một ý kiến, bạn cùng bàn góp ý", ph: 3, ch: [2, 0], dt: [1, 3], pc: [3, 4] },
    ],
  },
  {
    id: "khtn", label: "KHTN 8 · Hệ tuần hoàn", cls: "8A2", dac: ["Nhận thức khoa học", "Tìm hiểu tự nhiên", "Vận dụng kiến thức"],
    why: "Học sinh lớp 8 học tốt qua trải nghiệm. Cho các em đo, làm mô hình và tự rút ra kết luận.",
    acts: [
      { n: "Đo nhịp tim", how: "Đo nhịp tim trước và sau khi nhảy dây 30 giây", ph: 0, ch: [0], dt: [1], pc: [2] },
      { n: "Mô hình dòng máu", how: "Dùng ống và nước màu dựng vòng tuần hoàn lớn, nhỏ", ph: 1, ch: [1], dt: [0], pc: [4] },
      { n: "Trạm học tập", how: "4 trạm: tim, mạch, máu, sơ cứu; xoay vòng 4 phút mỗi trạm", ph: 2, ch: [1, 2], dt: [0, 1], pc: [2, 3] },
      { n: "Thói quen tim khoẻ", how: "Lập kế hoạch vận động một tuần cho bản thân", ph: 3, ch: [2], dt: [2], pc: [1, 4] },
    ],
  },
  {
    id: "su", label: "Lịch sử 12 · Điện Biên Phủ", cls: "12A1", dac: ["Tìm hiểu lịch sử", "Nhận thức và tư duy", "Vận dụng kiến thức"],
    why: "Bài nhiều sự kiện. Dùng tư liệu gốc và nhập vai để nhớ bằng câu chuyện, không học thuộc.",
    acts: [
      { n: "Một ảnh, một câu hỏi", how: "Xem ảnh tư liệu, mỗi em đặt một câu hỏi lịch sử", ph: 0, ch: [2], dt: [0], pc: [0] },
      { n: "Phòng tranh chiến dịch", how: "Nhóm dựng 3 đợt tấn công thành phòng tranh có chú thích", ph: 1, ch: [1], dt: [0, 1], pc: [0, 2] },
      { n: "Phóng viên chiến trường", how: "Nhập vai viết bản tin ngày 7/5/1954", ph: 2, ch: [1, 2], dt: [1], pc: [3, 4] },
      { n: "Bảo tàng nhỏ", how: "Dự án nhỏ: sưu tầm kỉ vật, câu chuyện từ người thân", ph: 3, ch: [0, 2], dt: [2], pc: [0, 1] },
    ],
  },
];

export function NangLuc() {
  const [sid, setSid] = useState("toan");
  const [run, setRun] = useState(0);
  const S = SUBJ.find((x) => x.id === sid)!;
  const why = useFakeStream(S.why, { run: run > 0, cps: 120, delayMs: 200, key: `${sid}${run}` });
  const shown = useCount(S.acts.length, 3200, run > 0 && why.state === "done", `${sid}${run}`);
  const [on, setOn] = useState<number[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => setOn([]), [sid, run]);
  useEffect(() => {
    if (shown > 0) setOn((o) => (o.includes(shown - 1) ? o : [...o, shown - 1]));
  }, [shown]);
  const pick = (i: number) => setOn((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));
  const acts = on.map((i) => S.acts[i]!);
  const lvl = (key: "ch" | "dt" | "pc", k: number) => acts.filter((a) => a[key].includes(k)).length;
  const hot = (hover !== null ? S.acts[hover] : null) ?? null;
  const total = CHUNG.length + S.dac.length + PHAM_CHAT.length;
  const lit = CHUNG.filter((_, k) => lvl("ch", k)).length + S.dac.filter((_, k) => lvl("dt", k)).length + PHAM_CHAT.filter((_, k) => lvl("pc", k)).length;

  return (
    <>
      <Head title="Dạy theo năng lực" primary={{ label: "Gợi ý hoạt động", icon: "spark", onClick: () => setRun((r) => r + 1) }} />
      <div className="gs-nl-subj" role="radiogroup" aria-label="Bài dạy">
        {SUBJ.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={sid === x.id} onClick={() => { setSid(x.id); setRun(0); }}>
            {x.label}
            <small>{x.cls}</small>
          </button>
        ))}
      </div>
      <div className="gs-nl">
        <div className="gs-nl-wheel">
          <Wheel S={S} lvl={lvl} hot={hot} lit={lit} total={total} />
          <div className="gs-nl-legend">
            {[
              { t: "Năng lực chung", list: CHUNG, key: "ch" as const, c: "var(--gs-c1)" },
              { t: "Năng lực đặc thù", list: S.dac, key: "dt" as const, c: "var(--gs-c2)" },
              { t: "Phẩm chất", list: PHAM_CHAT, key: "pc" as const, c: "var(--gs-c4)" },
            ].map((g) => (
              <div key={g.t} style={{ ["--c" as string]: g.c }}>
                <b>{g.t}</b>
                <ul>
                  {g.list.map((n, k) => (
                    <li key={n} className={[lvl(g.key, k) && "on", hot?.[g.key].includes(k) && "hot"].filter(Boolean).join(" ")}>{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <section className="gs-nl-acts">
          {run === 0 ? (
            <div className="gs-nl-ghost">
              {S.acts.map((a) => <div key={a.n}><b>{a.n}</b><span>{PHASES[a.ph]!.t}</span></div>)}
            </div>
          ) : (
            <>
              <p className={why.state === "streaming" ? "gs-nl-why caret-end" : "gs-nl-why"}>{why.text}</p>
              <ol className="gs-nl-list">
                {S.acts.slice(0, shown).map((a, i) => (
                  <li key={a.n} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={on.includes(i) ? "on" : undefined} style={{ ["--c" as string]: `var(--gs-c${a.ph + 1})` }}>
                    <span className="gs-nl-ph">{PHASES[a.ph]!.t} · {PHASES[a.ph]!.m}′</span>
                    <b>{a.n}</b>
                    <p>{a.how}</p>
                    <button type="button" aria-pressed={on.includes(i)} aria-label={on.includes(i) ? `Bỏ ${a.n}` : `Thêm ${a.n}`} onClick={() => pick(i)}>
                      <Icon name={on.includes(i) ? "check" : "plus"} size="sm" />
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
      <div className="gs-nl-plan" aria-label="Tiết 45 phút">
        {PHASES.map((p, k) => {
          const a = acts.find((x) => x.ph === k);
          return (
            <div key={p.t} style={{ flexGrow: p.m, ["--c" as string]: `var(--gs-c${k + 1})` }} className={a ? "on" : undefined}>
              <small>{p.t} · {p.m}′</small>
              <b>{a?.n ?? "—"}</b>
            </div>
          );
        })}
      </div>
      {acts.length === S.acts.length && (
        <div className="gs-acts gs-nl-go">
          <Button variant="ghost" icon="clip">Đưa vào kế hoạch bài dạy</Button>
        </div>
      )}
    </>
  );
}

/** Bánh xe 3 vòng: trong = năng lực chung, giữa = năng lực đặc thù môn, ngoài = phẩm chất. */
function Wheel({ S, lvl, hot, lit, total }: { S: Subj; lvl: (k: "ch" | "dt" | "pc", i: number) => number; hot: Act | null; lit: number; total: number }) {
  const rings = [
    { key: "ch" as const, list: CHUNG, r0: 62, r1: 104, c: "var(--gs-c1)" },
    { key: "dt" as const, list: S.dac, r0: 110, r1: 152, c: "var(--gs-c2)" },
    { key: "pc" as const, list: PHAM_CHAT, r0: 158, r1: 194, c: "var(--gs-c4)" },
  ];
  return (
    <svg viewBox="0 0 400 400" className="gs-wheel" role="img" aria-label={`Bao phủ ${lit}/${total} năng lực, phẩm chất`}>
      {rings.map((rg, ri) =>
        rg.list.map((n, k) => {
          const a0 = (k / rg.list.length) * 360 + 1.2;
          const a1 = ((k + 1) / rg.list.length) * 360 - 1.2;
          const v = lvl(rg.key, k);
          const isHot = !!hot?.[rg.key].includes(k);
          return (
            <path key={`${ri}-${n}`} d={arc(rg.r0, rg.r1, a0, a1)} className={["gs-seg", v > 0 && "on", v > 1 && "on2", isHot && "hot"].filter(Boolean).join(" ")} style={{ ["--c" as string]: rg.c, ["--k" as string]: k }}>
              <title>{n}</title>
            </path>
          );
        }),
      )}
      <text x={200} y={204} className="gs-wheel-n">{lit}</text>
      <text x={200} y={228} className="gs-wheel-s">/ {total}</text>
    </svg>
  );
}
function arc(r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(200 + r * Math.cos(t)).toFixed(2)} ${(200 + r * Math.sin(t)).toFixed(2)}`;
  };
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${big} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${big} 0 ${p(r0, a0)} Z`;
}
