import { z } from "zod";

/** Văn bản hành chính theo Nghị định 30/2020/NĐ-CP (thể thức và kỹ thuật trình bày). */

export const LOAI = ["thong_bao", "ke_hoach", "bao_cao", "bien_ban", "to_trinh", "giay_moi", "quyet_dinh", "cong_van"] as const;
export type Loai = (typeof LOAI)[number];

export const LOAI_INFO: Record<Loai, { ten: string; ma: string; viet: string }> = {
  thong_bao: { ten: "THÔNG BÁO", ma: "TB", viet: "Thông báo" },
  ke_hoach: { ten: "KẾ HOẠCH", ma: "KH", viet: "Kế hoạch" },
  bao_cao: { ten: "BÁO CÁO", ma: "BC", viet: "Báo cáo" },
  bien_ban: { ten: "BIÊN BẢN", ma: "BB", viet: "Biên bản" },
  to_trinh: { ten: "TỜ TRÌNH", ma: "TTr", viet: "Tờ trình" },
  giay_moi: { ten: "GIẤY MỜI", ma: "GM", viet: "Giấy mời" },
  quyet_dinh: { ten: "QUYẾT ĐỊNH", ma: "QĐ", viet: "Quyết định" },
  cong_van: { ten: "", ma: "", viet: "Công văn" },
};

export const QUYEN_HAN = ["KT.", "TM.", "Q.", "TL.", "TUQ."] as const;

const str = z.string().trim().normalize("NFC").default("");
const strList = z.array(z.string().trim().normalize("NFC")).default([]);

const Raw = z.strictObject({
  loai: z.enum(LOAI),
  co_quan_chu_quan: str,
  co_quan_ban_hanh: str,
  ky_hieu_co_quan: str,
  ky_hieu_don_vi: str,
  so: z.union([z.number().int().min(1), z.string().trim()]).nullish(),
  dia_danh: str,
  ngay: z.string().trim().nullish(),
  trich_yeu: str,
  kinh_gui: strList,
  can_cu: strList,
  thoi_gian: str,
  dia_diem: str,
  thanh_phan: strList,
  chu_tri: str,
  thu_ky: str,
  vai_tro_chu_tri: z.enum(["CHỦ TRÌ", "CHỦ TỌA"]).nullish(),
  noi_dung: z.array(z.unknown()).default([]),
  noi_nhan: strList,
  chuc_vu_ky: str,
  quyen_han: z.enum(QUYEN_HAN).nullish(),
  chuc_vu_cap_tren: str,
  nguoi_ky: str,
});

export type Block = { kind: "doan"; text: string } | { kind: "muc"; cap: 1 | 2 | 3; text: string } | { kind: "ds"; items: string[] };

export type VanBan = Omit<z.infer<typeof Raw>, "so" | "ngay" | "quyen_han" | "noi_dung" | "vai_tro_chu_tri"> & {
  vai_tro_chu_tri: "CHỦ TRÌ" | "CHỦ TỌA";
  so: string;
  ngay: string;
  quyen_han: (typeof QUYEN_HAN)[number] | "";
  noi_dung: Block[];
};

