import { useEffect, useState } from "react";
import { Link } from "react-router";
import { vn } from "../api";
import { Icon } from "../Icon";
import { formatCountdown } from "./clock";
import { errMsg, hsJson } from "./studentApi";
import type { MyAssignment } from "./types";

type Filter = "all" | "todo" | "done";
const CHIP: Record<MyAssignment["state"], [string, string, string]> = {
  chua_mo: ["", "lock", "Chưa mở"],
  chua_lam: ["", "", "Chưa làm"],
  dang_lam: ["c-blue", "loader", "Đang làm"],
  da_nop: ["c-green", "check", "Đã nộp"],
  qua_han: ["c-red", "alert", "Quá hạn"],
};

/** "Bài của em": thẻ bài + hạn nộp đếm ngược + nút làm/làm tiếp/xem kết quả. */
export function MyAssignments() {
  const [rows, setRows] = useState<MyAssignment[] | null>(null);
  const [f, setF] = useState<Filter>("all");
  const [err, setErr] = useState<string | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    hsJson<MyAssignment[]>("/api/student/assignments").then(setRows).catch((e: unknown) => setErr(errMsg(e)));
    const iv = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(iv);
  }, []);
  const shown = (rows ?? []).filter((a) => f === "all" || (f === "todo" ? a.state === "chua_lam" || a.state === "dang_lam" : a.state === "da_nop"));
  return (
    <main className="hs-main">
      <div className="hs-hello">
        <h1>Bài của em</h1>
        <div className="hs-seg">
          {(["all", "todo", "done"] as const).map((k) => (
            <button key={k} className={f === k ? "on" : ""} onClick={() => setF(k)}>{{ all: "Tất cả", todo: "Cần làm", done: "Đã nộp" }[k]}</button>
          ))}
        </div>
      </div>
      {err && <div className="hs-err">{err}</div>}
      {rows && shown.length === 0 && <div className="hs-card hs-empty">Chưa có bài nào</div>}
      <div className="hs-asg-grid">
        {shown.map((a) => {
          const left = Date.parse(a.dueAt) - Date.now();
          const [cc, ci, cl] = CHIP[a.state];
          const due = a.state === "da_nop" ? "ok" : a.state === "qua_han" ? "late" : left < 6 * 3600_000 ? "soon" : "";
          const dueText = a.state === "da_nop" ? "Đã nộp" : a.state === "qua_han" ? "Hạn đã qua · không nộp được" : a.state === "chua_mo" ? `Mở lúc ${new Date(a.opensAt).toLocaleString("vi-VN")}` : formatCountdown(left);
          const go = a.state === "da_nop" && !a.canStart ? `/hs/ket-qua/${a.lastSubmissionId}` : `/hs/bai/${a.id}`;
          return (
            <div key={a.id} className="hs-card hs-asg" data-testid="hs-asg">
              <div className="top">
                <span className={`ic ${a.state === "da_nop" ? "green" : a.state === "qua_han" ? "red" : a.kind === "test" ? "blue" : "violet"}`}><Icon name={a.kind === "test" ? "exam" : "repeat"} /></span>
                <div className="g">
                  <div className="t">{a.title}</div>
                  <div className="chips">
                    <span className={`hs-chip ${a.kind === "test" ? "c-violet" : ""}`}>{a.kind === "test" ? "Kiểm tra" : "Luyện tập"}</span>
                    <span className={`hs-chip ${cc}`}>{ci && <Icon name={ci} />}{cl}</span>
                  </div>
                </div>
                {a.score10 !== null && <div className="sc"><b>{vn(a.score10)}</b><small>điểm</small></div>}
              </div>
              <div className="meta">
                <span><Icon name="list" />{a.questionCount} câu</span>
                <span><Icon name="timer" />{a.durationMinutes ? `${a.durationMinutes} phút` : "Không giới hạn"}</span>
                <span><Icon name="repeat" />Lượt {a.attemptsUsed} / {a.attemptsAllowed}</span>
              </div>
              {a.state === "dang_lam" && (
                <div>
                  <div className="hs-bar"><i style={{ width: `${(a.answered / Math.max(1, a.questionCount)) * 100}%` }} /></div>
                  <small className="hs-muted">Đã làm {a.answered}/{a.questionCount} câu</small>
                </div>
              )}
              <div className={`due ${due}`}><Icon name="clock" /><span>{dueText}</span></div>
              {a.state === "qua_han" || a.state === "chua_mo" || (a.state === "da_nop" && !a.lastSubmissionId) ? (
                <button className="hs-btn" disabled>{a.state === "chua_mo" ? "Chưa mở" : "Đã quá hạn"}</button>
              ) : (
                <Link className={`hs-btn ${a.state === "da_nop" && !a.canStart ? "" : "primary"}`} to={go} data-testid="hs-start">
                  <Icon name={a.state === "da_nop" && !a.canStart ? "eye" : "arrowr"} />
                  {a.state === "dang_lam" ? "Làm tiếp" : a.state === "da_nop" ? (a.canStart ? "Làm lại" : "Xem kết quả") : "Làm bài"}
                </Link>
              )}
              {a.state === "da_nop" && a.canStart && a.lastSubmissionId && <Link className="hs-link" to={`/hs/ket-qua/${a.lastSubmissionId}`}>Xem kết quả lượt trước</Link>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
