import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { type ExamSummary, api } from "../api";
import { Icon } from "../Icon";
import { EssayTab } from "../omr/EssayTab";
import { PrintTab } from "../omr/PrintTab";
import { ScanTab } from "../omr/ScanTab";
import { ToastHost } from "../omr/ui";
import "../omr/photo.css";

const TABS = [
  { id: "quet", label: "Quét phiếu", icon: "camera" },
  { id: "viet-tay", label: "Bài viết tay", icon: "pen" },
  { id: "in", label: "In phiếu", icon: "printer" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** /cham-anh?che-do=quet|viet-tay|in&de=<examId>: quét phiếu trắc nghiệm CV 7991, chấm bài viết tay, in phiếu. */
export function PhotoGrade() {
  const [q, setQ] = useSearchParams();
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const tab: Tab = TABS.some((t) => t.id === q.get("che-do")) ? (q.get("che-do") as Tab) : "quet";
  const examId = q.get("de") ?? exams?.[0]?.id ?? "";
  const set = (k: string, v: string, push = false) => {
    const n = new URLSearchParams(q);
    n.set(k, v);
    setQ(n, { replace: !push });
  };
  const [seen, setSeen] = useState(() => new Set<Tab>([tab]));
  useEffect(() => setSeen((x) => (x.has(tab) ? x : new Set([...x, tab]))), [tab]);
  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then(setExams).catch(() => setExams([]));
  }, []);

  return (
    <ToastHost>
      <div className="pg" data-testid="pg">
        <header className="pg-head no-print">
          <div>
            <Link to="/cham-bai" className="pg-crumb"><Icon name="chevl" size={14} />Chấm bài</Link>
            <h1>Chấm từ ảnh</h1>
          </div>
          <label className="pg-field" style={{ minWidth: 260 }}>
            Đề
            <select className="pg-in" value={examId} onChange={(e) => set("de", e.target.value)} disabled={!exams?.length} data-testid="pg-exam">
              {exams === null && <option>Đang tải…</option>}
              {exams?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </label>
          <span className="pg-sp" />
          <div className="pg-seg" role="group" aria-label="Chế độ">
            {TABS.map((t) => (
              <button key={t.id} aria-pressed={tab === t.id} onClick={() => set("che-do", t.id, true)} data-testid={`tab-${t.id}`}>
                <Icon name={t.icon} size={14} />{t.label}
              </button>
            ))}
          </div>
        </header>
        {exams?.length === 0 ? (
          <div className="pg-pane pg-empty">Chưa có đề nào. <Link to="/de-thi">Tạo đề</Link> rồi quay lại để in phiếu và chấm.</div>
        ) : exams === null ? (
          <div className="pg-pane" style={{ padding: 16, display: "grid", gap: 10 }} aria-busy="true">
            <div className="pg-sk l" style={{ width: "40%" }} /><div className="pg-sk" style={{ height: 64 }} /><div className="pg-sk l" style={{ width: "70%" }} />
          </div>
        ) : (
          // Giữ các chế độ đã mở (phiếu đang quét/bài đang chấm không mất khi đổi tab).
          <>
            {seen.has("quet") && <div hidden={tab !== "quet"}><ScanTab exams={exams} examId={examId} classId={q.get("lop") ?? ""} setClassId={(v) => set("lop", v)} /></div>}
            {seen.has("viet-tay") && <div hidden={tab !== "viet-tay"}><EssayTab examId={examId} /></div>}
            {tab === "in" && <PrintTab exams={exams} examId={examId} />}
          </>
        )}
      </div>
    </ToastHost>
  );
}
