// Thế giới mẫu dạng dữ liệu cho server demo: GV, lớp, phân công, sinh tên HS Việt tự nhiên (ngẫu nhiên có hạt giống).
// Số liệu khớp docs/demo/the-gioi-mau.md và web/src/demo/kit/world.ts (chỉ thêm, không đổi).
import { mulberry32 } from "../../src/domain/rng";
import type { TeacherKey } from "./types";

export type Rng = () => number;
export const SEED = 20261125;

export function rngTools(seed: number) {
  const r = mulberry32(seed);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const chance = (p: number) => r() < p;
  const normal = (m = 0, sd = 1) => {
    const u = Math.max(1e-9, r());
    const v = r();
    return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  /** UUID v4 tất định theo hạt giống. */
  const uuid = () => {
    const h = Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16));
    h[12] = "4";
    h[16] = "89ab"[Math.floor(r() * 4)] as string;
    const s = h.join("");
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  };
  const weighted = <T>(xs: readonly (readonly [T, number])[]): T => {
    const tot = xs.reduce((a, x) => a + x[1], 0);
    let k = r() * tot;
    for (const [v, w] of xs) if ((k -= w) <= 0) return v;
    return xs[xs.length - 1]![0];
  };
  const shuffle = <T>(xs: readonly T[]): T[] => {
    const o = xs.slice();
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [o[i], o[j]] = [o[j] as T, o[i] as T];
    }
    return o;
  };
  return { r, int, pick, chance, normal, uuid, weighted, shuffle };
}
export type Tools = ReturnType<typeof rngTools>;

// ---------------- Họ tên Việt ----------------
const HO: [string, number][] = [
  ["Nguyễn", 31], ["Trần", 11], ["Lê", 9.5], ["Phạm", 7], ["Hoàng", 4], ["Huỳnh", 3], ["Phan", 4.5], ["Vũ", 3], ["Võ", 3], ["Đặng", 2.1],
  ["Bùi", 2], ["Đỗ", 1.4], ["Hồ", 1.3], ["Ngô", 1.3], ["Dương", 1], ["Lý", 0.5], ["Trương", 0.8], ["Đinh", 0.7], ["Mai", 0.5], ["Trịnh", 0.5],
  ["Lâm", 0.5], ["Lương", 0.4], ["Cao", 0.4], ["Tạ", 0.3], ["Đoàn", 0.5], ["Hà", 0.4], ["Tô", 0.3], ["Châu", 0.3], ["Thái", 0.2], ["La", 0.2],
  ["Kiều", 0.2], ["Quách", 0.15], ["Văn", 0.1], ["Lưu", 0.3], ["Đào", 0.4], ["Vương", 0.2], ["Nghiêm", 0.1], ["Triệu", 0.15],
];
const DEM_NAM = ["Văn", "Minh", "Đức", "Quốc", "Hoàng", "Gia", "Thành", "Hữu", "Anh", "Tuấn", "Nhật", "Bảo", "Đăng", "Trung", "Quang", "Thanh", "Khánh", "Hải", "Phúc", "Thiên", "Duy", "Trọng", "Xuân", "Công", "Tấn"];
const DEM_NU = ["Thị", "Ngọc", "Thu", "Thanh", "Minh", "Phương", "Bảo", "Khánh", "Mai", "Hoài", "Gia", "Thảo", "Quỳnh", "Hà", "Diệu", "Kim", "Như", "Tường", "Hồng", "Yến", "Ánh", "Cẩm", "Bích", "Tuệ", "An"];
const TEN_NAM = ["An", "Bảo", "Bình", "Cường", "Danh", "Dũng", "Duy", "Đạt", "Đức", "Hải", "Hiếu", "Hoàng", "Huy", "Hùng", "Khang", "Khánh", "Khoa", "Khôi", "Kiên", "Lâm", "Long", "Lộc", "Minh", "Nam", "Nghĩa", "Nguyên", "Nhân", "Phát", "Phong", "Phúc", "Quân", "Quang", "Sơn", "Tài", "Thành", "Thắng", "Thiện", "Thịnh", "Tiến", "Toàn", "Trí", "Trung", "Tuấn", "Tùng", "Việt", "Vinh", "Vũ", "Hưng", "Hậu", "Kiệt", "Lực", "Mạnh", "Nhật", "Phú", "Tân", "Thái", "Đăng", "Hào", "Luân", "Tín"];
const TEN_NU = ["An", "Anh", "Ánh", "Bích", "Châu", "Chi", "Diệp", "Dung", "Duyên", "Giang", "Hà", "Hạnh", "Hằng", "Hân", "Hiền", "Hoa", "Huyền", "Hương", "Lan", "Linh", "Loan", "Ly", "Mai", "My", "Nga", "Ngân", "Ngọc", "Nhi", "Nhung", "Oanh", "Phương", "Quyên", "Quỳnh", "Tâm", "Thảo", "Thư", "Thương", "Trang", "Trâm", "Tú", "Uyên", "Vân", "Vy", "Xuân", "Yến", "Như", "Nhiên", "Khuê", "Khánh", "Thùy"];

