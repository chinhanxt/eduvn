import type { NavEntry, NavItem } from "../../ui/shell/nav";
import { subjectColor } from "../hocToday";
import type { HocToday } from "../today";

/** Mục điều hướng cổng Học: tài khoản Keycloak đủ 5 điểm đến + Môn học; phiên mã lớp chỉ Hôm nay · Bài tập · Đấu trường. */
export function hocNav(account: boolean, d: HocToday | undefined): { nav: NavEntry[]; tabs: NavItem[] } {
  const home: NavItem = { to: "/hoc", label: "Hôm nay", icon: "home", end: true };
  const bai: NavItem = { to: "/hoc/hs", label: "Bài tập", icon: "exam", count: d?.upcoming.filter((u) => u.canStart).length };
  const arena: NavItem = { to: "/choi", href: "/choi", label: "Vào đấu trường", icon: "game" };
  if (!account) return { nav: [home, bai, arena], tabs: [home, bai, { ...arena, label: "Đấu trường" }] };
  const luyen: NavItem = { to: "/hoc/luyen-tap", label: "Luyện tập", icon: "layers", count: d?.review?.due };
  const giaSu: NavItem = { to: "/hoc/gia-su", label: "Gia sư", icon: "bot" };
  const giaoTrinh: NavItem = { to: "/hoc/giao-trinh", label: "Giáo trình", icon: "book" };
  const subj = (d?.subjects ?? []).map((s, i): NavItem => ({ to: "/hoc/giao-trinh", label: s.subject, dot: subjectColor(s.subject, i) }));
  return {
    nav: [home, bai, luyen, giaSu, giaoTrinh, { to: "/hoc/lo-trinh", label: "Lộ trình", icon: "target" }, arena, ...(subj.length ? [{ group: "Môn học" }, ...subj] : [])],
    tabs: [home, bai, luyen, giaSu, giaoTrinh],
  };
}

