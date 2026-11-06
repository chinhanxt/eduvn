// web/src/board/SuggestPanel.tsx
import { useEffect, useState } from "react";
import { api, type BankQuestion, type BoardDetail, errText, exportGame } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { boardKeywords, type BoardPageDoc } from "./doc";

const LEVEL: Record<string, string> = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng" };
const TYPE: Record<string, string> = { mcq: "Trắc nghiệm", true_false: "Đúng/sai", short_answer: "Trả lời ngắn", essay: "Tự luận" };

type Props = { board: BoardDetail; page: BoardPageDoc; onProject: (q: BankQuestion) => void; onClose: () => void };

export function SuggestPanel({ board, page, onProject, onClose }: Props) {
  const kw = boardKeywords(page);
  const [rows, setRows] = useState<BankQuestion[] | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [gameErr, setGameErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let dead = false;
    const t = setTimeout(() => {
      const q = new URLSearchParams({ subject: board.subject, grade: String(board.grade), topic: board.topic, text: kw, limit: "8" });
      api<BankQuestion[]>(`/api/questions/related?${q}`)
        .then((r) => {
          if (dead) return;
          setRows(r);
          setPick((p) => p.filter((id) => r.some((x) => x.id === id)));
          setErr(null);
        })
        .catch((e: unknown) => {
          if (dead) return;
          setRows([]);
          setErr(errText(e));
        });
    }, 400);
    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [board.subject, board.grade, board.topic, kw]);

  const makeGame = async () => {
    if (busy) return;
    setGameErr(null);
    setBusy(true);
    try {
      const g = await api<{ id: string }>("/api/games", { method: "POST", body: { title: `Ôn tập: ${board.topic || board.title}`.slice(0, 120), kind: "quiz", source: { questionIds: pick } } });
      await exportGame(g.id, true);
    } catch (e) {
      setGameErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="bd-side" data-testid="bd-suggest">
      <div className="bd-side-hd">
        <span className="bd-side-ic"><Icon name="spark" /></span>Gợi ý bài liên quan
        <button className="xbtn" onClick={onClose} aria-label="Đóng"><Icon name="x" size={16} /></button>
      </div>
      <div className="bd-side-ctx">{[board.topic, kw].filter(Boolean).join(" · ") || "Chưa có chủ đề"}</div>
      {(err ?? gameErr) && <div className="err">{err ?? gameErr}</div>}
      <div className="bd-side-list">
        {rows === null && <div className="bd-sk" />}
        {rows?.length === 0 && <div className="empty">Chưa có câu phù hợp. Thêm câu chủ đề “{board.topic || "…"}” trong Ngân hàng câu hỏi.</div>}
        {rows?.map((q) => (
          <div className="bd-q" key={q.id} data-testid="bd-q">
            <input type="checkbox" checked={pick.includes(q.id)} onChange={(e) => setPick((p) => (e.target.checked ? [...p, q.id] : p.filter((x) => x !== q.id)))} aria-label="Chọn cho trò chơi" />
            <div className="bd-q-body">
              <MathText value={q.stem} />
              <small>{LEVEL[q.level]} · {TYPE[q.type]}</small>
            </div>
            <button className="bd-q-show" onClick={() => onProject(q)} title="Chiếu lên bảng" data-testid="bd-show"><Icon name="present" /></button>
          </div>
        ))}
      </div>
      <button className="bd-btn pri bd-side-ft" disabled={pick.length === 0 || busy} onClick={() => void makeGame()}>
        <Icon name="game" />Tạo trò chơi ({pick.length})
      </button>
    </aside>
  );
}
