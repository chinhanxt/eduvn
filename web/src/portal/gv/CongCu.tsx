import { Link, useLocation } from "react-router";
import { Icon } from "../../ui/Icon";
import { EmptyState } from "../../ui/components/States";
import { isItem } from "../../ui/shell/nav";
import { usePageMeta } from "../../ui/shell/AppShell";
import { PageHead } from "../../ui/shell/PageHead";
import { GV_FOOT, gvNav } from "./nav";
import "./gv.css";

/** Một câu mô tả việc mỗi công cụ làm (đủ ý, không quảng cáo). */
const DESC: Record<string, string> = {
  "/": "Việc cần làm, bài chờ chấm, học sinh cần quan tâm",
  "/lop-hoc": "Danh sách học sinh, giao bài, theo dõi, kết quả",
  "/cham-bai": "Quét phiếu, chấm bài viết tay, nhập tay, in phiếu",
  "/so-diem": "Điểm TT22/TT27, điểm danh, nhận xét",
  "/ngan-hang": "Câu hỏi theo chủ đề, mức độ, lời giải",
  "/de-thi": "Soạn đề từ ma trận CV 7991, trộn mã đề",
  "/bai-giang-ai": "Bài giảng có lời thoại, tương tác",
  "/giao-an": "Kế hoạch bài dạy CV 5512",
  "/bang-giang": "Viết, chiếu công thức và hình lên bảng",
  "/so-do": "Sơ đồ tư duy, lưu đồ, sơ đồ công thức",
  "/slide": "Slide PowerPoint từ giáo án",
  "/de-cuong": "Đề cương học phần đại học (CLO–PLO)",
  "/tro-choi": "Đố vui, thẻ lật từ ngân hàng hoặc đề",
  "/dau-truong": "Thi đấu trực tiếp cả lớp bằng mã PIN",
  "/giao-trinh": "Giáo trình sống cập nhật theo lớp",
  "/kho-tri-thuc": "Tài liệu nguồn cho gia sư AI trích dẫn",
  "/van-ban": "Thông báo, kế hoạch, biên bản đúng thể thức",
  "/ket-noi": "Dùng EDUVN trong Claude, ChatGPT",
};

/** /cong-cu — mọi công cụ của cổng GV theo nhóm thanh bên (thay trang chủ cũ Home + tools.ts). */
export function CongCu() {
  usePageMeta("Tất cả công cụ");
  const groups: { title: string; items: ReturnType<typeof gvNav> }[] = [{ title: "Hằng ngày", items: [] }];
  for (const n of gvNav()) {
    if (!isItem(n)) groups.push({ title: n.group, items: [] });
    else if (n.to !== "/cong-cu") groups[groups.length - 1]!.items.push(n);
  }
  groups.push({ title: "Kết nối", items: GV_FOOT });
  return (
    <>
      <PageHead title="Tất cả công cụ" />
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="sec-t">{g.title}</h2>
          <div className="tools-grid enter">
            {g.items.filter(isItem).map((n) => (
              <Link key={n.to} to={n.to}>
                <span className="lead"><Icon name={n.icon ?? "more"} size="sm" /></span>
                <span><b>{n.label}</b><small>{DESC[n.to] ?? ""}</small></span>
                {n.kbd && <kbd>{n.kbd}</kbd>}
              </Link>
            ))}
          </div>
        </section>
      ))}
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
