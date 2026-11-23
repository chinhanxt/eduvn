import { describe, expect, it } from "vitest";
import { solveDna } from "../../../src/subjects/sinh/dnaCalc";

describe("dnaCalc — tính số nucleotide, liên kết hiđrô, chiều dài gen", () => {
  it("giải đầy đủ từ tổng N = 2400 và A = 600", () => {
    const r = solveDna({ N: 2400, A: 600 });
    expect(r).toMatchObject({
      N: 2400,
      A: 600,
      T: 600,
      G: 600,
      C: 600,
      pctA: 25,
      pctT: 25,
      pctG: 25,
      pctC: 25,
      lengthAngstrom: 4080,
      lengthNm: 408,
      turns: 120,
      mass: 720000,
      hydrogenBonds: 3000,
      covalentBetween: 2398,
      covalentTotal: 4798,
    });
  });

  it("giải từ chiều dài L = 5100 Å và số liên kết hiđrô H = 3900", () => {
    const r = solveDna({ lengthAngstrom: 5100, hydrogenBonds: 3900 });
    expect(r).toMatchObject({ N: 3000, A: 600, T: 600, G: 900, C: 900, pctA: 20, pctG: 30, turns: 150 });
  });

  it("giải từ chiều dài theo nm (L = 408 nm) và %A = 20%", () => {
    const r = solveDna({ lengthNm: 408, pctA: 20 });
    expect(r).toMatchObject({ N: 2400, A: 480, G: 720, hydrogenBonds: 3120 });
  });

  it("giải từ số chu kì xoắn (C = 150) và %G = 30%", () => {
    const r = solveDna({ turns: 150, pctG: 30 });
    expect(r).toMatchObject({ N: 3000, A: 600, G: 900, hydrogenBonds: 3900, lengthAngstrom: 5100 });
  });

  it("giải từ khối lượng phân tử M = 900 000 đvC và A = 600", () => {
    const r = solveDna({ mass: 900000, A: 600 });
    expect(r).toMatchObject({ N: 3000, G: 900, hydrogenBonds: 3900 });
  });

  it("giải từ liên kết hiđrô H = 3900 và %A = 20%", () => {
    const r = solveDna({ hydrogenBonds: 3900, pctA: 20 });
    expect(r).toMatchObject({ N: 3000, A: 600, G: 900, lengthAngstrom: 5100 });
  });

  it("giải từ trình tự 1 mạch đơn ADN (hỗ trợ cả X và C) và tính chi tiết từng mạch", () => {
    const r = solveDna({ sequence: "5'-ATG XGG TTA C-3'" });
    expect(r.N).toBe(20);
    expect(r.strand).toEqual({ A1: 2, T1: 3, G1: 3, C1: 2, A2: 3, T2: 2, G2: 2, C2: 3 });
    expect(r.A).toBe(5);
    expect(r.G).toBe(5);
    expect(r.hydrogenBonds).toBe(25);
    expect(r.lengthAngstrom).toBe(34);
  });

  it("tính đúng số nuclêôtit môi trường cung cấp và liên kết H bị phá vỡ sau k = 3 lần nhân đôi", () => {
    const r = solveDna({ N: 2400, A: 480, replications: 3 });
    expect(r.replication).toEqual({
      k: 3,
      dnaCopies: 8,
      envN: 16800,
      envA: 3360,
      envT: 3360,
      envG: 5040,
      envC: 5040,
      hydrogenBondsBroken: 21840,
    });
  });

  it("phát hiện dữ kiện mâu thuẫn hoặc vô lí sinh học", () => {
    expect(() => solveDna({ A: 400, T: 500 })).toThrow(/A \(400\) phải bằng T \(500\)/);
    expect(() => solveDna({ pctA: 30, pctG: 30 })).toThrow(/50%/);
    expect(() => solveDna({ N: 2400, hydrogenBonds: 5000 })).toThrow(/không âm/);
    expect(() => solveDna({ N: 2400 })).toThrow(/Thiếu dữ kiện/);
  });
});