export type Gender = "Nam" | "Nữ";
export function makeName(t: Tools, g: Gender): string {
  const ho = t.weighted(HO);
  const dem = t.pick(g === "Nam" ? DEM_NAM : DEM_NU);
  let ten = t.pick(g === "Nam" ? TEN_NAM : TEN_NU);
  if (ten === dem) ten = t.pick(g === "Nam" ? TEN_NAM : TEN_NU);
  return `${ho} ${dem} ${ten}`;
}

// ---------------- Giáo viên ----------------
export type Teacher = { key: string; name: string; title: string; subject: string; dept: string; levels: ("THCS" | "THPT" | "ĐH")[]; gender: Gender };

/** 14 GV của thế giới mẫu. */
export const NAMED: (Teacher & { key: TeacherKey })[] = [
  { key: "ha", name: "Lê Thu Hà", title: "Cô", subject: "Toán", dept: "Tổ Toán – Tin", levels: ["THPT"], gender: "Nữ" },
  { key: "thu", name: "Đinh Hoài Thu", title: "Cô", subject: "Toán", dept: "Tổ Toán – Tin", levels: ["THPT"], gender: "Nữ" },
  { key: "tam", name: "Lương Văn Tâm", title: "Thầy", subject: "Toán", dept: "Tổ Toán – Tin", levels: ["THPT"], gender: "Nam" },
  { key: "ngoc", name: "Hồ Bích Ngọc", title: "Cô", subject: "Tin học", dept: "Tổ Toán – Tin", levels: ["THPT", "THCS"], gender: "Nữ" },
  { key: "khai", name: "Đặng Văn Khải", title: "TS.", subject: "Lập trình", dept: "Tổ Toán – Tin", levels: ["ĐH"], gender: "Nam" },
  { key: "bao-gv", name: "Nguyễn Quốc Bảo", title: "Thầy", subject: "Ngữ văn", dept: "Tổ Ngữ văn", levels: ["THPT"], gender: "Nam" },
  { key: "mai", name: "Đỗ Thị Mai", title: "Cô", subject: "Ngữ văn", dept: "Tổ Ngữ văn", levels: ["THCS"], gender: "Nữ" },
  { key: "phuong", name: "Trần Mai Phương", title: "Cô", subject: "Lịch sử", dept: "Tổ Xã hội", levels: ["THPT"], gender: "Nữ" },
  { key: "minh", name: "Hoàng Minh", title: "Thầy", subject: "Tiếng Anh", dept: "Tổ Xã hội", levels: ["THPT"], gender: "Nam" },
  { key: "trang", name: "Bùi Thu Trang", title: "Cô", subject: "Tiếng Anh", dept: "Tổ Ngoại ngữ", levels: ["THCS"], gender: "Nữ" },
  { key: "lan", name: "Võ Ngọc Lan", title: "Cô", subject: "Khoa học tự nhiên", dept: "Tổ Khoa học tự nhiên", levels: ["THCS"], gender: "Nữ" },
  { key: "long", name: "Phạm Đức Long", title: "Thầy", subject: "Hoá học", dept: "Tổ Khoa học tự nhiên", levels: ["THPT"], gender: "Nam" },
  { key: "binh", name: "Ngô Thanh Bình", title: "Cô", subject: "Vật lí", dept: "Tổ Khoa học tự nhiên", levels: ["THPT"], gender: "Nữ" },
  { key: "hung", name: "Vũ Văn Hưng", title: "Thầy", subject: "Toán", dept: "Tổ Toán – Tin", levels: ["THCS"], gender: "Nam" },
];

