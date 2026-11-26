import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { api, errText } from "../api";
import { Icon } from "../Icon";
import { Editor } from "../ailesson/Editor";
import { Player } from "../ailesson/Player";
import { BASE, type LessonDetail, type Scene, type Status, type VideoStatus, downloadBlob } from "../ailesson/lib";

type Tab = "play" | "edit";

export function AiLessonPage() {
  const { id = "" } = useParams();
  const [d, setD] = useState<LessonDetail | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [tab, setTab] = useState<Tab>("play");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [dirty, setDirty] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<LessonDetail>(`${BASE}/${id}`);
      setD(r);
      setScenes(r.scenes);
      setTitle(r.title);
      setDirty(false);
    } catch (e) {
      setError(errText(e));
    }
  }, [id]);
  useEffect(() => void load(), [load]);

  // theo dõi tiến độ khi đang sinh
  const active = d?.status === "queued" || d?.status === "running";
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      api<Status>(`${BASE}/${id}/trang-thai`)
        .then((s) => {
          setSt(s);
          if (s.status === "done" || s.status === "error") void load();
        })
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(t);
  }, [active, id, load]);

  useEffect(() => {
    api<VideoStatus>(`${BASE}/${id}/video`).then(setVideo).catch(() => undefined);
  }, [id]);
  useEffect(() => {
    if (video?.status !== "running") return;
    const t = setInterval(() => api<VideoStatus>(`${BASE}/${id}/video`).then(setVideo).catch(() => undefined), 2500);
    return () => clearInterval(t);
  }, [video?.status, id]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`${BASE}/${id}`, { method: "PUT", body: { title, scenes } });
      setDirty(false);
      setMsg("Đã lưu");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const regen = async (sceneId: string, directive: string) => {
    setBusy(true);
    setError(null);
    try {
      await api(`${BASE}/${id}`, { method: "PUT", body: { title, scenes } });
      const s = await api<Scene>(`${BASE}/${id}/canh/${sceneId}/sinh-lai`, { method: "POST", body: { directive: directive || undefined } });
      setScenes((cur) => cur.map((x) => (x.id === sceneId ? s : x)));
      setMsg("Đã sinh lại cảnh");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const animate = async (sceneId: string, spec?: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await api(`${BASE}/${id}`, { method: "PUT", body: { title, scenes } });
      setDirty(false);
      const s = await api<Scene>(`${BASE}/${id}/canh/${sceneId}/hoat-hinh`, { method: "POST", body: spec ? { spec } : {} });
      setScenes((cur) => cur.map((x) => (x.id === sceneId ? { ...x, animation: s.animation } : x)));
      setMsg("AI đã chọn mẫu hoạt hình, đang dựng…");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const unanimate = async (sceneId: string) => {
    setError(null);
    try {
      await api(`${BASE}/${id}/canh/${sceneId}/hoat-hinh`, { method: "DELETE" });
      setScenes((cur) => cur.map((x) => (x.id === sceneId ? { ...x, animation: undefined } : x)));
    } catch (e) {
      setError(errText(e));
    }
  };
  // đang dựng hoạt hình → hỏi lại máy chủ, chỉ cập nhật phần hoạt hình (không đè chỗ GV đang sửa)
  const rendering = scenes.some((s) => s.animation?.status === "dang_dung");
  useEffect(() => {
    if (!rendering) return;
    const t = setInterval(() => {
      api<LessonDetail>(`${BASE}/${id}`)
        .then((r) => setScenes((cur) => cur.map((x) => ({ ...x, animation: r.scenes.find((y) => y.id === x.id)?.animation ?? x.animation }))))
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(t);
  }, [rendering, id]);
  const resume = async () => {
    await api(`${BASE}/${id}/sinh-tiep`, { method: "POST", body: {} }).catch((e: unknown) => setError(errText(e)));
    await load();
  };
  const startVideo = async () => {
    setError(null);
    try {
      setVideo(await api<VideoStatus>(`${BASE}/${id}/video`, { method: "POST", body: {} }));
    } catch (e) {
      setError(errText(e));
    }
  };
  const toBank = async (sceneId: string) => {
    setError(null);
    try {
      const r = await api<{ saved: number; skipped: string[] }>(`${BASE}/${id}/canh/${sceneId}/luu-ngan-hang`, { method: "POST", body: {} });
      setMsg(`Đã lưu ${r.saved} câu vào ngân hàng${r.skipped.length ? ` · bỏ qua: ${r.skipped.join("; ")}` : ""}`);
    } catch (e) {
      setError(errText(e));
    }
  };

  if (!d) return error ? <div className="err">{error}</div> : <div className="ailp-sk" aria-busy="true"><i /><i /><i /></div>;
  const pct = st && st.total ? Math.round((st.done / st.total) * 100) : 0;
  const quizzes = scenes.filter((s) => s.type === "quiz");
  const file = (ext: string) => `bai-giang.${ext}`;

  return (
    <div className="ailp">
      <div className="ailp-hd">
        {tab === "edit" ? <input className="inp ailp-title" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} aria-label="Tên bài giảng" /> : <h1>{title}</h1>}
        <span className="sp" />
        {!active && scenes.length > 0 && (
          <>
            {dirty && <button className="btn sm" disabled={busy} onClick={() => void save()} data-testid="ail-save"><Icon name="save" size={16} />Lưu</button>}
            <div className="ailp-seg" role="group" aria-label="Chế độ">
              <button aria-pressed={tab === "play"} onClick={() => setTab("play")} data-testid="ail-tab-play"><Icon name="play" size={16} />Trình chiếu</button>
              <button aria-pressed={tab === "edit"} onClick={() => setTab("edit")} data-testid="ail-tab-edit"><Icon name="pen" size={16} />Sửa</button>
            </div>
          </>
        )}
      </div>
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok-msg" data-testid="ail-msg">{msg}</div>}

      {active && (
        <div className="ailp-gen" data-testid="ail-progress">
          <div className="steps" aria-hidden="true">{Array.from({ length: Math.max(st?.total || d.progress.total || 7, 1) }, (_, i) => <i key={i} className={i < (st?.done ?? d.progress.done) ? "on" : undefined} style={{ ["--i" as string]: i }} />)}</div>
          <b>{st?.stage ?? d.progress.stage}</b>
          <span>{st?.done ?? d.progress.done}/{st?.total || d.progress.total || "…"} cảnh · thường 3–8 phút, rời trang vẫn soạn tiếp</span>
          <div className="ail-bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      {d.status === "error" && (
        <div className="card" data-testid="ail-error">
          <div className="err">{d.progress.error}</div>
          <button className="btn" onClick={() => void resume()} data-testid="ail-resume"><Icon name="rotate" size={18} />Sinh tiếp</button>
        </div>
      )}
      {d.status === "done" && (d.progress.failed?.length ?? 0) > 0 && (
        <div className="card" data-testid="ail-failed">
          <b>{d.progress.failed?.length} cảnh chưa soạn được:</b> {d.progress.failed?.join(" · ")}
          <div style={{ marginTop: 8 }}><button className="btn sm" onClick={() => void resume()}><Icon name="rotate" size={16} />Sinh tiếp các cảnh còn thiếu</button></div>
        </div>
      )}

      {scenes.length > 0 && tab === "play" && <Player lessonId={id} scenes={scenes} />}
      {scenes.length > 0 && tab === "edit" && <Editor scenes={scenes} busy={busy} onChange={(s) => { setScenes(s); setDirty(true); }} onRegenerate={(sid, dir) => void regen(sid, dir)} onAnimate={(sid, sp) => void animate(sid, sp)} onRemoveAnim={(sid) => void unanimate(sid)} />}

      {!active && scenes.length > 0 && (
        <div className="ailp-export" data-testid="ail-export">
          <b>Xuất</b>
          <div className="bar">
            <button className="btn" onClick={() => void downloadBlob(`${BASE}/${id}/pptx`, file("pptx")).catch((e: unknown) => setError(errText(e)))} data-testid="ail-pptx"><Icon name="down" size={18} />Tải .pptx</button>
            {video?.status === "done" ? (
              <>
                <button className="btn ghost" onClick={() => void downloadBlob(`${BASE}/${id}/video/bai-giang.mp4`, file("mp4")).catch((e: unknown) => setError(errText(e)))} data-testid="ail-mp4"><Icon name="video" size={18} />Tải .mp4</button>
                <button className="btn ghost" onClick={() => void downloadBlob(`${BASE}/${id}/video/phu-de.srt`, file("srt")).catch((e: unknown) => setError(errText(e)))}><Icon name="down" size={18} />Phụ đề .srt</button>
                <button className="btn ghost" onClick={() => void startVideo()}>Dựng lại video</button>
              </>
            ) : (
              <button className="btn ghost" disabled={video?.status === "running"} onClick={() => void startVideo()} data-testid="ail-video"><Icon name="video" size={18} />{video?.status === "running" ? `Đang dựng video… ${video.done}/${video.total}` : "Video .mp4"}</button>
            )}
            {quizzes.map((q) => (
              <button key={q.id} className="btn ghost" onClick={() => void toBank(q.id)} data-testid="ail-bank" title={`Lưu "${q.title}" vào ngân hàng câu hỏi`}><Icon name="bank" size={18} />{quizzes.length > 1 ? q.title : "Vào ngân hàng"}</button>
            ))}
          </div>
          {video?.status === "error" && <div className="err" style={{ marginTop: 10 }}>{video.error}</div>}
        </div>
      )}
    </div>
  );
}
