import { useEffect, useState } from "react";
import { api, errText } from "../../api";
import { Icon } from "../../Icon";
import { printBadges, seatLabel } from "./badgeSheet";
import type { CredentialStatus, IssueResult } from "./types";

/** Tab "Thẻ lớp": cấp mã (PIN chỉ hiện một lần) → in thẻ QR; đổi mã (thu hồi); mã tham gia bật/tắt; duyệt HS tự vào lớp. */
export function BadgesTab({ classId }: { classId: string }) {
  const [st, setSt] = useState<CredentialStatus | null>(null);
  const [issued, setIssued] = useState<IssueResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const load = () => {
    api<CredentialStatus>(`/api/classes/${classId}/credentials`).then(setSt).catch((e: unknown) => setErr(errText(e)));
  };
  useEffect(load, [classId]);
  const issue = async (all: boolean) => {
    setErr(null);
    setConfirm(false);
    try {
      const body = all && st ? { studentIds: st.students.map((s) => s.id) } : {};
      const r = await api<IssueResult>(`/api/classes/${classId}/credentials`, { method: "POST", body });
      setIssued(r);
      setNote(r.cards.length ? `Đã cấp mã cho ${r.cards.length} học sinh — in thẻ ngay, PIN chỉ hiện một lần.` : "Học sinh nào cũng đã có mã. Bấm “Đổi mã” để cấp lại cả lớp.");
      load();
    } catch (e) {
      setErr(errText(e));
    }
  };
  const join = async (open: boolean) => {
    try {
      await api(`/api/classes/${classId}/join`, { method: "PUT", body: { open } });
      load();
    } catch (e) {
      setErr(errText(e));
    }
  };
  const link = async (sid: string, approve: boolean) => {
    await api(`/api/classes/${classId}/students/${sid}/link`, { method: "POST", body: { approve } }).catch((e: unknown) => setErr(errText(e)));
    load();
  };
  if (!st) return err ? <div className="err">{err}</div> : null;
  const pending = st.students.filter((s) => s.linkPending);
  const cards = issued?.cards ?? [];
  return (
    <>
      <div className="lh-tools">
        <button className="btn" onClick={() => void issue(false)} data-testid="lh-issue"><Icon name="key" size={18} />Cấp mã</button>
        <button className="btn ghost" disabled={!cards.length} onClick={() => issued && void printBadges({ className: st.className, subject: st.subject, classCode: issued.classCode, cards }).catch((e: unknown) => setErr(errText(e)))} data-testid="lh-print"><Icon name="printer" size={18} />In thẻ</button>
        <button className="btn ghost lh-danger" onClick={() => setConfirm(true)}><Icon name="ban" size={18} />Đổi mã (thu hồi)</button>
      </div>
      {err && <div className="err">{err}</div>}
      {note && <div className="ok-box">{note}</div>}
      <div className="card lh-jcard">
        <span className="ic violet"><Icon name="users" /></span>
        <div className="g"><small>Mã lớp (in trên thẻ)</small><span className="code" data-testid="lh-class-code">{st.classCode ?? "—"}</span></div>
        <div className="g"><small>Mã tham gia lớp (cho sinh viên / HS dùng Google)</small><span className={`code${st.joinOpen ? "" : " off"}`} data-testid="lh-join-code">{st.joinCode ?? "—"}</span></div>
        {st.joinCode && <button className="btn ghost" onClick={() => void navigator.clipboard?.writeText(st.joinCode ?? "")}><Icon name="copy" size={18} />Sao chép</button>}
        <label className="lh-tgl"><input type="checkbox" checked={st.joinOpen} onChange={(e) => void join(e.target.checked)} data-testid="lh-join-toggle" />{st.joinOpen ? "Đang bật" : "Đang tắt"}</label>
      </div>
      {pending.length > 0 && (
        <div className="card lh-block">
          <h2>Chờ xác nhận vào lớp</h2>
          {pending.map((s) => (
            <div key={s.id} className="lh-arow"><div className="g"><b>{s.fullName}</b><small>Tài khoản tự tham gia, trùng họ tên + ngày sinh</small></div><button className="btn sm" onClick={() => void link(s.id, true)}>Đúng em này</button><button className="btn ghost sm" onClick={() => void link(s.id, false)}>Không phải</button></div>
          ))}
        </div>
      )}
      <div className="card lh-block">
        <table className="lh-tbl" data-testid="lh-badges">
          <thead><tr><th>STT</th><th>Họ tên</th><th>PIN</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {st.students.map((s) => {
              const c = cards.find((x) => x.studentId === s.id);
              return (
                <tr key={s.id}>
                  <td>{s.seat ? seatLabel(s.seat) : "—"}</td>
                  <td>{s.fullName}</td>
                  <td className="lh-pin" data-testid={s.seat ? `lh-pin-${s.seat}` : undefined}>{c ? c.pin : s.hasPin ? "••••••" : "—"}</td>
                  <td>{s.linked ? <span className="lh-chip c-blue">Tài khoản</span> : s.hasPin ? <span className="lh-chip c-green">Đã cấp</span> : <span className="lh-chip">Chưa cấp</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="hint">PIN chỉ hiện ngay sau khi cấp. Quên PIN thì cấp lại cho em đó (thẻ cũ hết dùng).</div>
      </div>
      {confirm && (
        <div className="lh-modal" role="dialog">
          <div className="lh-dlg lh-center">
            <div className="ic red"><Icon name="ban" /></div>
            <h3>Đổi mã cả lớp?</h3>
            <div className="hint">Thẻ đã in sẽ không dùng được nữa. Học sinh đăng nhập lại bằng thẻ mới; bài đang làm dở vẫn được lưu.</div>
            <div className="lh-actions"><button className="btn ghost" onClick={() => setConfirm(false)}>Huỷ</button><button className="btn lh-danger-fill" onClick={() => void issue(true)}>Thu hồi &amp; đổi mã</button></div>
          </div>
        </div>
      )}
    </>
  );
}
