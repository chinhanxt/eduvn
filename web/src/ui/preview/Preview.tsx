// Trang xem thử gói ui/ (chỉ chạy dev: /src/ui/preview/index.html). Cùng bố cục với web/mockup/v2/thanh-phan.html.
import { type ReactNode, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/ui.css";
import "../styles/skin-gv.css";
import "../styles/skin-hoc.css";
import "./preview.css";
import { Badge, Button, ChartTooltip, CommandPalette, ConfirmDialog, EmptyState, ErrorState, Field, Icon, ICON_NAMES, Input, Segmented, Select, SkeletonRows, Chip, ToastProvider, useToast, StreamingText } from "..";
import { DotPlot, GradeBar, GradeLegend, Track } from "../charts";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Buttons() {
  const toast = useToast();
  return (
    <>
      <div className="row-d">
        <span className="lbl-s">Kiểu</span>
        <Button variant="primary">Chính</Button>
        <Button>Phụ</Button>
        <Button variant="ghost">Nhẹ</Button>
        <Button variant="danger" icon="trash">Xoá</Button>
        <Button icon="plus" aria-label="Thêm" />
      </div>
      <div className="row-d">
        <span className="lbl-s">Trạng thái: tiêu điểm · đang xử lý (khoá bấm) · xong · tắt · bật (pressed)</span>
        <Button variant="primary" style={{ outline: "2px solid var(--focus)", outlineOffset: 2 }}>Tiêu điểm</Button>
        <Button variant="primary" busy>Đang lưu</Button>
        <button className="btn primary is-done" type="button"><Icon name="check" size="sm" /><span>Đã lưu</span></button>
        <Button variant="primary" disabled>Tắt</Button>
        <Button pressed>Bật</Button>
      </div>
      <div className="row-d">
        <span className="lbl-s">Cỡ sm · md · lg</span>
        <Button size="sm">Nhỏ</Button>
        <Button>Vừa</Button>
        <Button size="lg">Lớn</Button>
        <Button variant="primary" icon="save" doneLabel="Đã lưu" onClick={async () => { await wait(1200); toast({ title: "Đã lưu", msg: "bấm 5 lần vẫn chỉ 1 yêu cầu" }); }}>Thử bấm liên tục</Button>
      </div>
    </>
  );
}

function Inputs() {
  return (
    <>
      <Field label="Tên lớp" hint="Hiện cho học sinh"><Input defaultValue="10A1" /></Field>
      <Field label="Mã tham gia"><Input defaultValue="K7M4QX" className="is-focus" /></Field>
      <Field label="Hạn nộp" error="Ngày không có thật — chọn từ lịch"><Input defaultValue="31/02/2026" /></Field>
      <div className="row-d">
        <Select style={{ width: "auto" }} aria-label="Lớp"><option>Lớp 10</option></Select>
        <label className="input-ic" style={{ flex: 1 }}><Icon name="search" size="sm" /><input className="input" placeholder="Tìm…" /></label>
      </div>
    </>
  );
}

function Chips() {
  const [lv, setLv] = useState<string[]>(["TH", "VD"]);
  const [seg, setSeg] = useState("tuan");
  const [tab, setTab] = useState("tong-quan");
  return (
    <>
      <div className="row-d">
        {["NB", "TH", "VD"].map((l) => <Chip key={l} pressed={lv.includes(l)} onClick={() => setLv(lv.includes(l) ? lv.filter((x) => x !== l) : [...lv, l])}>{l}</Chip>)}
        <Badge tone="ok">Đã nộp</Badge>
        <Badge tone="warn" icon="clock">Sắp hạn</Badge>
        <Badge tone="danger">Quá hạn</Badge>
        <Badge tone="accent" icon="spark">AI</Badge>
      </div>
      <div className="row-d">
        <Segmented label="Khoảng" value={seg} onChange={setSeg} options={[{ value: "tuan", label: "Tuần" }, { value: "thang", label: "Tháng" }, { value: "hk", label: "Học kỳ" }]} />
        <span className="lvl l1">NB</span><span className="lvl l2">TH</span><span className="lvl l3">VD</span><span className="lvl l4">VDC</span>
      </div>
      <nav className="tabs" aria-label="Tab">
        {[["tong-quan", "Tổng quan"], ["hs", "Học sinh", 32], ["bt", "Bài tập", 14]].map(([v, l, n]) => (
          <a key={v as string} href="#" aria-current={tab === v ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab(v as string); }}>{l}{n !== undefined && <span className="count">{n}</span>}</a>
        ))}
      </nav>
    </>
  );
}

