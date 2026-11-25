import { useCallback, useEffect, useRef, useState } from "react";

/** Tách câu thành từ, giữ vị trí ký tự đầu mỗi từ (để khớp sự kiện boundary của speechSynthesis). */
export function words(text: string): { w: string; at: number }[] {
  const out: { w: string; at: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ w: m[0], at: m.index });
  return out;
}

function viVoice(): SpeechSynthesisVoice | undefined {
  const vs = window.speechSynthesis?.getVoices() ?? [];
  return vs.find((v) => v.lang === "vi-VN") ?? vs.find((v) => v.lang.toLowerCase().startsWith("vi"));
}

/**
 * Đọc to bằng giọng vi-VN của trình duyệt, kèm chỉ số từ đang đọc (tô sáng như karaoke).
 * Máy không có giọng Việt / không phát sự kiện boundary → tô sáng theo nhịp ước lượng (~2,6 từ/giây).
 */
export function useSpeak() {
  const [id, setId] = useState<string | null>(null);
  const [word, setWord] = useState(-1);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const gotBoundary = useRef(false);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = undefined;
  };
  const stop = useCallback(() => {
    clear();
    window.speechSynthesis?.cancel();
    setId(null);
    setWord(-1);
  }, []);

  const speak = useCallback(
    (key: string, text: string, rate = 0.92) => {
      clear();
      window.speechSynthesis?.cancel();
      const ws = words(text);
      setId(key);
      setWord(0);
      gotBoundary.current = false;
      let i = 0;
      let speaking = false;
      const per = 380 / rate;
      const done = () => {
        clear();
        setId((cur) => (cur === key ? null : cur));
        setWord(-1);
      };
      // nhịp dự phòng: chạy đến khi có boundary thật
      timer.current = setInterval(() => {
        if (gotBoundary.current) return;
        i += 1;
        if (i >= ws.length) {
          if (!window.speechSynthesis || !speaking) done();
          return;
        }
        setWord(i);
      }, per);
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "vi-VN";
      const v = viVoice();
      if (v) u.voice = v;
      u.rate = rate;
      u.onstart = () => void (speaking = true);
      u.onboundary = (e) => {
        if (e.name && e.name !== "word") return;
        gotBoundary.current = true;
        let k = 0;
        while (k + 1 < ws.length && ws[k + 1]!.at <= e.charIndex) k += 1;
        setWord(k);
      };
      u.onend = done;
      u.onerror = () => {
        speaking = false;
      };
      synth.speak(u);
    },
    [],
  );

  useEffect(() => {
    // nạp sẵn danh sách giọng (Chrome trả rỗng lần đầu)
    window.speechSynthesis?.getVoices();
    return () => {
      clear();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { id, word, speak, stop, toggle: (key: string, text: string) => (id === key ? stop() : speak(key, text)) };
}
