import { lstatSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const SESSION_DIRS = ["conversations", "brain", "annotations", "implicit", "log"];

/** Xoá dữ liệu phiên agy cũ hơn `maxAgeMs` trong `<dir>/gemini-*\/antigravity-cli/*` (phiên sót do tiến trình chết). */
export function cleanWorkDir(dir: string, maxAgeMs: number, now = Date.now()): number {
  let removed = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  const walk = (p: string) => {
    let st;
    try {
      st = lstatSync(p); // không đi theo liên kết tượng trưng ra ngoài thư mục làm việc
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const n of readdirSync(p)) walk(join(p, n));
      return;
    }
    if (now - st.mtimeMs > maxAgeMs) {
      rmSync(p, { force: true });
      removed++;
    }
  };
  for (const g of entries.filter((n) => n.startsWith("gemini-"))) {
    for (const sub of SESSION_DIRS) walk(join(dir, g, "antigravity-cli", sub));
  }
  return removed;
}
