export const ROLES = ["owner", "admin", "teacher", "assistant", "student"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "org:manage",
  "member:manage",
  "question:read",
  "question:write",
  "exam:create",
  "exam:read_key",
  "exam:grade",
  "class:manage",
  "class:read",
  "grade:write",
] as const;
export type Action = (typeof ACTIONS)[number];

const TEACHING: readonly Action[] = ["question:read", "question:write", "exam:create", "exam:read_key", "exam:grade", "class:manage", "class:read", "grade:write"];

const GRANTS: Record<Role, readonly Action[]> = {
  owner: ACTIONS,
  admin: ACTIONS,
  teacher: TEACHING,
  assistant: ["question:read", "exam:read_key", "exam:grade", "class:read", "grade:write"],
  student: [],
};

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function can(role: Role, action: Action): boolean {
  return GRANTS[role].includes(action);
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) throw new ForbiddenError(`Vai trò "${role}" không được phép thực hiện "${action}"`);
}
