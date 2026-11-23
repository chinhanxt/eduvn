// server/src/subjects/su/timeline.ts — mô hình dữ liệu sự kiện kiểu TimelineJS mở rộng cho môn Lịch sử EDUVN
// (diễn biến bản đồ, mũi tên theo đợt, nhân vật, nguồn Wikidata/SGK CTGDPT 2018). Thuần, không I/O.
import { z } from "zod";
import { foldVi } from "../../domain/tutorSearch";

export const TimelineDateSchema = z.object({
  year: z.number().int().min(-3000).max(2100),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  display_date: z.string().trim().min(1).max(80).optional(),
});
export type TimelineDate = z.infer<typeof TimelineDateSchema>;

export const EventSourceSchema = z.object({
  kind: z.enum(["wikidata", "sgk", "tai-lieu-gv"]),
  label: z.string().trim().min(1).max(200),
  qid: z.string().regex(/^Q\d+$/).optional(),
  url: z.string().url().optional(),
});
export type EventSource = z.infer<typeof EventSourceSchema>;

export const CampaignArrowSchema = z.object({
  from: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  to: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  via: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  kind: z.enum(["tien-cong", "rut-lui", "bao-vay", "tiep-van"]).default("tien-cong"),
  label: z.string().trim().max(80).optional(),
});
export type CampaignArrow = z.infer<typeof CampaignArrowSchema>;

export const CampaignPhaseSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1).max(120),
  dateRange: z.string().trim().min(1).max(60),
  summary: z.string().trim().min(1).max(400),
  placeIds: z.array(z.string()).default([]),
  arrows: z.array(CampaignArrowSchema).default([]),
  liberatedIds: z.array(z.string()).default([]),
});
export type CampaignPhase = z.infer<typeof CampaignPhaseSchema>;

export const HistoricalFigureSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(120),
  lifespan: z.string().trim().min(1).max(40),
  birthYear: z.number().int().optional(),
  deathYear: z.number().int().optional(),
  role: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(400),
  quote: z.string().trim().max(260).optional(),
  wikidataQid: z.string().regex(/^Q\d+$/),
  portrait: z.object({
    kind: z.enum(["monogram", "public_domain", "cc"]),
    monogram: z.string().min(1).max(4),
    credit: z.string().trim().min(1).max(200),
    license: z.string().trim().min(1).max(80),
    assetPath: z.string().optional(),
  }),
});
export type HistoricalFigure = z.infer<typeof HistoricalFigureSchema>;

export const HistoricalEraSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  start_date: TimelineDateSchema,
  end_date: TimelineDateSchema,
  text: z.object({ headline: z.string().trim().min(1).max(120), text: z.string().trim().max(300).optional() }),
  colorToken: z.enum(["lam", "lucLam", "xanhLa", "tim", "doSon", "vangDam", "hong"]),
});
export type HistoricalEra = z.infer<typeof HistoricalEraSchema>;

export const HistoricalEventSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  start_date: TimelineDateSchema,
  end_date: TimelineDateSchema.optional(),
  text: z.object({
    headline: z.string().trim().min(1).max(140),
    text: z.string().trim().min(1).max(600),
  }),
  group: z.string().trim().min(1).max(80),
  era_id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  grade: z.number().int().min(4).max(12),
  importance: z.number().int().min(1).max(3).default(2),
  mapFocus: z.enum(["vietnam", "tay-bac", "dien-bien-phu", "bac-bo", "trung-bo", "nam-bo"]).default("vietnam"),
  location_ids: z.array(z.string()).min(1),
  figure_ids: z.array(z.string()).default([]),
  phases: z.array(CampaignPhaseSchema).default([]),
  causes: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  significance: z.string().trim().max(500).optional(),
  wikidata_qid: z.string().regex(/^Q\d+$/).optional(),
  sources: z.array(EventSourceSchema).min(1),
});
export type HistoricalEvent = z.infer<typeof HistoricalEventSchema>;

/** Chuyển TimelineDate sang năm thập phân (dùng để đặt đúng tỉ lệ thật trên trục thời gian). */
export function decimalYear(d: TimelineDate): number {
  const m = (d.month ?? 1) - 1;
  const day = (d.day ?? 1) - 1;
  return Math.round((d.year + m / 12 + day / 365) * 1000) / 1000;
}

/** Danh mục nhân vật lịch sử tiêu biểu CTGDPT 2018 (đối chiếu QID + năm sinh/mất trên Wikidata). */
export const HISTORICAL_FIGURES: readonly HistoricalFigure[] = [
  {
    id: "ngo-quyen",
    name: "Ngô Quyền",
    lifespan: "897–944",
    birthYear: 897,
    deathYear: 944,
    role: "Vị vua mở đầu thời kỳ độc lập tự chủ lâu dài",
    summary: "Lãnh đạo trận quyết chiến Bạch Đằng năm 938 đánh tan quân Nam Hán, lên ngôi vua năm 939, đóng đô ở Cổ Loa.",
    wikidataQid: "Q699904",
    portrait: {
      kind: "monogram",
      monogram: "NQ",
      credit: "Huy hiệu học thuật EDUVN (không dùng chân dung phỏng đoán)",
      license: "CC0 (EDUVN)",
    },
  },
  {
    id: "ly-thuong-kiet",
    name: "Lý Thường Kiệt",
    lifespan: "1019–1105",
    birthYear: 1019,
    deathYear: 1105,
    role: "Thái uý nhà Lý, tổng chỉ huy kháng chiến chống Tống (1075–1077)",
    summary: "Thực hiện chủ trương 'tiên phát chế nhân' và xây dựng phòng tuyến sông Như Nguyệt, đánh bại quân Tống năm 1077.",
    quote: "Nam quốc sơn hà Nam đế cư — Tiệt nhiên định phận tại thiên thư.",
    wikidataQid: "Q702734",
    portrait: {
      kind: "monogram",
      monogram: "TK",
      credit: "Huy hiệu học thuật EDUVN (không dùng chân dung phỏng đoán)",
      license: "CC0 (EDUVN)",
    },
  },
  {
    id: "tran-hung-dao",
    name: "Trần Quốc Tuấn (Trần Hưng Đạo)",
    lifespan: "1228–1300",
    birthYear: 1228,
    deathYear: 1300,
    role: "Quốc công Tiết chế thống lĩnh quân đội nhà Trần",
    summary: "Tổng chỉ huy hai cuộc kháng chiến chống quân Nguyên năm 1285 và 1287–1288, tác giả Hịch tướng sĩ và Binh thư yếu lược.",
    quote: "Khoan thư sức dân để làm kế sâu rễ bền gốc, đó là thượng sách giữ nước.",
    wikidataQid: "Q511375",
    portrait: {
      kind: "monogram",
      monogram: "HĐ",
      credit: "Huy hiệu học thuật EDUVN (không dùng chân dung phỏng đoán)",
      license: "CC0 (EDUVN)",
    },
  },
  {
    id: "le-loi",
    name: "Lê Lợi (Lê Thái Tổ)",
    lifespan: "1384–1433",
    birthYear: 1384,
    deathYear: 1433,
    role: "Lãnh tụ khởi nghĩa Lam Sơn, vị vua sáng lập triều Lê sơ",
    summary: "Dựng cờ khởi nghĩa tại Lam Sơn (1418), lãnh đạo cuộc chiến tranh giải phóng dân tộc kéo dài 10 năm đánh đuổi quân Minh.",
    wikidataQid: "Q1195391",
    portrait: {
      kind: "monogram",
      monogram: "LL",
      credit: "Huy hiệu học thuật EDUVN (không dùng chân dung phỏng đoán)",
      license: "CC0 (EDUVN)",
    },
  },
  {
    id: "nguyen-trai",
    name: "Nguyễn Trãi",
    lifespan: "1380–1442",
    birthYear: 1380,
    deathYear: 1442,
    role: "Nhà chính trị, nhà quân sự, nhà văn hoá lớn thế kỷ XV",
    summary: "Cố vấn chiến lược trong khởi nghĩa Lam Sơn với tư tưởng 'lấy đại nghĩa thắng hung tàn', tác giả Bình Ngô đại cáo (1428).",
    quote: "Đem đại nghĩa để thắng hung tàn, lấy chí nhân để thay cường bạo.",
    wikidataQid: "Q1347181",
    portrait: {
      kind: "monogram",
      monogram: "NT",
      credit: "Huy hiệu học thuật EDUVN (không dùng chân dung phỏng đoán)",
      license: "CC0 (EDUVN)",
    },
  },
  {
    id: "quang-trung",
    name: "Nguyễn Huệ (Hoàng đế Quang Trung)",
    lifespan: "1752–1792",
    birthYear: 1752,
    deathYear: 1792,
    role: "Lãnh tụ phong trào Tây Sơn, anh hùng dân tộc",
    summary: "Chỉ huy chiến thắng Rạch Gầm – Xoài Mút (1785) đánh tan quân Xiêm và cuộc hành quân thần tốc đại phá quân Thanh ở Ngọc Hồi – Đống Đa (Xuân 1789).",
    wikidataQid: "Q379775",
    portrait: {
      kind: "monogram",
      monogram: "QT",
      credit: "Huy hiệu học thuật EDUVN (không dùng chân dung phỏng đoán)",
      license: "CC0 (EDUVN)",
    },
  },
  {
    id: "ho-chi-minh",
    name: "Hồ Chí Minh",
    lifespan: "1890–1969",
    birthYear: 1890,
    deathYear: 1969,
    role: "Chủ tịch nước Việt Nam Dân chủ Cộng hoà, lãnh tụ cách mạng Việt Nam",
    summary: "Sáng lập Đảng Cộng sản Việt Nam (1930), đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình ngày 2/9/1945, lãnh đạo hai cuộc kháng chiến bảo vệ độc lập dân tộc.",
    quote: "Không có gì quý hơn độc lập, tự do.",
    wikidataQid: "Q36014",
    portrait: {
      kind: "monogram",
      monogram: "CM",
      credit: "Huy hiệu học thuật EDUVN · Hồ sơ Wikidata Q36014",
      license: "CC0 (EDUVN)",
    },
  },
  {
    id: "vo-nguyen-giap",
    name: "Đại tướng Võ Nguyên Giáp",
    lifespan: "1911–2013",
    birthYear: 1911,
    deathYear: 2013,
    role: "Tổng Tư lệnh Quân đội nhân dân Việt Nam",
    summary: "Chỉ huy trưởng Chiến dịch Điện Biên Phủ (1954) với quyết định lịch sử chuyển từ 'đánh nhanh thắng nhanh' sang 'đánh chắc tiến chắc', chỉ đạo Chiến dịch Hồ Chí Minh (1975).",
    quote: "Chuyển sang đánh chắc, tiến chắc để bảo đảm chắc thắng.",
    wikidataQid: "Q179910",
    portrait: {
      kind: "monogram",
      monogram: "VG",
      credit: "Huy hiệu học thuật EDUVN · Hồ sơ Wikidata Q179910",
      license: "CC0 (EDUVN)",
    },
  },
];

