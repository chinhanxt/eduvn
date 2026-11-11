import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { z } from "zod";
import { GatewayError } from "./types";

const Backend = z.enum(["acp", "anthropic"]);
// `model` là một id hoặc danh sách ưu tiên (kho model của agy đổi theo tài khoản proxy đang dùng).
const ModelPref = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);
const Task = z.object({
  model: ModelPref,
  backend: Backend.optional(),
  priority: z.enum(["interactive", "batch"]).default("batch"),
  timeoutMs: z.number().int().min(1000).max(900000).optional(),
  system: z.string().max(8000).default(""),
  json: z.boolean().default(false),
  refusal: z.string().min(1).max(2000).optional(), // câu trả lời mẫu khi AI bị bộ lọc chặn / không trả lời được
  description: z.string().default(""),
});
const File = z.object({
  defaults: z.object({ model: ModelPref, timeoutMs: z.number().int().min(1000).max(900000), backend: Backend }),
  tasks: z
    .record(z.string().regex(/^[a-z][a-z0-9_]*$/), Task)
    .refine((t) => !Object.hasOwn(t, "default"), { message: "tên tác vụ 'default' đã dành riêng" }),
});
export type TaskConfig = z.infer<typeof Task>;
export type TasksFile = z.infer<typeof File>;
export type Route = {
  task: string | null;
  model: string; // lựa chọn đầu tiên
  models: string[]; // danh sách ưu tiên
  backend: "acp" | "anthropic";
  priority: 0 | 1;
  timeoutMs: number;
  system: string;
  json: boolean;
  refusal?: string;
};

const list = (m: string | string[]): string[] => (Array.isArray(m) ? m : [m]);
/** File bổ sung trong `tasks.d/<gói>.json`: chỉ có `tasks` (mặc định lấy từ tasks.json). */
const Extra = z.object({
  description: z.string().optional(),
  tasks: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), Task).refine((t) => !Object.hasOwn(t, "default"), { message: "tên tác vụ 'default' đã dành riêng" }),
});
export const parseTasks = (raw: unknown): TasksFile => File.parse(raw);

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`Không đọc được ${path}: ${(e as Error).message}`);
  }
}

/**
 * Gộp tác vụ bổ sung (theo thứ tự tên file) vào tasks.json. Trùng tên tác vụ (với tasks.json hoặc giữa hai file) → lỗi
 * nêu rõ tên tác vụ và cả hai file, không lặng lẽ ghi đè.
 */
export function mergeTasks(base: TasksFile, extras: { file: string; raw: unknown }[], baseName = "tasks.json"): TasksFile {
  const tasks: Record<string, TaskConfig> = { ...base.tasks };
  const from = new Map(Object.keys(base.tasks).map((k) => [k, baseName]));
  for (const { file, raw } of extras) {
    const r = Extra.safeParse(raw);
    if (!r.success) throw new Error(`tasks.d/${file} không hợp lệ: ${r.error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`).join("; ")}`);
    for (const [k, t] of Object.entries(r.data.tasks)) {
      const prev = from.get(k);
      if (prev) throw new Error(`Tác vụ "${k}" bị khai báo hai lần: ${prev} và tasks.d/${file}`);
      from.set(k, `tasks.d/${file}`);
      tasks[k] = t;
    }
  }
  return { ...base, tasks };
}

/** Đọc tasks.json + mọi `*.json` trong thư mục `tasks.d` cạnh nó (hoặc `dir`). Không có thư mục → chỉ tasks.json. */
export function loadTasks(path: string, dir: string = join(dirname(path), "tasks.d")): TasksFile {
  const base = parseTasks(readJson(path));
  if (!existsSync(dir)) return base;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return mergeTasks(base, files.map((f) => ({ file: f, raw: readJson(join(dir, f)) })), basename(path));
}

/** `name` là tên tác vụ (`gia_su_chat`, `task:gia_su_chat`), `default`, hoặc id model agy. */
export function resolveRoute(file: TasksFile, name: string, opts: { interactive?: boolean } = {}): Route {
  const key = name.startsWith("task:") ? name.slice(5) : name;
  const t = file.tasks[key];
  if (t) {
    return {
      task: key,
      model: list(t.model)[0]!,
      models: list(t.model),
      backend: t.backend ?? file.defaults.backend,
      priority: t.priority === "interactive" ? 0 : 1,
      timeoutMs: t.timeoutMs ?? file.defaults.timeoutMs,
      system: t.system,
      json: t.json,
      refusal: t.refusal,
    };
  }
  if (name.startsWith("task:")) throw new GatewayError(404, "unknown_task", `Không có tác vụ ${key}`);
  const models = name === "default" ? list(file.defaults.model) : [name];
  return {
    task: null,
    model: models[0]!,
    models,
    backend: file.defaults.backend,
    priority: opts.interactive ? 0 : 1,
    timeoutMs: file.defaults.timeoutMs,
    system: "",
    json: false,
  };
}
