import { useEffect, useState } from "react";
import { api, errText } from "../../api";
import { Icon } from "../../Icon";
import { fmtWhen } from "./AssignTab";
import { MonitorTab } from "./MonitorTab";
import { ResultsTab } from "./ResultsTab";
import type { AssignmentListItem } from "./types";
import "./lh.css";

export type ClassTab = "hoc-vien" | "giao-bai" | "theo-doi" | "ket-qua" | "the-lop";
const TABS: [ClassTab, string, string][] = [
  ["hoc-vien", "users", "Học viên"],
  ["giao-bai", "plus", "Giao bài"],
  ["theo-doi", "eye", "Theo dõi"],
  ["ket-qua", "chart", "Kết quả & thống kê"],
  ["the-lop", "qr", "Thẻ lớp"],
];

export function ClassTabs({ tab, onTab }: { tab: ClassTab; onTab: (t: ClassTab) => void }) {
  return (
    <div className="lh-tabs" role="tablist">
      {TABS.map(([k, ic, label]) => (
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => onTab(k)} data-testid={`lh-tab-${k}`}>
          <Icon name={ic} size={18} />{label}
        </button>
      ))}
    </div>
  );
}

/** Theo dõi / Kết quả: chọn bài giao (mặc định bài mới nhất đã giao), rồi hiện tab tương ứng. */
export function AssignmentScoped({ classId, tab, assignmentId, onPick }: { classId: string; tab: "theo-doi" | "ket-qua"; assignmentId: string | null; onPick: (id: string) => void }) {
  const [rows, setRows] = useState<AssignmentListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<AssignmentListItem[]>(`/api/classes/${classId}/assignments`).then(setRows).catch((e: unknown) => setErr(errText(e)));
  }, [classId]);
  if (err) return <div className="err">{err}</div>;
  if (!rows) return null;
  const given = rows.filter((a) => a.status !== "draft");
  const cur = given.find((a) => a.id === assignmentId) ?? given[0];
  if (!cur) return <div className="card"><div className="empty">Chưa giao bài nào — mở tab Giao bài</div></div>;
  return (
    <>
      <div className="bar">
        <label className="lbl">Bài giao
          <select className="inp" value={cur.id} onChange={(e) => onPick(e.target.value)} data-testid="lh-pick">
            {given.map((a) => <option key={a.id} value={a.id}>{a.title} · hạn {fmtWhen(a.dueAt)}</option>)}
          </select>
        </label>
      </div>
      {tab === "theo-doi" ? <MonitorTab key={cur.id} assignmentId={cur.id} /> : <ResultsTab key={cur.id} assignmentId={cur.id} />}
    </>
  );
}
