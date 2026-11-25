/** /gv/infographic — biến nội dung bài thành infographic (mô phỏng). Dùng thật @antv/infographic (MIT) với theme "Giấy học thuật" EDUVN; cú pháp do "AI" stream ra và vẽ dần. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../ui/components/Button";
import { Icon } from "../../ui/Icon";
import { useFakeStream } from "../kit";
import { Head } from "./common";

type Infographic = import("@antv/infographic").Infographic;

/** Bài nguồn: Lịch sử 12 (cô Phương, 12A1). Mỗi câu ứng với một mục AI rút ra. */
const SOURCE = [
  { t: "Ngày 20/11/1953, Pháp cho quân nhảy dù chiếm đóng Điện Biên Phủ, xây dựng thành tập đoàn cứ điểm mạnh nhất Đông Dương.", k: "20/11/1953" },
  { t: "Ngày 6/12/1953, Bộ Chính trị quyết định mở chiến dịch Điện Biên Phủ.", k: "6/12/1953" },
  { t: "Chiều 13/3/1954, quân ta nổ súng tấn công cứ điểm Him Lam, mở đầu đợt 1.", k: "13/3/1954" },
  { t: "Từ 30/3, đợt 2 đánh chiếm các cao điểm phía đông, siết chặt vòng vây.", k: "30/3/1954" },
  { t: "Ngày 1/5, đợt 3 tổng công kích các cứ điểm còn lại.", k: "1/5/1954" },
  { t: "17 giờ 30 ngày 7/5/1954, tướng Đờ Cát-xtơ-ri cùng bộ chỉ huy bị bắt sống. Chiến dịch toàn thắng.", k: "7/5/1954" },
];
const ITEMS = [
  { label: "20/11/1953", desc: "Pháp nhảy dù chiếm Điện Biên Phủ" },
  { label: "6/12/1953", desc: "Quyết định mở chiến dịch" },
  { label: "13/3/1954", desc: "Đợt 1 · Him Lam" },
  { label: "30/3/1954", desc: "Đợt 2 · cao điểm phía đông" },
  { label: "1/5/1954", desc: "Đợt 3 · tổng công kích" },
  { label: "7/5/1954", desc: "Toàn thắng" },
];
const MEANING = [
  { label: "Đập tan kế hoạch Na-va", desc: "Xoay chuyển cục diện chiến tranh" },
  { label: "Hiệp định Giơ-ne-vơ", desc: "Kí ngày 21/7/1954" },
  { label: "Miền Bắc giải phóng", desc: "Bước vào xây dựng hoà bình" },
  { label: "Cổ vũ thế giới", desc: "Phong trào giải phóng dân tộc" },
];
const WAVES = [
  { label: "Đợt 1", desc: "13/3 – 17/3 · Him Lam, Độc Lập" },
  { label: "Đợt 2", desc: "30/3 – 30/4 · cao điểm phía đông" },
  { label: "Đợt 3", desc: "1/5 – 7/5 · tổng công kích" },
];

type Layout = "timeline" | "roadmap" | "steps" | "pyramid";
const LAYOUTS: { id: Layout; name: string; tpl: string; key: "sequences" | "lists"; title: string; items: { label: string; desc: string }[] }[] = [
  { id: "timeline", name: "Dòng thời gian", tpl: "sequence-horizontal-zigzag-simple", key: "sequences", title: "Chiến dịch Điện Biên Phủ", items: ITEMS },
  { id: "roadmap", name: "Lộ trình", tpl: "sequence-roadmap-vertical-simple", key: "sequences", title: "56 ngày đêm", items: ITEMS },
  { id: "steps", name: "Ba đợt", tpl: "sequence-ascending-steps", key: "sequences", title: "Ba đợt tấn công", items: WAVES },
  { id: "pyramid", name: "Ý nghĩa", tpl: "sequence-pyramid-simple", key: "sequences", title: "Ý nghĩa lịch sử", items: MEANING },
];

const PALETTE = ["#2F5D8A", "#0B7285", "#2B7A3B", "#6F42C1", "#B8336A", "#8A6200"];

/** Cú pháp infographic như AI viết ra (dòng thụt lề, stream được). */
function syntaxOf(l: (typeof LAYOUTS)[number]) {
  const rows = l.items.map((it) => `    - label ${it.label}\n      desc ${it.desc}`).join("\n");
  return `infographic ${l.tpl}\ntheme eduvn\n  palette ${PALETTE.join(" ")}\ndata\n  title ${l.title}\n  ${l.key}\n${rows}\n`;
}

/** Theme "Giấy học thuật": nền trắng ngà, mực đậm, trục xanh học thuật, bảng màu vật thể đã kiểm mù màu. Không dùng cam. */
let themed = false;
async function loadLib() {
  const m = await import("@antv/infographic");
  if (!themed) {
    // Không tải phông Trung Quốc từ CDN của thư viện: dùng phông sẵn có của EDUVN (Inter, Source Serif 4).
    for (const f of m.getFonts()) f.fontWeight = {};
    m.setDefaultFont("Inter");
    m.registerTheme("eduvn", {
      colorBg: "#FDFCF9",
      colorPrimary: "#2F5D8A",
      palette: PALETTE,
      base: { text: { "font-family": "Inter, 'Be Vietnam Pro', sans-serif", fill: "#1C1B1A" } },
      title: { fill: "#1C1B1A" },
      desc: { fill: "#6b665e" },
      item: { label: { fill: "#1C1B1A" }, desc: { fill: "#4a463f" } },
    });
    themed = true;
  }
  return m;
}

