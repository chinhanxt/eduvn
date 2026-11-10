/** Kiểu API GV cho lớp học trực tuyến — khớp server/src/services/assignments.ts, credentials.ts, domain/analytics.ts. */
import type { ReviewItem } from "../../student/types";

export type AssignmentSummary = {
  id: string;
  classId: string;
  title: string;
  kind: "practice" | "test";
  subject: string;
  status: "draft" | "published" | "closed";
  source: "exam" | "bank";
  opensAt: string;
  dueAt: string;
  durationMinutes: number | null;
  attemptsAllowed: number;
  showSolution: "after_submit" | "after_due" | "never";
  shuffle: boolean;
  questionCount: number;
  variantCodes: string[];
  maxScore: number;
  createdAt: string;
};
export type AssignmentListItem = AssignmentSummary & { rosterSize: number; submitted: number; inProgress: number };
export type MonitorState = "chua_vao" | "dang_lam" | "da_nop" | "tu_nop";
export type MonitorRow = { studentId: string; seat: number | null; fullName: string; state: MonitorState; answered: number; total: number; leaveCount: number; score10: number | null; updatedAt: string | null; submissionId: string | null };
export type MonitorPayload = { assignment: AssignmentSummary; serverNow: string; counts: Record<MonitorState, number>; rows: MonitorRow[] };
export type ResultRow = { studentId: string; seat: number | null; fullName: string; submissionId: string | null; status: "in_progress" | "submitted" | "auto_submitted" | null; attempts: number; score: number | null; maxScore: number | null; score10: number | null; pending: number; leaveCount: number; submittedAt: string | null };
export type ItemStat = { questionId: string; label: number; stem: string; topic: string; level: string; type: string; n: number; p: number | null; d: number | null; flag: "Khó" | "Dễ" | "Xem lại" | null; choices: { choice: string; count: number; correct: boolean }[] };
export type AssignmentStats = {
  rosterSize: number;
  started: number;
  submitted: number;
  submitRate: number;
  mean: number | null;
  median: number | null;
  best: { studentId: string; fullName: string; score10: number } | null;
  worst: { studentId: string; fullName: string; score10: number } | null;
  distribution: number[];
  items: ItemStat[];
  topics: { topic: string; n: number; rate: number }[];
  atRisk: { studentId: string; fullName: string; seat: number | null; score10: number | null; reasons: string[] }[];
};
export type ResultsPayload = { assignment: AssignmentSummary; rows: ResultRow[]; stats: AssignmentStats };
export type SubmissionDetail = {
  student: { id: string; fullName: string; seat: number | null };
  submission: { id: string; attempt: number; status: string; variantCode: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number | null; pending: number; leaveCount: number };
  items: (ReviewItem & { rubric?: string })[];
  events: { at: string; kind: string }[];
};
export type CredentialStatus = {
  classId: string;
  className: string;
  subject: string | null;
  classCode: string | null;
  joinCode: string | null;
  joinOpen: boolean;
  students: { id: string; seat: number | null; fullName: string; dob: string | null; hasPin: boolean; linked: boolean; linkPending: boolean }[];
};
export type BadgeCard = { studentId: string; seat: number; fullName: string; pin: string; qrToken: string };
export type IssueResult = { classCode: string; cards: BadgeCard[] };
