import { readFileSync } from "node:fs";
import { z } from "zod";
import { GatewayError } from "./types";

const Backend = z.enum(["acp", "anthropic"]);
const Task = z.object({
  model: z.string().min(1),
  backend: Backend.optional(),
  priority: z.enum(["interactive", "batch"]).default("batch"),
  timeoutMs: z.number().int().min(1000).max(900000).optional(),
  system: z.string().max(8000).default(""),
  json: z.boolean().default(false),
  description: z.string().default(""),
});
const File = z.object({
  defaults: z.object({ model: z.string().min(1), timeoutMs: z.number().int().min(1000).max(900000), backend: Backend }),
  tasks: z
    .record(z.string().regex(/^[a-z][a-z0-9_]*$/), Task)
    .refine((t) => !Object.hasOwn(t, "default"), { message: "tên tác vụ 'default' đã dành riêng" }),
});
export type TaskConfig = z.infer<typeof Task>;
export type TasksFile = z.infer<typeof File>;
export type Route = {
  task: string | null;
  model: string;
  backend: "acp" | "anthropic";
  priority: 0 | 1;
  timeoutMs: number;
  system: string;
  json: boolean;
};

export const parseTasks = (raw: unknown): TasksFile => File.parse(raw);
export const loadTasks = (path: string): TasksFile => parseTasks(JSON.parse(readFileSync(path, "utf8")));

/** `name` là tên tác vụ (`gia_su_chat`, `task:gia_su_chat`), `default`, hoặc id model agy. */
export function resolveRoute(file: TasksFile, name: string, opts: { interactive?: boolean } = {}): Route {
  const key = name.startsWith("task:") ? name.slice(5) : name;
  const t = file.tasks[key];
  if (t) {
    return {
      task: key,
      model: t.model,
      backend: t.backend ?? file.defaults.backend,
      priority: t.priority === "interactive" ? 0 : 1,
      timeoutMs: t.timeoutMs ?? file.defaults.timeoutMs,
      system: t.system,
      json: t.json,
    };
  }
  if (name.startsWith("task:")) throw new GatewayError(404, "unknown_task", `Không có tác vụ ${key}`);
  return {
    task: null,
    model: name === "default" ? file.defaults.model : name,
    backend: file.defaults.backend,
    priority: opts.interactive ? 0 : 1,
    timeoutMs: file.defaults.timeoutMs,
    system: "",
    json: false,
  };
}
