import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { type ExamSummary, type KeyEntry } from "../api";
import { EXAMS_KEY, fetchExams, get, post, statusOf, errorOf, useRun, vnNum } from "../portal/gv/kit";
import { Button } from "../ui/components/Button";
import { Badge, Segmented } from "../ui/components/Chip";
import { Input, Select } from "../ui/components/Field";
import { Skeleton } from "../ui/components/Skeleton";
import { Region } from "../ui/components/States";
import { useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import "../omr/photo.css";

const ScanTab = lazy(() => import("../omr/ScanTab").then((m) => ({ default: m.ScanTab })));
const EssayTab = lazy(() => import("../omr/EssayTab").then((m) => ({ default: m.EssayTab })));
const PrintTab = lazy(() => import("../omr/PrintTab").then((m) => ({ default: m.PrintTab })));

const MODES = [
  { value: "quet", label: "Quét phiếu" },
  { value: "viet-tay", label: "Bài viết tay" },
  { value: "nhap", label: "Nhập tay" },
  { value: "in", label: "In phiếu" },
] as const;
type Mode = (typeof MODES)[number]["value"];
type Keys = { code: string; entries: KeyEntry[] }[];

/**
 * /cham-bai?che-do=quet|viet-tay|nhap|in&de=<examId> — một nơi chấm đề đã tạo (gộp "Chấm từ ảnh" P7):
 * quét phiếu trắc nghiệm CV 7991, chấm bài viết tay, nhập tay đáp án một bài, in phiếu. Bài giao trực tuyến chấm ở Lớp → Kết quả.
 */
export function Grade() {
  usePageMeta("Chấm bài");
  const exams = useQuery(EXAMS_KEY, fetchExams);
  const [modeRaw, setMode] = useUrlState<string>("che-do", "quet", { mode: "push" });
  const mode: Mode = MODES.some((m) => m.value === modeRaw) ? (modeRaw as Mode) : "quet";
  const [de, setDe] = useUrlState<string>("de", "");
  const [lop, setLop] = useUrlState<string>("lop", "");
  const list = exams.data ?? [];
  const examId = list.some((e) => e.id === de) ? de : (list[0]?.id ?? "");
  // giữ các chế độ đã mở (phiếu đang quét/bài đang chấm không mất khi đổi tab)
  const [seen, setSeen] = useState(() => new Set<Mode>([mode]));
  useEffect(() => setSeen((x) => (x.has(mode) ? x : new Set([...x, mode]))), [mode]);
  const st = statusOf(exams, (d) => d.length === 0);
  return (
    <div className="pg" data-testid="pg">
      <div className="page-head bar no-print">
        <h1>Chấm bài</h1>
        <Segmented label="Chế độ chấm" value={mode} onChange={(m) => setMode(m)} options={MODES} />
        <span className="grow" />
        <div className="acts">
          {exams.data ? (
            <Select value={examId} onChange={(e) => setDe(e.target.value)} disabled={!list.length} aria-label="Đề" data-testid="pg-exam" style={{ height: 30, fontSize: 13, width: "auto", maxWidth: 280 }}>
              {list.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          ) : (
            <Skeleton w={200} h={30} style={{ borderRadius: 6 }} />
          )}
        </div>
      </div>
      {st !== "ok" ? (
        <Region
          className="pane"
          label="Đề để chấm"
          status={st}
          onRetry={exams.refetch}
          error={errorOf(exams.error)}
          skeletonRows={5}
          empty={{ icon: "exam", title: "Chưa có đề nào", text: "Tạo đề rồi quay lại để in phiếu, quét và chấm. Bài giao trực tuyến chấm ở Lớp học → Kết quả.", action: <Link className="btn primary sm" to="/de-thi?tao=1">Tạo đề</Link> }}
        />
      ) : (
        <Suspense fallback={<Region className="pane" status="dang-tai" label="Đang tải" skeletonRows={6} />}>
          {seen.has("quet") && <div hidden={mode !== "quet"}><ScanTab exams={list} examId={examId} classId={lop} setClassId={setLop} /></div>}
          {seen.has("viet-tay") && <div hidden={mode !== "viet-tay"}><EssayTab examId={examId} /></div>}
          {mode === "nhap" && <Manual key={examId} exam={list.find((e) => e.id === examId)!} />}
          {mode === "in" && <PrintTab exams={list} examId={examId} />}
        </Suspense>
      )}
    </div>
  );
}

type Resp = number | boolean[] | string;
type Result = { total: number; autoMax: number; pendingEssay: number[] };
const SECTION_VI: Record<string, string> = { mcq: "Phần I · Nhiều lựa chọn", true_false: "Phần II · Đúng/Sai", short_answer: "Phần III · Trả lời ngắn", essay: "Tự luận" };

/** Nhập tay đáp án của một bài (không có ảnh): chọn mã đề, bấm đáp án từng câu → Chấm. */
function Manual({ exam }: { exam: ExamSummary }) {
  const keys = useQuery(`gv/de-thi/${exam.id}/dap-an`, get<Keys>(`/api/exams/${exam.id}/key`));
  const [code, setCode] = useState("");
  const [resp, setResp] = useState<Record<number, Resp>>({});
  const [result, setResult] = useState<Result | null>(null);
  const run = useRun();
  const codes = keys.data ?? [];
  const cur = codes.find((k) => k.code === code) ?? codes[0];
  const entries = cur?.entries ?? [];
  const sections = useMemo(() => [...new Set(entries.map((e) => e.section))], [entries]);
  const answered = entries.filter((e) => resp[e.no] !== undefined && resp[e.no] !== "").length;
  const set = (no: number, v: Resp) => {
    setResult(null);
    setResp((r) => ({ ...r, [no]: v }));
  };
  const submit = () =>
    run(async () => {
      const responses = Object.fromEntries(Object.entries(resp).filter(([, v]) => v !== "" && v !== undefined));
      const r = await post<Result>(`/api/exams/${exam.id}/grade`, { code: cur!.code, responses });
      setResult(r);
      return r;
    }, (r) => ({ title: `Điểm: ${vnNum(r.total)} / ${vnNum(r.autoMax)}`, msg: r.pendingEssay.length ? `${r.pendingEssay.length} câu tự luận chấm riêng` : undefined }));
  if (!cur) return <Region className="pane" label="Đáp án" status={keys.error ? "loi" : keys.data ? "trong" : "dang-tai"} error={errorOf(keys.error)} onRetry={keys.refetch} empty={{ icon: "exam", title: "Đề chưa có đáp án" }} />;
  return (
    <div className="work wide-l">
      <section className="pane" aria-label="Đáp án của bài">
        {sections.map((sec) => (
          <div key={sec}>
            <div className="ghd">{SECTION_VI[sec] ?? sec} <span className="n">{entries.filter((e) => e.section === sec).length} câu</span></div>
            <div className="qrows">
              {entries.filter((e) => e.section === sec).map((en) => (
                <div className="qrow" key={en.no} data-testid="g-row">
                  <span className="no num">{en.no}</span>
                  <AnswerInput entry={en} value={resp[en.no]} onChange={(v) => set(en.no, v)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <aside>
        <section className="pane" aria-label="Kết quả">
          <div className="ghd">Bài làm</div>
          <div className="fp-bd">
            <label className="field"><span className="lbl-sm">Mã đề</span>
              <Select value={cur.code} onChange={(e) => (setCode(e.target.value), setResp({}), setResult(null))} data-testid="g-code" style={{ height: 30 }}>
                {codes.map((k) => <option key={k.code} value={k.code}>Mã đề {k.code}</option>)}
              </Select>
            </label>
            <div className="score-box" aria-live="polite">
              <span className="caption">Điểm tự động</span>
              <b className="num" data-testid="g-total">{result ? vnNum(result.total) : "—"}</b>
              <span className="caption">/ {result ? vnNum(result.autoMax) : "…"}</span>
            </div>
            {result && result.pendingEssay.length > 0 && <Badge tone="warn">Câu {result.pendingEssay.join(", ")} tự luận — chấm ở “Bài viết tay”</Badge>}
            <span className="caption">Đã nhập <b className="num">{answered}</b>/{entries.length} câu</span>
          </div>
          <div className="fp-ft">
            <Button onClick={() => (setResp({}), setResult(null))} disabled={!answered}>Làm lại</Button>
            <Button variant="primary" icon="grade" onClick={submit} disabled={!answered} data-testid="g-submit">Chấm</Button>
          </div>
        </section>
      </aside>
    </div>
  );
}

function AnswerInput({ entry, value, onChange }: { entry: KeyEntry; value: Resp | undefined; onChange: (v: Resp) => void }) {
  if (entry.section === "mcq")
    return (
      <div className="seg" role="group" aria-label={`Câu ${entry.no}`}>
        {"ABCD".split("").map((l, i) => (
          <button key={l} type="button" aria-pressed={value === i} onClick={() => onChange(i)} data-testid={`mcq-${entry.no}-${l}`}>{l}</button>
        ))}
      </div>
    );
  if (entry.section === "true_false") {
    const arr = Array.isArray(value) ? value : [false, false, false, false];
    return (
      <div className="seg" role="group" aria-label={`Câu ${entry.no}`}>
        {arr.map((b, i) => (
          <button key={i} type="button" aria-pressed={b} onClick={() => onChange(arr.map((x, j) => (j === i ? !x : x)))}>{"abcd"[i]} · {b ? "Đ" : "S"}</button>
        ))}
      </div>
    );
  }
  if (entry.section === "short_answer") return <Input style={{ width: 160, height: 30 }} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} aria-label={`Câu ${entry.no}`} />;
  return <Badge tone="warn">Tự luận — chấm riêng</Badge>;
}
