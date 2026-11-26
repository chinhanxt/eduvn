// Giáo trình sống (cổng GV): AI soạn cuốn giáo trình từ một kho tri thức, GV biên soạn từng chương rồi đọc/hỏi gia sư.
// Cùng API với hoc/Books (/api/tutor/books, /kbs); chỉ khác giao diện theo chuẩn đẹp cổng GV.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { errText } from "../../api";
import { ChatPanel } from "../../hoc/ChatPanel";
import { type Citation, type Kb, tutorApi } from "../../hoc/client";
import { Markdown } from "../../hoc/Markdown";
import { calloutBody } from "../../hoc/text";
import { MathText } from "../../math/MathText";
import { useMe } from "../../Shell";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/components/Button";
import { Skeleton } from "../../ui/components/Skeleton";
import { PageHead } from "../../ui/shell/PageHead";
import { type ArtName, Art, EmptyHero, samples } from "./Preview";
import "../../hoc/hoc.css";
import "./gv.css";

const FigureDiagram = lazy(() => import("../../hoc/FigureDiagram"));

type BookRow = { id: string; title: string; description: string; kbId: string | null };
type PageRow = { id: string; idx: number; title: string; summary: string; objectives: string[]; status: string };
type Book = BookRow & { scope: string; pages: PageRow[] };
type Block = { type: string; title?: string; markdown?: string; data?: Record<string, unknown>; citations?: Citation[] };
type Page = PageRow & { blocks: Block[]; bookTitle: string };

