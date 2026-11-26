import { useMemo } from "react";
import { Link } from "react-router";
import type { VanBanSummary } from "../api";
import { DocList } from "../portal/gv/DocList";
import { MiniPaper } from "../portal/gv/Preview";

import { dateVi, get, openLink, useRun } from "../portal/gv/kit";
import { Button } from "../ui/components/Button";
import { Badge } from "../ui/components/Chip";
import type { Column } from "../ui/components/Table";
import { useQuery } from "../ui/data/query";
import { usePageMeta } from "../ui/shell/AppShell";

const VB_SAMPLES: [string, string, string][] = [
  ["Thông báo", "Họp phụ huynh cuối học kì I", "Chủ nhiệm 10A1"],
  ["Kế hoạch", "Ngày hội đọc sách toàn trường", "Tổ Ngữ văn"],
  ["Biên bản", "Sinh hoạt tổ chuyên môn tháng 11", "Tổ Sử – Địa"],
  ["Báo cáo", "Kết quả thi đua tháng 11", "Đoàn trường"],
];

const LOAI: Record<string, { ten: string; ma: string }> = {
  thong_bao: { ten: "Thông báo", ma: "TB" },
  ke_hoach: { ten: "Kế hoạch", ma: "KH" },
  bao_cao: { ten: "Báo cáo", ma: "BC" },
  bien_ban: { ten: "Biên bản", ma: "BB" },
  to_trinh: { ten: "Tờ trình", ma: "TTr" },
  giay_moi: { ten: "Giấy mời", ma: "GM" },
  quyet_dinh: { ten: "Quyết định", ma: "QĐ" },
  cong_van: { ten: "Công văn", ma: "CV" },
};
const loaiVi = (k: string) => LOAI[k]?.ten ?? k;

/** /van-ban — văn bản hành chính theo NĐ 30/2020 (soạn qua trợ lý AI): bảng v2, lọc loại, tải Word. */
export function VanBan() {
  usePageMeta("Văn bản hành chính");
  const q = useQuery("gv/van-ban", get<VanBanSummary[]>("/api/van-ban"));
  const run = useRun();
  const sorts = useMemo(() => ({ ngay: (v: VanBanSummary) => v.ngay, sua: (v: VanBanSummary) => v.updatedAt }), []);
  const cols: Column<VanBanSummary>[] = [
    { key: "loai", header: "Loại", width: 120, cell: (v) => <Badge tone="outline">{loaiVi(v.loai)}</Badge> },
    { key: "trich-yeu", header: "Trích yếu", cell: (v) => <span><span className="t-title">{v.trichYeu}</span><span className="t-sub mono">Số: {v.soKyHieu || "—"}</span></span> },
    { key: "ngay", header: "Ngày ban hành", numeric: true, sortable: true, hideSm: true, cell: (v) => dateVi(v.ngay) },
    { key: "sua", header: "Sửa lần cuối", numeric: true, sortable: true, hideSm: true, cell: (v) => dateVi(v.updatedAt) },
    { key: "act", header: "", numeric: true, cell: (v) => <span className="t-acts"><Button size="sm" icon="down" onClick={() => run(() => openLink(`/api/van-ban/${v.id}/export`), "Đang tải văn bản .docx")} data-testid="vb-download">Tải Word</Button></span> },
  ];
  return (
    <DocList
      title="Văn bản hành chính"
      caption={`${q.data?.length ?? 0} văn bản · thể thức NĐ 30/2020`}
      q={q}
      columns={cols}
      rowKey={(v) => v.id}
      text={(v) => `${v.trichYeu} ${v.soKyHieu} ${loaiVi(v.loai)}`}
      sorts={sorts}
      defSort="-sua"
      facet={{ key: "loai", label: "Loại văn bản", of: (v) => v.loai, name: loaiVi }}
      searchHint="Tìm trích yếu, số ký hiệu…"
      testId="vb-list"
      empty={{ icon: "clip", title: "Giấy tờ đúng thể thức", text: "Nhờ trợ lý AI soạn thông báo, kế hoạch, biên bản — lưu ở đây, tải Word.", action: <Link className="btn primary" to="/ket-noi">Kết nối trợ lý AI</Link> }}
      preview={VB_SAMPLES.map(([kind, title, who]) => <MiniPaper key={title} kind={kind} s={{ subj: who, cls: "Trường Liên cấp Bình Minh", title, art: "van" }} />)}
    />
  );
}
