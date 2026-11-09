import Dexie, { type EntityTable } from "dexie";
import { type Draft, type DraftStore, memoryStore } from "./syncQueue";

type HsDb = Dexie & { drafts: EntityTable<Draft, "submissionId"> };
let db: HsDb | null = null;

function open(): HsDb {
  if (!db) {
    db = new Dexie("eduvn-hs") as HsDb;
    db.version(1).stores({ drafts: "submissionId, updatedAt" });
  }
  return db;
}

/** IndexedDB (Dexie); trình duyệt chặn IndexedDB thì giữ trong bộ nhớ. */
export async function pickStore(): Promise<DraftStore> {
  try {
    const d = open();
    await d.open();
    return {
      get: (id) => d.drafts.get(id),
      put: async (x) => {
        await d.drafts.put(x);
      },
    };
  } catch {
    return memoryStore();
  }
}
