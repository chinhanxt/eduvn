// Hộp thoại "Nhập bài giảng": .pptx (giữ bố cục → cảnh slide sửa được, lời giảng từ ghi chú hoặc AI soạn) hoặc gói .eduvn.zip / .maic.zip.
import { useRef, useState } from "react";
import { Button, Dialog, Segmented } from "../ui";
import { type NhapKetQua, errText, nhapTep, sizeText } from "./api";
import "./xuat-ban.css";

export function NhapButton({ onDone }: { onDone: (r: NhapKetQua) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon="upload" onClick={() => setOpen(true)} data-testid="xb-nhap-open">
        Nhập .pptx / gói
      </Button>
      {open && <NhapDialog onClose={() => setOpen(false)} onDone={(r) => (setOpen(false), onDone(r))} />}
    </>
  );
}

export function NhapDialog({ onClose, onDone }: { onClose: () => void; onDone: (r: NhapKetQua) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loiGiang, setLoiGiang] = useState<"ghi-chu" | "ai" | "khong">("ghi-chu");
  const [giongDoc, setGiongDoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const isPptx = !!file && /\.(pptx|ppsx|potx)$/i.test(file.name);

  async function go() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      onDone(await nhapTep(file, { loiGiang, giongDoc }));
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      title="Nhập bài giảng"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Đóng
          </Button>
          <Button variant="primary" icon="upload" busy={busy} disabled={!file} onClick={go} data-testid="xb-nhap-go">
            Nhập
          </Button>
        </>
      }
    >
      <div className="xb">
        <button
          type="button"
          className={`xb-drop${drag ? " on" : ""}`}
          onClick={() => inp.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
        >
          <b>{file ? file.name : "Kéo tệp vào đây hoặc bấm để chọn"}</b>
          <small>{file ? sizeText(file.size) : ".pptx (PowerPoint) · .eduvn.zip (gói EDUVN) · .maic.zip (OpenMAIC)"}</small>
        </button>
        <input ref={inp} type="file" accept=".pptx,.ppsx,.potx,.zip" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="xb-nhap-file" />
        {isPptx && (
          <div className="xb-opts">
            <div className="xb-row">
              <span>Lời giảng</span>
              <Segmented label="Lời giảng" value={loiGiang} onChange={setLoiGiang} options={[{ value: "ghi-chu", label: "Lấy từ ghi chú" }, { value: "ai", label: "AI soạn thêm" }, { value: "khong", label: "Không" }]} />
            </div>
            <label className="xb-check">
              <input type="checkbox" checked={giongDoc} onChange={(e) => setGiongDoc(e.target.checked)} disabled={loiGiang === "khong"} />
              <span>Đọc giọng lời giảng (chạy nền, vài phút)</span>
            </label>
            <p className="xb-note">Giữ vị trí chữ, hình, ảnh, bảng, biểu đồ, công thức và nền của từng trang; trang ẩn được bỏ qua.</p>
          </div>
        )}
        {err && (
          <p className="xb-err" role="alert">
            {err}
          </p>
        )}
      </div>
    </Dialog>
  );
}
