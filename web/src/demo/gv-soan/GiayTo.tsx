/** /gv/giay-to — Giấy tờ GV (mô phỏng): kế hoạch bài dạy CV 5512 tự viết, sổ đầu bài tự điền, báo cáo tổ tự dựng, đẩy điểm lên VNEdu / SMAS một chạm. */
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/components/Button";
import { Tabs } from "../../ui/components/Tabs";
import { useToast } from "../../ui/components/Toast";
import { Icon } from "../../ui/Icon";
import { CLASSES, DEMO_DAY, NUMBERS, ROSTER_10A1, useFakeStream, useCount } from "../kit";
import { Head } from "./common";
import { HA, LESSON, SCHOOL } from "./data";

const HELP = NUMBERS.needHelp.length;

type Tab = "khbd" | "sdb" | "bc" | "dong-bo";

export function GiayTo() {
  const [tab, setTab] = useState<Tab>("khbd");
  return (
    <>
      <Head
        title="Giấy tờ"
        tabs={
          <Tabs
            label="Loại giấy tờ"
            value={tab}
            onChange={setTab}
            items={[
              { value: "khbd", label: "Kế hoạch bài dạy" },
              { value: "sdb", label: "Sổ đầu bài" },
              { value: "bc", label: "Báo cáo tổ" },
              { value: "dong-bo", label: "VNEdu · SMAS" },
            ]}
          />
        }
      />
      <div className="gs-gt" key={tab}>
        {tab === "khbd" && <Khbd />}
        {tab === "sdb" && <SoDauBai />}
        {tab === "bc" && <BaoCao />}
        {tab === "dong-bo" && <DongBo />}
      </div>
    </>
  );
}

/* ---------- Kế hoạch bài dạy theo Phụ lục IV, CV 5512 ---------- */
const KHBD = [
  "# I. Mục tiêu",
  "## 1. Về kiến thức",
  "Nhận biết bất phương trình bậc hai một ẩn; giải được bằng cách xét dấu tam thức bậc hai.",
  "## 2. Về năng lực",
  "Tư duy và lập luận toán học: giải thích vì sao chọn khoảng nghiệm. Mô hình hoá: lập bất phương trình từ bài toán tiền lãi bán vé.",
  "## 3. Về phẩm chất",
  "Chăm chỉ, trách nhiệm khi làm việc nhóm; trung thực khi tự đánh giá.",
  "# II. Thiết bị dạy học và học liệu",
  "Bài giảng 7 slide, phiếu học tập 3 mức, bảng giảng có đồ thị parabol.",
  "# III. Tiến trình dạy học",
  "## Hoạt động 1: Mở đầu (5 phút)",
  "a) Mục tiêu: gợi nhu cầu giải bất phương trình bậc hai từ tình huống đời thực.",
  "b) Nội dung: bài toán rạp phim, lãi P(x) = −x² + 40x − 300.",
  "c) Sản phẩm: dự đoán của các nhóm về số vé có lãi.",
  "d) Tổ chức thực hiện: GV chiếu slide, HS thảo luận cặp đôi 2 phút.",
  "## Hoạt động 2: Hình thành kiến thức (15 phút)",
  "a) Mục tiêu: nắm quy tắc xét dấu và ba bước giải.",
  `d) Tổ chức thực hiện: kĩ thuật khăn trải bàn; GV chú ý ${HELP} em cần giúp (${NUMBERS.needHelp.join(", ")}).`,
  "## Hoạt động 3: Luyện tập (15 phút)",
  "Phiếu 3 mức, AI giao theo trình độ từng em.",
  "## Hoạt động 4: Vận dụng (10 phút)",
  "Trả lời câu hỏi mở đầu; giao bài về nhà có câu bẫy Δ < 0.",
].join("\n");
const KHBD_SECS = ["I. Mục tiêu", "II. Thiết bị dạy học và học liệu", "III. Tiến trình dạy học"];

