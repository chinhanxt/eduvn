// server/src/subjects/su/gazetteer.ts — lược đồ + tra cứu bộ địa danh lịch sử Việt Nam (thuần, có hàm đọc JSON cục bộ).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { foldVi } from "../../domain/tutorSearch";

export const PLACE_KINDS = [
  "chien-truong",
  "kinh-do",
  "can-cu",
  "di-tich",
  "quan-dao",
  "thanh-co",
  "cua-song",
  "thuong-cang",
  "dia-phuong",
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export const PlaceSourceSchema = z
  .object({
    wikidataQid: z.string().regex(/^Q\d+$/, "Wikidata QID phải có dạng Q<số>").optional(),
    taiLieu: z.string().trim().min(1, "Cần ghi rõ tài liệu nguồn"),
    url: z.string().url().optional(),
  })
  .refine((s) => Boolean(s.wikidataQid || s.taiLieu.length >= 4), "Mỗi địa danh bắt buộc có nguồn Wikidata QID hoặc tài liệu cụ thể");

export const HistoricalPlaceSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id địa danh phải ở dạng kebab-case ASCII").max(64),
  ten: z.string().trim().normalize("NFC").min(1).max(120),
  tenKhac: z.array(z.string().trim().normalize("NFC").min(1).max(120)).default([]),
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  loai: z.enum(PLACE_KINDS),
  thoiKy: z.array(z.string().trim().normalize("NFC").min(1).max(120)).min(1),
  tinhHienNay: z.string().trim().normalize("NFC").min(1).max(120),
  moTaNgan: z.string().trim().normalize("NFC").max(300).optional(),
  nguon: PlaceSourceSchema,
});
export type HistoricalPlace = z.infer<typeof HistoricalPlaceSchema>;

export const GazetteerSchema = z
  .object({
    version: z.number().int().positive(),
    updatedAt: z.string().trim().min(4),
    note: z.string().trim().min(1),
    places: z.array(HistoricalPlaceSchema).min(1),
  })
  .superRefine((g, ctx) => {
    const ids = new Set<string>();
    for (const [idx, p] of g.places.entries()) {
      if (ids.has(p.id)) {
        ctx.addIssue({ code: "custom", path: ["places", idx, "id"], message: `Trùng id địa danh "${p.id}"` });
      }
      ids.add(p.id);
    }
    if (!ids.has("hoang-sa")) {
      ctx.addIssue({ code: "custom", path: ["places"], message: 'Thiếu địa danh chủ quyền bắt buộc "hoang-sa"' });
    }
    if (!ids.has("truong-sa")) {
      ctx.addIssue({ code: "custom", path: ["places"], message: 'Thiếu địa danh chủ quyền bắt buộc "truong-sa"' });
    }
  });
export type Gazetteer = z.infer<typeof GazetteerSchema>;

/** Khoảng cách địa lý (km) theo công thức Haversine. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ngưỡng sai số toạ độ tối đa (km) tuỳ loại địa danh lịch sử. */
export function coordToleranceKm(loai: PlaceKind): number {
  if (loai === "quan-dao") return 180;
  if (loai === "can-cu" || loai === "dia-phuong" || loai === "cua-song") return 40;
  if (loai === "chien-truong" || loai === "thuong-cang") return 25;
  return 10;
}

const normName = (s: string) =>
  foldVi(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export function findPlaceById(places: readonly HistoricalPlace[], id: string): HistoricalPlace | undefined {
  return places.find((p) => p.id === id);
}

/** Tìm địa danh theo tên hoặc bí danh (không phân biệt hoa/dấu). */
export function findPlaceByName(places: readonly HistoricalPlace[], query: string): HistoricalPlace | undefined {
  const q = normName(query);
  if (!q) return undefined;
  // Khớp chính xác trước
  for (const p of places) {
    if (normName(p.ten) === q || p.tenKhac.some((alias) => normName(alias) === q)) return p;
  }
  // Khớp bao hàm (tên ngắn gọn nằm trong cụm dài hơn, ưu tiên tên dài nhất)
  const hits: { place: HistoricalPlace; len: number }[] = [];
  for (const p of places) {
    for (const candidate of [p.ten, ...p.tenKhac]) {
      const c = normName(candidate);
      if (c.length < 4) continue;
      if (q.includes(c) || c.includes(q)) hits.push({ place: p, len: c.length });
    }
  }
  hits.sort((a, b) => b.len - a.len);
  return hits[0]?.place;
}

/** Liệt kê mọi địa danh trong gazetteer xuất hiện trong một đoạn văn bản tiếng Việt. */
export function placesMentionedIn(text: string, places: readonly HistoricalPlace[]): HistoricalPlace[] {
  const hay = ` ${normName(text)} `;
  const found: HistoricalPlace[] = [];
  for (const p of places) {
    const names = [p.ten, ...p.tenKhac].map(normName).filter((n) => n.length >= 4);
    if (names.some((n) => hay.includes(` ${n} `))) found.push(p);
  }
  return found;
}

const DEFAULT_GAZETTEER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../services/anim-kit-data/dia-danh-lich-su.json",
);

let cachedGazetteer: Gazetteer | null = null;

export function loadGazetteer(filePath = DEFAULT_GAZETTEER_PATH): Gazetteer {
  if (filePath === DEFAULT_GAZETTEER_PATH && cachedGazetteer) return cachedGazetteer;
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const parsed = GazetteerSchema.parse(raw);
  if (filePath === DEFAULT_GAZETTEER_PATH) cachedGazetteer = parsed;
  return parsed;
}
