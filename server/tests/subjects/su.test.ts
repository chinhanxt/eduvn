// server/tests/subjects/su.test.ts — kiểm thử gói môn Lịch sử: bộ địa danh, dòng thời gian, 4 dạng câu hỏi,
// tự kiểm sự kiện (Wikidata có cache + giới hạn tốc độ / kho tài liệu GV) và HTTP routes trên PGlite.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tutorChunks, tutorDocs, tutorKbs, users } from "../../src/db/schema";
import { buildApp } from "../../src/http/app";
import { createVerifier } from "../../src/auth/verify";
import type { Ai } from "../../src/services/ai";
import {
  GazetteerSchema,
  findPlaceById,
  findPlaceByName,
  haversineKm,
  loadGazetteer,
  placesMentionedIn,
} from "../../src/subjects/su/gazetteer";
import {
  HistoryQuestionSchema,
  buildHistoryQuestionPrompt,
  gradeHistoryQuestion,
  toBankQuestion,
} from "../../src/subjects/su/questions";
import {
  HISTORICAL_ERAS,
  HISTORICAL_EVENTS,
  HISTORICAL_FIGURES,
  HistoricalEventSchema,
  decimalYear,
  filterTimelineEvents,
} from "../../src/subjects/su/timeline";
import {
  extractYearsFromText,
  historyMismatchNote,
  normKey,
  toP13Verification,
  verifyHistoryClaims,
  type WikidataRecord,
} from "../../src/subjects/su/verify";
import { createWikidataClient, parseWikidataYear } from "../../src/subjects/su/wikidata";
import { testDb } from "../helpers/db";
import { AUDIENCE, ISSUER, makeIssuer } from "../helpers/tokens";

describe("Bộ địa danh lịch sử (dia-danh-lich-su.json)", () => {
  const g = loadGazetteer();

  it("hợp lệ theo lược đồ, mọi mục đều có nguồn, đủ Hoàng Sa và Trường Sa", () => {
    expect(g.places.length).toBeGreaterThanOrEqual(45);
    const hs = findPlaceById(g.places, "hoang-sa");
    const ts = findPlaceById(g.places, "truong-sa");
    expect(hs).toBeDefined();
    expect(ts).toBeDefined();
    expect(hs!.nguon.wikidataQid).toBe("Q274388");
    expect(ts!.nguon.wikidataQid).toBe("Q215664");
    for (const p of g.places) {
      expect(Boolean(p.nguon.wikidataQid || p.nguon.taiLieu)).toBe(true);
    }
  });

  it("từ chối bộ địa danh thiếu Hoàng Sa hoặc Trường Sa", () => {
    const bad = {
      version: 1,
      updatedAt: "2026-11-23",
      note: "test",
      places: [findPlaceById(g.places, "dien-bien-phu")!],
    };
    expect(() => GazetteerSchema.parse(bad)).toThrow(/hoang-sa/);
  });

  it("tìm theo tên có/không dấu và nhận diện địa danh trong văn bản", () => {
    expect(findPlaceByName(g.places, "dien bien phu")?.id).toBe("dien-bien-phu");
    expect(findPlaceByName(g.places, "Cố đô Hoa Lư")?.id).toBe("hoa-lu");
    const mentioned = placesMentionedIn("Từ Tuần Giáo tiến đánh Him Lam và Đồi A1 ở Điện Biên Phủ.", g.places);
    const ids = mentioned.map((p) => p.id);
    expect(ids).toContain("tuan-giao");
    expect(ids).toContain("him-lam");
    expect(ids).toContain("doi-a1");
    expect(ids).toContain("dien-bien-phu");
  });

  it("tính khoảng cách Haversine hợp lý (Hà Nội ↔ TP.HCM ≈ 1140 km)", () => {
    const hn = findPlaceById(g.places, "thang-long-ha-noi")!;
    const hcm = findPlaceById(g.places, "gia-dinh-sai-gon")!;
    const d = haversineKm(hn, hcm);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1200);
  });
});

