// web/src/pages/Diagrams.tsx — danh sách sơ đồ tư duy / lưu đồ (UI v2)
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { DiagramSummary } from "../api";
import { makeNode, sampleDoc } from "../diagram/ops";
import type { DiagramDoc, DiagramKind } from "../diagram/types";
import { DocList } from "../portal/gv/DocList";
import { dateVi, del, FormPane, get, GRADE_OPTS, gradeVi, post, SUBJECT_DEFAULT, useKeyN, useOpenParam, useRun } from "../portal/gv/kit";
import { Button, IconButton } from "../ui/components/Button";
import { Badge, Segmented } from "../ui/components/Chip";
import { ConfirmDialog } from "../ui/components/Dialog";
import { Field, Input, Select } from "../ui/components/Field";
import type { Column } from "../ui/components/Table";
import { invalidate, useQuery } from "../ui/data/query";
import { usePageMeta } from "../ui/shell/AppShell";

const KEY = "gv/so-do";
const KIND_VI: Record<DiagramKind, string> = { mind: "Sơ đồ tư duy", flow: "Lưu đồ" };
const blank = (kind: DiagramKind): DiagramDoc => ({ version: 1, kind, nodes: [makeNode(kind, kind === "mind" ? "Chủ đề" : "Bắt đầu", { x: -60, y: -20, shape: kind === "mind" ? "round" : "ellipse" })], edges: [] });

/** /so-do — sơ đồ tư duy / lưu đồ: bảng v2, lọc loại, tạo trong trang (trống, từ mẫu, AI vẽ sơ đồ công thức). */
export function Diagrams() {
  usePageMeta("Sơ đồ");
  const nav = useNavigate();
  const q = useQuery(KEY, get<DiagramSummary[]>("/api/diagrams"));
  const [open, setOpen] = useOpenParam();
  const [toDel, setToDel] = useState<DiagramSummary | null>(null);
  const run = useRun();
  useKeyN(() => setOpen(true));
  const sorts = useMemo(() => ({ ten: (d: DiagramSummary) => d.title, hinh: (d: DiagramSummary) => d.nodeCount, sua: (d: DiagramSummary) => d.updatedAt }), []);
  const cols: Column<DiagramSummary>[] = [
    { key: "ten", header: "Sơ đồ", sortable: true, cell: (d) => <span><span className="t-title">{d.title}</span><span className="t-sub">{[d.subject, gradeVi(d.grade), d.topic].filter(Boolean).join(" · ")}</span></span> },
    { key: "loai", header: "Loại", hideSm: true, cell: (d) => <Badge tone={d.kind === "mind" ? "accent" : "outline"} icon={d.kind === "mind" ? "graph" : "list"}>{KIND_VI[d.kind]}</Badge> },
    { key: "hinh", header: "Hình", numeric: true, sortable: true, cell: (d) => d.nodeCount },
    { key: "sua", header: "Sửa lần cuối", numeric: true, sortable: true, hideSm: true, cell: (d) => dateVi(d.updatedAt) },
    { key: "act", header: "", numeric: true, cell: (d) => <span className="t-acts" onClick={(e) => e.stopPropagation()}><IconButton size="sm" icon="trash" label={`Xoá ${d.title}`} onClick={() => setToDel(d)} /></span> },
  ];
  return (
    <>
      <DocList
        title="Sơ đồ"
        caption={`${q.data?.length ?? 0} sơ đồ`}
        q={q}
        columns={cols}
        rowKey={(d) => d.id}
        text={(d) => `${d.title} ${d.topic} ${d.subject}`}
        sorts={sorts}
        defSort="-sua"
        facet={{ key: "loai", label: "Loại", of: (d) => d.kind, name: (k) => KIND_VI[k as DiagramKind] ?? k }}
        primary={{ label: "Tạo sơ đồ", icon: "plus", kbd: "N", onClick: () => setOpen(true) }}
        form={open && <NewDiagram onClose={() => setOpen(false)} onDone={(to) => nav(to)} />}
        onRowClick={(d) => nav(`/so-do/${d.id}`)}
        searchHint="Tìm tên, chủ đề…"
        empty={{ icon: "graph", title: "Chưa có sơ đồ", text: "Vẽ sơ đồ tư duy, lưu đồ, hoặc để AI vẽ sơ đồ công thức theo chủ đề (vd: Công thức lượng giác lớp 10).", action: <Button size="sm" variant="primary" icon="plus" onClick={() => setOpen(true)}>Tạo sơ đồ</Button> }}
      />
      <ConfirmDialog open={!!toDel} title={`Xoá sơ đồ “${toDel?.title ?? ""}”?`} text="Không hoàn tác được." confirmLabel="Xoá" onClose={() => setToDel(null)} onConfirm={() => toDel && run(async () => { await del(`/api/diagrams/${toDel.id}`); invalidate(KEY); }, "Đã xoá sơ đồ")} />
    </>
  );
}

