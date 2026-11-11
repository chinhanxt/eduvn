import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createFasterWhisperAsr } from "../../src/providers/asr/fasterWhisper";
import { createOmnivoiceTts } from "../../src/providers/tts/omnivoice";
import { createVieneuTts, parsePresetList } from "../../src/providers/tts/vieneu";
import { atempo, wrapped } from "../../src/providers/util";

const dirs: string[] = [];
const tmp = (p: string) => {
  const d = mkdtempSync(path.join(tmpdir(), p));
  dirs.push(d);
  return d;
};
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Lệnh giả kiểu vieneu-say/omnivoice_say: ghi tham số ra args.txt, sinh sóng sin 1 s mỗi câu + segments. */
function fakeSay(): { cmd: string; args: () => string } {
  const dir = tmp("eduvn-fakesay-");
  const f = path.join(dir, "say");
  writeFileSync(
    f,
    `#!/usr/bin/env bash
printf '%s\\n' "$@" > "${dir}/args.txt"
while [ $# -gt 0 ]; do case "$1" in -f) F="$2"; shift 2;; -o) O="$2"; shift 2;; --segments) S="$2"; shift 2;; *) shift;; esac; done
N=$(grep -c . "$F")
ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=330:duration=$((N * 125 / 100 + 1))" "$O"
python3 - "$F" "$S" <<'PY'
import json,sys
lines=[l.strip() for l in open(sys.argv[1],encoding="utf-8") if l.strip()]
json.dump([{"text":l,"start":i*1.25,"end":i*1.25+1.0} for i,l in enumerate(lines)],open(sys.argv[2],"w"))
PY
`,
  );
  chmodSync(f, 0o755);
  return { cmd: f, args: () => readFileSync(path.join(dir, "args.txt"), "utf8") };
}

describe("tiện ích", () => {
  it("atempo kẹp 0,5–2, bỏ khi = 1", () => {
    expect(atempo(1)).toBeNull();
    expect(atempo(1.25)).toBe("atempo=1.2500");
    expect(atempo(5)).toBe("atempo=2.0000");
    expect(atempo(0.1)).toBe("atempo=0.5000");
  });
  it("wrapped thêm tiền tố khoá nặng", () => {
    expect(wrapped(["heavy", "run", "x", "--"], "python3", ["a.py"])).toEqual(["heavy", ["run", "x", "--", "python3", "a.py"]]);
    expect(wrapped(undefined, "python3", ["a.py"])).toEqual(["python3", ["a.py"]]);
  });
});

describe("VieNeu", () => {
  it("đọc danh sách giọng có sẵn", () => {
    expect(parsePresetList("Ngọc Linh — Nữ · Bắc · Phong cách kể chuyện\nAdam — Nam · Nam · Giọng đọc tự nhiên\nrác\n")).toEqual([
      { id: "Ngọc Linh", label: "Ngọc Linh", gender: "nu", region: "Bắc", style: "Phong cách kể chuyện" },
      { id: "Adam", label: "Adam", gender: "nam", region: "Nam", style: "Giọng đọc tự nhiên" },
    ]);
  });
  it("giọng theo lời gọi (preset / file mẫu) đè giọng mặc định; tốc độ 1,5 làm câu ngắn lại", async () => {
    const say = fakeSay();
    const tts = createVieneuTts({ cmd: say.cmd, ref: "/mac-dinh.wav" });
    const out = tmp("eduvn-tts-");
    const [a] = await tts.synthMany([{ text: "Câu một", name: "a" }], out);
    expect(say.args()).toContain("--ref\n/mac-dinh.wav");
    expect(Math.abs(a!.durationMs - 1200)).toBeLessThan(120);
    const [b] = await tts.synthMany([{ text: "Câu hai", name: "b" }], out, { voice: { preset: "Ngọc Linh" }, speed: 1.5 });
    expect(say.args()).toContain("--voice\nNgọc Linh");
    expect(say.args()).not.toContain("--ref");
    expect(b!.durationMs).toBeLessThan(1000);
    await tts.synthMany([{ text: "Câu ba", name: "c" }], out, { voice: { refFile: "/thu-vien/co-lan.wav" } });
    expect(say.args()).toContain("--ref\n/thu-vien/co-lan.wav");
    expect(existsSync(path.join(out, "c.mp3"))).toBe(true);
  });
  it("check: thiếu lệnh / thiếu giọng mẫu → không sẵn sàng", async () => {
    expect((await createVieneuTts({ cmd: "/khong/co/lenh" }).check()).ok).toBe(false);
    const say = fakeSay();
    expect((await createVieneuTts({ cmd: say.cmd, ref: "/khong/co.wav" }).check()).detail).toMatch(/Thiếu file giọng mẫu/);
    expect((await createVieneuTts({ cmd: say.cmd, voice: "Adam" }).check())).toMatchObject({ ok: true, detail: "Sẵn sàng · giọng Adam" });
  });
});

