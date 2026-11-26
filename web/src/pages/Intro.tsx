import { useEffect, useRef, useState } from "react";
import { Icon } from "./Login";
import "./intro.css";

const IMG = "/gioi-thieu/";
const TRY = "/dang-nhap";
const MAIL = "mailto:lienhe@eduvn.vn?subject=EDUVN%20cho%20tr%C6%B0%E1%BB%9Dng";

const ROLES = [
  { id: "giao-vien", to: "/gv", k: "gv", name: "Giáo viên", say: "Soạn bài, chấm bài, giấy tờ" },
  { id: "hoc-sinh", to: "/hoc", k: "hs", name: "Học sinh", say: "Gia sư AI, hồ sơ học tập" },
  { id: "phu-huynh", to: "/phu-huynh", k: "ph", name: "Phụ huynh", say: "Biết con học ra sao mỗi ngày" },
  { id: "nha-truong", to: "/truong", k: "tr", name: "Nhà trường", say: "Bức tranh toàn trường" },
] as const;

const TRUST = [
  { i: "book", t: "Theo chương trình GDPT 2018" },
  { i: "clip", t: "CV 7991 · CV 5512" },
  { i: "lock", t: "Dữ liệu học sinh lưu tại trường" },
  { i: "cap", t: "Mọi môn · lớp 6 đến đại học" },
];

type Shot = { src: string; w: number; h: number; alt: string };
const SOLUTIONS: { k: string; id: string; to: string; role: string; title: string; points: string[]; link: string; shots: Shot[] }[] = [
  {
    k: "gv", id: "giao-vien", to: "/gv", role: "Giáo viên", link: "Cổng giáo viên",
    title: "Soạn bài 25 phút. Chấm cả lớp 3 phút.",
    points: ["Một câu yêu cầu thành dàn ý, slide và lời giảng", "Chụp phiếu hoặc bài viết tay, AI chấm, thầy cô duyệt"],
    shots: [
      { src: "soan-bai.webp", w: 1200, h: 828, alt: "Màn Tạo bài giảng: AI lập dàn ý 5 phần cho bài Bất phương trình bậc hai" },
      { src: "cham-phieu.webp", w: 600, h: 382, alt: "Chấm phiếu trả lời bằng ảnh chụp, ra điểm 8,5" },
    ],
  },
  {
    k: "hs", id: "hoc-sinh", to: "/hoc", role: "Học sinh", link: "Cổng học sinh",
    title: "Gia sư hiểu từng em.",
    points: ["Hồ sơ AI biết em mạnh, yếu và hay sai ở đâu", "Cùng một câu hỏi, mỗi em một cách giảng"],
    shots: [{ src: "ho-so.webp", w: 1200, h: 810, alt: "Hồ sơ AI của học sinh: biểu đồ năng lực 7 môn và các lỗi hay gặp" }],
  },
  {
    k: "ph", id: "phu-huynh", to: "/phu-huynh", role: "Phụ huynh", link: "Cổng phụ huynh",
    title: "Một màn hình. Một nút Nghe.",
    points: ["Biết ngay hôm nay con ổn hay cần để ý", "Bấm Nghe thay vì đọc báo cáo dài"],
    shots: [
      { src: "phu-huynh.webp", w: 560, h: 1212, alt: "Màn phụ huynh: Khánh Duy hôm nay cần để ý, có nút Nghe" },
      { src: "phu-huynh-tuan.webp", w: 560, h: 1212, alt: "Tuần này của con: 3 ngày tốt, 3 tối ngủ muộn" },
    ],
  },
  {
    k: "tr", id: "nha-truong", to: "/truong", role: "Nhà trường", link: "Cổng nhà trường",
    title: "Cả trường trên một trang. Cảnh báo từ sớm.",
    points: ["Bản đồ điểm theo lớp và theo môn", "AI chỉ ra lớp đang tụt và đề xuất tổ chuyên môn vào cuộc"],
    shots: [{ src: "toan-truong.webp", w: 1200, h: 844, alt: "Màn Toàn trường: bản đồ điểm các lớp và cảnh báo sớm lớp 11A3" }],
  },
];

const STEPS = [
  { t: "Phát hiện", d: "Sau mỗi bài làm, AI chỉ ra em nào hổng ở đâu.", src: "b-phat-hien.webp", alt: "Trợ lý lớp: sáng nay 10A1 có 3 em cần giúp" },
  { t: "Cá nhân hoá", d: "Mỗi em nhận bài và cách giảng vừa sức mình.", src: "b-ca-nhan.webp", alt: "Gia sư giảng cùng một bài theo hai cách cho hai em" },
  { t: "Báo đúng người", d: "Giáo viên, phụ huynh, tổ chuyên môn nhận đúng việc.", src: "b-bao.webp", alt: "Cảnh báo lớp 11A3 tụt điểm Ngữ văn, giao tổ Văn" },
];

