import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadTasks, parseTasks, resolveRoute } from "../src/routes";

const file = parseTasks({
  defaults: { model: "claude-sonnet-5-5-low", timeoutMs: 180000, backend: "acp" },
  tasks: {
    gia_su_chat: { model: "claude-sonnet-5-5-low", priority: "interactive", timeoutMs: 60000, system: "gia sư" },
    sinh_cau_hoi: { model: "gemini-3.8-flash-medium", json: true },
    cham_api: { model: "claude-sonnet-5-5-high", backend: "anthropic" },
  },
});

describe("resolveRoute", () => {
  it("tên tác vụ → cấu hình tác vụ", () => {
    expect(resolveRoute(file, "gia_su_chat")).toEqual({ task: "gia_su_chat", model: "claude-sonnet-5-5-low", backend: "acp", priority: 0, timeoutMs: 60000, system: "gia sư", json: false });
    expect(resolveRoute(file, "task:sinh_cau_hoi")).toMatchObject({ task: "sinh_cau_hoi", model: "gemini-3.8-flash-medium", priority: 1, timeoutMs: 180000, json: true });
    expect(resolveRoute(file, "cham_api").backend).toBe("anthropic");
  });
  it("id model → dùng thẳng, ưu tiên theo kiểu gọi", () => {
    expect(resolveRoute(file, "gemini-3.8-flash-low")).toMatchObject({ task: null, model: "gemini-3.8-flash-low", priority: 1 });
    expect(resolveRoute(file, "gemini-3.8-flash-low", { interactive: true }).priority).toBe(0);
    expect(resolveRoute(file, "default").model).toBe("claude-sonnet-5-5-low");
  });
  it("task: không có thì 404", () => {
    expect(() => resolveRoute(file, "task:khong_co")).toThrow(expect.objectContaining({ status: 404, code: "unknown_task" }));
  });
  it("tên tác vụ phải là snake_case không dấu", () => {
    expect(() => parseTasks({ defaults: { model: "m", timeoutMs: 1000, backend: "acp" }, tasks: { "Gia Sư": { model: "m" } } })).toThrow();
  });
  it("tasks.json trong repo hợp lệ", () => {
    const t = loadTasks(fileURLToPath(new URL("../tasks.json", import.meta.url)));
    expect(Object.keys(t.tasks)).toContain("gia_su_chat");
    expect(resolveRoute(t, "gia_su_chat").priority).toBe(0);
  });
  it("không cho đặt tên tác vụ default", () => {
    expect(() => parseTasks({ defaults: { model: "m", timeoutMs: 1000, backend: "acp" }, tasks: { default: { model: "m" } } })).toThrow(/dành riêng/);
  });
});
