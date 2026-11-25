import "./demo.css";
/** Ảnh đại diện tròn: chữ cái đầu, màu riêng theo người (`hue` trong thế giới mẫu). `ring` = viền màu nhấn cổng. */
export function Face({ name, hue, size = 40, ring, className }: { name: string; hue: number; size?: number; ring?: boolean; className?: string }) {
  const ini = name.split(/\s+/).slice(-2).map((w) => w[0]).join("").toLocaleUpperCase("vi");
  return (
    <span className={["demo-face", ring && "ring", className].filter(Boolean).join(" ")} style={{ width: size, height: size, fontSize: size * 0.38, ["--h" as string]: hue }} aria-hidden="true">
      {ini}
    </span>
  );
}
