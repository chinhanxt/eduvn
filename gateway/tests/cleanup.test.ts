import { existsSync, mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanWorkDir } from "../src/cleanup";

describe("cleanWorkDir", () => {
  it("xoá file cũ trong dữ liệu phiên của agy, giữ file mới và cấu hình", () => {
    const dir = mkdtempSync(join(tmpdir(), "work-"));
    const cli = join(dir, "gemini-0", "antigravity-cli");
    for (const sub of ["conversations", "brain/s1", "annotations", "implicit", "log", "bin"]) mkdirSync(join(cli, sub), { recursive: true });
    const old = [join(cli, "conversations", "a.db"), join(cli, "brain", "s1", "x.md"), join(cli, "annotations", "a.pbtxt"), join(cli, "implicit", "a.pb"), join(cli, "log", "a.log")];
    const keep = [join(cli, "conversations", "b.db"), join(cli, "bin", "webm_encoder")];
    for (const f of [...old, ...keep]) writeFileSync(f, "x");
    const past = (Date.now() - 48 * 3600_000) / 1000;
    for (const f of [...old, keep[1]!]) utimesSync(f, past, past);
    expect(cleanWorkDir(dir, 24 * 3600_000)).toBe(5);
    for (const f of old) expect(existsSync(f)).toBe(false);
    for (const f of keep) expect(existsSync(f)).toBe(true);
  });
  it("thư mục chưa có thì không lỗi", () => {
    expect(cleanWorkDir(join(tmpdir(), "khong-co-thu-muc-nay"), 1000)).toBe(0);
  });
});
