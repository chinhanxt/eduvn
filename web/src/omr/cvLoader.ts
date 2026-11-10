// Nạp OpenCV.js như script thường (không import()): module/namespace của opencv-js có `then`
// nên import() và CJS interop của Vite sẽ coi nó là thenable. Cách này cũng giữ ~13 MB ngoài đồ thị JS.
import cvUrl from "@techstark/opencv-js/dist/opencv.js?url";

type Box = { cv: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

let boxed: Promise<Box> | null = null;

/** Trả hộp {cv} — không bao giờ resolve thẳng bằng đối tượng cv. */
export function readyCv(): Promise<Box> {
  boxed ??= new Promise<Box>((resolve, reject) => {
    const w = window as unknown as { cv?: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
    const wait = () => {
      const c = w.cv;
      if (c?.Mat) return resolve({ cv: c });
      if (c instanceof Promise) return void c.then((v: unknown) => resolve({ cv: v }), reject);
      if (c) c.onRuntimeInitialized = () => resolve({ cv: c });
      else setTimeout(wait, 50);
    };
    const s = document.createElement("script");
    s.src = cvUrl;
    s.async = true;
    s.onload = wait;
    s.onerror = () => reject(new Error("Không tải được OpenCV.js"));
    document.head.appendChild(s);
  });
  return boxed;
}