/** Số GV thêm theo môn (tổng toàn trường 86 GV). */
const MORE: [subject: string, dept: string, levels: Teacher["levels"], n: number][] = [
  ["Toán", "Tổ Toán – Tin", ["THCS"], 5],
  ["Toán", "Tổ Toán – Tin", ["THPT"], 3],
  ["Ngữ văn", "Tổ Ngữ văn", ["THCS"], 5],
  ["Ngữ văn", "Tổ Ngữ văn", ["THPT"], 3],
  ["Tiếng Anh", "Tổ Ngoại ngữ", ["THCS"], 4],
  ["Tiếng Anh", "Tổ Ngoại ngữ", ["THPT"], 4],
  ["Khoa học tự nhiên", "Tổ Khoa học tự nhiên", ["THCS"], 5],
  ["Vật lí", "Tổ Khoa học tự nhiên", ["THPT"], 2],
  ["Hoá học", "Tổ Khoa học tự nhiên", ["THPT"], 2],
  ["Sinh học", "Tổ Khoa học tự nhiên", ["THPT"], 3],
  ["Lịch sử và Địa lí", "Tổ Xã hội", ["THCS"], 4],
  ["Lịch sử", "Tổ Xã hội", ["THPT"], 2],
  ["Địa lí", "Tổ Xã hội", ["THPT"], 2],
  ["Giáo dục công dân", "Tổ Xã hội", ["THCS"], 2],
  ["Giáo dục kinh tế và pháp luật", "Tổ Xã hội", ["THPT"], 2],
  ["Tin học", "Tổ Toán – Tin", ["THCS", "THPT"], 3],
  ["Công nghệ", "Tổ Khoa học tự nhiên", ["THCS", "THPT"], 4],
  ["Giáo dục thể chất", "Tổ Thể chất – Nghệ thuật", ["THCS", "THPT"], 6],
  ["Âm nhạc", "Tổ Thể chất – Nghệ thuật", ["THCS"], 2],
  ["Mĩ thuật", "Tổ Thể chất – Nghệ thuật", ["THCS"], 2],
  ["Giáo dục quốc phòng và an ninh", "Tổ Thể chất – Nghệ thuật", ["THPT"], 2],
  ["Hoạt động trải nghiệm", "Tổ Xã hội", ["THCS", "THPT"], 2],
  ["Xác suất thống kê", "Tổ Toán – Tin", ["ĐH"], 1],
  ["Cơ sở dữ liệu", "Tổ Toán – Tin", ["ĐH"], 1],
  ["Lập trình", "Tổ Toán – Tin", ["ĐH"], 1],
];

export function makeTeachers(t: Tools): Teacher[] {
  const used = new Set(NAMED.map((x) => x.name));
  const out: Teacher[] = [...NAMED];
  let k = 0;
  for (const [subject, dept, levels, n] of MORE)
    for (let i = 0; i < n; i++) {
      const gender: Gender = t.chance(subject === "Giáo dục thể chất" || subject === "Giáo dục quốc phòng và an ninh" ? 0.25 : 0.68) ? "Nữ" : "Nam";
      let name = makeName(t, gender);
      while (used.has(name)) name = makeName(t, gender);
      used.add(name);
      const dh = levels.includes("ĐH");
      out.push({ key: `gv${++k}`, name, title: dh ? "ThS." : gender === "Nữ" ? "Cô" : "Thầy", subject, dept, levels, gender });
    }
  return out;
}
export const display = (x: Teacher) => `${x.title} ${x.name}`;

