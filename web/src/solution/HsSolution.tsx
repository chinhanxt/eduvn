// web/src/solution/HsSolution.tsx — kết quả bài làm HS (P9a): trình xem lời giải từng bước của câu (khi GV cho hiện lời giải),
// "Chưa hiểu bước này" mở gia sư P6 bằng phiên HS. Tải lười từ ResultPage để trang kết quả nhẹ khi bài không có lời giải.
import { useMemo } from "react";
import { studentHint } from "./api";
import { SolutionViewer } from "./SolutionViewer";
import type { Solution } from "./types";

export function HsSolution({ solution, token }: { solution: Solution; token: string | null }) {
  const ask = useMemo(() => (token ? studentHint(token) : null), [token]);
  return (
    <div className="sol-hs sol-hoc" data-testid="hs-solution">
      <SolutionViewer hideProblem solution={solution} ask={ask} />
    </div>
  );
}
