import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "../../ui/components/Button";
import { Tabs } from "../../ui/components/Tabs";
import { useToast } from "../../ui/components/Toast";
import { Icon } from "../../ui/Icon";
import { GUARDIANS, KHANH_DUY, MINH_ANH, QUANG_HUY, SCHOOL, TEACHERS, THAO_VY, DUC_THINH, SCHOOL_MORE } from "../kit/world";
import { MockBadge } from "../kit/MockBadge";

const PRINCIPAL = SCHOOL.principal.replace(/^thầy /, "");

/* ---------------- Người dùng ---------------- */
type Role = "hs" | "ph" | "gv" | "bgh" | "qt";
const ROLES: { id: Role; label: string; n: number; c: string }[] = [
  { id: "hs", label: "Học sinh, SV", n: SCHOOL.students, c: "var(--c1)" },
  { id: "ph", label: "Phụ huynh", n: SCHOOL_MORE.parents, c: "var(--c3)" },
  { id: "gv", label: "Giáo viên", n: SCHOOL.teachers, c: "var(--c7)" },
  { id: "bgh", label: "Ban giám hiệu", n: 4, c: "var(--c5)" },
  { id: "qt", label: "Quản trị", n: 2, c: "var(--c4)" },
];
type St = "on" | "moi" | "khoa";
type U = { id: string; name: string; role: Role; where: string; st: St; last: string };

const USERS: U[] = [
  { id: "cong", name: PRINCIPAL, role: "bgh", where: "Hiệu trưởng", st: "on", last: "vừa xong" },
  ...TEACHERS.map((t, i): U => ({ id: t.id, name: t.name, role: "gv", where: [t.subject, t.className].filter(Boolean).join(" · "), st: "on", last: ["8 phút", "1 giờ", "hôm qua", "3 giờ", "20 phút", "2 ngày", "5 giờ"][i] ?? "hôm qua" })),
  { id: MINH_ANH.id, name: MINH_ANH.name, role: "hs", where: MINH_ANH.className!, st: "on", last: "12 phút" },
  { id: KHANH_DUY.id, name: KHANH_DUY.name, role: "hs", where: KHANH_DUY.className!, st: "on", last: "2 giờ" },
  { id: DUC_THINH.id, name: DUC_THINH.name, role: "hs", where: DUC_THINH.className!, st: "on", last: "3 giờ" },
  { id: THAO_VY.id, name: THAO_VY.name, role: "hs", where: THAO_VY.className!, st: "on", last: "hôm qua" },
  { id: QUANG_HUY.id, name: QUANG_HUY.name, role: "hs", where: QUANG_HUY.className!, st: "on", last: "40 phút" },
  ...GUARDIANS.map((g, i): U => ({ id: g.id, name: g.name, role: "ph", where: i === 0 ? "Mẹ Minh Anh" : "Ông nội Khánh Duy", st: "on", last: i === 0 ? "1 giờ" : "hôm qua" })),
  { id: "cntt", name: "Phòng CNTT", role: "qt", where: "Máy chủ AI tại trường", st: "on", last: "5 phút" },
];
const roleOf = (r: Role) => ROLES.find((x) => x.id === r)!;
const ST: Record<St, string> = { on: "Hoạt động", moi: "Chưa kích hoạt", khoa: "Đã khoá" };

function Mix() {
  const total = ROLES.reduce((a, r) => a + r.n, 0);
  return (
    <div className="mix">
      <div className="mix-bar" role="img" aria-label={ROLES.map((r) => `${r.label} ${r.n}`).join(", ")}>
        {ROLES.map((r, i) => (
          <i key={r.id} style={{ flexGrow: r.n, background: r.c, ["--i" as string]: i }} title={`${r.label}: ${r.n.toLocaleString("vi-VN")}`} />
        ))}
      </div>
      <ul className="mix-leg">
        {ROLES.map((r) => (
          <li key={r.id}>
            <i style={{ background: r.c }} />
            <span>{r.label}</span>
            <b className="num">{r.n.toLocaleString("vi-VN")}</b>
          </li>
        ))}
        <li className="tot">
          <span>Tổng</span>
          <b className="num">{total.toLocaleString("vi-VN")}</b>
        </li>
      </ul>
    </div>
  );
}