describe("OmniVoice", () => {
  it("gọi script với file mẫu + lời mẫu + tốc độ gốc của engine (không atempo), qua khoá nặng", async () => {
    const say = fakeSay();
    const tts = createOmnivoiceTts({ python: say.cmd, script: "/s/omnivoice_say.py", ref: "/mau.wav", refText: "Lời mẫu", wrap: [] });
    const out = tmp("eduvn-omni-");
    const [r] = await tts.synthMany([{ text: "Xin chào", name: "x" }], out, { voice: { refFile: "/lib/a.wav", refText: "Câu mẫu A" }, speed: 1.5 });
    const args = say.args();
    expect(args).toContain("/s/omnivoice_say.py");
    expect(args).toContain("--ref\n/lib/a.wav\n--ref-text\nCâu mẫu A");
    expect(args).toContain("--speed\n1.5");
    expect(Math.abs(r!.durationMs - 1200)).toBeLessThan(120);
    await tts.synthMany([{ text: "Mặc định", name: "y" }], out);
    expect(say.args()).toContain("--ref\n/mau.wav\n--ref-text\nLời mẫu");
  });
  it("không có giọng mẫu → null (không ném)", async () => {
    const tts = createOmnivoiceTts({ python: fakeSay().cmd });
    expect(await tts.synthMany([{ text: "Xin chào", name: "x" }], tmp("eduvn-omni-"))).toEqual([null]);
  });
  it("check báo thiếu model trong cache", async () => {
    const h = await createOmnivoiceTts({ hfHome: tmp("eduvn-hf-") }).check();
    expect(h).toMatchObject({ ok: false });
    expect(h.detail).toMatch(/OmniVoice/);
  });
});

describe("faster-whisper", () => {
  function fakePy(json: string, code = 0) {
    const dir = tmp("eduvn-fakepy-");
    const f = path.join(dir, "py");
    writeFileSync(f, `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${dir}/args.txt"\necho "đang nạp model" \necho '${json}'\n${code ? `echo "CUDA out of memory" >&2\nexit ${code}` : ""}\n`);
    chmodSync(f, 0o755);
    return { py: f, args: () => readFileSync(path.join(dir, "args.txt"), "utf8") };
  }
  it("đọc dòng JSON cuối, đổi giây → ms, truyền ngôn ngữ + model + gợi ý", async () => {
    const f = fakePy('{"text":"xin chào cả lớp","language":"vi","duration":2.5,"segments":[{"start":0,"end":2.4,"text":"xin chào cả lớp"}]}');
    const asr = createFasterWhisperAsr({ python: f.py, script: "/s/w.py", model: "small" });
    const r = await asr.transcribe(Buffer.alloc(2000, 1), { language: "vi", prompt: "định luật Ôm" });
    expect(r).toEqual({ text: "xin chào cả lớp", language: "vi", durationMs: 2500, segments: [{ start: 0, end: 2.4, text: "xin chào cả lớp" }] });
    expect(f.args()).toContain("/s/w.py");
    expect(f.args()).toContain("--model\nsmall\n--language\nvi\n--device\nauto\n--prompt\nđịnh luật Ôm");
  });
  it("bản ghi rỗng → lỗi nhập; lệnh lỗi → nêu dòng lỗi cuối", async () => {
    const asr = createFasterWhisperAsr({ python: fakePy("{}", 3).py });
    await expect(asr.transcribe(Buffer.alloc(10))).rejects.toThrow(/Không nghe thấy tiếng/);
    await expect(asr.transcribe(Buffer.alloc(2000, 1))).rejects.toThrow("Nhận dạng giọng nói lỗi: CUDA out of memory");
  });
  it("check theo model trong cache HuggingFace", async () => {
    const h = await createFasterWhisperAsr({ hfHome: tmp("eduvn-hf-"), model: "small" }).check();
    expect(h.detail).toMatch(/Chưa có model faster-whisper "small"/);
  });
});
