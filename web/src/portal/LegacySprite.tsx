import { useEffect, useState } from "react";

/** Sprite icon của trang cũ (web/src/sprite.ts, ~3 KB gzip): tải sau lần vẽ đầu để không nằm trong JS lần đầu của cổng. */
export function LegacySprite() {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void import("../sprite").then((m) => live && setSvg(m.SPRITE));
    return () => {
      live = false;
    };
  }, []);
  return svg ? <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} /> : null;
}
