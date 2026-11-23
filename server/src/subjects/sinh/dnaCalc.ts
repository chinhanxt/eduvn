/** Tính toán cấu trúc ADN / gen theo công thức chuẩn SGK Sinh học Việt Nam (CTGDPT 2018).
 *  Số nuclêôtit (N, A, T, G, C/X), tỉ lệ %, chiều dài L (Å & nm), số chu kì xoắn, khối lượng M,
 *  số liên kết hiđrô H, liên kết hoá trị, và số nu môi trường cung cấp khi nhân đôi k lần. Thuần, không I/O. */
import { normalizeDnaSequence } from "./geneticCode";

export type DnaInput = {
  /** Chuỗi 1 mạch ADN (nếu nhập trực tiếp trình tự, vd "ATGCGT...") */
  sequence?: string;
  /** Tổng số nuclêôtit N */
  N?: number;
  /** Số nu loại A (bằng T) */
  A?: number;
  /** Số nu loại T (bằng A) */
  T?: number;
  /** Số nu loại G (bằng C/X) */
  G?: number;
  /** Số nu loại C hoặc X (bằng G) */
  C?: number;
  /** Tỉ lệ % loại A (0 < pctA < 50) */
  pctA?: number;
  /** Tỉ lệ % loại G (0 < pctG < 50) */
  pctG?: number;
  /** Chiều dài gen tính bằng Ăngstrong (Å): L = (N/2) * 3,4 */
  lengthAngstrom?: number;
  /** Chiều dài gen tính bằng nanômét (nm): 1 nm = 10 Å */
  lengthNm?: number;
  /** Số chu kì xoắn: C_xoắn = N / 20 */
  turns?: number;
  /** Khối lượng phân tử (đvC / Da): M = N * 300 */
  mass?: number;
  /** Số liên kết hiđrô: H = 2A + 3G */
  hydrogenBonds?: number;
  /** Số lần nhân đôi ADN (tính nhu cầu nuclêôtit môi trường) */
  replications?: number;
};

export type StrandCounts = {
  A1: number;
  T1: number;
  G1: number;
  C1: number;
  A2: number;
  T2: number;
  G2: number;
  C2: number;
};

export type DnaReplicationStats = {
  k: number;
  dnaCopies: number;
  envN: number;
  envA: number;
  envT: number;
  envG: number;
  envC: number;
  hydrogenBondsBroken: number;
};

export type DnaResult = {
  N: number;
  A: number;
  T: number;
  G: number;
  C: number;
  pctA: number;
  pctT: number;
  pctG: number;
  pctC: number;
  /** Chiều dài gen (Å) */
  lengthAngstrom: number;
  /** Chiều dài gen (nm) */
  lengthNm: number;
  /** Số chu kì xoắn (N / 20) */
  turns: number;
  /** Khối lượng phân tử (đvC) = N × 300 */
  mass: number;
  /** Số liên kết hiđrô = 2A + 3G */
  hydrogenBonds: number;
  /** Số liên kết hoá trị giữa các nuclêôtit trên 2 mạch = N − 2 */
  covalentBetween: number;
  /** Tổng số liên kết hoá trị trong phân tử ADN = 2N − 2 */
  covalentTotal: number;
  strand?: StrandCounts;
  replication?: DnaReplicationStats;
};

const round2 = (x: number) => Math.round(x * 100) / 100;
const closeInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-6;

