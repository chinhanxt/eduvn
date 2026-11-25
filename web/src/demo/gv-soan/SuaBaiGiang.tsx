/** /gv/bai-giang-ai/sua — Trình sửa bài giảng (mô phỏng): kéo thả slide và khối trên slide, hoàn tác/làm lại, đọc lại từng câu, đổi giọng, phát thử đồng bộ. */
import { type DragEvent, type PointerEvent as RPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { IconButton } from "../../ui/components/Button";
import { Icon } from "../../ui/Icon";
import { Head, Wave } from "./common";
import { SLIDES, type Slide, VOICES, type VoiceId } from "./data";
import { PaperSlide } from "./Paper";

type Part = "txt" | "fig";
type XY = [number, number];
type Doc = { order: string[]; off: Record<string, Partial<Record<Part, XY>>>; titles: Record<string, string> };
const START: Doc = { order: SLIDES.map((s) => s.id), off: {}, titles: {} };
const BY_ID = Object.fromEntries(SLIDES.map((s) => [s.id, s])) as Record<string, Slide>;
const secOf = (t: string) => Math.max(1.6, t.split(" ").length * 0.34);

/** Lịch sử thao tác: hoàn tác / làm lại. */
function useHistory(init: Doc) {
  const [h, setH] = useState({ list: [init], i: 0 });
  const doc = h.list[h.i]!;
  const push = useCallback((d: Doc) => setH((x) => ({ list: [...x.list.slice(0, x.i + 1), d].slice(-50), i: Math.min(x.i + 1, 49) })), []);
  const undo = useCallback(() => setH((x) => ({ ...x, i: Math.max(0, x.i - 1) })), []);
  const redo = useCallback(() => setH((x) => ({ ...x, i: Math.min(x.list.length - 1, x.i + 1) })), []);
  return { doc, push, undo, redo, canUndo: h.i > 0, canRedo: h.i < h.list.length - 1, steps: h.i };
}

export function SuaBaiGiang() {
  const { doc, push, undo, redo, canUndo, canRedo } = useHistory(START);
  const [cur, setCur] = useState("s2");
  const [sel, setSel] = useState<Part | null>(null);
  const [voice, setVoice] = useState<VoiceId>("ha");
  const [regen, setRegen] = useState<Record<string, boolean>>({});
  const [speak, setSpeak] = useState<{ key: string; t0: number } | null>(null);
  const [play, setPlay] = useState<{ t0: number } | null>(null);
  const [now, setNow] = useState(0);
  const [live, setLive] = useState<{ part: Part; xy: XY } | null>(null);
  const drag = useRef<number | null>(null);
  const canvas = useRef<HTMLDivElement>(null);

  const slides = doc.order.map((id) => ({ ...BY_ID[id]!, title: doc.titles[id] ?? BY_ID[id]!.title }));
  const idx = Math.max(0, doc.order.indexOf(cur));
  const slide = slides[idx]!;

  // Dòng thời gian toàn bài: mỗi câu một đoạn.
  const track = useMemo(() => {
    let t = 0;
    return slides.flatMap((s) => s.say.map((line, k) => {
      const seg = { id: s.id, k, line, start: t, dur: secOf(line) };
      t += seg.dur + 0.25;
      return seg;
    }));
  }, [slides]);
  const total = track.length ? track[track.length - 1]!.start + track[track.length - 1]!.dur : 1;

  // Đồng hồ khung hình khi phát thử / đọc một câu.
  useEffect(() => {
    if (!play && !speak) return;
    let raf = 0;
    const f = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [play, speak]);
  const pt = play ? (now - play.t0) / 1000 : -1;
  const playing = play ? track.find((s) => pt >= s.start && pt < s.start + s.dur + 0.25) : undefined;
  useEffect(() => {
    if (play && pt > total) setPlay(null);
    if (playing && playing.id !== cur) setCur(playing.id);
  }, [play, pt, total, playing, cur]);
  const sp = speak ? (now - speak.t0) / 1000 : 0;
  useEffect(() => {
    if (speak) {
      const [id, k] = speak.key.split(":");
      const line = BY_ID[id!]!.say[Number(k)]!;
      if (sp > secOf(line)) setSpeak(null);
    }
  }, [speak, sp]);

  // Phím tắt hoàn tác / làm lại.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || (e.target as HTMLElement).closest("input,textarea")) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [undo, redo]);

  const reorder = (e: DragEvent, i: number) => {
    e.preventDefault();
    const from = drag.current;
    if (from === null || from === i) return;
    const order = [...doc.order];
    const [m] = order.splice(from, 1);
    order.splice(i, 0, m!);
    drag.current = i;
    push({ ...doc, order });
  };

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest(".pp-txt, .pp-fig");
    if (!el || play) return setSel(null);
    const part: Part = el.classList.contains("pp-txt") ? "txt" : "fig";
    setSel(part);
    const w = canvas.current!.offsetWidth;
    const base = doc.off[cur]?.[part] ?? [0, 0];
    const sx = e.clientX, sy = e.clientY;
    let xy: XY = base;
    const move = (ev: PointerEvent) => {
      xy = [base[0] + ((ev.clientX - sx) / w) * 100, base[1] + ((ev.clientY - sy) / w) * 100];
      setLive({ part, xy });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLive(null);
      if (xy !== base) push({ ...doc, off: { ...doc.off, [cur]: { ...doc.off[cur], [part]: xy } } });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const offOf = (p: Part) => (live?.part === p ? live.xy : doc.off[cur]?.[p] ?? [0, 0]);

  const changeVoice = (v: VoiceId) => {
    setVoice(v);
    const keys = slide.say.map((_, k) => `${slide.id}:${k}`);
    setRegen(Object.fromEntries(keys.map((k) => [k, true])));
    keys.forEach((k, i) => setTimeout(() => setRegen((r) => ({ ...r, [k]: false })), 700 + i * 450));
  };
  const reread = (key: string) => {
    setRegen((r) => ({ ...r, [key]: true }));
    setTimeout(() => {
      setRegen((r) => ({ ...r, [key]: false }));
      setSpeak({ key, t0: performance.now() });
    }, 900);
  };

  const hotLine = play ? (playing?.id === slide.id ? playing.k : -1) : speak?.key.startsWith(`${slide.id}:`) ? Number(speak.key.split(":")[1]) : -1;
  const hot = hotLine >= 0 ? Math.min(hotLine, slide.points.length - 1) : undefined;
  const t = offOf("txt"), f = offOf("fig");

  return (
    <>
      <Head title="Sửa bài giảng" crumbs={[{ label: "Bài giảng AI", to: "/bai-giang-ai" }, { label: "Sửa" }]} primary={{ label: play ? "Dừng" : "Phát thử", icon: play ? "stop" : "play", onClick: () => setPlay(play ? null : { t0: performance.now() }) }}>
        <IconButton icon="undo" label="Hoàn tác (Ctrl Z)" disabled={!canUndo} onClick={undo} />
        <IconButton icon="repeat" label="Làm lại (Ctrl Shift Z)" disabled={!canRedo} onClick={redo} />
        <Link className="btn sm ghost" to="/xuat-ban"><Icon name="upload" size="sm" /><span className="hide-sm">Xuất bản</span></Link>
      </Head>
      <div className="gs-ed">
        <ol className="gs-film" aria-label="Thứ tự slide">
          {slides.map((s, i) => (
            <li
              key={s.id}
              draggable
              onDragStart={() => (drag.current = i)}
              onDragOver={(e) => reorder(e, i)}
              onDragEnd={() => (drag.current = null)}
              aria-current={s.id === cur || undefined}
              onClick={() => setCur(s.id)}
            >
              <span className="num">{i + 1}</span>
              <PaperSlide slide={s} />
            </li>
          ))}
        </ol>

        <div className="gs-canvas-wrap">
          <div
            ref={canvas}
            className={["gs-canvas", sel && `sel-${sel}`, live && "dragging"].filter(Boolean).join(" ")}
            onPointerDown={down}
            style={{ ["--tx" as string]: `${t[0]}cqw`, ["--ty" as string]: `${t[1]}cqw`, ["--fx" as string]: `${f[0]}cqw`, ["--fy" as string]: `${f[1]}cqw` }}
          >
            <PaperSlide key={slide.id + (play ? "p" : "")} slide={slide} n={idx + 1} build={!!play} hot={hot} />
          </div>
          <div className="gs-tl" aria-label="Dòng thời gian lời đọc">
            {track.map((s) => (
              <i
                key={`${s.id}:${s.k}`}
                style={{ flexGrow: s.dur }}
                className={[s.id === cur && "cur", playing === s && "on"].filter(Boolean).join(" ")}
                onClick={() => setCur(s.id)}
              />
            ))}
            {play && <b className="gs-head" style={{ left: `${Math.min(100, (pt / total) * 100)}%` }} />}
          </div>
          <div className="gs-tl-meta num">
            <span>{play ? fmt(pt) : fmt(0)}</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        <aside className="gs-insp">
          <label className="gs-lbl" htmlFor="gs-title">Tiêu đề</label>
          <input
            id="gs-title"
            key={slide.id + slide.title}
            className="gs-title-in"
            defaultValue={slide.title}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== slide.title) push({ ...doc, titles: { ...doc.titles, [slide.id]: v } });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <div className="gs-lbl">Giọng</div>
          <select className="select" value={voice} onChange={(e) => changeVoice(e.target.value as VoiceId)} aria-label="Giọng đọc">
            {VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <div className="gs-lbl">Lời đọc</div>
          <ol className="gs-lines">
            {slide.say.map((line, k) => {
              const key = `${slide.id}:${k}`;
              const on = hotLine === k;
              const words = line.split(" ");
              const prog = on ? (play ? (pt - (playing?.start ?? 0)) / secOf(line) : sp / secOf(line)) : 0;
              return (
                <li key={key} className={[on && "on", regen[key] && "regen"].filter(Boolean).join(" ")}>
                  <p>{words.map((w, i) => <span key={i} className={on && i / words.length < prog ? "said" : undefined}>{w} </span>)}</p>
                  <div className="gs-line-ft">
                    <Wave n={28} seed={k + idx * 3 + 2} progress={on ? prog : undefined} live={!!regen[key]} />
                    <span className="num">{secOf(line).toFixed(1)}s</span>
                    <IconButton size="sm" icon="refresh" label="Đọc lại câu này" onClick={() => reread(key)} />
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </>
  );
}

const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};
