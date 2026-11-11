// Nhận dạng giọng nói: ghi âm → ASR máy chủ (faster-whisper) hoặc Web Speech vi-VN của trình duyệt. Không có cả hai → khoá mic.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "../ui/data/query";
import { CAPS_KEY, fetchCaps, toBase64, transcribe } from "./api";
import { asrMode, pickMime } from "./logic";

export type AsrState = "idle" | "listening" | "processing" | "error";
type Rec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null };
type RecCtor = new () => Rec;

const recCtor = (): RecCtor | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const recorderOk = () => typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export const MAX_RECORD_MS = 60_000;

/** `start()` bắt đầu nghe, `stop()` kết thúc → `text` là bản chữ (Web Speech hiện dần trong lúc nói). */
export function useAsr(opts: { language?: string; prefer?: "server" | "browser"; onText?: (text: string) => void } = {}) {
  const caps = useQuery(CAPS_KEY, fetchCaps);
  const mode = asrMode(caps.data, { recorder: recorderOk(), webSpeech: !!recCtor() }, opts.prefer);
  const [state, setState] = useState<AsrState>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const media = useRef<{ rec: MediaRecorder; stream: MediaStream; timer: number } | null>(null);
  const speech = useRef<Rec | null>(null);
  const onText = useRef(opts.onText);
  onText.current = opts.onText;
  const lang = opts.language ?? "vi";

  const release = useCallback(() => {
    if (media.current) {
      clearTimeout(media.current.timer);
      media.current.stream.getTracks().forEach((t) => t.stop());
    }
    media.current = null;
  }, []);
  useEffect(
    () => () => {
      speech.current?.abort();
      if (media.current?.rec.state === "recording") media.current.rec.onstop = null;
      media.current?.rec.state === "recording" && media.current.rec.stop();
      release();
    },
    [release],
  );

  const fail = (m: string) => {
    setState("error");
    setError(m);
    setStartedAt(null);
  };
  const done = (t: string) => {
    setStartedAt(null);
    if (!t.trim()) return fail("Không nghe thấy tiếng — nói gần micro hơn rồi thử lại.");
    setText(t);
    setState("idle");
    onText.current?.(t);
  };

  const start = useCallback(async () => {
    if (state === "listening" || state === "processing") return;
    setError(null);
    setText("");
    if (mode === "none") return fail("Thiết bị này chưa nhận dạng giọng nói được (máy chủ chưa có ASR, trình duyệt không hỗ trợ).");
    if (mode === "browser") {
      const R = recCtor()!;
      const r = new R();
      r.lang = lang === "vi" ? "vi-VN" : lang;
      r.interimResults = true;
      r.continuous = true;
      let last = "";
      let errored = false;
      r.onresult = (e) => {
        last = Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" ").replace(/\s+/g, " ").trim();
        setText(last);
      };
      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return; // onend báo "không nghe thấy"
        errored = true;
        fail(e.error === "not-allowed" ? "Chưa cho phép dùng micro — bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép." : "Nhận dạng của trình duyệt bị lỗi, thử lại sau.");
      };
      r.onend = () => {
        speech.current = null;
        if (!errored) done(last);
      };
      speech.current = r;
      setState("listening");
      setStartedAt(Date.now());
      try {
        r.start();
      } catch {
        fail("Trình duyệt không bật được nhận dạng giọng nói.");
      }
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return fail("Chưa cho phép dùng micro — bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép.");
    }
    const mime = pickMime((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      release();
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (blob.size < 1000) return fail("Không nghe thấy tiếng — nói gần micro hơn rồi thử lại.");
      setState("processing");
      try {
        const r = await transcribe(await toBase64(blob), lang);
        done(r.text);
      } catch (e) {
        fail((e as Error).message || "Chưa nhận dạng được, thử lại sau.");
      }
    };
    media.current = { rec, stream, timer: window.setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_MS) };
    rec.start();
    setState("listening");
    setStartedAt(Date.now());
  }, [state, mode, lang, release]);

  const stop = useCallback(() => {
    if (speech.current) speech.current.stop();
    else if (media.current?.rec.state === "recording") media.current.rec.stop();
  }, []);

  return { start, stop, state, text, error, mode, startedAt, supported: mode !== "none", listening: state === "listening", setText };
}
