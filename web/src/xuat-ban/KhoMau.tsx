// Kho mẫu PowerPoint của trường/tổ: tải .pptx mẫu (đổ bài vào đúng mẫu) hoặc slide tham khảo (chỉ lấy phong cách màu/phông).
import { useEffect, useRef, useState } from "react";
import { Badge, Button, ConfirmDialog, Input, Segmented, SkeletonRows } from "../ui";
import { type Mau, deleteMau, errText, listMau, sizeText, uploadMau } from "./api";

export function KhoMau() {
  const [rows, setRows] = useState<Mau[] | null>(null);
  const [ten, setTen] = useState("");
  const [loai, setLoai] = useState<"mau" | "phong_cach">("mau");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [xoa, setXoa] = useState<Mau | null>(null);
  const inp = useRef<HTMLInputElement>(null);
  const load = () => listMau().then(setRows, (e: unknown) => setErr(errText(e)));
  useEffect(() => void load(), []);

  async function add() {
    if (!file) return;
    setErr(null);
    try {
      await uploadMau(file, ten.trim() || file.name.replace(/\.\w+$/, ""), loai);
      setFile(null);
      setTen("");
      if (inp.current) inp.current.value = "";
      await load();
    } catch (e) {
      setErr(errText(e));
    }
  }

  return (
    <div className="xb-kho" data-testid="xb-kho-panel">
      <div className="xb-up">
        <Segmented label="Loại mẫu" value={loai} onChange={setLoai} options={[{ value: "mau", label: "Mẫu của trường" }, { value: "phong_cach", label: "Slide tham khảo" }]} />
        <p className="xb-note">{loai === "mau" ? "Bài sẽ được đổ vào đúng mẫu: giữ nền, logo, màu và vị trí tiêu đề/nội dung của mẫu." : "Chỉ rút màu và phông chữ từ slide tham khảo; bố cục vẫn theo EDUVN."}</p>
        <div className="xb-row">
          <input ref={inp} type="file" accept=".pptx,.potx" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="xb-mau-file" />
          <Button icon="upload" onClick={() => inp.current?.click()}>
            {file ? file.name : "Chọn tệp .pptx"}
          </Button>
          <Input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên mẫu, vd Tổ Toán 2026" aria-label="Tên mẫu" />
          <Button variant="primary" disabled={!file} onClick={add} doneLabel="Đã thêm" data-testid="xb-mau-add">
            Thêm
          </Button>
        </div>
      </div>
      {err && (
        <p className="xb-err" role="alert">
          {err}
        </p>
      )}
      {rows === null ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <p className="xb-note">Chưa có mẫu nào. Tải tệp .pptx mẫu của trường hoặc của tổ lên để mọi giáo viên dùng chung.</p>
      ) : (
        <ul className="xb-maus">
          {rows.map((m) => (
            <li key={m.id}>
              <span className="xb-swatch">
                {["accent1", "accent2", "accent3", "accent4", "dk1"].map((k) => (m.info.colors[k] ? <i key={k} style={{ background: m.info.colors[k] }} /> : null))}
              </span>
              <span className="grow">
                <b>{m.name}</b>
                <small>
                  {m.kind === "mau" ? "Mẫu của trường" : "Slide tham khảo"} · {m.info.fonts.major ?? "—"} / {m.info.fonts.minor ?? "—"} · {Math.round((m.info.width / m.info.height) * 9) === 16 ? "16:9" : "4:3"} · {sizeText(m.size)}
                </small>
              </span>
              {m.info.hasPicture && <Badge tone="outline">có logo</Badge>}
              {m.mine && <Button variant="ghost" size="sm" icon="trash" aria-label={`Xoá mẫu ${m.name}`} onClick={() => setXoa(m)} />}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!xoa}
        title="Xoá mẫu?"
        text={`Mẫu “${xoa?.name ?? ""}” sẽ bị xoá khỏi kho của trường.`}
        confirmLabel="Xoá"
        onClose={() => setXoa(null)}
        onConfirm={async () => {
          if (xoa) await deleteMau(xoa.id).catch((e: unknown) => setErr(errText(e)));
          await load();
        }}
      />
    </div>
  );
}
