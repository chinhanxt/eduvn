/** Thư viện cho cảnh interactive (katex, three, chart.js, tailwind) phục vụ ở /vendor/interactive theo INTERACTIVE_LIBRARIES của @openmaic/generation. */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { INTERACTIVE_LIBRARIES } from "@openmaic/generation";

const INTERACTIVE_ASSET_PATH = "/vendor/interactive";

const require_ = createRequire(import.meta.url);
const roots = new Map<string, string>();

function rootOf(pkg: string): string {
  const hit = roots.get(pkg);
  if (hit) return hit;
  let dir = path.dirname(require_.resolve(pkg));
  for (;;) {
    try {
      if ((require_(path.join(dir, "package.json")) as { name?: string }).name === pkg) break;
    } catch {
      /* lên thư mục cha */
    }
    const up = path.dirname(dir);
    if (up === dir) throw new Error(`Không thấy gói ${pkg}`);
    dir = up;
  }
  roots.set(pkg, dir);
  return dir;
}

const MIME: Record<string, string> = { ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".json": "application/json" };

/** `/vendor/interactive/<gói>@<phiên bản>/<tệp>` → đường dẫn tệp được phép, hoặc null. */
export function vendorFile(urlPath: string): { file: string; mime: string } | null {
  if (!urlPath.startsWith(`${INTERACTIVE_ASSET_PATH}/`)) return null;
  const rest = decodeURIComponent(urlPath.slice(INTERACTIVE_ASSET_PATH.length + 1));
  for (const lib of INTERACTIVE_LIBRARIES) {
    const prefix = `${lib.package}@${lib.version}/`;
    if (!rest.startsWith(prefix)) continue;
    let rel = rest.slice(prefix.length);
    rel = (lib.aliases as Record<string, string>)[rel] ?? rel;
    if (rel.includes("..") || path.isAbsolute(rel)) return null;
    const allowed = [...lib.files, lib.license].some((f) => rel === f || rel.startsWith(`${f}/`));
    if (!allowed) return null;
    return { file: path.join(rootOf(lib.package), rel), mime: MIME[path.extname(rel)] ?? "application/octet-stream" };
  }
  return null;
}

export async function readVendor(urlPath: string): Promise<{ body: Buffer; mime: string } | null> {
  const v = vendorFile(urlPath);
  if (!v) return null;
  try {
    return { body: await readFile(v.file), mime: v.mime };
  } catch {
    return null;
  }
}
