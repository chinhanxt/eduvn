import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { elementHtml, esc } from "../../../server/src/export/slideHtml";
import { type El, type Scene, latex } from "./lib";

const plainOf = (html: string) => html.replace(/<\/p>|<br\s*\/?>|<\/li>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\n+$/, "");
const styleOfFirst = (html: string) => /<(?:span|strong|em|b|i|u)\b[^>]*style=["']([^"']*)["']/i.exec(html)?.[1];
const linesToHtml = (text: string, style?: string) => text.split("\n").map((l) => `<p>${style ? `<span style="${style}">` : ""}${esc(l)}${style ? "</span>" : ""}</p>`).join("");

const blankScene = (n: number): Scene => ({
  id: `scene_${Date.now().toString(36)}`,
  type: "slide",
  title: "Cảnh mới",
  order: n,
  content: {
    type: "slide",
    canvas: {
      id: `slide_${Date.now().toString(36)}`,
      elements: [{ id: `text_${Date.now().toString(36)}`, type: "text", left: 60, top: 40, width: 880, height: 90, content: '<p><span style="font-size:36px;font-weight:700">Tiêu đề</span></p>', defaultColor: "#1e2340", defaultFontName: "" }],
      background: { type: "solid", color: "#ffffff" },
      theme: { backgroundColor: "#ffffff", fontColor: "#333333" },
    } as never,
  },
  actions: [],
});

