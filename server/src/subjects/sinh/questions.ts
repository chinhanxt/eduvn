/** Bốn dạng câu hỏi đặc thù môn Sinh học (CTGDPT 2018) tương thích schema QuestionInput sẵn có
 *  (server/src/domain/question.ts), kèm prompt AI soạn câu và cơ chế tự kiểm tất định trước khi lưu. */
import { z } from "zod";
import { type Level, type QuestionInput, QuestionInput as QuestionSchema, type QuestionType } from "../../domain/question";
import type { Verification } from "../../domain/solution";
import { scoreItem } from "../../domain/scoring";
import { type Ai, type AiMessage, parseAiJson } from "../../services/ai";
import { gradeProbabilityAnswer, gradeRatioAnswer, reduceFrac } from "./mendel";
import { type SinhCheck, SinhCheckSchema, mismatchNoteSinh, verifySinhClaims } from "./verify";

export const SINH_QUESTION_KINDS = [
  "bai_tap_di_truyen",
  "doc_so_do_chu_trinh",
  "xac_dinh_ki_phan_bao",
  "tinh_toan_adn_gen",
] as const;

export type SinhQuestionKind = (typeof SINH_QUESTION_KINDS)[number];

export const SINH_KIND_META: Record<
  SinhQuestionKind,
  { ten: string; moTa: string; dangMacDinh: QuestionType; lopPhuHop: [number, number] }
> = {
  bai_tap_di_truyen: {
    ten: "Bài tập di truyền (chấm tất định theo tỉ lệ)",
    moTa: "Phép lai Mendel 1/2/nhiều cặp gen, trội không hoàn toàn, liên kết giới tính; đáp án dạng tỉ lệ (3:1, 1:2:1, 9:3:3:1) hoặc xác suất (3/16, 25%).",
    dangMacDinh: "short_answer",
    lopPhuHop: [9, 12],
  },
  doc_so_do_chu_trinh: {
    ten: "Đọc sơ đồ / chu trình sinh học",
    moTa: "Đọc hiểu sơ đồ lưới thức ăn, tháp năng lượng, cấu tạo tế bào, hệ cơ quan, chu trình Krebs/Calvin/nitơ/nước.",
    dangMacDinh: "mcq",
    lopPhuHop: [6, 12],
  },
  xac_dinh_ki_phan_bao: {
    ten: "Xác định kì phân bào",
    moTa: "Dựa vào số NST, trạng thái đơn/kép, số crômatit, tâm động hoặc diễn biến hình thái để xác định kì nguyên phân/giảm phân.",
    dangMacDinh: "mcq",
    lopPhuHop: [9, 12],
  },
  tinh_toan_adn_gen: {
    ten: "Tính toán ADN / gen / dịch mã",
    moTa: "Tính số nuclêôtit, chiều dài L, số liên kết hiđrô H, chu kì xoắn, trình tự mARN và số axit amin theo bảng mã di truyền chuẩn.",
    dangMacDinh: "short_answer",
    lopPhuHop: [9, 12],
  },
};

export type VerifiedSinhQuestion = {
  kind: SinhQuestionKind;
  question: QuestionInput;
  checks: SinhCheck[];
  verification: Verification;
};

/** Chấm tất định câu hỏi Sinh học: hỗ trợ đặc biệt đáp án tỉ lệ (vd "3:1", "75%:25%", "9:3:3:1")
 *  và xác suất phân số/phần trăm cho dạng bai_tap_di_truyen, ngoài cơ chế scoreItem tiêu chuẩn. */
export function gradeSinhQuestion(
  q: QuestionInput,
  response: number | (boolean | null)[] | string | null | undefined,
  opts: { expectedRatioParts?: number[]; expectedProbability?: { num: number; den: number }; orderMatters?: boolean } = {},
): { correct: boolean; score: number | null } {
  if (q.type === "short_answer" && typeof response === "string") {
    if (opts.expectedRatioParts && opts.expectedRatioParts.length >= 2) {
      const ok = gradeRatioAnswer(response, opts.expectedRatioParts, { orderMatters: opts.orderMatters ?? false });
      return { correct: ok, score: ok ? 0.25 : 0 };
    }
    if (opts.expectedProbability) {
      const ok = gradeProbabilityAnswer(response, reduceFrac(opts.expectedProbability.num, opts.expectedProbability.den));
      return { correct: ok, score: ok ? 0.25 : 0 };
    }
  }
  const sc = scoreItem(q, response);
  return { correct: sc !== null && sc > 0, score: sc };
}