/** Ban giám hiệu (4) + quản trị (2). Hiệu trưởng là chủ tổ chức. */
export const LEADERS = [
  { sub: "bgh-cong", name: "Thầy Lý Thành Công", email: "cong.lt@binhminh.edu.vn", role: "owner" as const },
  { sub: "bgh-hanh", name: "Cô Trương Mỹ Hạnh", email: "hanh.tm@binhminh.edu.vn", role: "admin" as const },
  { sub: "bgh-nghia", name: "Thầy Phan Trọng Nghĩa", email: "nghia.pt@binhminh.edu.vn", role: "admin" as const },
  { sub: "bgh-dung", name: "Cô Lâm Thuỳ Dung", email: "dung.lt@binhminh.edu.vn", role: "admin" as const },
  { sub: "qt-khoa", name: "Anh Tạ Minh Khoa (quản trị)", email: "it@binhminh.edu.vn", role: "admin" as const },
  { sub: "qt-yen", name: "Chị Đoàn Hải Yến (văn thư)", email: "vanthu@binhminh.edu.vn", role: "assistant" as const },
];

// ---------------- Lớp ----------------
export type ClassSpec = { name: string; grade: number; level: "THCS" | "THPT" | "ĐH"; homeroom: string; size: number; avg: number; /** môn sổ điểm của lớp (môn GVCN) */ subject: string; /** lớp học phần ĐH: lấy SV từ lớp gốc */ from?: string };

/** Lớp có trong thế giới mẫu (sĩ số, TB cố định). Lớp còn lại sinh thêm cho đủ 1.240 HS. */
const FIXED: Record<string, { homeroom: string; size: number; avg: number }> = {
  "6A1": { homeroom: "mai", size: 40, avg: 7.6 },
  "7A3": { homeroom: "hung", size: 39, avg: 7.1 },
  "8A2": { homeroom: "lan", size: 38, avg: 7.4 },
  "9A1": { homeroom: "trang", size: 41, avg: 7.5 },
  "10A1": { homeroom: "ha", size: 42, avg: 7.2 },
  "10A2": { homeroom: "long", size: 43, avg: 7.0 },
  "11A1": { homeroom: "binh", size: 42, avg: 7.4 },
  "11A3": { homeroom: "bao-gv", size: 40, avg: 6.8 },
  "12A1": { homeroom: "phuong", size: 41, avg: 7.6 },
  "12A2": { homeroom: "minh", size: 40, avg: 7.3 },
};
/** Sĩ số các lớp sinh thêm: 18 lớp, tổng 778 (để toàn trường 1.184 HS phổ thông + 56 SV = 1.240). */
const MORE_SIZES = [44, 43, 42, 44, 43, 45, 42, 44, 43, 41, 44, 42, 43, 45, 43, 44, 43, 43];

export function makeClasses(t: Tools, teachers: Teacher[]): ClassSpec[] {
  const out: ClassSpec[] = [];
  const subjOf = (key: string) => teachers.find((x) => x.key === key)!.subject;
  const free = (level: "THCS" | "THPT") => teachers.filter((x) => x.levels.includes(level) && !NAMED.some((n) => n.key === x.key) && !["Giáo dục thể chất", "Âm nhạc", "Mĩ thuật", "Giáo dục quốc phòng và an ninh", "Hoạt động trải nghiệm"].includes(x.subject));
  const pool = { THCS: t.shuffle(free("THCS")), THPT: t.shuffle(free("THPT")) };
  let m = 0;
  for (let g = 6; g <= 12; g++)
    for (let i = 1; i <= 4; i++) {
      const name = `${g}A${i}`;
      const level = g <= 9 ? "THCS" : "THPT";
      const f = FIXED[name];
      const homeroom = f?.homeroom ?? pool[level].shift()!.key;
      const avg = f?.avg ?? Math.round((7.0 + t.r() * 0.8) * 10) / 10;
      out.push({ name, grade: g, level, homeroom, size: f?.size ?? MORE_SIZES[m++]!, avg, subject: `${subjOf(homeroom)} ${g}` });
    }
  const xs = teachers.find((x) => x.subject === "Xác suất thống kê")!;
  const db = teachers.find((x) => x.subject === "Cơ sở dữ liệu")!;
  out.push({ name: "KTPM K23", grade: 14, level: "ĐH", homeroom: "khai", size: 56, avg: 7.9, subject: "Lập trình" });
  out.push({ name: "KTPM K23 · Xác suất thống kê", grade: 14, level: "ĐH", homeroom: xs.key, size: 48, avg: 6.9, subject: "Xác suất thống kê", from: "KTPM K23" });
  out.push({ name: "KTPM K23 · Cơ sở dữ liệu", grade: 14, level: "ĐH", homeroom: db.key, size: 52, avg: 7.6, subject: "Cơ sở dữ liệu", from: "KTPM K23" });
  return out;
}

