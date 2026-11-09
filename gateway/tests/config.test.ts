import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const base = { GATEWAY_TOKEN: "t".repeat(32) };

describe("loadConfig", () => {
  it("điền giá trị mặc định", () => {
    const c = loadConfig(base);
    expect(c.PORT).toBe(4340);
    expect(c.HOST).toBe("127.0.0.1");
    expect(c.AGY_BIN).toBe("agy");
    expect(c.AGY_SWITCH_BIN).toBe("agy-switch");
    expect(c.AGY_PROXY_PORT).toBe(8900);
    expect(c.AGY_MANAGE_PROXY).toBe(true);
    expect(c.AGY_PROCESSES).toBe(2);
    expect(c.MAX_CONCURRENCY).toBe(6);
    expect(c.SESSION_IDLE_MS).toBe(900000);
    expect(c.ANTHROPIC_API_KEY).toBe("");
    expect(c.WORK_DIR).toBe("/var/tmp/eduvn-gateway");
    expect([c.MAX_CONVERSATIONS, c.AGY_RECYCLE_SESSIONS, c.CHAT_RESERVED, c.CHAT_MAX_WAIT_MS]).toEqual([300, 150, 1, 30000]);
    expect(c.TASKS_FILE.endsWith("tasks.json")).toBe(true);
  });
  it("token phải đủ dài", () => {
    expect(() => loadConfig({ GATEWAY_TOKEN: "ngan" })).toThrow();
  });
  it("AGY_MANAGE_PROXY=0 tắt việc tự bật proxy", () => {
    expect(loadConfig({ ...base, AGY_MANAGE_PROXY: "0" }).AGY_MANAGE_PROXY).toBe(false);
  });
});
