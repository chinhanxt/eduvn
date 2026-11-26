import { useMemo, useState } from "react";
import { useFakeStream, useCountUp, usePhases } from "../kit";
import { Button } from "../../ui";
import { Icon } from "../../ui/Icon";
import { Head } from "./parts";

/** Workbench: GV chat để AI soạn cả khoá; AI gọi công cụ/skill (sáng dần trong hộp 45 công cụ · 24 skill), khung khoá dựng dần;
 *  công bố có link + QR + cài như app, nhân bản sang lớp khác, tour hướng dẫn. Ví dụ: TS. Khải, KTPM K23. */
const ASK = "Soạn khoá Python nhập môn 6 buổi cho KTPM K23. Mỗi buổi có bài giảng, bài tập tự chấm và quiz.";
const REPLY = "Được ạ. Tôi dựng 6 buổi theo giáo trình K23, mỗi buổi 1 bài giảng, 3 bài tập tự chấm, 1 quiz, và gắn sẵn Python chạy trong trình duyệt để SV làm ngay.";

const CALLS: { fn: string; label: string; lights: number[] }[] = [
  { fn: "doc_giao_trinh", label: "Đọc giáo trình K23 (212 trang)", lights: [2, 11, 50] },
  { fn: "tao_de_cuong", label: "Dựng đề cương 6 buổi", lights: [5, 47, 58] },
  { fn: "soan_bai_giang", label: "Soạn 6 bài giảng", lights: [8, 19, 26, 53] },
  { fn: "tao_bai_tap_tu_cham", label: "18 bài tập tự chấm", lights: [14, 31, 61] },
  { fn: "tao_quiz", label: "6 quiz, 60 câu", lights: [22, 37] },
  { fn: "gan_cong_cu", label: "Gắn Python trong trình duyệt", lights: [29, 66] },
  { fn: "tu_kiem", label: "Chạy thử 18 bài: 18/18 qua", lights: [40, 44, 64] },
];
const SESSIONS = ["Biến và kiểu dữ liệu", "Rẽ nhánh", "Vòng lặp", "Hàm", "Danh sách, từ điển", "Dự án: quản lý điểm"];
const N_TOOLS = 45;
const N_SKILLS = 24;
const TOUR = ["Chat để soạn: nói như với đồng nghiệp", "AI gọi công cụ, sáng dần ở đây", "Khung khoá: kéo để đổi thứ tự buổi"];

