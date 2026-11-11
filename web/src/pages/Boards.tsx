// web/src/pages/Boards.tsx — danh sách bảng giảng (UI v2)
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { BoardSummary } from "../api";
import { DocList } from "../portal/gv/DocList";
import { GRADE_OPTS, SUBJECT_DEFAULT, dateVi, del, FormPane, get, gradeVi, post, useKeyN, useOpenParam, useRun } from "../portal/gv/kit";
import { Button, IconButton } from "../ui/components/Button";
import { ConfirmDialog } from "../ui/components/Dialog";
import { Field, Input, Select } from "../ui/components/Field";
import type { Column } from "../ui/components/Table";
import { invalidate, useQuery } from "../ui/data/query";
import { usePageMeta } from "../ui/shell/AppShell";

const KEY = "gv/bang-giang";

/** /bang-giang — bài giảng trên bảng (mở toàn màn hình): bảng v2, lọc môn, tạo trong trang, xoá có xác nhận. */
export function Boards() {
  usePageMeta("Bảng giảng");
  const nav = useNavigate();
  const q = useQuery(KEY, get<BoardSummary[]>("/api/boards"));
  const [open, setOpen] = useOpenParam();
  const [toDel, setToDel] = useState<BoardSummary | null>(null);
  const run = useRun();
  useKeyN(() => setOpen(true));
  const sorts = useMemo(() => ({ ten: (b: BoardSummary) => b.title, trang: (b: BoardSummary) => b.pageCount, sua: (b: BoardSummary) => b.updatedAt }), []);
  const cols: Column<BoardSummary>[] = [
    { key: "ten", header: "Bài giảng", sortable: true, cell: (b) => <span><span className="t-title">{b.title}</span><span className="t-sub">{b.topic || "—"}</span></span> },
    { key: "mon", header: "Môn · lớp", hideSm: true, cell: (b) => <span className="caption">{b.subject} · {gradeVi(b.grade)}</span> },
    { key: "trang", header: "Trang", numeric: true, sortable: true, cell: (b) => b.pageCount },
    { key: "sua", header: "Sửa lần cuối", numeric: true, sortable: true, hideSm: true, cell: (b) => dateVi(b.updatedAt) },
    { key: "act", header: "", numeric: true, cell: (b) => <span className="t-acts" onClick={(e) => e.stopPropagation()}><IconButton size="sm" icon="trash" label={`Xoá ${b.title}`} onClick={() => setToDel(b)} /></span> },
  ];
  return (
    <>
      <DocList
        title="Bảng giảng"
        caption={`${q.data?.length ?? 0} bài · mở toàn màn hình để giảng`}
        q={q}
        columns={cols}
        rowKey={(b) => b.id}
        text={(b) => `${b.title} ${b.topic} ${b.subject}`}
        sorts={sorts}
        defSort="-sua"
        facet={{ key: "mon", label: "Môn", of: (b) => b.subject }}
        primary={{ label: "Tạo bài giảng", icon: "plus", kbd: "N", onClick: () => setOpen(true) }}
        form={open && <NewBoard onClose={() => setOpen(false)} onDone={(id) => nav(`/bang-giang/${id}`)} />}
        onRowClick={(b) => nav(`/bang-giang/${b.id}`)}
        searchHint="Tìm tên bài, chủ đề…"
        empty={{ icon: "board", title: "Chưa có bài giảng", text: "Bảng giảng: viết tay, chèn công thức, hình không gian, câu hỏi từ ngân hàng — chiếu lên lớp.", action: <Button size="sm" variant="primary" icon="plus" onClick={() => setOpen(true)}>Tạo bài giảng</Button> }}
      />
      <ConfirmDialog open={!!toDel} title={`Xoá bài giảng “${toDel?.title ?? ""}”?`} text="Mọi trang trên bảng của bài này sẽ mất. Không hoàn tác được." confirmLabel="Xoá" onClose={() => setToDel(null)} onConfirm={() => toDel && run(async () => { await del(`/api/boards/${toDel.id}`); invalidate(KEY); }, "Đã xoá bài giảng")} />
    </>
  );
}

function NewBoard({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const run = useRun();
  const [f, setF] = useState({ title: "", subject: SUBJECT_DEFAULT, grade: 10, topic: "" });
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    if (!f.title.trim()) return void setErr("Nhập tên bài");
    setErr(null);
    return run(async () => {
      const b = await post<BoardSummary>("/api/boards", { ...f, title: f.title.trim() });
      invalidate(KEY);
      onDone(b.id);
      return b;
    }, `Đã tạo “${f.title.trim()}”`);
  };
  return (
    <FormPane title="Tạo bài giảng" onClose={onClose} footer={<><Button onClick={onClose}>Huỷ</Button><Button variant="primary" icon="check" onClick={save} data-testid="bg-create">Tạo và mở bảng</Button></>}>
      <form className="fgrid" onSubmit={(e) => (e.preventDefault(), void save())}>
        <div className="wide"><Field label="Tên bài" error={err}><Input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="bg-title" /></Field></div>
        <Field label="Môn"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Lớp"><Select value={f.grade} onChange={(e) => setF({ ...f, grade: Number(e.target.value) })}>{GRADE_OPTS}</Select></Field>
        <div className="wide"><Field label="Chủ đề"><Input value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} data-testid="bg-topic" /></Field></div>
        <button type="submit" hidden />
      </form>
    </FormPane>
  );
}
