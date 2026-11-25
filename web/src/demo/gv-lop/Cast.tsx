/** Dàn nhân vật tự vẽ (nguyên bản) cho Lớp học AI và Bạn đồng hành: chân dung bán thân SVG, mắt chớp, miệng mấp máy khi nói. */
export type CastId = "lam" | "bon" | "su" | "tun" | "minhAnh" | "khanhDuy" | "bacTu" | "nhu" | "ducThinh";
export type CastMember = { id: CastId; name: string; role: string; hue: number; ai: boolean };

export const CAST: Record<CastId, CastMember> = {
  lam: { id: "lam", name: "Cô Lam", role: "GV AI", hue: 228, ai: true },
  bon: { id: "bon", name: "Bon", role: "Trợ giảng", hue: 160, ai: true },
  su: { id: "su", name: "Su", role: "Bạn học AI", hue: 320, ai: true },
  tun: { id: "tun", name: "Tũn", role: "Bạn học AI", hue: 40, ai: true },
  minhAnh: { id: "minhAnh", name: "Minh Anh", role: "Học sinh", hue: 205, ai: false },
  khanhDuy: { id: "khanhDuy", name: "Khánh Duy", role: "Học sinh", hue: 150, ai: false },
  bacTu: { id: "bacTu", name: "Bác Tư", role: "Phụ huynh (AI đóng vai)", hue: 25, ai: true },
  nhu: { id: "nhu", name: "Nhú", role: "Bạn đồng hành", hue: 95, ai: true },
  ducThinh: { id: "ducThinh", name: "Đức Thịnh", role: "Học sinh", hue: 265, ai: false },
};

const SKIN: Record<CastId, string> = { lam: "#F2D3B8", bon: "#E9C29E", su: "#F6DCC6", tun: "#DDB08A", minhAnh: "#F4D6BE", khanhDuy: "#E3B892", bacTu: "#D9A982", nhu: "#CDEBB4", ducThinh: "#EBC6A2" };
const HAIR: Record<CastId, string> = { lam: "#2A2420", bon: "#3B2A1E", su: "#5B2C4F", tun: "#1E1A17", minhAnh: "#231C18", khanhDuy: "#2B211B", bacTu: "#B9B4AE", nhu: "#5E9C3A", ducThinh: "#1F1915" };

function Hair({ id }: { id: CastId }) {
  const c = HAIR[id];
  switch (id) {
    case "lam": // búi tóc cao + mái lệch
      return (
        <g fill={c}>
          <circle cx="32" cy="10.5" r="6" />
          <path d="M16.5 29c-1-10 5-17 15.5-17s16.8 7 15.5 17c-2.5-5-6.5-8-12-8.5-3 3.2-9 5-19 8.5z" />
        </g>
      );
    case "bon": // tóc ngắn dựng + bút chì giắt tai
      return (
        <g>
          <path fill={c} d="M17 27c-.6-9 4.6-15 15-15s15.8 6 15 15l-2.4-5.4-3 2.2-1.6-4.4-3.6 3-2.4-4-3.2 3.6-2.8-3.6-2.6 4.4-3-2.6z" />
          <g transform="rotate(-38 49 24)">
            <rect x="46" y="15" width="3.2" height="15" rx=".6" fill="#E9B949" />
            <path d="M46 30h3.2l-1.6 3.4z" fill="#3A2E25" />
          </g>
        </g>
      );
    case "su": // hai búi hai bên
      return (
        <g fill={c}>
          <circle cx="15.5" cy="17" r="5.4" />
          <circle cx="48.5" cy="17" r="5.4" />
          <path d="M17 28c-.5-10 5.5-16 15-16s15.5 6 15 16c-4-6-10-8-15-7.5-5 .5-11 2-15 7.5z" />
        </g>
      );
    case "tun": // tóc bù xù
      return (
        <path
          fill={c}
          d="M16 28c-2-6 0-12 4-14l1 2c1-4 6-6 9-4 2-3 7-3 9 0 3-1 6 2 6 5 3 1 4 6 3 11-2-4-4-6-7-6l-2 2-3-3-3 3-3-3-3 3-3-3-2 3c-3 0-5 2-6 4z"
        />
      );
    case "minhAnh": // tóc dài thẳng, mái bằng
      return (
        <g fill={c}>
          <path d="M15 44c-2-8-1.6-19 1-25 3-6 9-8.5 16-8.5S45 13 48 19c2.6 6 3 17 1 25l-5-1V27H20v16z" />
          <path d="M18 25c2-7 7-10 14-10s12 3 14 10c-6-2.4-22-2.4-28 0z" />
        </g>
      );
    case "khanhDuy": // tóc ngắn rẽ ngôi + mũ lưỡi trai ngược
      return (
        <g>
          <path fill="#2F6E58" d="M16.6 24.5c.8-8 7-12.5 15.4-12.5s14.6 4.5 15.4 12.5z" />
          <path fill="#2F6E58" d="M10 23.5h8v2.6h-8z" opacity=".85" />
          <path fill={c} d="M17 26c3-1 6-1.2 8-.6v3c-3-.6-6 0-8 .6z" />
        </g>
      );
    case "bacTu": // tóc bạc thưa + kính lão
      return (
        <g>
          <path fill={c} d="M17 27c0-9 6-14 15-14s15 5 15 14c-1.5-3-3-4.5-5-5-2 2-18 2-20 0-2 .5-3.5 2-5 5z" />
        </g>
      );
    case "ducThinh": // tóc dựng gọn hai bên
      return <path fill={c} d="M16.5 26c-.5-9 5-14.5 15.5-14.5S48 17 47.5 26c-2-3-5-5-8-5.5l-1-3-3 2.5-3-3.5-3 3.5-3-2.5-1 3c-3 .5-6 2.5-8.5 5.5z" />;
    case "nhu": // mầm cây trên đầu
      return (
        <g>
          <path d="M32 13V5" stroke="#3F7D2A" strokeWidth="1.8" strokeLinecap="round" />
          <path fill="#6DB33F" d="M32 7c-2.6-4-7-4.4-9-3 1 3.6 5 5 9 3z" />
          <path fill="#86C95A" d="M32 6.5c2.4-4.2 7-4.8 9.2-3.4-.8 3.8-5 5.4-9.2 3.4z" />
        </g>
      );
  }
}

