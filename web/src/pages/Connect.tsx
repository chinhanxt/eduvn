import { CodePill } from "../portal/gv/kit";
import { Icon } from "../ui/Icon";
import { Badge } from "../ui/components/Chip";
import { usePageMeta } from "../ui/shell/AppShell";
import { PageHead } from "../ui/shell/PageHead";

const STEPS = [
  ["Claude", "Cài đặt → Connectors → Add custom connector → dán địa chỉ bên trên → đăng nhập EDUVN."],
  ["ChatGPT", "Settings → Connectors (chế độ nhà phát triển) → Create → dán địa chỉ → đăng nhập EDUVN."],
  ["Thử", "Nhắn: “Tạo đề 15 phút Toán 10 chủ đề Hàm số bậc hai, 2 mã đề” — đề hiện ở mục Đề thi."],
] as const;

/** /ket-noi — kết nối EDUVN với trợ lý AI qua MCP: địa chỉ (chép có toast), các bước, kênh sắp có. */
export function Connect() {
  usePageMeta("Kết nối AI");
  const url = `${window.location.origin}/mcp`;
  return (
    <>
      <PageHead title="Kết nối AI" />
      <div className="split" style={{ marginTop: 0 }}>
        <section className="pane" aria-label="Claude · ChatGPT">
          <div className="ghd"><Icon name="spark" size="sm" /> Claude · ChatGPT <span className="n">giao thức MCP</span><span className="grow" /><Badge tone="ok">Sẵn sàng</Badge></div>
          <div className="fp-bd">
            <div>
              <span className="lbl-sm">Địa chỉ máy chủ MCP</span>
              <span data-testid="mcp-url"><CodePill code={url} label="Địa chỉ MCP" className="url" /></span>
            </div>
            <ol className="connect-steps">
              {STEPS.map(([t, d], i) => (
                <li key={t}><span className="n num">{i + 1}</span><span><b>{t}</b><br />{d}</span></li>
              ))}
            </ol>
            <p className="caption">Trợ lý chỉ làm được việc tài khoản của cô/thầy được phép: soạn đề, câu hỏi, giáo án, văn bản; xem lớp và kết quả.</p>
          </div>
        </section>
        <aside className="pane" aria-label="Kênh khác">
          <div className="ghd">Kênh khác</div>
          <ul className="rows">
            <li><span className="lead"><Icon name="bot" size="sm" /></span><div className="g"><b>Zalo</b><small>Nhắc hạn, gửi kết quả cho phụ huynh</small></div><Badge tone="warn">Sắp có</Badge></li>
            <li><span className="lead"><Icon name="mail" size="sm" /></span><div className="g"><b>Thư điện tử</b><small>Báo cáo tuần cho tổ chuyên môn</small></div><Badge tone="warn">Sắp có</Badge></li>
          </ul>
        </aside>
      </div>
    </>
  );
}
