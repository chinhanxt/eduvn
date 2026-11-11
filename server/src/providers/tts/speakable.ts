/** Bỏ ký hiệu LaTeX/markdown mà giọng đọc không đọc được. */
export function speakable(text: string): string {
  return text
    .replace(/\$\$?([^$]+)\$\$?/g, (_m, f: string) => f.replace(/\\(?:frac|dfrac)\{([^}]*)\}\{([^}]*)\}/g, "$1 phần $2").replace(/\\[a-zA-Z]+/g, " ").replace(/\^2/g, " bình phương").replace(/\^3/g, " lập phương").replace(/\^\{?([^}\s]+)\}?/g, " mũ $1").replace(/[{}]/g, ""))
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