const FOOT = [
  { h: "Giới thiệu", l: [["Cách hoạt động", "#cach-hoat-dong"], ["Hiệu quả", "#hieu-qua"], ["Cam kết dữ liệu", "#cam-ket"]] },
  { h: "Giải pháp", l: ROLES.map((r) => [r.name, `#${r.id}`]) },
  { h: "Tài nguyên", l: [["Thư viện lời giải", "/loi-giai"], ["Đấu trường", "/choi"], ["Vào lớp bằng mã", "/hoc/bai-tap"]] },
  { h: "Liên hệ", l: [["lienhe@eduvn.vn", MAIL], ["Đăng ký cho trường", "#lien-he"], ["Đăng nhập", "/dang-nhap"]] },
];

const Img = ({ s, eager }: { s: Shot; eager?: boolean }) => (
  <img src={IMG + s.src} width={s.w} height={s.h} alt={s.alt} decoding="async" loading={eager ? "eager" : "lazy"} />
);

/** Hiện dần khi cuộn tới (CSS lo phần reduced-motion). */
function useReveal(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -8% 0px" },
    );
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    el.classList.add("rv-on");
    return () => io.disconnect();
  }, [root]);
}

/** Trang gốc cho khách: giới thiệu EDUVN như website một tổ chức giáo dục, hình là ảnh chụp sản phẩm thật. */
export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [stuck, setStuck] = useState(false);
  useReveal(root);
  useEffect(() => {
    document.title = "EDUVN · Nền tảng dạy và học có AI cho nhà trường";
    const on = () => setStuck(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const close = () => setMenu(false);

  return (
    <div className="itr" ref={root}>
      <header className={stuck || menu ? "itr-top stuck" : "itr-top"}>
        <div className="itr-bar">
          <a className="itr-brand" href="/" aria-label="EDUVN, trang chủ"><span className="itr-mark"><Icon name="cap" /></span>EDUVN</a>
          <nav className="itr-nav" aria-label="Trang công khai">
            <div className="itr-dd">
              <a href="#giai-phap" className="itr-nl">Giải pháp<Icon name="chev" size="sm" /></a>
              <div className="itr-menu">
                {ROLES.map((r) => (
                  <a key={r.k} href={`#${r.id}`} className={`r-${r.k}`}><b>{r.name}</b><span>{r.say}</span></a>
                ))}
              </div>
            </div>
            <a className="itr-nl" href="/loi-giai">Thư viện lời giải</a>
            <a className="itr-nl" href="/choi">Đấu trường</a>
            <a className="itr-nl" href="#lien-he">Liên hệ</a>
          </nav>
          <div className="itr-cta">
            <a className="itr-login" href="/dang-nhap">Đăng nhập</a>
            <a className="itr-btn" href={TRY}>Dùng thử miễn phí</a>
            <button type="button" className="itr-burger" aria-expanded={menu} aria-controls="itr-mnav" aria-label={menu ? "Đóng menu" : "Mở menu"} onClick={() => setMenu(!menu)}>
              <Icon name={menu ? "x" : "menu"} />
            </button>
          </div>
        </div>
        {menu && (
          <nav id="itr-mnav" className="itr-mnav" aria-label="Menu">
            <span className="itr-mh">Giải pháp</span>
            {ROLES.map((r) => <a key={r.k} href={`#${r.id}`} onClick={close}>{r.name}</a>)}
            <span className="itr-mh">Khám phá</span>
            <a href="/loi-giai">Thư viện lời giải</a>
            <a href="/choi">Đấu trường</a>
            <a href="#lien-he" onClick={close}>Liên hệ</a>
            <a className="itr-btn" href={TRY}>Dùng thử miễn phí</a>
          </nav>
        )}
      </header>

      <main>
        <section className="itr-hero">
          <div className="itr-hero-t">
            <p className="itr-eye">Nền tảng dạy và học cho trường phổ thông và đại học</p>
            <h1>Dạy và học có AI, <span>cho cả nhà trường.</span></h1>
            <p className="itr-lead">Giáo viên soạn và chấm nhanh hơn. Mỗi học sinh được kèm đúng chỗ còn hổng. Phụ huynh và ban giám hiệu nắm tình hình mỗi ngày.</p>
            <div className="itr-acts">
              <a className="itr-btn lg" href={TRY}>Dùng thử miễn phí</a>
              <a className="itr-btn ghost lg" href="#lien-he">Đăng ký cho trường</a>
            </div>
            <a className="itr-code" href="/hoc/bai-tap">Học sinh vào lớp bằng mã<Icon name="right" size="sm" /></a>
          </div>
          <div className="itr-devices" aria-label="Ảnh chụp EDUVN: màn Hôm nay của giáo viên và màn của phụ huynh" role="img">
            <div className="itr-laptop">
              <div className="itr-screen">
                <img src={IMG + "hom-nay-gv.webp"} width={1440} height={900} alt="" fetchPriority="high" decoding="async" />
              </div>
              <div className="itr-base" />
            </div>
            <div className="itr-phone">
              <img src={IMG + "phu-huynh.webp"} width={560} height={1212} alt="" decoding="async" />
            </div>
          </div>
        </section>

        <section className="itr-trust" id="cam-ket" aria-label="Cam kết">
          {TRUST.map((t) => <div key={t.t}><Icon name={t.i} />{t.t}</div>)}
        </section>

        <section className="itr-sec" id="giai-phap" aria-labelledby="gp-h">
          <header className="itr-head rv">
            <p className="itr-eye">Giải pháp</p>
            <h2 id="gp-h">Mỗi người trong trường một công cụ vừa tay.</h2>
          </header>
          {SOLUTIONS.map((s, i) => (
            <article key={s.k} id={s.id} className={`itr-sol s-${s.k}${i % 2 ? " flip" : ""}`}>
              <div className="itr-sol-t rv">
                <p className="itr-role">{s.role}</p>
                <h3>{s.title.split(/(?<=\.) /).map((t) => <span key={t}>{t} </span>)}</h3>
                <ul>{s.points.map((p) => <li key={p}><Icon name="check" size="sm" />{p}</li>)}</ul>
                <a className="itr-more" href={s.to}>{s.link}<Icon name="right" size="sm" /></a>
              </div>
              <div className={`itr-sol-art rv a-${s.k}`}>
                {s.shots.map((sh, j) => <figure key={sh.src} className={`itr-shot n${j}`}><Img s={sh} /></figure>)}
              </div>
            </article>
          ))}
        </section>

        <section className="itr-sec itr-how" id="cach-hoat-dong" aria-labelledby="how-h">
          <header className="itr-head rv">
            <p className="itr-eye">Cách hoạt động</p>
            <h2 id="how-h">Một vòng lặp chạy sau mỗi bài làm.</h2>
          </header>
          <ol className="itr-steps">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rv" style={{ ["--i" as string]: i }}>
                <figure className="itr-shot"><img src={IMG + s.src} width={800} height={600} alt={s.alt} loading="lazy" decoding="async" /></figure>
                <div className="itr-step-n"><span>{String(i + 1).padStart(2, "0")}</span>{i < STEPS.length - 1 && <><i /><Icon name="arrowr" size="sm" /></>}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="itr-sec itr-impact" id="hieu-qua" aria-labelledby="hq-h">
          <h2 id="hq-h" className="itr-eye rv">Thời gian trả lại cho giáo viên</h2>
          <div className="itr-nums">
            <div className="rv"><b>3 giờ<Icon name="arrowr" />25 phút</b><span>soạn một bài giảng</span></div>
            <div className="rv"><b>2 giờ<Icon name="arrowr" />3 phút</b><span>chấm 40 bài kiểm tra</span></div>
          </div>
        </section>

        <section className="itr-final rv" id="lien-he" aria-labelledby="lh-h">
          <h2 id="lh-h">Đưa EDUVN về trường của bạn.</h2>
          <p>Dùng thử miễn phí cho một tổ chuyên môn. Dữ liệu học sinh lưu tại trường.</p>
          <div className="itr-acts">
            <a className="itr-btn inv lg" href={TRY}>Dùng thử miễn phí</a>
            <a className="itr-btn line lg" href={MAIL}><Icon name="mail" size="sm" />Liên hệ tư vấn</a>
          </div>
        </section>
      </main>

      <footer className="itr-foot">
        <div className="itr-foot-g">
          <div className="itr-foot-b">
            <a className="itr-brand" href="/"><span className="itr-mark"><Icon name="cap" /></span>EDUVN</a>
            <p>Nền tảng dạy và học có AI theo chương trình GDPT 2018, cho trường phổ thông và đại học.</p>
          </div>
          {FOOT.map((c) => (
            <nav key={c.h} aria-label={c.h}>
              <h2>{c.h}</h2>
              {c.l.map(([t, h]) => <a key={t} href={h}>{t}</a>)}
            </nav>
          ))}
        </div>
        <div className="itr-foot-l">
          <span>© {new Date().getFullYear()} EDUVN. Bảo lưu mọi quyền.</span>
          <a href="#cam-ket">Chính sách bảo mật</a>
        </div>
      </footer>
    </div>
  );
}
