// web/src/solution/SolutionDialog.tsx — ngân hàng câu hỏi: "Lời giải từng bước" cho một câu → xem lời giải đã lưu hoặc AI giải (stream) rồi lưu vào câu;
// GV bật "Chia sẻ công khai" thì lời giải hiện ở thư viện /loi-giai (không kèm tên GV/HS), sao chép link chia sẻ.
import { useEffect, useRef, useState } from "react";
import { errText } from "../api";
import { getSolution, publishSolution, questionSolution, staffHint } from "./api";
import { SolutionViewer } from "./SolutionViewer";
import type { SolutionRow, VerifyStatus } from "./types";
import { useSolve } from "./useSolve";

export const shareUrl = (slug: string) => `${location.origin}/chia-se/loi-giai/${encodeURIComponent(slug)}`;

export async function copyText(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
}

export function useToast() {
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const timer = useRef(0);
  const show = (text: string, bad = false) => {
    setToast({ text, bad });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast && (
    <div className={`sol-toast${toast.bad ? " bad" : ""}`} role="status" aria-live="polite">
      {toast.text}
    </div>
  );
  return { show, node };
}

export function SolutionDialog({ question, onClose, onStatus }: { question: { id: string; stem: string }; onClose: () => void; onStatus?: (id: string, s: VerifyStatus) => void }) {
  const [row, setRow] = useState<SolutionRow | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const solve = useSolve();
  const toast = useToast();

  useEffect(() => {
    questionSolution(question.id)
      .then((r) => setRow(r.solution))
      .catch((e: unknown) => setErr(errText(e)));
  }, [question.id]);

  // giải xong → nạp bản đã lưu (có slug/lượt xem) và báo trạng thái cho bảng ngân hàng
  useEffect(() => {
    if (solve.running || !solve.id) return;
    getSolution(solve.id)
      .then((r) => {
        setRow(r);
        onStatus?.(question.id, r.solution.verification.status);
        solve.reset();
      })
      .catch((e: unknown) => setErr(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solve.running, solve.id]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector(".sol-sheet") && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const run = () => void solve.run({ questionId: question.id, save: true });
  const publish = async (on: boolean) => {
    if (!row || busy) return;
    setBusy(true);
    try {
      const r = await publishSolution(row.id, on);
      setRow(r);
      if (on && r.slug) {
        const ok = await copyText(shareUrl(r.slug));
        toast.show(ok ? "Đã chia sẻ công khai — link đã sao chép" : "Đã chia sẻ công khai");
      } else toast.show("Đã ngừng chia sẻ");
    } catch (e) {
      toast.show(errText(e), true);
    } finally {
      setBusy(false);
    }
  };

  const live = solve.running || solve.steps.length > 0 || solve.error;
  const actions = row && !live && (
    <>
      <button type="button" className="sol-btn sm ghost" onClick={run}>Giải lại</button>
      {row.publishedAt && row.slug && (
        <>
          <a className="sol-btn sm ghost" href={`/loi-giai/${row.slug}`} target="_blank" rel="noreferrer">Xem trang công khai · {row.views} lượt</a>
          <button type="button" className="sol-btn sm ghost" onClick={async () => toast.show((await copyText(shareUrl(row.slug!))) ? "Đã sao chép link" : shareUrl(row.slug!))}>Sao chép link</button>
        </>
      )}
      <button type="button" className={`sol-btn sm${row.publishedAt ? "" : " primary"}`} aria-busy={busy} disabled={busy} onClick={() => void publish(!row.publishedAt)} data-testid="sol-publish">
        {row.publishedAt ? "Ngừng chia sẻ" : "Chia sẻ công khai"}
      </button>
    </>
  );

  return (
    <div className="sol-dlg-wrap" onClick={onClose}>
      <div className="sol-dlg" role="dialog" aria-modal="true" aria-label="Lời giải từng bước" onClick={(e) => e.stopPropagation()}>
        <div className="sol-dlg-top">
          <h2>Lời giải từng bước</h2>
          <button type="button" className="sol-icon-btn" onClick={onClose} aria-label="Đóng">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {err && <p className="sol-err">{err}</p>}
        {live ? (
          <>
            <SolutionViewer
              solution={{ problem: question.stem, figure: solve.figure, steps: solve.steps, verification: solve.verification, answer: solve.solution?.answer }}
              streaming={solve.running}
              status={solve.status}
              onStop={solve.stop}
              corrected={solve.corrected}
              ask={staffHint}
            />
            {solve.error && (
              <p className="sol-err">
                {solve.error} <button type="button" className="sol-btn sm" onClick={run}>Thử lại</button>
              </p>
            )}
          </>
        ) : row === undefined ? (
          <div className="sol-empty" aria-busy="true"><span className="sol-skel-line w40" style={{ margin: "0 auto 12px" }} /><span className="sol-skel-line w80" style={{ margin: "0 auto" }} /></div>
        ) : row ? (
          <SolutionViewer solution={row.solution} ask={staffHint} actions={actions} />
        ) : (
          <div className="sol-empty">
            <p>Câu này chưa có lời giải từng bước. AI sẽ chia 3–7 bước, dựng hình đồng bộ từng bước và tự đo lại đáp số.</p>
            <button type="button" className="sol-btn primary" onClick={run} data-testid="sol-run">Giải từng bước bằng AI</button>
          </div>
        )}
      </div>
      {toast.node}
    </div>
  );
}
