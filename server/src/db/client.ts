import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_DIR = new URL("../../drizzle", import.meta.url).pathname;

export async function connectDb(url: string): Promise<Db> {
  const db = drizzle(new pg.Pool({ connectionString: url }), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}