// ——— Prompt AI soạn câu hỏi Sinh học theo CTGDPT 2018 ———

export type SinhQuestionDraftRequest = {
  kind: SinhQuestionKind;
  grade: number;
  topic: string;
  level: Level;
  type?: QuestionType;
  count?: number;
  isUniversity?: boolean;
};

export function buildSinhQuestionPrompt(req: SinhQuestionDraftRequest): { system: string; user: string } {
  const meta = SINH_KIND_META[req.kind];
  const qType = req.type ?? meta.dangMacDinh;
  const gradeGuard =
    req.grade <= 9 && !req.isUniversity
      ? `LƯU Ý CẤP LỚP BẮT BUỘC: Đang soạn cho Khoa học tự nhiên lớp ${req.grade} (THCS, CTGDPT 2018). TUYỆT ĐỐI KHÔNG đưa kiến thức THPT/đại học (không operon trp, không chu trình Krebs/Calvin chi tiết, không Hardy-Weinberg, không epigenetics, không spliceosome). Dùng thuật ngữ giản dị, chính xác SGK KHTN ${req.grade}.`
      : `Soạn cho Sinh học lớp ${req.grade} theo CTGDPT 2018. Dùng thuật ngữ chuẩn SGK 2018 (DNA/ADN, mRNA/mARN, nucleotide, gene/gen, allele/alen).`;

  const system = [
    "Bạn là giáo viên Sinh học giỏi, soạn câu hỏi cho ngân hàng đề EDUVN theo CTGDPT 2018 và CV 7991.",
    gradeGuard,
    "Hình giải phẫu/cơ thể nếu mô tả chỉ dùng sơ đồ nét học thuật, không mô tả gây khó chịu.",
    "QUAN TRỌNG VỀ TỰ KIỂM: Mọi bài tập có tính toán (tỉ lệ lai Mendel, số NST/crômatit/tâm động, số nu/liên kết H/chiều dài ADN, dịch mã) BẮT BUỘC kèm mảng `checks` theo cấu trúc để máy chủ tự tính lại tất định (AI không tự chấm mình).",
    "Các kiểu `checks` hợp lệ:",
    '- mendel: {"type":"mendel","p1":"Aa","p2":"Aa","dominance":"complete","expectPhenotypeRatio":"3:1","expectGenotypeRatio":"1:2:1"}',
    '- cell_division: {"type":"cell_division","twoN":8,"phase":"ki_sau","expectChromosomes":16,"expectChromatids":0,"expectCentromeres":16}',
    '- dna: {"type":"dna","input":{"N":2400,"A":600},"expect":{"G":600,"hydrogenBonds":3000,"lengthAngstrom":4080}}',
    '- translation: {"type":"translation","templateDna3to5":"TACAAAGGGATT","expectMrna":"AUGUUUCCCUAA","expectChainCode3":"Met-Phe-Pro","expectRawAminoAcidCount":3}',
    '- energy_pyramid: {"type":"energy_pyramid","levels":[10000,1000,100],"efficiency":0.1}',
    'Chỉ trả về ĐÚNG 1 đối tượng JSON (không markdown ngoài): {"items": [{"question": { ...QuestionInput }, "checks": [ ...SinhCheck ]}]}',
    "Trong `question`: `subject`=\"Sinh học\", `grade`, `topic`, `level` (NB|TH|VD), `type` (mcq|true_false|short_answer|essay), `stem`, `explanation`, `tags` (luôn có tag \"sinh:<kind>\"). Với `short_answer` dạng tỉ lệ, ghi nhiều cách viết tách bởi `|` như \"3:1|3 : 1|75%:25%\".",
  ].join("\n");

  const user = [
    `Dạng câu Sinh học: ${req.kind} (${meta.ten}).`,
    `Mô tả dạng: ${meta.moTa}`,
    `Lớp: ${req.grade} · Chủ đề: ${req.topic} · Mức độ: ${req.level} · Dạng đề: ${qType} · Số câu: ${req.count ?? 2}.`,
    "Trả JSON đúng cấu trúc đã quy định.",
  ].join("\n");

  return { system, user };
}

const DraftOutputSchema = z.object({
  items: z
    .array(
      z.object({
        question: z.record(z.string(), z.unknown()),
        checks: z.array(SinhCheckSchema).default([]),
      }),
    )
    .min(1),
});

