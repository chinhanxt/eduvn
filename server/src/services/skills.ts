/** Nạp skill sư phạm (skills/<tên>/SKILL.md + references/) làm system prompt cho cổng AI và cho MCP. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NotFoundError } from "../errors";

export const SKILL_NAMES = ["ma-tran-dac-ta-7991", "cau-hoi-theo-yccd", "giao-an-5512", "nhan-xet-tt22-tt27", "de-cuong-hoc-phan", "rubric-tu-luan"] as const;
export type SkillName = (typeof SKILL_NAMES)[number];

/** Task cổng AI cho từng skill (task mới nằm trong gateway/tasks.json). */
export const SKILL_TASK: Record<SkillName, string> = {
  "ma-tran-dac-ta-7991": "ma_tran_7991",
  "cau-hoi-theo-yccd": "sinh_cau_hoi",
  "giao-an-5512": "soan_giao_an",
  "nhan-xet-tt22-tt27": "nhan_xet_hs",
  "de-cuong-hoc-phan": "de_cuong_hoc_phan",
  "rubric-tu-luan": "cham_tu_luan",
};

export type Skill = { name: SkillName; description: string; body: string; references: { file: string; text: string }[] };

const DEFAULT_DIR = fileURLToPath(new URL("../../../skills", import.meta.url));
export const skillsDir = (): string => process.env.SKILLS_DIR ?? DEFAULT_DIR;

const cache = new Map<string, Skill>();

export function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of (m[1] ?? "").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: (m[2] ?? "").trim() };
}

export const isSkillName = (s: string): s is SkillName => (SKILL_NAMES as readonly string[]).includes(s);

export async function loadSkill(name: string): Promise<Skill> {
  if (!isSkillName(name)) throw new NotFoundError(`Không có skill "${name}"`);
  const hit = cache.get(name);
  if (hit) return hit;
  const dir = path.join(skillsDir(), name);
  const raw = await readFile(path.join(dir, "SKILL.md"), "utf8").catch(() => {
    throw new NotFoundError(`Không đọc được skill "${name}"`);
  });
  const { meta, body } = parseFrontmatter(raw);
  const files = (await readdir(path.join(dir, "references")).catch(() => [] as string[])).filter((f) => f.endsWith(".md")).sort();
  const references = await Promise.all(files.map(async (file) => ({ file, text: (await readFile(path.join(dir, "references", file), "utf8")).trim() })));
  const skill: Skill = { name, description: meta.description ?? "", body, references };
  cache.set(name, skill);
  return skill;
}

/** Nội dung gửi cho AI: quy trình + toàn bộ tài liệu tham chiếu. */
export function skillText(s: Skill): string {
  return [s.body, ...s.references.map((r) => `## Tài liệu tham chiếu: references/${r.file}\n\n${r.text}`)].join("\n\n");
}

export async function listSkills(): Promise<{ name: SkillName; description: string }[]> {
  return Promise.all(SKILL_NAMES.map(async (n) => ({ name: n, description: (await loadSkill(n)).description })));
}
