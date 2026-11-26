/** /gv/xuat-ban — Xuất bản (mô phỏng): PowerPoint gốc + Office Math, HTML offline, gói zip, video có tiến độ, QR; nhập PPTX cũ rồi làm đẹp. */
import qrcode from "qrcode-generator";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/components/Button";
import { Tabs } from "../../ui/components/Tabs";
import { Icon } from "../../ui/Icon";
import { SCHOOL, useFakeProgress, useCount, usePhases } from "../kit";
import { Head } from "./common";
import { LESSON, SLIDES } from "./data";
import { PaperSlide } from "./Paper";

type Fmt = "pptx" | "html" | "zip" | "mp4";
const FMTS: { id: Fmt; name: string; icon: string; note: string; file: string; size: string; ms: number; stages: string[] }[] = [
  { id: "pptx", name: "PowerPoint", icon: "slide", note: "Công thức sửa được", file: "bat-phuong-trinh-bac-hai.pptx", size: "2,4 MB", ms: 4200, stages: ["Dựng 7 slide", "Công thức Office Math", "Gắn lời đọc"] },
  { id: "html", name: "HTML offline", icon: "wifioff", note: "Mở không cần mạng", file: "bat-phuong-trinh-bac-hai.html", size: "3,1 MB", ms: 3600, stages: ["Gói phông chữ", "Nhúng hình và giọng", "Một tệp duy nhất"] },
  { id: "zip", name: "Gói zip", icon: "box", note: "Đủ mọi thứ, chép USB", file: "bat-phuong-trinh-bac-hai.zip", size: "18,6 MB", ms: 3800, stages: ["Gom tệp", "Nén", "Kiểm tra"] },
  { id: "mp4", name: "Video", icon: "video", note: "1080p · giọng cô Hà", file: "bat-phuong-trinh-bac-hai.mp4", size: "42 MB", ms: 7200, stages: ["Dựng khung hình", "Ghép giọng đọc", "Nén MP4"] },
];
const FRAMES = 1920;

export function XuatBan() {
  const [tab, setTab] = useState<"xuat" | "nhap">("xuat");
  return (
    <>
      <Head
        title="Xuất bản"
        tabs={<Tabs label="Xuất hay nhập" value={tab} onChange={setTab} items={[{ value: "xuat", label: "Xuất" }, { value: "nhap", label: "Nhập PPTX" }]} />}
      />
      {tab === "xuat" ? <Export /> : <Import />}
    </>
  );
}

function Export() {
  const [fmt, setFmt] = useState<Fmt>("mp4");
  const [run, setRun] = useState(0);
  const f = FMTS.find((x) => x.id === fmt)!;
  const going = run > 0;
  const p = useFakeProgress(f.ms, going, `${fmt}${run}`);
  const done = going && p >= 1;
  const stage = Math.min(f.stages.length - 1, Math.floor(p * f.stages.length));
  const pick = (id: Fmt) => {
    setFmt(id);
    setRun(0);
  };
  return (
    <div className="gs-xb">
      <ul className="gs-fmts" role="radiogroup" aria-label="Định dạng">
        {FMTS.map((x) => (
          <li key={x.id}>
            <button type="button" role="radio" aria-checked={fmt === x.id} onClick={() => pick(x.id)}>
              <Icon name={x.icon} size="sm" />
              <b>{x.name}</b>
              <small>{x.note}</small>
            </button>
          </li>
        ))}
      </ul>
      <div className="gs-xb-stage">
        <div className="gs-xb-view" key={fmt}>
          {fmt === "pptx" && <PptxView />}
          {fmt === "html" && <HtmlView />}
          {fmt === "zip" && <ZipView p={going ? p : 1} />}
          {fmt === "mp4" && <Mp4View p={going ? p : 0} />}
        </div>
        <div className="gs-xb-run">
          {!going && <Button variant="primary" size="lg" icon="upload" onClick={() => setRun((r) => r + 1)} data-testid="xb-xuat">Xuất {f.name}</Button>}
          {going && !done && (
            <div className="gs-prog">
              <div className="gs-prog-top">
                <span>{f.stages[stage]}</span>
                <span className="num">{fmt === "mp4" ? `${Math.round(p * FRAMES)} / ${FRAMES} khung` : `${Math.round(p * 100)}%`}</span>
              </div>
              <span className="meter"><i style={{ ["--v" as string]: `${p * 100}%` }} /></span>
              <ol className="gs-stages">
                {f.stages.map((s, i) => <li key={s} data-st={i < stage ? "done" : i === stage ? "now" : "todo"}>{s}</li>)}
              </ol>
            </div>
          )}
          {done && <Result f={f} onAgain={() => setRun(0)} />}
        </div>
      </div>
    </div>
  );
}

function Result({ f, onAgain }: { f: (typeof FMTS)[number]; onAgain: () => void }) {
  return (
    <div className="gs-result">
      <Qr text={`https://eduvn.vn/xem/bpt-bac-hai?dang=${f.id}`} />
      <div className="gs-result-t">
        <span className="gs-okline"><Icon name="checkc" size="sm" />Xong</span>
        <b>{f.file}</b>
        <span className="gs-meta">{f.size} · quét mã để mở trên điện thoại</span>
        <div className="row" style={{ marginTop: 12 }}>
          <Button variant="primary" icon="down">Tải về</Button>
          <Button variant="ghost" icon="refresh" onClick={onAgain}>Xuất lại</Button>
        </div>
      </div>
    </div>
  );
}

