// Server demo (không Docker): PGlite + Keycloak giả + dữ liệu mẫu cả trường theo thế giới mẫu (docs/demo/the-gioi-mau.md):
// Trường Liên cấp Bình Minh, 1.240 HS, 86 GV, 31 lớp (THCS 6–9, THPT 10–12, lớp ĐH KTPM K23 + 2 lớp học phần);
// GV đăng nhập là cô Lê Thu Hà (Toán, GVCN 10A1); HS là Nguyễn Minh Anh (10A1, có tài khoản liên kết thẻ lớp).
// Dữ liệu dựng ở scripts/demo-data/seed.ts (ghi thẳng DB, chấm bằng hàm miền của lõi, ngẫu nhiên có hạt giống).
//
// Chạy: PORT=4325 OUT=/tmp/eduvn-demo pnpm --filter @eduvn/server exec tsx scripts/serve-demo-v2.ts
//   DEMO_DATA_DIR (mặc định /tmp/eduvn-demo-db): lần đầu dựng dữ liệu rồi lưu ảnh chụp PGlite (db.tar.gz + meta.json);
//   lần sau nạp lại ảnh chụp (vài giây) và dời mọi mốc thời gian theo số ngày đã trôi qua → hôm nay luôn có việc.
//   RESEED=1: dựng lại từ đầu.
// Ghi ra $OUT/gv-token.txt (token GV cô Hà), $OUT/hs-session.json (phiên mã lớp của Minh Anh) và $OUT/hs-token.txt (tài khoản Minh Anh).
// "Dùng thử nhanh" trên /dang-nhap: GET /api/demo/vao-thu (có route = đang chạy server demo), POST {vai: "gv" | "hs"} → token/phiên mới.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createVerifier } from "../src/auth/verify";
import { type Db, MIGRATIONS_DIR } from "../src/db/client";
import * as schema from "../src/db/schema";
import { vnDay } from "../src/domain/today";
import { buildApp } from "../src/http/app";
import { call } from "../tests/helpers/classroom";
import { AUDIENCE, ISSUER, makeIssuer } from "../tests/helpers/tokens";
import { DATA } from "./demo-data";
import { type Meta, seedAll } from "./demo-data/seed";

const port = Number(process.env.PORT ?? 4325);
const out = process.env.OUT ?? "/tmp/eduvn-demo";
const dataDir = process.env.DEMO_DATA_DIR ?? "/tmp/eduvn-demo-db";
const snapFile = `${dataDir}/db.tar.gz`;
const metaFile = `${dataDir}/meta.json`;
mkdirSync(out, { recursive: true });
mkdirSync(dataDir, { recursive: true });

const t0 = Date.now();
let pg: PGlite;
let meta: Meta;
let how: string;
if (process.env.RESEED !== "1" && existsSync(snapFile) && existsSync(metaFile)) {
  pg = new PGlite({ loadDataDir: new Blob([readFileSync(snapFile)]) });
  meta = JSON.parse(readFileSync(metaFile, "utf8")) as Meta;
  how = "nạp ảnh chụp";
} else {
  pg = new PGlite();
  const fresh = drizzle(pg, { schema });
  await migrate(fresh, { migrationsFolder: MIGRATIONS_DIR });
  meta = await seedAll(fresh, Date.now(), DATA);
  const blob = await pg.dumpDataDir("gzip");
  writeFileSync(snapFile, Buffer.from(await blob.arrayBuffer()));
  writeFileSync(metaFile, JSON.stringify(meta, null, 1));
  how = "dựng mới";
}
const pdb = drizzle(pg, { schema });
await migrate(pdb, { migrationsFolder: MIGRATIONS_DIR });
const db: Db = pdb;
const shifted = await shiftToToday(db, meta);
const ready = Date.now() - t0;

// ---------- Ứng dụng ----------
const kc = await makeIssuer();
const app = buildApp({
  db,
  verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
  issuer: ISSUER,
  publicUrl: `http://127.0.0.1:${port}`,
  downloadSecret: "demo-secret-demo-secret-demo-secret!!",
  studentSecret: "demo-student-secret-demo-student-secret",
  studentRateLimit: { max: 100_000, timeWindow: 60_000 },
  sweepMs: 60_000,
  aiLessons: { dataDir: `${dataDir}/files` },
});
// token sống 12 giờ (đủ cho một buổi chụp ảnh/đo)
const t = { app, db, sign: (claims: Record<string, unknown>) => kc.sign(claims, { exp: "12h" }) };
const GV = { sub: "gv-1", name: "Cô Lê Thu Hà", email: "ha.lt@binhminh.edu.vn" };
const HS = { sub: "hs-minh-anh", name: "Nguyễn Minh Anh", email: "minhanh.10a1@binhminh.edu.vn" };
const login = meta.login;

