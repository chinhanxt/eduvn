import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { errText } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { useMe } from "../Shell";
import { ChatPanel } from "./ChatPanel";
import { type Citation, type Kb, tutorApi } from "./client";
import { Markdown } from "./Markdown";
import { calloutBody } from "./text";

// bộ vẽ sơ đồ chỉ tải khi trang có khối figure
const FigureDiagram = lazy(() => import("./FigureDiagram"));

type BookRow = { id: string; title: string; description: string; kbId: string | null };
type PageRow = { id: string; idx: number; title: string; summary: string; objectives: string[]; status: string };
type Book = BookRow & { scope: string; pages: PageRow[] };
type Block = { type: string; title?: string; markdown?: string; data?: Record<string, unknown>; citations?: Citation[] };
type Page = PageRow & { blocks: Block[]; bookTitle: string };

const CALLOUT_VI: Record<string, string> = { key_idea: "Ý chính", warning: "Lưu ý", tip: "Mẹo", common_pitfall: "Lỗi hay gặp", insight: "Hiểu sâu hơn", connection: "Liên hệ" };

function BlockView({ b }: { b: Block }) {
  const cites = b.citations ?? [];
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  switch (b.type) {
    case "callout":
      return <div className="blk callout"><b className="callout-label">{CALLOUT_VI[b.title ?? ""] ?? "Ghi nhớ"}</b><Markdown text={calloutBody(b.markdown ?? "")} cites={cites} /></div>;
    case "figure": {
      const mm = String(b.data?.mermaid ?? "");
      return (
        <div className="blk card">
          <b>{b.title}</b>
          {mm && <Suspense fallback={<div className="fig-diagram sk" aria-hidden />}><FigureDiagram code={mm} title={b.title ?? "Sơ đồ"} /></Suspense>}
          <div className="fig-caption"><Markdown text={b.markdown ?? ""} cites={cites} /></div>
        </div>
      );
    }
    case "flash_cards": {
      const cards = (b.data?.cards ?? []) as { front: string; back: string; hint: string }[];
      return (
        <div className="blk"><b>{b.title}</b><div>
          {cards.map((c, i) => <button key={i} className={`fc${flip[i] ? " flip" : ""}`} onClick={() => setFlip({ ...flip, [i]: !flip[i] })}><MathText value={flip[i] ? c.back : c.front} /></button>)}
        </div></div>
      );
    }
    case "timeline": {
      const ev = (b.data?.events ?? []) as { date: string; title: string; description: string }[];
      return <div className="blk card"><b>{b.title}</b>{ev.map((e, i) => <div className="item" key={i}><b style={{ width: 90 }}>{e.date}</b><div className="grow">{e.title}<small>{e.description}</small></div></div>)}</div>;
    }
    case "code":
      return <div className="blk"><b>{b.title}</b><div className="md"><pre><code>{String(b.data?.code ?? "")}</code></pre></div><Markdown text={b.markdown ?? ""} /></div>;
    case "deep_dive": {
      const sg = (b.data?.suggestions ?? []) as { topic: string; rationale: string }[];
      return <div className="blk card"><b>{b.title}</b>{sg.map((s, i) => <div className="item" key={i}><div className="grow">{s.topic}<small>{s.rationale}</small></div></div>)}</div>;
    }
    default:
      return <div className="blk"><Markdown text={b.markdown ?? ""} cites={cites} /></div>;
  }
}

