import { useEffect, useState } from "react";
import { api, errText, vn } from "../../api";
import { Icon } from "../../Icon";
import { MathText } from "../../math/MathText";
import type { ResultsPayload, SubmissionDetail } from "./types";

const band = (d: number): [string, string] => (d >= 0.4 ? ["g", "Tốt"] : d >= 0.3 ? ["b", "Khá"] : d >= 0.2 ? ["a", "Xem lại"] : ["r", "Kém"]);
const ease = (p: number): [string, string] => (p >= 0.8 ? ["Dễ", "var(--green)"] : p >= 0.4 ? ["Vừa", "var(--brand)"] : ["Khó", "#d63a3a"]);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const LETTERS = "ABCD";

/** Tab "Kết quả & thống kê": số liệu (màn 7 của mockup) + bảng điểm + xem/chấm từng bài. */
export function ResultsTab({ assignmentId }: { assignmentId: string }) {
  const [r, setR] = useState<ResultsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = () => {
    api<ResultsPayload>(`/api/assignments/${assignmentId}/results`).then(setR).catch((e: unknown) => setErr(errText(e)));
  };
  useEffect(load, [assignmentId]);
  if (!r) return err ? <div className="err">{err}</div> : null;
  const s = r.stats;
  return (
    <>
      {err && <div className="err">{err}</div>}
      <div className="lh-kpis">
        <div className="card lh-kpi"><small>Tỉ lệ nộp</small><b data-testid="lh-kpi-submit">{s.submitted} / {s.rosterSize}</b><span>{pct(s.submitRate)}</span></div>
        <div className="card lh-kpi"><small>Điểm trung bình</small><b>{s.mean === null ? "—" : vn(s.mean)}</b><span>Trung vị {s.median === null ? "—" : vn(s.median)}</span></div>
        <div className="card lh-kpi"><small>Cao nhất</small><b>{s.best ? vn(s.best.score10) : "—"}</b><span>{s.best?.fullName ?? ""}</span></div>
        <div className="card lh-kpi"><small>Thấp nhất</small><b>{s.worst ? vn(s.worst.score10) : "—"}</b><span>{s.worst?.fullName ?? ""}</span></div>
      </div>
      <div className="lh-grid2">
        <div className="card"><h2>Phân bố điểm</h2><Histogram counts={s.distribution} mean={s.mean} /></div>
        <div className="card">
          <h2>Chủ đề yếu <small className="hint">· tỉ lệ đúng</small></h2>
          <div className="lh-wk">
            {s.topics.map((t) => (
              <div key={t.topic} className="w"><span>{t.topic}</span><div className="lh-bar"><i style={{ width: pct(t.rate), background: t.rate < 0.5 ? "#d63a3a" : t.rate < 0.65 ? "#e08a00" : "var(--brand)" }} /></div><b>{pct(t.rate)}</b></div>
            ))}
          </div>
        </div>
      </div>
      <div className="card lh-block">
        <h2>Từng câu hỏi</h2>
        <div className="lh-scroll">
          <table className="lh-tbl" data-testid="lh-items">
            <thead><tr><th>Câu</th><th>Chủ đề</th><th>Độ khó p</th><th>Độ phân biệt D</th><th>Đáp án nhiễu hay chọn</th></tr></thead>
            <tbody>
              {s.items.map((i) => {
                const wrong = i.choices.find((c) => !c.correct);
                return (
                  <tr key={i.questionId}>
                    <td><b>Câu {i.label}</b>{i.flag && <span className="lh-chip c-amber">{i.flag}</span>}</td>
                    <td>{i.topic}</td>
                    <td>{i.p === null ? "—" : <div className="lh-pbar"><div className="lh-bar"><i style={{ width: pct(i.p), background: ease(i.p)[1] }} /></div><b>{vn(i.p)}</b><span className="lh-chip">{ease(i.p)[0]}</span></div>}</td>
                    <td>{i.d === null ? <span className="hint">cần ≥ 10 bài</span> : <span className={`lh-bd ${band(i.d)[0]}`}>{vn(i.d)} <small>{band(i.d)[1]}</small></span>}</td>
                    <td>{wrong ? <><MathText value={wrong.choice} /> · {pct(wrong.count / Math.max(1, i.n))}</> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="lh-legd"><b>Độ phân biệt D:</b><span className="lh-bd g">≥ 0,40 <small>Tốt</small></span><span className="lh-bd b">0,30–0,39 <small>Khá</small></span><span className="lh-bd a">0,20–0,29 <small>Xem lại</small></span><span className="lh-bd r">&lt; 0,20 <small>Kém</small></span></div>
      </div>
      <div className="card lh-block">
        <h2>Học sinh cần quan tâm</h2>
        {s.atRisk.length === 0 && <div className="empty">Không có</div>}
        <div className="lh-att">
          {s.atRisk.map((a) => (
            <div key={a.studentId} className="a"><span className="avatar">{(a.fullName.trim().split(/\s+/).pop() ?? "").charAt(0)}</span><div className="g"><b>{a.fullName}</b><div className="why">{a.reasons.map((x) => <span key={x} className={`lh-chip ${x.startsWith("Rời") ? "c-amber" : "c-red"}`}>{x}</span>)}</div></div><span className="sc">{a.score10 === null ? "—" : vn(a.score10)}</span></div>
          ))}
        </div>
      </div>
      <div className="card lh-block">
        <h2>Bảng điểm</h2>
        <table className="lh-tbl" data-testid="lh-results">
          <thead><tr><th>TT</th><th>Họ tên</th><th>Trạng thái</th><th className="num">Điểm (thang 10)</th><th className="num">Lượt</th><th /></tr></thead>
          <tbody>
            {r.rows.map((x) => (
              <tr key={x.studentId} data-testid="lh-row">
                <td className="hint">{x.seat ?? "—"}</td>
                <td>{x.fullName}</td>
                <td>{x.status === null ? "Chưa vào" : x.status === "in_progress" ? "Đang làm" : x.status === "auto_submitted" ? "Tự nộp hết giờ" : "Đã nộp"}{x.pending > 0 && <span className="lh-chip c-violet">{x.pending} câu chờ chấm</span>}</td>
                <td className="num" data-testid="lh-score">{x.score10 === null ? "—" : vn(x.score10)}</td>
                <td className="num">{x.attempts}</td>
                <td>{x.submissionId && x.status !== "in_progress" && <button className="btn ghost sm" onClick={() => setOpen(x.submissionId)}>Xem bài</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <SubmissionView assignmentId={assignmentId} submissionId={open} onClose={(changed) => { setOpen(null); if (changed) load(); }} />}
    </>
  );
}

function Histogram({ counts, mean }: { counts: number[]; mean: number | null }) {
  const W = 580, H = 250, L = 34, B = 34, T = 22, bw = 46, gap = 8.4;
  const top = Math.max(2, ...counts);
  const sc = (H - B - T) / top;
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((top / 4) * i));
  return (
    <svg className="lh-hist" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Biểu đồ phân bố điểm">
      {ticks.map((g) => <g key={g}><line x1={L} x2={W - 6} y1={H - B - g * sc} y2={H - B - g * sc} stroke="#eceef4" /><text x={L - 8} y={H - B - g * sc + 4} textAnchor="end">{g}</text></g>)}
      {counts.map((n, i) => {
        const x = L + 8 + i * (bw + gap), h = n * sc, y = H - B - h;
        return (
          <g key={i}>
            {n > 0 && <rect x={x} y={y} width={bw} height={h} rx={7} fill={i < 5 ? "#ef6a6a" : i < 7 ? "#6c83ee" : "#4f6bed"}><title>{`${i}–${i + 1} điểm: ${n} HS`}</title></rect>}
            {n > 0 && <text className="cnt-t" x={x + bw / 2} y={y - 6} textAnchor="middle">{n}</text>}
            <text x={x + bw / 2} y={H - 14} textAnchor="middle">{i}–{i + 1}</text>
          </g>
        );
      })}
      {mean !== null && (() => {
        const mx = L + 8 + mean * (bw + gap) - gap / 2;
        return <g><line x1={mx} x2={mx} y1={T - 6} y2={H - B} stroke="#1b2033" strokeDasharray="4 4" /><rect x={mx - 38} y={T - 22} width={76} height={20} rx={10} fill="#1b2033" /><text x={mx} y={T - 8} textAnchor="middle" style={{ fill: "#fff" }}>TB {vn(mean)}</text></g>;
      })()}
    </svg>
  );
}

function SubmissionView({ assignmentId, submissionId, onClose }: { assignmentId: string; submissionId: string; onClose: (changed: boolean) => void }) {
  const [d, setD] = useState<SubmissionDetail | null>(null);
  const [pts, setPts] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<SubmissionDetail>(`/api/assignments/${assignmentId}/submissions/${submissionId}`).then(setD).catch((e: unknown) => setErr(errText(e)));
  }, [assignmentId, submissionId]);
  const save = async () => {
    const points = Object.fromEntries(Object.entries(pts).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Number(v.replace(",", "."))]));
    try {
      await api(`/api/assignments/${assignmentId}/submissions/${submissionId}/grades`, { method: "PUT", body: { points } });
      onClose(true);
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="lh-modal" role="dialog">
      <div className="lh-dlg">
        <div className="lh-dhead"><b>{d ? `${d.student.fullName} · mã đề ${d.submission.variantCode}` : "…"}</b><button className="xbtn" onClick={() => onClose(false)} aria-label="Đóng"><Icon name="x" /></button></div>
        {err && <div className="err">{err}</div>}
        {d && (
          <>
            <div className="hint" style={{ textAlign: "left" }}>Điểm {vn(d.submission.score)} / {vn(d.submission.maxScore)} · rời tab {d.submission.leaveCount} lần{d.events.length ? ` (${d.events.filter((e) => e.kind === "leave").map((e) => new Date(e.at).toLocaleTimeString("vi-VN")).join(", ")})` : ""}</div>
            {d.items.map((it, i) => (
              <div key={it.no} className="lh-ditem">
                <div><b>Câu {i + 1}</b> <span className="hint">{vn(it.points)} / {vn(it.maxPoints)}</span></div>
                <MathText value={it.stem} />
                <div className="hint" style={{ textAlign: "left" }}>
                  Trả lời: {it.response === null ? "—" : it.type === "mcq" && typeof it.response === "number" ? LETTERS[it.response] : it.type === "true_false" && Array.isArray(it.response) ? it.response.map((b) => (b === null ? "_" : b ? "Đ" : "S")).join("") : it.type === "short_answer" ? <MathText value={`$${String(it.response)}$`} /> : String(it.response)}
                  {it.key && <> · Đáp án: <MathText value={it.key} /></>}
                </div>
                {it.type === "essay" && (
                  <div className="lh-essay">
                    {it.rubric && <div className="warn"><MathText value={it.rubric} /></div>}
                    <label className="lh-field">Điểm (tối đa {vn(it.maxPoints)})<input className="inp w-s" inputMode="decimal" defaultValue={it.points === null ? "" : vn(it.points)} onChange={(e) => setPts({ ...pts, [String(it.no)]: e.target.value })} data-testid={`lh-essay-${it.no}`} /></label>
                  </div>
                )}
              </div>
            ))}
            {d.items.some((x) => x.type === "essay") && <button className="btn" onClick={() => void save()} data-testid="lh-grade-save"><Icon name="check" size={18} />Lưu điểm tự luận</button>}
          </>
        )}
      </div>
    </div>
  );
}