function Khbd() {
  const [run, setRun] = useState(0);
  const s = useFakeStream(KHBD, { run: run > 0, cps: 260, delayMs: 300, key: run });
  const text = run > 0 ? s.text : "";
  const lines = text.split("\n");
  const done = run > 0 && s.state === "done";
  const toast = useToast();
  return (
    <div className="gs-doc-wrap">
      <aside className="gs-doc-side">
        <ol className="gs-doc-toc">
          {KHBD_SECS.map((t) => (
            <li key={t} data-st={text.includes(`# ${t}`) ? (done || KHBD_SECS.indexOf(t) < KHBD_SECS.findLastIndex((x) => text.includes(`# ${x}`)) ? "done" : "now") : "todo"}>{t}</li>
          ))}
        </ol>
        {run === 0 ? (
          <Button variant="primary" icon="spark" onClick={() => setRun(1)} data-testid="gt-soan">Viết kế hoạch</Button>
        ) : (
          <Button icon="down" disabled={!done} onClick={() => toast({ kind: "ok", title: "Đã tải KHBD-BPT-bac-hai.docx" })}>Tải .docx</Button>
        )}
      </aside>
      <article className="gs-a4" aria-label="Kế hoạch bài dạy">
        <header className="gs-a4-hd">
          <div>
            <div>Trường: {SCHOOL.name}</div>
            <div>Tổ: Toán – Tin</div>
          </div>
          <div>Họ và tên giáo viên: {HA.name}</div>
        </header>
        <h2 className="gs-a4-t">
          <small>Tên bài dạy</small>
          {LESSON.title.toUpperCase()}
        </h2>
        <p className="gs-a4-sub">Môn học: Toán; lớp: 10A1 · Thời gian thực hiện: 1 tiết</p>
        <div className={run > 0 && !done ? "gs-a4-body caret-end" : "gs-a4-body"}>
          {run === 0 ? <div className="gs-a4-ghost" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ width: `${[38, 92, 80, 60, 95, 72, 40, 88, 66][i]}%` }} />)}</div> : lines.map((l, i) => {
            if (l.startsWith("## ")) return <h4 key={i}>{l.slice(3)}</h4>;
            if (l.startsWith("# ")) return <h3 key={i}>{l.slice(2)}</h3>;
            return l ? <p key={i}>{l}</p> : null;
          })}
        </div>
        {done && <span className="gs-stamp">Đúng mẫu<br />CV 5512</span>}
      </article>
    </div>
  );
}

/* ---------- Sổ đầu bài ---------- */
const DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu"].map((d, i) => `${d} ${DEMO_DAY.monday + i}/${DEMO_DAY.month}`);
const TKB: [string, string, string, number, string][][] = [
  [
    ["Chào cờ", "Sinh hoạt dưới cờ", "", 0, ""],
    ["Toán", "Bất phương trình bậc hai (t1)", "cô Hà", 0, `Lớp sôi nổi, ${HELP} em cần giúp bất phương trình`],
    ["Ngữ văn", "Đọc hiểu văn bản nghị luận", "thầy Bảo", 1, "Vắng: Đức Thịnh (có phép)"],
    ["Hoá học", "Phản ứng oxi hoá – khử", "thầy Long", 0, "Thí nghiệm an toàn, đúng giờ"],
    ["Tiếng Anh", "Unit 6 · Present perfect", "thầy Minh", 0, "Nói tốt, cần luyện nghe"],
  ],
  [
    ["Lịch sử", "Chiến dịch Điện Biên Phủ", "cô Phương", 0, "Làm infographic theo nhóm"],
    ["Toán", "Bất phương trình bậc hai (t2)", "cô Hà", 0, "Luyện tập phân hoá 3 mức"],
    ["Địa lí", "Vòng tuần hoàn của nước", "cô Phương", 0, "Xem hoạt hình, thảo luận"],
    ["Sinh học", "Di truyền Mendel", "cô Lan", 2, "Vắng 2, đã báo phụ huynh"],
    ["Thể dục", "Chạy bền", "", 0, ""],
  ],
];
const ROWS = (d: number) => TKB[d % TKB.length]!;