export function Books() {
  const me = useMe();
  const teacher = ["owner", "admin", "teacher"].includes(me?.role ?? "");
  const [books, setBooks] = useState<BookRow[]>([]);
  const [kbs, setKbs] = useState<Kb[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [sid, setSid] = useState<string | null>(null);
  const [form, setForm] = useState({ kbId: "", intent: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => tutorApi<BookRow[]>("/books").then(setBooks).catch((e: unknown) => setError(errText(e))), []);
  useEffect(() => {
    void load();
    tutorApi<Kb[]>("/kbs").then((l) => { setKbs(l); if (l[0]) setForm((f) => ({ ...f, kbId: l[0]!.id })); }).catch(() => {});
  }, [load]);

  const run = async <T,>(label: string, f: () => Promise<T>) => {
    setBusy(label);
    setError(null);
    try {
      return await f();
    } catch (e) {
      setError(errText(e));
      return null;
    } finally {
      setBusy(null);
    }
  };
  const openBook = async (id: string) => {
    const b = await run("open", () => tutorApi<Book>(`/books/${id}`));
    if (b) { setBook(b); setPage(null); setSid(null); const first = b.pages.find((p) => p.status === "ready") ?? b.pages[0]; if (first) void openPage(b, first.idx); }
  };
  const openPage = async (b: Book, idx: number) => {
    const p = await run("page", () => tutorApi<Page>(`/books/${b.id}/pages/${idx}`));
    if (p) { setPage(p); setSid(null); }
  };
  const create = async () => {
    const b = await run("create", () => tutorApi<Book>("/books", { method: "POST", body: form }));
    if (b) { void load(); setBook(b); setPage(null); }
  };
  const compile = async (b: Book, idx: number) => {
    const p = await run(`c${idx}`, () => tutorApi<Page>(`/books/${b.id}/pages/${idx}/compile`, { method: "POST" }));
    if (p) { setBook({ ...b, pages: b.pages.map((x) => (x.idx === idx ? { ...x, status: "ready" } : x)) }); setPage(p); setSid(null); return true; }
    return false;
  };
  const compileAll = async () => {
    if (!book) return;
    let cur = book;
    for (const p of book.pages.filter((x) => x.status !== "ready")) {
      const ok = await compile(cur, p.idx);
      if (!ok) break;
      cur = { ...cur, pages: cur.pages.map((x) => (x.idx === p.idx ? { ...x, status: "ready" } : x)) };
    }
  };

  if (!book)
    return (
      <div className="stack">
        {error && <div className="err">{error}</div>}
        {teacher && (
          <div className="card">
            <h2>Tạo giáo trình sống từ kho tri thức</h2>
            <div className="formrow">
              <label className="lbl">Kho<select className="inp" value={form.kbId} onChange={(e) => setForm({ ...form, kbId: e.target.value })}>{kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
              <label className="lbl" style={{ flex: 1 }}>Em/thầy cô muốn cuốn giáo trình về điều gì?<input className="inp w-l" value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })} placeholder="vd Giáo trình hằng đẳng thức đáng nhớ cho học sinh lớp 8" data-testid="book-intent" /></label>
              <button className="btn" disabled={!form.kbId || form.intent.trim().length < 3 || !!busy} onClick={() => void create()}>{busy === "create" ? "AI đang lên dàn chương…" : "Tạo giáo trình"}</button>
            </div>
          </div>
        )}
        {books.length === 0 && <div className="card"><div className="empty">Chưa có giáo trình nào.</div></div>}
        {books.map((b) => (
          <button key={b.id} className="card" style={{ textAlign: "left", border: 0 }} onClick={() => void openBook(b.id)} data-testid="book-row">
            <b>{b.title}</b><div style={{ color: "var(--muted)" }}>{b.description}</div>
          </button>
        ))}
      </div>
    );

  const ready = book.pages.filter((p) => p.status === "ready").length;
  return (
    <div className="stack">
      <button className="back" onClick={() => { setBook(null); void load(); }}><Icon name="left" size={16} />Các giáo trình</button>
      {error && <div className="err">{error}</div>}
      <div className="book-read">
        <div className="card toc">
          <h2>{book.title}</h2>
          <small style={{ color: "var(--muted)" }}>{book.description}</small>
          <div style={{ marginTop: 10 }}>
            {book.pages.map((p) => (
              <button key={p.id} className={page?.idx === p.idx ? "on" : ""} onClick={() => void openPage(book, p.idx)}>
                {p.idx + 1}. {p.title} {p.status !== "ready" && <span className="tag">{busy === `c${p.idx}` ? "đang viết…" : "chưa có nội dung"}</span>}
              </button>
            ))}
          </div>
          {teacher && ready < book.pages.length && <button className="btn" style={{ marginTop: 10 }} disabled={!!busy} onClick={() => void compileAll()}>{busy?.startsWith("c") ? "Đang biên soạn…" : "Biên soạn các chương còn lại"}</button>}
        </div>
        <div className="card page-body" data-testid="book-page">
          {!page && <div className="empty">{busy === "open" || busy === "page" ? "…" : "Chọn một chương để đọc."}</div>}
          {page && page.status !== "ready" && (
            <div className="empty">
              Chương này chưa được biên soạn.
              {teacher && <div style={{ marginTop: 10 }}><button className="btn" disabled={!!busy} onClick={() => void compile(book, page.idx)}>{busy === `c${page.idx}` ? "AI đang viết…" : "Biên soạn chương này"}</button></div>}
            </div>
          )}
          {page && page.status === "ready" && (
            <>
              <h1 style={{ marginTop: 0 }}>{page.idx + 1}. {page.title}</h1>
              {page.objectives.length > 0 && <div className="callout blk"><b>Sau chương này em sẽ: </b><ul style={{ margin: "4px 0 0" }}>{page.objectives.map((o, i) => <li key={i}><MathText value={o} /></li>)}</ul></div>}
              {page.blocks.map((b, i) => <BlockView key={i} b={b} />)}
            </>
          )}
        </div>
        {page && page.status === "ready" ? (
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Hỏi gia sư về trang này</h2>
            <ChatPanel compact ctx={{ kbId: book.kbId, bookPageId: page.id }} sessionId={sid} onSession={setSid} starters={["Em chưa hiểu đoạn này, giải thích lại đơn giản hơn nhé.", "Cho em thêm một ví dụ nữa."]} />
          </div>
        ) : <div />}
      </div>
    </div>
  );
}