export const VANBAN_SHAPE_HELP = `JSON văn bản hành chính (NĐ 30/2020). Khoá cho phép (khoá lạ bị từ chối):
- loai (bắt buộc): thong_bao | ke_hoach | bao_cao | bien_ban | to_trinh | giay_moi | quyet_dinh | cong_van
- co_quan_chu_quan (tuỳ chọn, VIẾT HOA, vd "SỞ GD&ĐT TP. HỒ CHÍ MINH"); co_quan_ban_hanh (bắt buộc, vd "TRƯỜNG THPT NGUYỄN DU")
- ky_hieu_co_quan (bắt buộc, vd "THPTND") -> Số: <so>/<TB|KH|BC|BB|TTr|GM|QĐ>-<ky_hieu_co_quan>; công văn không có mã loại: <so>/<ky_hieu_co_quan>[-<ky_hieu_don_vi>]
- so (số nguyên hoặc bỏ trống -> "…"); dia_danh (bắt buộc, vd "TP. Hồ Chí Minh"); ngay (ISO "2026-11-05" hoặc bỏ trống -> "ngày … tháng … năm …")
- trich_yeu (bắt buộc): trích yếu nội dung; công văn viết không kèm "V/v" (hệ thống tự thêm); thông báo/quyết định/tờ trình nên bắt đầu bằng "Về việc …"
- kinh_gui (danh sách; bắt buộc với cong_van và to_trinh)
- can_cu (danh sách "Căn cứ …", bắt buộc với quyet_dinh, nên có với ke_hoach)
- thoi_gian, dia_diem (bắt buộc với bien_ban và giay_moi), thanh_phan (danh sách; bắt buộc với bien_ban), chu_tri + thu_ky (họ tên; bắt buộc với bien_ban), vai_tro_chu_tri ("CHỦ TRÌ" mặc định | "CHỦ TỌA")
- noi_dung (bắt buộc): danh sách khối, mỗi khối là một trong:
    "Đoạn văn thường" (chuỗi) | {"doan": "..."} | {"cap": 1|2|3, "tieu_de": "..."} (tự đánh số I. / 1. / a) , KHÔNG tự gõ số) | {"danh_sach": ["gạch đầu dòng", ...]}
  Quyết định: viết từng điều thành đoạn "Điều 1. …"; hệ thống tự thêm dòng "QUYẾT ĐỊNH:" sau các căn cứ.
- noi_nhan (bắt buộc, danh sách; hệ thống tự thêm "- Lưu: VT." ở cuối; biên bản thì tuỳ chọn)
- chuc_vu_ky (bắt buộc trừ bien_ban, vd "HIỆU TRƯỞNG"); quyen_han (tuỳ chọn: "KT." | "TM." | "Q." | "TL." | "TUQ."); chuc_vu_cap_tren (bắt buộc khi quyen_han là KT., TM., TL., TUQ.; vd "HIỆU TRƯỞNG" khi chuc_vu_ky là "PHÓ HIỆU TRƯỞNG")
- nguoi_ky (bắt buộc trừ bien_ban, họ tên). Biên bản ký bằng hai khối THƯ KÝ (thu_ky) và CHỦ TRÌ/CHỦ TỌA (chu_tri), không dùng chuc_vu_ky/nguoi_ky`;

const FIELD_VI: Record<string, string> = {
  loai: "loại văn bản",
  co_quan_ban_hanh: "cơ quan ban hành",
  ky_hieu_co_quan: "ký hiệu cơ quan",
  dia_danh: "địa danh",
  trich_yeu: "trích yếu",
  noi_dung: "nội dung",
  noi_nhan: "nơi nhận",
  chuc_vu_ky: "chức vụ người ký",
  nguoi_ky: "họ tên người ký",
};

const stripLead = (s: string) => s.replace(/^(?:[IVXLC]+\.|\d+\.|[a-zđ]\))\s+/i, "").trim();

function parseBlocks(raw: unknown[], issues: string[]): Block[] {
  const out: Block[] = [];
  raw.forEach((b, i) => {
    const at = `noi_dung[${i + 1}]`;
    if (typeof b === "string") {
      if (b.trim() === "") issues.push(`${at}: đoạn văn đang để trống`);
      else out.push({ kind: "doan", text: b.trim().normalize("NFC") });
      return;
    }
    if (typeof b !== "object" || b === null || Array.isArray(b)) return void issues.push(`${at}: khối phải là chuỗi hoặc đối tượng {doan} | {cap, tieu_de} | {danh_sach}`);
    const o = b as Record<string, unknown>;
    const keys = Object.keys(o);
    const bad = keys.filter((k) => !["doan", "cap", "tieu_de", "danh_sach"].includes(k));
    if (bad.length) return void issues.push(`${at}: khoá không hợp lệ ${bad.join(", ")} (chỉ dùng doan | cap + tieu_de | danh_sach)`);
    if (typeof o.doan === "string" && o.doan.trim()) out.push({ kind: "doan", text: o.doan.trim().normalize("NFC") });
    else if ("tieu_de" in o || "cap" in o) {
      if (typeof o.tieu_de !== "string" || !o.tieu_de.trim()) issues.push(`${at}: thiếu tieu_de`);
      else if (o.cap !== 1 && o.cap !== 2 && o.cap !== 3) issues.push(`${at}: cap phải là 1, 2 hoặc 3 (I. / 1. / a))`);
      else out.push({ kind: "muc", cap: o.cap, text: stripLead(o.tieu_de.trim().normalize("NFC")) });
    } else if (Array.isArray(o.danh_sach)) {
      const items = o.danh_sach.map((x) => (typeof x === "string" ? x.trim().normalize("NFC") : ""));
      if (items.length === 0 || items.some((x) => x === "")) issues.push(`${at}: danh_sach không được rỗng hoặc có dòng trống`);
      else out.push({ kind: "ds", items });
    } else issues.push(`${at}: khối rỗng hoặc sai kiểu (cần doan | cap + tieu_de | danh_sach)`);
  });
  return out;
}