/** Giải tất định toàn bộ thông số ADN/gen từ tập dữ kiện đầu vào bất kỳ đủ điều kiện. */
export function solveDna(input: DnaInput): DnaResult {
  let A: number | undefined = input.A ?? input.T;
  let G: number | undefined = input.G ?? input.C;
  let N: number | undefined = input.N;
  let strand: StrandCounts | undefined;

  if (input.A !== undefined && input.T !== undefined && input.A !== input.T) {
    throw new Error(`Theo nguyên tắc bổ sung trong ADN mạch kép, A (${input.A}) phải bằng T (${input.T})`);
  }
  if (input.G !== undefined && input.C !== undefined && input.G !== input.C) {
    throw new Error(`Theo nguyên tắc bổ sung trong ADN mạch kép, G (${input.G}) phải bằng C/X (${input.C})`);
  }

  // Trường hợp 1: nhập trực tiếp chuỗi 1 mạch đơn
  if (input.sequence !== undefined) {
    const seq = normalizeDnaSequence(input.sequence);
    let A1 = 0, T1 = 0, G1 = 0, C1 = 0;
    for (const ch of seq) {
      if (ch === "A") A1++;
      else if (ch === "T") T1++;
      else if (ch === "G") G1++;
      else C1++;
    }
    const A2 = T1, T2 = A1, G2 = C1, C2 = G1;
    strand = { A1, T1, G1, C1, A2, T2, G2, C2 };
    A = A1 + A2;
    G = G1 + G2;
    N = 2 * seq.length;
  }

  // Suy N từ chiều dài / chu kì xoắn / khối lượng
  if (input.lengthAngstrom !== undefined) {
    const fromL = (input.lengthAngstrom / 3.4) * 2;
    if (!closeInt(fromL)) throw new Error(`Chiều dài L = ${input.lengthAngstrom} Å không cho số nuclêôtit nguyên`);
    const nL = Math.round(fromL);
    if (N !== undefined && N !== nL) throw new Error(`N (${N}) mâu thuẫn với chiều dài L = ${input.lengthAngstrom} Å (suy ra N = ${nL})`);
    N = nL;
  }
  if (input.lengthNm !== undefined) {
    const fromNm = ((input.lengthNm * 10) / 3.4) * 2;
    if (!closeInt(fromNm)) throw new Error(`Chiều dài L = ${input.lengthNm} nm không cho số nuclêôtit nguyên`);
    const nNm = Math.round(fromNm);
    if (N !== undefined && N !== nNm) throw new Error(`N (${N}) mâu thuẫn với chiều dài L = ${input.lengthNm} nm (suy ra N = ${nNm})`);
    N = nNm;
  }
  if (input.turns !== undefined) {
    const fromC = input.turns * 20;
    if (!closeInt(fromC)) throw new Error(`Số chu kì xoắn ${input.turns} không cho số nuclêôtit nguyên`);
    const nC = Math.round(fromC);
    if (N !== undefined && N !== nC) throw new Error(`N (${N}) mâu thuẫn với số chu kì xoắn (${input.turns} → N = ${nC})`);
    N = nC;
  }
  if (input.mass !== undefined) {
    const fromM = input.mass / 300;
    if (!closeInt(fromM)) throw new Error(`Khối lượng M = ${input.mass} đvC không chia hết cho 300`);
    const nM = Math.round(fromM);
    if (N !== undefined && N !== nM) throw new Error(`N (${N}) mâu thuẫn với khối lượng M = ${input.mass} (suy ra N = ${nM})`);
    N = nM;
  }

  // Từ A và G suy N
  if (A !== undefined && G !== undefined) {
    const nAG = 2 * (A + G);
    if (N !== undefined && N !== nAG) throw new Error(`N (${N}) mâu thuẫn với 2(A + G) = ${nAG}`);
    N = nAG;
  }

  // Từ %A / %G và N (hoặc A / G)
  let pctA = input.pctA;
  let pctG = input.pctG;
  if (pctA !== undefined && pctG !== undefined && Math.abs(pctA + pctG - 50) > 1e-4) {
    throw new Error(`Tổng %A (${pctA}%) + %G (${pctG}%) phải bằng 50%`);
  }
  if (pctA !== undefined && pctG === undefined) pctG = 50 - pctA;
  if (pctG !== undefined && pctA === undefined) pctA = 50 - pctG;

  if (pctA !== undefined && (pctA < 0 || pctA > 50)) {
    throw new Error(`Tỉ lệ %A phải nằm trong [0, 50] (gặp ${pctA})`);
  }

  if (N === undefined && A !== undefined && pctA !== undefined && pctA > 0) {
    const nCalc = (A * 100) / pctA;
    if (!closeInt(nCalc)) throw new Error(`A = ${A} và %A = ${pctA}% không cho tổng N nguyên`);
    N = Math.round(nCalc);
  }
  if (N === undefined && G !== undefined && pctG !== undefined && pctG > 0) {
    const nCalc = (G * 100) / pctG;
    if (!closeInt(nCalc)) throw new Error(`G = ${G} và %G = ${pctG}% không cho tổng N nguyên`);
    N = Math.round(nCalc);
  }

  // Hệ phương trình N và H: H = 2A + 3G = N + G => G = H - N, A = N/2 - G
  if (N !== undefined && input.hydrogenBonds !== undefined) {
    const gH = input.hydrogenBonds - N;
    const aH = N / 2 - gH;
    if (G !== undefined && G !== gH) throw new Error(`G (${G}) mâu thuẫn với H = ${input.hydrogenBonds} và N = ${N}`);
    if (A !== undefined && A !== aH) throw new Error(`A (${A}) mâu thuẫn với H = ${input.hydrogenBonds} và N = ${N}`);
    G = gH;
    A = aH;
  }

  // Hệ phương trình H và %A (hoặc %G): H = N * (2*%A + 3*%G)/100
  if (N === undefined && input.hydrogenBonds !== undefined && pctA !== undefined && pctG !== undefined) {
    const denom = (2 * pctA + 3 * pctG) / 100;
    const nCalc = input.hydrogenBonds / denom;
    if (!closeInt(nCalc)) throw new Error(`H = ${input.hydrogenBonds} và %A = ${pctA}% không cho tổng N nguyên`);
    N = Math.round(nCalc);
  }

  // Hệ phương trình H và A (hoặc G)
  if (input.hydrogenBonds !== undefined && A !== undefined && G === undefined) {
    const gCalc = (input.hydrogenBonds - 2 * A) / 3;
    if (!closeInt(gCalc)) throw new Error(`H = ${input.hydrogenBonds} và A = ${A} không cho G nguyên`);
    G = Math.round(gCalc);
    N = N ?? 2 * (A + G);
  }
  if (input.hydrogenBonds !== undefined && G !== undefined && A === undefined) {
    const aCalc = (input.hydrogenBonds - 3 * G) / 2;
    if (!closeInt(aCalc)) throw new Error(`H = ${input.hydrogenBonds} và G = ${G} không cho A nguyên`);
    A = Math.round(aCalc);
    N = N ?? 2 * (A + G);
  }

  // Từ N và %A/%G suy A, G
  if (N !== undefined && A === undefined && pctA !== undefined) {
    const aCalc = (N * pctA) / 100;
    if (!closeInt(aCalc)) throw new Error(`N = ${N} và %A = ${pctA}% không cho số nu A nguyên`);
    A = Math.round(aCalc);
  }
  if (N !== undefined && G === undefined && pctG !== undefined) {
    const gCalc = (N * pctG) / 100;
    if (!closeInt(gCalc)) throw new Error(`N = ${N} và %G = ${pctG}% không cho số nu G nguyên`);
    G = Math.round(gCalc);
  }

  // Từ N và A suy G (và ngược lại)
  if (N !== undefined && A !== undefined && G === undefined) G = N / 2 - A;
  if (N !== undefined && G !== undefined && A === undefined) A = N / 2 - G;

  if (N === undefined || A === undefined || G === undefined) {
    throw new Error("Thiếu dữ kiện để xác định đầy đủ cấu trúc ADN (cần ít nhất 2 đại lượng độc lập, vd N và A, hoặc L và H, hoặc trình tự mạch đơn)");
  }

  if (!Number.isInteger(N) || N <= 0 || N % 2 !== 0) {
    throw new Error(`Tổng số nuclêôtit N phải là số nguyên dương chẵn (tính được N = ${N})`);
  }
  if (!Number.isInteger(A) || !Number.isInteger(G) || A < 0 || G < 0) {
    throw new Error(`Số nuclêôtit từng loại phải là số nguyên không âm (tính được A = ${A}, G = ${G})`);
  }
  if (2 * (A + G) !== N) {
    throw new Error(`Không thoả mãn 2A + 2G = N (${2 * (A + G)} ≠ ${N})`);
  }

  const hydrogenBonds = 2 * A + 3 * G;
  if (input.hydrogenBonds !== undefined && input.hydrogenBonds !== hydrogenBonds) {
    throw new Error(`Số liên kết hiđrô nhập (${input.hydrogenBonds}) không khớp 2A + 3G = ${hydrogenBonds}`);
  }

  const lengthAngstrom = round2((N / 2) * 3.4);
  const lengthNm = round2(lengthAngstrom / 10);
  const turns = round2(N / 20);
  const mass = N * 300;
  const covalentBetween = N - 2;
  const covalentTotal = 2 * N - 2;

  let replication: DnaReplicationStats | undefined;
  if (input.replications !== undefined) {
    const k = input.replications;
    if (!Number.isInteger(k) || k < 0 || k > 30) throw new Error("Số lần nhân đôi k phải là số nguyên trong 0..30");
    const copies = 2 ** k;
    const mult = copies - 1;
    replication = {
      k,
      dnaCopies: copies,
      envN: N * mult,
      envA: A * mult,
      envT: A * mult,
      envG: G * mult,
      envC: G * mult,
      hydrogenBondsBroken: hydrogenBonds * mult,
    };
  }

  return {
    N,
    A,
    T: A,
    G,
    C: G,
    pctA: round2((A / N) * 100),
    pctT: round2((A / N) * 100),
    pctG: round2((G / N) * 100),
    pctC: round2((G / N) * 100),
    lengthAngstrom,
    lengthNm,
    turns,
    mass,
    hydrogenBonds,
    covalentBetween,
    covalentTotal,
    ...(strand && { strand }),
    ...(replication && { replication }),
  };
}
