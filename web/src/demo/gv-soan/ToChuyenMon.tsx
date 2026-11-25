/** /gv/to-chuyen-mon — Tổ chuyên môn (mô phỏng): thư viện học liệu tổ (chia sẻ, nhân bản, học liệu tổ khác), duyệt đề tổ, thư viện khoá học. */
import { type MouseEvent, useEffect, useState } from "react";
import { Button } from "../../ui/components/Button";
import { Tabs } from "../../ui/components/Tabs";
import { useToast } from "../../ui/components/Toast";
import { Icon } from "../../ui/Icon";
import { Head } from "./common";

type Kind = "bai-giang" | "de" | "slide" | "hoat-hinh" | "infographic";
const KIND: Record<Kind, { name: string; c: string }> = {
  "bai-giang": { name: "Bài giảng", c: "var(--gs-c1)" },
  de: { name: "Đề", c: "var(--gs-c7)" },
  slide: { name: "Slide", c: "var(--gs-c2)" },
  "hoat-hinh": { name: "Hoạt hình", c: "var(--gs-c3)" },
  infographic: { name: "Infographic", c: "var(--gs-c4)" },
};
type Item = { id: string; t: string; k: Kind; by: string; to: string; uses: number; hue: number };
const TEAMS = ["Tổ Toán – Tin", "Tổ Ngữ văn", "Tổ Khoa học tự nhiên", "Tổ Xã hội"] as const;
const LIB: Item[] = [
  { id: "a1", t: "Hàm số bậc hai", k: "slide", by: "cô Thu", to: TEAMS[0], uses: 23, hue: 205 },
  { id: "a2", t: "Đề giữa kì I · Toán 10", k: "de", by: "thầy Tâm", to: TEAMS[0], uses: 41, hue: 30 },
  { id: "a3", t: "Lượng giác trong 1 trang", k: "infographic", by: "cô Ngọc", to: TEAMS[0], uses: 17, hue: 280 },
  { id: "a4", t: "Duyệt đồ thị BFS / DFS", k: "hoat-hinh", by: "TS. Khải", to: TEAMS[0], uses: 9, hue: 150 },
  { id: "a5", t: "Xác suất có điều kiện", k: "bai-giang", by: "thầy Tâm", to: TEAMS[0], uses: 12, hue: 30 },
  { id: "a6", t: "Thống kê mẫu số liệu", k: "bai-giang", by: "cô Thu", to: TEAMS[0], uses: 8, hue: 205 },
  { id: "b1", t: "Đọc hiểu văn bản nghị luận", k: "bai-giang", by: "thầy Bảo", to: TEAMS[1], uses: 35, hue: 340 },
  { id: "b2", t: "Đề đọc hiểu · lớp 11", k: "de", by: "thầy Bảo", to: TEAMS[1], uses: 19, hue: 340 },
  { id: "c1", t: "Phản ứng oxi hoá – khử", k: "hoat-hinh", by: "thầy Long", to: TEAMS[2], uses: 28, hue: 100 },
  { id: "c2", t: "Di truyền Mendel", k: "infographic", by: "cô Lan", to: TEAMS[2], uses: 22, hue: 170 },
  { id: "d1", t: "Vòng tuần hoàn của nước", k: "hoat-hinh", by: "cô Phương", to: TEAMS[3], uses: 31, hue: 50 },
  { id: "d2", t: "Chiến dịch Điện Biên Phủ", k: "infographic", by: "cô Phương", to: TEAMS[3], uses: 26, hue: 50 },
];
const MINE: Item = { id: "m1", t: "Bất phương trình bậc hai", k: "bai-giang", by: "cô Hà", to: TEAMS[0], uses: 0, hue: 230 };

type Tab = "thu-vien" | "duyet" | "khoa-hoc";
export function ToChuyenMon() {
  const [tab, setTab] = useState<Tab>("thu-vien");
  return (
    <>
      <Head
        title="Tổ chuyên môn"
        tabs={<Tabs label="Mục" value={tab} onChange={setTab} items={[{ value: "thu-vien", label: "Thư viện" }, { value: "duyet", label: "Duyệt đề", count: 2 }, { value: "khoa-hoc", label: "Khoá học" }]} />}
      />
      <div className="gs-gt" key={tab}>
        {tab === "thu-vien" && <ThuVien />}
        {tab === "duyet" && <DuyetDe />}
        {tab === "khoa-hoc" && <KhoaHoc />}
      </div>
    </>
  );
}

