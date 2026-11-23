// server/src/subjects/su/verify.ts — tự kiểm sự kiện lịch sử (năm, địa danh, nhân vật) theo cơ chế "Đã kiểm" của P13.
// Thuần, không I/O: đối chiếu tất định với Wikidata (đã nạp qua client cache) và/hoặc kho tài liệu GV.
// AI KHÔNG BAO GIỜ tự chấm nội dung của mình và không được tự tạo toạ độ/năm tháng không có nguồn.
import { z } from "zod";
import type { Verification } from "../../domain/solution";
import { Bm25, foldVi } from "../../domain/tutorSearch";
import { type HistoricalPlace, coordToleranceKm, findPlaceById, findPlaceByName, haversineKm } from "./gazetteer";

export const HistoryClaimSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("year"),
    subject: z.string().trim().normalize("NFC").min(1).max(200),
    year: z.number().int().min(-3000).max(2100),
    endYear: z.number().int().min(-3000).max(2100).optional(),
    qid: z.string().regex(/^Q\d+$/).optional(),
  }),
  z.object({
    kind: z.literal("place"),
    placeId: z.string().trim().max(64).optional(),
    name: z.string().trim().normalize("NFC").min(1).max(160),
    lat: z.number().finite().min(-90).max(90).optional(),
    lon: z.number().finite().min(-180).max(180).optional(),
    qid: z.string().regex(/^Q\d+$/).optional(),
  }),
  z.object({
    kind: z.literal("figure"),
    name: z.string().trim().normalize("NFC").min(1).max(160),
    birthYear: z.number().int().min(-3000).max(2100).optional(),
    deathYear: z.number().int().min(-3000).max(2100).optional(),
    eventName: z.string().trim().normalize("NFC").max(200).optional(),
    eventYear: z.number().int().min(-3000).max(2100).optional(),
    qid: z.string().regex(/^Q\d+$/).optional(),
  }),
]);
export type HistoryClaim = z.infer<typeof HistoryClaimSchema>;

export type WikidataRecord = {
  qid: string;
  label: string;
  description?: string;
  url: string;
  /** Mọi mốc năm liên quan (P585, P580, P582, P571). */
  years: number[];
  startYear?: number;
  endYear?: number;
  birthYear?: number;
  deathYear?: number;
  coords?: { lat: number; lon: number };
};

export type TeacherDocChunk = {
  doc: string;
  page: number;
  text: string;
};

export type HistoryVerifyDetail = {
  ok: boolean | null;
  label: string;
  expected?: string;
  measured?: string;
  source?: string;
};

export type HistoryVerification = {
  status: Verification["status"];
  badge: "Đã kiểm" | "Lệch — cần xem lại" | "Chưa kiểm được";
  details: HistoryVerifyDetail[];
};

export type HistoryVerifyCtx = {
  places: readonly HistoricalPlace[];
  /** Bản đồ tra cứu Wikidata đã tải sẵn: khoá là QID hoặc tên đã chuẩn hoá (foldVi). */
  wikidata?: ReadonlyMap<string, WikidataRecord>;
  /** Các đoạn tài liệu giáo viên (từ tutor_chunks hoặc đính kèm trực tiếp). */
  teacherDocs?: readonly TeacherDocChunk[];
};