export const HISTORICAL_ERAS: readonly HistoricalEra[] = [
  {
    id: "doc-lap-phong-kien",
    start_date: { year: 938 },
    end_date: { year: 1858 },
    text: { headline: "Kỷ nguyên độc lập tự chủ (938–1858)", text: "Xây dựng và bảo vệ quốc gia Đại Việt – Việt Nam qua các triều đại." },
    colorToken: "lam",
  },
  {
    id: "chong-thuc-dan-can-dai",
    start_date: { year: 1858 },
    end_date: { year: 1945, month: 8 },
    text: { headline: "Chống thực dân Pháp & vận động giải phóng dân tộc (1858–1945)" },
    colorToken: "vangDam",
  },
  {
    id: "khang-chien-chong-phap",
    start_date: { year: 1945, month: 8 },
    end_date: { year: 1954, month: 7 },
    text: { headline: "Cách mạng tháng Tám & Kháng chiến chống Pháp (1945–1954)" },
    colorToken: "doSon",
  },
  {
    id: "khang-chien-chong-my",
    start_date: { year: 1954, month: 7 },
    end_date: { year: 1975, month: 4, day: 30 },
    text: { headline: "Kháng chiến chống Mỹ, cứu nước (1954–1975)" },
    colorToken: "tim",
  },
  {
    id: "thong-nhat-doi-moi",
    start_date: { year: 1975, month: 5 },
    end_date: { year: 2025 },
    text: { headline: "Thống nhất đất nước & Công cuộc Đổi mới (1975–nay)" },
    colorToken: "xanhLa",
  },
];

