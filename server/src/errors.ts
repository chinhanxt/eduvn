export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Lỗi nhập liệu có danh sách (tiếng Việt) để AI tự sửa và gửi lại. */
export class ValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Dữ liệu chưa hợp lệ:\n${issues.map((i) => `- ${i}`).join("\n")}`);
    this.name = "ValidationError";
  }
}

/** Cổng AI chưa bật / quá tải / mất kết nối → 503, web báo "AI đang bận, thử lại". */
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/** 429: kèm số giây chờ (header Retry-After). */
export class TooManyRequestsError extends Error {
  constructor(
    message: string,
    public retryAfterSec: number,
  ) {
    super(message);
    this.name = "TooManyRequestsError";
  }
}

/** 409: trạng thái không cho phép (bài đã nộp, hết lượt…); extra gửi kèm trong thân lỗi. */
export class ConflictError extends Error {
  constructor(
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ConflictError";
  }
}
