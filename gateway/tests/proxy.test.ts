import { readFileSync, writeFileSync, chmodSync, mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ensureProxy, portOpen } from "../src/proxy";

const fakeSwitch = fileURLToPath(new URL("./fixtures/fake-switch.mjs", import.meta.url));
async function freePort(): Promise<number> {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const port = (s.address() as { port: number }).port;
  await new Promise<void>((r) => s.close(() => r()));
  return port;
}

describe("proxy", () => {
  it("portOpen đúng/sai", async () => {
    const s = createServer();
    await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
    const port = (s.address() as { port: number }).port;
    expect(await portOpen(port)).toBe(true);
    await new Promise<void>((r) => s.close(() => r()));
    expect(await portOpen(port)).toBe(false);
  });
  it("cổng đã mở thì không bật thêm", async () => {
    const s = createServer();
    await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
    const port = (s.address() as { port: number }).port;
    expect(await ensureProxy({ port, pidFile: join(tmpdir(), "khong-dung.pid"), bin: "/khong/co" })).toBe("running");
    await new Promise<void>((r) => s.close(() => r()));
  });
  it("cổng chưa mở thì gọi agy-switch proxy start rồi chờ cổng mở", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sw-"));
    const bin = join(dir, "agy-switch");
    writeFileSync(bin, `#!/bin/sh\nexec "${process.execPath}" "${fakeSwitch}" "$@"\n`);
    chmodSync(bin, 0o755);
    const port = await freePort();
    const pidFile = join(dir, "proxy.pid");
    try {
      expect(await ensureProxy({ port, pidFile, bin, waitMs: 5000 })).toBe("started");
      expect(await portOpen(port)).toBe(true);
    } finally {
      process.kill(Number(readFileSync(pidFile, "utf8")), "SIGTERM");
    }
  });
});