/** Môn có bài giao theo cấp: [môn, môn chính?]. Môn chính có thêm kiểm tra 15′. */
export const SUBJECTS_BY_LEVEL: Record<string, [string, boolean][]> = {
  THCS: [["Toán", true], ["Ngữ văn", true], ["Tiếng Anh", true], ["Khoa học tự nhiên", true], ["Lịch sử và Địa lí", false]],
  THPT: [["Toán", true], ["Ngữ văn", true], ["Tiếng Anh", true], ["Vật lí", true], ["Hoá học", true], ["Sinh học", false], ["Lịch sử", false], ["Địa lí", false], ["Tin học", false], ["Giáo dục kinh tế và pháp luật", false]],
  ĐH: [["Lập trình", true], ["Xác suất thống kê", true], ["Cơ sở dữ liệu", true]],
};

/** Phân công: GV dạy môn ở lớp. Cố định theo thế giới mẫu: cô Hà dạy Toán 10A1, 10A2, 10A3; thầy Long Hoá khối 10; thầy Minh Anh 10A1… */
export function makeTeaching(t: Tools, teachers: Teacher[], classes: ClassSpec[]): Map<string, string> {
  const map = new Map<string, string>();
  const fixed: Record<string, string> = {
    "10A1|Toán": "ha", "10A2|Toán": "ha", "10A3|Toán": "ha", "10A4|Toán": "thu", "11A1|Toán": "thu", "11A2|Toán": "thu", "11A3|Toán": "tam", "11A4|Toán": "tam", "12A1|Toán": "tam",
    "10A1|Hoá học": "long", "10A2|Hoá học": "long", "10A3|Hoá học": "long", "10A4|Hoá học": "long",
    "10A1|Tiếng Anh": "minh", "12A1|Tiếng Anh": "minh", "12A2|Tiếng Anh": "minh", "11A3|Tiếng Anh": "minh",
    "11A1|Vật lí": "binh", "11A2|Vật lí": "binh", "10A1|Vật lí": "binh", "10A2|Vật lí": "binh",
    "11A3|Ngữ văn": "bao-gv", "11A1|Ngữ văn": "bao-gv", "10A1|Ngữ văn": "bao-gv", "12A1|Ngữ văn": "bao-gv",
    "12A1|Lịch sử": "phuong", "12A2|Lịch sử": "phuong", "10A1|Lịch sử": "phuong", "11A3|Lịch sử": "phuong",
    "10A1|Tin học": "ngoc", "10A2|Tin học": "ngoc", "10A3|Tin học": "ngoc", "10A4|Tin học": "ngoc",
    "6A1|Ngữ văn": "mai", "6A2|Ngữ văn": "mai", "7A3|Toán": "hung", "7A1|Toán": "hung", "7A2|Toán": "hung",
    "8A2|Khoa học tự nhiên": "lan", "8A1|Khoa học tự nhiên": "lan", "8A3|Khoa học tự nhiên": "lan",
    "9A1|Tiếng Anh": "trang", "9A2|Tiếng Anh": "trang", "9A3|Tiếng Anh": "trang", "8A2|Tiếng Anh": "trang",
    "KTPM K23|Lập trình": "khai",
  };
  for (const [k, v] of Object.entries(fixed)) map.set(k, v);
  const load = new Map<string, number>();
  for (const v of map.values()) load.set(v, (load.get(v) ?? 0) + 1);
  for (const c of classes) {
    for (const [subject] of SUBJECTS_BY_LEVEL[c.level]!) {
      const key = `${c.name}|${subject}`;
      if (map.has(key)) continue;
      if (c.from) {
        // lớp học phần chỉ có môn của học phần
        if (subject === c.subject) map.set(key, c.homeroom);
        continue;
      }
      if (c.level === "ĐH") {
        const lec = teachers.find((x) => x.subject === subject && x.levels.includes("ĐH") && x.key !== "khai") ?? teachers.find((x) => x.key === "khai")!;
        if (subject !== "Lập trình") continue; // lớp gốc K23 chỉ giao bài Lập trình; XSTK, CSDL ở lớp học phần
        map.set(key, lec.key);
        continue;
      }
      const cands = teachers.filter((x) => x.subject === subject && x.levels.includes(c.level as "THCS" | "THPT"));
      if (!cands.length) continue;
      const best = cands.sort((a, b) => (load.get(a.key) ?? 0) - (load.get(b.key) ?? 0) || a.key.localeCompare(b.key))[0]!;
      map.set(key, best.key);
      load.set(best.key, (load.get(best.key) ?? 0) + 1);
    }
  }
  void t;
  return map;
}

