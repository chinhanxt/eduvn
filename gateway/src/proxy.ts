import { execFile } from "node:child_process";
import { connect } from "node:net";

export function portOpen(port: number, host = "127.0.0.1", timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const s = connect({ port, host });
    const done = (v: boolean) => {
      s.destroy();
      resolve(v);
    };
    s.once("connect", () => done(true));
    s.once("error", () => done(false));
    s.setTimeout(timeoutMs, () => done(false));
  });
}

/** Proxy xoay tài khoản riêng cho cổng AI (cổng 8900): bật nếu chưa chạy rồi chờ cổng mở. */
export async function ensureProxy(o: { port: number; pidFile: string; bin: string; waitMs?: number }): Promise<"running" | "started"> {
  if (await portOpen(o.port)) return "running";
  await new Promise<void>((resolve, reject) =>
    execFile(o.bin, ["proxy", "start", "--port", String(o.port), "--pid-file", o.pidFile], { timeout: 30000 }, (e) => (e ? reject(e) : resolve())),
  );
  const until = Date.now() + (o.waitMs ?? 15000);
  while (Date.now() < until) {
    if (await portOpen(o.port)) return "started";
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Proxy agy không mở cổng ${o.port}`);
}
