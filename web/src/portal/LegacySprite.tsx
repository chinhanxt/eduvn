import { useEffect, useState } from "react";

/** Sprite icon của trang cũ (web/src/sprite.ts, ~3 KB gzip): tải sau lần vẽ đầu để không nằm trong JS lần đầu của cổng. */
export function LegacySprite() {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    // lúc rảnh: trang Hôm nay (v2) không cần sprite cũ; trang cũ đều tải lười nên kịp có sprite
    const go = () => void import("../sprite").then((m) => live && setSvg(m.SPRITE));
    const id = window.requestIdleCallback ? window.requestIdleCallback(go, { timeout: 1200 }) : window.setTimeout(go, 300);
    return () => {
      live = false;
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
  return svg ? <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} /> : null;
}