/** Bìa học liệu: tờ giấy nhỏ có hình theo loại. */
function Cover({ it }: { it: Item }) {
  return (
    <div className="gs-cover" style={{ ["--c" as string]: KIND[it.k].c }}>
      <span className="gs-cover-k">{KIND[it.k].name}</span>
      <b>{it.t}</b>
      <Glyph k={it.k} />
    </div>
  );
}
function Glyph({ k }: { k: Kind }) {
  const d = {
    "bai-giang": "M8 46 C 26 4, 44 4, 62 46",
    de: "M10 12h40M10 24h48M10 36h32M10 48h44",
    slide: "M8 10h56v34H8z M20 50h32",
    "hoat-hinh": "M10 40 C 20 10, 40 10, 46 30 S 60 50, 66 20",
    infographic: "M10 48V30M24 48V18M38 48V26M52 48V10",
  }[k];
  return (
    <svg className="gs-cover-g" viewBox="0 0 72 56" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function ThuVien() {
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [kind, setKind] = useState<Kind | null>(null);
  const [shared, setShared] = useState(false);
  const [mine, setMine] = useState(3);
  const [fly, setFly] = useState<{ it: Item; from: DOMRect; to: DOMRect; go: boolean } | null>(null);
  const [copied, setCopied] = useState<Record<string, number>>({});
  const toast = useToast();
  const list = [...(shared && team === TEAMS[0] ? [MINE] : []), ...LIB.filter((x) => x.to === team)].filter((x) => !kind || x.k === kind);
  useEffect(() => {
    if (!fly || fly.go) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setFly((f) => (f ? { ...f, go: true } : f))));
    return () => cancelAnimationFrame(r);
  }, [fly]);
  const going = !!fly?.go;
  useEffect(() => {
    if (!going) return;
    const t = setTimeout(() => {
      setFly(null);
      setMine((m) => m + 1);
    }, 760);
    return () => clearTimeout(t);
  }, [going]);
  const clone = (e: MouseEvent, it: Item) => {
    const card = (e.currentTarget as HTMLElement).closest(".gs-lib-it")?.querySelector(".gs-cover");
    const dst = document.getElementById("gs-mine");
    if (!card || !dst) return;
    setCopied((c) => ({ ...c, [it.id]: (c[it.id] ?? 0) + 1 }));
    setFly({ it, from: card.getBoundingClientRect(), to: dst.getBoundingClientRect(), go: false });
  };
  return (
    <div className="gs-lib">
      <div className="gs-lib-bar">
        <div className="gs-teams" role="tablist" aria-label="Tổ">
          {TEAMS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={team === t} onClick={() => setTeam(t)}>{t}</button>
          ))}
        </div>
        <span id="gs-mine" className={fly?.go ? "gs-mine hit" : "gs-mine"}>
          <Icon name="bookmark" size="sm" />Của tôi <b className="num">{mine}</b>
        </span>
        <Button
          variant="primary"
          size="sm"
          icon="send"
          disabled={shared}
          onClick={() => {
            setTeam(TEAMS[0]);
            setShared(true);
            toast({ kind: "ok", title: "Đã chia sẻ lên Tổ Toán – Tin", msg: "Bất phương trình bậc hai · 7 slide" });
          }}
          data-testid="to-chiase"
        >
          Chia sẻ bài của tôi
        </Button>
      </div>
      <div className="gs-kinds" role="group" aria-label="Loại">
        {(Object.keys(KIND) as Kind[]).map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)}>
            <i style={{ background: KIND[k].c }} />
            {KIND[k].name}
          </button>
        ))}
      </div>
      <ul className="gs-lib-grid" key={team + kind}>
        {list.map((it, i) => (
          <li key={it.id} className={it.id === MINE.id ? "gs-lib-it new" : "gs-lib-it"} style={{ ["--i" as string]: i }}>
            <Cover it={it} />
            <div className="gs-lib-meta">
              <span className="gs-av" style={{ ["--hue" as string]: it.hue }}>{it.by.split(" ").pop()![0]}</span>
              <span>{it.by}</span>
              <span className="num gs-meta">{it.uses + (copied[it.id] ?? 0)} lượt dùng</span>
            </div>
            <button type="button" className="btn sm gs-clone" onClick={(e) => clone(e, it)} data-testid={`to-clone-${it.id}`}>
              <Icon name="copy" size="sm" />
              <span>Nhân bản</span>
            </button>
          </li>
        ))}
      </ul>
      {fly && (
        <div
          className="gs-fly"
          style={{
            left: fly.from.left,
            top: fly.from.top,
            width: fly.from.width,
            transform: fly.go ? `translate(${fly.to.left + fly.to.width / 2 - fly.from.left - fly.from.width / 2}px, ${fly.to.top + fly.to.height / 2 - fly.from.top - fly.from.height / 2}px) scale(.12)` : "none",
            opacity: fly.go ? 0.2 : 1,
          }}
        >
          <Cover it={fly.it} />
        </div>
      )}
    </div>
  );
}

