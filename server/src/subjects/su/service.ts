// server/src/subjects/su/service.ts — dịch vụ gói môn Lịch sử: dòng thời gian, địa danh,
// tự kiểm sự kiện (Wikidata có cache/giới hạn tốc độ + kho tài liệu GV), và soạn câu hỏi đặc thù Sử qua cổng AI.
import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { tutorChunks, tutorDocs, tutorKbs } from "../../db/schema";
import { assertCan } from "../../domain/authz";
import { ValidationError } from "../../errors";
import type { Actor, Service } from "../../service";
import { type Ai, type AiMessage, parseAiJson } from "../../services/ai";
import { type HistoricalPlace, findPlaceById, findPlaceByName, loadGazetteer } from "./gazetteer";
import {
  HISTORY_QUESTION_SYSTEM,
  type HistoryDraftRequest,
  type HistoryQuestion,
  HistoryQuestionSchema,
  buildHistoryQuestionPrompt,
  toBankQuestion,
} from "./questions";
import {
  HISTORICAL_ERAS,
  HISTORICAL_EVENTS,
  HISTORICAL_FIGURES,
  type TimelineFilter,
  filterTimelineEvents,
} from "./timeline";
import {
  type HistoryClaim,
  type HistoryVerification,
  type TeacherDocChunk,
  type WikidataRecord,
  normKey,
  verifyHistoryClaims,
} from "./verify";
import { type WikidataClient, createWikidataClient } from "./wikidata";

export const SU_QUESTION_TASK = "su_soan_cau_hoi";

/** Hạt giống bản ghi Wikidata đã đối chiếu thật (phòng trường hợp mạng ngoài chậm hoặc tắt trong test). */
export const VERIFIED_WIKIDATA_SEED: readonly WikidataRecord[] = [
  { qid: "Q2890760", label: "Trận Bạch Đằng (938)", url: "https://www.wikidata.org/wiki/Q2890760", years: [938] },
  { qid: "Q1369379", label: "Trận Bạch Đằng (1288)", url: "https://www.wikidata.org/wiki/Q1369379", years: [1288] },
  { qid: "Q1848807", label: "Khởi nghĩa Lam Sơn", url: "https://www.wikidata.org/wiki/Q1848807", years: [1418, 1427], startYear: 1418, endYear: 1427 },
  { qid: "Q3539853", label: "Trận Ngọc Hồi – Đống Đa", url: "https://www.wikidata.org/wiki/Q3539853", years: [1788, 1789], startYear: 1788, endYear: 1789 },
  { qid: "Q427325", label: "Đảng Cộng sản Việt Nam", url: "https://www.wikidata.org/wiki/Q427325", years: [1930] },
  { qid: "Q769960", label: "Cách mạng Tháng Tám", url: "https://www.wikidata.org/wiki/Q769960", years: [1945], startYear: 1945, endYear: 1945 },
  { qid: "Q3354762", label: "Chiến dịch Việt Bắc", url: "https://www.wikidata.org/wiki/Q3354762", years: [1947], startYear: 1947, endYear: 1947 },
  { qid: "Q2748355", label: "Chiến dịch Biên giới", url: "https://www.wikidata.org/wiki/Q2748355", years: [1950], startYear: 1950, endYear: 1950 },
  { qid: "Q604897", label: "Chiến dịch Điện Biên Phủ", url: "https://www.wikidata.org/wiki/Q604897", years: [1954], startYear: 1954, endYear: 1954, coords: { lat: 21.38694, lon: 103.01556 } },
  { qid: "Q482407", label: "Hiệp định Genève 1954", url: "https://www.wikidata.org/wiki/Q482407", years: [1954], startYear: 1954, endYear: 1954 },
  { qid: "Q82542", label: "Sự kiện Tết Mậu Thân", url: "https://www.wikidata.org/wiki/Q82542", years: [1968], startYear: 1968, endYear: 1968 },
  { qid: "Q696802", label: "Hiệp định Paris 1973", url: "https://www.wikidata.org/wiki/Q696802", years: [1973] },
  { qid: "Q25418140", label: "Chiến dịch Hồ Chí Minh", url: "https://www.wikidata.org/wiki/Q25418140", years: [1975], startYear: 1975, endYear: 1975 },
  { qid: "Q342587", label: "Đổi Mới", url: "https://www.wikidata.org/wiki/Q342587", years: [1986], startYear: 1986 },
  { qid: "Q699904", label: "Ngô Quyền", url: "https://www.wikidata.org/wiki/Q699904", years: [], birthYear: 897, deathYear: 944 },
  { qid: "Q702734", label: "Lý Thường Kiệt", url: "https://www.wikidata.org/wiki/Q702734", years: [], birthYear: 1019, deathYear: 1105 },
  { qid: "Q511375", label: "Trần Hưng Đạo", url: "https://www.wikidata.org/wiki/Q511375", years: [], birthYear: 1228, deathYear: 1300 },
  { qid: "Q1195391", label: "Lê Lợi", url: "https://www.wikidata.org/wiki/Q1195391", years: [], birthYear: 1384, deathYear: 1433 },
  { qid: "Q1347181", label: "Nguyễn Trãi", url: "https://www.wikidata.org/wiki/Q1347181", years: [], birthYear: 1380, deathYear: 1442 },
  { qid: "Q379775", label: "Quang Trung", url: "https://www.wikidata.org/wiki/Q379775", years: [], birthYear: 1752, deathYear: 1792 },
  { qid: "Q36014", label: "Hồ Chí Minh", url: "https://www.wikidata.org/wiki/Q36014", years: [], birthYear: 1890, deathYear: 1969 },
  { qid: "Q179910", label: "Võ Nguyên Giáp", url: "https://www.wikidata.org/wiki/Q179910", years: [], birthYear: 1911, deathYear: 2013 },
  { qid: "Q714924", label: "Phan Bội Châu", url: "https://www.wikidata.org/wiki/Q714924", years: [], birthYear: 1867, deathYear: 1940 },
  { qid: "Q2705303", label: "Phan Châu Trinh", url: "https://www.wikidata.org/wiki/Q2705303", years: [], birthYear: 1872, deathYear: 1926 },
];