// ---------------- Nhân vật chính ----------------
/** Học lực (0–1, xác suất làm đúng câu mức TH) theo môn của các nhân vật; ai không có thì theo phân phối lớp. */
export type Persona = { name: string; className: string; gender: Gender; dob?: string; ability: Record<string, number>; diligence: number; trait?: "late" | "quitter" | "slipping" };
export const PERSONAS: Persona[] = [
  { name: "Nguyễn Minh Anh", className: "10A1", gender: "Nữ", dob: "2011-03-14", diligence: 0.99, ability: { Toán: 0.62, "Ngữ văn": 0.66, "Hoá học": 0.88, "Tiếng Anh": 0.84, "Lịch sử": 0.75, "Địa lí": 0.73, "Sinh học": 0.71, "Vật lí": 0.78, "Tin học": 0.8, "Giáo dục kinh tế và pháp luật": 0.78 } },
  { name: "Trần Khánh Duy", className: "10A1", gender: "Nam", dob: "2011-08-02", diligence: 0.9, trait: "slipping", ability: { Toán: 0.55, "Ngữ văn": 0.64, "Hoá học": 0.5, "Địa lí": 0.85, "Tiếng Anh": 0.6, "Vật lí": 0.58 } },
  { name: "Đỗ Đức Thịnh", className: "10A1", gender: "Nam", dob: "2011-11-21", diligence: 0.78, trait: "quitter", ability: { Toán: 0.57, "Tin học": 0.86, "Vật lí": 0.66 } },
  { name: "Lê Bảo Châu", className: "10A1", gender: "Nữ", diligence: 0.98, ability: {} },
  { name: "Hoàng Gia Hân", className: "10A1", gender: "Nữ", diligence: 0.97, ability: {} },
  { name: "Vũ Quốc Huy", className: "10A1", gender: "Nam", diligence: 0.95, ability: {} },
  { name: "Đặng Thu Trang", className: "10A1", gender: "Nữ", diligence: 0.98, ability: {} },
  { name: "Bùi Nhật Nam", className: "10A1", gender: "Nam", diligence: 0.93, ability: {} },
  { name: "Đỗ Khánh Linh", className: "10A1", gender: "Nữ", diligence: 0.97, ability: {} },
  { name: "Ngô Tuấn Kiệt", className: "10A1", gender: "Nam", diligence: 0.94, ability: {} },
  { name: "Lê Thảo Vy", className: "8A2", gender: "Nữ", dob: "2013-05-09", diligence: 0.99, ability: { "Khoa học tự nhiên": 0.92, Toán: 0.69 } },
  { name: "Phạm Quang Huy", className: "KTPM K23", gender: "Nam", diligence: 0.92, ability: { "Lập trình": 0.88, "Xác suất thống kê": 0.6, "Cơ sở dữ liệu": 0.82 } },
];
/** Điểm sổ điểm (môn của lớp) cố định cho nhân vật (khớp world.ts). */
export const PERSONA_BOOK: Record<string, number> = { "Nguyễn Minh Anh": 6.4, "Trần Khánh Duy": 5.6, "Đỗ Đức Thịnh": 5.8, "Lê Thảo Vy": 9.1, "Phạm Quang Huy": 8.8 };
