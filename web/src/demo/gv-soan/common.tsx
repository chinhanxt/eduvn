/** Mảnh dùng chung của Gói A: đầu trang có nhãn mô phỏng, dải bước, sóng âm, hẹn giờ theo pha. */
import { type ReactNode, useEffect, useState } from "react";
import { usePageMeta } from "../../ui/shell/AppShell";
import { PageHead, type Primary } from "../../ui/shell/PageHead";
import { Icon } from "../../ui/Icon";
import { MockBadge } from "../kit";
import { wave } from "./data";
import "./soan.css";

export function Head({ title, tabs, primary, children }: { title: string; tabs?: ReactNode; primary?: Primary; children?: ReactNode }) {
  usePageMeta(title);
  return (
    <PageHead
      title={
        <span className="gs-h1">
          {title}
          <MockBadge />
        </span>
      }
      tabs={tabs}
      primary={primary}
    >
      {children}
    </PageHead>
  );
}

/** Chạy tuần tự các pha: trả về chỉ số pha hiện tại (0 → durations.length). Đổi `key` để chạy lại. */
export function usePhases(durations: number[], run: boolean, key?: unknown) {
  const [i, setI] = useState(0);
  const sig = durations.join(",");
  useEffect(() => {
    setI(0);
    if (!run) return;
    const ts: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    durations.forEach((ms, k) => {
      acc += ms;
      ts.push(setTimeout(() => setI(k + 1), acc));
    });
    return () => ts.forEach(clearTimeout);
  }, [sig, run, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return i;
}

/** Đếm 0 → n đều đặn trong `ms` (số đếm lên, hàng hiện dần). */
export function useCount(n: number, ms: number, run = true, key?: unknown) {
  const [c, setC] = useState(0);
  useEffect(() => {
    setC(0);
    if (!run || n <= 0) return;
    let k = 0;
    const t = setInterval(() => {
      k++;
      setC(k);
      if (k >= n) clearInterval(t);
    }, ms / n);
    return () => clearInterval(t);
  }, [n, ms, run, key]);
  return c;
}

export type RailStep = { label: string; icon: string };
/** Dải bước dọc (desktop) / ngang (điện thoại): xong ✓ · đang làm chấm sáng · chưa tới mờ. */
export function Rail({ steps, at, onPick }: { steps: RailStep[]; at: number; onPick?: (i: number) => void }) {
  return (
    <ol className="gs-rail" aria-label="Các bước">
      {steps.map((s, i) => {
        const st = i < at ? "done" : i === at ? "now" : "todo";
        return (
          <li key={s.label} data-st={st}>
            <button type="button" disabled={!onPick || i > at} onClick={() => onPick?.(i)} aria-current={st === "now" ? "step" : undefined}>
              <span className="gs-rail-dot">{st === "done" ? <Icon name="check" size="sm" /> : <Icon name={s.icon} size="sm" />}</span>
              <span className="gs-rail-l">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Sóng âm: `live` = đang thu/đọc (cột nhảy), `progress` 0–1 tô phần đã đọc. */
export function Wave({ n = 48, seed = 3, live, progress, className }: { n?: number; seed?: number; live?: boolean; progress?: number; className?: string }) {
  const bars = wave(n, seed);
  return (
    <div className={["gs-wave", live && "live", className].filter(Boolean).join(" ")} aria-hidden="true">
      {bars.map((h, i) => (
        <i key={i} style={{ ["--h" as string]: h, ["--k" as string]: i % 7 }} className={progress !== undefined && i / n <= progress ? "on" : undefined} />
      ))}
    </div>
  );
}
