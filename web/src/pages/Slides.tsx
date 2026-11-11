import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { DeckSummary } from "../api";
import { DocList } from "../portal/gv/DocList";
import { fetchLessons, LESSONS_KEY, dateVi, del, FormPane, get, gradeVi, openLink, post, useKeyN, useOpenParam, useRun } from "../portal/gv/kit";
import { Button, IconButton } from "../ui/components/Button";
import { Badge } from "../ui/components/Chip";
import { ConfirmDialog } from "../ui/components/Dialog";
import { Field, Select } from "../ui/components/Field";
import type { Column } from "../ui/components/Table";
import { invalidate, useQuery } from "../ui/data/query";
import { usePageMeta } from "../ui/shell/AppShell";

const KEY = "gv/slide";

/** /slide — bộ slide (.pptx) tạo từ giáo án: bảng v2, tạo trong trang, tải busy + toast, xoá có xác nhận. */
export function Slides() {
  usePageMeta("Slide");
  const q = useQuery(KEY, get<DeckSummary[]>("/api/slides"));
  const [open, setOpen] = useOpenParam();
  const [toDel, setToDel] = useState<DeckSummary | null>(null);
  const run = useRun();
  useKeyN(() => setOpen(true));
  const cols: Column<DeckSummary>[] = [
    { key: "ten", header: "Bộ slide", sortable: true, cell: (d) => <span><span className="t-title">{d.title}</span><span className="t-sub">{[d.subject, gradeVi(d.grade)].filter(Boolean).join(" · ") || "—"}</span></span> },
    { key: "so", header: "Số slide", numeric: true, sortable: true, cell: (d) => d.slideCount },
    { key: "nguon", header: "Nguồn", hideSm: true, cell: (d) => (d.sourceLessonPlanId ? <Link className="link" to={`/giao-an/${d.sourceLessonPlanId}`} onClick={(e) => e.stopPropagation()}>Từ giáo án</Link> : <Badge>Tự soạn</Badge>) },
    { key: "sua", header: "Sửa lần cuối", numeric: true, sortable: true, hideSm: true, cell: (d) => dateVi(d.updatedAt) },
    {
      key: "act",
      header: "",
      numeric: true,
      cell: (d) => (
        <span className="t-acts">
          <Button size="sm" icon="down" onClick={() => run(() => openLink(`/api/slides/${d.id}/export`), `Đang tải “${d.title}” .pptx`)} data-testid="slide-download">Tải .pptx</Button>
          <IconButton size="sm" icon="trash" label={`Xoá ${d.title}`} onClick={() => setToDel(d)} />
        </span>
      ),
    },
  ];
  const sorts = useMemo(() => ({ ten: (d: DeckSummary) => d.title, so: (d: DeckSummary) => d.slideCount, sua: (d: DeckSummary) => d.updatedAt }), []);
  return (
    <>
      <DocList
        title="Slide"
        caption={`${q.data?.length ?? 0} bộ slide`}
        q={q}
        columns={cols}
        rowKey={(d) => d.id}
        text={(d) => `${d.title} ${d.subject ?? ""}`}
        sorts={sorts}
        defSort="-sua"
        primary={{ label: "Từ giáo án", icon: "plus", kbd: "N", onClick: () => setOpen(true) }}
        form={open && <FromLesson onClose={() => setOpen(false)} />}
        searchHint="Tìm tên bộ slide…"
        testId="slide-list"
        empty={{ icon: "slide", title: "Chưa có bộ slide", text: "Chọn một giáo án — hệ thống dựng slide theo 4 hoạt động, tải về PowerPoint để chỉnh.", action: <Button size="sm" variant="primary" icon="plus" onClick={() => setOpen(true)}>Tạo từ giáo án</Button> }}
      />
      <ConfirmDialog open={!!toDel} title={`Xoá bộ slide “${toDel?.title ?? ""}”?`} text="Tệp .pptx đã tải về máy không bị ảnh hưởng. Không hoàn tác được." confirmLabel="Xoá" onClose={() => setToDel(null)} onConfirm={() => toDel && run(async () => { await del(`/api/slides/${toDel.id}`); invalidate(KEY); }, "Đã xoá bộ slide")} />
    </>
  );
}

function FromLesson({ onClose }: { onClose: () => void }) {
  const lessons = useQuery(LESSONS_KEY, fetchLessons);
  const [id, setId] = useState("");
  const run = useRun();
  useEffect(() => {
    if (!id && lessons.data?.[0]) setId(lessons.data[0].id);
  }, [lessons.data, id]);
  const l = lessons.data?.find((x) => x.id === id);
  return (
    <FormPane
      title="Tạo slide từ giáo án"
      onClose={onClose}
      testId="slide-pick"
      footer={<><Button onClick={onClose}>Huỷ</Button><Button variant="primary" icon="check" disabled={!id} onClick={() => run(async () => { await post("/api/slides", { lessonPlanId: id }); invalidate(KEY); onClose(); }, `Đã tạo slide “${l?.title ?? ""}”`)} data-testid="slide-create">Tạo slide</Button></>}
    >
      {lessons.data?.length === 0 ? (
        <p className="note">Chưa có giáo án. <Link className="link" to="/giao-an?tao=1">Soạn giáo án</Link> trước rồi quay lại.</p>
      ) : (
        <Field label="Giáo án" hint={l ? `${l.subject} · ${gradeVi(l.grade)} · ${l.periods} tiết` : undefined}>
          <Select value={id} onChange={(e) => setId(e.target.value)} disabled={!lessons.data} data-testid="slide-lesson">
            {!lessons.data && <option>Đang tải…</option>}
            {lessons.data?.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.subject} {x.grade}</option>)}
          </Select>
        </Field>
      )}
    </FormPane>
  );
}
