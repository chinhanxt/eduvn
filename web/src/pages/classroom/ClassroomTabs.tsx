import { lazy, Suspense } from "react";
import { Region, errorOf, statusOf, whenVi } from "../../portal/gv/kit";
import { Button } from "../../ui/components/Button";
import { Select } from "../../ui/components/Field";
import { useQuery } from "../../ui/data/query";
import { useUrlState } from "../../ui/data/urlState";
import { asgKey, fetchAsg, useGoTab } from "./AssignTab";

const MonitorTab = lazy(() => import("./MonitorTab").then((m) => ({ default: m.MonitorTab })));
const ResultsTab = lazy(() => import("./ResultsTab").then((m) => ({ default: m.ResultsTab })));

/** Theo dõi / Kết quả: chọn bài giao (?bai=, mặc định bài mới nhất đã giao), rồi hiện tab tương ứng. */
export function AssignmentScoped({ classId, tab }: { classId: string; tab: "theo-doi" | "ket-qua" }) {
  const q = useQuery(asgKey(classId), fetchAsg(classId));
  const [bai, setBai] = useUrlState<string>("bai", "");
  const go = useGoTab();
  const given = (q.data ?? []).filter((a) => a.status !== "draft");
  const cur = given.find((a) => a.id === bai) ?? given[0];
  const st = statusOf(q, () => given.length === 0);
  if (st !== "ok" || !cur)
    return (
      <Region
        className="pane"
        label="Bài giao"
        status={st === "ok" ? "trong" : st}
        onRetry={q.refetch}
        error={errorOf(q.error)}
        skeletonRows={6}
        empty={{ icon: "send", title: "Chưa giao bài nào", text: "Giao bài cho lớp rồi theo dõi trực tiếp ai đang làm, ai đã nộp.", action: <Button size="sm" variant="primary" icon="plus" onClick={() => go("giao-bai")}>Giao bài</Button> }}
      />
    );
  return (
    <>
      <div className="scope">
        <Select value={cur.id} onChange={(e) => setBai(e.target.value)} aria-label="Bài giao" data-testid="lh-pick">
          {given.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} · hạn {whenVi(a.dueAt)}
            </option>
          ))}
        </Select>
        <span className="caption hide-sm">Mở {whenVi(cur.opensAt)} · hạn {whenVi(cur.dueAt)} · {cur.questionCount} câu</span>
        <span className="grow" />
        <Button size="sm" variant="ghost" icon={tab === "theo-doi" ? "chart" : "eye"} onClick={() => go(tab === "theo-doi" ? "ket-qua" : "theo-doi", cur.id)}>{tab === "theo-doi" ? "Kết quả" : "Theo dõi"}</Button>
      </div>
      <Suspense fallback={<Region status="dang-tai" label="Đang tải" skeletonRows={6} />}>{tab === "theo-doi" ? <MonitorTab key={cur.id} assignmentId={cur.id} /> : <ResultsTab key={cur.id} assignmentId={cur.id} />}</Suspense>
    </>
  );
}