function Extra({ id }: { id: CastId }) {
  switch (id) {
    case "lam":
      return (
        <g fill="none" stroke="#2A2420" strokeWidth="1.3">
          <circle cx="26" cy="29" r="4" />
          <circle cx="38" cy="29" r="4" />
          <path d="M30 29h4" />
        </g>
      );
    case "bacTu":
      return (
        <g fill="none" stroke="#5a4a3c" strokeWidth="1.2">
          <rect x="21.5" y="26" width="8" height="6" rx="2" />
          <rect x="34.5" y="26" width="8" height="6" rx="2" />
          <path d="M29.5 28.5h5" />
          <path d="M26 38.5c2.6 1.4 9.4 1.4 12 0" stroke="#B9B4AE" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case "tun": // lông mày nhướn (hay cãi)
      return <path d="M22 23.5l7-2M36 21.5l6.5 2.4" stroke="#1E1A17" strokeWidth="1.6" strokeLinecap="round" />;
    case "su": // má hồng
      return (
        <g fill="#F29CB7" opacity=".55">
          <circle cx="22.5" cy="34" r="2.4" />
          <circle cx="41.5" cy="34" r="2.4" />
        </g>
      );
    default:
      return null;
  }
}

/** Chân dung bán thân. `talk` = miệng mấp máy, `ai` = dấu sao nhỏ góc dưới (nhân vật AI). */
export function Portrait({ id, size = 56, talk, dim, className }: { id: CastId; size?: number; talk?: boolean; dim?: boolean; className?: string }) {
  const m = CAST[id];
  const shirt = `hsl(${m.hue} 52% 46%)`;
  const tint = `hsl(${m.hue} 60% 92%)`;
  const cls = ["gl-face", talk && "talk", dim && "dim", className].filter(Boolean).join(" ");
  return (
    <svg className={cls} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${m.name}, ${m.role}`}>
      <circle cx="32" cy="32" r="32" fill={tint} className="gl-face-bg" />
      <clipPath id={`gl-clip-${id}`}>
        <circle cx="32" cy="32" r="32" />
      </clipPath>
      <g clipPath={`url(#gl-clip-${id})`}>
        <path d="M8 66c1-13 10-20 24-20s23 7 24 20z" fill={shirt} />
        <path d="M27 46l5 6 5-6" fill="none" stroke="rgb(255 255 255 / .55)" strokeWidth="1.6" />
        <rect x="28" y="39" width="8" height="8" rx="3" fill={SKIN[id]} />
        <ellipse cx="32" cy="29" rx="15" ry="16" fill={SKIN[id]} />
        <circle cx="17.2" cy="30" r="2.6" fill={SKIN[id]} />
        <circle cx="46.8" cy="30" r="2.6" fill={SKIN[id]} />
        <Hair id={id} />
        <g className="gl-eyes" fill="#1E1A17">
          <ellipse cx="26" cy="29.5" rx="1.7" ry="2.1" />
          <ellipse cx="38" cy="29.5" rx="1.7" ry="2.1" />
        </g>
        <Extra id={id} />
        <ellipse className="gl-mouth" cx="32" cy="37.4" rx="3.4" ry="1.3" fill="#8A3B33" />
      </g>
      {m.ai && (
        <g className="gl-ai-dot">
          <circle cx="53" cy="53" r="7.5" fill="var(--bg, #fff)" />
          <path d="M53 47.6l1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9-3.9-1.5 3.9-1.5z" fill={`hsl(${m.hue} 62% 44%)`} />
        </g>
      )}
    </svg>
  );
}
