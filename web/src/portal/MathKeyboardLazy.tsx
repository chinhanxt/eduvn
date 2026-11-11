import { lazy, Suspense, useSyncExternalStore } from "react";
import { mathStore } from "../math/mathStore";

const MathKeyboard = lazy(() => import("../math/MathKeyboard").then((m) => ({ default: m.MathKeyboard })));

/** Bàn phím toán chỉ tải (kèm MathLive) khi có ô toán đầu tiên được mở. */
let mathUsed = false;
export function LazyMathKeyboard() {
  const active = useSyncExternalStore(mathStore.subscribe, mathStore.get);
  if (active) mathUsed = true;
  if (!mathUsed) return null;
  return (
    <Suspense fallback={null}>
      <MathKeyboard />
    </Suspense>
  );
}
