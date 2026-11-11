import { useEffect, useMemo, useState } from "react";
import { type ExamSummary, type KeyEntry, api } from "../api";
import { Icon } from "../ui/Icon";
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
      <div className="pg-tools">
        <label className="pg-field">
          Mã đề
          <select className="pg-in" value={code} onChange={(e) => setCode(e.target.value)} data-testid="p-code">
            <option value="all">Tất cả mã đề</option>
            {keys.map((k) => <option key={k.code} value={k.code}>Mã đề {k.code}</option>)}
          </select>
        </label>
        <span className="pg-tag"><Icon name="qr" />A4 · 4 mốc góc + QR mã đề · tô bằng bút chì 2B</span>
        <span className="pg-sp" />
        <button className="btn primary sm" onClick={() => window.print()} disabled={pages.length === 0} data-testid="p-print"><Icon name="printer" />In / lưu PDF ({pages.length} trang)</button>
      </div>
      {keys.length === 0 && <div className="omr-page pg-sk" style={{ aspectRatio: "210 / 297" }} aria-busy="true" />}
      <div className="omr-print" data-testid="p-sheets">
        {pages.map((p) => <div className="omr-page" key={`${p.code}-${p.page}`} dangerouslySetInnerHTML={{ __html: p.svg }} />)}
      </div>
    </>
  );
}
