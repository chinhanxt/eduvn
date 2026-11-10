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
