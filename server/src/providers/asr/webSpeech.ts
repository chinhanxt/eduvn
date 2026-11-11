/** Web Speech API (SpeechRecognition vi-VN) của trình duyệt: chỉ báo năng lực, web tự nhận dạng (useAsr). */
import type { AsrProvider } from "../types";

export const webSpeechAsr: AsrProvider = {
  info: { id: "web-speech", kind: "asr", label: "Nhận dạng của trình duyệt", description: "Chrome/Edge nhận dạng tiếng Việt ngay trên trình duyệt (gửi tiếng tới dịch vụ của trình duyệt). Dùng khi máy chủ chưa có ASR.", local: false, free: true, clientOnly: true },
  check: async () => ({ ok: true, detail: "Chạy trên trình duyệt người dùng (Chrome/Edge)" }),
  transcribe: async () => {
    throw new Error("Nhận dạng của trình duyệt chạy phía web, máy chủ không gọi được");
  },
};
