// Trạng thái trống đẹp cho các màn chạy thật của cổng GV: một câu (serif) · một nút chính · bản xem trước mờ của chức năng
// với dữ liệu mẫu trải nhiều môn (không thiên Toán). Hình tự vẽ SVG, màu dữ liệu --c1…--c8 (sáng/tối tự theo).
import type { CSSProperties, ReactNode } from "react";
import "./gv.css";

export type ArtName = "song" | "la" | "ban-do" | "moc" | "phan-tu" | "van" | "parabol" | "hoi-thoai" | "code" | "cot" | "not-nhac" | "the";

/** Hình nhỏ 160×90 cho từng môn. */
export function Art({ name, className }: { name: ArtName; className?: string }) {
  const s = { fill: "none", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const body = (() => {
    switch (name) {
      case "song":
        return (
          <>
            <path d="M14 45h132" stroke="var(--line-2)" {...s} strokeWidth={1.2} />
            <path d="M14 45c10-26 20-26 30 0s20 26 30 0 20-26 30 0 20 26 30 0 6-12 12-12" stroke="var(--c1)" {...s} />
            <circle cx="44" cy="45" r="3.5" fill="var(--c1)" />
          </>
        );
      case "la":
        return (
          <>
            <path d="M50 70C46 40 74 18 112 20c2 34-22 56-62 50Z" stroke="var(--c6)" {...s} fill="color-mix(in srgb, var(--c6) 10%, transparent)" />
            <path d="M50 70C66 54 82 40 104 27M70 54l-4-12M84 43l-2-11M70 54l12 2M84 43l12 1" stroke="var(--c6)" {...s} strokeWidth={1.4} />
            <circle cx="128" cy="22" r="8" stroke="var(--c4)" {...s} />
          </>
        );
      case "ban-do":
        return (
          <>
            <path d="M54 14c8 6 4 14 12 18s4 12 10 18-2 14 6 22c-10 2-18-6-20-14s-12-10-8-20-10-14 0-24Z" stroke="var(--c3)" {...s} fill="color-mix(in srgb, var(--c3) 12%, transparent)" />
            <path d="M96 22c18-4 34 4 40 18M100 70c12 4 26 0 34-10" stroke="var(--c1)" {...s} strokeDasharray="3 5" />
            <circle cx="72" cy="48" r="4" fill="var(--c8)" />
          </>
        );
      case "moc":
        return (
          <>
            <path d="M16 52h128" stroke="var(--ink-3)" {...s} strokeWidth={1.4} />
            {[28, 62, 98, 132].map((x, i) => (
              <g key={x}>
                <circle cx={x} cy={52} r={i === 2 ? 6 : 4} fill={i === 2 ? "var(--c7)" : "var(--bg)"} stroke="var(--c7)" strokeWidth={2} />
                <path d={`M${x} ${i % 2 ? 60 : 44}v${i % 2 ? 12 : -12}`} stroke="var(--line-2)" {...s} strokeWidth={1.4} />
                <rect x={x - 12} y={i % 2 ? 74 : 22} width="24" height="4" rx="2" fill="var(--line-2)" />
              </g>
            ))}
          </>
        );
      case "phan-tu":
        return (
          <>
            <path d="M58 46 86 30M86 30l28 16M86 30V16M58 46v20" stroke="var(--ink-3)" {...s} strokeWidth={1.6} />
            <circle cx="86" cy="30" r="10" fill="var(--c8)" />
            <circle cx="58" cy="46" r="8" fill="var(--c1)" />
            <circle cx="114" cy="46" r="8" fill="var(--c1)" />
            <circle cx="86" cy="14" r="5" fill="var(--line-2)" />
            <circle cx="58" cy="68" r="5" fill="var(--line-2)" />
          </>
        );
      case "van":
        return (
          <>
            <path d="M24 26c0-6 4-10 10-10M24 26h8v8h-8zM40 26c0-6 4-10 10-10M40 26h8v8h-8z" stroke="var(--c7)" {...s} strokeWidth={1.8} />
            {[24, 36, 48, 60, 72].map((y, i) => (
              <rect key={y} x={i === 0 ? 60 : 24} y={y + 2} width={[80, 116, 104, 112, 70][i]} height="4" rx="2" fill={i === 2 ? "color-mix(in srgb, var(--c7) 45%, transparent)" : "var(--line-2)"} />
            ))}
          </>
        );
      case "parabol":
        return (
          <>
            <path d="M16 70h128M80 10v74" stroke="var(--line-2)" {...s} strokeWidth={1.2} />
            <path d="M34 14c14 58 78 58 92 0" stroke="var(--c1)" {...s} />
            <path d="M48 44h64" stroke="var(--c3)" {...s} strokeDasharray="2 4" />
          </>
        );
      case "hoi-thoai":
        return (
          <>
            <path d="M20 18h70a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H40l-10 9v-9h-2a8 8 0 0 1-8-8z" stroke="var(--c4)" {...s} fill="color-mix(in srgb, var(--c4) 12%, transparent)" />
            <path d="M140 42H82a8 8 0 0 0-8 8v12a8 8 0 0 0 8 8h40l10 8v-8h0a8 8 0 0 0 8-8z" stroke="var(--c1)" {...s} />
            <rect x="32" y="30" width="44" height="4" rx="2" fill="var(--c4)" />
            <rect x="86" y="54" width="40" height="4" rx="2" fill="var(--c1)" />
          </>
        );
      case "code":
        return (
          <>
            <path d="M40 24 22 45l18 21M120 24l18 21-18 21" stroke="var(--c7)" {...s} />
            <circle cx="80" cy="26" r="6" fill="var(--c1)" />
            <circle cx="62" cy="56" r="6" fill="var(--c3)" />
            <circle cx="98" cy="56" r="6" fill="var(--c3)" />
            <path d="M76 31 65 51M84 31l11 20" stroke="var(--ink-3)" {...s} strokeWidth={1.4} />
          </>
        );
      case "cot":
        return (
          <>
            <path d="M18 76h124" stroke="var(--line-2)" {...s} strokeWidth={1.2} />
            {[34, 52, 28, 62, 44].map((h, i) => (
              <rect key={i} x={30 + i * 22} y={76 - h} width="12" height={h} rx="2" fill={i === 3 ? "var(--c3)" : "color-mix(in srgb, var(--c3) 40%, transparent)"} />
            ))}
          </>
        );
      case "not-nhac":
        return (
          <>
            {[24, 34, 44, 54, 64].map((y) => (
              <path key={y} d={`M14 ${y}h132`} stroke="var(--line-2)" {...s} strokeWidth={1.2} />
            ))}
            {[
              [40, 54],
              [66, 44],
              [92, 39],
              [118, 49],
            ].map(([x, y]) => (
              <g key={x}>
                <ellipse cx={x} cy={y} rx="6" ry="4.5" fill="var(--c5)" transform={`rotate(-20 ${x} ${y})`} />
                <path d={`M${x! + 5} ${y}v-24`} stroke="var(--c5)" {...s} strokeWidth={1.8} />
              </g>
            ))}
          </>
        );
      case "the":
        return (
          <>
            <rect x="30" y="16" width="52" height="60" rx="6" fill="color-mix(in srgb, var(--c7) 14%, transparent)" stroke="var(--c7)" strokeWidth={2} transform="rotate(-8 56 46)" />
            <rect x="78" y="16" width="52" height="60" rx="6" fill="var(--bg)" stroke="var(--c3)" strokeWidth={2} transform="rotate(6 104 46)" />
            <path d="M96 46l6 6 12-14" stroke="var(--c3)" {...s} />
          </>
        );
    }
  })();
  return (
    <svg viewBox="0 0 160 90" className={className ?? "gv-art"} aria-hidden="true" focusable="false">
      {body}
    </svg>
  );
}

/** Dữ liệu mẫu trung lập môn (thế giới mẫu Trường Liên cấp Bình Minh). */
export type Sample = { subj: string; cls: string; title: string; art: ArtName };
export const SAMPLES: Sample[] = [
  { subj: "Sinh học", cls: "8A2", title: "Quang hợp ở cây xanh", art: "la" },
  { subj: "Lịch sử", cls: "12A1", title: "Chiến dịch Điện Biên Phủ", art: "moc" },
  { subj: "Vật lí", cls: "10A1", title: "Sóng cơ và sự truyền sóng", art: "song" },
  { subj: "Ngữ văn", cls: "11A3", title: "Nghị luận về một tư tưởng", art: "van" },
  { subj: "Hoá học", cls: "10A1", title: "Liên kết cộng hoá trị", art: "phan-tu" },
  { subj: "Địa lí", cls: "12A1", title: "Khí hậu nhiệt đới gió mùa", art: "ban-do" },
  { subj: "Tiếng Anh", cls: "10A1", title: "Câu bị động", art: "hoi-thoai" },
  { subj: "Lập trình", cls: "KTPM K23", title: "Cây nhị phân tìm kiếm", art: "code" },
  { subj: "Toán", cls: "10A1", title: "Bất phương trình bậc hai", art: "parabol" },
  { subj: "Âm nhạc", cls: "8A2", title: "Nhịp 3/4 và điệu valse", art: "not-nhac" },
];
/** Lấy n mẫu bắt đầu từ vị trí `from` (để mỗi màn một bộ khác nhau). */
export const samples = (n: number, from = 0): Sample[] => Array.from({ length: n }, (_, i) => SAMPLES[(from + i) % SAMPLES.length]!);

/** Thẻ xem trước dạng khung 16:9 (slide, bảng giảng, bài giảng AI, sơ đồ, trò chơi). */
export function Thumb({ s, meta, art, badge }: { s: Sample; meta?: ReactNode; art?: ArtName; badge?: ReactNode }) {
  return (
    <div className="gv-thumb">
      <div className="pic">
        <Art name={art ?? s.art} />
        {badge && <span className="tb">{badge}</span>}
      </div>
      <b>{s.title}</b>
      <small>{meta ?? `${s.subj} · ${s.cls}`}</small>
    </div>
  );
}

/** Trang giấy nhỏ (giáo án, đề, văn bản, đề cương). */
export function MiniPaper({ s, kind, lines = 6 }: { s: Sample; kind: string; lines?: number }) {
  return (
    <div className="gv-paper">
      <span className="k">{kind}</span>
      <b>{s.title}</b>
      <small>
        {s.subj} · {s.cls}
      </small>
      <div className="ln">
        {Array.from({ length: lines }, (_, i) => (
          <i key={i} style={{ width: `${[92, 78, 86, 64, 90, 72, 84, 58][i % 8]}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Trạng thái trống = bản xem trước: tiêu đề serif ngắn · (một dòng phụ) · một nút chính · lưới mẫu mờ dần bên dưới.
 * `children` là bản xem trước (aria-hidden, không bấm được).
 */
export function EmptyHero({ title, sub, action, children, tag = "Ví dụ", className, style }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; children?: ReactNode; tag?: string; className?: string; style?: CSSProperties }) {
  return (
    <section className={["gv-hero", className].filter(Boolean).join(" ")} style={style}>
      <div className="in">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
        {action && <div className="acts">{action}</div>}
      </div>
      {children && (
        <div className="gv-ghost" aria-hidden="true" inert>
          <span className="tag">{tag}</span>
          {children}
        </div>
      )}
    </section>
  );
}
