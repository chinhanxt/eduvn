import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { exportGame, type GameSummary } from "../api";
import { DocList } from "../portal/gv/DocList";
import { dateVi, del, EXAMS_KEY, fetchExams, FormPane, get, GRADE_OPTS, post, SUBJECT_DEFAULT, useKeyN, useOpenParam, useRun } from "../portal/gv/kit";
import { Icon } from "../ui/Icon";
import { Button, IconButton } from "../ui/components/Button";
import { Badge, Segmented } from "../ui/components/Chip";
import { ConfirmDialog } from "../ui/components/Dialog";
import { Field, Input, Select } from "../ui/components/Field";
import type { Column } from "../ui/components/Table";
import { invalidate, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";

const KEY = "gv/tro-choi";
const KIND = { quiz: "Đố vui", flashcards: "Thẻ lật" } as const;
const TYPES = [["", "Mọi dạng"], ["mcq", "Trắc nghiệm"], ["true_false", "Đúng/sai"], ["short_answer", "Trả lời ngắn"]] as const;

/** /tro-choi — trò chơi ôn tập từ ngân hàng/đề: bảng v2, lọc loại, chơi trực tiếp (Đấu trường), mở, tải .html. */
export function Games() {
  usePageMeta("Trò chơi ôn tập");
  const q = useQuery(KEY, get<GameSummary[]>("/api/games"));
  const [open, setOpen] = useOpenParam();
  const [toDel, setToDel] = useState<GameSummary | null>(null);
  const run = useRun();
  useKeyN(() => setOpen(true));
  const sorts = useMemo(() => ({ ten: (g: GameSummary) => g.title, cau: (g: GameSummary) => g.questionCount, sua: (g: GameSummary) => g.updatedAt }), []);
  const cols: Column<GameSummary>[] = [
    { key: "ten", header: "Trò chơi", sortable: true, cell: (g) => <span><span className="t-title">{g.title}</span><span className="t-sub">{g.source}</span></span> },
    { key: "loai", header: "Loại", hideSm: true, cell: (g) => <Badge tone={g.kind === "quiz" ? "accent" : "outline"} icon={g.kind === "quiz" ? "timer" : "layers"}>{KIND[g.kind]}{g.kind === "quiz" && g.timerSeconds ? ` · ${g.timerSeconds}s` : ""}</Badge> },
    { key: "cau", header: "Câu", numeric: true, sortable: true, cell: (g) => g.questionCount },
    { key: "sua", header: "Tạo", numeric: true, sortable: true, hideSm: true, cell: (g) => dateVi(g.updatedAt) },
    {
      key: "act",
      header: "",
      numeric: true,
      cell: (g) => (
        <span className="t-acts">
          <Link className="btn primary sm" to={`/dau-truong?game=${g.id}`} data-testid="game-live"><Icon name="game" size="sm" /><span>Chơi trực tiếp</span></Link>
          <Button size="sm" icon="ext" onClick={() => run(() => exportGame(g.id, true))} data-testid="game-open">Mở</Button>
          <IconButton size="sm" icon="down" label="Tải .html" onClick={() => run(() => exportGame(g.id), "Đang tải trò chơi .html")} data-testid="game-download" />
          <IconButton size="sm" icon="trash" label={`Xoá ${g.title}`} onClick={() => setToDel(g)} />
        </span>
      ),
    },
  ];
  return (
    <>
      <DocList
        title="Trò chơi ôn tập"
        caption={`${q.data?.length ?? 0} trò chơi`}
        q={q}
        columns={cols}
        rowKey={(g) => g.id}
        text={(g) => `${g.title} ${g.source}`}
        sorts={sorts}
        defSort="-sua"
        facet={{ key: "loai", label: "Loại", of: (g) => g.kind, name: (k) => KIND[k as keyof typeof KIND] ?? k }}
        primary={{ label: "Tạo trò chơi", icon: "plus", kbd: "N", onClick: () => setOpen(true) }}
        form={open && <Create onClose={() => setOpen(false)} />}
        searchHint="Tìm tên trò chơi…"
        testId="game-list"
        empty={{ icon: "game", title: "Chưa có trò chơi", text: "Lấy câu từ ngân hàng hoặc một đề — chơi đố vui tính giờ cả lớp, hoặc thẻ lật ôn bài.", action: <Button size="sm" variant="primary" icon="plus" onClick={() => setOpen(true)}>Tạo trò chơi</Button> }}
      />
      <ConfirmDialog open={!!toDel} title={`Xoá trò chơi “${toDel?.title ?? ""}”?`} text="Tệp .html đã tải về vẫn chơi được. Không hoàn tác được." confirmLabel="Xoá" onClose={() => setToDel(null)} onConfirm={() => toDel && run(async () => { await del(`/api/games/${toDel.id}`); invalidate(KEY); }, "Đã xoá trò chơi")} />
    </>
  );
}

function Create({ onClose }: { onClose: () => void }) {
  const run = useRun();
  const exams = useQuery(EXAMS_KEY, fetchExams);
  const [de] = useUrlState<string>("de", "");
  const [src, setSrc] = useState<"bank" | "exam">(de ? "exam" : "bank");
  const [kind, setKind] = useState<"quiz" | "flashcards">("quiz");
  const [f, setF] = useState({ title: "", subject: SUBJECT_DEFAULT, grade: 10, topic: "", type: "", limit: 20, timer: 20, examId: de });
  useEffect(() => {
    if (!f.examId && exams.data?.[0]) setF((x) => ({ ...x, examId: exams.data![0]!.id }));
  }, [exams.data, f.examId]);
  const exam = exams.data?.find((e) => e.id === f.examId);
  const title = f.title.trim() || (src === "exam" && exam ? `Ôn tập · ${exam.title}` : "");
  const save = () =>
    run(async () => {
      const source = src === "exam" ? { examId: f.examId } : { subject: f.subject, grade: f.grade, ...(f.topic.trim() ? { topic: f.topic.trim() } : {}), ...(f.type ? { type: f.type } : {}), limit: f.limit };
      await post("/api/games", { title, kind, source, ...(kind === "quiz" ? { timerSeconds: f.timer } : {}) });
      invalidate(KEY);
      onClose();
    }, `Đã tạo trò chơi “${title}”`);
  return (
    <FormPane
      title="Tạo trò chơi ôn tập"
      onClose={onClose}
      testId="game-form"
      footer={<><Button onClick={onClose}>Huỷ</Button><Button variant="primary" icon="check" disabled={!title || (src === "exam" && !f.examId)} onClick={save} data-testid="g-create">Tạo trò chơi</Button></>}
    >
      <div className="row wrap" style={{ gap: 16 }}>
        <div><span className="lbl-sm">Loại</span><Segmented label="Loại trò chơi" value={kind} onChange={setKind} options={[{ value: "quiz", label: "Đố vui có điểm" }, { value: "flashcards", label: "Thẻ lật" }]} /></div>
        <div><span className="lbl-sm">Nguồn câu hỏi</span><Segmented label="Nguồn" value={src} onChange={setSrc} options={[{ value: "bank", label: "Ngân hàng" }, { value: "exam", label: "Một đề" }]} /></div>
      </div>
      <div className="fgrid">
        <div className="wide"><Field label="Tên trò chơi"><Input autoFocus value={f.title} placeholder={src === "exam" && exam ? `Ôn tập · ${exam.title}` : "Đua về đích · Hàm số bậc hai"} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="g-title" /></Field></div>
        {kind === "quiz" && <Field label="Giây mỗi câu" hint="0 = không tính giờ"><Input type="number" min={0} max={300} value={f.timer} onChange={(e) => setF({ ...f, timer: Math.max(0, Math.min(300, Number(e.target.value) || 0)) })} data-testid="g-timer" /></Field>}
        {src === "bank" ? (
          <>
            <Field label="Môn"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} data-testid="g-subject" /></Field>
            <Field label="Lớp"><Select value={f.grade} onChange={(e) => setF({ ...f, grade: Number(e.target.value) })} data-testid="g-grade">{GRADE_OPTS}</Select></Field>
            <Field label="Chủ đề"><Input placeholder="tất cả" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} data-testid="g-topic" /></Field>
            <Field label="Dạng câu"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Tối đa"><Input type="number" min={1} max={200} value={f.limit} onChange={(e) => setF({ ...f, limit: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} /></Field>
          </>
        ) : (
          <div className="wide">
            <Field label="Đề thi">
              <Select value={f.examId} onChange={(e) => setF({ ...f, examId: e.target.value })} disabled={!exams.data?.length} data-testid="g-exam">
                {!exams.data && <option>Đang tải…</option>}
                {exams.data?.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.subject} {x.grade}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </div>
    </FormPane>
  );
}
