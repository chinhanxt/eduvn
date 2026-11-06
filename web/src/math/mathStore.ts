// web/src/math/mathStore.ts
import type { MathfieldElement } from "mathlive";

type Active = { mf: MathfieldElement; exit: () => void } | null;
let active: Active = null;
const subs = new Set<() => void>();

/** Ô toán đang mở — bàn phím toán dùng chung đọc từ đây. */
export const mathStore = {
  get: (): Active => active,
  set(v: Active) {
    active = v;
    for (const f of subs) f();
  },
  subscribe(cb: () => void): () => void {
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  },
};
