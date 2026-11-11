import { Skeleton } from "../components/Skeleton";

/** Giữ chỗ khi đang tải code của trang: đầu trang + dải ô + danh sách (gần hình trang thật, không xô lệch khi hiện). */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "full" }) {
  if (variant === "full")
    return (
      <div className="page-skel full" role="status" aria-busy="true" aria-label="Đang tải">
        <Skeleton w="100%" h="100%" />
      </div>
    );
  return (
    <div className="page-skel" role="status" aria-busy="true" aria-label="Đang tải trang">
      <div className="ph">
        <Skeleton w={180} h={24} />
        <Skeleton w={96} h={30} style={{ marginLeft: "auto", borderRadius: 6 }} />
      </div>
      <div className="blk">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="row" key={i}>
            <Skeleton circle w={20} h={20} />
            <Skeleton w={`${[46, 62, 38, 54, 42, 58][i]}%`} h={12} />
            <Skeleton w={64} h={12} style={{ marginLeft: "auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
