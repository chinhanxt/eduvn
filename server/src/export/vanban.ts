import {
  AlignmentType, BorderStyle, Document, Footer, Header, LineRuleType, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { LOAI_INFO, type VanBan, canCuLines, chucVuLines, formatNgay, noiNhanLines, numberHeadings, soKyHieu } from "../domain/vanban";

const FONT = "Times New Roman";
const BODY = 28; // 14pt
const CONTENT_W = 9356; // 165 mm: A4 trừ lề trái 30 mm, phải 15 mm
const LEFT_W = 3900;
const RIGHT_W = CONTENT_W - LEFT_W;

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE } as const;

const run = (text: string, o: { size?: number; bold?: boolean; italics?: boolean } = {}) => new TextRun({ text, font: FONT, size: o.size ?? BODY, bold: o.bold, italics: o.italics });
const centered = (runs: TextRun[], o: { before?: number; after?: number } = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: o.before ?? 0, after: o.after ?? 0 }, children: runs });
/** Đường kẻ ngắn: đoạn trống nhỏ, có viền dưới, thụt hai bên. */
const rule = (inset: number, before = 0) =>
  new Paragraph({ spacing: { before, after: 0, line: 20, lineRule: LineRuleType.EXACT }, indent: { left: inset, right: inset }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } }, children: [run("", { size: 2 })] });

function body(text: string, o: { bold?: boolean; italics?: boolean; keepNext?: boolean } = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 567 },
    spacing: { before: 120, line: 276, lineRule: LineRuleType.AUTO },
    keepNext: o.keepNext,
    children: [run(text, o)],
  });
}

const cell = (width: number, children: Paragraph[]) =>
  new TableCell({ width: { size: width, type: WidthType.DXA }, borders: NO_BORDERS, margins: { left: 60, right: 60 }, children });

const table = (rows: TableRow[]) =>
  new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [LEFT_W, RIGHT_W], borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE }, rows });

function topBlock(v: VanBan): Table {
  const left: Paragraph[] = [];
  if (v.co_quan_chu_quan) left.push(centered([run(v.co_quan_chu_quan.toUpperCase(), { size: 24 })]));
  left.push(centered([run(v.co_quan_ban_hanh.toUpperCase(), { size: 24, bold: true })]));
  left.push(rule(900));

  const right = [
    centered([run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { size: 24, bold: true })]),
    centered([run("Độc lập - Tự do - Hạnh phúc", { size: 26, bold: true })]),
    rule(1250),
  ];

  const left2 = [centered([run(soKyHieu(v), { size: 26 })], { before: 160 })];
  if (v.loai === "cong_van") left2.push(centered([run(`V/v ${v.trich_yeu}`, { size: 24 })], { before: 40 }));
  const right2 = [centered([run(formatNgay(v), { size: 26, italics: true })], { before: 160 })];

  return table([new TableRow({ children: [cell(LEFT_W, left), cell(RIGHT_W, right)] }), new TableRow({ children: [cell(LEFT_W, left2), cell(RIGHT_W, right2)] })]);
}

function bienBanSign(v: VanBan): Table {
  const col = (role: string, name: string) => [
    centered([run(role, { bold: true })]),
    ...[0, 1, 2, 3].map(() => centered([run("")])),
    centered([run(name, { bold: true })]),
  ];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W / 2, CONTENT_W / 2],
    borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ cantSplit: true, children: [cell(CONTENT_W / 2, col("THƯ KÝ", v.thu_ky)), cell(CONTENT_W / 2, col(v.vai_tro_chu_tri, v.chu_tri))] })],
  });
}

function bottomBlock(v: VanBan): Table {
  const left = [
    new Paragraph({ spacing: { after: 20 }, children: [run("Nơi nhận:", { size: 24, bold: true, italics: true })] }),
    ...noiNhanLines(v).map((l) => new Paragraph({ spacing: { after: 0 }, children: [run(l, { size: 22 })] })),
  ];
  const lines = v.chuc_vu_ky ? chucVuLines(v) : [];
  const right = [
    ...lines.map((l) => centered([run(l, { size: BODY, bold: true })])),
    ...(v.nguoi_ky ? [0, 1, 2, 3].map(() => centered([run("", { size: BODY })])) : []),
    ...(v.nguoi_ky ? [centered([run(v.nguoi_ky, { size: BODY, bold: true })])] : []),
  ];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [LEFT_W, RIGHT_W],
    borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ cantSplit: true, children: [cell(LEFT_W, left), cell(RIGHT_W, right)] })],
  });
}

