import { useHsSession } from "../portal/hoc/HocShell";
import { MyAssignments } from "./MyAssignments";
import { StudentLogin } from "./StudentLogin";

/** /hoc/bai-tap: có phiên mã lớp → danh sách bài; chưa có → vào lớp (mã lớp + PIN, thẻ QR, tài khoản + mã tham gia). */
export function BaiTap() {
  const session = useHsSession();
  // saveSession() phát sự kiện phiên → khung + trang này tự vẽ lại, không cần giữ state riêng
  return session ? <MyAssignments /> : <StudentLogin onLogin={() => undefined} />;
}
