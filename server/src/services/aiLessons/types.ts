import type { CompleteScene } from "@openmaic/generation";

type Act = NonNullable<CompleteScene["actions"]>[number];
/** Hành động đã lưu: speech có thêm file âm thanh + thời lượng (ms) do TTS tạo. */
export type StoredAction = Act & { audioFile?: string; durationMs?: number };
export type StoredScene = Omit<CompleteScene, "actions"> & { actions?: StoredAction[] };

/** Cảnh slide dạng ngắn gọn để các hàm xuất/trình phát dùng chung. */
export function speechOf(s: StoredScene): { id: string; text: string; audioFile?: string; durationMs?: number }[] {
  return (s.actions ?? []).flatMap((a) => (a.type === "speech" ? [{ id: a.id, text: a.text, audioFile: a.audioFile, durationMs: a.durationMs }] : []));
}

/** Ước lượng thời lượng đọc khi chưa có file âm thanh: ~ 14 ký tự/giây tiếng Việt, tối thiểu 1,5 giây. */
export function estimateMs(text: string): number {
  return Math.max(1500, Math.round((text.length / 14) * 1000));
}
