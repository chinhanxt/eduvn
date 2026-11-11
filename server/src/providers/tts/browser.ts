/** speechSynthesis vi-VN của trình duyệt: máy chủ không đọc được, chỉ báo năng lực để web tự đọc (useTts). */
import type { TtsProvider } from "../types";

export const browserTts: TtsProvider = {
  info: { id: "trinh-duyet", kind: "tts", label: "Giọng trình duyệt", description: "Đọc ngay trên máy người dùng bằng giọng tiếng Việt của trình duyệt/hệ điều hành. Không tốn máy chủ; giọng tuỳ thiết bị.", local: true, free: true, clientOnly: true },
  check: async () => ({ ok: true, detail: "Chạy trên trình duyệt người dùng (cần giọng vi-VN của thiết bị)" }),
  presets: async () => [],
  synthMany: async (items) => items.map(() => null),
};