function States() {
  return (
    <>
      <div className="panel"><SkeletonRows rows={2} /></div>
      <div className="panel" style={{ ["--pad" as string]: "24px" }}><EmptyState icon="search" title="Không thấy câu nào" text="Thử bỏ bớt bộ lọc." action={<Button size="sm">Xoá lọc</Button>} /></div>
      <div className="panel"><ErrorState text="Máy chủ không phản hồi (503)." onRetry={() => wait(900)} /></div>
      <div className="banner" style={{ borderRadius: 10, padding: "8px 12px" }}><Icon name="offline" size="sm" /><span><b>Mất kết nối.</b> Đang dùng dữ liệu đã lưu.</span></div>
    </>
  );
}

function Toasts() {
  const toast = useToast();
  return (
    <>
      <div className="static-toasts" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        <div className="toast"><Icon name="ok" /><div className="msg"><b>Đã giao bài cho 10A1</b><span>32 học sinh</span></div><button className="close" aria-label="Đóng"><Icon name="x" size="sm" /></button></div>
        <div className="toast info"><Icon name="info" /><div className="msg"><b>Đã xoá 3 câu</b></div><button className="act">Hoàn tác</button><button className="close" aria-label="Đóng"><Icon name="x" size="sm" /></button></div>
        <div className="toast err"><Icon name="err" /><div className="msg"><b>Không lưu được</b><span>đã giữ nháp</span></div><button className="act">Thử lại</button><button className="close" aria-label="Đóng"><Icon name="x" size="sm" /></button></div>
      </div>
      <div className="row-d">
        <Button size="sm" onClick={() => toast({ title: "Đã lưu" })}>Thử toast</Button>
        <Button size="sm" onClick={() => { for (let i = 1; i <= 4; i++) toast({ title: `Thông báo ${i}`, kind: "info" }); }}>Hàng đợi 4 (hiện 2)</Button>
        <Button size="sm" onClick={() => toast({ title: "Đã xoá 3 câu", kind: "info", undo: () => toast({ title: "Đã hoàn tác", kind: "info", life: 2500 }) })}>Có Hoàn tác</Button>
      </div>
    </>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="dialog static" role="dialog" aria-label="Xoá lớp"><div className="hd"><h2>Xoá lớp 10A3?</h2></div><div className="bd">41 học sinh và sổ điểm HK I sẽ bị xoá. Không thể hoàn tác.</div><div className="ft"><button className="btn">Huỷ</button><button className="btn primary danger-solid">Xoá lớp</button></div></div>
      <div className="row-d"><Button size="sm" onClick={() => setOpen(true)}>Mở hộp thoại thật</Button></div>
      <ConfirmDialog open={open} title="Xoá lớp 10A3?" text="41 học sinh và sổ điểm HK I sẽ bị xoá. Không thể hoàn tác." confirmLabel="Xoá lớp" onConfirm={() => wait(800)} onClose={() => setOpen(false)} />
    </>
  );
}

const TEXT = "Đồ thị hàm số bậc hai là một parabol có trục đối xứng x = −b/2a";
function Stream() {
  const [state, setState] = useState<"streaming" | "stopped">("streaming");
  return (
    <>
      <div className="stream-bar" />
      <div className="stream-bar det" style={{ ["--p" as string]: "62%" }} />
      <ol className="steps">
        <li className="done"><span className="dot"><Icon name="check" /></span>Đọc tài liệu<span className="t">1,2 s</span></li>
        <li className="now"><span className="dot" />Viết dàn ý</li>
        <li><span className="dot" />Tạo slide</li>
      </ol>
      <StreamingText text={TEXT} state={state} onStop={() => setState("stopped")} className="read" />
    </>
  );
}

