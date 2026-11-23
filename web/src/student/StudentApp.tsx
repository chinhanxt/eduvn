import { useLocation } from "react-router";
import { useHsSession } from "../portal/hoc/HocShell";
import { MyAssignments } from "./MyAssignments";
import { HOC_PATH } from "./paths";
import { QrLogin, StudentLogin } from "./StudentLogin";

/** /hoc/bai-tap: có phiên mã lớp → danh sách bài; chưa có → vào lớp (mã lớp + PIN, thẻ QR, tài khoản + mã tham gia). /hoc/bai-tap/qr#token: đổi thẻ QR lấy phiên. */
export function BaiTap() {
  const session = useHsSession();
  if (useLocation().pathname.replace(/\/$/, "") === HOC_PATH.qr) return <QrLogin />;
  // saveSession() phát sự kiện phiên → khung + trang này tự vẽ lại, không cần giữ state riêng
  return session ? <MyAssignments /> : <StudentLogin onLogin={() => undefined} />;
}