function kinhGui(v: VanBan): Paragraph[] {
  if (v.kinh_gui.length === 0) return [];
  if (v.kinh_gui.length === 1) return [centered([run("Kính gửi: ", { bold: false }), run(v.kinh_gui[0] ?? "")], { before: 200 })];
  return [centered([run("Kính gửi:")], { before: 200 }), ...v.kinh_gui.map((k) => centered([run(`- ${k.replace(/[;,.\s]+$/, "")}`)]))];
}

function details(v: VanBan): Paragraph[] {
  const out: Paragraph[] = [];
  const kv = (k: string, val: string) => out.push(new Paragraph({ spacing: { before: 60, line: 276 }, indent: { firstLine: 567 }, children: [run(`${k}: `, { bold: true }), run(val)] }));
  if (v.thoi_gian) kv("Thời gian", v.thoi_gian);
  if (v.dia_diem) kv("Địa điểm", v.dia_diem);
  if (v.chu_tri && v.loai !== "bien_ban") kv("Chủ trì", v.chu_tri);
  if (v.thu_ky && v.loai !== "bien_ban") kv("Thư ký", v.thu_ky);
  if (v.thanh_phan.length) {
    out.push(new Paragraph({ spacing: { before: 60 }, indent: { firstLine: 567 }, children: [run("Thành phần tham dự:", { bold: true })] }));
    for (const t of v.thanh_phan) out.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 20, line: 276 }, indent: { left: 567, firstLine: 0 }, children: [run(`- ${t.replace(/^[-–•]\s*/, "").replace(/[;,.\s]+$/, "")};`)] }));
  }
  return out;
}

export async function renderVanBanDocx(v: VanBan): Promise<Buffer> {
  const kids: (Paragraph | Table)[] = [topBlock(v)];
  const info = LOAI_INFO[v.loai];
  if (v.loai !== "cong_van") {
    kids.push(centered([run(info.ten, { bold: true })], { before: 360 }));
    kids.push(centered([run(v.trich_yeu, { bold: true })], { before: 20 }));
    kids.push(rule(3300, 40));
  }
  kids.push(...kinhGui(v));
  if (v.loai === "cong_van" && v.kinh_gui.length) kids.push(new Paragraph({ spacing: { after: 0 }, children: [] }));
  for (const c of canCuLines(v)) kids.push(body(c, { italics: true }));
  if (v.loai === "quyet_dinh") kids.push(centered([run("QUYẾT ĐỊNH:", { bold: true })], { before: 160 }));
  kids.push(...details(v));
  const nums = numberHeadings(v.noi_dung);
  v.noi_dung.forEach((b, i) => {
    if (b.kind === "doan") kids.push(body(b.text));
    else if (b.kind === "ds") for (const it of b.items) kids.push(body(`- ${it.replace(/^[-–•]\s*/, "")}`));
    else if (b.cap === 1) kids.push(body(`${nums[i]} ${b.text.toUpperCase()}`, { bold: true, keepNext: true }));
    else if (b.cap === 2) kids.push(body(`${nums[i]} ${b.text}`, { bold: true, keepNext: true }));
    else kids.push(body(`${nums[i]} ${b.text}`, { italics: true, keepNext: true }));
  });
  kids.push(new Paragraph({ spacing: { before: 120 }, children: [] }));
  if (v.loai === "bien_ban") {
    kids.push(bienBanSign(v));
    if (v.noi_nhan.length) kids.push(bottomBlock({ ...v, chuc_vu_ky: "", nguoi_ky: "" }));
  } else kids.push(bottomBlock(v));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: {
          titlePage: true,
          page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 851, header: 567 } },
        },
        headers: {
          default: new Header({ children: [centered([new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 26 })])] }),
          first: new Header({ children: [new Paragraph({ children: [] })] }),
        },
        footers: { default: new Footer({ children: [new Paragraph({ children: [] })] }) },
        children: kids,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