function SoDauBai() {
  const [day, setDay] = useState(0);
  const [fill, setFill] = useState(0);
  const rows = ROWS(day);
  const filled = useCount(rows.length, 2600, fill > 0, `${day}-${fill}`);
  const [signed, setSigned] = useState(false);
  useEffect(() => setSigned(false), [day, fill]);
  return (
    <div className="gs-sdb">
      <div className="gs-sdb-days" role="tablist" aria-label="Ngày">
        {DAYS.map((d, i) => (
          <button key={d} type="button" role="tab" aria-selected={day === i} onClick={() => { setDay(i); setFill(0); }}>
            <b>{d.split(" ")[0]} {d.split(" ")[1]}</b>
            <small className="num">{d.split(" ")[2]}</small>
          </button>
        ))}
      </div>
      <div className="gs-ledger">
        <div className="gs-ledger-hd">
          <span className="eyebrow">Sổ đầu bài · 10A1 · Tuần {DEMO_DAY.week}</span>
          {fill === 0 ? (
            <Button variant="primary" icon="spark" onClick={() => setFill((f) => f + 1)} data-testid="gt-dien">Tự điền</Button>
          ) : (
            <Button icon={signed ? "checkc" : "pen"} disabled={filled < rows.length || signed} onClick={() => setSigned(true)}>{signed ? "Đã ký" : "Ký số"}</Button>
          )}
        </div>
        <table className="gs-ledger-t">
          <thead>
            <tr><th>Tiết</th><th>Môn</th><th>Tên bài</th><th className="r">Vắng</th><th className="hide-sm">Nhận xét</th><th>GV</th></tr>
          </thead>
          <tbody>
            {rows.map(([mon, bai, gv, vang, nx], i) => {
              const on = fill > 0 && i < filled;
              return (
                <tr key={i} className={on ? "on" : i === filled && fill > 0 ? "now" : undefined}>
                  <td className="num">{i + 1}</td>
                  <td>{on ? mon : ""}</td>
                  <td className="gs-hand">{on ? bai : ""}</td>
                  <td className="r num">{on ? vang : ""}</td>
                  <td className="hide-sm gs-hand">{on ? nx : ""}</td>
                  <td>{on && gv ? <span className={signed ? "gs-sig on" : "gs-sig"}>{signed ? gv : "—"}</span> : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="gs-meta">{fill === 0 ? "Lấy từ thời khoá biểu, giáo án và điểm danh" : filled < rows.length ? `Đang điền tiết ${filled + 1}…` : signed ? "Đã ký số · gửi ban giám hiệu" : `${rows.length} tiết · chờ ký`}</p>
      </div>
    </div>
  );
}

/* ---------- Báo cáo tổ ---------- */
const BC_TEXT = `Tháng 11, tổ Toán – Tin dạy đủ 100% số tiết theo kế hoạch. Thời gian soạn một bài giảm từ ${NUMBERS.prepBefore} còn ${NUMBERS.prepAfter} nhờ soạn bằng AI. Tổ chia sẻ 48 học liệu, duyệt 6 đề kiểm tra. Lớp 10A1 có ${HELP} em cần hỗ trợ bất phương trình; tổ đề xuất tiết phụ đạo chung vào thứ Bảy.`;
const BARS = [
  { n: "cô Hà", v: 32, s: 14 },
  { n: "TS. Khải", v: 28, s: 11 },
  { n: "cô Thu", v: 30, s: 9 },
  { n: "thầy Tâm", v: 26, s: 8 },
  { n: "cô Ngọc", v: 24, s: 6 },
];
function BaoCao() {
  const [run, setRun] = useState(0);
  const s = useFakeStream(BC_TEXT, { run: run > 0, cps: 70, delayMs: 1600, key: run });
  const max = 34;
  return (
    <div className="gs-doc-wrap">
      <aside className="gs-doc-side">
        <div className="gs-kpi">
          <b className="num">{run > 0 ? <Count to={48} /> : "–"}</b>
          <span>học liệu chia sẻ</span>
        </div>
        <div className="gs-kpi">
          <b className="num">{run > 0 ? <Count to={100} suffix="%" /> : "–"}</b>
          <span>tiết đúng kế hoạch</span>
        </div>
        {run === 0 && <Button variant="primary" icon="spark" onClick={() => setRun(1)} data-testid="gt-baocao">Lập báo cáo</Button>}
      </aside>
      <article className="gs-a4" aria-label="Báo cáo tổ">
        <header className="gs-a4-hd">
          <div>{SCHOOL.name.toUpperCase()}<br />TỔ TOÁN – TIN</div>
          <div className="r">Ngày 28 tháng 11 năm 2026</div>
        </header>
        <h2 className="gs-a4-t">
          <small>Báo cáo</small>
          HOẠT ĐỘNG CHUYÊN MÔN THÁNG 11
        </h2>
        <figure className={run > 0 ? "gs-bars on" : "gs-bars"}>
          <figcaption>Số tiết dạy · số học liệu chia sẻ</figcaption>
          {BARS.map((b, i) => (
            <div key={b.n} className="gs-bar" style={{ ["--i" as string]: i }}>
              <span>{b.n}</span>
              <i style={{ width: `${(b.v / max) * 100}%` }} />
              <em style={{ width: `${(b.s / max) * 100}%` }} />
              <small className="num">{b.v} · {b.s}</small>
            </div>
          ))}
        </figure>
        <div className="gs-a4-body">
          {run > 0 ? <p className={s.state === "streaming" ? "caret-end" : undefined}>{s.text}</p> : <div className="gs-a4-ghost" aria-hidden="true">{[90, 96, 70].map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}</div>}
        </div>
      </article>
    </div>
  );
}

function Count({ to, suffix = "" }: { to: number; suffix?: string }) {
  const n = useCount(to, 1200);
  return <>{n}{suffix}</>;
}

/* ---------- Đồng bộ VNEdu / SMAS ---------- */
const NAMES = ROSTER_10A1;
const SIZE = CLASSES.find((c) => c.id === "10A1")!.size;
/** 3 em đầu sổ khớp thế giới mẫu (Toán: Minh Anh 6,4 · Khánh Duy 5,6 · Đức Thịnh 5,8). */
const FIRST: { tx: number[]; gk: number }[] = [{ tx: [6, 7, 6], gk: 6.5 }, { tx: [6, 6, 5], gk: 5.5 }, { tx: [6, 5, 6], gk: 6 }];
function DongBo() {
  const [to, setTo] = useState<"vnedu" | "smas">("vnedu");
  const [run, setRun] = useState(0);
  const sent = useCount(SIZE, 3200, run > 0, `${to}${run}`);
  const done = run > 0 && sent >= SIZE;
  const rows = useMemo(() => NAMES.map((n, i) => ({ n, ...(FIRST[i] ?? { tx: [7 + (i % 3), 6 + ((i * 7) % 4), 8 - (i % 3)], gk: 6 + ((i * 5) % 4) + 0.5 }) })), []);
  return (
    <div className="gs-sync">
      <section className="gs-sync-src">
        <div className="gs-sync-h"><span className="eyebrow">Sổ điểm EDUVN</span><b>Toán · 10A1</b></div>
        <table className="gs-ledger-t dense">
          <thead><tr><th>Học sinh</th><th className="r">TX1</th><th className="r">TX2</th><th className="r">TX3</th><th className="r">GK</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.n} className={run > 0 && i < (sent * NAMES.length) / SIZE ? "sent" : undefined}>
                <td>{r.n}</td>
                {r.tx.map((x, k) => <td key={k} className="r num">{x}</td>)}
                <td className="r num">{r.gk.toString().replace(".", ",")}</td>
              </tr>
            ))}
            <tr className="more"><td colSpan={5}>+ {SIZE - NAMES.length} học sinh</td></tr>
          </tbody>
        </table>
      </section>
      <div className={run > 0 && !done ? "gs-pipe on" : "gs-pipe"} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}
      </div>
      <section className="gs-sync-dst">
        <div className="gs-seg2" role="radiogroup" aria-label="Hệ thống">
          {(["vnedu", "smas"] as const).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={to === x} onClick={() => { setTo(x); setRun(0); }}>{x === "vnedu" ? "VNEdu" : "SMAS"}</button>
          ))}
        </div>
        <div className="gs-dst-big num">
          {run > 0 ? sent : 0}<small>/{SIZE}</small>
        </div>
        <ul className="gs-map">
          {[["TX1–TX3", "ĐĐGtx"], ["GK", "ĐĐGgk"], ["Nhận xét", "Nhận xét môn"]].map(([a, b]) => (
            <li key={a}><span>{a}</span><Icon name="arrowr" size="sm" /><span>{b}</span></li>
          ))}
        </ul>
        {done ? (
          <span className="gs-okline"><Icon name="checkc" size="sm" />Đã đồng bộ · 0 lỗi</span>
        ) : (
          <Button variant="primary" size="lg" icon="upload" disabled={run > 0} onClick={() => setRun((r) => r + 1)} data-testid="gt-dongbo">Đẩy lên {to === "vnedu" ? "VNEdu" : "SMAS"}</Button>
        )}
      </section>
    </div>
  );
}
