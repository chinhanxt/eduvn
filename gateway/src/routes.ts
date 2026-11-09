import { readFileSync } from "node:fs";
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
export const parseTasks = (raw: unknown): TasksFile => File.parse(raw);
export const loadTasks = (path: string): TasksFile => parseTasks(JSON.parse(readFileSync(path, "utf8")));

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
