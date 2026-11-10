// web/src/diagram/types.ts — phải khớp server/src/domain/diagram.ts (DiagramDocSchema).
export const SHAPES = ["rect", "round", "ellipse", "diamond", "parallelogram", "cloud", "pill"] as const;
export type Shape = (typeof SHAPES)[number];
export type DiagramKind = "mind" | "flow";

export type DNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: Shape;
  label: string;
  color: string;
  parent?: string | null;
  image?: string;
};
export type DEdge = { id: string; from: string; to: string; label?: string; dashed?: boolean; kind: "tree" | "link" };
export type DiagramDoc = { version: 1; kind: DiagramKind; nodes: DNode[]; edges: DEdge[] };

export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const newId = (): string => Math.random().toString(36).slice(2, 10);
export const rectOf = (n: DNode): Rect => ({ x: n.x, y: n.y, w: n.w, h: n.h });
