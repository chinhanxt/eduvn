import { Link, useLocation } from "react-router";
import { EmptyState } from "../../ui/components/States";
import { usePageMeta } from "../../ui/shell/AppShell";
import { PageHead } from "../../ui/shell/PageHead";
import { ToolMap } from "../../demo/kit/ToolMap";
import { GV_TOOLS } from "./nav";
import "./gv.css";

/** /cong-cu — bản đồ mọi chức năng cổng GV theo nhóm (màn thật + mô phỏng chung nhóm), có ô tìm không dấu. */
export function CongCu() {
  usePageMeta("Tất cả công cụ");
  return (
    <>
      <PageHead title="Tất cả công cụ" />
      <ToolMap groups={GV_TOOLS} hint={["chấm", "đề", "slide", "giấy tờ", "mô phỏng"]} />
    </>
  );
}

const SAP_CO: Record<string, { name: string; icon: string; text: string }> = {
  "/video": { name: "Video bài giảng", icon: "video", text: "Dựng video bài giảng từ giáo án và bảng giảng. Trong lúc chờ, dùng Bài giảng AI để có bài giảng có lời thoại." },
  "/to-chuc": { name: "Tổ chức", icon: "org", text: "Quản lý trường, tổ chuyên môn và phân quyền giáo viên. Hiện tổ chức được tạo khi đăng nhập lần đầu." },
};
/** Công cụ đang làm (/video, /to-chuc): một câu nói rõ + đường về. */
export function SapCo() {
  const { pathname } = useLocation();
  const { name, icon, text } = SAP_CO[pathname] ?? SAP_CO["/video"]!;
  usePageMeta(name);
  return (
    <>
      <PageHead title={name} />
      <section className="pane">
        <EmptyState icon={icon} title={`${name} đang được làm`} text={text} action={<Link className="btn sm" to="/cong-cu">Xem công cụ khác</Link>} />
      </section>
    </>
  );
}