/** Sửa nhanh sau khi sinh: sửa chữ phần tử, kéo vị trí, xoá/thêm cảnh, đổi thứ tự, sinh lại 1 cảnh. */
export function Editor({ scenes, onChange, onRegenerate, busy }: { scenes: Scene[]; onChange: (s: Scene[]) => void; onRegenerate: (id: string, directive: string) => void; busy: boolean }) {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [directive, setDirective] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; l: number; t: number } | null>(null);
  const scene = scenes[Math.min(idx, scenes.length - 1)];
  const canvas = scene?.type === "slide" ? scene.content.canvas : undefined;
  const el = canvas?.elements.find((e) => e.id === sel);

  const setScene = (s: Scene) => onChange(scenes.map((x) => (x.id === s.id ? s : x)));
  const setEl = (id: string, patch: Partial<El>) => {
    if (!scene || !canvas) return;
    setScene({ ...scene, content: { ...scene.content, canvas: { ...canvas, elements: canvas.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) } } });
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= scenes.length) return;
    const a = [...scenes];
    [a[i], a[j]] = [a[j] as Scene, a[i] as Scene];
    onChange(a);
    setIdx(j);
  };
  const del = (i: number) => {
    if (!confirm(`Xoá cảnh "${scenes[i]?.title}"?`)) return;
    onChange(scenes.filter((_, k) => k !== i));
    setIdx(Math.max(0, i - 1));
  };
  const speeches = (scene?.actions ?? []).filter((a) => a.type === "speech");

  const onDown = (e: React.PointerEvent, it: El) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSel(it.id);
    drag.current = { id: it.id, x: e.clientX, y: e.clientY, l: it.left, t: it.top };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const w = stage.current?.getBoundingClientRect().width;
    if (!d || !w) return;
    const k = 1000 / w;
    setEl(d.id, { left: Math.round(d.l + (e.clientX - d.x) * k), top: Math.round(d.t + (e.clientY - d.y) * k) });
  };

  return (
    <div className="ail-edit" data-testid="ail-editor">
      <div className="ail-edit-list">
        {scenes.map((s, i) => (
          <div key={s.id} className={`ail-row${i === idx ? " on" : ""}`}>
            <button className="ail-rowbtn" onClick={() => { setIdx(i); setSel(null); }} data-testid="ail-edit-scene">{i + 1}. {s.title}<small>{s.type === "slide" ? "Slide" : s.type === "quiz" ? "Quiz" : "Tương tác"}</small></button>
            <button className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Lên">↑</button>
            <button className="btn ghost sm" onClick={() => move(i, 1)} disabled={i === scenes.length - 1} aria-label="Xuống">↓</button>
            <button className="btn ghost sm" onClick={() => del(i)} aria-label="Xoá cảnh" data-testid="ail-del-scene"><Icon name="trash" size={16} /></button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => { onChange([...scenes, blankScene(scenes.length + 1)]); setIdx(scenes.length); }} data-testid="ail-add-scene"><Icon name="plus" size={18} />Thêm cảnh trống</button>
      </div>
      {scene && (
        <div className="ail-edit-main">
          <div className="formrow">
            <label className="lbl" style={{ flex: 1 }}>Tên cảnh
              <input className="inp w-l" value={scene.title} onChange={(e) => setScene({ ...scene, title: e.target.value })} data-testid="ail-scene-title" />
            </label>
            <label className="lbl" style={{ flex: 1 }}>Yêu cầu sinh lại (tuỳ chọn)
              <input className="inp w-l" value={directive} placeholder="vd: thêm một ví dụ bằng số" onChange={(e) => setDirective(e.target.value)} />
            </label>
            <button className="btn ghost" disabled={busy} onClick={() => onRegenerate(scene.id, directive)} data-testid="ail-regen"><Icon name="rotate" size={18} />Sinh lại cảnh</button>
          </div>
          {canvas ? (
            <div className="ail-canvas-wrap">
              <div className="ail-canvas stage" ref={stage} style={{ background: canvas.background?.color ?? "#fff" }} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onClick={() => setSel(null)} data-testid="ail-canvas">
                {canvas.elements.map((it) => <div key={it.id} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: elementHtml(it, { latex }) }} />)}
                {canvas.elements.map((it) => (
                  <div
                    key={`h-${it.id}`}
                    className={`ail-handle${sel === it.id ? " on" : ""}`}
                    style={{ left: `${it.left / 10}cqw`, top: `${it.top / 10}cqw`, width: `${(it.type === "line" ? 40 : it.width) / 10}cqw`, height: `${(it.type === "line" ? 20 : it.height) / 10}cqw` }}
                    onPointerDown={(e) => { e.stopPropagation(); onDown(e, it); }}
                    onClick={(e) => e.stopPropagation()}
                    data-testid="ail-handle"
                  />
                ))}
              </div>
              <div className="ail-props">
                <div className="bar" style={{ marginBottom: 8 }}>
                  <button className="btn ghost sm" onClick={() => { const n: El = { id: `text_${Date.now().toString(36)}`, type: "text", left: 100, top: 200, width: 500, height: 80, content: '<p><span style="font-size:24px">Chữ mới</span></p>', defaultColor: "#333333" }; setScene({ ...scene, content: { ...scene.content, canvas: { ...canvas, elements: [...canvas.elements, n] } } }); setSel(n.id); }} data-testid="ail-add-text"><Icon name="plus" size={16} />Thêm chữ</button>
                  {el && <button className="btn ghost sm" onClick={() => { setScene({ ...scene, content: { ...scene.content, canvas: { ...canvas, elements: canvas.elements.filter((e) => e.id !== el.id) } } }); setSel(null); }} data-testid="ail-del-el"><Icon name="trash" size={16} />Xoá phần tử</button>}
                </div>
                {!el && <div className="empty" style={{ padding: 12 }}>Bấm vào một phần tử trên slide để sửa; kéo để đổi vị trí.</div>}
                {el?.type === "text" && (
                  <label className="lbl">Nội dung chữ
                    <textarea className="inp" rows={5} value={plainOf(String(el.content ?? ""))} onChange={(e) => setEl(el.id, { content: linesToHtml(e.target.value, styleOfFirst(String(el.content ?? ""))) })} data-testid="ail-text" />
                  </label>
                )}
                {el?.type === "latex" && (
                  <label className="lbl">Công thức (LaTeX)
                    <input className="inp w-l" value={String(el.latex ?? "")} onChange={(e) => setEl(el.id, { latex: e.target.value })} />
                  </label>
                )}
                {el && (
                  <div className="formrow" style={{ marginTop: 8 }}>
                    {(["left", "top", "width", "height"] as const).map((k) => (
                      <label key={k} className="lbl">{{ left: "Trái", top: "Trên", width: "Rộng", height: "Cao" }[k]}
                        <input className="inp w-s" type="number" value={Math.round(Number(el[k] ?? 0))} onChange={(e) => setEl(el.id, { [k]: Number(e.target.value) })} />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card"><div className="empty">Cảnh {scene.type === "quiz" ? "quiz" : "tương tác"} — dùng "Sinh lại cảnh" để đổi nội dung, hoặc xoá/đổi chỗ ở danh sách bên trái.</div></div>
          )}
          {speeches.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <b>Lời giảng</b>
              {speeches.map((a) => (
                <textarea key={a.id} className="inp" rows={2} style={{ marginTop: 8 }} value={a.text ?? ""} onChange={(e) => setScene({ ...scene, actions: (scene.actions ?? []).map((x) => (x.id === a.id ? { ...x, text: e.target.value, audioFile: undefined, durationMs: undefined } : x)) })} data-testid="ail-speech" />
              ))}
              <small style={{ color: "var(--muted)" }}>Sửa lời giảng thì giọng đọc cũ bị bỏ; trình phát tự đọc ước lượng thời gian.</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
