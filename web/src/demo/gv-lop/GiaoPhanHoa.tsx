import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CLASSES, KHANH_DUY, MINH_ANH, useCountUp } from "../kit";
import { Segmented } from "../../ui";
import { Icon } from "../../ui/Icon";
import { Head } from "./parts";

/** Giao bài phân hoá: cả lớp là một trường chấm; AI gom các em thành 3 nhóm theo trình độ, mỗi nhóm một mức bài, giao một chạm. */
type ClassId = "10A1" | "11A3" | "8A2";
type Lv = { name: string; task: string; items: string[] };
const SETS: Record<ClassId, { subject: string; topic: string; known: Record<number, string>; levels: [Lv, Lv, Lv] }> = {
  "10A1": {
    subject: "Toán",
    topic: "Bất phương trình bậc hai",
    known: { 0: MINH_ANH.short, 1: KHANH_DUY.short, 2: "Đức Thịnh" },
    levels: [
      { name: "Nền tảng", task: "Xét dấu tam thức có gợi ý", items: ["x² − 5x + 6 > 0 (cho sẵn hai nghiệm)", "Điền dấu vào bảng xét dấu"] },
      { name: "Vững", task: "Giải bất phương trình đầy đủ", items: ["−x² + 6x − 5 > 0", "2x² − 3x − 2 ≤ 0"] },
      { name: "Nâng cao", task: "Tham số và bài toán thực tế", items: ["Tìm m để x² − 2mx + 4 > 0 với mọi x", "Quầy nước chanh: bán bao nhiêu thì lãi?"] },
    ],
  },
  "11A3": {
    subject: "Ngữ văn",
    topic: "Đọc hiểu văn bản nghị luận",
    known: {},
    levels: [
      { name: "Nền tảng", task: "Tìm luận điểm theo khung gợi ý", items: ["Gạch chân câu nêu luận điểm", "Nối luận cứ với luận điểm"] },
      { name: "Vững", task: "Phân tích cách lập luận", items: ["Chỉ ra thao tác lập luận chính", "Nhận xét tính thuyết phục"] },
      { name: "Nâng cao", task: "Viết đoạn phản biện", items: ["Phản biện một luận điểm (150 chữ)", "Đề xuất dẫn chứng mới"] },
    ],
  },
  "8A2": {
    subject: "Sinh học",
    topic: "Tế bào",
    known: { 0: "Thảo Vy" },
    levels: [
      { name: "Nền tảng", task: "Ghép bào quan với chức năng", items: ["Kéo thả 6 bào quan", "Tô màu sơ đồ tế bào"] },
      { name: "Vững", task: "So sánh tế bào động – thực vật", items: ["Lập bảng 4 điểm khác", "Giải thích vì sao lá có màu xanh"] },
      { name: "Nâng cao", task: "Thiết kế thí nghiệm", items: ["Quan sát tế bào vảy hành", "Dự đoán khi nhỏ nước muối"] },
    ],
  },
};
const OPTS = (Object.keys(SETS) as ClassId[]).map((c) => ({ value: c, label: `${c} · ${SETS[c].subject}` }));

/** Học sinh mẫu: mức thành thạo giả lập ổn định theo lớp (ba em đầu của 10A1 là ba em cần giúp). */
function roster(cls: ClassId) {
  const size = CLASSES.find((c) => c.id === cls)?.size ?? 40;
  let x = cls.charCodeAt(0) * 97 + cls.length * 13;
  const rnd = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff), x / 0x7fffffff);
  return Array.from({ length: size }, (_, i) => {
    const preset = cls === "10A1" ? [0.42, 0.35, 0.3][i] : cls === "8A2" && i === 0 ? 0.92 : undefined;
    const m = preset ?? Math.min(0.97, Math.max(0.12, 0.62 + (rnd() + rnd() + rnd() - 1.5) * 0.42));
    return { i, m, sx: 4 + rnd() * 92, sy: 8 + rnd() * 80 };
  });
}
const levelOf = (m: number) => (m < 0.5 ? 0 : m < 0.72 ? 1 : 2);