describe("Dữ liệu dòng thời gian Lịch sử (kiểu TimelineJS)", () => {
  const g = loadGazetteer();
  const placeIds = new Set(g.places.map((p) => p.id));
  const figIds = new Set(HISTORICAL_FIGURES.map((f) => f.id));
  const eraIds = new Set(HISTORICAL_ERAS.map((e) => e.id));

  it("mọi sự kiện đều hợp lệ và chỉ tham chiếu địa danh/nhân vật/thời kỳ tồn tại", () => {
    for (const ev of HISTORICAL_EVENTS) {
      expect(() => HistoricalEventSchema.parse(ev)).not.toThrow();
      expect(eraIds.has(ev.era_id)).toBe(true);
      for (const pid of ev.location_ids) expect(placeIds.has(pid), `missing place ${pid} in ${ev.id}`).toBe(true);
      for (const fid of ev.figure_ids) expect(figIds.has(fid), `missing figure ${fid} in ${ev.id}`).toBe(true);
      for (const ph of ev.phases) {
        for (const pid of ph.placeIds) expect(placeIds.has(pid), `missing phase place ${pid}`).toBe(true);
        for (const a of ph.arrows) {
          expect(placeIds.has(a.from), `missing arrow.from ${a.from}`).toBe(true);
          expect(placeIds.has(a.to), `missing arrow.to ${a.to}`).toBe(true);
        }
      }
    }
  });

  it("tính năm thập phân đúng tỉ lệ và lọc sự kiện tiếng Việt không dấu", () => {
    expect(decimalYear({ year: 1954, month: 3, day: 13 })).toBeLessThan(decimalYear({ year: 1954, month: 5, day: 7 }));
    const dbp = filterTimelineEvents(HISTORICAL_EVENTS, { q: "dien bien phu" });
    expect(dbp.map((e) => e.id)).toContain("dien-bien-phu-1954");
    const lop12 = filterTimelineEvents(HISTORICAL_EVENTS, { grade: 12 });
    expect(lop12.length).toBeGreaterThanOrEqual(5);
  });
});

