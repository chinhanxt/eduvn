// /gv/cai-dat/nha-cung-cap — nhà cung cấp phụ của trường: giọng đọc (thư viện giọng, nhân giọng, giọng mặc định), nhận dạng giọng nói,
// đọc tài liệu; mỗi nhà cung cấp có trạng thái + Kiểm tra + Thử. Tab trên URL (?tab=), thao tác ghi khoá theo promise + toast.
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ApiError } from "../apiCore";
import { Icon } from "../ui/Icon";
import { Button, IconButton } from "../ui/components/Button";
import { Badge, Segmented } from "../ui/components/Chip";
import { ConfirmDialog } from "../ui/components/Dialog";
import { Field, Input, Select, Textarea } from "../ui/components/Field";
import { Skeleton } from "../ui/components/Skeleton";
import { EmptyState, ErrorState } from "../ui/components/States";
import { Tabs } from "../ui/components/Tabs";
import { useToast } from "../ui/components/Toast";
import { newIdempotencyKey } from "../ui/data/action";
import { invalidate, setQueryData, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { PageHead } from "../ui/shell/PageHead";
import { CAPS_KEY, CONFIG_KEY, VOICES_KEY, addVoice, checkProviders, fetchCaps, fetchConfig, fetchVoices, removeVoice, saveConfig, toBase64, tryProvider, voiceSampleBlob } from "./api";
import { type Caps, type Health, KIND_ORDER, type ProviderInfo, type ProviderKind, type Voice, acceptOf, formatGroups, genderVi, secondsVi, speedVi } from "./logic";
import { useAsr } from "./useAsr";
import { useTts } from "./useTts";
import { SAMPLE_LINE, VoicePicker } from "./VoicePicker";
import "./providers.css";

type Tab = "giong" | "nhan-dang" | "tai-lieu" | "khac";
const TABS: { value: Tab; label: string }[] = [
  { value: "giong", label: "Giọng đọc" },
  { value: "nhan-dang", label: "Nhận dạng giọng nói" },
  { value: "tai-lieu", label: "Đọc tài liệu" },
  { value: "khac", label: "Ảnh · tìm web · video" },
];

function msgOf(e: unknown): string {
  if (e instanceof TypeError) return "Mất kết nối — kiểm tra mạng rồi thử lại.";
  if (e instanceof ApiError) {
    const issues = (e.body as { issues?: unknown[] } | null)?.issues;
    if (issues?.length && typeof issues[0] === "string") return issues.join("\n");
    if (e.status === 403) return "Chỉ quản trị trường đổi được cài đặt này.";
    return e.message;
  }
  return e instanceof Error ? e.message : "Có lỗi, thử lại sau.";
}

/** Chạy thao tác + toast; trả promise để nút tự khoá. */
function useRun() {
  const toast = useToast();
  return async <R,>(fn: () => Promise<R>, ok?: string): Promise<R | undefined> => {
    try {
      const r = await fn();
      if (ok) toast({ title: ok, kind: "ok" });
      return r;
    } catch (e) {
      toast({ title: "Chưa làm được", msg: msgOf(e), kind: "err", life: 6000 });
      return undefined;
    }
  };
}

export function NhaCungCap() {
  usePageMeta("Nhà cung cấp AI", [{ label: "Cài đặt" }, { label: "Nhà cung cấp AI" }]);
  const [tab, setTab] = useUrlState<string>("tab", "giong");
  const caps = useQuery(CAPS_KEY, fetchCaps);
  const config = useQuery(CONFIG_KEY, fetchConfig);
  const cur = (TABS.some((t) => t.value === tab) ? tab : "giong") as Tab;
  const canManage = !!config.data?.canManage;
  return (
    <>
      <PageHead title="Nhà cung cấp AI" tabs={<Tabs label="Loại nhà cung cấp" items={TABS} value={cur} onChange={setTab} />} />
      <p className="pv-lede">Mặc định mọi thứ chạy trên máy chủ của trường hoặc ngay trong trình duyệt — miễn phí, dữ liệu không ra ngoài. {canManage ? "Cô/thầy là quản trị nên đổi được nhà cung cấp mặc định." : "Chỉ quản trị trường đổi được nhà cung cấp mặc định; cô/thầy vẫn thêm giọng và thử được."}</p>
      {caps.error && !caps.data ? (
        <ErrorState onRetry={() => caps.refetch()} />
      ) : (
        <div className="pv-tab" key={cur}>
          {cur === "giong" && <VoiceTab caps={caps.data} canManage={canManage} />}
          {cur === "nhan-dang" && <AsrTab caps={caps.data} canManage={canManage} />}
          {cur === "tai-lieu" && <DocsTab caps={caps.data} canManage={canManage} />}
          {cur === "khac" && <OtherTab caps={caps.data} />}
        </div>
      )}
    </>
  );
}

// ── Danh sách nhà cung cấp của một loại ─────────────────────────────────────

function ProviderList({ kind, caps, canManage, title }: { kind: ProviderKind; caps: Caps | undefined; canManage: boolean; title?: string }) {
  const cap = caps?.kinds[kind];
  const health = useQuery<Health[]>(cap ? `nha-cung-cap/kiem-tra/${kind}` : null, () => checkProviders(kind), { staleMs: 60_000 });
  const run = useRun();
  const disabled = new Set(cap?.disabled ?? []);
  // Bản đã tắt vẫn hiện (mờ) để bật lại.
  const ids = (cap?.all ?? []).map((p) => p.id);
  const infoOf = (id: string): ProviderInfo | undefined => cap?.all.find((p) => p.id === id);
  const apply = (next: Caps) => setQueryData(CAPS_KEY, next);
  return (
    <section className="pane" aria-label={title ?? cap?.label ?? kind} data-testid={`pv-list-${kind}`}>
      <div className="ghd">
        <Icon name="plug" size="sm" /> {title ?? cap?.label ?? "…"} <span className="n">{cap ? `${cap.providers.length} đang bật` : ""}</span>
        <span className="grow" />
        <Button size="sm" variant="ghost" icon="refresh" onClick={() => health.refetch()} disabled={!cap} data-testid={`pv-check-${kind}`}>
          Kiểm tra
        </Button>
      </div>
      {!cap ? (
        <div className="pv-sk">
          <Skeleton w="60%" h={14} />
          <Skeleton w="85%" h={12} />
          <Skeleton w="50%" h={14} />
        </div>
      ) : ids.length === 0 ? (
        <EmptyState icon="plug" title="Máy chủ chưa có nhà cung cấp loại này" text="Đợt sau sẽ thêm phương án tự chạy miễn phí." />
      ) : (
        <ul className="rows pv-rows">
          {ids.map((id) => {
            const p = infoOf(id);
            const off = disabled.has(id);
            const h = health.data?.find((x) => x.id === id);
            const isDef = cap.default === id;
            return (
              <li key={id} className={off ? "is-off" : undefined} data-testid={`pv-${kind}-${id}`}>
                <span className="lead">
                  <Icon name={p?.clientOnly ? "eye" : p?.gpu ? "spark" : "box"} size="sm" />
                </span>
                <div className="g">
                  <b>
                    {p?.label ?? id}
                    {isDef && <Badge tone="accent">Mặc định</Badge>}
                  </b>
                  <small title={p?.description}>{off ? "Trường đã tắt" : p?.description}</small>
                  <span className="pv-tags">
                    {p?.clientOnly ? <span>Trong trình duyệt</span> : p && <span>{p.local ? "Trên máy chủ trường" : "Qua cổng AI"}</span>}
                    {p?.gpu && <span>GPU</span>}
                    {p?.free && <span>Miễn phí</span>}
                    {p?.clone && <span>Nhân giọng</span>}
                  </span>
                </div>
                <span className="pv-health" aria-live="polite">
                  {health.fetching && !h ? (
                    <Badge icon="loader">Đang kiểm</Badge>
                  ) : h ? (
                    <Badge tone={h.ok ? "ok" : "warn"}>{h.ok ? "Sẵn sàng" : "Chưa sẵn sàng"}</Badge>
                  ) : null}
                  {h && <small title={h.detail}>{h.detail}</small>}
                </span>
                {canManage && (
                  <span className="t-acts">
                    {!p?.clientOnly && !isDef && !off && (
                      <Button size="sm" variant="ghost" onClick={() => run(async () => apply(await saveConfig({ kind, providerId: id, isDefault: true })), `Đã đặt ${p?.label ?? id} làm mặc định`)} data-testid={`pv-default-${id}`}>
                        Đặt mặc định
                      </Button>
                    )}
                    <Button size="sm" variant={off ? "primary" : "ghost"} onClick={() => run(async () => apply(await saveConfig({ kind, providerId: id, enabled: off, ...(off ? {} : { isDefault: false }) })), off ? "Đã bật lại" : "Đã tắt cho cả trường")} data-testid={`pv-toggle-${id}`}>
                      {off ? "Bật" : "Tắt"}
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Giọng đọc ───────────────────────────────────────────────────────────────

function VoiceTab({ caps, canManage }: { caps: Caps | undefined; canManage: boolean }) {
  const voices = useQuery(VOICES_KEY, fetchVoices);
  const [adding, setAdding] = useUrlState<string>("them", "", { mode: "push" });
  const [toDel, setToDel] = useState<Voice | null>(null);
  const run = useRun();
  const lib = voices.data?.filter((v) => v.source === "thu-vien") ?? [];
  return (
    <div className="split pv-split">
      <div className="pv-col">
        <section className="pane" aria-label="Thư viện giọng" data-testid="voice-library">
          <div className="ghd">
            <Icon name="mic" size="sm" /> Thư viện giọng của trường <span className="n">{voices.data ? lib.length : ""}</span>
            <span className="grow" />
            <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(adding ? "" : "1")} pressed={!!adding} data-testid="voice-add-open">
              Thêm giọng
            </Button>
          </div>
          {adding && <AddVoice caps={caps} onClose={() => setAdding("")} />}
          {voices.data === undefined ? (
            voices.error ? (
              <ErrorState text={msgOf(voices.error)} onRetry={() => voices.refetch()} />
            ) : (
              <ul className="rows" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <li key={i}>
                    <Skeleton circle w={28} h={28} />
                    <div className="g">
                      <Skeleton w="40%" h={14} />
                      <Skeleton w="65%" h={12} />
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : lib.length === 0 ? (
            !adding && <EmptyState icon="mic" title="Chưa có giọng riêng" text="Tải lên 5–15 giây giọng cô/thầy đọc rõ một câu — bài giảng AI và trợ giảng sẽ nói bằng giọng đó." action={<Button size="sm" variant="primary" icon="upload" onClick={() => setAdding("1")}>Tải mẫu giọng</Button>} />
          ) : (
            <ul className="rows pv-rows">
              {lib.map((v) => (
                <VoiceRow key={v.id} v={v} caps={caps} onDelete={() => setToDel(v)} />
              ))}
            </ul>
          )}
        </section>
        <ProviderList kind="tts" caps={caps} canManage={canManage} title="Engine giọng đọc" />
      </div>
      <DefaultVoice caps={caps} canManage={canManage} />
      <ConfirmDialog
        open={!!toDel}
        title={`Xoá giọng “${toDel?.name ?? ""}”?`}
        text="File mẫu bị xoá khỏi máy chủ; bài giảng đã đọc bằng giọng này giữ nguyên tiếng. Không hoàn tác được."
        confirmLabel="Xoá giọng"
        onClose={() => setToDel(null)}
        onConfirm={() =>
          toDel &&
          run(async () => {
            await removeVoice(toDel.id);
            setQueryData<Voice[]>(VOICES_KEY, (old) => (old ?? []).filter((x) => x.id !== toDel.id));
            invalidate(VOICES_KEY);
          }, "Đã xoá giọng")
        }
      />
    </div>
  );
}

function VoiceRow({ v, caps, onDelete }: { v: Voice; caps: Caps | undefined; onDelete: () => void }) {
  const tts = useTts();
  const [sample, setSample] = useState<"idle" | "loading" | "playing">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();
  useEffect(() => () => audio.current?.pause(), []);
  const engine = caps?.kinds.tts.providers.find((p) => p.id === v.provider)?.label ?? v.provider;
  const playSample = async () => {
    if (sample !== "idle") {
      audio.current?.pause();
      setSample("idle");
      return;
    }
    setSample("loading");
    try {
      const url = URL.createObjectURL(await voiceSampleBlob(v.id));
      const a = new Audio(url);
      audio.current = a;
      a.onended = () => (setSample("idle"), URL.revokeObjectURL(url));
      await a.play();
      setSample("playing");
    } catch (e) {
      setSample("idle");
      toast({ title: "Không phát được mẫu", msg: msgOf(e), kind: "err" });
    }
  };
  const busy = tts.state === "loading" || tts.state === "playing";
  return (
    <li data-testid="voice-row">
      <span className="lead pv-av" aria-hidden>
        {v.name.trim().slice(0, 1).toUpperCase()}
      </span>
      <div className="g">
        <b>{v.name}</b>
        <small>{[engine, genderVi(v.gender), v.durationMs ? `mẫu ${secondsVi(v.durationMs)}` : "", speedVi(v.speed), ...v.tags].filter(Boolean).join(" · ")}</small>
        {tts.error && <small className="pv-err">{tts.error}</small>}
      </div>
      <span className="t-acts">
        <Button size="sm" variant="ghost" icon={sample === "playing" ? "stop" : "eye"} aria-busy={sample === "loading" || undefined} onClick={() => void playSample()} data-testid="voice-sample">
          {sample === "playing" ? "Dừng" : "Nghe mẫu"}
        </Button>
        <Button size="sm" icon={tts.state === "loading" ? "loader" : busy ? "stop" : "play"} aria-busy={tts.state === "loading" || undefined} onClick={() => void (busy ? tts.stop() : tts.speak(SAMPLE_LINE, { voiceId: v.id }))} data-testid="voice-speak">
          {tts.state === "loading" ? "Đang đọc…" : busy ? "Dừng" : "Nghe thử"}
        </Button>
        {v.mine !== false && <IconButton size="sm" icon="trash" label={`Xoá giọng ${v.name}`} onClick={onDelete} />}
      </span>
    </li>
  );
}

/** Ghi âm mẫu giọng ngay trên trang (MediaRecorder) → Blob. */
function useRecorder() {
  const [state, setState] = useState<"idle" | "rec">("idle");
  const [secs, setSecs] = useState(0);
  const r = useRef<{ rec: MediaRecorder; stream: MediaStream; t: number } | null>(null);
  useEffect(() => () => r.current?.stream.getTracks().forEach((x) => x.stop()), []);
  const start = async (onDone: (b: Blob) => void, onErr: (m: string) => void) => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onErr("Chưa cho phép dùng micro — bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép.");
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((x) => x.stop());
      clearInterval(r.current?.t);
      r.current = null;
      setState("idle");
      onDone(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };
    const t0 = Date.now();
    r.current = { rec, stream, t: window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setSecs(s);
      if (s >= 30) rec.stop();
    }, 250) };
    setSecs(0);
    rec.start();
    setState("rec");
  };
  const stop = () => r.current?.rec.state === "recording" && r.current.rec.stop();
  return { state, secs, start, stop, supported: typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia };
}

function AddVoice({ caps, onClose }: { caps: Caps | undefined; onClose: () => void }) {
  const engines = (caps?.kinds.tts.providers ?? []).filter((p) => p.clone && !p.clientOnly);
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<string>("vieneu");
  const [refText, setRefText] = useState("");
  const [gender, setGender] = useState<"" | "nam" | "nu">("");
  const [speed, setSpeed] = useState(1);
  const [file, setFile] = useState<{ blob: Blob; label: string } | null>(null);
  const [err, setErr] = useState<{ name?: string; file?: string; refText?: string }>({});
  const [key] = useState(newIdempotencyKey);
  const rec = useRecorder();
  const toast = useToast();
  const run = useRun();
  const preview = useRef<string | null>(null);
  useEffect(() => {
    if (engines.length && !engines.some((e) => e.id === engine)) setEngine(engines[0]!.id);
  }, [engines, engine]);
  useEffect(() => () => void (preview.current && URL.revokeObjectURL(preview.current)), []);
  const omni = engine === "omnivoice";
  const submit = async () => {
    const e: typeof err = {};
    if (!name.trim()) e.name = "Đặt tên để chọn giọng sau này, vd “Cô Lan — giọng giảng”.";
    if (!file) e.file = "Chọn file mẫu hoặc bấm Ghi âm.";
    if (omni && !refText.trim()) e.refText = "OmniVoice cần đúng câu đã nói trong mẫu.";
    setErr(e);
    if (Object.keys(e).length || !file) return;
    const v = await run(async () => addVoice({ name, provider: engine, audioBase64: await toBase64(file.blob), refText, gender: gender || undefined, speed }, key), `Đã thêm giọng “${name.trim()}”`);
    if (v) {
      setQueryData<Voice[]>(VOICES_KEY, (old) => [v, ...(old ?? [])]);
      invalidate(VOICES_KEY);
      onClose();
    }
  };
  return (
    <div className="pv-add" data-testid="voice-add">
      <div className="pv-add-grid">
        <Field label="Tên giọng" error={err.name}>
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Cô Lan — giọng giảng" autoFocus data-testid="voice-name" />
        </Field>
        <div className="field">
          <span className="lbl">Engine nhân giọng</span>
          {engines.length ? <Segmented label="Engine nhân giọng" options={engines.map((x) => ({ value: x.id, label: x.label }))} value={engine} onChange={setEngine} /> : <span className="caption">Máy chủ chưa có engine nhân giọng.</span>}
          <span className="hint">{omni ? "Giống giọng mẫu hơn, chậm hơn; cần lời mẫu." : "Nhanh; dùng 8 giây đầu của mẫu."}</span>
        </div>
        <Field label="File mẫu (3–30 giây, nói rõ, ít tiếng ồn)" error={err.file} hint={file ? file.label : "wav, mp3, m4a, webm…"}>
          <span className="pv-file">
            <label className="btn sm">
              <Icon name="upload" size="sm" />
              <span>Chọn file</span>
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
                hidden
                data-testid="voice-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 25 * 1024 * 1024) return setErr({ ...err, file: "File quá lớn (tối đa 25 MB)" });
                  setFile({ blob: f, label: `${f.name} · ${(f.size / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} KB` });
                  setErr({ ...err, file: undefined });
                }}
              />
            </label>
            {rec.supported && (
              <Button
                size="sm"
                variant={rec.state === "rec" ? "danger" : "default"}
                icon={rec.state === "rec" ? "stop" : "mic"}
                onClick={() =>
                  rec.state === "rec"
                    ? rec.stop()
                    : void rec.start(
                        (b) => {
                          if (preview.current) URL.revokeObjectURL(preview.current);
                          preview.current = URL.createObjectURL(b);
                          setFile({ blob: b, label: `Bản ghi trên trang · ${(b.size / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} KB` });
                        },
                        (m) => toast({ title: "Không ghi âm được", msg: m, kind: "err" }),
                      )
                }
                data-testid="voice-record"
              >
                {rec.state === "rec" ? `Dừng · ${rec.secs} s` : "Ghi âm"}
              </Button>
            )}
            {preview.current && file?.label.startsWith("Bản ghi") && <audio controls src={preview.current} className="pv-audio" />}
          </span>
        </Field>
        <Field label={omni ? "Lời mẫu (bắt buộc)" : "Lời mẫu (không bắt buộc)"} error={err.refText} hint="Gõ đúng câu đã nói trong file mẫu.">
          <Textarea rows={2} value={refText} maxLength={1000} onChange={(e) => setRefText(e.target.value)} data-testid="voice-reftext" />
        </Field>
        <Field label="Giới tính">
          <Select value={gender} onChange={(e) => setGender(e.target.value as "" | "nam" | "nu")}>
            <option value="">Không ghi</option>
            <option value="nu">Nữ</option>
            <option value="nam">Nam</option>
          </Select>
        </Field>
        <label className="field">
          <span className="lbl">Tốc độ mặc định <b className="num">{speedVi(speed)}</b></span>
          <input type="range" min={0.5} max={2} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-valuetext={speedVi(speed)} />
        </label>
      </div>
      <div className="fp-ft">
        <span className="caption">Chỉ dùng giọng của chính cô/thầy hoặc người đã đồng ý.</span>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="primary" icon="check" onClick={submit} disabled={!engines.length} data-testid="voice-save">
          Lưu giọng
        </Button>
      </div>
    </div>
  );
}

function DefaultVoice({ caps, canManage }: { caps: Caps | undefined; canManage: boolean }) {
  const opts = caps?.kinds.tts.options ?? {};
  const [voice, setVoice] = useState("");
  const [speed, setSpeed] = useState(1);
  const run = useRun();
  const init = useRef(false);
  useEffect(() => {
    if (!caps || init.current) return;
    init.current = true;
    setVoice(typeof opts.voiceId === "string" ? opts.voiceId : "");
    setSpeed(typeof opts.speed === "number" ? opts.speed : 1);
  }, [caps]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = (typeof opts.voiceId === "string" ? opts.voiceId : "") !== voice || (typeof opts.speed === "number" ? opts.speed : 1) !== speed;
  return (
    <aside className="pane pv-side" aria-label="Giọng mặc định">
      <div className="ghd">Giọng mặc định của trường</div>
      <div className="fp-bd">
        {!caps ? (
          <>
            <Skeleton w="40%" h={12} />
            <Skeleton w="100%" h={36} />
            <Skeleton w="70%" h={12} />
          </>
        ) : (
          <>
            <VoicePicker value={voice} onChange={setVoice} speed={speed} onSpeed={setSpeed} emptyLabel={`Giọng mặc định của engine (${caps.kinds.tts.providers.find((p) => p.id === caps.kinds.tts.default)?.label ?? "trình duyệt"})`} disabled={!canManage} />
            <p className="caption">Bài giảng AI, trợ giảng và nút “Đọc to” dùng giọng này khi không chọn giọng khác.</p>
            {canManage && (
              <Button variant="primary" icon="check" disabled={!dirty} doneLabel="Đã lưu" onClick={() => run(async () => setQueryData(CAPS_KEY, await saveConfig({ kind: "tts", providerId: "*", options: { ...(voice && { voiceId: voice }), speed } })), "Đã lưu giọng mặc định")} data-testid="voice-default-save">
                Lưu giọng mặc định
              </Button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

// ── Nhận dạng giọng nói ─────────────────────────────────────────────────────

function AsrTab({ caps, canManage }: { caps: Caps | undefined; canManage: boolean }) {
  const lang0 = typeof caps?.kinds.asr.options.language === "string" ? (caps.kinds.asr.options.language as string) : "vi";
  const [lang, setLang] = useState(lang0);
  const [prefer, setPrefer] = useState<"server" | "browser">("server");
  const asr = useAsr({ language: lang, prefer });
  const [now, setNow] = useState(Date.now());
  const run = useRun();
  useEffect(() => {
    if (!asr.listening) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [asr.listening]);
  const secs = asr.startedAt ? Math.max(0, Math.floor((now - asr.startedAt) / 1000)) : 0;
  const status: ReactNode =
    asr.state === "listening" ? (
      <><span className="pv-dot" aria-hidden /> Đang nghe · <span className="num">{secs}</span> s — bấm Dừng khi nói xong</>
    ) : asr.state === "processing" ? (
      <><Icon name="loader" size="sm" /> Đang xử lý trên máy chủ…</>
    ) : asr.mode === "none" ? (
      "Thiết bị này chưa nhận dạng được — micro bị khoá."
    ) : (
      `Sẽ dùng: ${asr.mode === "server" ? "máy chủ (faster-whisper)" : "nhận dạng của trình duyệt"}`
    );
  return (
    <div className="split pv-split">
      <ProviderList kind="asr" caps={caps} canManage={canManage} />
      <aside className="pane pv-side" aria-label="Thử ghi âm">
        <div className="ghd">Thử ghi âm</div>
        <div className="fp-bd">
          <div className="pv-asr-ctl">
            <Segmented label="Nhận dạng bằng" options={[{ value: "server", label: "Máy chủ" }, { value: "browser", label: "Trình duyệt" }]} value={prefer} onChange={setPrefer} />
            <Select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Ngôn ngữ" className="pv-lang">
              <option value="vi">Tiếng Việt</option>
              <option value="en">Tiếng Anh</option>
            </Select>
          </div>
          <Button size="lg" variant={asr.listening ? "danger" : "primary"} icon={asr.listening ? "stop" : "mic"} disabled={asr.state === "processing" || !asr.supported} onClick={() => void (asr.listening ? asr.stop() : asr.start())} data-testid="asr-mic">
            {asr.listening ? "Dừng" : asr.state === "processing" ? "Đang xử lý…" : "Bấm để nói"}
          </Button>
          <p className="caption" aria-live="polite">{status}</p>
          {asr.error && <p className="pv-err" role="alert"><Icon name="alert" size="sm" /> {asr.error}</p>}
          <div className={asr.text ? "pv-out" : "pv-out is-empty"} aria-live="polite" data-testid="asr-text">
            {asr.text || "Bản chữ hiện ở đây."}
          </div>
          {canManage && lang !== lang0 && (
            <Button size="sm" onClick={() => run(async () => setQueryData(CAPS_KEY, await saveConfig({ kind: "asr", providerId: "*", options: { language: lang } })), "Đã lưu ngôn ngữ mặc định")}>
              Lưu “{lang === "vi" ? "Tiếng Việt" : "Tiếng Anh"}” làm mặc định
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Đọc tài liệu ────────────────────────────────────────────────────────────

type ParseTry = { provider: string; ms: number; format: string; pages: number; chars: number; preview: string; warnings: string[] };

function DocsTab({ caps, canManage }: { caps: Caps | undefined; canManage: boolean }) {
  const [res, setRes] = useState<(ParseTry & { name: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const fmts = caps?.parseFormats ?? [];
  const pick = async (f: File) => {
    if (f.size > 20 * 1024 * 1024) return toast({ title: "File quá lớn", msg: "Tối đa 20 MB mỗi tài liệu.", kind: "err" });
    setBusy(true);
    setRes(null);
    try {
      const r = await tryProvider<ParseTry>({ kind: "parse", name: f.name, contentBase64: await toBase64(f) });
      setRes({ ...r, name: f.name });
    } catch (e) {
      toast({ title: "Chưa đọc được", msg: msgOf(e), kind: "err", life: 6000 });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="split pv-split">
      <div className="pv-col">
        <ProviderList kind="parse" caps={caps} canManage={canManage} />
        <ProviderList kind="ocr" caps={caps} canManage={canManage} />
        <ProviderList kind="preview" caps={caps} canManage={canManage} />
      </div>
      <aside className="pane pv-side" aria-label="Thử đọc tài liệu">
        <div className="ghd">Thử đọc một tài liệu</div>
        <div className="fp-bd">
          {!caps ? (
            <Skeleton w="100%" h={60} />
          ) : (
            <dl className="pv-fmts">
              {formatGroups(fmts).map((g) => (
                <div key={g.label}>
                  <dt>{g.label}</dt>
                  <dd>{g.items.join(" · ")}</dd>
                </div>
              ))}
            </dl>
          )}
          <label className={busy ? "btn primary is-busy" : "btn primary"} aria-busy={busy || undefined} aria-disabled={busy || undefined}>
            <Icon name={busy ? "loader" : "upload"} size="sm" />
            <span>{busy ? "Đang đọc…" : "Chọn tài liệu"}</span>
            <input type="file" hidden disabled={busy || !caps} accept={acceptOf(fmts)} data-testid="parse-file" onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pick(f);
            }} />
          </label>
          {busy && (
            <div className="pv-sk" aria-hidden>
              <Skeleton w="50%" h={12} />
              <Skeleton w="100%" h={12} />
              <Skeleton w="92%" h={12} />
              <Skeleton w="96%" h={12} />
            </div>
          )}
          {res && (
            <div className="pv-res" data-testid="parse-result">
              <p className="caption">
                <b>{res.name}</b> · {res.pages} trang · {res.chars.toLocaleString("vi-VN")} ký tự · bộ đọc {res.provider} · {(res.ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} s
              </p>
              {res.warnings.map((w) => (
                <p key={w} className="pv-warn"><Icon name="alert" size="sm" /> {w}</p>
              ))}
              <pre className="pv-out pv-read">{res.preview}{res.chars > res.preview.length ? "\n…" : ""}</pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Ảnh · tìm web · video ───────────────────────────────────────────────────

function OtherTab({ caps }: { caps: Caps | undefined }) {
  const kinds = KIND_ORDER.filter((k) => ["image", "search", "fetch", "video"].includes(k));
  return (
    <div className="pv-grid">
      {kinds.map((k) => (
        <ProviderList key={k} kind={k} caps={caps} canManage={false} />
      ))}
    </div>
  );
}
