import { useEffect, useRef, useState } from "react";

export type Q = { i: number; q: string; kind: "choice" | "text"; options?: string[] };
type Timing = { now: number; endsAt: number; paused: boolean; leftMs: number; limitMs: number };
export type Top = { name: string; score: number };
export type HostState = Timing & {
  role: "host"; pin: string; title: string; className: string | null; phase: "lobby" | "question" | "reveal" | "ended";
  qi: number; total: number; playerCount: number; names?: string[]; answered: number; question: Q | null;
  reveal: { answer: string; correctIndex: number | null; explain: string; counts: number[]; correct: number; answeredCount: number; top: Top[] } | null;
  podium: Top[] | null; sessionId: string | null; classId: string | null;
};
export type PlayerState = Timing & {
  role: "player"; pin: string; title: string; name: string; phase: HostState["phase"]; qi: number; total: number; question: Q | null;
  answered: boolean; me: { score: number; rank: number; streak: number; of: number };
  result: { ok: boolean; pts: number; answer: string; explain: string } | null; podium: Top[] | null;
};

/** Mở luồng SSE; trình duyệt tự nối lại khi rớt mạng và máy chủ gửi ngay trạng thái hiện tại. `gone` = phòng không còn. */
export function useStream<T extends { now: number }>(url: string | null, onGone?: (msg: string) => void): { state: T | null; skew: number; live: boolean } {
  const [state, setState] = useState<T | null>(null);
  const [skew, setSkew] = useState(0);
  const [live, setLive] = useState(false);
  const gone = useRef(onGone);
  gone.current = onGone;
  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.addEventListener("state", (e) => {
      const s = JSON.parse((e as MessageEvent<string>).data) as T;
      setSkew(s.now - Date.now());
      setState(s);
    });
    es.addEventListener("gone", (e) => {
      es.close();
      gone.current?.((JSON.parse((e as MessageEvent<string>).data) as { error: string }).error);
    });
    return () => es.close();
  }, [url]);
  return { state, skew, live };
}

/** Giây còn lại theo giờ máy chủ (skew = giờ máy chủ − giờ máy). */
export function useLeftMs(s: Timing | null, skew: number): number {
  const [, tick] = useState(0);
  const run = !!s && s.endsAt > 0 && !s.paused;
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [run]);
  if (!s) return 0;
  return s.paused ? s.leftMs : Math.max(0, s.endsAt - (Date.now() + skew));
}

export const LETTERS = ["A", "B", "C", "D"];