describe("4 dạng câu hỏi đặc thù môn Lịch sử", () => {
  it("sắp xếp sự kiện theo thời gian: chấm tất định + chuyển sang ngân hàng câu hỏi", () => {
    const q = HistoryQuestionSchema.parse({
      suType: "sap_xep_thoi_gian",
      grade: 12,
      topic: "Cách mạng Việt Nam 1930–1975",
      level: "TH",
      stem: "Sắp xếp các sự kiện sau theo đúng trình tự thời gian:",
      items: [
        { id: "1", text: "Chiến thắng Điện Biên Phủ", year: 1954 },
        { id: "2", text: "Thành lập Đảng Cộng sản Việt Nam", year: 1930 },
        { id: "3", text: "Đại thắng mùa Xuân", year: 1975 },
        { id: "4", text: "Cách mạng tháng Tám thành công", year: 1945 },
      ],
      correctOrder: ["2", "4", "1", "3"],
      claims: [{ kind: "year", subject: "Chiến dịch Điện Biên Phủ", year: 1954 }],
    });
    expect(gradeHistoryQuestion(q, "2 - 4 - 1 - 3").correct).toBe(true);
    expect(gradeHistoryQuestion(q, "2-1-4-3").correct).toBe(false);
    const bank = toBankQuestion(q);
    expect(bank.type).toBe("short_answer");
    if (bank.type === "short_answer") expect(bank.answer).toBe("2-4-1-3");
    expect(bank.tags).toContain("su:dang:sap_xep_thoi_gian");
  });

  it("từ chối sắp xếp thời gian nếu thứ tự năm không tăng dần", () => {
    expect(() =>
      HistoryQuestionSchema.parse({
        suType: "sap_xep_thoi_gian",
        grade: 12,
        topic: "Test",
        level: "NB",
        stem: "Sắp xếp:",
        items: [
          { id: "1", text: "A", year: 1954 },
          { id: "2", text: "B", year: 1945 },
          { id: "3", text: "C", year: 1975 },
        ],
        correctOrder: ["1", "2", "3"],
      }),
    ).toThrow(/không tăng dần/);
  });

  it("nối nhân vật – sự kiện: chấm tất định dù viết thứ tự bất kỳ", () => {
    const q = HistoryQuestionSchema.parse({
      suType: "noi_nhan_vat_su_kien",
      grade: 11,
      topic: "Kháng chiến chống ngoại xâm",
      level: "NB",
      stem: "Nối nhân vật với sự kiện:",
      figures: [
        { id: "1", name: "Ngô Quyền", qid: "Q699904" },
        { id: "2", name: "Trần Hưng Đạo", qid: "Q511375" },
        { id: "3", name: "Quang Trung", qid: "Q379775" },
      ],
      events: [
        { id: "A", text: "Chiến thắng Ngọc Hồi – Đống Đa (1789)", year: 1789 },
        { id: "B", text: "Chiến thắng Bạch Đằng (938)", year: 938 },
        { id: "C", text: "Chiến thắng Bạch Đằng (1288)", year: 1288 },
      ],
      pairs: [
        { figureId: "1", eventId: "B" },
        { figureId: "2", eventId: "C" },
        { figureId: "3", eventId: "A" },
      ],
    });
    expect(gradeHistoryQuestion(q, "3-A, 1-B; 2:C").correct).toBe(true);
    expect(gradeHistoryQuestion(q, { "1": "B", "2": "C", "3": "A" }).correct).toBe(true);
    expect(gradeHistoryQuestion(q, "1-A, 2-B, 3-C").correct).toBe(false);
    const bank = toBankQuestion(q);
    expect(bank.type).toBe("short_answer");
  });

  it("đọc lược đồ và phân tích nguyên nhân/ý nghĩa: ánh xạ sang mcq / essay + sinh prompt chuẩn", () => {
    const mapQ = HistoryQuestionSchema.parse({
      suType: "doc_luoc_do",
      grade: 12,
      topic: "Chiến dịch Điện Biên Phủ",
      level: "TH",
      stem: "Quan sát lược đồ, cứ điểm mở màn Đợt 1 ngày 13/3/1954 là nơi nào?",
      mapKind: "dien-bien-phu",
      placeIds: ["tuan-giao", "him-lam", "doi-a1", "ham-de-castries"],
      arrows: [{ from: "tuan-giao", to: "him-lam", kind: "tien-cong", label: "Đợt 1" }],
      options: ["Cứ điểm Him Lam", "Đồi A1", "Hầm Đờ Cát", "Phân khu Hồng Cúm"],
      answer: 0,
    });
    expect(gradeHistoryQuestion(mapQ, "A").correct).toBe(true);
    const bankMap = toBankQuestion(mapQ);
    expect(bankMap.type).toBe("mcq");
    expect(bankMap.tags).toContain("su:place:him-lam");

    const essayQ = HistoryQuestionSchema.parse({
      suType: "phan_tich_nguyen_nhan_y_nghia",
      grade: 12,
      topic: "Chiến dịch Điện Biên Phủ",
      level: "VD",
      stem: "Phân tích ý nghĩa lịch sử của Chiến thắng Điện Biên Phủ năm 1954.",
      eventName: "Chiến dịch Điện Biên Phủ",
      eventYear: 1954,
      focus: "y_nghia",
      keyPoints: [
        { label: "Đập tan Kế hoạch Na-va", points: 1, description: "Làm phá sản kế hoạch quân sự cao nhất của Pháp – Mỹ." },
        { label: "Ý nghĩa quốc tế và Hiệp định Giơ-ne-vơ", points: 1, description: "Buộc Pháp ký Hiệp định Giơ-ne-vơ, cổ vũ phong trào giải phóng dân tộc." },
      ],
      points: 2,
    });
    expect(gradeHistoryQuestion(essayQ, "Bài làm của em").correct).toBeNull();
    const bankEssay = toBankQuestion(essayQ);
    expect(bankEssay.type).toBe("essay");

    const prompt = buildHistoryQuestionPrompt(
      { grade: 12, topic: "Điện Biên Phủ", suType: "doc_luoc_do", level: "TH", count: 2 },
      loadGazetteer().places,
    );
    expect(prompt).toContain("him-lam");
    expect(prompt).toContain("hoang-sa");
  });
});

