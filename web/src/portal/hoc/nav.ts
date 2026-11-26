import type { NavEntry, NavItem } from "../../ui/shell/nav";
import type { ToolGroup } from "../../demo/kit/ToolMap";
import type { ArtKind } from "../../demo/kit/ToolArt";
import { HOC_PATH } from "../../student/paths";
import { subjectColor } from "../hocToday";
import type { HocToday } from "../today";

/** Một chức năng cổng Học: `side` = có trên thanh bên; `account` = chỉ tài khoản (phiên mã lớp không có). Màn thật + mô phỏng chung nhóm theo nghĩa. */
type HocTool = NavItem & { desc: string; art: ArtKind; side?: boolean; account?: boolean; keywords?: string };
type HocGroup = { id: string; title: string; color: string; items: HocTool[] };

const HOC_TOOLS: HocGroup[] = [
  {
    id: "hang-ngay",
    title: "Hằng ngày",
    color: "#2F5D8A",
    items: [
      { to: "/hoc", label: "Hôm nay", icon: "home", end: true, side: true, desc: "Việc tiếp theo của em", art: "today" },
      { to: HOC_PATH.baiTap, label: "Bài tập", icon: "exam", side: true, desc: "Bài cô thầy giao", art: "exam" },
      { to: "/hoc/luyen-tap", label: "Luyện tập", icon: "layers", side: true, account: true, desc: "Ôn thẻ đến hạn", art: "cards" },
      { to: "/hoc/gia-su", label: "Gia sư", icon: "bot", side: true, account: true, desc: "Hỏi gia sư AI từng bước", art: "chat" },
      { to: HOC_PATH.ketQua(), label: "Kết quả", icon: "chart", side: true, desc: "Điểm và tiến bộ", art: "result" },
      { to: "/choi", href: "/choi", label: "Vào đấu trường", icon: "game", side: true, desc: "Thi đấu cùng lớp bằng mã PIN", art: "podium" },
    ],
  },
  {
    id: "tu-hoc",
    title: "Tự học cùng AI",
    color: "#0B7285",
    items: [
      { to: "/hoc/ho-so", label: "Hồ sơ AI", icon: "user", side: true, desc: "AI hiểu em mạnh, yếu ở đâu", art: "profile" },
      { to: "/hoc/lo-hong", label: "Vòng lỗ hổng", icon: "repeat", side: true, desc: "Tìm lỗ hổng, luyện đến khi vững", art: "loop" },
      { to: "/hoc/lich", label: "Lịch học", icon: "cal", side: true, desc: "AI xếp giờ ôn hợp nhịp em", art: "calendar" },
      { to: "/hoc/gia-su-hieu-minh", label: "Gia sư hiểu mình", icon: "bot", desc: "Mỗi em một cách giảng", art: "duo" },
      { to: "/hoc/lo-trinh", label: "Lộ trình", icon: "target", account: true, desc: "Chặng học tới mục tiêu", art: "path" },
    ],
  },
  {
    id: "doc",
    title: "Đọc & ôn thi",
    color: "#6F42C1",
    items: [
      { to: "/hoc/giao-trinh", label: "Giáo trình", icon: "book", side: true, account: true, desc: "Giáo trình sống theo lớp", art: "book" },
      { to: "/hoc/so-tay", label: "Sổ tay", icon: "book", side: true, desc: "Ghi chép, podcast từ tài liệu", art: "notebook" },
      { to: "/hoc/huong-nghiep", label: "Ôn thi & ngành", icon: "target", side: true, desc: "Điểm cần, tổ hợp, chọn ngành", art: "compass", keywords: "dai hoc thpt to hop" },
      { to: "/hoc/doc-xem", label: "Đọc & xem", icon: "video", desc: "Đọc nhập vai, video bài học", art: "video" },
      { to: "/hoc/nghien-cuu", label: "Nghiên cứu sâu", icon: "search", desc: "AI tìm nguồn, viết báo cáo", art: "search" },
    ],
  },
];

const ALL: NavItem = { to: "/hoc/tat-ca", label: "Tất cả công cụ", icon: "more" };
const strip = ({ desc: _d, art: _a, side: _s, account: _c, keywords: _k, ...n }: HocTool): NavItem => n;
const visible = (account: boolean) => HOC_TOOLS.map((g) => ({ ...g, items: g.items.filter((t) => account || !t.account) }));

/** Bản đồ chức năng cho trang /hoc/tat-ca. */
export const hocToolMap = (account: boolean): ToolGroup[] => visible(account);

/** Điều hướng cổng Học: Hằng ngày (≤ 6) + Tự học cùng AI (6) + Tất cả công cụ + Môn học; mục ít dùng ẩn (vẫn có breadcrumb, Ctrl K). */
export function hocNav(account: boolean, d: HocToday | undefined): { nav: NavEntry[]; tabs: NavItem[] } {
  const count = (n: NavItem): NavItem =>
    n.to === HOC_PATH.baiTap ? { ...n, count: d?.upcoming.filter((u) => u.canStart).length } : n.to === "/hoc/luyen-tap" ? { ...n, count: d?.review?.due } : n;
  const groups = visible(account);
  const daily = groups[0]!.items.map((t) => count(strip(t)));
  const rest = groups.slice(1).flatMap((g) => g.items);
  const self = rest.filter((t) => t.side).slice(0, 6).map(strip);
  const hidden = [...groups[0]!.items.filter((t) => !t.side), ...rest.filter((t) => !self.some((s) => s.to === t.to))].map((t) => ({ ...strip(t), hidden: true }));
  const subj = (d?.subjects ?? []).map((s, i): NavItem => ({ to: account ? "/hoc/giao-trinh" : `${HOC_PATH.baiTap}?mon=${encodeURIComponent(s.subject)}`, label: s.subject, dot: subjectColor(s.subject, i) }));
  const nav: NavEntry[] = [...daily, { group: "Tự học cùng AI" }, ...self, ALL, ...(subj.length ? [{ group: "Môn học" }, ...subj] : []), ...hidden];
  const pick = (to: string) => daily.find((n) => n.to === to);
  const tabs = account
    ? [pick("/hoc"), pick(HOC_PATH.baiTap), pick("/hoc/luyen-tap"), pick("/hoc/gia-su"), strip(groups[2]!.items[0]!)]
    : [pick("/hoc"), pick(HOC_PATH.baiTap), pick(HOC_PATH.ketQua()), { ...pick("/choi")!, label: "Đấu trường" }];
  return { nav, tabs: tabs.filter((t): t is NavItem => !!t) };
}
