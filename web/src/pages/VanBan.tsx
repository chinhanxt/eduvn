import { useEffect, useState } from "react";
import { api, errText, exportVanBan, type VanBanSummary } from "../api";
import { Icon } from "../Icon";

const LOAI: Record<string, { ten: string; ma: string; tag: string }> = {
  thong_bao: { ten: "Thông báo", ma: "TB", tag: "" },
  ke_hoach: { ten: "Kế hoạch", ma: "KH", tag: "violet" },
  bao_cao: { ten: "Báo cáo", ma: "BC", tag: "green" },
  bien_ban: { ten: "Biên bản", ma: "BB", tag: "amber" },
  to_trinh: { ten: "Tờ trình", ma: "TTr", tag: "violet" },
  giay_moi: { ten: "Giấy mời", ma: "GM", tag: "green" },
  quyet_dinh: { ten: "Quyết định", ma: "QĐ", tag: "amber" },
  cong_van: { ten: "Công văn", ma: "CV", tag: "" },
};

export function VanBan() {
  const [rows, setRows] = useState<VanBanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<VanBanSummary[]>("/api/van-ban").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  return (
    <>
      <h1>Văn bản hành chính</h1>
      {error && <div className="err">{error}</div>}
      {rows?.length === 0 && <div className="card"><div className="empty">—</div></div>}
      {rows && rows.length > 0 && (
        <div className="card" data-testid="vb-list">
          {rows.map((v) => {
            const l = LOAI[v.loai] ?? { ten: v.loai, ma: "", tag: "" };
            return (
              <div key={v.id} data-testid="vb-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #eef0f5" }}>
                <Icon name="exam" size={22} />
                <span className={`tag ${l.tag}`} style={{ minWidth: 76, textAlign: "center" }}>{l.ten}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{v.trichYeu}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Số: {v.soKyHieu}{v.ngay ? ` · ${v.ngay.split("-").reverse().join("/")}` : ""}</div>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(v.updatedAt).toLocaleDateString("vi-VN")}</span>
                <button className="btn" onClick={() => void exportVanBan(v.id)} data-testid="vb-download"><Icon name="down" size={18} />Tải Word</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
