import { usePageMeta } from "../../ui/shell/AppShell";
import { useLearner } from "../../portal/hoc/HocShell";
import { hocToolMap } from "../../portal/hoc/nav";
import { ToolMap } from "../kit/ToolMap";
import "./hoc-demo.css";

/** /hoc/tat-ca — bản đồ mọi chức năng cổng Học (cùng kiểu trang Tất cả công cụ của GV). */
export function TatCa() {
  usePageMeta("Tất cả công cụ");
  const { auth } = useLearner();
  return (
    <div className="dm">
      <header className="dm-head">
        <h1 className="dm-title">Tất cả công cụ</h1>
      </header>
      <ToolMap groups={hocToolMap(auth === "user")} hint={["gia sư", "ôn thi", "sổ tay", "lịch"]} />
    </div>
  );
}