export const HISTORICAL_EVENTS: readonly HistoricalEvent[] = [
  {
    id: "bach-dang-938",
    start_date: { year: 938, display_date: "Cuối năm 938" },
    text: {
      headline: "Chiến thắng Bạch Đằng năm 938",
      text: "Ngô Quyền chỉ huy quân dân ta bố trí trận địa cọc gỗ đầu bịt sắt, lợi dụng thuỷ triều lên xuống đánh tan thuỷ quân Nam Hán do Lưu Hoằng Tháo chỉ huy.",
    },
    group: "Chống ngoại xâm thời phong kiến",
    era_id: "doc-lap-phong-kien",
    grade: 6,
    importance: 3,
    mapFocus: "bac-bo",
    location_ids: ["bach-dang", "co-loa"],
    figure_ids: ["ngo-quyen"],
    phases: [
      {
        id: "p1",
        title: "Dụ địch vào trận địa cọc khi triều lên",
        dateRange: "Cuối 938",
        summary: "Thuyền nhẹ của quân ta khiêu chiến rồi giả thua rút vào trong cửa sông Bạch Đằng khi nước triều đang dâng cao che kín bãi cọc.",
        placeIds: ["bach-dang"],
        arrows: [{ from: "hai-phong", to: "bach-dang", kind: "tien-cong", label: "Nhử địch khi triều lên" }],
        liberatedIds: [],
      },
      {
        id: "p2",
        title: "Phản công khi triều rút",
        dateRange: "Cuối 938",
        summary: "Nước triều rút mạnh, thuyền chiến Nam Hán va vào cọc gỗ bịt sắt, quân ta đồng loạt phản công đánh tan hoàn toàn đạo quân xâm lược.",
        placeIds: ["bach-dang", "co-loa"],
        arrows: [{ from: "bach-dang", to: "co-loa", kind: "tiep-van", label: "Mở kỷ nguyên độc lập, định đô Cổ Loa (939)" }],
        liberatedIds: ["bach-dang", "co-loa"],
      },
    ],
    causes: ["Nhà Nam Hán nhân lúc Kiều Công Tiễn cầu cứu đã cử Hoằng Tháo đưa thuỷ quân xâm lược nước ta."],
    outcomes: ["Quân Nam Hán đại bại, Hoằng Tháo tử trận; năm 939 Ngô Quyền xưng vương, đóng đô ở Cổ Loa."],
    significance: "Chấm dứt hoàn toàn hơn 1.000 năm Bắc thuộc, mở ra kỷ nguyên độc lập, tự chủ lâu dài của dân tộc Việt Nam.",
    wikidata_qid: "Q2890760",
    sources: [
      { kind: "wikidata", qid: "Q2890760", label: "Trận Bạch Đằng (938)", url: "https://www.wikidata.org/wiki/Q2890760" },
      { kind: "sgk", label: "SGK Lịch sử và Địa lí 6 (CTGDPT 2018)" },
    ],
  },
  {
    id: "nhu-nguyet-1077",
    start_date: { year: 1077, display_date: "Đầu năm 1077" },
    text: {
      headline: "Chiến thắng phòng tuyến sông Như Nguyệt",
      text: "Lý Thường Kiệt xây dựng phòng tuyến kiên cố dọc bờ nam sông Như Nguyệt (sông Cầu), chặn đứng 10 vạn quân Tống rồi bất ngờ vượt sông tập kích, kết thúc thắng lợi cuộc kháng chiến.",
    },
    group: "Chống ngoại xâm thời phong kiến",
    era_id: "doc-lap-phong-kien",
    grade: 7,
    importance: 2,
    mapFocus: "bac-bo",
    location_ids: ["nhu-nguyet", "thang-long-ha-noi"],
    figure_ids: ["ly-thuong-kiet"],
    phases: [
      {
        id: "p1",
        title: "Chặn địch tại phòng tuyến sông Như Nguyệt",
        dateRange: "Đầu 1077",
        summary: "Quân nhà Lý giữ vững bờ nam sông Như Nguyệt, bẻ gãy nhiều đợt vượt sông của quân Quách Quỳ.",
        placeIds: ["nhu-nguyet", "thang-long-ha-noi"],
        arrows: [{ from: "lang-son", to: "nhu-nguyet", kind: "rut-lui", label: "Quân Tống bị chặn đứng" }],
        liberatedIds: [],
      },
      {
        id: "p2",
        title: "Vượt sông tập kích & chủ động giảng hoà",
        dateRange: "Xuân 1077",
        summary: "Quân Lý bất ngờ vượt sông đánh vào doanh trại địch trong đêm, sau đó chủ động mở lối giảng hoà buộc quân Tống rút về nước.",
        placeIds: ["nhu-nguyet"],
        arrows: [{ from: "thang-long-ha-noi", to: "nhu-nguyet", kind: "tien-cong", label: "Phản công vượt sông" }],
        liberatedIds: ["nhu-nguyet"],
      },
    ],
    causes: ["Nhà Tống âm mưu xâm lược Đại Việt để giải quyết khủng hoảng nội bộ."],
    outcomes: ["Quân Tống tổn thất nặng nề, buộc phải rút quân; nền độc lập của Đại Việt được giữ vững."],
    significance: "Khẳng định ý chí bảo vệ chủ quyền quốc gia và nghệ thuật quân sự chủ động kết hợp ngoại giao mềm dẻo.",
    wikidata_qid: "Q10829781",
    sources: [
      { kind: "wikidata", qid: "Q10829781", label: "Trận Như Nguyệt", url: "https://www.wikidata.org/wiki/Q10829781" },
      { kind: "sgk", label: "SGK Lịch sử và Địa lí 7 (CTGDPT 2018)" },
    ],
  },
  {
    id: "bach-dang-1288",
    start_date: { year: 1288, month: 4, day: 9, display_date: "Tháng 4/1288" },
    text: {
      headline: "Chiến thắng Bạch Đằng năm 1288",
      text: "Trong cuộc kháng chiến chống Nguyên – Mông lần thứ ba, sau trận Vân Đồn tiêu diệt đoàn thuyền lương Trương Văn Hổ, Trần Hưng Đạo bố trí trận địa cọc trên sông Bạch Đằng tiêu diệt đoàn thuỷ quân Ô Mã Nhi.",
    },
    group: "Chống ngoại xâm thời phong kiến",
    era_id: "doc-lap-phong-kien",
    grade: 7,
    importance: 3,
    mapFocus: "bac-bo",
    location_ids: ["van-don", "bach-dang", "thang-long-ha-noi"],
    figure_ids: ["tran-hung-dao"],
    phases: [
      {
        id: "p1",
        title: "Trận Vân Đồn cắt nguồn lương thảo",
        dateRange: "Đầu 1288",
        summary: "Trần Khánh Dư phục kích tại Vân Đồn, đánh chìm và thu giữ đoàn thuyền lương của Trương Văn Hổ, đẩy quân Nguyên vào thế thiếu lương nghiêm trọng.",
        placeIds: ["van-don"],
        arrows: [{ from: "hai-phong", to: "van-don", kind: "tien-cong", label: "Đánh đoàn thuyền lương" }],
        liberatedIds: ["van-don"],
      },
      {
        id: "p2",
        title: "Quyết chiến trên sông Bạch Đằng",
        dateRange: "Tháng 4/1288",
        summary: "Quân Trần nhử đoàn thuyền Ô Mã Nhi vào bãi cọc khi nước triều rút, bắt sống tướng giặc và chấm dứt hoàn toàn mộng xâm lược của đế quốc Nguyên.",
        placeIds: ["bach-dang", "thang-long-ha-noi"],
        arrows: [{ from: "thang-long-ha-noi", to: "bach-dang", kind: "tien-cong", label: "Bao vây, tiêu diệt thuỷ quân địch" }],
        liberatedIds: ["bach-dang", "thang-long-ha-noi"],
      },
    ],
    causes: ["Quân Nguyên tiến hành xâm lược Đại Việt lần thứ ba với quy mô lớn cả thuỷ lẫn bộ."],
    outcomes: ["Đập tan hoàn toàn ý chí xâm lược của nhà Nguyên, bảo vệ vững chắc độc lập Đại Việt."],
    significance: "Đỉnh cao nghệ thuật quân sự nhà Trần, kết hợp chiến tranh nhân dân và địa hình sông nước.",
    wikidata_qid: "Q1369379",
    sources: [
      { kind: "wikidata", qid: "Q1369379", label: "Trận Bạch Đằng (1288)", url: "https://www.wikidata.org/wiki/Q1369379" },
      { kind: "sgk", label: "SGK Lịch sử 11 (CTGDPT 2018), Chủ đề 4" },
    ],
  },
  {
    id: "khoi-nghia-lam-son-1418",
    start_date: { year: 1418, display_date: "1418" },
    end_date: { year: 1427, display_date: "Cuối năm 1427" },
    text: {
      headline: "Khởi nghĩa Lam Sơn & Chiến thắng Chi Lăng – Xương Giang",
      text: "Từ căn cứ Lam Sơn (Thanh Hoá), Lê Lợi và Nguyễn Trãi lãnh đạo nghĩa quân vượt qua gian khổ, tiến ra Bắc giành thắng lợi Tốt Động – Chúc Động (1426) và Chi Lăng – Xương Giang (1427), khôi phục độc lập dân tộc.",
    },
    group: "Chống ngoại xâm thời phong kiến",
    era_id: "doc-lap-phong-kien",
    grade: 11,
    importance: 3,
    mapFocus: "bac-bo",
    location_ids: ["lam-son", "tot-dong-chuc-dong", "chi-lang", "xuong-giang", "thang-long-ha-noi"],
    figure_ids: ["le-loi", "nguyen-trai"],
    phases: [
      {
        id: "p1",
        title: "Xây dựng căn cứ Lam Sơn & mở rộng vùng giải phóng",
        dateRange: "1418–1425",
        summary: "Nghĩa quân giữ vững lực lượng ở miền núi Thanh Hoá, sau đó tiến vào Nghệ An, giải phóng từ Thanh Hoá đến Thuận Hoá.",
        placeIds: ["lam-son"],
        arrows: [{ from: "lam-son", to: "vinh-nghe-an", kind: "tien-cong", label: "Mở rộng căn cứ vào Nam" }],
        liberatedIds: ["lam-son", "vinh-nghe-an"],
      },
      {
        id: "p2",
        title: "Tốt Động – Chúc Động & Chi Lăng – Xương Giang",
        dateRange: "1426–1427",
        summary: "Đánh tan quân Vương Thông ở Tốt Động – Chúc Động, sau đó phục kích tiêu diệt viện binh Liễu Thăng ở ải Chi Lăng và hạ thành Xương Giang.",
        placeIds: ["tot-dong-chuc-dong", "chi-lang", "xuong-giang", "thang-long-ha-noi"],
        arrows: [
          { from: "lam-son", to: "tot-dong-chuc-dong", kind: "tien-cong", label: "Tiến quân ra Bắc (1426)" },
          { from: "thang-long-ha-noi", to: "chi-lang", kind: "bao-vay", label: "Chặn diệt viện binh Liễu Thăng (10/1427)" },
        ],
        liberatedIds: ["tot-dong-chuc-dong", "chi-lang", "xuong-giang", "thang-long-ha-noi"],
      },
    ],
    causes: ["Ách đô hộ tàn bạo của nhà Minh (1407–1427) làm nhân dân cực khổ, chủ quyền bị xâm phạm."],
    outcomes: ["Quân Minh buộc phải dự Hội thề Đông Quan và rút quân về nước; triều Lê sơ được thành lập năm 1428."],
    significance: "Kết thúc 20 năm đô hộ của nhà Minh, mở ra thời kỳ phát triển thịnh đạt của quốc gia Đại Việt.",
    wikidata_qid: "Q1848807",
    sources: [
      { kind: "wikidata", qid: "Q1848807", label: "Khởi nghĩa Lam Sơn", url: "https://www.wikidata.org/wiki/Q1848807" },
      { kind: "sgk", label: "SGK Lịch sử 11 (CTGDPT 2018), Chủ đề 4" },
    ],
  },
  {
    id: "chu-quyen-bien-dao-tk17",
    start_date: { year: 1650, display_date: "Thế kỷ XVII" },
    end_date: { year: 1836, display_date: "Thế kỷ XIX (1816–1836)" },
    text: {
      headline: "Xác lập và thực thi chủ quyền Hoàng Sa, Trường Sa",
      text: "Từ thế kỷ XVII, các chúa Nguyễn lập đội Hoàng Sa và đội Bắc Hải ra khai thác, đo đạc, kiểm soát hai quần đảo Hoàng Sa và Trường Sa; đến triều Nguyễn (vua Gia Long, Minh Mạng), hoạt động cắm mốc, vẽ bản đồ và bảo vệ chủ quyền tiếp tục được thực thi liên tục.",
    },
    group: "Chủ quyền lãnh thổ & biển đảo",
    era_id: "doc-lap-phong-kien",
    grade: 11,
    importance: 3,
    mapFocus: "vietnam",
    location_ids: ["phu-xuan-hue", "hoi-an", "hoang-sa", "truong-sa"],
    figure_ids: [],
    phases: [
      {
        id: "p1",
        title: "Đội Hoàng Sa và đội Bắc Hải thời chúa Nguyễn",
        dateRange: "Thế kỷ XVII–XVIII",
        summary: "Nhà nước Đàng Trong tổ chức đội Hoàng Sa và đội Bắc Hải định kỳ hằng năm ra Hoàng Sa, Trường Sa thu lượm sản vật, đo đạc hải trình.",
        placeIds: ["phu-xuan-hue", "hoi-an", "hoang-sa", "truong-sa"],
        arrows: [
          { from: "hoi-an", to: "hoang-sa", kind: "tiep-van", label: "Hải trình đội Hoàng Sa" },
          { from: "hoi-an", to: "truong-sa", kind: "tiep-van", label: "Hải trình đội Bắc Hải" },
        ],
        liberatedIds: ["hoang-sa", "truong-sa"],
      },
      {
        id: "p2",
        title: "Đo đạc, cắm mốc và vẽ bản đồ thời triều Nguyễn",
        dateRange: "1816–1836",
        summary: "Triều Nguyễn phái thuỷ quân ra đo đạc thuỷ trình, dựng bia chủ quyền, trồng cây làm dấu và ghi nhận rõ trên Đại Nam nhất thống toàn đồ.",
        placeIds: ["phu-xuan-hue", "hoang-sa", "truong-sa"],
        arrows: [{ from: "phu-xuan-hue", to: "hoang-sa", kind: "tiep-van", label: "Thuỷ quân triều Nguyễn đo đạc" }],
        liberatedIds: ["hoang-sa", "truong-sa"],
      },
    ],
    causes: ["Yêu cầu quản lý vùng biển đảo và khai thác kinh tế biển của Nhà nước Việt Nam."],
    outcomes: ["Xác lập và thực thi chủ quyền liên tục, hoà bình, có ghi chép rõ trong chính sử (Phủ biên tạp lục, Đại Nam thực lục)."],
    significance: "Là cơ sở lịch sử và pháp lý quan trọng khẳng định chủ quyền của Việt Nam đối với quần đảo Hoàng Sa và quần đảo Trường Sa.",
    sources: [
      { kind: "sgk", label: "SGK Lịch sử 11 (CTGDPT 2018), Chủ đề 6: Lịch sử bảo vệ chủ quyền, các quyền và lợi ích hợp pháp của Việt Nam ở Biển Đông" },
      { kind: "wikidata", qid: "Q274388", label: "Quần đảo Hoàng Sa", url: "https://www.wikidata.org/wiki/Q274388" },
      { kind: "wikidata", qid: "Q215664", label: "Quần đảo Trường Sa", url: "https://www.wikidata.org/wiki/Q215664" },
    ],
  },
  {
    id: "ngoc-hoi-dong-da-1789",
    start_date: { year: 1789, month: 1, day: 30, display_date: "Xuân Kỷ Dậu (1789)" },
    text: {
      headline: "Chiến thắng Ngọc Hồi – Đống Đa",
      text: "Sau khi đánh tan quân Xiêm tại Rạch Gầm – Xoài Mút (1785), Nguyễn Huệ lên ngôi Hoàng đế Quang Trung ở Phú Xuân, chỉ huy cuộc hành quân thần tốc ra Bắc, đại phá 29 vạn quân Thanh trong 5 ngày Tết Kỷ Dậu 1789.",
    },
    group: "Chống ngoại xâm thời phong kiến",
    era_id: "doc-lap-phong-kien",
    grade: 8,
    importance: 3,
    mapFocus: "vietnam",
    location_ids: ["tay-son", "phu-xuan-hue", "vinh-nghe-an", "ngoc-hoi-dong-da", "thang-long-ha-noi"],
    figure_ids: ["quang-trung"],
    phases: [
      {
        id: "p1",
        title: "Hành quân thần tốc từ Phú Xuân ra Bắc",
        dateRange: "Cuối 1788 – đầu 1789",
        summary: "Quang Trung xuất quân từ Phú Xuân, tuyển thêm quân ở Nghệ An, Thanh Hoá và chia 5 đạo quân tiến công Thăng Long.",
        placeIds: ["phu-xuan-hue", "vinh-nghe-an", "ngoc-hoi-dong-da"],
        arrows: [
          { from: "phu-xuan-hue", to: "vinh-nghe-an", kind: "tien-cong", label: "Hành quân thần tốc" },
          { from: "vinh-nghe-an", to: "ngoc-hoi-dong-da", kind: "tien-cong", label: "5 đạo quân tiến công" },
        ],
        liberatedIds: [],
      },
      {
        id: "p2",
        title: "Hạ đồn Ngọc Hồi – Đống Đa, giải phóng Thăng Long",
        dateRange: "Mùng 5 Tết Kỷ Dậu (30/1/1789)",
        summary: "Đạo chủ lực hạ đồn Ngọc Hồi, đạo Đô đốc Long đánh đồn Đống Đa; trưa mùng 5 Tết quân Tây Sơn tiến vào giải phóng Thăng Long.",
        placeIds: ["ngoc-hoi-dong-da", "thang-long-ha-noi"],
        arrows: [{ from: "ngoc-hoi-dong-da", to: "thang-long-ha-noi", kind: "tien-cong", label: "Giải phóng Thăng Long" }],
        liberatedIds: ["ngoc-hoi-dong-da", "thang-long-ha-noi"],
      },
    ],
    causes: ["Nhà Thanh mượn cớ giúp Lê Chiêu Thống đã cử Tôn Sĩ Nghị đem 29 vạn quân chiếm đóng Thăng Long."],
    outcomes: ["Quân Thanh đại bại rút chạy về nước, nền độc lập dân tộc được bảo vệ vững chắc."],
    significance: "Biểu tượng của tinh thần quật cường và nghệ thuật hành quân thần tốc, đánh bất ngờ.",
    wikidata_qid: "Q3539853",
    sources: [
      { kind: "wikidata", qid: "Q3539853", label: "Trận Ngọc Hồi – Đống Đa", url: "https://www.wikidata.org/wiki/Q3539853" },
      { kind: "sgk", label: "SGK Lịch sử 11 (CTGDPT 2018), Chủ đề 4" },
    ],
  },
  {
    id: "thanh-lap-dang-1930",
    start_date: { year: 1930, month: 2, day: 3, display_date: "3/2/1930" },
    text: {
      headline: "Thành lập Đảng Cộng sản Việt Nam",
      text: "Nguyễn Ái Quốc chủ trì Hội nghị hợp nhất các tổ chức cộng sản tại Cửu Long (Hương Cảng), thông qua Chính cương vắn tắt, Sách lược vắn tắt — chấm dứt cuộc khủng hoảng về đường lối cứu nước.",
    },
    group: "Vận động giải phóng dân tộc",
    era_id: "chong-thuc-dan-can-dai",
    grade: 9,
    importance: 3,
    mapFocus: "vietnam",
    location_ids: ["ben-nha-rong", "vinh-nghe-an", "thang-long-ha-noi"],
    figure_ids: ["ho-chi-minh"],
    phases: [
      {
        id: "p1",
        title: "Hợp nhất các tổ chức cộng sản & Cao trào 1930–1931",
        dateRange: "1930–1931",
        summary: "Đảng ra đời kịp thời lãnh đạo phong trào cách mạng 1930–1931 mà đỉnh cao là Xô viết Nghệ – Tĩnh.",
        placeIds: ["vinh-nghe-an", "thang-long-ha-noi"],
        arrows: [{ from: "thang-long-ha-noi", to: "vinh-nghe-an", kind: "tiep-van", label: "Cao trào Xô viết Nghệ – Tĩnh" }],
        liberatedIds: ["vinh-nghe-an"],
      },
    ],
    causes: ["Yêu cầu thống nhất phong trào cộng sản ở Việt Nam để lãnh đạo cách mạng giải phóng dân tộc."],
    outcomes: ["Thành lập chính đảng duy nhất với Cương lĩnh chính trị đầu tiên đúng đắn, sáng tạo."],
    significance: "Bước ngoặt vĩ đại trong lịch sử cách mạng Việt Nam, chuẩn bị tất yếu đầu tiên cho các thắng lợi về sau.",
    wikidata_qid: "Q427325",
    sources: [
      { kind: "wikidata", qid: "Q427325", label: "Đảng Cộng sản Việt Nam", url: "https://www.wikidata.org/wiki/Q427325" },
      { kind: "sgk", label: "SGK Lịch sử và Địa lí 9 (CTGDPT 2018)" },
    ],
  },
  {
    id: "cach-mang-thang-tam-1945",
    start_date: { year: 1945, month: 8, day: 14, display_date: "14/8 – 2/9/1945" },
    end_date: { year: 1945, month: 9, day: 2 },
    text: {
      headline: "Cách mạng tháng Tám & Tuyên ngôn Độc lập",
      text: "Chớp thời cơ Nhật đầu hàng Đồng minh, từ căn cứ Tân Trào, nhân dân cả nước tổng khởi nghĩa giành chính quyền chỉ trong 15 ngày (Hà Nội 19/8, Huế 23/8, Sài Gòn 25/8). Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình.",
    },
    group: "Cách mạng tháng Tám 1945",
    era_id: "khang-chien-chong-phap",
    grade: 12,
    importance: 3,
    mapFocus: "vietnam",
    location_ids: ["pac-bo", "tan-trao", "ba-dinh-ha-noi", "phu-xuan-hue", "gia-dinh-sai-gon"],
    figure_ids: ["ho-chi-minh", "vo-nguyen-giap"],
    phases: [
      {
        id: "p1",
        title: "Lệnh Tổng khởi nghĩa từ Tân Trào",
        dateRange: "13–16/8/1945",
        summary: "Đại hội Quốc dân tại Tân Trào tán thành chủ trương Tổng khởi nghĩa và bầu Uỷ ban Dân tộc Giải phóng do Hồ Chí Minh làm Chủ tịch.",
        placeIds: ["tan-trao", "ba-dinh-ha-noi"],
        arrows: [{ from: "tan-trao", to: "ba-dinh-ha-noi", kind: "tien-cong", label: "Tiến về giải phóng Hà Nội (19/8)" }],
        liberatedIds: ["tan-trao", "ba-dinh-ha-noi"],
      },
      {
        id: "p2",
        title: "Giành chính quyền trên cả nước & Khai sinh nước VNDCCH",
        dateRange: "19/8 – 2/9/1945",
        summary: "Giành chính quyền thắng lợi tại Hà Nội (19/8), Huế (23/8), Sài Gòn (25/8); ngày 2/9/1945 tuyên bố thành lập nước Việt Nam Dân chủ Cộng hoà.",
        placeIds: ["ba-dinh-ha-noi", "phu-xuan-hue", "gia-dinh-sai-gon"],
        arrows: [
          { from: "ba-dinh-ha-noi", to: "phu-xuan-hue", kind: "tien-cong", label: "Huế (23/8)" },
          { from: "phu-xuan-hue", to: "gia-dinh-sai-gon", kind: "tien-cong", label: "Sài Gòn (25/8)" },
        ],
        liberatedIds: ["ba-dinh-ha-noi", "phu-xuan-hue", "gia-dinh-sai-gon"],
      },
    ],
    causes: ["Sự chuẩn bị chu đáo suốt 15 năm (1930–1945) kết hợp thời cơ khách quan khi phát xít Nhật đầu hàng Đồng minh (8/1945)."],
    outcomes: ["Lật đổ ách thống trị của thực dân Pháp, phát xít Nhật và chế độ phong kiến; thành lập Nhà nước Việt Nam Dân chủ Cộng hoà."],
    significance: "Mở ra kỷ nguyên mới của dân tộc Việt Nam: kỷ nguyên độc lập, tự do và nhân dân làm chủ đất nước.",
    wikidata_qid: "Q769960",
    sources: [
      { kind: "wikidata", qid: "Q769960", label: "Cách mạng Tháng Tám", url: "https://www.wikidata.org/wiki/Q769960" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3" },
    ],
  },
  {
    id: "bien-gioi-1950",
    start_date: { year: 1950, month: 9, day: 16, display_date: "16/9 – 22/10/1950" },
    end_date: { year: 1950, month: 10, day: 22 },
    text: {
      headline: "Chiến dịch Biên giới thu – đông 1950",
      text: "Quân ta chủ động mở chiến dịch tiến công cụm cứ điểm Đông Khê (16–18/9/1950), cắt đứt Đường số 4, tiêu diệt hai binh đoàn ứng cứu Lơ Pa-giơ và Sác-tông, khai thông biên giới Việt – Trung.",
    },
    group: "Kháng chiến chống Pháp",
    era_id: "khang-chien-chong-phap",
    grade: 12,
    importance: 2,
    mapFocus: "bac-bo",
    location_ids: ["cao-bang", "dong-khe", "that-khe", "lang-son"],
    figure_ids: ["ho-chi-minh", "vo-nguyen-giap"],
    phases: [
      {
        id: "p1",
        title: "Tiêu diệt cứ điểm Đông Khê",
        dateRange: "16–18/9/1950",
        summary: "Quân ta đánh chiếm Đông Khê, chia cắt Cao Bằng với Thất Khê và buộc địch phải rút khỏi Cao Bằng.",
        placeIds: ["dong-khe", "cao-bang", "that-khe"],
        arrows: [
          { from: "viet-bac", to: "dong-khe", kind: "tien-cong", label: "Đánh điểm Đông Khê" },
          { from: "cao-bang", to: "dong-khe", kind: "rut-lui", label: "Địch rút khỏi Cao Bằng" },
        ],
        liberatedIds: ["dong-khe", "cao-bang"],
      },
      {
        id: "p2",
        title: "Diệt viện trên Đường số 4, giải phóng hành lang biên giới",
        dateRange: "1–22/10/1950",
        summary: "Tiêu diệt binh đoàn Lơ Pa-giơ và Sác-tông, địch hoảng loạn rút khỏi Thất Khê, Lạng Sơn; ta giành quyền chủ động trên chiến trường chính Bắc Bộ.",
        placeIds: ["that-khe", "lang-son"],
        arrows: [{ from: "dong-khe", to: "lang-son", kind: "tien-cong", label: "Truy kích dọc Đường số 4" }],
        liberatedIds: ["that-khe", "lang-son"],
      },
    ],
    causes: ["Thực dân Pháp tăng cường phong toả biên giới Việt – Trung theo Kế hoạch Rơ-ve."],
    outcomes: ["Khai thông tuyến biên giới dài 750 km từ Cao Bằng đến Đình Lập, mở rộng căn cứ địa Việt Bắc."],
    significance: "Bước ngoặt đưa cuộc kháng chiến chống Pháp chuyển sang giai đoạn ta giành quyền chủ động chiến lược trên chiến trường Bắc Bộ.",
    wikidata_qid: "Q2748355",
    sources: [
      { kind: "wikidata", qid: "Q2748355", label: "Chiến dịch Biên giới", url: "https://www.wikidata.org/wiki/Q2748355" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3" },
    ],
  },
  {
    id: "dien-bien-phu-1954",
    start_date: { year: 1954, month: 3, day: 13, display_date: "13/3 – 7/5/1954" },
    end_date: { year: 1954, month: 5, day: 7 },
    text: {
      headline: "Chiến dịch Điện Biên Phủ (56 ngày đêm — 3 đợt)",
      text: "Sau khi chuyển phương châm từ 'đánh nhanh thắng nhanh' sang 'đánh chắc tiến chắc', quân và dân ta tiến công tập đoàn cứ điểm Điện Biên Phủ qua 3 đợt liên tiếp, bắt sống tướng Đờ Cát ngày 7/5/1954.",
    },
    group: "Kháng chiến chống Pháp",
    era_id: "khang-chien-chong-phap",
    grade: 12,
    importance: 3,
    mapFocus: "dien-bien-phu",
    location_ids: ["tuan-giao", "muong-phang", "him-lam", "doi-doc-lap", "doi-a1", "muong-thanh", "ham-de-castries", "hong-cum", "dien-bien-phu"],
    figure_ids: ["vo-nguyen-giap", "ho-chi-minh"],
    phases: [
      {
        id: "dot-1",
        title: "Đợt 1: Tiêu diệt phân khu Bắc (Him Lam – Độc Lập – Bản Kéo)",
        dateRange: "13/3 – 17/3/1954",
        summary: "Chiều 13/3/1954 pháo binh ta nổ súng mở màn, tiêu diệt cứ điểm Him Lam, tiếp đó hạ đồi Độc Lập (15/3) và bức hàng Bản Kéo (17/3), mở toang cánh cửa phía Bắc vào lòng chảo.",
        placeIds: ["tuan-giao", "muong-phang", "him-lam", "doi-doc-lap"],
        arrows: [
          { from: "tuan-giao", to: "him-lam", kind: "tien-cong", label: "Đợt 1: Tiêu diệt Him Lam (13/3)" },
          { from: "muong-phang", to: "doi-doc-lap", kind: "tien-cong", label: "Đợt 1: Hạ Đồi Độc Lập (15/3)" },
        ],
        liberatedIds: ["him-lam", "doi-doc-lap"],
      },
      {
        id: "dot-2",
        title: "Đợt 2: Đánh các cao điểm phía Đông & cắt sân bay Mường Thanh",
        dateRange: "30/3 – 26/4/1954",
        summary: "Quân ta đồng loạt tiến công các cứ điểm phía Đông (E1, D1, C1, A1), đào hệ thống giao thông hào bao vây siết chặt, khống chế hoàn toàn sân bay Mường Thanh.",
        placeIds: ["doi-a1", "muong-thanh"],
        arrows: [
          { from: "him-lam", to: "doi-a1", kind: "tien-cong", label: "Đợt 2: Tiến công cao điểm phía Đông (A1)" },
          { from: "doi-doc-lap", to: "muong-thanh", kind: "bao-vay", label: "Cắt đứt sân bay Mường Thanh" },
        ],
        liberatedIds: ["muong-thanh"],
      },
      {
        id: "dot-3",
        title: "Đợt 3: Tổng công kích — Đồi A1 & Hầm Đờ Cát",
        dateRange: "1/5 – 7/5/1954",
        summary: "Đêm 6/5 khối bộc phá trên đồi A1 phát nổ làm hiệu lệnh tổng công kích; 17 giờ 30 ngày 7/5/1954 bắt sống tướng Đờ Cát tại hầm chỉ huy Mường Thanh, sau đó giải phóng Hồng Cúm.",
        placeIds: ["doi-a1", "ham-de-castries", "hong-cum"],
        arrows: [
          { from: "doi-a1", to: "ham-de-castries", kind: "tien-cong", label: "Đợt 3: Đánh thẳng Hầm Đờ Cát (7/5)" },
          { from: "ham-de-castries", to: "hong-cum", kind: "bao-vay", label: "Chặn rút & tiêu diệt Hồng Cúm" },
        ],
        liberatedIds: ["doi-a1", "ham-de-castries", "hong-cum", "dien-bien-phu"],
      },
    ],
    causes: ["Pháp – Mỹ xây dựng Điện Biên Phủ thành tập đoàn cứ điểm mạnh nhất Đông Dương theo Kế hoạch Na-va."],
    outcomes: ["Loại khỏi vòng chiến đấu hơn 16.200 quân địch, bắn rơi và phá huỷ 62 máy bay, bắt sống toàn bộ Bộ chỉ huy tập đoàn cứ điểm."],
    significance: "Đập tan hoàn toàn Kế hoạch Na-va, giáng đòn quyết định buộc thực dân Pháp ký Hiệp định Giơ-ne-vơ (21/7/1954), chấm dứt chiến tranh ở Đông Dương.",
    wikidata_qid: "Q604897",
    sources: [
      { kind: "wikidata", qid: "Q604897", label: "Battle of Dien Bien Phu", url: "https://www.wikidata.org/wiki/Q604897" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3: Cách mạng tháng Tám năm 1945, chiến tranh giải phóng dân tộc và chiến tranh bảo vệ Tổ quốc" },
    ],
  },
  {
    id: "dong-khoi-1960",
    start_date: { year: 1960, month: 1, day: 17, display_date: "1959–1960" },
    text: {
      headline: "Phong trào Đồng khởi (tiêu biểu ở Bến Tre)",
      text: "Bùng nổ mạnh mẽ từ ngày 17/1/1960 tại ba xã Định Thuỷ, Phước Hiệp, Bình Khánh (huyện Mỏ Cày, Bến Tre), lan rộng khắp Nam Bộ, Tây Nguyên và Trung Trung Bộ, chuyển cách mạng miền Nam sang thế tiến công.",
    },
    group: "Kháng chiến chống Mỹ",
    era_id: "khang-chien-chong-my",
    grade: 12,
    importance: 2,
    mapFocus: "nam-bo",
    location_ids: ["ben-tre", "ap-bac", "vi-tuyen-17-hien-luong"],
    figure_ids: [],
    phases: [
      {
        id: "p1",
        title: "Bùng nổ ở Mỏ Cày (Bến Tre) và lan rộng Nam Bộ",
        dateRange: "1/1960 – 12/1960",
        summary: "Quần chúng nổi dậy phá 'ấp chiến lược' sơ khai, làm tan rã bộ máy chính quyền cơ sở địch ở nhiều vùng nông thôn và thành lập Mặt trận Dân tộc Giải phóng miền Nam Việt Nam (20/12/1960).",
        placeIds: ["ben-tre", "ap-bac"],
        arrows: [{ from: "ben-tre", to: "ap-bac", kind: "tien-cong", label: "Lan rộng khắp đồng bằng Nam Bộ" }],
        liberatedIds: ["ben-tre"],
      },
    ],
    causes: ["Chính sách khủng bố, Luật 10/59 của chính quyền Ngô Đình Diệm và Nghị quyết 15 của Trung ương Đảng (1/1959)."],
    outcomes: ["Giáng đòn nặng nề vào chính sách thực dân mới của Mỹ, mở rộng vùng giải phóng nông thôn miền Nam."],
    significance: "Đánh dấu bước phát triển nhảy vọt của cách mạng miền Nam từ thế giữ gìn lực lượng sang thế tiến công.",
    wikidata_qid: "Q10805519",
    sources: [
      { kind: "wikidata", qid: "Q10805519", label: "Phong trào Đồng khởi", url: "https://www.wikidata.org/wiki/Q10805519" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3" },
    ],
  },
  {
    id: "mau-than-1968",
    start_date: { year: 1968, month: 1, day: 30, display_date: "Xuân Mậu Thân 1968" },
    text: {
      headline: "Cuộc Tổng tiến công và nổi dậy Xuân Mậu Thân 1968",
      text: "Quân giải phóng đồng loạt tiến công vào hầu hết các đô thị lớn trên toàn miền Nam (Sài Gòn, Huế, Đà Nẵng…) kết hợp trận nghi binh Khe Sanh, làm lung lay ý chí xâm lược của Mỹ.",
    },
    group: "Kháng chiến chống Mỹ",
    era_id: "khang-chien-chong-my",
    grade: 12,
    importance: 2,
    mapFocus: "vietnam",
    location_ids: ["khe-sanh", "phu-xuan-hue", "ban-dao-son-tra-da-nang", "gia-dinh-sai-gon"],
    figure_ids: ["vo-nguyen-giap"],
    phases: [
      {
        id: "p1",
        title: "Đồng loạt tiến công đô thị toàn miền Nam",
        dateRange: "Đêm 30 rạng 31/1/1968",
        summary: "Mở các mũi tiến công chiến lược từ Khe Sanh đến Huế, Đà Nẵng và trung tâm Sài Gòn.",
        placeIds: ["khe-sanh", "phu-xuan-hue", "gia-dinh-sai-gon"],
        arrows: [
          { from: "khe-sanh", to: "phu-xuan-hue", kind: "tien-cong", label: "Mặt trận Trị – Thiên – Huế" },
          { from: "cu-chi", to: "gia-dinh-sai-gon", kind: "tien-cong", label: "Tiến công trung tâm Sài Gòn" },
        ],
        liberatedIds: [],
      },
    ],
    causes: ["Chiến lược 'Chiến tranh cục bộ' của Mỹ leo thang mạnh nhưng gặp bế tắc."],
    outcomes: ["Buộc Mỹ phải tuyên bố 'phi Mỹ hoá' chiến tranh, ngừng ném bom miền Bắc và ngồi vào bàn đàm phán Pa-ri."],
    significance: "Bước ngoặt lớn của cuộc kháng chiến chống Mỹ, mở ra giai đoạn vừa đánh vừa đàm.",
    wikidata_qid: "Q82542",
    sources: [
      { kind: "wikidata", qid: "Q82542", label: "Sự kiện Tết Mậu Thân", url: "https://www.wikidata.org/wiki/Q82542" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3" },
    ],
  },
  {
    id: "hiep-dinh-paris-1973",
    start_date: { year: 1973, month: 1, day: 27, display_date: "27/1/1973" },
    text: {
      headline: "Ký kết Hiệp định Pa-ri năm 1973",
      text: "Sau thắng lợi cuộc tiến công chiến lược 1972 (Quảng Trị) và trận 'Điện Biên Phủ trên không' cuối năm 1972 ở Hà Nội – Hải Phòng, Hoa Kỳ buộc phải ký Hiệp định Pa-ri ngày 27/1/1973, cam kết tôn trọng độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam, rút hết quân đội nước ngoài.",
    },
    group: "Kháng chiến chống Mỹ",
    era_id: "khang-chien-chong-my",
    grade: 12,
    importance: 2,
    mapFocus: "vietnam",
    location_ids: ["thang-long-ha-noi", "hai-phong", "thanh-co-quang-tri"],
    figure_ids: [],
    phases: [
      {
        id: "p1",
        title: "Từ Thành cổ Quảng Trị & Hà Nội 1972 đến Hiệp định Pa-ri",
        dateRange: "1972 – 27/1/1973",
        summary: "Thắng lợi quân sự quyết định ở hai miền tạo thế vững chắc trên bàn ngoại giao, hoàn thành mục tiêu 'đánh cho Mỹ cút'.",
        placeIds: ["thang-long-ha-noi", "hai-phong", "thanh-co-quang-tri"],
        arrows: [{ from: "thang-long-ha-noi", to: "thanh-co-quang-tri", kind: "tiep-van", label: "Phối hợp chiến trường 1972" }],
        liberatedIds: ["thanh-co-quang-tri"],
      },
    ],
    causes: ["Thất bại của chiến lược 'Việt Nam hoá chiến tranh' và cuộc tập kích B-52 tháng 12/1972."],
    outcomes: ["Quân Mỹ và đồng minh rút khỏi miền Nam Việt Nam (hoàn tất tháng 3/1973)."],
    significance: "Làm thay đổi căn bản so sánh lực lượng có lợi cho cách mạng, tạo thời cơ tiến tới giải phóng hoàn toàn miền Nam.",
    wikidata_qid: "Q696802",
    sources: [
      { kind: "wikidata", qid: "Q696802", label: "Hiệp định Paris 1973", url: "https://www.wikidata.org/wiki/Q696802" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3" },
    ],
  },
  {
    id: "dai-thang-mua-xuan-1975",
    start_date: { year: 1975, month: 3, day: 4, display_date: "4/3 – 30/4/1975" },
    end_date: { year: 1975, month: 4, day: 30 },
    text: {
      headline: "Đại thắng mùa Xuân 1975 & Chiến dịch Hồ Chí Minh",
      text: "Qua ba chiến dịch lớn nối tiếp — Tây Nguyên (mở màn Buôn Ma Thuột 10/3), Huế – Đà Nẵng (cuối tháng 3) và Chiến dịch Hồ Chí Minh (26–30/4/1975) cùng chiến dịch giải phóng quần đảo Trường Sa (4/1975) — quân dân ta giải phóng hoàn toàn miền Nam, thống nhất đất nước.",
    },
    group: "Kháng chiến chống Mỹ",
    era_id: "khang-chien-chong-my",
    grade: 12,
    importance: 3,
    mapFocus: "vietnam",
    location_ids: ["buon-ma-thuot", "pleiku", "phu-xuan-hue", "ban-dao-son-tra-da-nang", "xuan-loc", "dinh-doc-lap", "truong-sa"],
    figure_ids: ["vo-nguyen-giap"],
    phases: [
      {
        id: "cd-tay-nguyen",
        title: "Chiến dịch Tây Nguyên (4/3 – 24/3/1975)",
        dateRange: "4/3 – 24/3/1975",
        summary: "Đòn điểm huyệt bất ngờ giải phóng Buôn Ma Thuột (10–11/3), khiến hệ thống phòng thủ Tây Nguyên tan rã nhanh chóng.",
        placeIds: ["buon-ma-thuot", "pleiku", "nha-trang"],
        arrows: [
          { from: "pleiku", to: "buon-ma-thuot", kind: "tien-cong", label: "Điểm huyệt Buôn Ma Thuột (10/3)" },
          { from: "buon-ma-thuot", to: "nha-trang", kind: "tien-cong", label: "Phát triển xuống duyên hải Nam Trung Bộ" },
        ],
        liberatedIds: ["buon-ma-thuot", "pleiku"],
      },
      {
        id: "cd-hue-da-nang",
        title: "Chiến dịch Huế – Đà Nẵng (21/3 – 29/3/1975)",
        dateRange: "21/3 – 29/3/1975",
        summary: "Giải phóng thành phố Huế (26/3) và căn cứ liên hợp Đà Nẵng (29/3), đồng thời hải quân ta tiến ra giải phóng các đảo thuộc quần đảo Trường Sa trong tháng 4/1975.",
        placeIds: ["phu-xuan-hue", "ban-dao-son-tra-da-nang", "truong-sa"],
        arrows: [
          { from: "thanh-co-quang-tri", to: "phu-xuan-hue", kind: "tien-cong", label: "Giải phóng Huế (26/3)" },
          { from: "phu-xuan-hue", to: "ban-dao-son-tra-da-nang", kind: "tien-cong", label: "Giải phóng Đà Nẵng (29/3)" },
          { from: "ban-dao-son-tra-da-nang", to: "truong-sa", kind: "tien-cong", label: "Giải phóng QĐ. Trường Sa (4/1975)" },
        ],
        liberatedIds: ["phu-xuan-hue", "ban-dao-son-tra-da-nang", "truong-sa"],
      },
      {
        id: "cd-ho-chi-minh",
        title: "Chiến dịch Hồ Chí Minh (26/4 – 30/4/1975)",
        dateRange: "26/4 – 30/4/1975",
        summary: "Chọc thủng tuyến phòng thủ Xuân Lộc, 5 cánh quân hợp vây tiến vào trung tâm Sài Gòn; 11 giờ 30 ngày 30/4/1975 lá cờ giải phóng tung bay trên nóc Dinh Độc Lập.",
        placeIds: ["xuan-loc", "cu-chi", "dinh-doc-lap", "gia-dinh-sai-gon"],
        arrows: [
          { from: "xuan-loc", to: "dinh-doc-lap", kind: "tien-cong", label: "Cánh quân phía Đông tiến vào Dinh Độc Lập" },
          { from: "cu-chi", to: "dinh-doc-lap", kind: "tien-cong", label: "Cánh quân Tây Bắc hợp vây Sài Gòn" },
        ],
        liberatedIds: ["xuan-loc", "dinh-doc-lap", "gia-dinh-sai-gon"],
      },
    ],
    causes: ["Tương quan lực lượng nghiêng hẳn về cách mạng sau Hiệp định Pa-ri 1973 và chiến thắng Đường 14 – Phước Long (1/1975)."],
    outcomes: ["Giải phóng hoàn toàn miền Nam, chấm dứt 21 năm đất nước bị chia cắt."],
    significance: "Kết thúc thắng lợi 30 năm chiến tranh giải phóng dân tộc (1945–1975), mở ra kỷ nguyên cả nước độc lập, thống nhất đi lên chủ nghĩa xã hội.",
    wikidata_qid: "Q25418140",
    sources: [
      { kind: "wikidata", qid: "Q25418140", label: "Chiến dịch Hồ Chí Minh", url: "https://www.wikidata.org/wiki/Q25418140" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3" },
    ],
  },
  {
    id: "doi-moi-1986",
    start_date: { year: 1986, month: 12, display_date: "Tháng 12/1986" },
    text: {
      headline: "Đại hội VI — Khởi xướng công cuộc Đổi mới",
      text: "Đại hội đại biểu toàn quốc lần thứ VI của Đảng họp tại Hà Nội (12/1986) đề ra đường lối Đổi mới toàn diện, chuyển sang kinh tế hàng hoá nhiều thành phần và mở rộng hội nhập quốc tế.",
    },
    group: "Đổi mới & hội nhập",
    era_id: "thong-nhat-doi-moi",
    grade: 12,
    importance: 3,
    mapFocus: "vietnam",
    location_ids: ["thang-long-ha-noi", "gia-dinh-sai-gon", "hoang-sa", "truong-sa"],
    figure_ids: [],
    phases: [
      {
        id: "p1",
        title: "Khởi xướng Đổi mới toàn diện từ 1986",
        dateRange: "1986 – nay",
        summary: "Đổi mới kinh tế gắn với ổn định chính trị, hội nhập khu vực (ASEAN 1995) và toàn cầu (WTO 2007), giữ vững độc lập chủ quyền toàn vẹn lãnh thổ và biển đảo.",
        placeIds: ["thang-long-ha-noi", "gia-dinh-sai-gon", "hoang-sa", "truong-sa"],
        arrows: [],
        liberatedIds: [],
      },
    ],
    causes: ["Khủng hoảng kinh tế – xã hội cuối thập niên 1970 – đầu thập niên 1980 đòi hỏi đổi mới tư duy phát triển."],
    outcomes: ["Đưa đất nước thoát khỏi khủng hoảng, tăng trưởng ổn định, nâng cao vị thế quốc tế của Việt Nam."],
    significance: "Mở ra giai đoạn phát triển mới, hiện đại hoá và hội nhập sâu rộng của Việt Nam.",
    wikidata_qid: "Q342587",
    sources: [
      { kind: "wikidata", qid: "Q342587", label: "Đổi Mới", url: "https://www.wikidata.org/wiki/Q342587" },
      { kind: "sgk", label: "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 4: Công cuộc Đổi mới ở Việt Nam từ năm 1986 đến nay" },
    ],
  },
];

export type TimelineFilter = {
  era?: string;
  grade?: number;
  q?: string;
};

/** Lọc sự kiện dòng thời gian theo thời kỳ, khối lớp, hoặc từ khoá tiếng Việt không dấu. */
export function filterTimelineEvents(events: readonly HistoricalEvent[], f: TimelineFilter = {}): HistoricalEvent[] {
  const needle = f.q ? foldVi(f.q.trim()) : "";
  return events.filter((ev) => {
    if (f.era && ev.era_id !== f.era) return false;
    if (f.grade !== undefined && ev.grade !== f.grade) return false;
    if (needle) {
      const hay = foldVi(`${ev.text.headline} ${ev.text.text} ${ev.group} ${ev.start_date.display_date ?? ev.start_date.year}`);
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}
