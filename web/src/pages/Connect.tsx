import { CodePill } from "../portal/gv/kit";
import { Icon } from "../ui/Icon";
import { Badge } from "../ui/components/Chip";
import { usePageMeta } from "../ui/shell/AppShell";
import { PageHead } from "../ui/shell/PageHead";

const STEPS = [
  ["Claude", "Cài đặt → Connectors → Add custom connector → dán địa chỉ → đăng nhập EDUVN."],
  ["ChatGPT", "Settings → Connectors (chế độ nhà phát triển) → Create → dán địa chỉ → đăng nhập EDUVN."],
  ["Thử", "Nhắn: “Tạo đề 15 phút Địa lí 12 chủ đề Khí hậu Việt Nam, 2 mã đề” — đề hiện ở mục Đề thi."],
] as const;
const CAN = ["Soạn đề", "Câu hỏi", "Giáo án", "Văn bản", "Xem lớp", "Kết quả"];

/** /ket-noi — kết nối EDUVN với trợ lý AI qua MCP: hình luồng kết nối, địa chỉ (chép có toast), các bước, kênh sắp có. */
export function Connect() {
  usePageMeta("Kết nối AI");
  const url = `${window.location.origin}/mcp`;
  return (
    <>
      <PageHead title="Kết nối AI" />
      <section className="cn-hero" aria-label="Claude · ChatGPT">
        <div className="cn-flow" aria-hidden="true">
          <div className="cn-apps"><span>Claude</span><span>ChatGPT</span></div>
          <svg className="cn-wire" viewBox="0 0 120 60" preserveAspectRatio="none"><path d="M0 14 C60 14 60 30 120 30 M0 46 C60 46 60 30 120 30" /><circle r="3"><animateMotion dur="2.4s" repeatCount="indefinite" path="M0 14 C60 14 60 30 120 30" /></circle></svg>
          <div className="cn-core"><span className="mark"><Icon name="cap" /></span><b>EDUVN</b><div className="cn-can">{CAN.map((c) => <i key={c}>{c}</i>)}</div></div>
        </div>
        <div className="cn-body">
          <h2>Trợ lý AI làm việc trong EDUVN</h2>
          <div className="cn-url">
            <span className="lbl-sm">Địa chỉ máy chủ MCP <Badge tone="ok">Sẵn sàng</Badge></span>
            <span data-testid="mcp-url"><CodePill code={url} label="Địa chỉ MCP" className="url" /></span>
          </div>
          <ol className="connect-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}><span className="n num">{i + 1}</span><span><b>{t}</b><br />{d}</span></li>
            ))}
          </ol>
          <p className="caption">Trợ lý chỉ làm được việc tài khoản của cô/thầy được phép.</p>
        </div>
      </section>
      <section className="cn-more" aria-label="Kênh khác">
        <h3 className="gt-sec">Kênh khác</h3>
        <ul className="rows">
          <li><span className="lead"><Icon name="bot" size="sm" /></span><div className="g"><b>Zalo</b><small>Nhắc hạn, gửi kết quả cho phụ huynh</small></div><Badge tone="warn">Sắp có</Badge></li>
          <li><span className="lead"><Icon name="mail" size="sm" /></span><div className="g"><b>Thư điện tử</b><small>Báo cáo tuần cho tổ chuyên môn</small></div><Badge tone="warn">Sắp có</Badge></li>
        </ul>
      </section>
    </>
  );
}
