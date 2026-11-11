// web/src/solution/useSolve.ts — chạy giải bài từng bước qua SSE: hình đến trước, các bước hiện dần, bước đang viết hiện chữ dở;
// chặn bấm lặp (một lượt mỗi lúc), Dừng giữ phần đã viết.
import { useCallback, useEffect, useRef, useState } from "react";
import { errText } from "../api";
import { streamSolve } from "./api";
import type { Figure, Solution, Step, Verification } from "./types";

export type SolveState = {
  running: boolean;
  status?: string;
  figure?: Figure | null; // undefined = chưa biết (skeleton hình), null = bài không có hình
  steps: Step[];
  verification?: Verification;
  corrected?: boolean;
  solution?: Solution;
  id?: string | null;
  error?: string;
};

const asStep = (s: Partial<Step> | undefined): Step => ({ title: String(s?.title ?? ""), body: String(s?.body ?? ""), refs: Array.isArray(s?.refs) ? s.refs.map(String) : [] });

export function useSolve() {
  const [st, setSt] = useState<SolveState>({ running: false, steps: [] });
  const ac = useRef<AbortController | null>(null);
  const running = useRef(false);

  useEffect(() => () => ac.current?.abort(), []);

  const run = useCallback(async (body: { problem?: string; questionId?: string; subject?: string; topic?: string; save?: boolean }) => {
    if (running.current) return;
    running.current = true;
    const c = new AbortController();
    ac.current = c;
    setSt({ running: true, steps: [], status: "Đang đọc đề…" });
    try {
      await streamSolve(
        body,
        (e) =>
          setSt((s) => {
            switch (e.type) {
              case "figure":
                return { ...s, figure: e.figure, status: "Đang viết lời giải…" };
              case "partial": {
                const steps = s.steps.slice(0, e.index);
                steps[e.index] = { title: e.title, body: e.body, refs: s.steps[e.index]?.refs ?? [] };
                return { ...s, steps, status: `Đang viết bước ${e.index + 1}…` };
              }
              case "step": {
                const steps = s.steps.slice(0, e.index + 1);
                steps[e.index] = asStep(e.step);
                return { ...s, steps };
              }
              case "status":
                return { ...s, status: e.message };
              case "verified":
                return { ...s, verification: e.verification, corrected: e.corrected, status: "Đang kiểm đáp số…" };
              case "done":
                return { ...s, solution: e.solution, figure: e.solution.figure ?? null, steps: e.solution.steps, verification: e.solution.verification, id: e.id };
              case "error":
                return { ...s, error: e.message };
              default:
                return s;
            }
          }),
        c.signal,
      );
    } catch (e) {
      if (!c.signal.aborted) setSt((s) => ({ ...s, error: errText(e) }));
    } finally {
      running.current = false;
      setSt((s) => ({ ...s, running: false, status: c.signal.aborted ? "Đã dừng" : s.status }));
    }
  }, []);

  const stop = useCallback(() => ac.current?.abort(), []);
  const reset = useCallback(() => setSt({ running: false, steps: [] }), []);
  return { ...st, run, stop, reset };
}