function issueText(i: z.core.$ZodIssue): string {
  const path = i.path.map((p) => (typeof p === "number" ? `[${p + 1}]` : `.${String(p)}`)).join("").replace(/^\./, "");
  const name = FIELD_VI[path] ?? path;
  if (i.code === "unrecognized_keys") return `Khoá không hợp lệ: ${i.keys.join(", ")}${path ? ` (trong ${path})` : ""}. Xem danh sách khoá cho phép trong mô tả công cụ`;
  if (i.code === "invalid_value") return `${name || "Giá trị"}: không hợp lệ, chỉ nhận ${i.values.map(String).join(" | ")}`;
  if (i.code === "invalid_type") return path === "" ? "Văn bản phải là một đối tượng JSON" : `${name}: sai kiểu dữ liệu (cần ${i.expected === "string" ? "chuỗi" : i.expected === "array" ? "danh sách" : i.expected === "number" ? "số" : i.expected})`;
  return `${name}: ${i.message}`;
}

const isoOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

export type VanBanResult = { ok: true; doc: VanBan } | { ok: false; issues: string[] };

export function validateVanBan(input: unknown): VanBanResult {
  const p = Raw.safeParse(input);
  if (!p.success) return { ok: false, issues: p.error.issues.map(issueText) };
  const r = p.data;
  const issues: string[] = [];
  const need = (v: string, key: string) => {
    if (v === "") issues.push(`Thiếu ${FIELD_VI[key] ?? key} (${key})`);
  };
  need(r.co_quan_ban_hanh, "co_quan_ban_hanh");
  need(r.ky_hieu_co_quan, "ky_hieu_co_quan");
  need(r.dia_danh, "dia_danh");
  need(r.trich_yeu, "trich_yeu");
  const bb = r.loai === "bien_ban";
  if (!bb) {
    need(r.chuc_vu_ky, "chuc_vu_ky");
    need(r.nguoi_ky, "nguoi_ky");
  }
  if (/\s/.test(r.ky_hieu_co_quan)) issues.push("ky_hieu_co_quan không được chứa khoảng trắng (vd \"THPTND\")");

  let so = "";
  if (typeof r.so === "number") so = r.so < 10 ? `0${r.so}` : String(r.so);
  else if (typeof r.so === "string" && r.so !== "") {
    if (/^\d+$/.test(r.so)) so = r.so.length === 1 ? `0${r.so}` : r.so; // NĐ30: số < 10 thêm số 0 đứng trước
    else issues.push(`so phải là số nguyên hoặc để trống (nhận "${r.so}")`);
  }
  let ngay = "";
  if (r.ngay) {
    if (isoOk(r.ngay)) ngay = r.ngay;
    else issues.push(`ngay phải là ngày ISO dạng 2026-11-05 hoặc để trống (nhận "${r.ngay}")`);
  }

  const noi_dung = parseBlocks(r.noi_dung, issues);
  if (r.noi_dung.length === 0) issues.push("Thiếu nội dung văn bản (noi_dung)");
  if (r.noi_nhan.length === 0 && !bb) issues.push("Thiếu nơi nhận (noi_nhan)");
  else r.noi_nhan.forEach((x, i) => x === "" && issues.push(`noi_nhan: dòng ${i + 1} đang để trống`));
  r.can_cu.forEach((x, i) => x === "" && issues.push(`can_cu: dòng ${i + 1} đang để trống`));
  r.kinh_gui.forEach((x, i) => x === "" && issues.push(`kinh_gui: dòng ${i + 1} đang để trống`));

  const ten = LOAI_INFO[r.loai].viet;
  if (r.loai === "bien_ban") {
    if (r.thoi_gian === "") issues.push("Biên bản thiếu thời gian (thoi_gian)");
    if (r.dia_diem === "") issues.push("Biên bản thiếu địa điểm (dia_diem)");
    if (r.thanh_phan.length === 0) issues.push("Biên bản thiếu thành phần tham dự (thanh_phan)");
    if (r.thu_ky === "") issues.push("Biên bản thiếu họ tên thư ký (thu_ky)");
    if (r.chu_tri === "") issues.push("Biên bản thiếu họ tên chủ trì/chủ tọa (chu_tri)");
  }
  if (r.loai === "giay_moi") {
    if (r.thoi_gian === "") issues.push("Giấy mời thiếu thời gian (thoi_gian)");
    if (r.dia_diem === "") issues.push("Giấy mời thiếu địa điểm (dia_diem)");
  }
  if (r.loai === "quyet_dinh" && r.can_cu.length === 0) issues.push("Quyết định thiếu các căn cứ ban hành (can_cu)");
  if ((r.loai === "cong_van" || r.loai === "to_trinh") && r.kinh_gui.length === 0) issues.push(`${ten} thiếu nơi nhận chính "Kính gửi" (kinh_gui)`);
  if (r.loai === "cong_van" && r.trich_yeu === "") issues.push('Công văn thiếu trích yếu "V/v" (trich_yeu)');
  const qh = r.quyen_han ?? "";
  if ((qh === "KT." || qh === "TM." || qh === "TL." || qh === "TUQ.") && r.chuc_vu_cap_tren === "") issues.push(`quyen_han "${qh}" cần chuc_vu_cap_tren (chức vụ của cấp trên, vd "HIỆU TRƯỞNG")`);

  if (issues.length) return { ok: false, issues };
  const { so: _s, ngay: _n, quyen_han: _q, noi_dung: _d, vai_tro_chu_tri: _v, ...rest } = r;
  const trich_yeu = r.loai === "cong_van" ? r.trich_yeu.replace(/^v\/v[:.]?\s*/i, "") : r.trich_yeu;
  return { ok: true, doc: { ...rest, vai_tro_chu_tri: r.vai_tro_chu_tri ?? "CHỦ TRÌ", trich_yeu, so, ngay, quyen_han: qh, noi_dung } };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "TP. Hồ Chí Minh, ngày 05 tháng 11 năm 2026" (NĐ 30: ngày/tháng nhỏ hơn 10 thêm số 0). */
export function formatNgay(v: VanBan): string {
  const date = v.ngay === "" ? "ngày … tháng … năm …" : `ngày ${pad(Number(v.ngay.slice(8)))} tháng ${Number(v.ngay.slice(5, 7)) <= 2 ? pad(Number(v.ngay.slice(5, 7))) : Number(v.ngay.slice(5, 7))} năm ${v.ngay.slice(0, 4)}`;
  return `${v.dia_danh}, ${date}`;
}

export function soKyHieu(v: VanBan): string {
  const so = v.so === "" ? "…" : v.so;
  const ma = LOAI_INFO[v.loai].ma;
  const tail = v.loai === "cong_van" ? [v.ky_hieu_co_quan, v.ky_hieu_don_vi].filter(Boolean).join("-") : `${ma}-${v.ky_hieu_co_quan}`;
  return `Số: ${so}/${tail}`;
}

/** Nơi nhận: bỏ "- " và dấu cuối; "Lưu: …" luôn đứng cuối và kết thúc bằng dấu chấm. */
export function noiNhanLines(v: VanBan): string[] {
  const clean = (s: string) => s.replace(/^[-–•]\s*/, "").replace(/[;,.\s]+$/, "");
  const all = v.noi_nhan.map(clean).filter(Boolean);
  const luu = all.find((x) => /^lưu\b/i.test(x)) ?? "Lưu: VT";
  const rest = all.filter((x) => !/^lưu\b/i.test(x));
  return [...rest.map((x) => `- ${x};`), `- ${luu}.`];
}

/** Dòng chức vụ bên phải khối ký: [quyền hạn + chức vụ cấp trên?, chức vụ ký]. */
export function chucVuLines(v: VanBan): string[] {
  const cv = v.chuc_vu_ky.toUpperCase();
  const cap = v.chuc_vu_cap_tren.toUpperCase();
  if (v.quyen_han === "") return [cv];
  if (v.quyen_han === "Q.") return [`Q. ${cv}`];
  return [`${v.quyen_han} ${cap}`, cv];
}

export function canCuLines(v: VanBan): string[] {
  return v.can_cu.map((c, i) => {
    const t = (/^(căn cứ|xét|theo|thực hiện)(?![\p{L}])/iu.test(c) ? c : `Căn cứ ${c}`).replace(/[;,.\s]+$/, "");
    return `${t}${v.loai === "quyet_dinh" || i < v.can_cu.length - 1 ? ";" : "."}`;
  });
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
/** Số thứ tự các mục: I. / 1. / a) (đặt lại khi lên cấp trên). */
export function numberHeadings(blocks: Block[]): string[] {
  const c = [0, 0, 0];
  return blocks.map((b) => {
    if (b.kind !== "muc") return "";
    c[b.cap - 1] = (c[b.cap - 1] ?? 0) + 1;
    for (let k = b.cap; k < 3; k++) c[k] = 0;
    const n = c[b.cap - 1] ?? 1;
    return b.cap === 1 ? `${ROMAN[n] ?? String(n)}.` : b.cap === 2 ? `${n}.` : `${String.fromCharCode(96 + Math.min(n, 26))})`;
  });
}
