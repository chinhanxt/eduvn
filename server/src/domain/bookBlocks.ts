// Khử trùng tiêu đề giữa các khối của một trang giáo trình (thuần): các khối viết song song dễ đặt cùng một tiểu mục
// ("### Từ định nghĩa đến công thức nhân" hai lần). Tiêu đề lặp bị bỏ dòng tiêu đề (giữ nội dung).

const norm = (s: string) => s.normalize("NFC").toLowerCase().replace(/[*_`]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Tiêu đề Markdown (#..###) trong một khối. */
export function headingsOf(md: string): string[] {
  return [...md.matchAll(/^#{1,4}\s+(.+?)\s*#*\s*$/gm)].map((m) => (m[1] as string).trim());
}

/** Bỏ dòng tiêu đề đã xuất hiện ở khối trước (hoặc trùng tên chương). Trả markdown đã sửa và các tiêu đề đã bỏ. */
export function dedupeHeadings<T extends { markdown?: string }>(blocks: T[], chapterTitle = ""): { blocks: T[]; dropped: string[] } {
  const seen = new Set<string>(chapterTitle ? [norm(chapterTitle)] : []);
  const dropped: string[] = [];
  const out = blocks.map((b) => {
    if (!b.markdown) return b;
    const md = b.markdown.replace(/^#{1,4}\s+(.+?)\s*#*\s*$/gm, (line, h: string) => {
      const k = norm(h);
      if (!k) return line;
      if (seen.has(k)) {
        dropped.push(h.trim());
        return "";
      }
      seen.add(k);
      return line;
    });
    return { ...b, markdown: md.replace(/\n{3,}/g, "\n\n").trim() };
  });
  return { blocks: out, dropped };
}
