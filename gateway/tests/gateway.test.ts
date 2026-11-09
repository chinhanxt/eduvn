import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import { agyArgs, buildGateway } from "../src/gateway";

const fake = fileURLToPath(new URL("./fixtures/fake-acp.mjs", import.meta.url));
const tasksFile = fileURLToPath(new URL("../tasks.json", import.meta.url));
const TOKEN = "t".repeat(32);
const gws: Awaited<ReturnType<typeof buildGateway>>[] = [];
afterEach(async () => {
  await Promise.all(gws.splice(0).map((g) => g.close()));
});

describe("agyArgs", () => {
  it("chạy agy acp an toàn: không bỏ qua quyền, proxy riêng, thư mục tạm riêng", () => {
    const cfg = loadConfig({ GATEWAY_TOKEN: TOKEN, WORK_DIR: "/tmp/gw-work" });
    const o = agyArgs(cfg, 1);
    expect(o.command).toBe("agy");
    expect(o.args).toEqual(["acp", "--include-default-customizations=false", "--disable-telemetry", "--sandbox", "--gemini_dir", "/tmp/gw-work/gemini-1"]);
    expect(o.args.join(" ")).not.toContain("dangerously");
    expect(o.cwd).toBe("/tmp/gw-work/cwd");
    expect(o.env).toEqual({ CLOUD_CODE_URL: "http://127.0.0.1:8900" });
    expect(o.dataDir).toBe("/tmp/gw-work/gemini-1/antigravity-cli");
  });
});

describe("buildGateway (agent giả)", () => {
  it("chat có khoá giữ ngữ cảnh qua hai lượt, health báo nhóm tiến trình", async () => {
    const work = mkdtempSync(join(tmpdir(), "gw-"));
    const cfg = loadConfig({ GATEWAY_TOKEN: TOKEN, WORK_DIR: work, TASKS_FILE: tasksFile, AGY_MANAGE_PROXY: "0", AGY_PROCESSES: "2" });
    const gw = await buildGateway(cfg, { logger: false, agentOptions: () => ({ command: process.execPath, args: [fake], cwd: work }) });
    gws.push(gw);
    const ask = (content: string) =>
      gw.app.inject({
        method: "POST",
        url: "/v1/chat/completions",
        headers: { authorization: `Bearer ${TOKEN}` },
        payload: { model: "fake-smart", user: "hs-42", messages: [{ role: "user", content }] },
      });
    expect((await ask("một")).json().choices[0].message.content).toBe("[fake-smart#1] một");
    expect((await ask("hai")).json().choices[0].message.content).toBe("[fake-smart#2] hai");
    const h = (await gw.app.inject({ method: "GET", url: "/health" })).json();
    expect(h).toMatchObject({ ok: true, pool: { size: 2, alive: 2, conversations: 1 }, limiter: { active: 0, queued: 0 } });
    const models = (await gw.app.inject({ method: "GET", url: "/v1/models", headers: { authorization: `Bearer ${TOKEN}` } })).json().data.map((m: { id: string }) => m.id);
    expect(models).toContain("task:gia_su_chat");
    expect(models).toContain("fake-smart");
  });
});

describe("buildGateway proxy và health", () => {
  it("proxy do cổng bật thì cổng tắt khi close; health có metrics", async () => {
    const { mkdirSync, writeFileSync, chmodSync, readFileSync, existsSync } = await import("node:fs");
    const { createServer } = await import("node:net");
    const work = mkdtempSync(join(tmpdir(), "gw-"));
    const bin = join(work, "agy-switch");
    const log = join(work, "switch.log");
    const fakeSwitch = fileURLToPath(new URL("./fixtures/fake-switch.mjs", import.meta.url));
    writeFileSync(bin, `#!/bin/sh\necho "$@" >> "${log}"\nif [ "$2" = "start" ]; then exec "${process.execPath}" "${fakeSwitch}" "$@"; else kill $(cat "$5" 2>/dev/null) 2>/dev/null; fi\n`);
    chmodSync(bin, 0o755);
    mkdirSync(work, { recursive: true });
    const s = createServer();
    await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
    const port = (s.address() as { port: number }).port;
    await new Promise<void>((r) => s.close(() => r()));
    const cfg = loadConfig({ GATEWAY_TOKEN: TOKEN, WORK_DIR: work, TASKS_FILE: tasksFile, AGY_SWITCH_BIN: bin, AGY_PROXY_PORT: String(port), AGY_PROCESSES: "1" });
    const gw = await buildGateway(cfg, { logger: false, agentOptions: () => ({ command: process.execPath, args: [fake], cwd: work }) });
    const h = (await gw.app.inject({ method: "GET", url: "/health" })).json();
    expect(h.metrics).toEqual({ requests: 0, errors: 0, fallbacks: 0, retries: 0, toolBlocked: 0, restarts: 0 });
    await gw.close();
    const lines = readFileSync(log, "utf8").trim().split("\n");
    expect(lines[0]).toContain("proxy start");
    expect(lines.at(-1)).toBe(`proxy stop --port ${port} --pid-file ${join(work, "proxy.pid")}`);
    expect(existsSync(log)).toBe(true);
  });
});
