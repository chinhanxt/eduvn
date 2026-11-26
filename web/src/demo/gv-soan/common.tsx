/** Mảnh dùng chung của Gói A: đầu trang có nhãn mô phỏng, dải bước, sóng âm (nhịp chuyển động ở demo/kit/motion). */
import type { ReactNode } from "react";
import { usePageMeta } from "../../ui/shell/AppShell";
import { PageHead, type Primary } from "../../ui/shell/PageHead";
import { Icon } from "../../ui/Icon";
import type { Crumb } from "../../ui/shell/nav";
import { MockBadge } from "../kit";
import { wave } from "./data";
import "./soan.css";

export function Head({ title, tabs, primary, children, crumbs }: { title: string; tabs?: ReactNode; primary?: Primary; children?: ReactNode; crumbs?: Crumb[] }) {
  usePageMeta(title, crumbs);
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