export function InfographicPage() {
  const [layout, setLayout] = useState<Layout>("timeline");
  const [run, setRun] = useState(0);
  const L = LAYOUTS.find((x) => x.id === layout)!;
  const full = useMemo(() => syntaxOf(L), [L]);
  const s = useFakeStream(full, { run: run > 0, cps: 95, delayMs: 300, key: `${layout}${run}` });
  const text = run > 0 ? s.text : full;
  const box = useRef<HTMLDivElement>(null);
  const ig = useRef<Infographic | null>(null);
  const last = useRef(0);
  const vb = useRef<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [use, setUse] = useState<string[]>(["Slide"]);

  const probe = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    let alive = true;
    let mo: MutationObserver | null = null;
    loadLib()
      .then(async (m) => {
        if (!alive || !box.current || !probe.current) return;
        // Đo khung nhìn của bản hoàn chỉnh từng kiểu (ẩn), để lúc stream hình không co giãn.
        const p = new m.Infographic({ container: probe.current, width: "100%", height: "100%" });
        for (const l of LAYOUTS) {
          p.render(syntaxOf(l));
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          vb.current[l.id] = probe.current.querySelector("svg")?.getAttribute("viewBox") ?? "";
        }
        p.destroy();
        if (!alive) return;
        ig.current = new m.Infographic({ container: box.current, width: "100%", height: "100%" });
        mo = new MutationObserver(() => {
          const svg = box.current?.querySelector("svg");
          const want = vb.current[layoutRef.current];
          if (svg && want && svg.getAttribute("viewBox") !== want) svg.setAttribute("viewBox", want);
        });
        mo.observe(box.current, { subtree: true, childList: true, attributes: true, attributeFilter: ["viewBox"] });
        setReady(true);
      })
      .catch((e: unknown) => setErr(String(e)));
    return () => {
      alive = false;
      mo?.disconnect();
      ig.current?.destroy();
      ig.current = null;
    };
  }, []);

  // Vẽ lại theo chữ đang stream (tối đa ~8 lần/giây), lần cuối luôn vẽ.
  useEffect(() => {
    if (!ready || !ig.current) return;
    const now = performance.now();
    const final = run === 0 || s.state !== "streaming";
    if (!final && now - last.current < 120) return;
    last.current = now;
    try {
      ig.current.render(text);
    } catch {
      /* cú pháp dở dang khi đang stream: bỏ qua khung này */
    }
  }, [text, ready, run, s.state]);

  const going = run > 0 && s.state === "streaming";
  const found = (k: string) => text.includes(k);
  const download = () => {
    const svg = box.current?.querySelector("svg");
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `infographic-${layout}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head title="Infographic" primary={{ label: "Tạo từ bài", icon: "spark", onClick: () => setRun((r) => r + 1) }}>
        <Button size="sm" variant="ghost" icon="down" onClick={download}>
          SVG
        </Button>
      </Head>
      <div className="gs-ig">
        <article className="gs-ig-src" aria-label="Nội dung bài">
          <span className="eyebrow">Lịch sử 12 · Bài 8</span>
          <h2>Chiến dịch Điện Biên Phủ</h2>
          {SOURCE.map((p) => (
            <p key={p.k} className={run > 0 && layout !== "pyramid" && found(p.k) ? "hit" : undefined}>{p.t}</p>
          ))}
        </article>
        <section className="gs-ig-main">
          <div className="gs-ig-lay" role="radiogroup" aria-label="Kiểu infographic">
            {LAYOUTS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={layout === l.id} onClick={() => setLayout(l.id)}>
                <Glyph id={l.id} />
                {l.name}
              </button>
            ))}
            {going && <span className="gs-st-status"><i className="gs-scan" />AI đang vẽ</span>}
          </div>
          <div className="gs-ig-canvas">
            <div ref={box} className="gs-ig-box" />
            <div ref={probe} className="gs-ig-box gs-ig-probe" aria-hidden="true" />
            {!ready && !err && <div className="gs-ig-wait"><i className="gs-scan" /></div>}
            {err && <p className="gs-meta">{err}</p>}
          </div>
          <div className="gs-ig-use">
            <span className="gs-meta">Gắn vào</span>
            {["Slide", "Gia sư", "Báo cáo", "Tin phụ huynh"].map((u) => (
              <button key={u} type="button" className="chip" aria-pressed={use.includes(u)} onClick={() => setUse((x) => (x.includes(u) ? x.filter((y) => y !== u) : [...x, u]))}>
                {use.includes(u) && <Icon name="check" size="sm" />}
                {u}
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/** Biểu tượng nhỏ cho từng kiểu bố cục. */
function Glyph({ id }: { id: Layout }) {
  const p = {
    timeline: "M2 9h16M5 9v-3M10 9v3M15 9v-3",
    roadmap: "M10 2v16M10 5h5M10 10h-5M10 15h5",
    steps: "M2 15h5v-4h5v-4h6",
    pyramid: "M10 3l7 13H3z M6 11h8",
  }[id];
  return (
    <svg viewBox="0 0 20 18" width={18} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={p} />
    </svg>
  );
}