describe("Tự kiểm sự kiện lịch sử (cơ chế Đã kiểm P13)", () => {
  const g = loadGazetteer();
  const wdMap = new Map<string, WikidataRecord>([
    ["Q604897", { qid: "Q604897", label: "Chiến dịch Điện Biên Phủ", url: "https://www.wikidata.org/wiki/Q604897", years: [1954], startYear: 1954, endYear: 1954, coords: { lat: 21.38694, lon: 103.01556 } }],
    [normKey("Chiến dịch Điện Biên Phủ"), { qid: "Q604897", label: "Chiến dịch Điện Biên Phủ", url: "https://www.wikidata.org/wiki/Q604897", years: [1954], startYear: 1954, endYear: 1954 }],
    ["Q179910", { qid: "Q179910", label: "Võ Nguyên Giáp", url: "https://www.wikidata.org/wiki/Q179910", years: [], birthYear: 1911, deathYear: 2013 }],
    [normKey("Võ Nguyên Giáp"), { qid: "Q179910", label: "Võ Nguyên Giáp", url: "https://www.wikidata.org/wiki/Q179910", years: [], birthYear: 1911, deathYear: 2013 }],
  ]);

  it("khớp năm, địa danh, nhân vật với Wikidata & bộ địa danh → Đã kiểm", () => {
    const res = verifyHistoryClaims(
      [
        { kind: "year", subject: "Chiến dịch Điện Biên Phủ", year: 1954, qid: "Q604897" },
        { kind: "place", placeId: "him-lam", name: "Cứ điểm Him Lam" },
        { kind: "figure", name: "Võ Nguyên Giáp", birthYear: 1911, deathYear: 2013, eventYear: 1954, qid: "Q179910" },
      ],
      { places: g.places, wikidata: wdMap },
    );
    expect(res.status).toBe("verified");
    expect(res.badge).toBe("Đã kiểm");
    expect(res.details.every((d) => d.ok === true && Boolean(d.source))).toBe(true);
    expect(toP13Verification(res).status).toBe("verified");
  });

  it("LỆCH CỐ Ý năm sự kiện → Lệch — cần xem lại kèm nguồn Wikidata", () => {
    const res = verifyHistoryClaims(
      [{ kind: "year", subject: "Chiến dịch Điện Biên Phủ", year: 1953, qid: "Q604897" }],
      { places: g.places, wikidata: wdMap },
    );
    expect(res.status).toBe("mismatch");
    expect(res.badge).toBe("Lệch — cần xem lại");
    expect(res.details[0]!.label).toContain("Lệch — cần xem lại");
    expect(res.details[0]!.measured).toBe("1954");
    expect(res.details[0]!.source).toContain("Q604897");
    expect(historyMismatchNote(res)).toContain("Q604897");
  });

  it("LỆCH CỐ Ý toạ độ không có nguồn hoặc lệch xa → bị bắt ngay", () => {
    const fabricated = verifyHistoryClaims(
      [{ kind: "place", name: "Địa điểm bịa XYZ", lat: 15.1234, lon: 105.9876 }],
      { places: g.places, wikidata: wdMap },
    );
    expect(fabricated.status).toBe("mismatch");
    expect(fabricated.details[0]!.label).toContain("không có nguồn");

    const drifted = verifyHistoryClaims(
      [{ kind: "place", placeId: "dien-bien-phu", name: "Điện Biên Phủ", lat: 10.77, lon: 106.7 }],
      { places: g.places, wikidata: wdMap },
    );
    expect(drifted.status).toBe("mismatch");
    expect(drifted.details[0]!.label).toContain("Lệch — cần xem lại");
  });

  it("LỆCH CỐ Ý nhân vật (năm sự kiện trước năm sinh) và đối chiếu tài liệu GV", () => {
    const badFig = verifyHistoryClaims(
      [{ kind: "figure", name: "Võ Nguyên Giáp", eventName: "Chiến dịch Điện Biên Phủ", eventYear: 1899, qid: "Q179910" }],
      { places: g.places, wikidata: wdMap },
    );
    expect(badFig.status).toBe("mismatch");
    expect(badFig.details[0]!.label).toContain("trước khi nhân vật sinh");

    const teacherDocs = [{ doc: "BaiGiang_Su12.pdf", page: 14, text: "Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình." }];
    const okDoc = verifyHistoryClaims(
      [{ kind: "year", subject: "Tuyên ngôn Độc lập tại Quảng trường Ba Đình", year: 1945 }],
      { places: g.places, teacherDocs },
    );
    expect(okDoc.status).toBe("verified");
    expect(okDoc.details[0]!.source).toContain("BaiGiang_Su12.pdf");

    const badDoc = verifyHistoryClaims(
      [{ kind: "year", subject: "Tuyên ngôn Độc lập tại Quảng trường Ba Đình", year: 1946 }],
      { places: g.places, teacherDocs },
    );
    expect(badDoc.status).toBe("mismatch");
    expect(badDoc.details[0]!.measured).toContain("1945");
  });

  it("trích năm tiếng Việt kể cả TCN và parse năm Wikidata âm/dương", () => {
    expect(extractYearsFromText("Năm 208 TCN xây Cổ Loa; năm 938 chiến thắng Bạch Đằng; ngày 7/5/1954.")).toEqual([-208, 938, 1954]);
    expect(parseWikidataYear("+1954-03-13T00:00:00Z")).toBe(1954);
    expect(parseWikidataYear("-0208-00-00T00:00:00Z")).toBe(-208);
  });
});

