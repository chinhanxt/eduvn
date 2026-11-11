// web/src/solution/FullSolution.tsx — gia sư P6 chế độ "Lời giải đầy đủ": đề em gửi → lời giải từng bước (stream) ngay trong khung chat,
// có hình đồng bộ, huy hiệu tự kiểm và "Chưa hiểu bước này" (gia sư gợi ý từng bước). Không ghi vào kho lời giải của trường.
import { useEffect, useRef } from "react";
import { staffHint } from "./api";
import { SolutionViewer } from "./SolutionViewer";
import { useSolve } from "./useSolve";

export function FullSolution({ problem, onDone }: { problem: string; onDone?: () => void }) {
  const s = useSolve();
  const started = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      void s.run({ problem, save: false }).finally(onDone);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="sol-chat-card" data-testid="full-solution">
      <SolutionViewer
        hideProblem
        solution={{ problem, figure: s.figure, steps: s.steps, verification: s.verification, answer: s.solution?.answer, topic: s.solution?.topic }}
        streaming={s.running}
        status={s.status}
        onStop={s.stop}
        corrected={s.corrected}
        ask={staffHint}
      />
      {s.error && <p className="sol-err">{s.error}</p>}
    </div>
  );
}