export function GiaoPhanHoa() {
  const [sp] = useSearchParams();
  const [cls, setCls] = useState<ClassId>("10A1");
  const [stage, setStage] = useState<0 | 1 | 2>(Number(sp.get("buoc") ?? 0) as 0 | 1 | 2);
  const set = SETS[cls];
  const kids = useMemo(() => roster(cls), [cls]);
  const groups = useMemo(() => {
    const g: (typeof kids)[] = [[], [], []];
    [...kids].sort((a, b) => a.m - b.m).forEach((k) => g[levelOf(k.m)]!.push(k));
    return g;
  }, [kids]);
  const slot = useMemo(() => {
    const map = new Map<number, { x: number; y: number; g: number; j: number }>();
    const narrow = typeof matchMedia === "function" && matchMedia("(max-width: 720px)").matches;
    const cols = narrow ? 4 : 6, dx = narrow ? 6.8 : 3.9, dy = narrow ? 12 : 17;
    groups.forEach((g, gi) =>
      g.forEach((k, j) => {
        const r = Math.floor(j / cols), c = j % cols;
        map.set(k.i, { g: gi, j, x: (gi + 0.5) * 33.33 + (c - (cols - 1) / 2) * dx, y: 14 + r * dy });
      }),
    );
    return map;
  }, [groups]);
  const change = (c: ClassId) => {
    setCls(c);
    setStage(0);
  };

  return (
    <div className="page gl gl-ph">
      <Head
        title="Giao bài phân hoá"
        tabs={<Segmented label="Lớp" options={OPTS} value={cls} onChange={change} />}
        primary={stage === 0 ? { label: "AI chia nhóm", icon: "spark", onClick: () => setStage(1) } : stage === 1 ? { label: "Giao một chạm", icon: "send", onClick: () => setStage(2) } : { label: "Đã giao", icon: "check", onClick: () => setStage(0) }}
      />

      <p className="gl-ph-topic">
        <b>{set.topic}</b> · {kids.length} em
      </p>

      <div className={`gl-field st-${stage}`} aria-label={`Lớp ${cls}: ${kids.length} học sinh`}>
        {stage > 0 && [0, 1, 2].map((g) => <span key={g} className="gl-field-lane" style={{ left: `${g * 33.33}%` }} />)}
        {kids.map((k) => {
          const s = slot.get(k.i)!;
          const name = set.known[k.i];
          const pos = stage === 0 ? { left: `${k.sx}%`, top: `${k.sy}%` } : stage === 1 ? { left: `${s.x}%`, top: `${s.y}%` } : { left: `${(s.g + 0.5) * 33.33}%`, top: "86%" };
          return (
            <span
              key={`${cls}-${k.i}`}
              className={name ? `gl-dot named${s.j % 2 ? " lo" : ""}` : "gl-dot"}
              title={name ?? `HS ${k.i + 1}: ${Math.round(k.m * 100)}%`}
              style={{ ...pos, ["--m" as string]: k.m, transitionDelay: stage === 2 ? `${(s.g * 120 + (k.i % 7) * 40)}ms` : `${(k.i % 14) * 28}ms` }}
            >
              {name && stage > 0 && <em>{name}</em>}
            </span>
          );
        })}
        {stage === 2 && [0, 1, 2].map((g) => <Envelope key={g} g={g} n={groups[g]!.length} />)}
      </div>

      <div className={stage > 0 ? "gl-ph-cols in" : "gl-ph-cols"}>
        {set.levels.map((lv, g) => (
          <section key={lv.name} className={`gl-ph-col l${g}`} style={{ transitionDelay: `${300 + g * 120}ms` }}>
            <header>
              <span className="gl-ph-lv">Mức {g + 1}</span>
              <b>{lv.name}</b>
              <span className="num">{groups[g]!.length} em</span>
            </header>
            <h3>{lv.task}</h3>
            <ol>
              {lv.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {stage === 2 && (
        <p className="gl-ph-done">
          <Icon name="check" size="sm" /> Đã giao {kids.length} em · 3 mức · hạn 20:00 tối nay. AI tự nâng hoặc hạ mức khi em làm.
        </p>
      )}
    </div>
  );
}

function Envelope({ g, n }: { g: number; n: number }) {
  const c = useCountUp(n, 1100);
  return (
    <span className="gl-env" style={{ left: `${(g + 0.5) * 33.33}%`, animationDelay: `${g * 120}ms` }}>
      <Icon name="send" />
      <b className="num">{Math.round(c)}</b>
    </span>
  );
}
