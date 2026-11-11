import { useCallback, useEffect, useState } from "react";
import { api, errText, exportSlide, type DeckSummary, type LessonSummary } from "../api";
import { Icon } from "../Icon";
import { XuatBanButton } from "../xuat-ban/XuatBan";

export function Slides() {
  const [rows, setRows] = useState<DeckSummary[] | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [picking, setPicking] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api<DeckSummary[]>("/api/slides").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api<LessonSummary[]>("/api/lessons").then((l) => {
      setLessons(l);
      setLessonId(l[0]?.id ?? "");
    }).catch(() => setLessons([]));
  }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/slides", { method: "POST", body: { lessonPlanId: lessonId } });
      setPicking(false);
      load();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Xoá bộ slide này?")) return;
    await api(`/api/slides/${id}`, { method: "DELETE" }).catch((e: unknown) => setError(errText(e)));
    load();
  };

  return (
    <>
      <h1>Slide</h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setPicking((p) => !p)} data-testid="slide-from-lesson"><Icon name="pen" size={18} />Từ giáo án</button>
      </div>
      {error && <div className="err">{error}</div>}
      {picking && (
        <div className="card" style={{ marginBottom: 16 }} data-testid="slide-pick">
          {lessons.length === 0 ? (
            <div className="empty">—</div>
          ) : (
            <div className="formrow" style={{ marginBottom: 0 }}>
              <label className="lbl">Giáo án
                <select className="inp" style={{ minWidth: 280 }} value={lessonId} onChange={(e) => setLessonId(e.target.value)} data-testid="slide-lesson">
                  {lessons.map((l) => <option key={l.id} value={l.id}>{l.title} · {l.subject} {l.grade}</option>)}
                </select>
              </label>
              <button className="btn" disabled={busy || !lessonId} onClick={() => void create()} data-testid="slide-create"><Icon name="check" size={18} />Tạo slide</button>
            </div>
          )}
        </div>
      )}
      {rows?.length === 0 && <div className="card"><div className="empty">—</div></div>}
      {rows && rows.length > 0 && (
        <div className="card" data-testid="slide-list">
          {rows.map((d) => (
            <div key={d.id} className="item" data-testid="slide-row">
              <div className="ic violet" style={{ margin: 0, width: 38, height: 38 }}><Icon name="slide" /></div>
              <div className="grow">
                {d.title}
                <small>{d.slideCount} slide{d.subject ? ` · ${d.subject}${d.grade ? ` ${d.grade}` : ""}` : ""}{d.sourceLessonPlanId ? " · từ giáo án" : ""} · {new Date(d.updatedAt).toLocaleDateString("vi-VN")}</small>
              </div>
              <XuatBanButton nguon={{ loai: "bo-slide", id: d.id }} nhan="PowerPoint gốc" />
              <button className="btn" onClick={() => void exportSlide(d.id)} data-testid="slide-download"><Icon name="down" size={18} />Tải .pptx</button>
              <button className="btn ghost sm" onClick={() => void remove(d.id)} aria-label="Xoá"><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