function Users() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [st, setSt] = useState<Record<string, St>>({});
  const [imp, setImp] = useState<"" | "dang" | "xong">("");
  const rows = useMemo(() => {
    const k = q.trim().toLocaleLowerCase("vi");
    return USERS.filter((u) => (!role || u.role === role) && (!k || `${u.name} ${u.where}`.toLocaleLowerCase("vi").includes(k)));
  }, [q, role]);
  const lock = (u: U) => {
    const cur = st[u.id] ?? u.st;
    const next: St = cur === "khoa" ? "on" : "khoa";
    setSt((s) => ({ ...s, [u.id]: next }));
    toast({ title: next === "khoa" ? `Đã khoá ${u.name}` : `Đã mở khoá ${u.name}`, kind: "ok", undo: () => setSt((s) => ({ ...s, [u.id]: cur })) });
  };
  const runImport = () =>
    new Promise<void>((ok) => {
      setImp("dang");
      setTimeout(() => {
        setImp("xong");
        toast({ title: "Đã đồng bộ từ VNEdu", msg: `${SCHOOL.students.toLocaleString("vi-VN")} HS · ${SCHOOL.teachers} GV · ${SCHOOL_MORE.parents.toLocaleString("vi-VN")} phụ huynh. Không có thay đổi lạ.`, kind: "ok" });
        ok();
      }, 2600);
    });
  return (
    <div className="qt-users">
      <Mix />
      <div className="qt-bar">
        <label className="qt-search">
          <Icon name="search" size="sm" />
          <input className="input" placeholder="Tìm tên, lớp, môn" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm người dùng" />
        </label>
        <div className="qt-chips" role="group" aria-label="Lọc vai trò">
          {ROLES.slice(0, 3).map((r) => (
            <button key={r.id} type="button" className="chip" aria-pressed={role === r.id} onClick={() => setRole(role === r.id ? null : r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="grow" />
        <Button variant="primary" icon={imp === "xong" ? "check" : "refresh"} onClick={runImport} busy={imp === "dang"}>
          {imp === "xong" ? "Đã đồng bộ" : "Đồng bộ VNEdu"}
        </Button>
      </div>
      {imp === "dang" && <div className="qt-sync" aria-hidden="true"><i /></div>}
      <div className="qt-table" role="table" aria-label="Người dùng">
        <div className="qt-tr hd" role="row">
          <span role="columnheader">Họ tên</span>
          <span role="columnheader">Vai trò</span>
          <span role="columnheader" className="hide-s">Lớp · môn</span>
          <span role="columnheader">Trạng thái</span>
          <span role="columnheader" className="hide-s">Lần cuối</span>
          <span role="columnheader" />
        </div>
        {rows.map((u, i) => {
          const s = st[u.id] ?? u.st;
          const r = roleOf(u.role);
          return (
            <div key={u.id} className={s === "khoa" ? "qt-tr off" : "qt-tr"} role="row" style={{ ["--i" as string]: i }}>
              <span role="cell" className="who">
                <span className="tr-av" style={{ background: `color-mix(in srgb, ${r.c} 16%, var(--bg))`, color: "var(--ink)" }}>{u.name.split(" ").slice(-2).map((w) => w[0]).join("")}</span>
                <b>{u.name}</b>
              </span>
              <span role="cell" className="role"><i style={{ background: r.c }} />{r.label}</span>
              <span role="cell" className="hide-s muted">{u.where}</span>
              <span role="cell" className={`st ${s}`}><i />{ST[s]}</span>
              <span role="cell" className="hide-s muted">{u.last}</span>
              <span role="cell" className="act">
                <button type="button" className="btn ghost icon sm" onClick={() => lock(u)} aria-label={s === "khoa" ? `Mở khoá ${u.name}` : `Khoá ${u.name}`} title={s === "khoa" ? "Mở khoá" : "Khoá"}>
                  <Icon name={s === "khoa" ? "key" : "lock"} size="sm" />
                </button>
              </span>
            </div>
          );
        })}
        {!rows.length && <p className="qt-empty">Không có ai khớp “{q}”.</p>}
      </div>
    </div>
  );
}

/* ---------------- Nhật ký kiểm toán ---------------- */
type Kind = "ai" | "ho-so" | "quyen" | "xuat" | "he-thong";
const KINDS: { id: Kind; label: string; icon: string }[] = [
  { id: "ai", label: "AI chia sẻ", icon: "shuffle" },
  { id: "ho-so", label: "Xem hồ sơ", icon: "eye" },
  { id: "quyen", label: "Quyền", icon: "shield" },
  { id: "xuat", label: "Xuất dữ liệu", icon: "down" },
  { id: "he-thong", label: "Hệ thống", icon: "sliders" },
];
const LOG: { t: string; who: string; what: string; k: Kind; h: string }[] = [
  { t: "21:05", who: "AI GV chủ nhiệm 10A1", what: "gửi AI phụ huynh 1 gợi ý kèm con", k: "ai", h: "9c1e" },
  { t: "21:04", who: "AI học sinh · một em 10A1", what: "báo AI GV chủ nhiệm: bí một chủ đề 3 ngày", k: "ai", h: "77ab" },
  { t: "20:47", who: "bác Trần Văn Tư", what: "xem “Khánh Duy hôm nay”", k: "ho-so", h: "e402" },
  { t: "19:30", who: "Hệ thống", what: "gửi 1.105 tin Zalo tối cho phụ huynh", k: "he-thong", h: "5f90" },
  { t: "16:12", who: "cô Lê Thu Hà", what: "xem hồ sơ AI lớp 10A1", k: "ho-so", h: "a3d7" },
  { t: "15:40", who: SCHOOL.principal, what: "xuất báo cáo toàn trường (chỉ số tổng hợp)", k: "xuat", h: "0b6c" },
  { t: "14:02", who: "Phòng CNTT", what: "cấp quyền tổ trưởng Văn cho thầy Nguyễn Quốc Bảo", k: "quyen", h: "d81f" },
  { t: "10:15", who: "chị Nguyễn Thị Hồng", what: "bấm “quên điều này” trên hồ sơ của con", k: "quyen", h: "36e2" },
  { t: "09:00", who: "Hệ thống", what: "tự xoá 312 mục quá hạn 24 tháng", k: "he-thong", h: "c4a9" },
  { t: "08:31", who: "AI tại trường", what: "0 dữ liệu học sinh ra ngoài trường", k: "he-thong", h: "71d0" },
];

function Log() {
  const [k, setK] = useState<Kind | null>(null);
  const [check, setCheck] = useState(0); // 0 chưa · 1 đang · 2 xong
  const rows = LOG.filter((r) => !k || r.k === k);
  const verify = () =>
    new Promise<void>((ok) => {
      setCheck(1);
      setTimeout(() => {
        setCheck(2);
        ok();
      }, 300 + LOG.length * 140);
    });
  return (
    <div className="qt-log">
      <div className="qt-bar">
        <div className="qt-chips" role="group" aria-label="Lọc loại">
          {KINDS.map((x) => (
            <button key={x.id} type="button" className="chip" aria-pressed={k === x.id} onClick={() => setK(k === x.id ? null : x.id)}>
              <Icon name={x.icon} size="sm" />
              {x.label}
            </button>
          ))}
        </div>
        <span className="grow" />
        {check === 2 ? (
          <span className="qt-ok"><Icon name="checkc" size="sm" /> Nguyên vẹn · 1.284 mục</span>
        ) : (
          <Button variant="primary" icon="shield" onClick={verify} busy={check === 1}>
            Kiểm tra toàn vẹn
          </Button>
        )}
      </div>
      <ol className={check ? "tl run" : "tl"}>
        {rows.map((r, i) => {
          const kk = KINDS.find((x) => x.id === r.k)!;
          return (
            <li key={r.t + r.h} className={`k-${r.k}`} style={{ ["--i" as string]: i }}>
              <time className="num">{r.t}</time>
              <span className="pin"><Icon name={kk.icon} size="sm" /></span>
              <p>
                <b>{r.who}</b> {r.what}
              </p>
              <code className="hash">#{r.h}…</code>
              <span className="ok" aria-label="Khớp"><Icon name="check" size="sm" /></span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Nhà trường — Quản trị: người dùng (đồng bộ VNEdu, khoá/mở) và nhật ký kiểm toán có kiểm tra toàn vẹn. */
export default function QuanTri() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "nhat-ky" ? "nhat-ky" : "nguoi-dung";
  return (
    <div className="tr-page">
      <div className="tr-head">
        <p className="eyebrow">Tài khoản · nhật ký</p>
        <h1>
          Quản trị
          <MockBadge />
        </h1>
      </div>
      <div className="qt">
        <Tabs
          label="Quản trị"
          value={tab}
          onChange={(v: string) => setSp(v === "nhat-ky" ? { tab: "nhat-ky" } : {}, { replace: true })}
          items={[
            { value: "nguoi-dung", label: "Người dùng" },
            { value: "nhat-ky", label: "Nhật ký" },
          ]}
        />
        {tab === "nguoi-dung" ? <Users /> : <Log />}
      </div>
    </div>
  );
}
