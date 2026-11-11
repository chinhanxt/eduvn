// Sinh ảnh "chụp" phiếu trắc nghiệm tổng hợp (PNG) cho chạy thật P7 — dùng chung bộ sinh với test (tests/omrSynth.ts).
// Chạy (trong web/): ../server/node_modules/.bin/tsx scripts/p7-synth.ts /tmp/p7-synth.json
// JSON: { examId, title, code, entries: [{no, section, sectionNo}], sheets: [{ out, seed, angle?, sbd, answers: {no: 0..3 | bool[] | "1,5"}, double?: number[], faint?: number[] }] }
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { deflateSync } from "node:zlib";
import { type Cv, type Img, loadCv, setCv } from "../src/omr/decode";
import { type Entry, buildTemplate } from "../src/omr/template";
import { photograph, renderSheet, rng } from "../tests/omrSynth";

type Ans = number | boolean[] | string;
type Spec = { examId: string; title: string; code: string; entries: Entry[]; sheets: { out: string; seed: number; angle?: number; sbd: string; answers: Record<string, Ans>; double?: number[]; faint?: number[] }[] };

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(img: Img): Buffer {
  const raw = Buffer.alloc((img.width * 3 + 1) * img.height);
  for (let y = 0; y < img.height; y++) {
    raw[y * (img.width * 3 + 1)] = 0;
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const o = y * (img.width * 3 + 1) + 1 + x * 3;
      raw[o] = img.data[i]!;
      raw[o + 1] = img.data[i + 1]!;
      raw[o + 2] = img.data[i + 2]!;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(2, 9);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

const spec = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as Spec;
const raw = createRequire(import.meta.url)("@techstark/opencv-js");
setCv((await raw.then((c: unknown) => ({ cv: c }))).cv as Cv);
const cv = await loadCv();
const t = buildTemplate(spec.entries, { title: spec.title, code: spec.code });

for (const s of spec.sheets) {
  const marks: Record<string, number[]> = {};
  for (const g of t.groups) marks[g.id] = [];
  [...s.sbd.padStart(6, "0")].forEach((d, c) => (marks[`id.${c}`] = [Number(d)]));
  for (const [no, a] of Object.entries(s.answers)) {
    if (typeof a === "number") marks[`m${no}`] = [a];
    else if (Array.isArray(a)) a.forEach((v, k) => (marks[`t${no}.${k}`] = [v ? 0 : 1]));
    else [...a].forEach((ch, c) => (marks[`d${no}.${c}`] = [ch === "-" || ch === "," ? 0 : Number(ch) + 1]));
  }
  for (const no of s.double ?? []) marks[`m${no}`] = [...(marks[`m${no}`] ?? []), ((marks[`m${no}`]?.[0] ?? 0) + 1) % 4];
  const faint = new Set((s.faint ?? []).map((no) => `m${no}`));
  for (let page = 0; page < t.pages; page++) {
    const rand = rng(s.seed + page);
    const img = photograph(cv, renderSheet(t, page, spec.examId, spec.code, marks, rand, 5, faint), rand, { angle: s.angle });
    const out = t.pages > 1 ? s.out.replace(/\.png$/, `-trang${page + 1}.png`) : s.out;
    writeFileSync(out, png(img));
    console.log(out);
  }
}