type How = "trong" | "mau" | "cong-thuc";
function NewDiagram({ onClose, onDone }: { onClose: () => void; onDone: (to: string) => void }) {
  const run = useRun();
  const [how, setHow] = useState<How>("trong");
  const [f, setF] = useState({ title: "", subject: SUBJECT_DEFAULT, grade: 10, topic: "", kind: "mind" as DiagramKind });
  const [err, setErr] = useState<string | null>(null);
  const formula = how === "cong-thuc";
  const save = () => {
    const title = (formula ? f.topic : f.title).trim();
    if (!title) return void setErr(formula ? "Nhập chủ đề, ví dụ: Công thức lượng giác lớp 10" : "Nhập tên sơ đồ");
    setErr(null);
    return run(async () => {
      const grade = formula ? Number(/lớp\s*(\d{1,2})/i.exec(title)?.[1] ?? f.grade) || f.grade : f.grade;
      const doc = formula ? blank("mind") : how === "mau" ? sampleDoc(f.kind) : blank(f.kind);
      const r = await post<DiagramSummary>("/api/diagrams", { title: title.slice(0, 120), subject: f.subject, topic: (formula ? title : f.topic).slice(0, 120), grade: Math.min(16, Math.max(1, grade)), doc });
      invalidate(KEY);
      onDone(formula ? `/so-do/${r.id}?cong-thuc=${encodeURIComponent(title)}` : `/so-do/${r.id}`);
      return r;
    }, formula ? "Đã tạo sơ đồ — AI đang vẽ công thức" : `Đã tạo “${title}”`);
  };
  return (
    <FormPane
      title="Tạo sơ đồ"
      onClose={onClose}
      footer={<><Button onClick={onClose}>Huỷ</Button><Button variant="primary" icon={formula ? "spark" : "check"} onClick={save} data-testid={formula ? "sd-formula-go" : "sd-create"}>{formula ? "AI vẽ sơ đồ công thức" : "Tạo và mở"}</Button></>}
    >
      <Segmented label="Cách tạo" value={how} onChange={setHow} options={[{ value: "trong", label: "Trống" }, { value: "mau", label: "Từ mẫu" }, { value: "cong-thuc", label: "Sơ đồ công thức (AI)" }]} />
      <form className="fgrid" onSubmit={(e) => (e.preventDefault(), void save())}>
        {formula ? (
          <div className="full"><Field label="Chủ đề công thức" error={err}><Input autoFocus placeholder="Công thức lượng giác lớp 10, Đạo hàm" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} data-testid="sd-formula-topic" /></Field></div>
        ) : (
          <>
            <div className="wide"><Field label="Tên sơ đồ" error={err}><Input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="sd-title" /></Field></div>
            <Field label="Loại"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as DiagramKind })} data-testid="sd-kind"><option value="mind">Sơ đồ tư duy</option><option value="flow">Lưu đồ</option></Select></Field>
            <Field label="Chủ đề"><Input value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
          </>
        )}
        <Field label="Môn"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Lớp"><Select value={f.grade} onChange={(e) => setF({ ...f, grade: Number(e.target.value) })}>{GRADE_OPTS}</Select></Field>
        <button type="submit" hidden />
      </form>
    </FormPane>
  );
}