/** Mã QR tự ghép từng ô (thư viện qrcode-generator, không cần mạng). */
function Qr({ text }: { text: string }) {
  const cells = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) out.push({ x, y });
    return { n, out };
  }, [text]);
  return (
    <svg className="gs-qr" viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} role="img" aria-label="Mã QR mở bài giảng">
      {cells.out.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1.02} height={1.02} style={{ ["--d" as string]: `${((c.x + c.y) / (cells.n * 2)) * 0.7}s` }} />
      ))}
    </svg>
  );
}

function PptxView() {
  return (
    <div className="gs-win">
      <div className="gs-win-bar"><i /><i /><i /><span>{FMTS[0]!.file}</span></div>
      <div className="gs-win-body">
        <PaperSlide slide={SLIDES[4]!} n={5} build />
        <div className="gs-omath">
          <span className="gs-omath-box">x² − 5x + 6 &lt; 0</span>
          <span className="gs-omath-l"><Icon name="sigma" size="sm" />Office Math · sửa được</span>
        </div>
      </div>
    </div>
  );
}

function HtmlView() {
  return (
    <div className="gs-win">
      <div className="gs-win-bar">
        <i /><i /><i />
        <span className="gs-url"><Icon name="wifioff" size="sm" />file:///USB/bai-giang/bat-phuong-trinh-bac-hai.html</span>
      </div>
      <div className="gs-win-body">
        <PaperSlide slide={SLIDES[2]!} n={3} build />
        <div className="gs-offline"><Icon name="wifioff" size="sm" />Không có mạng · vẫn chạy</div>
      </div>
    </div>
  );
}

const ZIP = [
  { n: "index.html", s: "84 KB" },
  { n: "slides/", s: "7 tệp" },
  { n: "giong-doc/", s: "21 câu · MP3" },
  { n: "hinh/", s: "9 hình SVG" },
  { n: "phong-chu/", s: "Inter, Source Serif" },
  { n: "bai-tap.json", s: "3 câu" },
];
function ZipView({ p }: { p: number }) {
  const shown = Math.ceil(p * ZIP.length);
  return (
    <div className="gs-zip">
      <div className="gs-zip-root"><Icon name="box" />{FMTS[2]!.file}</div>
      <ul>
        {ZIP.map((z, i) => (
          <li key={z.n} data-on={i < shown || undefined}>
            <Icon name={z.n.endsWith("/") ? "layers" : "clip"} size="sm" />
            <span>{z.n}</span>
            <small className="num">{z.s}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mp4View({ p }: { p: number }) {
  const cur = Math.min(SLIDES.length - 1, Math.floor(p * SLIDES.length));
  return (
    <div className="gs-mp4">
      <div className="gs-mp4-frame">
        <PaperSlide key={cur} slide={SLIDES[cur]!} n={cur + 1} build={p > 0} />
        <span className="gs-mp4-tc num">{fmtTc(p * 64)}</span>
      </div>
      <div className="gs-mp4-strip">
        {SLIDES.map((s, i) => (
          <div key={s.id} className={i < cur || p >= 1 ? "on" : i === cur && p > 0 ? "now" : undefined}>
            <PaperSlide slide={s} />
          </div>
        ))}
        <span className="gs-mp4-fill" style={{ width: `${p * 100}%` }} />
      </div>
    </div>
  );
}
const fmtTc = (s: number) => `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* ---------- Nhập PPTX cũ → làm đẹp ---------- */
const OLD = [SLIDES[2]!, SLIDES[3]!, SLIDES[4]!];
function Import() {
  const [go, setGo] = useState(false);
  const ph = usePhases([1400, 900], go);
  const fixed = useCount(OLD.length, OLD.length * 1300, go && ph >= 2);
  return (
    <div className="gs-imp">
      {!go ? (
        <button type="button" className="gs-drop" onClick={() => setGo(true)} data-testid="xb-nhap">
          <Icon name="upload" size="lg" />
          <b>Thả tệp PowerPoint vào đây</b>
          <span className="gs-meta">bai-giang-2023.pptx · 12 slide</span>
        </button>
      ) : (
        <>
          <div className="gs-imp-head">
            <span className="gs-file"><Icon name="slide" size="sm" />bai-giang-2023.pptx</span>
            <span className="gs-meta">{ph === 0 ? "Đang đọc tệp…" : ph === 1 ? "Nhận ra 12 slide, 4 công thức" : fixed < OLD.length ? `Làm đẹp ${fixed + 1}/${OLD.length}` : "Đã chuyển sang Giấy học thuật"}</span>
          </div>
          <div className="gs-imp-rows">
            {OLD.map((s, i) => (
              <div key={s.id} className="gs-imp-row" data-st={i < fixed ? "done" : i === fixed && ph >= 2 ? "now" : "todo"} style={{ ["--i" as string]: i }}>
                <OldSlide title={s.title} points={s.points} />
                <span className="gs-imp-arrow"><Icon name="arrowr" /></span>
                <div className="gs-imp-new">{i < fixed ? <PaperSlide slide={s} build /> : <span className="gs-skel" />}</div>
              </div>
            ))}
          </div>
          {fixed >= OLD.length && (
            <div className="gs-acts">
              <Button variant="ghost" icon="refresh" onClick={() => setGo(false)}>Nhập tệp khác</Button>
              <Link className="btn primary" to="/bai-giang-ai/sua"><Icon name="pen" size="sm" /><span>Mở trình sửa</span></Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Slide PowerPoint cũ: chữ dày, nền đậm, hình dán — để thấy rõ khác biệt sau khi làm đẹp. */
function OldSlide({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="gs-old">
      <b>{title.toUpperCase()}</b>
      <ul>{points.map((p) => <li key={p}>{p}</li>)}</ul>
      <span className="gs-old-clip" />
      <span className="gs-old-foot">{LESSON.subject} — {SCHOOL.name} — Năm 2023</span>
    </div>
  );
}
