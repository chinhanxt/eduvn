import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadTasks, resolveRoute } from "../src/routes";

let dir: string;
const base = { defaults: { model: "m-mac-dinh", timeoutMs: 180000, backend: "acp" }, tasks: { gia_su_chat: { model: "m1", priority: "interactive" } } };
const write = (rel: string, data: unknown) => writeFileSync(join(dir, rel), typeof data === "string" ? data : JSON.stringify(data));

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tasksd-"));
  write("tasks.json", base);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("tasks.d", () => {
  it("không có thư mục tasks.d → chỉ tasks.json", () => {
    expect(Object.keys(loadTasks(join(dir, "tasks.json")).tasks)).toEqual(["gia_su_chat"]);
  });
  it("gộp mọi *.json theo thứ tự tên, task mới dùng mặc định của tasks.json", () => {
    mkdirSync(join(dir, "tasks.d"));
    write("tasks.d/g2.json", { tasks: { sinh_canh: { model: "m2", json: true } } });
    write("tasks.d/g1.json", { description: "gói G1", tasks: { ve_anh: { model: ["m3", "m4"], timeoutMs: 300000 } } });
    write("tasks.d/ghi-chu.txt", "bỏ qua");
    const t = loadTasks(join(dir, "tasks.json"));
    expect(Object.keys(t.tasks)).toEqual(["gia_su_chat", "ve_anh", "sinh_canh"]);
    expect(resolveRoute(t, "task:ve_anh")).toMatchObject({ models: ["m3", "m4"], timeoutMs: 300000, backend: "acp" });
    expect(resolveRoute(t, "sinh_canh")).toMatchObject({ json: true, timeoutMs: 180000, priority: 1 });
    expect(resolveRoute(t, "default").model).toBe("m-mac-dinh");
  });
  it("trùng tên với tasks.json → lỗi nêu rõ tên task và hai file", () => {
    mkdirSync(join(dir, "tasks.d"));
    write("tasks.d/g3.json", { tasks: { gia_su_chat: { model: "khac" } } });
    expect(() => loadTasks(join(dir, "tasks.json"))).toThrow('Tác vụ "gia_su_chat" bị khai báo hai lần: tasks.json và tasks.d/g3.json');
  });
  it("trùng tên giữa hai file tasks.d → lỗi nêu cả hai file", () => {
    mkdirSync(join(dir, "tasks.d"));
    write("tasks.d/g1.json", { tasks: { tim_web: { model: "a" } } });
    write("tasks.d/g6.json", { tasks: { tim_web: { model: "b" } } });
    expect(() => loadTasks(join(dir, "tasks.json"))).toThrow('Tác vụ "tim_web" bị khai báo hai lần: tasks.d/g1.json và tasks.d/g6.json');
  });
  it("file hỏng hoặc sai dạng → lỗi nêu tên file", () => {
    mkdirSync(join(dir, "tasks.d"));
    write("tasks.d/g5.json", "{ chưa xong");
    expect(() => loadTasks(join(dir, "tasks.json"))).toThrow(/g5\.json/);
    write("tasks.d/g5.json", { tasks: { "Sai Tên": { model: "m" } } });
    expect(() => loadTasks(join(dir, "tasks.json"))).toThrow(/tasks\.d\/g5\.json không hợp lệ/);
    write("tasks.d/g5.json", { tasks: { default: { model: "m" } } });
    expect(() => loadTasks(join(dir, "tasks.json"))).toThrow(/dành riêng/);
  });
  it("tasks.json + tasks.d trong repo gộp được, không trùng", () => {
    const t = loadTasks(fileURLToPath(new URL("../tasks.json", import.meta.url)));
    expect(Object.keys(t.tasks)).toContain("gia_su_chat");
  });
});