/* ---------- Duyệt đề tổ ---------- */
const EXAMS = [
  {
    id: "e1", t: "Kiểm tra cuối kì I · Toán 10", by: "thầy Tâm", n: 35,
    qs: ["Tập nghiệm của bất phương trình x² − 5x + 6 < 0 là", "Tam thức f(x) = −x² + 4x − 3 dương khi", "Cho parabol y = x² − 2x − 3. Toạ độ đỉnh là", "Bất phương trình x² + x + 1 < 0 có tập nghiệm"],
    notes: [{ q: 1, who: "cô Hà", t: "Câu 2 nên ghi rõ khoảng mở hay đóng." }, { q: 3, who: "AI", t: "Câu 4 đúng ma trận: mức Vận dụng." }],
  },
  {
    id: "e2", t: "15 phút · Hàm số bậc hai", by: "cô Ngọc", n: 10,
    qs: ["Hàm số y = 2x² − 4x + 1 đồng biến trên", "Trục đối xứng của parabol y = −x² + 6x là", "Giá trị nhỏ nhất của y = x² − 2x + 5 là"],
    notes: [{ q: 0, who: "AI", t: "Độ khó trung bình 0,62 — hợp lớp 10A1." }],
  },
];
function DuyetDe() {
  const [sel, setSel] = useState(0);
  const [st, setSt] = useState<Record<string, "ok" | "fix">>({});
  const e = EXAMS[sel]!;
  return (
    <div className="gs-review">
      <ul className="gs-rv-list">
        {EXAMS.map((x, i) => (
          <li key={x.id}>
            <button type="button" aria-current={i === sel || undefined} onClick={() => setSel(i)}>
              <b>{x.t}</b>
              <small>{x.by} · {x.n} câu</small>
              <span className={`gs-rv-st ${st[x.id] ?? ""}`}>{st[x.id] === "ok" ? "Đã duyệt" : st[x.id] === "fix" ? "Cần sửa" : "Chờ duyệt"}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="gs-rv-doc">
        <article className="gs-a4 small" key={e.id}>
          <h2 className="gs-a4-t"><small>Đề kiểm tra</small>{e.t.toUpperCase()}</h2>
          <ol className="gs-qs">
            {e.qs.map((q, i) => {
              const note = e.notes.find((n) => n.q === i);
              return (
                <li key={q}>
                  <span>{q}…</span>
                  {note && (
                    <aside className={note.who === "AI" ? "gs-note ai" : "gs-note"} style={{ ["--i" as string]: i }}>
                      <b>{note.who}</b>
                      {note.t}
                    </aside>
                  )}
                </li>
              );
            })}
          </ol>
          {st[e.id] === "ok" && <span className="gs-stamp big">Tổ đã duyệt</span>}
        </article>
        <div className="gs-acts">
          <Button variant="ghost" icon="pen" disabled={!!st[e.id]} onClick={() => setSt({ ...st, [e.id]: "fix" })}>Yêu cầu sửa</Button>
          <Button variant="primary" icon="check" disabled={!!st[e.id]} onClick={() => setSt({ ...st, [e.id]: "ok" })} data-testid="to-duyet">Duyệt</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Thư viện khoá học: kệ sách ---------- */
const COURSES = [
  { t: "Ôn thi tốt nghiệp Toán", n: 24, c: "var(--gs-c1)", lv: "THPT", h: 92 },
  { t: "Bất phương trình từ A đến Z", n: 8, c: "var(--gs-c2)", lv: "THPT", h: 76 },
  { t: "Python cho lớp 10", n: 16, c: "var(--gs-c3)", lv: "THPT", h: 84 },
  { t: "Toán vui lớp 8", n: 12, c: "var(--gs-c5)", lv: "THCS", h: 70 },
  { t: "Cấu trúc dữ liệu", n: 30, c: "var(--gs-c4)", lv: "Đại học", h: 100 },
  { t: "Xác suất thống kê", n: 18, c: "var(--gs-c6)", lv: "Đại học", h: 88 },
  { t: "Hình học không gian", n: 14, c: "var(--gs-c1)", lv: "THPT", h: 80 },
  { t: "Tin học văn phòng", n: 10, c: "var(--gs-c2)", lv: "THCS", h: 72 },
];
function KhoaHoc() {
  const [open, setOpen] = useState(0);
  const c = COURSES[open]!;
  return (
    <div className="gs-shelf-wrap">
      <div className="gs-shelf" role="listbox" aria-label="Khoá học của tổ">
        {COURSES.map((x, i) => (
          <button key={x.t} type="button" role="option" aria-selected={i === open} onClick={() => setOpen(i)} style={{ ["--c" as string]: x.c, ["--h" as string]: `${x.h}%`, ["--i" as string]: i }}>
            <span>{x.t}</span>
          </button>
        ))}
      </div>
      <div className="gs-course" key={c.t}>
        <span className="eyebrow">{c.lv} · {c.n} bài</span>
        <h2>{c.t}</h2>
        <ol>
          {Array.from({ length: Math.min(5, c.n) }, (_, i) => (
            <li key={i} style={{ ["--i" as string]: i }}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <span>{["Khởi động", "Khái niệm cốt lõi", "Ví dụ có lời giải", "Luyện tập phân hoá", "Kiểm tra nhanh"][i]}</span>
            </li>
          ))}
        </ol>
        <div className="row">
          <Button variant="primary" icon="copy">Nhân bản cho lớp</Button>
          <Button variant="ghost" icon="eye">Xem trước</Button>
        </div>
      </div>
    </div>
  );
}
