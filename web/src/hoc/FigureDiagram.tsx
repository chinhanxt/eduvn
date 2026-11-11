// Khối figure của giáo trình: mã Mermaid → hình thật bằng bộ vẽ sơ đồ P10 (tải lười cùng trang đọc).
import { useMemo } from "react";
import { diagramSvg } from "../diagram/export";
import { placeLabels } from "../diagram/labels";
import { buildDoc } from "../diagram/ops";
import { routeAll } from "../diagram/route";
import { parseMermaid } from "./mermaid";

/** SVG của sơ đồ (chuỗi đã escape trong diagramSvg) hoặc null khi mã không đọc được. */
export function mermaidSvg(code: string): { svg: string; w: number; h: number } | null {
  const g = parseMermaid(code);
  if (!g || g.nodes.length < 2) return null;
  const doc = buildDoc(g.kind, g.nodes, g.links.map((l) => ({ ...l, dashed: l.dashed ?? false })));
  const routes = routeAll(doc);
  const root = doc.nodes.find((n) => !n.parent)?.id;
  return diagramSvg(doc, routes, placeLabels(doc, routes), (n) => g.kind === "mind" && n.id === root);
}

export default function FigureDiagram({ code, title }: { code: string; title: string }) {
  const out = useMemo(() => mermaidSvg(code), [code]);
  if (!out) return null;
  return (
    <figure className="fig-diagram" role="img" aria-label={title} style={{ maxWidth: Math.min(out.w, 900) }}>
      <div dangerouslySetInnerHTML={{ __html: out.svg.replace(/^<svg /, '<svg style="width:100%;height:auto" ') }} />
    </figure>
  );
}