const CALLOUT_VI: Record<string, string> = { key_idea: "Ý chính", warning: "Lưu ý", tip: "Mẹo", common_pitfall: "Lỗi hay gặp", insight: "Hiểu sâu hơn", connection: "Liên hệ" };
const IDEAS = ["Quang hợp cho học sinh lớp 8", "Chiến dịch Điện Biên Phủ qua bản đồ", "Câu bị động trong Tiếng Anh 10"];
const ARTS: ArtName[] = ["la", "moc", "song", "van", "phan-tu", "ban-do", "hoi-thoai", "code"];
const artOf = (s: string): ArtName => ARTS[[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % ARTS.length]!;

function BlockView({ b }: { b: Block }) {
  const cites = b.citations ?? [];
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  switch (b.type) {
    case "callout":
      return <div className="blk callout"><b className="callout-label">{CALLOUT_VI[b.title ?? ""] ?? "Ghi nhớ"}</b><Markdown text={calloutBody(b.markdown ?? "")} cites={cites} /></div>;
    case "figure": {
      const mm = String(b.data?.mermaid ?? "");
      return (
        <figure className="blk gt-fig">
          {mm && <Suspense fallback={<div className="fig-diagram sk" aria-hidden />}><FigureDiagram code={mm} title={b.title ?? "Sơ đồ"} /></Suspense>}
          <figcaption><b>{b.title}</b> <Markdown text={b.markdown ?? ""} cites={cites} /></figcaption>
        </figure>
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
      return <div className="blk gt-tl"><b>{b.title}</b><ol>{ev.map((e, i) => <li key={i}><span>{e.date}</span><div>{e.title}<small>{e.description}</small></div></li>)}</ol></div>;
    }
    case "code":
      return <div className="blk"><b>{b.title}</b><div className="md"><pre><code>{String(b.data?.code ?? "")}</code></pre></div><Markdown text={b.markdown ?? ""} /></div>;
    case "deep_dive": {
      const sg = (b.data?.suggestions ?? []) as { topic: string; rationale: string }[];
      return <div className="blk gt-tl"><b>{b.title}</b><ul>{sg.map((s, i) => <li key={i}><div>{s.topic}<small>{s.rationale}</small></div></li>)}</ul></div>;
    }
    default:
      return <div className="blk"><Markdown text={b.markdown ?? ""} cites={cites} /></div>;
  }
}

function Cover({ title, sub, art, onClick }: { title: string; sub: string; art?: ArtName; onClick?: () => void }) {
  const inner = (
    <>
      <div className="cv">
        <i className="sp" />
        <Art name={art ?? artOf(title)} className="gv-art" />
      </div>
      <b>{title}</b>
      <small>{sub}</small>
    </>
  );
  return onClick ? <button type="button" className="gt-cover" onClick={onClick} data-testid="book-row">{inner}</button> : <div className="gt-cover">{inner}</div>;
}

export function GiaoTrinh() {
  const me = useMe();
  const teacher = ["owner", "admin", "teacher"].includes(me?.role ?? "");
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [kbs, setKbs] = useState<Kb[] | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [sid, setSid] = useState<string | null>(null);
  const [form, setForm] = useState({ kbId: "", intent: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ask = useRef<HTMLInputElement>(null);

  const load = useCallback(() => tutorApi<BookRow[]>("/books").then(setBooks).catch((e: unknown) => (setError(errText(e)), setBooks([]))), []);
  useEffect(() => {
    void load();
    tutorApi<Kb[]>("/kbs").then((l) => { setKbs(l); if (l[0]) setForm((f) => ({ ...f, kbId: l[0]!.id })); }).catch(() => setKbs([]));
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
  const openPage = async (b: Book, idx: number) => {
    const p = await run("page", () => tutorApi<Page>(`/books/${b.id}/pages/${idx}`));
    if (p) { setPage(p); setSid(null); }
  };
  const openBook = async (id: string) => {
    const b = await run("open", () => tutorApi<Book>(`/books/${id}`));
    if (b) { setBook(b); setPage(null); setSid(null); const first = b.pages.find((p) => p.status === "ready") ?? b.pages[0]; if (first) void openPage(b, first.idx); }
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
  const canCreate = !!form.kbId && form.intent.trim().length >= 3 && !busy;

  if (!book) {
    const noKb = kbs !== null && kbs.length === 0;
    return (
      <div className="gt-root">
        <PageHead title="Giáo trình sống" />
        {error && <div className="note err" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
        {teacher && (
          <section className="gt-ask" aria-label="Tạo giáo trình">
            <h2>Cuốn giáo trình về điều gì?</h2>
            <form className="gt-bar" onSubmit={(e) => { e.preventDefault(); if (canCreate) void create(); }}>
              <Icon name="spark" />
              <input ref={ask} value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })} placeholder="Chủ đề, lớp, mục tiêu…" aria-label="Chủ đề giáo trình" data-testid="book-intent" />
              {kbs && kbs.length > 0 && (
                <label className="gt-kb">
                  <Icon name="layers" size="sm" />
                  <select aria-label="Kho tri thức" value={form.kbId} onChange={(e) => setForm({ ...form, kbId: e.target.value })}>{kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
                  <Icon name="chev" size="sm" />
                </label>
              )}
              <Button type="submit" variant="primary" disabled={!canCreate} icon="spark">{busy === "create" ? "AI đang lên dàn chương…" : "Để AI soạn"}</Button>
            </form>
            <div className="gt-ideas">
              {IDEAS.map((x) => <button type="button" key={x} onClick={() => (setForm((f) => ({ ...f, intent: x })), ask.current?.focus())}>“{x}”</button>)}
            </div>
            {noKb && <p className="gt-hint"><Icon name="info" size="sm" /> Giáo trình được soạn từ tài liệu trong kho. <Link to="/kho-tri-thuc">Tạo kho tri thức</Link></p>}
          </section>
        )}
        {books === null ? (
          <div className="gv-grid gt-books">{[0, 1, 2, 3].map((i) => <div key={i}><Skeleton h={180} style={{ borderRadius: 6 }} /><Skeleton w="70%" h={14} style={{ marginTop: 10 }} /></div>)}</div>
        ) : books.length === 0 ? (
          <EmptyHero className="gt-empty" tag="Ví dụ giáo trình">
            {samples(5, 0).map((s) => <Cover key={s.title} title={s.title} sub={`${s.subj} · ${s.cls}`} art={s.art} />)}
          </EmptyHero>
        ) : (
          <section aria-label="Các giáo trình">
            <h3 className="gt-sec">Các giáo trình <span>{books.length}</span></h3>
            <div className="gv-grid gt-books">
              {books.map((b) => <Cover key={b.id} title={b.title} sub={b.description} onClick={() => void openBook(b.id)} />)}
            </div>
          </section>
        )}
      </div>
    );
  }

  const ready = book.pages.filter((p) => p.status === "ready").length;
  return (
    <div className="gt-root">
      <Link className="back-link" to="/giao-trinh" onClick={(e) => { e.preventDefault(); setBook(null); void load(); }}><Icon name="left" size="sm" />Các giáo trình</Link>
      {error && <div className="note err" role="alert" style={{ margin: "12px 0" }}>{error}</div>}
      <div className="gt-read">
        <nav className="gt-toc" aria-label="Mục lục">
          <h1>{book.title}</h1>
          {book.description && <p>{book.description}</p>}
          <div className="gt-prog" aria-label={`${ready}/${book.pages.length} chương đã soạn`}><i style={{ width: `${(ready / Math.max(1, book.pages.length)) * 100}%` }} /></div>
          <ol>
            {book.pages.map((p) => (
              <li key={p.id}>
                <button type="button" aria-current={page?.idx === p.idx || undefined} className={p.status === "ready" ? "ok" : undefined} onClick={() => void openPage(book, p.idx)}>
                  <span className="n">{p.idx + 1}</span>
                  <span className="t">{p.title}</span>
                  {busy === `c${p.idx}` && <span className="spin" aria-label="đang viết" />}
                </button>
              </li>
            ))}
          </ol>
          {teacher && ready < book.pages.length && <Button variant="primary" size="sm" disabled={!!busy} icon="spark" onClick={() => void compileAll()}>{busy?.startsWith("c") ? "Đang biên soạn…" : "Soạn các chương còn lại"}</Button>}
        </nav>
        <article className="gt-body page-body" data-testid="book-page">
          {!page && (busy === "open" || busy === "page" ? <div className="gt-sk"><Skeleton w="60%" h={28} /><Skeleton h={14} /><Skeleton h={14} /><Skeleton w="80%" h={14} /></div> : <p className="gt-muted">Chọn một chương để đọc.</p>)}
          {page && page.status !== "ready" && (
            <div className="gt-draft">
              <span className="k">Chương {page.idx + 1}</span>
              <h2>{page.title}</h2>
              {page.summary && <p>{page.summary}</p>}
              <div className="gv-paper gt-ghostpage" aria-hidden="true"><div className="ln">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ width: `${[92, 80, 88, 60, 94, 76, 84, 70, 52][i]}%` }} />)}</div></div>
              {teacher && <Button variant="primary" disabled={!!busy} icon="spark" onClick={() => void compile(book, page.idx)}>{busy === `c${page.idx}` ? "AI đang viết…" : "Biên soạn chương này"}</Button>}
            </div>
          )}
          {page && page.status === "ready" && (
            <>
              <span className="gt-k">Chương {page.idx + 1}</span>
              <h2 className="gt-h">{page.title}</h2>
              {page.objectives.length > 0 && <div className="gt-obj"><b>Sau chương này em sẽ</b><ul>{page.objectives.map((o, i) => <li key={i}><MathText value={o} /></li>)}</ul></div>}
              {page.blocks.map((b, i) => <BlockView key={i} b={b} />)}
            </>
          )}
        </article>
        {page && page.status === "ready" ? (
          <aside className="gt-chat">
            <h3>Hỏi gia sư về trang này</h3>
            <ChatPanel compact ctx={{ kbId: book.kbId, bookPageId: page.id }} sessionId={sid} onSession={setSid} starters={["Giải thích lại đoạn này đơn giản hơn.", "Cho thêm một ví dụ đời thực."]} />
          </aside>
        ) : <div />}
      </div>
    </div>
  );
}
