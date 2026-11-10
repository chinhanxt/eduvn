import { useEffect, useState } from "react";
import { Link } from "react-router";
import { type ExamSummary, api } from "../api";
import { EssayTab } from "../omr/EssayTab";
import { PrintTab } from "../omr/PrintTab";
import { ScanTab } from "../omr/ScanTab";

type Tab = "print" | "scan" | "essay";

/** /cham-anh: in phiếu trắc nghiệm CV 7991, quét ảnh chấm, chấm bài viết tay. */
export function PhotoGrade() {
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [examId, setExamId] = useState("");
  const [tab, setTab] = useState<Tab>("scan");
  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then((l) => {
      setExams(l);
      if (l[0]) setExamId(l[0].id);
    }).catch(() => setExams([]));
  }, []);

  return (
    <>
      <div className="bar no-print">
        <Link to="/cham-bai" className="back" aria-label="Về Chấm bài">←</Link>
        <h1 style={{ margin: 0 }}>Chấm từ ảnh</h1>
        <span className="sp" />
        <select className="inp" value={examId} onChange={(e) => setExamId(e.target.value)} aria-label="Đề" data-testid="pg-exam">
          {exams?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <div className="tabs" role="group" aria-label="Chế độ">
          <button className={tab === "print" ? "on" : ""} onClick={() => setTab("print")} data-testid="tab-print">In phiếu</button>
          <button className={tab === "scan" ? "on" : ""} onClick={() => setTab("scan")} data-testid="tab-scan">Quét phiếu</button>
          <button className={tab === "essay" ? "on" : ""} onClick={() => setTab("essay")} data-testid="tab-essay">Bài viết tay</button>
        </div>
      </div>
      {exams?.length === 0 ? (
        <div className="card empty">Chưa có đề. Hãy tạo đề trước.</div>
      ) : tab === "print" ? (
        <PrintTab exams={exams ?? []} examId={examId} />
      ) : tab === "scan" ? (
        <ScanTab exams={exams ?? []} examId={examId} />
      ) : (
        <EssayTab examId={examId} />
      )}
    </>
  );
}