export type SuServiceDeps = {
  db: Db;
  ai: Ai;
  bank: Service;
  wikidata?: WikidataClient;
  places?: readonly HistoricalPlace[];
};

export type DraftedSuQuestion = {
  question: HistoryQuestion;
  verification: HistoryVerification;
  bankQuestionId?: string;
};

export function createSuService(deps: SuServiceDeps) {
  const wikidata = deps.wikidata ?? createWikidataClient({ cachePath: "/tmp/eduvn-su-wikidata-cache.json", minIntervalMs: 300 });
  wikidata.seed(VERIFIED_WIKIDATA_SEED);

  const getPlaces = (): readonly HistoricalPlace[] => deps.places ?? loadGazetteer().places;

  async function loadTeacherChunks(orgId: string, kbId?: string): Promise<TeacherDocChunk[]> {
    if (!kbId) return [];
    const [kb] = await deps.db
      .select({ id: tutorKbs.id })
      .from(tutorKbs)
      .where(and(eq(tutorKbs.id, kbId), eq(tutorKbs.orgId, orgId)));
    if (!kb) return [];
    const rows = await deps.db
      .select({ doc: tutorDocs.name, page: tutorChunks.page, text: tutorChunks.text })
      .from(tutorChunks)
      .innerJoin(tutorDocs, eq(tutorDocs.id, tutorChunks.docId))
      .where(eq(tutorChunks.kbId, kbId));
    return rows;
  }

  /** Tự kiểm danh sách nhận định lịch sử: nạp dữ liệu Wikidata (có cache/rate-limit) + tài liệu GV rồi đối chiếu tất định. */
  async function verifyClaims(
    claims: readonly HistoryClaim[],
    opts: { orgId?: string; kbId?: string; teacherDocs?: readonly TeacherDocChunk[] } = {},
  ): Promise<HistoryVerification> {
    const places = getPlaces();
    const wdMap = new Map<string, WikidataRecord>();

    for (const c of claims) {
      if (c.kind === "year") {
        const rec = c.qid ? await wikidata.getEntity(c.qid) : await wikidata.searchBest(c.subject, "vi");
        if (rec) {
          wdMap.set(rec.qid, rec);
          wdMap.set(normKey(c.subject), rec);
        }
      } else if (c.kind === "place") {
        const p = (c.placeId && findPlaceById(places, c.placeId)) || findPlaceByName(places, c.name);
        const qid = c.qid ?? p?.nguon.wikidataQid;
        if (qid) {
          const rec = await wikidata.getEntity(qid);
          if (rec) {
            wdMap.set(rec.qid, rec);
            wdMap.set(normKey(c.name), rec);
          }
        } else {
          const rec = await wikidata.searchBest(c.name, "vi");
          if (rec) {
            wdMap.set(rec.qid, rec);
            wdMap.set(normKey(c.name), rec);
          }
        }
      } else if (c.kind === "figure") {
        const rec = c.qid ? await wikidata.getEntity(c.qid) : await wikidata.searchBest(c.name, "vi");
        if (rec) {
          wdMap.set(rec.qid, rec);
          wdMap.set(normKey(c.name), rec);
        }
      }
    }

    const kbDocs = opts.orgId && opts.kbId ? await loadTeacherChunks(opts.orgId, opts.kbId) : [];
    const teacherDocs = [...kbDocs, ...(opts.teacherDocs ?? [])];
    return verifyHistoryClaims(claims, { places, wikidata: wdMap, teacherDocs });
  }

  /** Danh sách địa danh lịch sử (có lọc theo loại hoặc từ khoá). */
  function listPlaces(filter: { loai?: string; q?: string } = {}) {
    const places = getPlaces();
    const q = filter.q ? normKey(filter.q) : "";
    return places.filter((p) => {
      if (filter.loai && p.loai !== filter.loai) return false;
      if (q) {
        const hay = normKey(`${p.ten} ${p.tenKhac.join(" ")} ${p.tinhHienNay} ${p.thoiKy.join(" ")}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  /** Trả dữ liệu dòng thời gian Lịch sử (tương thích TimelineJS + địa danh + nhân vật). */
  function getTimeline(filter: TimelineFilter = {}) {
    const places = getPlaces();
    const placeMap = new Map(places.map((p) => [p.id, p]));
    const figureMap = new Map(HISTORICAL_FIGURES.map((f) => [f.id, f]));
    const events = filterTimelineEvents(HISTORICAL_EVENTS, filter).map((ev) => ({
      ...ev,
      places: ev.location_ids.map((id) => placeMap.get(id)).filter((x): x is HistoricalPlace => Boolean(x)),
      figures: ev.figure_ids.map((id) => figureMap.get(id)).filter((x): x is (typeof HISTORICAL_FIGURES)[number] => Boolean(x)),
    }));
    return {
      eras: HISTORICAL_ERAS,
      figures: HISTORICAL_FIGURES,
      events,
      sovereigntyNote: "Mọi bản đồ sử dụng dữ liệu Natural Earth góc nhìn Việt Nam (_vnm), thể hiện đầy đủ chủ quyền Việt Nam đối với quần đảo Hoàng Sa và quần đảo Trường Sa.",
    };
  }

  /** Dùng AI soạn câu hỏi đặc thù Lịch sử, tự kiểm mọi mốc năm/địa danh/nhân vật, và tuỳ chọn lưu vào ngân hàng. */
  async function draftQuestions(
    actor: Actor,
    req: HistoryDraftRequest & { kbId?: string; save?: boolean },
  ): Promise<{ items: DraftedSuQuestion[]; rejected: { index: number; issues: string[] }[] }> {
    assertCan(actor.role, "question:write");
    const places = getPlaces();
    const kbDocs = req.kbId ? await loadTeacherChunks(actor.orgId, req.kbId) : [];
    const contextText = req.contextText || kbDocs.slice(0, 4).map((d) => `[${d.doc} tr.${d.page}] ${d.text}`).join("\n");
    const prompt = buildHistoryQuestionPrompt({ ...req, contextText }, places);

    const messages: AiMessage[] = [
      { role: "system", content: HISTORY_QUESTION_SYSTEM },
      { role: "user", content: prompt },
    ];

    const text = await deps.ai.chat(SU_QUESTION_TASK, messages, { json: true });
    let raw: unknown;
    try {
      raw = parseAiJson(text);
    } catch (e) {
      throw new ValidationError([(e as Error).message]);
    }
    const list = (raw as { questions?: unknown })?.questions;
    if (!Array.isArray(list) || list.length === 0) {
      throw new ValidationError(['AI không trả về mảng "questions" hợp lệ']);
    }

    const placeIds = new Set(places.map((p) => p.id));
    const items: DraftedSuQuestion[] = [];
    const rejected: { index: number; issues: string[] }[] = [];

    for (const [idx, rawItem] of list.entries()) {
      const obj = rawItem && typeof rawItem === "object" ? (rawItem as Record<string, unknown>) : {};
      const parsed = HistoryQuestionSchema.safeParse({
        ...obj,
        suType: req.suType,
        grade: req.grade,
        topic: req.topic,
        level: req.level,
      });
      if (!parsed.success) {
        rejected.push({ index: idx + 1, issues: parsed.error.issues.map((i) => `${i.path.join(".") || "gốc"}: ${i.message}`) });
        continue;
      }
      const q = parsed.data;
      if (q.suType === "doc_luoc_do") {
        const badPlaces = [
          ...q.placeIds.filter((id) => !placeIds.has(id)),
          ...q.arrows.flatMap((a) => [a.from, a.to].filter((id) => !placeIds.has(id))),
        ];
        if (badPlaces.length > 0) {
          rejected.push({ index: idx + 1, issues: [`Mã địa danh không thuộc bộ dữ liệu: ${[...new Set(badPlaces)].join(", ")}`] });
          continue;
        }
      }

      // Tự động rút claims bổ sung nếu câu đọc lược đồ chưa ghi đủ place claims
      const claims: HistoryClaim[] = [...q.claims];
      if (q.suType === "doc_luoc_do") {
        for (const pid of q.placeIds) {
          if (!claims.some((c) => c.kind === "place" && c.placeId === pid)) {
            const p = findPlaceById(places, pid);
            if (p) claims.push({ kind: "place", placeId: p.id, name: p.ten });
          }
        }
      }
      const verification = await verifyClaims(claims, { orgId: actor.orgId, kbId: req.kbId });

      let bankQuestionId: string | undefined;
      if (req.save && verification.status !== "mismatch") {
        const bankQ = toBankQuestion(q);
        const saved = await deps.bank.addQuestion(actor, bankQ);
        bankQuestionId = saved.id;
      }
      items.push({ question: q, verification, ...(bankQuestionId && { bankQuestionId }) });
    }

    return { items, rejected };
  }

  return {
    listPlaces,
    getTimeline,
    verifyClaims,
    draftQuestions,
    wikidataStats: () => wikidata.stats(),
  };
}

export type SuService = ReturnType<typeof createSuService>;
