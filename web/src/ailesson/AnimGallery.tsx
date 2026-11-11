import { useEffect, useMemo, useState } from "react";
import { api, errText } from "../api";
import { Icon } from "../Icon";
import { BASE } from "./lib";
import { coerceField } from "./pure";

export type AnimTemplate = { id: string; ten: string; engine: "manim" | "hyperframes"; monHoc: string[]; lop: [number, number]; dungKhi: string; khongDungKhi: string; thamSo: string; viDu: Record<string, unknown>; thoiLuong: [number, number] };

const SUBJECT: Record<string, string> = { toan: "Toán", ly: "Vật lí", hoa: "Hoá học", sinh: "Sinh học", van: "Ngữ văn", su: "Lịch sử", dia: "Địa lí", anh: "Tiếng Anh", tin: "Tin học", "*": "Mọi môn" };
const strip = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();

/** Thư viện "Chọn hoạt hình": ảnh mẫu từng loại, GV chọn rồi sửa tham số bằng biểu mẫu đơn giản (thời lượng tự khớp lời giảng). */
export function AnimGallery({ onPick, onClose, busy }: { onPick: (spec: { template: string; tieuDe?: string; params: Record<string, unknown> }) => void; onClose: () => void; busy: boolean }) {
  const [list, setList] = useState<AnimTemplate[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<AnimTemplate | null>(null);
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<AnimTemplate[]>(`${BASE}/mau-hoat-hinh`).then(setList).catch((e: unknown) => setErr(errText(e)));
  }, []);
  const shown = useMemo(() => {
    const k = strip(q.trim());
    return list.filter((t) => !k || strip(`${t.ten} ${t.dungKhi} ${t.monHoc.map((m) => SUBJECT[m] ?? m).join(" ")}`).includes(k));
  }, [list, q]);

  const choose = (t: AnimTemplate) => {
    setSel(t);
    setErr(null);
    setTitle("");
    setVals(Object.fromEntries(Object.entries(t.viDu).map(([k, v]) => [k, typeof v === "boolean" ? v : typeof v === "number" || typeof v === "string" ? String(v) : JSON.stringify(v)])));
  };
  const submit = () => {
    if (!sel) return;
    try {
      const params = Object.fromEntries(Object.entries(sel.viDu).map(([k, ex]) => [k, coerceField(ex, vals[k] ?? "")]));
      setErr(null);
      onPick({ template: sel.id, ...(title.trim() && { tieuDe: title.trim() }), params });
    } catch {
      setErr("Có ô nhập sai định dạng (số hoặc JSON). Kiểm tra lại các ô.");
    }
  };

  return (
    <div className="card ail-gal" data-testid="ail-gallery">
      <div className="bar" style={{ marginBottom: 8 }}>
        <b>Chọn hoạt hình</b>
        <input className="inp" placeholder="Tìm theo tên, môn, chủ đề…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm hoạt hình" />
        <span className="sp" />
        <button className="btn ghost sm" onClick={onClose}>Đóng</button>
      </div>
      {err && <div className="err">{err}</div>}
      {!sel ? (
        <div className="ail-gal-grid">
          {shown.map((t) => (
            <button key={t.id} className="ail-gal-item" onClick={() => choose(t)} data-testid="ail-gal-item">
              <img src={`/anim-thumbs/${t.id}.png`} alt={t.ten} loading="lazy" width={320} height={180} />
              <b>{t.ten}</b>
              <small>{t.monHoc.map((m) => SUBJECT[m] ?? m).join(", ")} · lớp {t.lop[0]}–{t.lop[1]} · {t.engine === "manim" ? "Manim" : "HyperFrames"}</small>
              <span>{t.dungKhi}</span>
            </button>
          ))}
          {shown.length === 0 && <div className="empty">Không có mẫu nào khớp từ khoá</div>}
        </div>
      ) : (
        <div className="ail-gal-form" data-testid="ail-gal-form">
          <img src={`/anim-thumbs/${sel.id}.png`} alt={sel.ten} width={320} height={180} />
          <div>
            <h3 style={{ margin: "0 0 4px" }}>{sel.ten}</h3>
            <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: 14 }}><b>Dùng khi:</b> {sel.dungKhi}<br /><b>Không dùng khi:</b> {sel.khongDungKhi}</p>
            <label className="lbl">Tiêu đề trên hoạt hình (tuỳ chọn)
              <input className="inp w-l" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </label>
            {Object.entries(sel.viDu).map(([k, ex]) => (
              <label key={k} className="lbl" style={{ marginTop: 6 }}>{k}
                {typeof ex === "boolean" ? (
                  <input type="checkbox" checked={vals[k] === true} onChange={(e) => setVals({ ...vals, [k]: e.target.checked })} />
                ) : typeof ex === "number" || typeof ex === "string" ? (
                  <input className="inp w-l" type={typeof ex === "number" ? "number" : "text"} step="any" value={String(vals[k] ?? "")} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
                ) : (
                  <textarea className="inp" rows={3} value={String(vals[k] ?? "")} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
                )}
              </label>
            ))}
            <small style={{ color: "var(--muted)" }}>Thời lượng tự khớp lời giảng của cảnh. Các ô dạng danh sách/đối tượng nhập theo JSON.</small>
            <div className="bar" style={{ marginTop: 10, marginBottom: 0 }}>
              <button className="btn" disabled={busy} onClick={submit} data-testid="ail-gal-go"><Icon name="video" size={18} />Dựng hoạt hình này</button>
              <button className="btn ghost" onClick={() => setSel(null)}>Chọn mẫu khác</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