/** Gọi cổng AI soạn câu hỏi Sinh học và tự kiểm tất định từng câu (tự yêu cầu AI sửa 1 lần nếu lệch số liệu). */
export async function draftAndVerifySinhQuestions(
  ai: Ai,
  req: SinhQuestionDraftRequest,
  taskName = "sinh_cau_hoi",
): Promise<{ items: VerifiedSinhQuestion[]; rejected: { index: number; issues: string[] }[] }> {
  const { system, user } = buildSinhQuestionPrompt(req);
  const messages: AiMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  let verifiedItems: VerifiedSinhQuestion[] = [];
  let rejected: { index: number; issues: string[] }[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const rawText = await ai.chat(taskName, messages, { json: true });
    let parsed: z.infer<typeof DraftOutputSchema>;
    try {
      parsed = DraftOutputSchema.parse(parseAiJson(rawText));
    } catch (e) {
      messages.push(
        { role: "assistant", content: rawText },
        { role: "user", content: `JSON chưa đúng cấu trúc: ${(e as Error).message}. Hãy sửa và trả lại đúng JSON.` },
      );
      continue;
    }

    verifiedItems = [];
    rejected = [];
    const repairHints: string[] = [];

    parsed.items.forEach((it, idx) => {
      const qRaw = {
        ...it.question,
        subject: "Sinh học",
        grade: req.grade,
        topic: req.topic,
        level: req.level,
        tags: [...new Set([...(Array.isArray(it.question.tags) ? (it.question.tags as string[]) : []), `sinh:${req.kind}`])],
      };
      const qParsed = QuestionSchema.safeParse(qRaw);
      if (!qParsed.success) {
        const issues = qParsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`);
        rejected.push({ index: idx + 1, issues });
        repairHints.push(`Câu ${idx + 1}: ${issues.join("; ")}`);
        return;
      }

      const fullText = [
        qParsed.data.stem,
        qParsed.data.explanation ?? "",
        qParsed.data.type === "mcq" ? qParsed.data.options.join(" ") : "",
        qParsed.data.type === "true_false" ? qParsed.data.statements.join(" ") : "",
      ].join(" ");

      const checks: SinhCheck[] = [
        ...it.checks,
        { type: "grade_level", grade: req.grade, text: fullText, isUniversity: req.isUniversity ?? false },
      ];
      const verification = verifySinhClaims(checks);
      if (verification.status === "mismatch") {
        const note = mismatchNoteSinh(verification);
        rejected.push({ index: idx + 1, issues: [note] });
        repairHints.push(`Câu ${idx + 1} sai số liệu kiểm chứng:\n${note}`);
      }
      verifiedItems.push({ kind: req.kind, question: qParsed.data, checks, verification });
    });

    if (repairHints.length === 0) break;
    if (attempt === 0) {
      messages.push(
        { role: "assistant", content: rawText },
        { role: "user", content: `Máy chủ tự kiểm phát hiện lỗi:\n${repairHints.join("\n")}\nSửa đúng số liệu và trả lại toàn bộ JSON.` },
      );
    }
  }

  return { items: verifiedItems, rejected };
}

// ——— Bộ câu hỏi mẫu 4 dạng đặc thù đã tự kiểm tất định 100% ———

const RAW_SAMPLE_SINH_QUESTIONS: { kind: SinhQuestionKind; question: QuestionInput; checks: SinhCheck[] }[] = [
  {
    kind: "bai_tap_di_truyen",
    question: {
      type: "short_answer",
      subject: "Sinh học",
      grade: 9,
      topic: "Quy luật phân li của Mendel",
      level: "TH",
      stem: "Ở đậu Hà Lan, alen $A$ quy định hạt vàng trội hoàn toàn so với alen $a$ quy định hạt xanh. Khi cho hai cây dị hợp tử lai với nhau ($Aa \\times Aa$), tỉ lệ kiểu hình hạt vàng : hạt xanh ở đời con $F_1$ là bao nhiêu? (Viết dạng $a:b$)",
      answer: "3:1|3 : 1|75%:25%",
      explanation: "P: $Aa \\times Aa \\rightarrow G_P$: ($1/2 A : 1/2 a$) $\\times$ ($1/2 A : 1/2 a$). $F_1$: $1/4 AA : 2/4 Aa : 1/4 aa$ → tỉ lệ kiểu hình 3 hạt vàng : 1 hạt xanh.",
      tags: ["sinh:bai_tap_di_truyen", "yccd: Quy luật phân li"],
    },
    checks: [
      { type: "mendel", p1: "Aa", p2: "Aa", dominance: "complete", expectGenotypeRatio: "1:2:1", expectPhenotypeRatio: "3:1" },
      { type: "grade_level", grade: 9, text: "đậu Hà Lan alen A hạt vàng trội hoàn toàn Aa x Aa tỉ lệ kiểu hình 3:1", isUniversity: false },
    ],
  },
  {
    kind: "doc_so_do_chu_trinh",
    question: {
      type: "mcq",
      subject: "Sinh học",
      grade: 12,
      topic: "Lưới thức ăn và tháp năng lượng",
      level: "TH",
      stem: "Trong một hệ sinh thái đồng cỏ, sinh vật sản xuất (cỏ) tích luỹ được $10\\,000\\ \\text{kcal}$. Giả sử hiệu suất sinh thái qua mỗi bậc dinh dưỡng là $10\\%$, năng lượng chuyển lên sinh vật tiêu thụ bậc 2 (rắn) là bao nhiêu?",
      options: ["$100\\ \\text{kcal}$", "$1\\,000\\ \\text{kcal}$", "$10\\ \\text{kcal}$", "$500\\ \\text{kcal}$"],
      answer: 0,
      explanation: "Bậc 1 (cỏ): $10\\,000\\ \\text{kcal}$ → Bậc 2 (châu chấu, tiêu thụ bậc 1): $1\\,000\\ \\text{kcal}$ → Bậc 3 (rắn, tiêu thụ bậc 2): $100\\ \\text{kcal}$.",
      tags: ["sinh:doc_so_do_chu_trinh", "yccd: Dòng năng lượng trong hệ sinh thái"],
    },
    checks: [
      { type: "energy_pyramid", levels: [10000, 1000, 100], efficiency: 0.1, toleranceRel: 0.01 },
      { type: "grade_level", grade: 12, text: "lưới thức ăn tháp năng lượng 10000 kcal 1000 kcal 100 kcal", isUniversity: false },
    ],
  },
  {
    kind: "xac_dinh_ki_phan_bao",
    question: {
      type: "mcq",
      subject: "Sinh học",
      grade: 10,
      topic: "Chu kì tế bào và nguyên phân",
      level: "TH",
      stem: "Quan sát một tế bào sinh dưỡng của ruồi giấm ($2n = 8$) đang nguyên phân thấy trong tế bào có $16$ nhiễm sắc thể đơn đang phân li về hai cực và $0$ crômatit. Tế bào đang ở kì nào?",
      options: ["Kì đầu", "Kì giữa", "Kì sau", "Kì cuối"],
      answer: 2,
      explanation: "Ở kì sau nguyên phân, các crômatit chị em tách nhau ở tâm động tạo $4n = 16$ NST đơn, $0$ crômatit và $16$ tâm động.",
      tags: ["sinh:xac_dinh_ki_phan_bao", "yccd: Diễn biến nguyên phân"],
    },
    checks: [
      { type: "cell_division", twoN: 8, phase: "ki_sau", expectChromosomes: 16, expectChromatids: 0, expectCentromeres: 16, expectState: "don" },
      { type: "grade_level", grade: 10, text: "ruồi giấm 2n = 8 nguyên phân kì sau 16 NST đơn 0 crômatit", isUniversity: false },
    ],
  },
  {
    kind: "tinh_toan_adn_gen",
    question: {
      type: "short_answer",
      subject: "Sinh học",
      grade: 12,
      topic: "Cấu trúc ADN và liên kết hiđrô",
      level: "VD",
      stem: "Một đoạn gen có chiều dài $L = 4\\,080\\ \\text{Å}$ và số nuclêôtit loại $A = 600$. Tính tổng số liên kết hiđrô ($H$) của đoạn gen đó.",
      answer: "3000",
      explanation: "$N = 2L / 3{,}4 = 2\\,400$ nuclêôtit. $G = N/2 - A = 1\\,200 - 600 = 600$. Tổng liên kết hiđrô $H = 2A + 3G = 1\\,200 + 1\\,800 = 3\\,000$.",
      tags: ["sinh:tinh_toan_adn_gen", "yccd: Cấu trúc phân tử ADN"],
    },
    checks: [
      { type: "dna", input: { lengthAngstrom: 4080, A: 600 }, expect: { N: 2400, G: 600, hydrogenBonds: 3000 } },
      { type: "grade_level", grade: 12, text: "đoạn gen chiều dài 4080 A số nu A 600 liên kết hiđrô 3000", isUniversity: false },
    ],
  },
];

export const SAMPLE_SINH_QUESTIONS: VerifiedSinhQuestion[] = RAW_SAMPLE_SINH_QUESTIONS.map((entry) => ({
  kind: entry.kind,
  question: QuestionSchema.parse(entry.question),
  checks: entry.checks,
  verification: verifySinhClaims(entry.checks),
}));
