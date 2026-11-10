import { useEffect, useMemo, useState } from "react";
import { type ExamSummary, type KeyEntry, api } from "../api";
import { Icon } from "../Icon";
import { sheetSvg } from "./sheetSvg";
import { buildTemplate } from "./template";

type Keys = { code: string; entries: KeyEntry[] }[];

export function PrintTab({ exams, examId }: { exams: ExamSummary[]; examId: string }) {
  const [keys, setKeys] = useState<Keys>([]);
  const [code, setCode] = useState("all");
  useEffect(() => {
    setKeys([]);
    if (examId) void api<Keys>(`/api/exams/${examId}/key`).then(setKeys);
  }, [examId]);
  const exam = exams.find((e) => e.id === examId);
  const pages = useMemo(() => {
    const list: { code: string; page: number; svg: string }[] = [];
    for (const k of keys.filter((k) => code === "all" || k.code === code)) {
      const t = buildTemplate(k.entries, { title: exam?.title ?? "", code: k.code });
      for (let p = 0; p < t.pages; p++) list.push({ code: k.code, page: p, svg: sheetSvg(t, p, examId, k.code) });
    }
    return list;
  }, [keys, code, exam, examId]);

  return (
    <>
      <div className="bar">
        <select className="inp" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Mã đề" data-testid="p-code">
          <option value="all">Tất cả mã đề</option>
          {keys.map((k) => <option key={k.code} value={k.code}>Mã đề {k.code}</option>)}
        </select>
        <button className="btn" onClick={() => window.print()} disabled={pages.length === 0} data-testid="p-print"><Icon name="exam" size={18} />In / lưu PDF ({pages.length} trang)</button>
        <span className="tag">A4 · 4 mốc góc + QR · tô bằng bút chì 2B</span>
      </div>
      <div className="omr-print" data-testid="p-sheets">
        {pages.map((p) => <div className="omr-page" key={`${p.code}-${p.page}`} dangerouslySetInnerHTML={{ __html: p.svg }} />)}
      </div>
    </>
  );
}
