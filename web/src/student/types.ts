/** Kiểu dữ liệu API học sinh — khớp server/src/services/submissions.ts, credentials.ts, domain/assignment.ts. */
export type AnswerValue = number | (boolean | null)[] | string | null;
export type Answers = Record<string, AnswerValue>;
export type SubmissionStatus = "in_progress" | "submitted" | "auto_submitted";
export type StudentState = "chua_mo" | "chua_lam" | "dang_lam" | "da_nop" | "qua_han";
export type ResultLevel = "full" | "marks" | "score";

type ItemBase = { no: number; section: string; stem: string; maxPoints: number };
export type PublicItem =
  | (ItemBase & { type: "mcq"; options: string[] })
  | (ItemBase & { type: "true_false"; statements: string[] })
  | (ItemBase & { type: "short_answer" })
  | (ItemBase & { type: "essay" });
export type ReviewItem = PublicItem & { response: AnswerValue; points: number | null; correct: boolean | null; key?: string; explanation?: string };

export type StudentSession = { token: string; expiresInSeconds: number; student: { id: string; fullName: string; seat: number | null }; class: { id: string; name: string; subject: string | null } };
export type MyAssignment = {
  id: string;
  title: string;
  kind: "practice" | "test";
  subject: string;
  questionCount: number;
  durationMinutes: number | null;
  opensAt: string;
  dueAt: string;
  attemptsAllowed: number;
  attemptsUsed: number;
  state: StudentState;
  canStart: boolean;
  answered: number;
  score10: number | null;
  currentSubmissionId: string | null;
  lastSubmissionId: string | null;
};
export type RoomPayload = {
  submission: { id: string; attempt: number; status: SubmissionStatus; seq: number; answers: Answers; startedAt: string; deadlineAt: string; variantCode: string };
  assignment: { id: string; title: string; kind: "practice" | "test"; subject: string; durationMinutes: number | null; dueAt: string; attemptsAllowed: number };
  questions: PublicItem[];
  serverNow: string;
};
export type SaveResult = { ok: true; seq: number; serverNow: string; deadlineAt: string };
export type StudentResult = {
  submissionId: string;
  assignmentId: string;
  title: string;
  status: SubmissionStatus;
  attempt: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  canRetry: boolean;
  score: number | null;
  maxScore: number | null;
  score10: number | null;
  pending: number;
  correctCount: number;
  startedAt: string;
  submittedAt: string | null;
  level: ResultLevel;
  items: ReviewItem[];
};