describe("Khách Wikidata có cache cục bộ và giới hạn tốc độ", () => {
  it("dùng cache cho lần gọi thứ 2 và tuân thủ minIntervalMs giữa hai lần gọi mạng", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "su-wd-"));
    const cachePath = path.join(dir, "cache.json");
    const callTimes: number[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      callTimes.push(Date.now());
      const url = String(input);
      if (url.includes("Q604897")) {
        return new Response(
          JSON.stringify({
            entities: {
              Q604897: {
                labels: { vi: { value: "Chiến dịch Điện Biên Phủ" } },
                claims: { P580: [{ mainsnak: { datavalue: { value: { time: "+1954-03-13T00:00:00Z" } } } }] },
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          entities: {
            Q2890760: {
              labels: { vi: { value: "Trận Bạch Đằng (938)" } },
              claims: { P585: [{ mainsnak: { datavalue: { value: { time: "+0938-00-00T00:00:00Z" } } } }] },
            },
          },
        }),
        { status: 200 },
      );
    };

    try {
      const client = createWikidataClient({ cachePath, minIntervalMs: 60, fetchImpl: fakeFetch });
      const a = await client.getEntity("Q604897");
      const a2 = await client.getEntity("Q604897");
      const b = await client.getEntity("Q2890760");
      expect(a?.years).toEqual([1954]);
      expect(a2?.qid).toBe("Q604897");
      expect(b?.years).toEqual([938]);
      expect(client.stats().networkCalls).toBe(2);
      expect(client.stats().cacheHits).toBe(1);
      expect(callTimes[1]! - callTimes[0]!).toBeGreaterThanOrEqual(45);

      // Client mới đọc lại từ tệp cache trên đĩa, không gọi mạng
      const client2 = createWikidataClient({ cachePath, offline: true, fetchImpl: fakeFetch });
      expect((await client2.getEntity("Q604897"))?.years).toEqual([1954]);
      expect(client2.stats().networkCalls).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("HTTP routes gói môn Lịch sử trên PGlite", () => {
  it("phục vụ /api/su/places, /api/su/timeline, /api/su/verify (cùng kho tài liệu GV) và /api/su/questions/draft", async () => {
    const db = await testDb();
    const kc = await makeIssuer();
    const mockAi: Ai = {
      async chat() {
        return JSON.stringify({
          questions: [
            {
              suType: "sap_xep_thoi_gian",
              grade: 12,
              topic: "Kháng chiến 1945–1975",
              level: "TH",
              stem: "Sắp xếp các sự kiện sau theo thứ tự thời gian:",
              items: [
                { id: "1", text: "Chiến dịch Điện Biên Phủ", year: 1954 },
                { id: "2", text: "Cách mạng tháng Tám", year: 1945 },
                { id: "3", text: "Chiến dịch Hồ Chí Minh", year: 1975 },
              ],
              correctOrder: ["2", "1", "3"],
              explanation: "1945 → 1954 → 1975.",
              claims: [
                { kind: "year", subject: "Cách mạng Tháng Tám", year: 1945, qid: "Q769960" },
                { kind: "year", subject: "Chiến dịch Điện Biên Phủ", year: 1954, qid: "Q604897" },
                { kind: "year", subject: "Chiến dịch Hồ Chí Minh", year: 1975, qid: "Q25418140" },
              ],
            },
          ],
        });
      },
      async *stream() {
        yield "";
      },
    };
    const app = buildApp({
      db,
      verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
      issuer: ISSUER,
      publicUrl: "http://127.0.0.1:4362",
      downloadSecret: "secret-secret-secret-secret-secret!",
      studentSecret: "student-secret-student-secret-123456",
      ai: mockAi,
    });
    const token = await kc.sign({ sub: "gv-su-1", name: "Thầy Minh", email: "minh@school.edu.vn" });
    const headers = { authorization: `Bearer ${token}` };

    const me = await app.inject({ method: "GET", url: "/api/me", headers });
    expect(me.statusCode).toBe(200);
    const { org } = me.json() as { org: { id: string } };
    const [ownerRow] = await db.select().from(users);
    const userId = ownerRow!.id;

    // 1. Places & Timeline công khai cho cổng HS
    const rPlaces = await app.inject({ method: "GET", url: "/api/su/places?loai=quan-dao" });
    expect(rPlaces.statusCode).toBe(200);
    expect((rPlaces.json() as { places: { id: string }[] }).places.map((p) => p.id).sort()).toEqual(["hoang-sa", "truong-sa"]);

    const rTl = await app.inject({ method: "GET", url: "/api/su/timeline?q=dien%20bien%20phu" });
    expect(rTl.statusCode).toBe(200);
    const tl = rTl.json() as { events: { id: string; phases: unknown[] }[] };
    expect(tl.events[0]!.id).toBe("dien-bien-phu-1954");
    expect(tl.events[0]!.phases).toHaveLength(3);

    // 2. Verify đối chiếu kho tài liệu GV thật trong PGlite
    const [kb] = await db.insert(tutorKbs).values({ orgId: org.id, ownerId: userId, name: "Tài liệu Sử 12", subject: "Lịch sử", grade: 12 }).returning();
    const [doc] = await db.insert(tutorDocs).values({ kbId: kb!.id, orgId: org.id, name: "ChuyenDe_Su12.pdf", source: "upload", pages: 2, chars: 120 }).returning();
    await db.insert(tutorChunks).values({
      docId: doc!.id,
      kbId: kb!.id,
      page: 2,
      idx: 0,
      text: "Phong trào Đồng khởi ở Bến Tre bùng nổ ngày 17/1/1960 tại huyện Mỏ Cày.",
    });

    const rVer = await app.inject({
      method: "POST",
      url: "/api/su/verify",
      headers,
      payload: {
        kbId: kb!.id,
        claims: [
          { kind: "year", subject: "Phong trào Đồng khởi ở Bến Tre", year: 1960 },
          { kind: "year", subject: "Chiến dịch Điện Biên Phủ", year: 1953, qid: "Q604897" },
        ],
      },
    });
    expect(rVer.statusCode).toBe(200);
    const ver = rVer.json() as { status: string; badge: string; details: { ok: boolean; source?: string }[] };
    expect(ver.status).toBe("mismatch");
    expect(ver.badge).toBe("Lệch — cần xem lại");
    expect(ver.details[0]!.ok).toBe(true);
    expect(ver.details[0]!.source).toContain("ChuyenDe_Su12.pdf");
    expect(ver.details[1]!.ok).toBe(false);

    // 3. Draft + tự kiểm + lưu thẳng vào ngân hàng câu hỏi hiện có
    const rDraft = await app.inject({
      method: "POST",
      url: "/api/su/questions/draft",
      headers,
      payload: { grade: 12, topic: "Kháng chiến 1945–1975", suType: "sap_xep_thoi_gian", level: "TH", count: 1, save: true },
    });
    expect(rDraft.statusCode).toBe(200);
    const draft = rDraft.json() as { items: { verification: { status: string }; bankQuestionId?: string }[] };
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]!.verification.status).toBe("verified");
    expect(draft.items[0]!.bankQuestionId).toBeTruthy();

    await app.close();
  });
});
