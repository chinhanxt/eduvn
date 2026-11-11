import type { CSSProperties } from "react";
import spriteUrl from "./icons.svg?url";
import type { IconName } from "./iconNames";

/** Icon Lucide từ sprite ngoài (icons.svg, cache dài hạn, không nằm trong JS). Cỡ: sm 16 · md 20 · lg 24. */
export function Icon({ name, size = "md", className, style, label }: { name: IconName | (string & {}); size?: "sm" | "md" | "lg"; className?: string; style?: CSSProperties; label?: string }) {
  const cls = ["i", size !== "md" && size, className].filter(Boolean).join(" ");
  return (
    <svg className={cls} style={style} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label} focusable="false">
      <use href={`${spriteUrl}#i-${name}`} />
    </svg>
  );
}
