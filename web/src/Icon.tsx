import type { CSSProperties } from "react";
import { SPRITE } from "./sprite";

export function Sprite() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPRITE }} />;
}

export function Icon({ name, size, style }: { name: string; size?: number; style?: CSSProperties }) {
  const s = size ? { width: size, height: size, ...style } : style;
  return (
    <svg className="i" style={s} aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}
