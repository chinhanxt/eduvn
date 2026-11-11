// web/src/solution/SolutionLibrary.tsx — thư viện lời giải công khai /loi-giai (không cần đăng nhập): lọc chủ đề, tìm theo đề,
// lượt xem, phân trang; URL là trạng thái (?chu-de=…&q=…&trang=2). Chi tiết /loi-giai/:slug: trình xem đầy đủ, chia sẻ, thẻ meta/OG.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { errText } from "../api";
import { useAuth } from "../auth";
import { type PublicList, type PublicSolution, publicList, publicSolution, staffHint } from "./api";
import { texToText } from "./context";
import { ensureFonts } from "./fonts";
import { TexText } from "./Rich";
import { copyText, shareUrl, useToast } from "./SolutionDialog";
import { SolIcon, SolutionViewer, asTex } from "./SolutionViewer";
import { STATUS_TEXT, type VerifyStatus } from "./types";
import "./solution.css";

const vnNum = (n: number) => n.toLocaleString("vi-VN");
const plain = texToText;

function Top() {
  return (
    <header className="sol-lib-top">
      <div>
        <Link to="/loi-giai" className="sol-brand">
          <i aria-hidden="true">E</i>
          EDUVN <span>· Thư viện lời giải</span>
        </Link>
        <span className="sol-sp" />
        <Link to="/" className="sol-btn sm ghost">Vào EDUVN</Link>
      </div>
    </header>
  );
}

function Mini({ s }: { s: VerifyStatus }) {
  return (
    <span className={`sol-mini sol-${s}`}>
      <SolIcon d={s === "verified" ? "check" : s === "mismatch" ? "alert" : "help"} />
      {STATUS_TEXT[s]}
    </span>
  );
}

/** Đặt tiêu đề + thẻ meta/OG (Google chạy JS đọc được; máy quét mạng xã hội dùng trang /chia-se/loi-giai/:slug của máy chủ). */
function useMeta(title: string, desc: string, url?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    const set = (attr: "name" | "property", key: string, val: string) => {
      let m = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute(attr, key);
        m.dataset.sol = "1";
        document.head.appendChild(m);
      }
      m.content = val;
    };
    set("name", "description", desc);
    set("property", "og:title", title);
    set("property", "og:description", desc);
    set("property", "og:type", "article");
    if (url) set("property", "og:url", url);
    return () => {
      document.title = prev;
      for (const m of document.head.querySelectorAll("meta[data-sol]")) m.remove();
    };
  }, [title, desc, url]);
}

