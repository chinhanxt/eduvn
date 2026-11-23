import { describe, expect, it } from "vitest";
import {
  GENETIC_CODE,
  expressGeneFromTemplate,
  transcribeFromCoding,
  transcribeFromTemplate,
  translateMrna,
} from "../../../src/subjects/sinh/geneticCode";

describe("geneticCode — bảng mã di truyền, phiên mã & dịch mã", () => {
  it("bảng mã di truyền chuẩn có đủ đúng 64 bộ ba, 3 mã kết thúc và 1 mã mở đầu AUG", () => {
    const keys = Object.keys(GENETIC_CODE);
    expect(keys).toHaveLength(64);
    const stops = keys.filter((k) => GENETIC_CODE[k]!.isStop);
    expect(stops.sort()).toEqual(["UAA", "UAG", "UGA"]);
    expect(GENETIC_CODE["AUG"]).toMatchObject({ code3: "Met", code1: "M", isStart: true });
  });

  it("phiên mã từ mạch khuôn ADN 3'→5' sang mARN 5'→3' đúng nguyên tắc bổ sung", () => {
    const res = transcribeFromTemplate("3'-TAC AAA GGG CAT ATT-5'");
    expect(res.templateDna3to5).toBe("TACAAAGGGCATATT");
    expect(res.codingDna5to3).toBe("ATGTTTCCCGTATAA");
    expect(res.mrna5to3).toBe("AUGUUUCCCGUAUAA");
    expect(res.codons).toEqual(["AUG", "UUU", "CCC", "GUA", "UAA"]);
    expect(res.anticodons3to5).toEqual(["UAC", "AAA", "GGG", "CAU", "AUU"]);
  });

  it("hỗ trợ kí hiệu truyền thống X (Xitôzin) và chuyển đổi nhất quán với C (SGK 2018)", () => {
    const r2018 = transcribeFromTemplate("TAX-GGG-XAT", "2018");
    const rOld = transcribeFromTemplate("TAC-GGG-CAT", "truyen_thong");
    expect(r2018.mrna5to3).toBe("AUGCCCGUA");
    expect(rOld.mrna5to3).toBe("AUGXXXGUA");
  });

  it("phiên mã từ mạch mã hoá 5'→3' cho kết quả khớp mạch khuôn", () => {
    const r = transcribeFromCoding("5'-ATG TTT CCC TAA-3'");
    expect(r.templateDna3to5).toBe("TACAAAGGGATT");
    expect(r.mrna5to3).toBe("AUGUUUCCCUAA");
  });

  it("dịch mã chuẩn bỏ qua vùng 5'UTR trước AUG và dừng ngay tại bộ ba kết thúc UAA", () => {
    const tr = translateMrna("5'-CCAA AUG UUU GGC CUG UAA GGG AAA-3'");
    expect(tr.startIndex).toBe(4);
    expect(tr.stopCodon).toBe("UAA");
    expect(tr.chainCode3).toBe("Met-Phe-Gly-Leu");
    expect(tr.chainCode1).toBe("MFGL");
    expect(tr.rawAminoAcidCount).toBe(4);
    expect(tr.matureAminoAcidCount).toBe(3);
    expect(tr.peptideBonds).toBe(3);
    expect(tr.maturePeptideBonds).toBe(2);
    expect(tr.tRnaCount).toBe(4);
  });

  it("dừng đúng ở cả UAG và UGA, không tính bộ ba kết thúc vào axit amin", () => {
    expect(translateMrna("AUGUGGUAGUUU")).toMatchObject({ chainCode3: "Met-Trp", stopCodon: "UAG", rawAminoAcidCount: 2 });
    expect(translateMrna("AUGUGCGGAUGAUUU")).toMatchObject({ chainCode3: "Met-Cys-Gly", stopCodon: "UGA", rawAminoAcidCount: 3 });
  });

  it("biểu hiện gen liên hoàn từ ADN khuôn → mARN → chuỗi axit amin", () => {
    const { transcription, translation } = expressGeneFromTemplate("3'-TAC TTC GGA CCG ACT-5'");
    expect(transcription.mrna5to3).toBe("AUGAAGCCUGGCUGA");
    expect(translation.chainCode3).toBe("Met-Lys-Pro-Gly");
    expect(translation.stopCodon).toBe("UGA");
    expect(translation.rawAminoAcidCount).toBe(4);
    expect(translation.matureAminoAcidCount).toBe(3);
  });

  it("hỗ trợ dịch mã từ đầu khung đọc khi requireStartCodon=false và xử lý mARN không có AUG", () => {
    const noStart = translateMrna("UUUUUCUUA");
    expect(noStart.startIndex).toBe(-1);
    expect(noStart.rawAminoAcidCount).toBe(0);

    const frame0 = translateMrna("UUUUUCUUA", { requireStartCodon: false });
    expect(frame0.chainCode3).toBe("Phe-Phe-Leu");
    expect(frame0.rawAminoAcidCount).toBe(3);
  });

  it("báo lỗi rõ ràng khi gặp kí tự không hợp lệ trong ADN hoặc mARN", () => {
    expect(() => transcribeFromTemplate("AUGCCC")).toThrow(/không hợp lệ.*U/);
    expect(() => translateMrna("ATGCCC")).toThrow(/không hợp lệ.*T/);
  });
});
