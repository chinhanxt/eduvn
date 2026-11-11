import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { BASE, type Action, type Scene, blobFetch, estimateMs, gradeQuestion, sceneHtml, splitCues } from "./lib";

type Focus = { id: string; effect: "spotlight" | "laser" } | null;

/** Trình phát bài giảng: chạy hành động từng cảnh (spotlight/laser + lời giảng có tiếng), dừng/tiếp/tua, phụ đề, quiz làm thử, cảnh interactive trong iframe sandbox. */
export function Player({ lessonId, scenes }: { lessonId: string; scenes: Scene[] }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [focus, setFocus] = useState<Focus>(null);
  const [sub, setSub] = useState("");
  const [showSub, setShowSub] = useState(true);
  const run = useRef(0);
  const paused = useRef(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const scene = scenes[Math.min(idx, scenes.length - 1)];
  const video = useRef<HTMLVideoElement | null>(null);
  const [animUrl, setAnimUrl] = useState<string | null>(null);
  const animHash = scene?.type === "slide" && scene.animation?.status === "xong" ? scene.animation.hash : undefined;

  const audioUrl = useCallback(
    async (file: string): Promise<string> => {
      const hit = cache.current.get(file);
      if (hit) return hit;
      const url = URL.createObjectURL(await blobFetch(`${BASE}/${lessonId}/audio/${file}`));
      cache.current.set(file, url);
      return url;
    },
    [lessonId],
  );
  useEffect(() => {
    const c = cache.current;
    return () => {
      for (const u of c.values()) URL.revokeObjectURL(u);
      c.clear();
      run.current++;
      audio.current?.pause();
    };
  }, []);

  // clip hoạt hình toán của cảnh hiện tại (tải kèm token rồi phát bằng blob)
  useEffect(() => {
    setAnimUrl(null);
    if (!animHash) return;
    let url: string | null = null;
    let dead = false;
    blobFetch(`${BASE}/${lessonId}/hoat-hinh/${animHash}`).then((b) => {
      if (dead) return;
      url = URL.createObjectURL(b);
      setAnimUrl(url);
    }).catch(() => undefined);
    return () => {
      dead = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [animHash, lessonId]);
  // clip chạy cùng lời giảng: vào cảnh thì về 0 giây; tạm dừng/tiếp theo nút Phát
  useEffect(() => {
    const v = video.current;
    if (!v || !animUrl) return;
    v.currentTime = 0;
    if (!paused.current) void v.play().catch(() => undefined);
  }, [animUrl, idx]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) void v.play().catch(() => undefined);
    else v.pause();
  }, [playing, animUrl]);

  const wait = (ms: number, token: number) =>
    new Promise<void>((resolve) => {
      let left = ms;
      const tick = setInterval(() => {
        if (token !== run.current) {
          clearInterval(tick);
          resolve();
          return;
        }
        if (!paused.current) left -= 100;
        if (left <= 0) {
          clearInterval(tick);
          resolve();
        }
      }, 100);
    });

  const speak = async (a: Action, token: number) => {
    const text = a.text ?? "";
    const dur = a.durationMs ?? estimateMs(text);
    const cues = splitCues(text, dur);
    let el: HTMLAudioElement | null = null;
    if (a.audioFile) {
      try {
        el = new Audio(await audioUrl(a.audioFile));
        audio.current = el;
        if (!paused.current) await el.play();
      } catch {
        el = null;
      }
    }
    const started = { t: 0 };
    await new Promise<void>((resolve) => {
      const tick = setInterval(() => {
        if (token !== run.current) {
          clearInterval(tick);
          el?.pause();
          resolve();
          return;
        }
        if (el) {
          if (paused.current && !el.paused) el.pause();
          if (!paused.current && el.paused && !el.ended) void el.play().catch(() => undefined);
          started.t = el.currentTime * 1000;
          if (el.ended) {
            clearInterval(tick);
            resolve();
            return;
          }
        } else {
          if (!paused.current) started.t += 100;
          if (started.t >= dur) {
            clearInterval(tick);
            resolve();
            return;
          }
        }
        const cue = [...cues].reverse().find((c) => started.t >= c.startMs) ?? cues[0];
        setSub(cue?.text ?? "");
      }, 100);
    });
    setSub("");
    audio.current = null;
  };

  const playScene = useCallback(
    async (i: number, from = 0) => {
      const token = ++run.current;
      const sc = scenes[i];
      if (!sc) return;
      setFocus(null);
      setSub("");
      const acts = (sc.actions ?? []).slice(from);
      let spoke = false;
      for (const a of acts) {
        if (token !== run.current) return;
        if (a.type === "spotlight" || a.type === "laser") setFocus({ id: String(a.elementId), effect: a.type });
        else if (a.type === "speech" && a.text) {
          spoke = true;
          await speak(a, token);
          if (token !== run.current) return;
          setFocus(null);
        }
      }
      if (token !== run.current) return;
      if (!spoke) await wait(3000, token);
      if (token !== run.current) return;
      if (sc.type === "slide" && i + 1 < scenes.length) {
        setIdx(i + 1);
        void playScene(i + 1);
      } else {
        paused.current = true;
        setPlaying(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenes, audioUrl],
  );

  const toggle = () => {
    if (!playing) {
      paused.current = false;
      setPlaying(true);
      if (run.current === 0 || !audio.current) void playScene(idx);
    } else {
      paused.current = true;
      setPlaying(false);
    }
  };
  const go = (i: number) => {
    const n = Math.max(0, Math.min(scenes.length - 1, i));
    run.current++;
    audio.current?.pause();
    setIdx(n);
    setFocus(null);
    setSub("");
    if (playing) void playScene(n);
  };

  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setPicked({});
    setChecked(false);
  }, [idx]);

  const html = useMemo(() => (scene && scene.type !== "interactive" && scene.type !== "quiz" ? sceneHtml(scene, { focusId: focus?.id, effect: focus?.effect, subtitle: showSub ? sub : "" }) : ""), [scene, focus, sub, showSub]);
  if (!scene) return <div className="empty">Bài giảng chưa có cảnh nào</div>;

  const qs = scene.content.questions ?? [];
  return (
    <div data-testid="ail-player">
      <div className="ail-stage">
        {scene.type === "quiz" ? (
          <div className="ail-quiz" data-testid="ail-quiz">
            <h2>{scene.title}</h2>
            {qs.map((q, qi) => {
              const sel = picked[q.id ?? String(qi)] ?? [];
              const res = checked ? gradeQuestion(q, sel) : null;
              return (
                <div key={q.id ?? qi} className="ail-q">
                  <b>Câu {qi + 1}.</b> <span dangerouslySetInnerHTML={{ __html: sceneHtmlInline(q.question) }} />
                  {q.type === "short_answer" ? (
                    <input className="inp w-l" placeholder="Nhập câu trả lời" value={sel[0] ?? ""} onChange={(e) => setPicked({ ...picked, [q.id ?? String(qi)]: [e.target.value] })} />
                  ) : (
                    (q.options ?? []).map((o) => (
                      <label key={o.value} className={`ail-opt${checked && q.answer?.includes(o.value) ? " ok" : ""}${checked && sel.includes(o.value) && !q.answer?.includes(o.value) ? " bad" : ""}`}>
                        <input
                          type={q.type === "multiple" ? "checkbox" : "radio"}
                          name={q.id}
                          checked={sel.includes(o.value)}
                          disabled={checked}
                          onChange={(e) => setPicked({ ...picked, [q.id ?? String(qi)]: q.type === "multiple" ? (e.target.checked ? [...sel, o.value] : sel.filter((x) => x !== o.value)) : [o.value] })}
                        />
                        {o.value}. <span dangerouslySetInnerHTML={{ __html: sceneHtmlInline(o.label) }} />
                      </label>
                    ))
                  )}
                  {checked && (
                    <div className="ail-an">
                      {res === "dung" ? "Đúng" : res === "sai" ? `Sai — đáp án: ${(q.answer ?? []).join(", ")}` : `Gợi ý đáp án: ${(q.answer ?? []).join(", ") || "—"}`}
                      {q.analysis ? ` · ${q.analysis}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
            <button className="btn" onClick={() => setChecked(true)} disabled={checked} data-testid="ail-check"><Icon name="check" size={18} />Kiểm tra</button>
            {showSub && sub && <div className="ail-sub">{sub}</div>}
          </div>
        ) : scene.type === "interactive" ? (
          <>
            <iframe className="ail-frame" title={scene.title} sandbox="allow-scripts" srcDoc={scene.content.html ?? ""} data-testid="ail-interactive" />
            {showSub && sub && <div className="ail-sub">{sub}</div>}
          </>
        ) : animHash ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={video} className="ail-frame ail-anim" src={animUrl ?? undefined} muted playsInline data-testid="ail-anim" />
            {showSub && sub && <div className="ail-sub">{sub}</div>}
          </>
        ) : (
          <iframe className="ail-frame" title={scene.title} sandbox="" srcDoc={html} data-testid="ail-slide" />
        )}
      </div>
      <div className="ail-ctrl">
        <button className="btn ghost sm" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Cảnh trước"><Icon name="left" size={16} /></button>
        <button className="btn sm" onClick={toggle} data-testid="ail-play"><Icon name={playing ? "pause" : "play"} size={16} />{playing ? "Tạm dừng" : "Phát"}</button>
        <button className="btn ghost sm" onClick={() => go(idx + 1)} disabled={idx >= scenes.length - 1} aria-label="Cảnh sau" data-testid="ail-next"><Icon name="right" size={16} /></button>
        <span className="ail-cnt">Cảnh {idx + 1}/{scenes.length} · {scene.title}</span>
        <span className="sp" style={{ flex: 1 }} />
        <label className="ail-cc"><input type="checkbox" checked={showSub} onChange={(e) => setShowSub(e.target.checked)} />Phụ đề</label>
      </div>
      <div className="ail-thumbs">
        {scenes.map((s, i) => (
          <button key={s.id} className={`ail-th${i === idx ? " on" : ""}`} onClick={() => go(i)} data-testid="ail-scene-btn">
            <span>{i + 1}</span>
            {s.title}
            <small>{s.type === "slide" ? (s.animation?.status === "xong" ? "Slide + hoạt hình" : "Slide") : s.type === "quiz" ? "Quiz" : "Tương tác"}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

import { latex } from "./lib";
function sceneHtmlInline(s: string): string {
  const e = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return e.replace(/\$([^$]+)\$/g, (_m, t: string) => latex(t));
}