app.get("/api/demo/vao-thu", async () => ({ vai: ["gv", "hs"], gv: "Cô Lê Thu Hà · Toán", hs: "Nguyễn Minh Anh · 10A1" }));
app.post("/api/demo/vao-thu", async (req, reply) => {
  const vai = (req.body as { vai?: unknown } | null)?.vai;
  if (vai === "gv") return { token: await t.sign(GV), name: "Lê Thu Hà" };
  if (vai === "hs") {
    const r = await call(t, "POST", "/api/student/session", {}, login);
    if (r.statusCode >= 300) return reply.code(500).send({ error: "Không đăng nhập được phiên HS mẫu" });
    return { session: r.json(), token: await t.sign(HS), name: HS.name };
  }
  return reply.code(400).send({ error: "vai phải là gv hoặc hs" });
});

// ---------- Ghi token + phiên HS ----------
writeFileSync(`${out}/gv-token.txt`, await t.sign(GV));
const s = await call(t, "POST", "/api/student/session", {}, login);
if (s.statusCode >= 300) throw new Error(`hs login: ${s.statusCode} ${s.body}`);
writeFileSync(`${out}/hs-session.json`, s.body);
writeFileSync(`${out}/hs-token.txt`, await t.sign(HS));
await app.listen({ host: "127.0.0.1", port });
console.log(`demo v2 :${port} · ${how} ${(ready / 1000).toFixed(1)} s${shifted ? ` · dời ${shifted} ngày` : ""} · cô Lê Thu Hà · lớp 10A1 mã ${login.classCode} · Minh Anh STT ${login.seat} PIN ${login.pin}`);
console.log(Object.entries(meta.counts).map(([k, v]) => `${k} ${v}`).join(" · "));

/** Dời mọi mốc thời gian (timestamptz, ngày điểm danh, ngày dạy trong giáo án) theo số ngày từ lúc dựng tới hôm nay;
 *  rồi chỉnh các mốc "đã xảy ra" lỡ rơi vào tương lai và các bài hạn hôm nay đã quá giờ. */
async function shiftToToday(db: Db, m: Meta): Promise<number> {
  const now = Date.now();
  const days = Math.round((Date.parse(`${vnDay(new Date(now))}T00:00:00Z`) - Date.parse(`${m.seedDay}T00:00:00Z`)) / 86_400_000);
  if (days !== 0) {
    const cols = (await db.execute(sql`select table_name, column_name from information_schema.columns where table_schema = 'public' and data_type = 'timestamp with time zone'`)) as unknown as { rows: { table_name: string; column_name: string }[] };
    const iv = sql.raw(`interval '${days} days'`);
    const byTable = new Map<string, string[]>();
    for (const r of cols.rows) (byTable.get(r.table_name) ?? byTable.set(r.table_name, []).get(r.table_name)!).push(r.column_name);
    for (const [table, cs] of byTable) await db.execute(sql`update ${sql.identifier(table)} set ${sql.join(cs.map((c) => sql`${sql.identifier(c)} = ${sql.identifier(c)} + ${iv}`), sql`, `)}`);
    // khoá chính (student_id, date): đổi qua dạng tạm để không đụng dòng khác giữa chừng
    await db.execute(sql`update attendance set date = 'x' || to_char(to_date(date, 'YYYY-MM-DD') + ${days}::int, 'YYYY-MM-DD')`);
    await db.execute(sql`update attendance set date = substr(date, 2)`);
    await db.execute(sql`update lesson_plans set body = jsonb_set(body, '{header,date}', to_jsonb(to_char(to_date(body->'header'->>'date', 'DD/MM/YYYY') + ${days}::int, 'DD/MM/YYYY'))) where body->'header'->>'date' ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'`);
  }
  const at = new Date(now);
  // việc "đã xảy ra" mà giờ trong ngày muộn hơn lúc này → lùi về hôm trước
  await db.execute(sql`update submissions set started_at = started_at - interval '1 day', deadline_at = deadline_at - interval '1 day', submitted_at = submitted_at - interval '1 day', updated_at = updated_at - interval '1 day' where status <> 'in_progress' and submitted_at > ${at}`);
  await db.execute(sql`update submissions set started_at = ${new Date(now - 22 * 60_000)}, updated_at = ${new Date(now - 2 * 60_000)} where status = 'in_progress' and started_at > ${at}`);
  await db.execute(sql`update tutor_review_events set reviewed_at = reviewed_at - interval '1 day' where reviewed_at > ${at}`);
  await db.execute(sql`update tutor_messages set created_at = created_at - interval '1 day' where created_at > ${at}`);
  await db.execute(sql`update tutor_sessions set updated_at = ${new Date(now - 5 * 60_000)} where updated_at > ${at}`);
  await db.execute(sql`update live_sessions set started_at = started_at - interval '1 day', ended_at = ended_at - interval '1 day' where ended_at > ${at}`);
  // bài hạn hôm nay mà đã/sắp quá giờ → hạn 3 giờ nữa (bài đang làm dở đi theo)
  if (m.live.length) {
    const due = new Date(now + 3 * 3600_000);
    const ids = sql.join(m.live.map((id) => sql`${id}::uuid`), sql`, `);
    await db.execute(sql`update assignments set due_at = ${due} where id in (${ids}) and due_at < ${new Date(now + 3600_000)} and opens_at < ${at}`);
    await db.execute(sql`update submissions set deadline_at = ${due} where assignment_id in (${ids}) and status = 'in_progress' and deadline_at < ${new Date(now + 3600_000)}`);
  }
  return days;
}
