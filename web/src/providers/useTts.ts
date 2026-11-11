// Đọc to: giọng máy chủ (VieNeu/OmniVoice/giọng thư viện, mp3 có cache) hoặc giọng vi-VN của trình duyệt. Một đoạn phát một lúc.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "../ui/data/query";
import { CAPS_KEY, fetchCaps, speakBlob } from "./api";
import { ttsMode } from "./logic";

export type TtsState = "idle" | "loading" | "playing" | "error";
export type SpeakOpts = { voiceId?: string; speed?: number };

const browserOk = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

function viVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("vi"));
}

export function useTts(defaults: SpeakOpts = {}) {
  const caps = useQuery(CAPS_KEY, fetchCaps);
  const [state, setState] = useState<TtsState>("idle");
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const seq = useRef(0);

  const cleanup = useCallback(() => {
    ctrl.current?.abort();
    ctrl.current = null;
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    if (browserOk()) window.speechSynthesis.cancel();
  }, []);

  const stop = useCallback(() => {
    seq.current++;
    cleanup();
    setState("idle");
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  const speak = useCallback(
    async (text: string, o: SpeakOpts = {}): Promise<void> => {
      const voiceId = o.voiceId ?? defaults.voiceId;
      const speed = o.speed ?? defaults.speed;
      const my = ++seq.current;
      cleanup();
      setError(null);
      const mode = ttsMode(caps.data, voiceId, browserOk());
      if (mode === "none") {
        setState("error");
        setError("Máy chủ chưa có giọng đọc và trình duyệt này không có giọng tiếng Việt.");
        return;
      }
      if (mode === "browser") {
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "vi-VN";
          const v = viVoice();
          if (v) u.voice = v;
          u.rate = speed ?? 1;
          u.onend = () => (my === seq.current && setState("idle"), resolve());
          u.onerror = () => (my === seq.current && setState("idle"), resolve());
          setState("playing");
          window.speechSynthesis.speak(u);
        });
        return;
      }
      setState("loading");
      const c = new AbortController();
      ctrl.current = c;
      try {
        const blob = await speakBlob({ text, voiceId: voiceId === undefined ? undefined : voiceId, speed }, c.signal);
        if (my !== seq.current) return;
        url.current = URL.createObjectURL(blob);
        const a = new Audio(url.current);
        audio.current = a;
        await new Promise<void>((resolve, reject) => {
          a.onended = () => resolve();
          a.onerror = () => reject(new Error("Trình duyệt không phát được âm thanh"));
          a.play().then(() => my === seq.current && setState("playing"), reject);
        });
        if (my === seq.current) setState("idle");
      } catch (e) {
        if (my !== seq.current || (e as Error).name === "AbortError") return;
        setState("error");
        setError((e as Error).message || "Chưa đọc được");
      }
    },
    [caps.data, cleanup, defaults.voiceId, defaults.speed],
  );

  return { speak, stop, state, error, busy: state === "loading" || state === "playing", mode: ttsMode(caps.data, defaults.voiceId, browserOk()) };
}
