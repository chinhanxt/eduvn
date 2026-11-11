// Gọi sidecar Python services/pptmaster/eduvn_pptx.py (venv ~/Apps/pptmaster). Một việc mỗi lúc trong tiến trình;
// khi có HEAVY_BIN thì bọc `heavy run eduvn-pptx --` (khoá RAM chung của máy).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SidecarCfg = { python?: string; script?: string; skill?: string; wrap?: string[]; timeoutMs?: number };

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SCRIPT = path.resolve(here, "../../../../services/pptmaster/eduvn_pptx.py");

export function sidecarCfg(env: NodeJS.ProcessEnv = process.env): Required<Omit<SidecarCfg, "wrap">> & { wrap?: string[] } {
  const home = env.PPTMASTER_HOME ?? path.join(homedir(), "Apps/pptmaster");
  return {
    python: env.PPTMASTER_PYTHON ?? path.join(home, "bin/python"),
    script: env.PPTMASTER_SCRIPT ?? DEFAULT_SCRIPT,
    skill: env.PPTMASTER_SKILL ?? path.join(home, "src/ppt-master"),
    wrap: env.HEAVY_BIN ? [env.HEAVY_BIN, "run", "eduvn-pptx", "--"] : undefined,
    timeoutMs: Number(env.PPTMASTER_TIMEOUT_MS ?? 600_000),
  };
}

export const sidecarReady = (cfg = sidecarCfg()): boolean => existsSync(cfg.python) && existsSync(cfg.script) && existsSync(path.join(cfg.skill, "scripts/svg_to_pptx.py"));

let chain: Promise<unknown> = Promise.resolve();

/** Chạy 1 lệnh sidecar, trả JSON dòng cuối stdout. Xếp hàng: một việc mỗi lúc. */
export function runSidecar<T = Record<string, unknown>>(args: string[], o: { stdin?: string; cfg?: SidecarCfg } = {}): Promise<T & { ok: boolean; error?: string }> {
  const base = sidecarCfg();
  const cfg = { ...base, ...o.cfg };
  const job = () =>
    new Promise<T & { ok: boolean; error?: string }>((resolve, reject) => {
      const cmd = [...(cfg.wrap ?? []), cfg.python, cfg.script, ...args];
      const child = spawn(cmd[0]!, cmd.slice(1), { env: { ...process.env, PPTMASTER_SKILL: cfg.skill, PYTHONIOENCODING: "utf-8" }, stdio: ["pipe", "pipe", "pipe"] });
      let out = "";
      let err = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), cfg.timeoutMs);
      child.stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
      child.stderr.on("data", (d: Buffer) => (err += d.toString("utf8")));
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(new Error(`Không chạy được ppt-master: ${e.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const line = out.trim().split("\n").filter(Boolean).pop() ?? "";
        try {
          resolve(JSON.parse(line) as T & { ok: boolean; error?: string });
        } catch {
          reject(new Error(`ppt-master lỗi (mã ${code}): ${(err || out).trim().split("\n").slice(-4).join(" | ").slice(0, 600)}`));
        }
      });
      if (o.stdin !== undefined) child.stdin.end(o.stdin);
      else child.stdin.end();
    });
  const p = chain.then(job, job);
  chain = p.catch(() => undefined);
  return p;
}

export type OmmlResult = { latex: string; ok: boolean; omml?: string; error?: string };

/** LaTeX → OMML (bộ biên dịch MIT của ppt-master). */
export async function compileOmml(items: (string | { latex: string; display?: boolean })[], cfg?: SidecarCfg): Promise<OmmlResult[]> {
  const r = await runSidecar<{ results: OmmlResult[] }>(["omml"], { stdin: JSON.stringify(items), cfg });
  if (!r.ok) throw new Error(r.error ?? "omml lỗi");
  return r.results;
}

export type TemplateInfo = {
  width: number;
  height: number;
  theme: { colors: Record<string, string>; fonts: { major?: string; minor?: string } };
  layouts: { part: string; type: string; name: string; placeholders: { type: string; idx: string; box: [number, number, number, number] | null }[] }[];
  background: string | null;
  sampleSlides: number;
  hasPicture: boolean;
};

export async function analyzeTemplate(file: string, cfg?: SidecarCfg): Promise<TemplateInfo> {
  const r = await runSidecar<TemplateInfo>(["analyze", file], { cfg });
  if (!r.ok) throw new Error(r.error ?? "Không đọc được tệp mẫu");
  return r;
}

export type ImportedSlide = { title: string; elements: Record<string, unknown>[]; background: Record<string, unknown>; notes: string; text: string; hidden: boolean };
export type ImportedDeck = { title: string; width: number; height: number; images: number; slides: ImportedSlide[] };

export async function importPptxFile(file: string, cfg?: SidecarCfg): Promise<ImportedDeck> {
  const r = await runSidecar<ImportedDeck>(["import", file], { cfg });
  if (!r.ok) throw new Error(r.error ?? "Không đọc được tệp .pptx");
  return r;
}