export function SolutionLibrary() {
  useEffect(ensureFonts, []);
  const [sp, setSp] = useSearchParams();
  const topic = sp.get("chu-de") ?? "";
  const q = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("trang")) || 1);
  const [data, setData] = useState<PublicList | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [term, setTerm] = useState(q);
  const debounce = useRef(0);
  useMeta("Thư viện lời giải từng bước — EDUVN", "Lời giải Toán từng bước có hình minh hoạ đồng bộ và đáp số đã được phần mềm tự kiểm lại. Lọc theo chủ đề, tìm theo đề bài.");

  useEffect(() => {
    const ac = { stop: false };
    setLoading(true);
    publicList({ topic: topic || undefined, q: q || undefined, page })
      .then((d) => !ac.stop && (setData(d), setErr(null)))
      .catch((e: unknown) => !ac.stop && setErr(errText(e)))
      .finally(() => !ac.stop && setLoading(false));
    return () => void (ac.stop = true);
  }, [topic, q, page]);

  const patch = (next: Record<string, string | null>, push = false) => {
    const p = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(next)) v ? p.set(k, v) : p.delete(k);
    if (!("trang" in next)) p.delete("trang");
    setSp(p, { replace: !push });
  };
  const onTerm = (v: string) => {
    setTerm(v);
    clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => patch({ q: v.trim() || null }), 300);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    clearTimeout(debounce.current);
    patch({ q: term.trim() || null });
  };

  const items = data?.items ?? [];
  const first = !data && loading;
  return (
    <div className="sol-scope sol-hoc sol-lib">
      <Top />
      <main className="sol-lib-main">
        <section className="sol-lib-hero">
          <div className="sol-eyebrow">Thư viện mở</div>
          <h1>Lời giải từng bước</h1>
          <p>Mỗi bài chia thành vài bước ngắn, hình minh hoạ đổi theo từng bước, và đáp số được phần mềm tự đo lại trên hình hoặc thế lại vào đề.</p>
          <form className="sol-search" role="search" onSubmit={submit}>
            <SolIcon d="search" />
            <input value={term} onChange={(e) => onTerm(e.target.value)} placeholder="Tìm theo đề bài, ví dụ: khoảng cách, tích phân, xác suất…" aria-label="Tìm lời giải theo đề" data-testid="lib-search" />
            {term && <button type="button" className="sol-icon-btn" aria-label="Xoá tìm kiếm" onClick={() => onTerm("")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button>}
          </form>
        </section>
        {data && data.topics.length > 0 && (
          <div className="sol-chips" role="group" aria-label="Lọc theo chủ đề">
            <button type="button" className="sol-chip" aria-pressed={!topic} onClick={() => patch({ "chu-de": null })}>Tất cả</button>
            {data.topics.map((t) => (
              <button key={t.topic} type="button" className="sol-chip" aria-pressed={topic === t.topic} onClick={() => patch({ "chu-de": topic === t.topic ? null : t.topic })}>
                {t.topic} <small>{t.n}</small>
              </button>
            ))}
          </div>
        )}
        {err && <p className="sol-err">{err}</p>}
        {first ? (
          <ul className="sol-cards" aria-busy="true" aria-label="Đang tải">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="sol-card sk"><div style={{ padding: "20px 0" }}><span className="sol-skel-line w40" /><span className="sol-skel-line" /><span className="sol-skel-line w80" /></div></li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="sol-empty">
            <p>{q || topic ? "Không thấy lời giải khớp bộ lọc." : "Chưa có lời giải nào được chia sẻ."}</p>
            {(q || topic) && <button type="button" className="sol-btn" onClick={() => (setTerm(""), setSp(new URLSearchParams(), { replace: true }))}>Bỏ lọc</button>}
          </div>
        ) : (
          <ul className={`sol-cards${loading ? " stale" : ""}`} data-testid="lib-list">
            {items.map((it) => (
              <li key={it.slug} className="sol-card">
                <Link to={`/loi-giai/${it.slug}`} viewTransition>
                  <div className="sol-card-meta">
                    <span className="t">{it.topic || it.subject}</span>
                    <span>{vnNum(it.views)} lượt xem</span>
                  </div>
                  <h2><TexText value={it.problem} /></h2>
                  <div className="sol-card-foot">
                    <span className="ans">Đáp số: <TexText value={asTex(it.answer)} /></span>
                    <Mini s={it.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data && (page > 1 || items.length === 20) && (
          <nav className="sol-pager" aria-label="Phân trang">
            <button type="button" className="sol-btn sm" disabled={page <= 1} onClick={() => patch({ trang: page > 2 ? String(page - 1) : null }, true)}>← Trang trước</button>
            <span>Trang {page}</span>
            <button type="button" className="sol-btn sm" disabled={items.length < 20} onClick={() => patch({ trang: String(page + 1) }, true)}>Trang sau →</button>
          </nav>
        )}
      </main>
    </div>
  );
}

export function SolutionPublicPage() {
  useEffect(ensureFonts, []);
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [d, setD] = useState<PublicSolution | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => {
    setD(null);
    publicSolution(slug).then(setD).catch((e: unknown) => setErr(errText(e)));
  }, [slug]);
  const title = d ? `Lời giải: ${plain(d.solution.problem).slice(0, 80)} — EDUVN` : "Lời giải — EDUVN";
  const desc = d ? `${d.topic ? `${d.topic} · ` : ""}${d.solution.steps.length} bước, đáp số ${plain(d.solution.answer).slice(0, 60)}${d.solution.verification.status === "verified" ? " — đã kiểm đáp số" : ""}.` : "";
  useMeta(title, desc, d ? `${location.origin}/loi-giai/${slug}` : undefined);

  const share = async () => {
    const url = shareUrl(slug);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // người dùng huỷ → sao chép
      }
    }
    toast.show((await copyText(url)) ? "Đã sao chép link chia sẻ" : url);
  };

  return (
    <div className="sol-scope sol-hoc sol-lib">
      <Top />
      <main className="sol-lib-main">
        <Link to="/loi-giai" className="sol-crumb" viewTransition><SolIcon d="left" />Thư viện lời giải</Link>
        {err ? (
          <div className="sol-empty">
            <p>{err}</p>
            <Link to="/loi-giai" className="sol-btn">Về thư viện</Link>
          </div>
        ) : !d ? (
          <div aria-busy="true" aria-label="Đang tải lời giải">
            <span className="sol-skel-line w40" />
            <span className="sol-skel-line" style={{ height: 20 }} />
            <span className="sol-skel-line w80" style={{ height: 20, marginBottom: 40 }} />
            <div className="sol-grid"><div className="sol-fig-box"><div className="sol-fig-skel" /></div><div><span className="sol-skel-line w40" /><span className="sol-skel-line" /><span className="sol-skel-line w80" /><span className="sol-skel-line w40" /><span className="sol-skel-line" /></div></div>
          </div>
        ) : (
          <article>
            <SolutionViewer
              solution={{ ...d.solution, topic: d.topic }}
              eyebrow={d.subject}
              ask={user ? staffHint : null}
              onAskUnavailable={() => nav("/")}
              actions={
                <>
                  <span className="sol-card-meta"><SolIcon d="eye" />{vnNum(d.views)} lượt xem</span>
                  <button type="button" className="sol-btn sm" onClick={() => void share()} data-testid="sol-share">Chia sẻ</button>
                </>
              }
            />
            <footer className="sol-detail-foot">
              <span>Lời giải do giáo viên trên EDUVN chia sẻ, soạn cùng AI.</span>
              <span>Đáp số {d.solution.verification.status === "verified" ? "đã được phần mềm đo/tính lại và khớp" : d.solution.verification.status === "mismatch" ? "lệch với số đo của phần mềm — đọc kỹ" : "chưa kiểm được tự động"}.</span>
            </footer>
          </article>
        )}
      </main>
      {toast.node}
    </div>
  );
}
