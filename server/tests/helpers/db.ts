import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { type Db, MIGRATIONS_DIR } from "../../src/db/client";
import * as schema from "../../src/db/schema";

/** Postgres trong tiến trình, migrate sẵn. Mỗi lần gọi = DB mới, sạch. */
export async function testDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}