export function Workbench() {
  const [run, setRun] = useState(0);
  const p = usePhases([700, 1800, ...CALLS.map(() => 950)], true, run);
  const calls = Math.max(0, p - 2);
  const done = calls >= CALLS.length;
  const s = useFakeStream(REPLY, { run: p >= 1, key: run, cps: 70, delayMs: 200 });
  const [pub, setPub] = useState(false);
  const [clone, setClone] = useState(false);
  const [tour, setTour] = useState(-1);
  const lit = useMemo(() => new Set(CALLS.slice(0, calls).flatMap((c) => c.lights)), [calls]);
  const usedT = [...lit].filter((i) => i < N_TOOLS).length;
  const usedS = lit.size - usedT;
  const restart = () => {
    setPub(false);
    setClone(false);
    setRun((r) => r + 1);
  };

  return (
    <div className="page gl gl-wb">
      <Head title="Workbench" primary={done ? { label: pub ? "Đã công bố" : "Công bố", icon: pub ? "check" : "upload", onClick: () => setPub(true) } : undefined}>
        <Button size="sm" variant="ghost" icon="info" onClick={() => setTour(tour < 0 ? 0 : -1)}>
          Tour
        </Button>
        <Button size="sm" variant="ghost" icon="copy" onClick={() => setClone(true)} disabled={!done}>
          Nhân bản
        </Button>
      </Head>

      <div className="gl-wb-grid">
        <section className={tour === 0 ? "gl-wb-chat tour" : "gl-wb-chat"} aria-label="Trò chuyện soạn khoá">
          {tour === 0 && <TourTip i={0} onNext={() => setTour(1)} />}
          <div className="gl-bub me plain">
            <p>{ASK}</p>
          </div>
          {p >= 1 && (
            <div className="gl-wb-ai">
              <span className="gl-wb-ai-n"><Icon name="spark" size="sm" /> Trợ lý soạn khoá</span>
              <p className={s.state === "streaming" ? "caret" : undefined}>{s.text}</p>
              <ul className="gl-wb-calls">
                {CALLS.map((c, i) =>
                  i <= calls && p >= 2 ? (
                    <li key={c.fn} className={i < calls ? "ok" : "run"}>
                      <i>{i < calls ? <Icon name="check" size="sm" /> : <Icon name="loader" size="sm" className="gl-spin" />}</i>
                      <code>{c.fn}</code>
                      <span>{c.label}</span>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          )}
          <div className="gl-wb-input">
            <span>Nhắn tiếp: “thêm buổi ôn thi”, “đổi sang Java”…</span>
            <button type="button" aria-label="Gửi" onClick={restart}>
              <Icon name="refresh" size="sm" />
            </button>
          </div>
        </section>

        <section className="gl-wb-main">
          <div className={tour === 1 ? "gl-wb-box tour" : "gl-wb-box"} aria-label={`Đã dùng ${usedT} công cụ, ${usedS} skill`}>
            {tour === 1 && <TourTip i={1} onNext={() => setTour(2)} />}
            <div className="gl-wb-cells">
              {Array.from({ length: N_TOOLS + N_SKILLS }, (_, i) => (
                <i key={i} className={[i >= N_TOOLS && "sk", lit.has(i) && "on"].filter(Boolean).join(" ")} />
              ))}
            </div>
            <div className="gl-wb-box-l">
              <span><b className="num">{usedT}</b>/45 công cụ</span>
              <span className="sk"><b className="num">{usedS}</b>/24 skill</span>
            </div>
          </div>

          <div className={tour === 2 ? "gl-wb-course tour" : "gl-wb-course"}>
            {tour === 2 && <TourTip i={2} onNext={() => setTour(-1)} last />}
            <header>
              <span className="gl-eyebrow">KTPM K23 · TS. Khải</span>
              <h2>{p >= 3 ? "Python nhập môn" : <span className="gl-skel w40" />}</h2>
            </header>
            <ol className="gl-wb-sess">
              {SESSIONS.map((t, i) => (
                <li key={t} className={calls >= 2 ? "in" : undefined} style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className="gl-wb-no num">{i + 1}</span>
                  <b>{calls >= 2 ? t : <span className="gl-skel" />}</b>
                  <div className="gl-wb-items">
                    <Item on={calls >= 3} icon="slide" label="Bài giảng" d={i} />
                    <Item on={calls >= 4} icon="pen" label="3 bài tự chấm" d={i} />
                    <Item on={calls >= 5} icon="exam" label="Quiz" d={i} />
                    <Item on={calls >= 6} icon="cmd" label="Python" d={i} />
                  </div>
                  {calls >= 7 && <span className="gl-wb-ok"><Icon name="check" size="sm" /></span>}
                </li>
              ))}
            </ol>
          </div>

          {(pub || clone) && (
            <div className="gl-wb-out">
              {pub && <Publish />}
              {clone && (
                <div className="gl-wb-clone">
                  <span className="gl-eyebrow">Nhân bản</span>
                  <div className="gl-wb-clone-row">
                    {["KTPM K23", "KTPM K24", "HTTT K23"].map((c, i) => (
                      <span key={c} className={i ? "fly" : "src"} style={{ animationDelay: `${i * 220}ms` }}>
                        {c}
                      </span>
                    ))}
                  </div>
                  <small>Giữ nội dung, đổi lớp và lịch. Bài tập tự chấm theo lớp mới.</small>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Item({ on, icon, label, d }: { on: boolean; icon: string; label: string; d: number }) {
  return (
    <span className={on ? "gl-wb-it on" : "gl-wb-it"} style={{ transitionDelay: `${d * 60}ms` }}>
      <Icon name={icon} size="sm" />
      {label}
    </span>
  );
}

function TourTip({ i, onNext, last }: { i: number; onNext: () => void; last?: boolean }) {
  return (
    <div className="gl-tour" role="dialog" aria-label="Hướng dẫn">
      <span className="num">{i + 1}/3</span>
      <p>{TOUR[i]}</p>
      <button type="button" onClick={onNext}>{last ? "Xong" : "Tiếp"}</button>
    </div>
  );
}

/** Công bố: link + QR + cài như app (PWA) lên điện thoại SV. */
function Publish() {
  const inst = useCountUp(1, 2400);
  const qr = useMemo(() => {
    let x = 7;
    return Array.from({ length: 21 * 21 }, (_, i) => {
      const r = Math.floor(i / 21), c = i % 21;
      const finder = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7);
      if (finder) {
        const rr = r > 13 ? r - 14 : r, cc = c > 13 ? c - 14 : c;
        return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr > 1 && rr < 5 && cc > 1 && cc < 5);
      }
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x % 100 < 47;
    });
  }, []);
  return (
    <div className="gl-wb-pub">
      <svg viewBox="0 0 21 21" className="gl-qr" aria-label="Mã QR mở khoá học">
        {qr.map((on, i) => (on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1.02" height="1.02" /> : null))}
      </svg>
      <div className="gl-wb-link">
        <span className="gl-eyebrow">Đã công bố</span>
        <b>eduvn.vn/k/python-k23</b>
        <small>56 SV · mở được khi mạng yếu</small>
      </div>
      <div className="gl-phone" aria-label="Cài như ứng dụng">
        <div className="gl-phone-app">
          <span className="gl-phone-ic">Py</span>
          <small>Python K23</small>
          <i style={{ width: `${inst * 100}%` }} />
        </div>
        <span>{inst > 0.98 ? "Đã cài như app" : "Đang cài…"}</span>
      </div>
    </div>
  );
}
