import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../Icon";
import { fold, trapTab } from "./focus";

export type Command = { group: string; title: string; icon?: string; kbd?: string; href?: string; run?: () => unknown; keywords?: string };

/** Bảng lệnh Ctrl K: tìm không dấu, nhóm Trang/Lớp/Thao tác, ↑ ↓ Enter, Esc đóng. */
export function CommandPalette({ commands, open, onOpenChange, onNavigate, placeholder = "Tìm trang, lớp, học sinh, câu hỏi…" }: { commands: readonly Command[]; open: boolean; onOpenChange: (open: boolean) => void; onNavigate: (href: string) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);
  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => input.current?.focus());
    return () => prev?.focus?.();
  }, [open]);

  const results = useMemo(() => {
    const nq = fold(q.trim());
    return commands.filter((c) => !nq || fold(`${c.title} ${c.keywords ?? ""}`).includes(nq)).slice(0, 12);
  }, [commands, q]);
  const groups = useMemo(() => {
    const m = new Map<string, { c: Command; i: number }[]>();
    results.forEach((c, i) => (m.get(c.group) ?? m.set(c.group, []).get(c.group)!).push({ c, i }));
    return [...m.entries()];
  }, [results]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;
  const choose = (c: Command | undefined) => {
    if (!c) return;
    onOpenChange(false);
    if (c.run) void c.run();
    else if (c.href) onNavigate(c.href);
  };
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div
        ref={box}
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onOpenChange(false);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(results[sel]);
          }
          trapTab(e, box.current);
        }}
      >
        <div className="q">
          <Icon name="search" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            placeholder={placeholder}
            aria-label="Tìm"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-res"
            aria-activedescendant={results[sel] ? `cmdk-${sel}` : undefined}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="res" role="listbox" id="cmdk-res" ref={list}>
          {groups.length ? (
            groups.map(([g, items]) => (
              <div key={g} role="group" aria-label={g}>
                <div className="grp eyebrow">{g}</div>
                {items.map(({ c, i }) => (
                  <a
                    key={`${g}-${c.title}`}
                    id={`cmdk-${i}`}
                    role="option"
                    aria-selected={i === sel}
                    href={c.href ?? "#"}
                    onMouseMove={() => setSel(i)}
                    onClick={(e) => {
                      e.preventDefault();
                      choose(c);
                    }}
                  >
                    <Icon name={c.icon ?? "right"} />
                    <span>{c.title}</span>
                    {c.kbd && <kbd>{c.kbd}</kbd>}
                  </a>
                ))}
              </div>
            ))
          ) : (
            <div className="empty" style={{ padding: 32 }}>
              <p>Không thấy “{q}”.</p>
            </div>
          )}
        </div>
        <div className="foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> chọn
          </span>
          <span>
            <kbd>↵</kbd> mở
          </span>
          <span>
            <kbd>Ctrl</kbd> <kbd>K</kbd> mở/đóng
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
