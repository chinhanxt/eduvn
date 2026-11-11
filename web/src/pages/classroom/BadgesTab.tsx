import { useMemo, useState } from "react";
import { CodePill, errorOf, get, post, put, useListView, useRun, FilterBar, SearchBox } from "../../portal/gv/kit";
import { Button } from "../../ui/components/Button";
import { Badge } from "../../ui/components/Chip";
import { ConfirmDialog } from "../../ui/components/Dialog";
import { Region } from "../../ui/components/States";
import { type Column, Table } from "../../ui/components/Table";
import { invalidate, useQuery } from "../../ui/data/query";
import { printBadges, seatLabel } from "./badgeSheet";
import type { CredentialStatus, IssueResult } from "./types";

type Stu = CredentialStatus["students"][number];

/** Tab "Thẻ lớp": cấp mã (PIN chỉ hiện một lần) → in thẻ QR; đổi mã (thu hồi); mã tham gia bật/tắt; duyệt HS tự vào lớp. */
export function BadgesTab({ classId }: { classId: string }) {
  const key = `gv/lop/${classId}/the`;
  const q = useQuery(key, get<CredentialStatus>(`/api/classes/${classId}/credentials`));
  const [issued, setIssued] = useState<IssueResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const run = useRun();
  const st = q.data;
  const v = useListView(st?.students, { text: (s) => s.fullName, sorts: useMemo(() => ({ stt: (s: Stu) => s.seat, ten: (s: Stu) => s.fullName.split(/\s+/).pop() ?? "" }), []), defSort: "stt", pageSize: 50, prefix: "the" });
  if (!st) return <Region className="pane" label="Thẻ lớp" status={q.error ? "loi" : "dang-tai"} error={errorOf(q.error)} onRetry={q.refetch} skeletonRows={6} />;
  const issue = (all: boolean) =>
    run(async () => {
      const r = await post<IssueResult>(`/api/classes/${classId}/credentials`, all ? { studentIds: st.students.map((s) => s.id) } : {});
      setIssued(r);
      invalidate(key);
      return r;
    }, (r) => (r.cards.length ? { title: `Đã cấp mã cho ${r.cards.length} học sinh`, msg: "In thẻ ngay — PIN chỉ hiện một lần." } : { title: "Học sinh nào cũng đã có mã", msg: "Bấm “Đổi mã” để cấp lại cả lớp.", kind: "info" }));
  const join = (open: boolean) =>
    run(async () => {
      await put(`/api/classes/${classId}/join`, { open });
      invalidate(key);
    }, open ? "Đã bật mã tham gia" : "Đã tắt mã tham gia");
  const link = (s: Stu, approve: boolean) =>
    run(async () => {
      await post(`/api/classes/${classId}/students/${s.id}/link`, { approve });
      invalidate(key);
    }, approve ? `Đã xác nhận ${s.fullName}` : "Đã từ chối");
  const pending = st.students.filter((s) => s.linkPending);
  const cards = issued?.cards ?? [];
  const withPin = st.students.filter((s) => s.hasPin).length;
  const cols: Column<Stu>[] = [
    { key: "stt", header: "STT", sortable: true, width: 64, cell: (s) => (s.seat ? seatLabel(s.seat) : "—") },
    { key: "ten", header: "Học sinh", sortable: true, cell: (s) => s.fullName },
    { key: "pin", header: "PIN", cell: (s) => { const c = cards.find((x) => x.studentId === s.id); return <span className="mono" style={{ fontSize: 14, letterSpacing: ".12em" }} data-testid={s.seat ? `lh-pin-${s.seat}` : undefined}>{c ? c.pin : s.hasPin ? "••••••" : "—"}</span>; } },
    { key: "tt", header: "Trạng thái", cell: (s) => (s.linked ? <Badge tone="accent" icon="user">Tài khoản</Badge> : s.hasPin ? <Badge tone="ok">Đã cấp</Badge> : <Badge>Chưa cấp</Badge>) },
  ];
  return (
    <>
      <section className="kpis k4" aria-label="Mã lớp">
        <div><div className="k">Mã lớp (in trên thẻ)</div><div className="v" data-testid="lh-class-code">{st.classCode ? <CodePill code={st.classCode} label="Mã lớp" className="lg" /> : "—"}</div></div>
        <div><div className="k">Mã tham gia (HS dùng Google)</div><div className="v" data-testid="lh-join-code">{st.joinCode ? <CodePill code={st.joinCode} label="Mã tham gia" className={st.joinOpen ? "lg" : "lg off"} /> : "—"}</div></div>
        <div><div className="k">Đã cấp PIN</div><div className="v">{withPin}/{st.students.length} <small className="mu">học sinh</small></div></div>
        <div>
          <div className="k">Tự tham gia bằng mã</div>
          <label className="check-row" style={{ minHeight: 28 }}><input type="checkbox" checked={st.joinOpen} onChange={(e) => void join(e.target.checked)} data-testid="lh-join-toggle" />{st.joinOpen ? "Đang bật" : "Đang tắt"}</label>
        </div>
      </section>
      {pending.length > 0 && (
        <section className="pane mt" aria-label="Chờ xác nhận">
          <div className="ghd">Chờ xác nhận vào lớp <span className="n">{pending.length}</span></div>
          <ul className="rows">
            {pending.map((s) => (
              <li key={s.id}>
                <div className="g"><b>{s.fullName}</b><small>Tài khoản tự tham gia, trùng họ tên + ngày sinh</small></div>
                <Button size="sm" onClick={() => link(s, true)}>Đúng em này</Button>
                <Button size="sm" variant="ghost" onClick={() => link(s, false)}>Không phải</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="pane mt" aria-label="Thẻ học sinh">
        <FilterBar>
          <SearchBox value={v.q} onChange={v.setQ} placeholder="Tìm học sinh  /" label="Tìm học sinh" />
          <span className="grow" />
          <Button size="sm" variant="primary" icon="key" onClick={() => issue(false)} data-testid="lh-issue">Cấp mã</Button>
          <Button size="sm" icon="printer" disabled={!cards.length} title={cards.length ? undefined : "Cấp mã trước để in thẻ có PIN"} onClick={() => issued && run(() => printBadges({ className: st.className, subject: st.subject, classCode: issued.classCode, cards }))} data-testid="lh-print">In thẻ</Button>
          <Button size="sm" variant="ghost" icon="ban" className="danger" onClick={() => setConfirm(true)}><span className="hide-sm">Đổi mã</span></Button>
        </FilterBar>
        <div data-testid="lh-badges"><Table label="Thẻ học sinh" dense columns={cols} rows={v.rows} rowKey={(s) => s.id} sort={v.sort} onSort={v.setSort} page={v.pageProp} status={st.students.length ? (v.total ? "ok" : "trong") : "trong"} empty={{ icon: "users", title: st.students.length ? "Không em nào khớp" : "Lớp chưa có học sinh" }} /></div>
        <div className="ghd" style={{ borderBottom: 0, borderRadius: "0 0 var(--r-md) var(--r-md)", fontWeight: 400 }}>PIN chỉ hiện ngay sau khi cấp. Quên PIN thì cấp lại cho em đó (thẻ cũ hết dùng).</div>
      </section>
      <ConfirmDialog open={confirm} title="Đổi mã cả lớp?" text="Thẻ đã in sẽ không dùng được nữa. Học sinh đăng nhập lại bằng thẻ mới; bài đang làm dở vẫn được lưu." confirmLabel="Thu hồi và đổi mã" onConfirm={() => issue(true)} onClose={() => setConfirm(false)} />
    </>
  );
}
