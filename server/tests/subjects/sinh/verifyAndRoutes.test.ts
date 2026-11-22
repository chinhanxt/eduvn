import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/http/app";
import type { Ai } from "../../../src/services/ai";
import {
  SAMPLE_SINH_QUESTIONS,
  draftAndVerifySinhQuestions,
  gradeSinhQuestion,
  mismatchNoteSinh,
  verifySinhClaims,
} from "../../../src/subjects/sinh";
import { testDb } from "../../helpers/db";

describe("verify & questions & routes — tự kiểm Sinh học và API phòng lab", () => {
  it("verifySinhClaims trả về status='verified' khi toàn bộ số liệu di truyền, phân bào, ADN, dịch mã, tháp năng lượng đều khớp", () => {
    const v = verifySinhClaims([
      { type: "mendel", p1: "AaBb", p2: "AaBb", expectPhenotypeRatio: "9:3:3:1", expectGenotypeCount: 9, expectGenotypeProb: { genotype: "AaBb", prob: "1/4" } },
      { type: "cell_division", twoN: 8, phase: "ki_sau", expectChromosomes: 16, expectChromatids: 0, expectCentromeres: 16, expectState: "don" },
      { type: "dna", input: { lengthAngstrom: 5100, hydrogenBonds: 3900 }, expect: { N: 3000, A: 600, G: 900, turns: 150 } },
      { type: "translation", templateDna3to5: "TACAAAGGGATT", expectMrna: "AUGUUUCCCUAA", expectChainCode3: "Met-Phe-Pro", expectRawAminoAcidCount: 3, expectPeptideBonds: 2 },
      { type: "energy_pyramid", levels: [10000, 1000, 100, 10], efficiency: 0.1, toleranceRel: 0.01 },
      { type: "grade_level", grade: 9, text: "Phép lai 1 cặp tính trạng đậu Hà Lan Aa x Aa cho tỉ lệ 3:1", isUniversity: false },
    ]);
    expect(v.status).toBe("verified");
    expect(v.details.every((d) => d.ok === true)).toBe(true);
  });

  it("verifySinhClaims bắt chính xác sai lệch tỉ lệ lai, sai số crômatit, sai chuỗi axit amin và sai tháp năng lượng", () => {
    const v = verifySinhClaims([
      { type: "mendel", p1: "Aa", p2: "Aa", expectPhenotypeRatio: "2:1" },
      { type: "cell_division", twoN: 8, phase: "ki_sau", expectChromatids: 16 },
      { type: "translation", mrna5to3: "AUGUUUCCCUAA", expectChainCode3: "Met-Leu-Pro" },
      { type: "energy_pyramid", levels: [10000, 5000], efficiency: 0.1, toleranceRel: 0.01 },
    ]);
    expect(v.status).toBe("mismatch");
    expect(v.details.filter((d) => d.ok === false)).toHaveLength(4);
    const note = mismatchNoteSinh(v);
    expect(note).toContain("3 : 1");
    expect(note).toContain("0");
    expect(note).toContain("Met-Phe-Pro");
  });

  it("verifySinhClaims chặn kiến thức đại học/vượt cấp lọt vào KHTN lớp 6–9 nhưng cho phép ở bậc đại học", () => {
    const thcsBad = verifySinhClaims([
      { type: "grade_level", grade: 8, text: "Phân tích điều hoà operon trp và di truyền biểu sinh epigenetics", isUniversity: false },
    ]);
    expect(thcsBad.status).toBe("mismatch");

    const uniOk = verifySinhClaims([
      { type: "grade_level", grade: 8, text: "Phân tích điều hoà operon trp và di truyền biểu sinh epigenetics", isUniversity: true },
    ]);
    expect(uniOk.status).toBe("verified");
  });

  it("bộ 4 dạng câu hỏi mẫu Sinh học đều hợp lệ QuestionInput và đạt huy hiệu Đã kiểm", () => {
    expect(SAMPLE_SINH_QUESTIONS).toHaveLength(4);
    for (const item of SAMPLE_SINH_QUESTIONS) {
      expect(item.verification.status).toBe("verified");
      expect(item.question.subject).toBe("Sinh học");
      expect(item.question.tags.some((t) => t.startsWith("sinh:"))).toBe(true);
    }
  });

  it("gradeSinhQuestion chấm tất định câu trả lời tỉ lệ và xác suất", () => {
    const q = SAMPLE_SINH_QUESTIONS[0]!.question;
    expect(gradeSinhQuestion(q, "75% : 25%", { expectedRatioParts: [3, 1] })).toEqual({ correct: true, score: 0.25 });
    expect(gradeSinhQuestion(q, "3/4 : 1/4", { expectedRatioParts: [3, 1] })).toEqual({ correct: true, score: 0.25 });
    expect(gradeSinhQuestion(q, "1:1", { expectedRatioParts: [3, 1] })).toEqual({ correct: false, score: 0 });
  });

  it("draftAndVerifySinhQuestions tự yêu cầu AI sửa lại khi lần đầu AI tính sai liên kết hiđrô", async () => {
    let calls = 0;
    const fakeAi: Ai = {
      async chat(_task, msgs) {
        calls++;
        if (calls === 1) {
          return JSON.stringify({
            items: [
              {
                question: {
                  type: "short_answer",
                  subject: "Sinh học",
                  grade: 12,
                  topic: "ADN",
                  level: "TH",
                  stem: "Gen có N = 2400, A = 600. Tính H.",
                  answer: "2900",
                },
                checks: [{ type: "dna", input: { N: 2400, A: 600 }, expect: { hydrogenBonds: 2900 } }],
              },
            ],
          });
        }
        // Lần 2 AI thấy phản hồi sai lệch 3000 từ server và tự sửa
        expect(msgs[msgs.length - 1]!.content).toContain("3000");
        return JSON.stringify({
          items: [
            {
              question: {
                type: "short_answer",
                subject: "Sinh học",
                grade: 12,
                topic: "ADN",
                level: "TH",
                stem: "Gen có N = 2400, A = 600. Tính H.",
                answer: "3000",
              },
              checks: [{ type: "dna", input: { N: 2400, A: 600 }, expect: { hydrogenBonds: 3000 } }],
            },
          ],
        });
      },
      async *stream() {},
    };

    const res = await draftAndVerifySinhQuestions(fakeAi, {
      kind: "tinh_toan_adn_gen",
      grade: 12,
      topic: "Cấu trúc ADN",
      level: "TH",
      count: 1,
    });
    expect(calls).toBe(2);
    expect(res.rejected).toHaveLength(0);
    expect(res.items[0]?.verification.status).toBe("verified");
    expect(res.items[0]?.question.type).toBe("short_answer");
  });

  it("các endpoint HTTP /api/sinh/* hoạt động đúng trên Fastify + PGlite", async () => {
    const db = await testDb();
    const app = buildApp({
      db,
      verify: async () => ({ sub: "u1", email: "t@edu.vn", name: "GV Sinh" }),
      issuer: "http://test",
      publicUrl: "http://test",
      downloadSecret: "secret-secret-secret-secret-secret-32",
      studentSecret: "student-secret-student-secret-32!!",
    });

    const rLai = await app.inject({ method: "POST", url: "/api/sinh/lai", payload: { p1: "Aa", p2: "Aa", dominance: "complete" } });
    expect(rLai.statusCode).toBe(200);
    expect(rLai.json().result.phenotypeRatioText).toBe("3 : 1");
    expect(rLai.json().verification.status).toBe("verified");

    const rPb = await app.inject({ method: "POST", url: "/api/sinh/phan-bao", payload: { twoN: 4, division: "nguyen_phan", phase: "ki_sau" } });
    expect(rPb.statusCode).toBe(200);
    expect(rPb.json().current).toMatchObject({ chromosomes: 8, chromatids: 0, centromeres: 8 });
    expect(rPb.json().timeline).toHaveLength(6);

    const rAdn = await app.inject({ method: "POST", url: "/api/sinh/adn", payload: { lengthAngstrom: 4080, A: 600 } });
    expect(rAdn.statusCode).toBe(200);
    expect(rAdn.json().result).toMatchObject({ N: 2400, G: 600, hydrogenBonds: 3000 });

    const rDm = await app.inject({ method: "POST", url: "/api/sinh/dich-ma", payload: { templateDna3to5: "TACAAAGGGATT" } });
    expect(rDm.statusCode).toBe(200);
    expect(rDm.json().translation.chainCode3).toBe("Met-Phe-Pro");

    const rMau = await app.inject({ method: "GET", url: "/api/sinh/mau" });
    expect(rMau.statusCode).toBe(200);
    expect(rMau.json().questions).toHaveLength(4);

    await app.close();
  });
});
