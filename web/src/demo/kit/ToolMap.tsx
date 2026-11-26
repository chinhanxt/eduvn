import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../ui/Icon";
import { type ArtKind, ToolArt } from "./ToolArt";
import "./toolmap.css";

export type Tool = { to: string; href?: string; label: string; desc: string; art: ArtKind; keywords?: string };
export type ToolGroup = { id: string; title: string; color: string; items: Tool[] };

/** Bỏ dấu để tìm "cham bai" ra "Chấm bài". */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Bản đồ mọi chức năng theo nhóm: ô tìm + mục lục nhóm (bên trái) + mỗi chức năng một hình thu nhỏ sống. Dùng chung cổng GV và Học. */
export function ToolMap({ groups, hint }: { groups: ToolGroup[]; hint?: string[] }) {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const input = useRef<HTMLInputElement>(null);
  const [at, setAt] = useState(groups[0]?.id ?? "");
  const shown = useMemo(() => {
    const k = fold(dq.trim());
    if (!k) return groups;
    return groups.map((g) => ({ ...g, items: g.items.filter((t) => fold(`${t.label} ${t.desc} ${t.keywords ?? ""} ${g.title}`).includes(k)) })).filter((g) => g.items.length);
  }, [dq, groups]);
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const found = shown.reduce((a, g) => a + g.items.length, 0);

  // phím "/" → ô tìm
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  // nhóm đang xem (tô trên mục lục)
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setAt((v.target as HTMLElement).dataset.g ?? "");
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    document.querySelectorAll<HTMLElement>(".tm-sec[data-g]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [shown]);

  return (
    <div className="tm">
      <aside className="tm-rail">
        <label className="tm-search">
          <Icon name="search" size="sm" />
          <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm công cụ" aria-label={`Tìm trong ${total} công cụ`} />
          <kbd>/</kbd>
        </label>
        <nav className="tm-index" aria-label="Nhóm công cụ">
          {groups.map((g) => {
            const n = shown.find((s) => s.id === g.id)?.items.length ?? 0;
            return (
              <button
                key={g.id}
                type="button"
                style={{ ["--k" as string]: g.color }}
                aria-current={at === g.id ? "true" : undefined}
                disabled={!n}
                onClick={() => document.getElementById(`nhom-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                <i />
                <span>{g.title}</span>
                <b className="num">{n}</b>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="tm-body" aria-live="polite">
        {found === 0 && (
          <div className="tm-none">
            <ToolArt kind="search" />
            <p>Chưa có công cụ “{q.trim()}”.</p>
            {hint && (
              <div className="tm-hint">
                {hint.map((h) => (
                  <button key={h} type="button" onClick={() => setQ(h)}>{h}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {shown.map((g) => (
          <section key={g.id} id={`nhom-${g.id}`} data-g={g.id} className="tm-sec" style={{ ["--k" as string]: g.color }} aria-labelledby={`tm-h-${g.id}`}>
            <h2 id={`tm-h-${g.id}`}>
              <i />
              {g.title}
            </h2>
            <ul className="tm-grid">
              {g.items.map((t, i) => {
                const inner = (
                  <>
                    <span className="tm-thumb">
                      <ToolArt kind={t.art} />
                    </span>
                    <b>{t.label}</b>
                    <small>{t.desc}</small>
                  </>
                );
                return (
                  <li key={t.to} style={{ ["--i" as string]: Math.min(i, 8) }}>
                    {t.href ? <a className="tm-tile" href={t.href}>{inner}</a> : <Link className="tm-tile" to={t.to}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
