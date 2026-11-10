import { useEffect, useState } from "react";
import { api, errText, vn } from "../../api";
import { Icon } from "../../Icon";
import { fmtWhen } from "./AssignTab";
import type { MonitorPayload, MonitorState } from "./types";

const POLL_MS = 5000;
const STATE_VI: Record<MonitorState, [string, string]> = { chua_vao: ["", "Chưa vào"], dang_lam: ["c-blue", "Đang làm"], da_nop: ["c-green", "Đã nộp"], tu_nop: ["c-amber", "Tự nộp hết giờ"] };
type Filter = "all" | "chua_vao" | "dang_lam" | "done";

/** Tab "Theo dõi": hỏi lại mỗi 5 giây (máy chủ cache 2 giây) — ai đang làm, đã nộp, rời tab mấy lần. */
export function MonitorTab({ assignmentId }: { assignmentId: string }) {
  const [m, setM] = useState<MonitorPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [since, setSince] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api<MonitorPayload>(`/api/assignments/${assignmentId}/monitor`)
        .then((x) => {
          if (!alive) return;
          setM(x);
          setErr(null);
          setSince(0);
          setRound((r) => r + 1);
        })
        .catch((e: unknown) => alive && setErr(errText(e)));
    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    const sec = window.setInterval(() => setSince((s) => s + 1), 1000);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearInterval(sec);
    };
  }, [assignmentId]);
  if (!m) return err ? <div className="err">{err}</div> : null;
  const done = m.counts.da_nop + m.counts.tu_nop;
  const cards: [Filter, string, string, string, number][] = [
    ["all", "users", "violet", "Cả lớp", m.rows.length],
    ["chua_vao", "ban", "amber", "Chưa vào", m.counts.chua_vao],
    ["dang_lam", "loader", "blue", "Đang làm", m.counts.dang_lam],
    ["done", "check", "green", "Đã nộp", done],
  ];
  const rows = m.rows.filter((r) => (filter === "all" || (filter === "done" ? r.state === "da_nop" || r.state === "tu_nop" : r.state === filter)) && r.fullName.toLowerCase().includes(q.trim().toLowerCase()));
  const ago = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.parse(m.serverNow) - Date.parse(iso)) / 1000)) + since : null);
  return (
    <>
      <div className="lh-mhead">
        <div className="g"><h2>{m.assignment.title}</h2><span className="hint">Mở {fmtWhen(m.assignment.opensAt)} · hạn {fmtWhen(m.assignment.dueAt)} · {m.assignment.questionCount} câu</span></div>
        <div className="lh-live"><span className="dotl" />Trực tiếp<svg className="lh-ring" viewBox="0 0 26 26"><circle className="bg" cx="13" cy="13" r="11" /><circle key={round} className="fg run" cx="13" cy="13" r="11" /></svg><span className="hint">{since ? `cập nhật ${since} giây trước` : "vừa cập nhật"}</span></div>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="lh-counters">
        {cards.map(([k, ic, color, label, n]) => (
          <button key={k} className={`card lh-cntc${filter === k ? " on" : ""}`} onClick={() => setFilter(k)} data-testid={`lh-count-${k}`}>
            <span className={`ic ${color}`}><Icon name={ic} /></span><div><b>{n}</b><small>{label}</small></div>
          </button>
        ))}
      </div>
      <div className="card lh-tablecard">
        <div className="lh-tools"><input className="inp" placeholder="Tìm học sinh…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="lh-chip c-amber"><Icon name="eyeoff" size={14} />Rời tab: số lần HS thoát khỏi trang</span></div>
        <div className="lh-scroll">
          <table className="lh-tbl" data-testid="lh-monitor">
            <thead><tr><th>TT</th><th>Họ tên</th><th>Trạng thái</th><th className="lh-hide-sm">Tiến độ</th><th>Rời tab</th><th className="lh-hide-sm num">Cập nhật</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const label = r.state === "dang_lam" ? `Đang làm – ${r.answered}/${r.total} câu` : r.state === "chua_vao" ? "Chưa vào" : `${STATE_VI[r.state][1]} – ${vn(r.score10)}`;
                const pg = r.state === "chua_vao" ? 0 : r.state === "dang_lam" ? r.answered : r.total;
                const a = ago(r.updatedAt);
                return (
                  <tr key={r.studentId} data-testid="lh-mrow">
                    <td className="hint">{r.seat ?? "—"}</td>
                    <td><div className="lh-nm"><span className="avatar">{(r.fullName.trim().split(/\s+/).pop() ?? "").charAt(0)}</span>{r.fullName}</div></td>
                    <td><span className={`lh-chip ${STATE_VI[r.state][0]}`}>{label}</span></td>
                    <td className="lh-hide-sm"><div className="lh-pg"><div className="lh-bar"><i style={{ width: `${(pg / Math.max(1, r.total)) * 100}%`, background: r.state === "dang_lam" ? undefined : "var(--green)" }} /></div><small>{pg}/{r.total}</small></div></td>
                    <td><span className={`lh-leave ${r.leaveCount >= 5 ? "h" : r.leaveCount >= 2 ? "m" : ""}`}><Icon name="eyeoff" size={13} />{r.leaveCount}</span></td>
                    <td className="lh-hide-sm num hint">{r.state === "chua_vao" ? "—" : r.state === "dang_lam" ? `${a} giây trước` : "đã nộp"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
