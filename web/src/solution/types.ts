// web/src/solution/types.ts — mô hình lời giải P13 (khớp server/src/domain/solution.ts).
import type { ConstructionSpec } from "../geometry3d/spec";

export type VerifyStatus = "verified" | "mismatch" | "unchecked";
export type VerifyDetail = { ok: boolean | null; label: string; expected?: string; measured?: string };
export type Verification = { status: VerifyStatus; details: VerifyDetail[] };

export type TreeNode = { id: string; label: string; parent: string | null; p?: string };
export type Figure =
  | { kind: "solid3d"; spec: ConstructionSpec }
  | { kind: "graph"; spec: { expr: string; xRange?: [number, number]; points: { id: string; x: string; y?: string; label?: string }[] } }
  | { kind: "tree"; spec: { nodes: TreeNode[] } }
  | { kind: "diagram"; spec: { nodes: { id: string; label: string; parent: string | null }[]; links: { from: string; to: string; label?: string }[] } }
  | { kind: "plane"; spec: { points: { id: string; x: number; y: number }[]; segments: [string, string][]; circles: { center: string; r: number }[] } };

export type Step = { title: string; body: string; refs: string[]; check?: unknown };
export type Solution = { problem: string; subject: string; topic: string; answer: string; steps: Step[]; figure?: Figure; checks: unknown[]; verification: Verification };

export type SolveEvent =
  | { type: "step"; index: number; step: Partial<Step> }
  | { type: "partial"; index: number; title: string; body: string }
  | { type: "status"; message: string }
  | { type: "verified"; verification: Verification; corrected: boolean }
  | { type: "done"; id: string | null; solution: Solution }
  | { type: "error"; message: string }
  | { type: "end" };

export type SolutionRow = { id: string; questionId: string | null; slug: string | null; views: number; publishedAt: string | null; solution: Solution };

export const STATUS_TEXT: Record<VerifyStatus, string> = { verified: "Đã kiểm", mismatch: "Lệch — cần xem lại", unchecked: "Chưa kiểm được" };
