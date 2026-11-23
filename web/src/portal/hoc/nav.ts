import type { NavEntry, NavItem } from "../../ui/shell/nav";
import { HOC_PATH } from "../../student/paths";
import { subjectColor } from "../hocToday";
import type { HocToday } from "../today";

/** Mục điều hướng cổng Học: tài khoản Keycloak đủ điểm đến + Môn học; phiên mã lớp chỉ Hôm nay · Bài tập · Kết quả · Đấu trường. */
export function hocNav(account: boolean, d: HocToday | undefined): { nav: NavEntry[]; tabs: NavItem[] } {
  const home: NavItem = { to: "/hoc", label: "Hôm nay", icon: "home", end: true };
  const bai: NavItem = { to: HOC_PATH.baiTap, label: "Bài tập", icon: "exam", count: d?.upcoming.filter((u) => u.canStart).length };
  const ketQua: NavItem = { to: HOC_PATH.ketQua(), label: "Kết quả", icon: "chart" };
  const arena: NavItem = { to: "/choi", href: "/choi", label: "Vào đấu trường", icon: "game" };
  const subj = (d?.subjects ?? []).map((s, i): NavItem => ({ to: account ? "/hoc/giao-trinh" : `${HOC_PATH.baiTap}?mon=${encodeURIComponent(s.subject)}`, label: s.subject, dot: subjectColor(s.subject, i) }));
  const subjGroup: NavEntry[] = subj.length ? [{ group: "Môn học" }, ...subj] : [];
  if (!account) return { nav: [home, bai, ketQua, arena, ...subjGroup], tabs: [home, bai, ketQua, { ...arena, label: "Đấu trường" }] };
  const luyen: NavItem = { to: "/hoc/luyen-tap", label: "Luyện tập", icon: "layers", count: d?.review?.due };
  const giaSu: NavItem = { to: "/hoc/gia-su", label: "Gia sư", icon: "bot" };
  const giaoTrinh: NavItem = { to: "/hoc/giao-trinh", label: "Giáo trình", icon: "book" };
  return {
    nav: [home, bai, luyen, giaSu, giaoTrinh, ketQua, { to: "/hoc/lo-trinh", label: "Lộ trình", icon: "target" }, arena, ...subjGroup],
    tabs: [home, bai, luyen, giaSu, giaoTrinh],
  };
}

