import { Link } from "react-router";
import { Difficulty } from "../../ui/charts/Difficulty";
import { Histogram, binsOf } from "../../ui/charts/Histogram";
import { Button } from "../../ui/components/Button";
import { EmptyState } from "../../ui/components/States";
import { useToast } from "../../ui/components/Toast";
import { Icon } from "../../ui/Icon";
import { dueText, type GvAssignmentDetail, type GvLessonDetail, type GvTask, taskKey, vn1 } from "../today";

// Khung chi tiết màn Hôm nay GV (phổ điểm, câu sai nhiều): tải riêng ngay sau danh sách để JS lần đầu nhỏ hơn.

function AssignmentDetail({ t, d, now }: { t: GvTask; d: GvAssignmentDetail; now: string }) {
  const toast = useToast();
  const grade = t.kind === "grade";
  const miss = d.missing;
  const copy = async () => {
    const text = miss.map((m) => m.fullName).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `Đã chép tên ${miss.length} em chưa nộp`, msg: "Dán vào Zalo/tin nhắn lớp để nhắc." });
    } catch {
      toast({ title: "Không chép được", msg: "Trình duyệt chặn bộ nhớ tạm.", kind: "err" });
    }
  };
  return (
    <>
      <dl className="props" style={{ margin: 0 }}>
        <dt>Lớp</dt>
        <dd>{t.className} · {d.rosterSize} HS</dd>
        <dt>{grade ? "Hạn chấm" : "Hạn nộp"}</dt>
        <dd style={t.hot ? { color: "var(--warn)", fontWeight: 600 } : undefined}>{dueText(d.dueAt, now)}</dd>
        <dt>Đã nộp</dt>
        <dd>
          {d.submitted}/{d.rosterSize}
          {miss.length > 0 && ` · thiếu ${miss.slice(0, 2).map((m) => m.fullName).join(", ")}${miss.length > 2 ? ` và ${miss.length - 2} em` : ""}`}
        </dd>
        <dt>Đã chấm</dt>
        <dd>{d.graded}/{Math.max(d.submitted, d.graded)}{d.pendingAnswers === 0 && d.submitted > 0 ? " · xong" : ""}</dd>
        <dt>Còn lại</dt>
        <dd>{d.pendingAnswers > 0 ? `${d.pendingAnswers} câu chờ chấm · ~${d.estMinutes} phút` : "Không còn câu chờ chấm"}</dd>
      </dl>
      <div className="dsec">
        <h3>
          Phổ điểm {d.scored} bài đã chấm {d.mean != null && <span>TB {vn1(d.mean)}</span>}
        </h3>
        {d.scored > 0 ? <Histogram bins={binsOf(d.histogram)} threshold={5} median={d.median} height={170} /> : <p className="caption">Chưa có bài chấm xong — phổ điểm hiện khi có bài đầu tiên.</p>}
      </div>
      {d.hardest.length > 0 && (
        <div className="dsec">
          <h3>Câu sai nhiều nhất <span>% làm đúng</span></h3>
          <Difficulty rows={d.hardest} flag={40} rowH={24} />
        </div>
      )}
      <div className="dact">
        <Link className="btn primary" to={t.href}>
          <Icon name={grade ? "grade" : "eye"} size="sm" />
          <span>{grade ? "Chấm tiếp" : "Theo dõi bài nộp"}</span>
          <kbd className="k">{taskKey(t)}</kbd>
        </Link>
        <Button icon="copy" disabled={!miss.length} onClick={copy} doneLabel="Đã chép">
          {miss.length ? `Chép tên ${miss.length} em chưa nộp` : "Cả lớp đã nộp"}
        </Button>
      </div>
    </>
  );
}

function LessonDetail({ t, d }: { t: GvTask; d: GvLessonDetail }) {
  return (
    <>
      <dl className="props" style={{ margin: 0 }}>
        <dt>Môn</dt>
        <dd>{d.subject} · lớp {d.grade}</dd>
        <dt>Ngày dạy</dt>
        <dd>{d.date.slice(8, 10)}/{d.date.slice(5, 7)}/{d.date.slice(0, 4)}</dd>
        <dt>Số tiết</dt>
        <dd>{d.periods ?? "—"}</dd>
        <dt>Bảng giảng</dt>
        <dd style={d.boardId ? { color: "var(--ok)" } : undefined}>{d.boardId ? "Đã soạn sẵn" : "Chưa có — soạn từ giáo án"}</dd>
      </dl>
      <div className="dact">
        <Link className="btn primary" to={t.href}>
          <Icon name={d.boardId ? "board" : "book"} size="sm" />
          <span>{d.boardId ? "Mở bảng giảng" : "Mở giáo án"}</span>
          <kbd className="k">O</kbd>
        </Link>
        {d.boardId && (
          <Link className="btn" to={`/giao-an/${d.lessonId}`}>
            <Icon name="book" size="sm" />
            <span>Xem giáo án</span>
          </Link>
        )}
      </div>
    </>
  );
}

export function Detail({ t, now }: { t: GvTask | null; now: string }) {
  if (!t) return <EmptyState icon="check" title="Chọn một việc" text="Chi tiết, phổ điểm và câu sai nhiều sẽ hiện ở đây." />;
  return (
    <>
      <div className="dhd">
        <span className="mono">{t.id}</span>
        <h2>{t.title}</h2>
      </div>
      {t.detail.type === "assignment" ? <AssignmentDetail t={t} d={t.detail} now={now} /> : <LessonDetail t={t} d={t.detail} />}
    </>
  );
}

