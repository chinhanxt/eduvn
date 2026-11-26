import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Icon } from "../../ui/Icon";
import { FOR_LESSON, type Level, SRC, type Src, SUBJECT_COLOR, SUBJECTS, subjectGroup, type Tool, TOOLS, TOTAL_TOOLS } from "./khoData";
import { Head } from "./parts";
import { Thumb } from "./Thumb";
import { Workshop } from "./TaoCongCu";
import { useTween, fmt0 } from "../kit";

/** Kho công cụ ĐỘNG: ô "Bạn cần công cụ gì?" ở trung tâm; có thì dùng, chưa có thì AI dựng ngay; danh mục mọi môn, mọi cấp, 4 nguồn. */
const ASK = ["mô phỏng cung cầu giá lúa", "con lắc đơn có thanh trượt chiều dài dây"];
const LEVELS: (Level | "all")[] = ["all", "THCS", "THPT", "ĐH"];
const SHAPES = ["16 / 10", "4 / 3", "1 / 1", "16 / 11", "5 / 4", "16 / 9"];
const norm = (s: string) => s.toLocaleLowerCase("vi").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export function KhoCongCu() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");
  const [building, setBuilding] = useState<{ q: string; run: number } | null>(null);
  const [made, setMade] = useState<Tool[]>([]);
  const [subj, setSubj] = useState<string | null>(null);
  const [lvl, setLvl] = useState<Level | "all">("all");
  const [src, setSrc] = useState<Src | null>(null);
  const typing = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = useTween(TOTAL_TOOLS + made.length, 900);

  const start = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setBuilding((b) => ({ q: t, run: (b?.run ?? 0) + 1 }));
  };
  /** Bấm gợi ý: chữ tự gõ vào ô rồi AI bắt đầu dựng. */
  const typeIn = (text: string) => {
    if (typing.current) clearInterval(typing.current);
    let i = 0;
    setQ("");
    typing.current = setInterval(() => {
      i += 2;
      setQ(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typing.current!);
        typing.current = null;
        setTimeout(() => start(text), 260);
      }
    }, 34);
  };
  useEffect(() => {
    const auto = sp.get("tao");
    if (auto) typeIn(auto === "cung-cau" ? ASK[0]! : auto === "con-lac" ? ASK[1]! : auto);
    return () => {
      if (typing.current) clearInterval(typing.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(q);
  };

  const have = useMemo(() => {
    const words = norm(q).split(/\s+/).filter((w) => w.length >= 3 && !["phong", "cong", "theo", "trong", "thanh", "truot"].includes(w));
    if (!words.length) return [];
    return TOOLS.filter((t) => words.some((w) => norm(t.name).includes(w))).slice(0, 3);
  }, [q]);

  const all = useMemo(() => [...made, ...TOOLS], [made]);
  const shown = all.filter((t) => (!subj || subjectGroup(t.subject) === subj) && (lvl === "all" || t.level === lvl) && (!src || t.src === src));

  return (
    <div className="page gl gl-kho">
      <Head title="Kho công cụ" />

      <section className={building ? "gl-ask small" : "gl-ask"}>
        {!building && <h2 className="gl-ask-t">Bạn cần công cụ gì?</h2>}
        <form className="gl-ask-box" onSubmit={submit} role="search">
          <Icon name="spark" className="gl-ask-ic" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mô tả bằng lời…" aria-label="Bạn cần công cụ gì?" />
          <button type="button" className="gl-ask-mic" aria-label="Nói yêu cầu">
            <Icon name="mic" size="sm" />
          </button>
          <button type="submit" className="btn primary gl-ask-go" disabled={!q.trim()}>
            Để AI tạo
          </button>
        </form>
        {have.length > 0 && !building && (
          <div className="gl-have">
            <span>Có sẵn</span>
            {have.map((t) => (
              <a key={t.id} href={`#${t.id}`}>
                {t.name}
              </a>
            ))}
          </div>
        )}
        {!building && (
          <div className="gl-ask-try">
            {ASK.map((a) => (
              <button key={a} type="button" onClick={() => typeIn(a)}>
                “{a}”
              </button>
            ))}
          </div>
        )}
        {!building && (
          <p className="gl-ask-n">
            <b className="num">{fmt0(total)}</b> công cụ · 15 môn · THCS → đại học
          </p>
        )}
      </section>

      {building && (
        <Workshop
          key={building.run}
          q={building.q}
          run={building.run}
          onSaved={(t) => setMade((m) => [t, ...m.filter((x) => x.name !== t.name)])}
          onClose={() => {
            setBuilding(null);
            setQ("");
          }}
        />
      )}

      <section className="gl-forlesson" aria-label="Gợi ý cho bài đang soạn">
        <span className="gl-eyebrow">Cho bài đang soạn · Rơi tự do</span>
        <div className="gl-forlesson-row">
          {FOR_LESSON.map((t) => (
            <button key={t.name} type="button" className="gl-fl">
              <Thumb kind={t.kind} color="var(--gl-c2)" />
              <span>
                <b>{t.name}</b>
                <small>{t.note}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="gl-filt">
        <div className="gl-subj" role="group" aria-label="Môn">
          <button type="button" aria-pressed={!subj} onClick={() => setSubj(null)}>
            Mọi môn
          </button>
          {SUBJECTS.map((s) => (
            <button key={s} type="button" aria-pressed={subj === s} onClick={() => setSubj(subj === s ? null : s)} style={{ ["--k" as string]: SUBJECT_COLOR[s] }}>
              {s}
            </button>
          ))}
        </div>
        <div className="gl-filt2">
          <div className="seg" role="group" aria-label="Cấp">
            {LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={lvl === l} onClick={() => setLvl(l)}>
                {l === "all" ? "Mọi cấp" : l === "ĐH" ? "Đại học" : l}
              </button>
            ))}
          </div>
          <div className="gl-srcs" role="group" aria-label="Nguồn">
            {(Object.keys(SRC) as Src[]).map((k) => (
              <button key={k} type="button" aria-pressed={src === k} onClick={() => setSrc(src === k ? null : k)} style={{ ["--k" as string]: SRC[k].color }}>
                <i />
                {SRC[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="gl-wall">
        {shown.map((t, i) => (
          <a key={t.id} id={t.id} href={`#${t.id}`} className={t.isNew ? "gl-tile new" : "gl-tile"} style={{ animationDelay: `${Math.min(i, 16) * 30}ms` }}>
            <div className="gl-tile-th" style={{ aspectRatio: SHAPES[(i * 7 + t.name.length) % SHAPES.length] }}>
              <Thumb kind={t.kind} color={SUBJECT_COLOR[t.subject] ?? "var(--gl-c1)"} />
            </div>
            <div className="gl-tile-m">
              <b>{t.name}</b>
              <span>
                {t.subject} · {t.level === "ĐH" ? "Đại học" : t.level}
              </span>
              <span className={`gl-src-tag ${t.src}`}>{t.isNew ? "Mới · AI tạo" : SRC[t.src].label}</span>
            </div>
          </a>
        ))}
        {shown.length === 0 && (
          <button type="button" className="gl-tile gl-tile-make" onClick={() => typeIn(`${subj ?? "công cụ"} ${lvl === "all" ? "" : lvl} theo bài đang soạn`.trim())}>
            <Icon name="spark" size="lg" />
            <b>Chưa có. Để AI tạo?</b>
          </button>
        )}
      </div>
    </div>
  );
}
