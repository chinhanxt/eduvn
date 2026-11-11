// Hộp thoại "Xuất bản" (P14/GX): PowerPoint gốc (mẫu của trường, giọng đọc, hiệu ứng theo lời, QR), HTML ngoại tuyến,
// gói .eduvn.zip, gói tài nguyên, kịch bản .md/.docx, video MP4 (độ phân giải/fps/chất lượng/phụ đề, tiến độ + huỷ).
// Gắn vào trang bằng 1 dòng: <XuatBanButton nguon={{ loai: "bai-giang-ai", id }} khoa={…} />
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Dialog, Meter, Segmented } from "../ui";
import { type DinhDang, type Job, type Mau, type Nguon, type TuyChon, cancelJob, downloadJob, errText, etaText, jobStatus, listMau, sizeText, startJob } from "./api";
import { KhoMau } from "./KhoMau";
import "./xuat-ban.css";

type Fmt = { id: DinhDang; ten: string; mo: string; chiBaiGiang?: boolean };
const FORMATS: Fmt[] = [
  { id: "pptx", ten: "PowerPoint", mo: "Hình, bảng, biểu đồ và công thức sửa được ngay trong PowerPoint; có ghi chú người thuyết trình." },
  { id: "html", ten: "HTML ngoại tuyến", mo: "Một tệp mở bằng trình duyệt, chạy không cần mạng: slide, lời giảng, quiz chấm tại chỗ, cảnh tương tác.", chiBaiGiang: true },
  { id: "zip", ten: "Gói bài giảng", mo: "Tệp .eduvn.zip đủ tài nguyên — chép sang máy khác, đặt trên mạng nội bộ trường hoặc nhập lại vào EDUVN.", chiBaiGiang: true },
  { id: "goi-tai-nguyen", ten: "Gói tài nguyên", mo: "PowerPoint + mỗi cảnh tương tác thành một trang HTML chạy độc lập.", chiBaiGiang: true },
  { id: "kich-ban-docx", ten: "Kịch bản", mo: "Toàn bộ lời giảng theo từng cảnh, kèm câu hỏi và đáp án.", chiBaiGiang: true },
  { id: "video", ten: "Video MP4", mo: "Dựng video có giọng đọc; tải phụ đề .srt riêng.", chiBaiGiang: true },
];

const TERMINAL = new Set(["xong", "loi", "da-huy"]);

export function XuatBanButton({ nguon, khoa, nhan = "Xuất bản" }: { nguon: Nguon; /** Lý do khoá (vd bài đang soạn, giọng đọc chưa xong) — OM-813. */ khoa?: string; nhan?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon="down" onClick={() => setOpen(true)} disabled={!!khoa} title={khoa} data-testid="xb-open">
        {nhan}
      </Button>
      {open && <XuatBanDialog nguon={nguon} onClose={() => setOpen(false)} />}
    </>
  );
}

