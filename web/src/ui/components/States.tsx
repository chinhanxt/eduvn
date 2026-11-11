import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { useState } from "react";
import { SkeletonRows } from "./Skeleton";

/** Nút "Thử lại" gọn (không kéo cả Button vào JS lần đầu): khoá trong lúc thử, chống bấm lặp. */
function RetryButton({ onRetry, icon }: { onRetry: () => unknown; icon?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn sm"
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        void Promise.resolve(onRetry()).finally(() => setBusy(false));
      }}
    >
      {icon && <Icon name="refresh" size="sm" />}
      <span>Thử lại</span>
    </button>
  );
}

/** Trống / lọc không ra: một câu chuyện gì xảy ra + một việc làm tiếp. */
export function EmptyState({ icon = "inbox", title, text, action }: { icon?: string; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="art">
        <Icon name={icon} size="lg" />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div className="acts">{action}</div>}
    </div>
  );
}

/** Lỗi tải: nói rõ lỗi gì, phần khác của trang vẫn dùng được, có Thử lại (khoá khi đang thử). */
export function ErrorState({ title = "Không tải được", text, status, onRetry }: { title?: ReactNode; text?: ReactNode; status?: number; onRetry?: () => unknown }) {
  return (
    <div className="empty err" role="alert">
      <div className="art">
        <Icon name="alert" size="lg" />
      </div>
      <h3>{title}</h3>
      <p>{text ?? `Máy chủ không phản hồi${status ? ` (mã ${status})` : ""}. Dữ liệu khác trên trang vẫn dùng được.`}</p>
      {onRetry && (
        <div className="acts">
          <RetryButton onRetry={onRetry} icon />
        </div>
      )}
    </div>
  );
}

/** Băng mất mạng (dưới thanh trên). savedAt = lúc dữ liệu đang hiện được lưu. */
export function OfflineBanner({ savedAt, onRetry }: { savedAt?: Date | null; onRetry?: () => unknown }) {
  const t = savedAt ? savedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <div className="banner" role="status">
      <Icon name="offline" size="sm" />
      <span>
        <b>Mất kết nối.</b> {t ? `Đang hiện dữ liệu đã lưu lúc ${t}; ` : ""}thay đổi sẽ tự gửi khi có mạng.
      </span>
      {onRetry && (
        <RetryButton onRetry={onRetry} />
      )}
    </div>
  );
}

export type RegionStatus = "ok" | "dang-tai" | "trong" | "loi";
/**
 * Hợp đồng vùng dữ liệu (design system §7): ok | dang-tai (skeleton cùng hình) | trong | loi.
 * stale = đang làm tươi nền: giữ bản cũ mờ 55%, không nháy skeleton.
 */
export function Region({ status, stale, skeleton, skeletonRows = 4, empty, error, onRetry, label, className, minHeight, children, as: Tag = "section" }: {
  status: RegionStatus;
  stale?: boolean;
  skeleton?: ReactNode;
  skeletonRows?: number;
  empty?: { icon?: string; title: ReactNode; text?: ReactNode; action?: ReactNode };
  error?: { status?: number; text?: ReactNode };
  onRetry?: () => unknown;
  label: string;
  className?: string;
  minHeight?: number;
  children?: ReactNode;
  as?: "section" | "div" | "aside";
}) {
  const body =
    status === "dang-tai" ? (skeleton ?? <SkeletonRows rows={skeletonRows} />) : status === "trong" ? <EmptyState {...(empty ?? { title: "Chưa có dữ liệu" })} /> : status === "loi" ? <ErrorState status={error?.status} text={error?.text} onRetry={onRetry} /> : children;
  return (
    <Tag className={[className, stale && status === "ok" && "is-stale"].filter(Boolean).join(" ") || undefined} aria-label={label} aria-busy={status === "dang-tai" || stale || undefined} data-region={status} style={minHeight ? { minHeight } : undefined}>
      {body}
    </Tag>
  );
}