export const normKey = (s: string) =>
  foldVi(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export function fmtYearVi(y: number): string {
  return y < 0 ? `${Math.abs(y)} TCN` : String(y);
}

function fmtYearsRange(start: number, end?: number): string {
  return end !== undefined && end !== start ? `${fmtYearVi(start)}–${fmtYearVi(end)}` : fmtYearVi(start);
}

function fmtCoords(c: { lat: number; lon: number }): string {
  return `${c.lat.toFixed(4)}°B, ${c.lon.toFixed(4)}°Đ`;
}

function lookupWikidata(ctx: HistoryVerifyCtx, qid?: string, name?: string): WikidataRecord | undefined {
  if (!ctx.wikidata) return undefined;
  if (qid && ctx.wikidata.has(qid)) return ctx.wikidata.get(qid);
  if (name) {
    const k = normKey(name);
    if (ctx.wikidata.has(k)) return ctx.wikidata.get(k);
  }
  return undefined;
}

/** Trích các năm (1..2099, có hỗ trợ "TCN") xuất hiện trong một đoạn văn bản tài liệu GV. */
export function extractYearsFromText(text: string): number[] {
  const out = new Set<number>();
  const s = text.normalize("NFC");
  // Năm trước Công nguyên: "208 TCN", "179 TCN"
  for (const m of s.matchAll(/\b(\d{1,4})\s*(?:TCN|trước\s+Công\s+nguyên)\b/gi)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 3000) out.add(-n);
  }
  // Năm Công nguyên 3-4 chữ số (mốc 1000..2099 hoặc 3 chữ số đi sau "năm", "/", "(", "–", "-")
  for (const m of s.matchAll(/\b(1\d{3}|20\d{2}|[1-9]\d{2})\b(?!\s*(?:TCN|trước\s+Công\s+nguyên|km|m\b|người|quân|đồng|tấn|ngày|tháng))/gi)) {
    const n = Number(m[1]);
    const prefix = s.slice(Math.max(0, (m.index ?? 0) - 10), m.index ?? 0).toLowerCase();
    if (n < 1000 && !/(năm|\/|\(|–|-|đến|từ)\s*$/.test(prefix)) continue;
    if (n >= 1 && n <= 2099) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

type DocMatch = { chunk: TeacherDocChunk; years: number[]; source: string };

function findTeacherEvidence(bm25: Bm25<TeacherDocChunk> | null, query: string): DocMatch | null {
  if (!bm25 || !query.trim()) return null;
  const hits = bm25.search(query, 3);
  const top = hits[0];
  if (!top || top.score < 0.8) return null;
  const years = extractYearsFromText(top.item.text);
  return { chunk: top.item, years, source: `Tài liệu GV: ${top.item.doc} (tr. ${top.item.page})` };
}

function checkYearClaim(
  c: Extract<HistoryClaim, { kind: "year" }>,
  ctx: HistoryVerifyCtx,
  bm25: Bm25<TeacherDocChunk> | null,
): HistoryVerifyDetail {
  const claimed = fmtYearsRange(c.year, c.endYear);
  const wd = lookupWikidata(ctx, c.qid, c.subject);
  const doc = findTeacherEvidence(bm25, c.subject);

  // Ưu tiên kiểm chéo với tài liệu GV nếu tài liệu GV nêu rõ năm cho đúng sự kiện
  if (doc && doc.years.length > 0) {
    const startOk = doc.years.includes(c.year);
    const endOk = c.endYear === undefined || doc.years.includes(c.endYear);
    if (startOk && endOk) {
      return {
        ok: true,
        label: `Mốc năm "${c.subject}" khớp tài liệu GV`,
        expected: claimed,
        measured: claimed,
        source: doc.source,
      };
    }
    // Nếu Wikidata cũng có và khớp thì đối chiếu cả hai; nếu tài liệu GV không khớp và không có Wikidata khớp → báo lệch
    if (!wd) {
      return {
        ok: false,
        label: `Lệch — cần xem lại: năm của "${c.subject}" không khớp tài liệu GV`,
        expected: claimed,
        measured: doc.years.map(fmtYearVi).join(", "),
        source: doc.source,
      };
    }
  }

  if (wd) {
    const src = `Wikidata ${wd.qid} (${wd.url})`;
    const known = new Set<number>(wd.years);
    if (wd.startYear !== undefined) known.add(wd.startYear);
    if (wd.endYear !== undefined) known.add(wd.endYear);
    if (known.size === 0) {
      return {
        ok: null,
        label: `Chưa kiểm được: Wikidata ${wd.qid} không có thuộc tính mốc năm cho "${c.subject}"`,
        expected: claimed,
        source: src,
      };
    }
    const inRange =
      wd.startYear !== undefined && wd.endYear !== undefined
        ? c.year >= wd.startYear && (c.endYear ?? c.year) <= wd.endYear
        : false;
    const exactStart = known.has(c.year);
    const exactEnd = c.endYear === undefined || known.has(c.endYear);
    if ((exactStart && exactEnd) || inRange) {
      return {
        ok: true,
        label: `Mốc năm "${c.subject}" khớp Wikidata (${wd.qid})`,
        expected: claimed,
        measured: wd.startYear !== undefined && wd.endYear !== undefined ? fmtYearsRange(wd.startYear, wd.endYear) : [...known].map(fmtYearVi).join(", "),
        source: src,
      };
    }
    const measured =
      wd.startYear !== undefined && wd.endYear !== undefined
        ? fmtYearsRange(wd.startYear, wd.endYear)
        : [...known].sort((a, b) => a - b).map(fmtYearVi).join(", ");
    return {
      ok: false,
      label: `Lệch — cần xem lại: mốc năm "${c.subject}" lệch với Wikidata (${wd.qid})`,
      expected: claimed,
      measured,
      source: src,
    };
  }

  return {
    ok: null,
    label: `Chưa kiểm được mốc năm "${c.subject}" — thiếu nguồn đối chiếu (Wikidata / tài liệu GV)`,
    expected: claimed,
  };
}

function checkPlaceClaim(
  c: Extract<HistoryClaim, { kind: "place" }>,
  ctx: HistoryVerifyCtx,
): HistoryVerifyDetail {
  const byId = c.placeId ? findPlaceById(ctx.places, c.placeId) : undefined;
  const place = byId ?? findPlaceByName(ctx.places, c.name);
  const wd = lookupWikidata(ctx, c.qid ?? place?.nguon.wikidataQid, c.name);
  const hasCoords = c.lat !== undefined && c.lon !== undefined;

  if (!place && !wd?.coords) {
    // AI tự đặt toạ độ khi không có địa danh trong gazetteer hay Wikidata → BẮT LỖI CỨNG
    if (hasCoords) {
      return {
        ok: false,
        label: `Lệch — cần xem lại: toạ độ cho "${c.name}" không có nguồn xác thực (AI không được tự tạo toạ độ)`,
        expected: fmtCoords({ lat: c.lat!, lon: c.lon! }),
        source: "Bộ địa danh lịch sử EDUVN / Wikidata",
      };
    }
    return {
      ok: null,
      label: `Chưa kiểm được địa danh "${c.name}" — không có trong bộ địa danh hoặc Wikidata`,
      expected: c.placeId ? `${c.name} (${c.placeId})` : c.name,
    };
  }

  const refCoords = place ? { lat: place.lat, lon: place.lon } : wd!.coords!;
  const refSource = place
    ? place.nguon.wikidataQid
      ? `Bộ địa danh EDUVN (${place.id}) · Wikidata ${place.nguon.wikidataQid} (${place.nguon.url ?? `https://www.wikidata.org/wiki/${place.nguon.wikidataQid}`})`
      : `Bộ địa danh EDUVN (${place.id}) · ${place.nguon.taiLieu}`
    : `Wikidata ${wd!.qid} (${wd!.url})`;

  if (c.placeId && !byId) {
    return {
      ok: false,
      label: `Lệch — cần xem lại: mã địa danh "${c.placeId}" không tồn tại trong bộ địa danh`,
      expected: c.placeId,
      measured: place ? place.id : undefined,
      source: refSource,
    };
  }

  if (hasCoords) {
    const dist = haversineKm({ lat: c.lat!, lon: c.lon! }, refCoords);
    const tol = place ? coordToleranceKm(place.loai) : 25;
    if (dist > tol) {
      return {
        ok: false,
        label: `Lệch — cần xem lại: toạ độ "${c.name}" lệch ${dist.toFixed(1)} km (ngưỡng ${tol} km)`,
        expected: fmtCoords({ lat: c.lat!, lon: c.lon! }),
        measured: fmtCoords(refCoords),
        source: refSource,
      };
    }
    return {
      ok: true,
      label: `Địa danh và toạ độ "${place?.ten ?? c.name}" khớp nguồn (lệch ${dist.toFixed(1)} km)`,
      expected: fmtCoords({ lat: c.lat!, lon: c.lon! }),
      measured: fmtCoords(refCoords),
      source: refSource,
    };
  }

  return {
    ok: true,
    label: `Địa danh "${place?.ten ?? wd!.label}" đã đối chiếu nguồn`,
    expected: c.name,
    measured: fmtCoords(refCoords),
    source: refSource,
  };
}

function checkFigureClaim(
  c: Extract<HistoryClaim, { kind: "figure" }>,
  ctx: HistoryVerifyCtx,
  bm25: Bm25<TeacherDocChunk> | null,
): HistoryVerifyDetail {
  const wd = lookupWikidata(ctx, c.qid, c.name);
  const doc = findTeacherEvidence(bm25, c.eventName ? `${c.name} ${c.eventName}` : c.name);

  if (wd) {
    const src = `Wikidata ${wd.qid} (${wd.url})`;
    const mismatches: string[] = [];
    if (c.birthYear !== undefined && wd.birthYear !== undefined && c.birthYear !== wd.birthYear) {
      mismatches.push(`năm sinh ghi ${fmtYearVi(c.birthYear)}, nguồn ${fmtYearVi(wd.birthYear)}`);
    }
    if (c.deathYear !== undefined && wd.deathYear !== undefined && c.deathYear !== wd.deathYear) {
      mismatches.push(`năm mất ghi ${fmtYearVi(c.deathYear)}, nguồn ${fmtYearVi(wd.deathYear)}`);
    }
    if (c.eventYear !== undefined) {
      if (wd.birthYear !== undefined && c.eventYear < wd.birthYear) {
        mismatches.push(`sự kiện năm ${fmtYearVi(c.eventYear)} xảy ra trước khi nhân vật sinh (${fmtYearVi(wd.birthYear)})`);
      }
      if (wd.deathYear !== undefined && c.eventYear > wd.deathYear) {
        mismatches.push(`sự kiện năm ${fmtYearVi(c.eventYear)} xảy ra sau khi nhân vật mất (${fmtYearVi(wd.deathYear)})`);
      }
    }
    if (mismatches.length > 0) {
      return {
        ok: false,
        label: `Lệch — cần xem lại: nhân vật "${c.name}" (${mismatches.join("; ")})`,
        expected:
          c.birthYear !== undefined || c.deathYear !== undefined
            ? `${c.birthYear !== undefined ? fmtYearVi(c.birthYear) : "?"}–${c.deathYear !== undefined ? fmtYearVi(c.deathYear) : "?"}`
            : c.eventYear !== undefined
              ? fmtYearVi(c.eventYear)
              : c.name,
        measured:
          wd.birthYear !== undefined || wd.deathYear !== undefined
            ? `${wd.birthYear !== undefined ? fmtYearVi(wd.birthYear) : "?"}–${wd.deathYear !== undefined ? fmtYearVi(wd.deathYear) : "?"}`
            : undefined,
        source: src,
      };
    }
    return {
      ok: true,
      label: `Nhân vật "${c.name}" khớp hồ sơ Wikidata (${wd.qid})`,
      expected: c.name,
      measured:
        wd.birthYear !== undefined || wd.deathYear !== undefined
          ? `${wd.birthYear !== undefined ? fmtYearVi(wd.birthYear) : "?"}–${wd.deathYear !== undefined ? fmtYearVi(wd.deathYear) : "?"}`
          : wd.label,
      source: src,
    };
  }

  if (doc) {
    const folded = normKey(doc.chunk.text);
    const hasName = folded.includes(normKey(c.name));
    if (hasName && (c.eventYear === undefined || doc.years.length === 0 || doc.years.includes(c.eventYear))) {
      return {
        ok: true,
        label: `Nhân vật "${c.name}" có trong tài liệu GV`,
        expected: c.name,
        measured: c.eventYear !== undefined ? fmtYearVi(c.eventYear) : c.name,
        source: doc.source,
      };
    }
    if (hasName && c.eventYear !== undefined && doc.years.length > 0 && !doc.years.includes(c.eventYear)) {
      return {
        ok: false,
        label: `Lệch — cần xem lại: năm gắn với "${c.name}" không khớp tài liệu GV`,
        expected: fmtYearVi(c.eventYear),
        measured: doc.years.map(fmtYearVi).join(", "),
        source: doc.source,
      };
    }
  }

  return {
    ok: null,
    label: `Chưa kiểm được nhân vật "${c.name}" — thiếu nguồn đối chiếu (Wikidata / tài liệu GV)`,
    expected: c.name,
  };
}

/** Kiểm toàn bộ danh sách nhận định lịch sử (thuần, tất định). */
export function verifyHistoryClaims(claims: readonly HistoryClaim[], ctx: HistoryVerifyCtx): HistoryVerification {
  const bm25 = ctx.teacherDocs?.length ? new Bm25([...ctx.teacherDocs]) : null;
  const details: HistoryVerifyDetail[] = claims.slice(0, 40).map((c) => {
    if (c.kind === "year") return checkYearClaim(c, ctx, bm25);
    if (c.kind === "place") return checkPlaceClaim(c, ctx);
    return checkFigureClaim(c, ctx, bm25);
  });

  const status: Verification["status"] = details.some((d) => d.ok === false)
    ? "mismatch"
    : details.some((d) => d.ok === true)
      ? "verified"
      : "unchecked";
  const badge =
    status === "verified" ? "Đã kiểm" : status === "mismatch" ? "Lệch — cần xem lại" : "Chưa kiểm được";

  return {
    status,
    badge,
    details: details.map((d) => ({
      ...d,
      label: d.label.slice(0, 200),
      expected: d.expected?.slice(0, 120),
      measured: d.measured?.slice(0, 120),
      source: d.source?.slice(0, 200),
    })),
  };
}

/** Chuyển sang kiểu Verification chuẩn P13 (`server/src/domain/solution.ts`). */
export function toP13Verification(v: HistoryVerification): Verification {
  return {
    status: v.status,
    details: v.details.map((d) => ({
      ok: d.ok,
      label: d.source ? `${d.label} [${d.source}]`.slice(0, 200) : d.label,
      ...(d.expected && { expected: d.expected }),
      ...(d.measured && { measured: d.measured }),
    })),
  };
}

/** Ghi chú đối chiếu gửi lại AI hoặc hiển thị cho GV khi có mục lệch (tương tự mismatchNote của P13). */
export function historyMismatchNote(v: HistoryVerification): string {
  return v.details
    .filter((d) => d.ok === false)
    .map(
      (d) =>
        `- ${d.label}${d.expected ? ` | bài viết ghi: ${d.expected}` : ""}${d.measured ? ` | nguồn ghi: ${d.measured}` : ""}${d.source ? ` | nguồn: ${d.source}` : ""}`,
    )
    .join("\n");
}
