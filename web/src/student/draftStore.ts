import Dexie, { type EntityTable } from "dexie";
import { clearSession } from "./studentApi";
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
      purge: (id) => d.drafts.delete(id),
      purgeAll: () => d.drafts.clear(),
    };
  } catch {
    return memoryStore();
  }
}

/** Đăng xuất: xoá phiên và mọi bản nháp trên máy (máy dùng chung ở trường). */
export async function logoutStudent(store?: DraftStore): Promise<void> {
  clearSession();
  try {
    await (store ?? (await pickStore())).purgeAll?.();
  } catch {
    /* bỏ qua */
  }
}
