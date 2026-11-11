import type { Mood } from "./mascot";
import "./mascot.css";

const LABEL: Record<Mood, string> = { chao: "Mầm vẫy tay chào", khen: "Mầm nhảy lên khen", "dong-vien": "Mầm nghiêng đầu động viên", chuoi: "Mầm giữ ngọn lửa chuỗi ngày" };

/** Linh vật Mầm (SVG + CSS, không ảnh): hạt mầm lục lam có chồi lá; đổi `key` để phát lại động tác. */
export function Mascot({ mood = "chao", size = 64, say, className }: { mood?: Mood; size?: number; say?: string; className?: string }) {
  return (
    <div className={["mam", `mam-${mood}`, className].filter(Boolean).join(" ")} role="img" aria-label={say ? `${LABEL[mood]}: ${say}` : LABEL[mood]}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <g className="mam-b">
          <g className="mam-leaf">
            <path d="M32 21v-7" stroke="#3f9a4e" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M32 15c-2-6-9-8-14-6 1 5 7 9 14 6z" fill="#6cc46a" />
            <path d="M32 14c3-5 9-6 13-4-1 4-7 7-13 4z" fill="#8ed67a" />
          </g>
          <path className="mam-arm" d="M50 41c4-2 7-6 7-10" stroke="#259b89" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M32 20c12 0 20 9 20 21s-8 18-20 18-20-6-20-18 8-21 20-21z" fill="#34b7a3" />
          <ellipse cx="32" cy="48" rx="12" ry="8" fill="#fff" opacity=".22" />
          <g className="mam-eo" fill="#10302b">
            <ellipse cx="25" cy="37" rx="2.7" ry="3.5" />
            <ellipse cx="39" cy="37" rx="2.7" ry="3.5" />
            <circle cx="26" cy="35.6" r=".9" fill="#fff" />
            <circle cx="40" cy="35.6" r=".9" fill="#fff" />
          </g>
          <path className="mam-eh" d="M22 38q3-4.5 6 0M36 38q3-4.5 6 0" stroke="#10302b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="43" r="3" fill="#ff9fb2" opacity=".75" />
          <circle cx="44" cy="43" r="3" fill="#ff9fb2" opacity=".75" />
          <path className="mam-ms" d="M28 44q4 4 8 0" stroke="#10302b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path className="mam-mb" d="M27 43h10q0 6.5-5 6.5T27 43z" fill="#10302b" />
          <path className="mam-mc" d="M29 45.5q3-2 6 0" stroke="#10302b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
        <g className="mam-sp" fill="#f2b233">
          <path d="M10 16l1.6 3.2 3.2 1.6-3.2 1.6L10 25.6l-1.6-3.2-3.2-1.6 3.2-1.6z" />
          <path d="M55 22l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
        </g>
        <path className="mam-fl" d="M54 4c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z" fill="#f08a24" />
      </svg>
      {say && <p className="mam-say">{say}</p>}
    </div>
  );
}