export function XuatBanDialog({ nguon, onClose }: { nguon: Nguon; onClose: () => void }) {
  const isLesson = nguon.loai === "bai-giang-ai";
  const formats = FORMATS.filter((f) => isLesson || !f.chiBaiGiang);
  const [fmt, setFmt] = useState<DinhDang>("pptx");
  const [o, setO] = useState<TuyChon>({ hieuUng: true, maQr: true, giongDoc: isLesson, chuyenTrang: "fade", loiGiang: "kem", doPhanGiai: "1080p", fps: 30, chatLuong: "chuan", phuDeCung: true });
  const [scriptKind, setScriptKind] = useState<"kich-ban-docx" | "kich-ban-md">("kich-ban-docx");
  const [maus, setMaus] = useState<Mau[] | null>(null);
  const [kho, setKho] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    listMau().then(setMaus, () => setMaus([]));
    return () => {
      alive.current = false;
    };
  }, []);
  const set = <K extends keyof TuyChon>(k: K, v: TuyChon[K]) => setO((p) => ({ ...p, [k]: v }));
  const running = job && !TERMINAL.has(job.status);

  async function poll(id: string) {
    let delay = 600;
    while (alive.current) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(2500, delay * 1.4);
      const j = await jobStatus(id).catch((e: unknown) => {
        setErr(errText(e));
        return null;
      });
      if (!j || !alive.current) return;
      setJob(j);
      if (TERMINAL.has(j.status)) {
        if (j.status === "xong") await downloadJob(j).catch((e: unknown) => setErr(errText(e)));
        return;
      }
    }
  }

  async function go() {
    setErr(null);
    try {
      const kind = fmt === "kich-ban-docx" ? scriptKind : fmt;
      const j = await startJob(nguon, kind, o);
      setJob(j);
      await poll(j.id);
    } catch (e) {
      setErr(errText(e));
    }
  }

  const pct = job ? (job.status === "xong" ? 100 : job.total ? Math.round((job.done / job.total) * 100) : 0) : 0;
  const mauChon = maus?.find((m) => m.id === o.mauId);

  return (
    <Dialog
      open
      title={kho ? "Kho mẫu của trường" : "Xuất bản bài giảng"}
      onClose={() => !running && onClose()}
      footer={
        kho ? (
          <Button onClick={() => listMau().then((m) => (setMaus(m), setKho(false)))}>Xong</Button>
        ) : running ? (
          <Button variant="ghost" icon="x" onClick={async () => job && setJob(await cancelJob(job.id))} data-testid="xb-cancel">
            Huỷ
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            <Button variant="primary" icon="down" onClick={go} data-testid="xb-go">
              {job?.status === "xong" ? "Xuất lại" : "Xuất"}
            </Button>
          </>
        )
      }
    >
      <div className="xb">
        {kho ? (
          <KhoMau />
        ) : (
          <>
            <div className="xb-fmts" role="radiogroup" aria-label="Định dạng">
              {formats.map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={fmt === f.id} className="xb-fmt" onClick={() => setFmt(f.id)} disabled={!!running} data-testid={`xb-fmt-${f.id}`}>
                  <b>{f.ten}</b>
                  <small>{f.mo}</small>
                </button>
              ))}
            </div>

            <div className="xb-opts">
              {fmt === "pptx" || fmt === "goi-tai-nguyen" ? (
                <>
                  <div className="xb-row">
                    <label htmlFor="xb-mau">Mẫu</label>
                    <select id="xb-mau" className="input" value={o.mauId ?? ""} onChange={(e) => set("mauId", e.target.value || undefined)} disabled={!!running}>
                      <option value="">Giấy học thuật (mặc định của EDUVN)</option>
                      {maus?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {m.kind === "mau" ? "đổ vào mẫu" : "lấy phong cách"}
                        </option>
                      ))}
                    </select>
                    <Button variant="ghost" size="sm" onClick={() => setKho(true)} data-testid="xb-kho">
                      Kho mẫu…
                    </Button>
                  </div>
                  {mauChon && (
                    <div className="xb-swatch" aria-label="Màu của mẫu">
                      {Object.entries(mauChon.info.colors)
                        .filter(([k]) => /accent|dk1|lt1/.test(k))
                        .map(([k, c]) => (
                          <i key={k} style={{ background: c }} title={`${k} ${c}`} />
                        ))}
                      <small>
                        {mauChon.info.fonts.major ?? ""} / {mauChon.info.fonts.minor ?? ""}
                        {mauChon.kind === "mau" ? " · giữ nền, logo, bố cục của mẫu" : ""}
                      </small>
                    </div>
                  )}
                  {isLesson && <Check label="Nhúng giọng đọc từng trang (trình chiếu tự chạy theo lời giảng)" v={!!o.giongDoc} on={(v) => set("giongDoc", v)} />}
                  <Check label={isLesson ? "Phần tử xuất hiện theo lời giảng" : "Từng ý xuất hiện khi bấm"} v={!!o.hieuUng} on={(v) => set("hieuUng", v)} />
                  {isLesson && <Check label="Mã QR mở bài trên EDUVN" v={!!o.maQr} on={(v) => set("maQr", v)} />}
                  {isLesson && <Check label="Chỉ slide (bỏ trang giữ chỗ cho câu hỏi và cảnh tương tác)" v={!!o.chiSlide} on={(v) => set("chiSlide", v)} />}
                  <div className="xb-row">
                    <span>Chuyển trang</span>
                    <Segmented label="Chuyển trang" value={o.chuyenTrang ?? "fade"} onChange={(v) => set("chuyenTrang", v)} options={[{ value: "fade", label: "Mờ dần" }, { value: "push", label: "Đẩy" }, { value: "wipe", label: "Quét" }, { value: "morph", label: "Morph" }, { value: "none", label: "Không" }]} />
                  </div>
                </>
              ) : fmt === "html" ? (
                <div className="xb-row">
                  <span>Lời giảng</span>
                  <Segmented label="Lời giảng" value={o.loiGiang ?? "kem"} onChange={(v) => set("loiGiang", v)} options={[{ value: "kem", label: "Kèm giọng đọc và clip" }, { value: "khong", label: "Chỉ phụ đề (nhẹ)" }]} />
                </div>
              ) : fmt === "kich-ban-docx" ? (
                <div className="xb-row">
                  <span>Tệp</span>
                  <Segmented label="Loại tệp kịch bản" value={scriptKind} onChange={setScriptKind} options={[{ value: "kich-ban-docx", label: "Word (.docx)" }, { value: "kich-ban-md", label: "Markdown (.md)" }]} />
                </div>
              ) : fmt === "video" ? (
                <>
                  <div className="xb-row">
                    <span>Độ phân giải</span>
                    <Segmented label="Độ phân giải" value={o.doPhanGiai ?? "1080p"} onChange={(v) => set("doPhanGiai", v)} options={[{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }, { value: "4k", label: "4K" }]} />
                  </div>
                  <div className="xb-row">
                    <span>Khung hình</span>
                    <Segmented label="Khung hình mỗi giây" value={String(o.fps ?? 30) as "24" | "30" | "60"} onChange={(v) => set("fps", Number(v) as 24 | 30 | 60)} options={[{ value: "24", label: "24 fps" }, { value: "30", label: "30 fps" }, { value: "60", label: "60 fps" }]} />
                  </div>
                  <div className="xb-row">
                    <span>Chất lượng</span>
                    <Segmented label="Chất lượng" value={o.chatLuong ?? "chuan"} onChange={(v) => set("chatLuong", v)} options={[{ value: "nhap", label: "Nháp" }, { value: "chuan", label: "Chuẩn" }, { value: "cao", label: "Cao" }]} />
                  </div>
                  <Check label="In phụ đề vào hình" v={o.phuDeCung !== false} on={(v) => set("phuDeCung", v)} />
                  <Check label="Mã QR “vào để tự làm” trên cảnh câu hỏi và tương tác" v={o.maQr !== false} on={(v) => set("maQr", v)} />
                </>
              ) : (
                <p className="xb-note">{formats.find((f) => f.id === fmt)?.mo}</p>
              )}
            </div>

            {job && (
              <div className="xb-job" aria-live="polite" data-testid="xb-job">
                <div className="xb-row">
                  <b>{job.stage}</b>
                  <span className="sp" />
                  {job.status === "xong" && <Badge tone="ok">{sizeText(job.size)}</Badge>}
                  {job.status === "loi" && <Badge tone="danger">Lỗi</Badge>}
                  {job.status === "da-huy" && <Badge>Đã huỷ</Badge>}
                  {running && job.etaSec !== undefined && <small>{etaText(job.etaSec)}</small>}
                </div>
                {job.status !== "loi" && job.status !== "da-huy" && <Meter value={running && job.total <= 1 ? 35 : pct} label="Tiến độ xuất" />}
                {job.error && <p className="xb-err">{job.error}</p>}
                {job.warnings.length > 0 && (
                  <ul className="xb-warn">
                    {job.warnings.slice(0, 4).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
                {job.status === "xong" && (
                  <div className="xb-row">
                    <Button size="sm" icon="down" onClick={() => downloadJob(job).catch((e: unknown) => setErr(errText(e)))} data-testid="xb-dl">
                      Tải lại {job.fileName}
                    </Button>
                    {job.coPhuDe && (
                      <Button size="sm" variant="ghost" onClick={() => downloadJob(job, true).catch((e: unknown) => setErr(errText(e)))}>
                        Phụ đề .srt
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            {err && (
              <p className="xb-err" role="alert">
                {err}
              </p>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

function Check({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="xb-check">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
