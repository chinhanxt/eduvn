import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api, errText } from "../api";
import { Icon } from "../Icon";
import { Editor } from "../ailesson/Editor";
import { Player } from "../ailesson/Player";
import { BASE, type LessonDetail, type Scene, type Status, type VideoStatus, downloadBlob } from "../ailesson/lib";
import { XuatBanButton } from "../xuat-ban/XuatBan";

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

  if (!d) return <div className="center">{error ?? "…"}</div>;
  const pct = st && st.total ? Math.round((st.done / st.total) * 100) : 0;
  const quizzes = scenes.filter((s) => s.type === "quiz");
  const file = (ext: string) => `bai-giang.${ext}`;

  return (
    <>
      <div className="bar">
        <Link to="/bai-giang-ai" className="btn ghost sm"><Icon name="left" size={16} />Danh sách</Link>
        {tab === "edit" ? <input className="inp" style={{ minWidth: 320 }} value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} aria-label="Tên bài giảng" /> : <h1 style={{ margin: 0 }}>{title}</h1>}
        <span className="sp" />
        {!active && scenes.length > 0 && (
          <>
            <div className="seg">
              <button className={`btn sm ${tab === "play" ? "" : "ghost"}`} onClick={() => setTab("play")} data-testid="ail-tab-play"><Icon name="play" size={16} />Trình chiếu</button>
              <button className={`btn sm ${tab === "edit" ? "" : "ghost"}`} onClick={() => setTab("edit")} data-testid="ail-tab-edit"><Icon name="pen" size={16} />Sửa nhanh</button>
            </div>
            {dirty && <button className="btn sm" disabled={busy} onClick={() => void save()} data-testid="ail-save"><Icon name="save" size={16} />Lưu</button>}
          </>
        )}
      </div>
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok-msg" data-testid="ail-msg">{msg}</div>}

      {active && (
        <div className="card" data-testid="ail-progress">
          <b>{st?.stage ?? d.progress.stage}</b> — {st?.done ?? d.progress.done}/{st?.total || d.progress.total || "…"} cảnh
          <div className="ail-bar"><div style={{ width: `${pct}%` }} /></div>
          <small style={{ color: "var(--muted)" }}>AI soạn từng cảnh (slide, câu hỏi, mô phỏng, lời giảng và giọng đọc) — thường 3–8 phút. Có thể rời trang, bài vẫn được soạn.</small>
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
        <div className="card" style={{ marginTop: 16 }} data-testid="ail-export">
          <b>Xuất bài giảng</b>
          <div className="bar" style={{ marginTop: 10, marginBottom: 0 }}>
            <XuatBanButton nguon={{ loai: "bai-giang-ai", id }} khoa={scenes.some((s) => s.animation?.status === "dang_dung") ? "Đang dựng hoạt hình — đợi xong rồi xuất" : undefined} />
            <button className="btn" onClick={() => void downloadBlob(`${BASE}/${id}/pptx`, file("pptx")).catch((e: unknown) => setError(errText(e)))} data-testid="ail-pptx"><Icon name="down" size={18} />Tải .pptx</button>
            {video?.status === "done" ? (
              <>
                <button className="btn" onClick={() => void downloadBlob(`${BASE}/${id}/video/bai-giang.mp4`, file("mp4")).catch((e: unknown) => setError(errText(e)))} data-testid="ail-mp4"><Icon name="video" size={18} />Tải .mp4</button>
                <button className="btn ghost" onClick={() => void downloadBlob(`${BASE}/${id}/video/phu-de.srt`, file("srt")).catch((e: unknown) => setError(errText(e)))}><Icon name="down" size={18} />Phụ đề .srt</button>
                <button className="btn ghost" onClick={() => void startVideo()}>Dựng lại video</button>
              </>
            ) : (
              <button className="btn" disabled={video?.status === "running"} onClick={() => void startVideo()} data-testid="ail-video"><Icon name="video" size={18} />{video?.status === "running" ? `Đang dựng video… ${video.done}/${video.total}` : "Dựng video .mp4"}</button>
            )}
            {quizzes.map((q) => (
              <button key={q.id} className="btn ghost" onClick={() => void toBank(q.id)} data-testid="ail-bank"><Icon name="bank" size={18} />Lưu "{q.title}" vào ngân hàng câu hỏi</button>
            ))}
          </div>
          {video?.status === "error" && <div className="err" style={{ marginTop: 10 }}>{video.error}</div>}
        </div>
      )}
    </>
  );
}
