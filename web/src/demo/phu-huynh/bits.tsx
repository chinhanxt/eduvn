import { words } from "./speak";

/** Icon loa (sprite chung chưa có). */
export function Loa({ on }: { on?: boolean }) {
  return (
    <svg className="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path className={on ? "ph-wave on" : "ph-wave"} d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path className={on ? "ph-wave w2 on" : "ph-wave w2"} d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

/** Đoạn chữ tô sáng theo từ đang đọc. */
export function Karaoke({ text, at, className }: { text: string; at: number; className?: string }) {
  return (
    <p className={className} aria-live="off">
      {words(text).map((x, i) => (
        <span key={i} className={i < at ? "kw past" : i === at ? "kw now" : "kw"}>
          {x.w}{" "}
        </span>
      ))}
    </p>
  );
}

/** Ảnh đại diện tròn theo sắc của em (thế giới mẫu). */
export function Face({ name, hue, size = 56 }: { name: string; hue: number; size?: number }) {
  const ini = name.split(/\s+/).slice(-2).map((w) => w[0]).join("");
  return (
    <span className="ph-face" style={{ width: size, height: size, fontSize: size * 0.36, ["--h" as string]: hue }} aria-hidden="true">
      {ini}
    </span>
  );
}
