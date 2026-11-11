// Tiện ích dùng chung cho adapter chạy lệnh ngoài (ffmpeg, soffice, python…).
import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

export const run = promisify(execFile);

/** Lệnh có trên máy (đường dẫn tuyệt đối hoặc tìm trong PATH). */
export async function commandExists(cmd: string): Promise<boolean> {
  const can = (p: string) => access(p, constants.X_OK).then(() => true, () => false);
  if (cmd.includes("/")) return can(cmd);
  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) if (await can(path.join(dir, cmd))) return true;
  return false;
}

export const fileExists = (p: string) => access(p, constants.R_OK).then(() => true, () => false);

/** Lệnh + tiền tố khoá nặng: wrap=["heavy","run","eduvn-tts","--"] → bin "heavy", args [...wrap, cmd, ...args]. */
export function wrapped(wrap: string[] | undefined, cmd: string, args: string[]): [string, string[]] {
  const [bin, ...pre] = [...(wrap ?? []), cmd];
  return [bin as string, [...pre, ...args]];
}

export async function probeMs(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { timeout: 15_000 });
  return Math.round(Number.parseFloat(stdout) * 1000);
}

/** Bộ lọc ffmpeg đổi tốc độ đọc giữ cao độ (atempo chỉ nhận 0,5–2 mỗi tầng). */
export function atempo(speed: number): string | null {
  let f = Math.min(2, Math.max(0.5, speed));
  if (Math.abs(f - 1) < 1e-3) return null;
  const chain: string[] = [];
  while (f > 2) {
    chain.push("atempo=2.0");
    f /= 2;
  }
  chain.push(`atempo=${f.toFixed(4)}`);
  return chain.join(",");
}

/** Lỗi thiếu lệnh (ENOENT) → câu dễ hiểu. */
export const isMissing = (e: unknown) => (e as { code?: string } | null)?.code === "ENOENT";
