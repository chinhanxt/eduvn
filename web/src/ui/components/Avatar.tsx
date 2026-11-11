/** Chữ viết tắt từ họ tên Việt: "Nguyễn Minh Anh" → "MA" (tên đệm cuối + tên), "Cô Lan Anh" → "LA". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").replace(/^(cô|thầy|cô giáo|thầy giáo)\s+/i, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const pick = words.length >= 2 ? [words[words.length - 2]!, words[words.length - 1]!] : [words[0]!];
  return pick.map((w) => w.charAt(0).toLocaleUpperCase("vi")).join("");
}

export function Avatar({ name, size = "md", title }: { name: string | null | undefined; size?: "sm" | "md"; title?: string }) {
  return (
    <span className={size === "sm" ? "avatar sm" : "avatar"} title={title ?? name ?? undefined} aria-hidden={title ? undefined : true}>
      {initials(name)}
    </span>
  );
}