function Charts() {
  return (
    <>
      <div><div className="lbl-s">Điểm 5 bài · thang 0–10 · vạch 5,0</div><Track vals={[5.5, 6.25, 6, 6.75, 7.25]} threshold={5} height={34} showAxis /></div>
      <div><div className="lbl-s">Học lực · số HS</div><GradeBar counts={[9, 14, 7, 2]} /><div style={{ marginTop: 6 }}><GradeLegend /></div></div>
      <div><div className="lbl-s">Thành thạo theo chủ đề · vạch 50%</div><DotPlot rows={[{ label: "Hàm số bậc hai", v: 64 }, { label: "Dấu tam thức", v: 38 }]} refValue={50} labelW={120} /></div>
    </>
  );
}

const SECS: [string, string, () => ReactNode][] = [
  ["Nút", "Một nút chính mỗi vùng; đang xử lý khoá bấm + Idempotency-Key.", Buttons],
  ["Ô nhập", "Nhãn luôn hiện; lỗi nói cách sửa; viền ≥ 3:1.", Inputs],
  ["Chip · nhãn · phân đoạn · tab", "Chip lọc ghi vào URL; nhãn trạng thái luôn có icon.", Chips],
  ["Trạng thái vùng dữ liệu", "Đang tải (skeleton cùng hình) · trống · lỗi · mất mạng. Mọi màn có ?trang-thai=…", States],
  ["Toast", "Một dòng, tối đa 2, góc phải dưới; Hoàn tác 8 s.", Toasts],
  ["Hộp thoại", "Chỉ cho việc không đảo ngược.", DialogDemo],
  ["Streaming AI", "Thanh chạy / tiến độ / các bước / con trỏ; luôn có Dừng.", Stream],
  ["Biểu đồ", "Không sparkline; luôn có thang hoặc mốc + số.", Charts],
];

function Page() {
  const [cmd, setCmd] = useState(false);
  return (
    <div className="wrap">
      <header className="ph">
        <div className="eyebrow">EDUVN · thành phần · code thật (web/src/ui)</div>
        <h1>Một bộ thành phần, hai skin</h1>
        <p>Cùng HTML, cùng token. Cổng GV dùng skin B (dày, sắc, phím tắt); cổng Học dùng skin C (mảng màu, chữ đậm, thẻ bo tròn). Code thật: gói <code>ui/</code>, skin chọn bằng <code>&lt;html data-portal&gt;</code>. Bấm <kbd>Ctrl</kbd> <kbd>K</kbd> để mở bảng lệnh.</p>
      </header>
      <div className="heads"><span /><b><i style={{ background: "#3346d1" }} />GV · skin B “Công cụ chính xác”</b><b><i style={{ background: "#0b7466" }} />Học · skin C “Học đường hiện đại”</b></div>
      {SECS.map(([t, d, C]) => (
        <section className="sec" key={t}>
          <h2>{t}<small>{d}</small></h2>
          {(["gv", "hoc"] as const).map((p) => (
            <div key={p} className="skin" data-portal={p} data-name={p === "gv" ? "GV · skin B" : "Học · skin C"}>
              <C />
            </div>
          ))}
        </section>
      ))}
      <section className="sec">
        <h2>Icon<small>Lucide nét 1,75; 16 / 20 / 24. Dùng chung hai cổng.</small></h2>
        <div className="icons">{ICON_NAMES.map((n) => <div key={n}><Icon name={n} />{n}</div>)}</div>
      </section>
      <CommandPalette
        open={cmd}
        onOpenChange={setCmd}
        onNavigate={() => undefined}
        commands={[
          { group: "Trang", title: "Hôm nay", icon: "home", href: "#" },
          { group: "Trang", title: "Lớp học", icon: "users", href: "#" },
          { group: "Lớp", title: "10A1 · Toán 10", icon: "users", href: "#" },
          { group: "Thao tác", title: "Tạo đề mới", icon: "plus", kbd: "N", href: "#" },
        ]}
      />
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ToastProvider>
      <Page />
      <ChartTooltip />
    </ToastProvider>
  </StrictMode>,
);
