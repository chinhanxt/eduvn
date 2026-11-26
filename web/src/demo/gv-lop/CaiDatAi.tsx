import { useState } from "react";
import { useSearchParams } from "react-router";
import { SCHOOL, useTick, useTween } from "../kit";
import { Icon } from "../../ui/Icon";
import { Head } from "./parts";

/** Cài đặt AI & hệ thống: bản đồ luồng dữ liệu thiết bị → máy chủ AI tại trường → cổng AI :4340.
 *  Mỗi việc chọn chạy tại trường hay qua cổng; "Thử rút mạng" thì đường lên mây đứt, việc tự dồn về máy trường. */
type Where = "truong" | "cong";
type Task = { id: string; name: string; where: Where; lite?: string };
const TASKS0: Task[] = [
  { id: "gia-su", name: "Trò chuyện gia sư", where: "truong" },
  { id: "ho-so", name: "Hồ sơ AI của HS", where: "truong" },
  { id: "giong", name: "Nhận giọng nói", where: "truong" },
  { id: "doc-file", name: "Đọc mọi file", where: "truong" },
  { id: "tim-web", name: "Tìm web", where: "truong", lite: "kho tri thức trường" },
  { id: "soan", name: "Soạn bài, video", where: "cong", lite: "xếp hàng chờ mạng" },
  { id: "cham", name: "Chấm tự luận", where: "cong", lite: "mô hình nhẹ tại trường" },
];
const SERVICES = [
  { name: "Nhận giọng", note: "Whisper · tiếng Việt" },
  { name: "Đọc mọi file", note: "PDF, Word, ảnh, viết tay" },
  { name: "Tìm web", note: "SearXNG · không theo dõi" },
  { name: "AI tại trường", note: "mô hình 14B · 1 GPU" },
  { name: "Cổng AI", note: ":4340 · việc nặng" },
];
const DEV = [90, 170, 250];
const linkD = (y: number) => `M150 ${y} C290 ${y} 300 170 392 170`;
const CLOUD = "M508 170 H712";

export function CaiDatAi() {
  const [sp] = useSearchParams();
  const [off, setOff] = useState(sp.get("mang") === "yeu");
  const [tasks, setTasks] = useState(TASKS0);
  const t = useTick(1200);
  const jit = (base: number, amp: number, k: number) => base + Math.round(Math.sin(t * 1.7 + k) * amp);
  const cloudN = tasks.filter((x) => x.where === "cong").length;
  const gpu = useTween(off ? 81 : jit(58, 6, 1), 600);
  const lat = off ? jit(42, 4, 2) : jit(180, 25, 3);
  const queue = off ? 2 : 0;
  const flip = (id: string) => setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, where: x.where === "truong" ? "cong" : "truong" } : x)));

  return (
    <div className="page gl gl-sys">
      <Head title="Cài đặt AI" primary={{ label: off ? "Cắm lại mạng" : "Thử rút mạng", icon: off ? "plug" : "wifioff", onClick: () => setOff((o) => !o) }} />

      <div className={off ? "gl-net off" : "gl-net"}>
        <svg viewBox="0 52 900 272" className="gl-net-svg" role="img" aria-label="Luồng dữ liệu: thiết bị, máy chủ AI tại trường, cổng AI">
          {DEV.map((y) => (
            <path key={y} d={linkD(y)} className="gl-net-l" />
          ))}
          <path d={CLOUD} className="gl-net-l cloud" />
          {off && (
            <g className="gl-net-cut">
              <rect x="596" y="160" width="20" height="20" />
              <path d="M600 156 l-6 28 M618 156 l-6 28" />
            </g>
          )}
          {DEV.map((y, i) =>
            [0, 1].map((k) => (
              <circle key={`${y}-${k}`} r="4.5" className="gl-pk" style={{ offsetPath: `path('${linkD(y)}')`, animationDelay: `${i * 0.5 + k * 1.1}s` }} />
            )),
          )}
          {!off &&
            Array.from({ length: Math.max(1, cloudN) }, (_, k) => (
              <circle key={`c${k}`} r="4.5" className="gl-pk cloud" style={{ offsetPath: `path('${CLOUD}')`, animationDelay: `${k * 0.7}s` }} />
            ))}

          {/* thiết bị */}
          {DEV.map((y, i) => (
            <g key={y} transform={`translate(${108} ${y})`} className="gl-dev">
              {i === 1 ? <rect x="-20" y="-28" width="34" height="56" rx="6" /> : <path d="M-34 -20h56v34h-56z M-42 18h72" />}
            </g>
          ))}
          <text x="104" y="306" className="gl-net-t" textAnchor="middle">{`${SCHOOL.students.toLocaleString("vi-VN")} HS · ${SCHOOL.teachers} GV`}</text>

          {/* máy chủ tại trường */}
          <g className="gl-srv">
            <rect x="392" y="104" width="116" height="132" rx="14" />
            {[0, 1, 2].map((r) => (
              <g key={r}>
                <path d={`M410 ${134 + r * 30}h80`} className="gl-srv-ln" />
                <circle cx="494" cy={134 + r * 30} r="3.5" className="gl-srv-led" style={{ animationDelay: `${r * 0.3}s` }} />
              </g>
            ))}
            <g transform="translate(450 236)" className="gl-lock">
              <circle r="16" />
              <path d="M-5 -1v-4a5 5 0 0 1 10 0v4M-7 -1h14v10h-14z" />
            </g>
          </g>
          <text x="450" y="290" className="gl-net-t strong" textAnchor="middle">Máy chủ AI tại trường</text>
          <text x="450" y="310" className="gl-net-t" textAnchor="middle">Dữ liệu HS không rời trường</text>

          {/* cổng AI */}
          <g className="gl-cloud" transform="translate(790 170)">
            <path d="M-62 22 a26 26 0 0 1 6 -50 a34 34 0 0 1 64 -8 a28 28 0 0 1 48 24 a22 22 0 0 1 -6 34z" />
          </g>
          <text x="790" y="236" className="gl-net-t strong" textAnchor="middle">Cổng AI :4340</text>
          <text x="790" y="256" className="gl-net-t" textAnchor="middle">{off ? "Mất kết nối" : "Việc nặng, tự động"}</text>
        </svg>
        <div className="gl-net-stat">
          <Stat label="GPU trường" v={`${Math.round(gpu)}%`} />
          <Stat label="Độ trễ" v={`${lat} ms`} />
          <Stat label="Hàng đợi" v={String(queue)} warn={queue > 0} />
          <Stat label="Mạng" v={off ? "Rút" : "Ổn định"} warn={off} />
        </div>
      </div>

      <div className="gl-sys-grid">
        <section aria-label="Việc chạy ở đâu">
          <h2 className="gl-sys-h">Việc chạy ở đâu</h2>
          <ul className="gl-tasks">
            {tasks.map((x) => {
              const rerouted = off && x.where === "cong";
              return (
                <li key={x.id} className={rerouted ? "re" : undefined}>
                  <span className="gl-task-n">{x.name}</span>
                  <button type="button" className={`gl-route ${x.where}`} onClick={() => flip(x.id)} aria-label={`${x.name}: ${x.where === "truong" ? "tại trường" : "cổng AI"}, bấm để đổi`}>
                    <span>Tại trường</span>
                    <span>Cổng AI</span>
                    <i />
                  </button>
                  <span className="gl-task-note">{rerouted ? <><Icon name="repeat" size="sm" /> {x.lite ?? "chạy tại trường"}</> : off && x.lite && x.where === "truong" && x.id === "tim-web" ? x.lite : ""}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-label="Dịch vụ">
          <h2 className="gl-sys-h">Dịch vụ</h2>
          <ul className="gl-svcs">
            {SERVICES.map((s) => {
              const down = off && s.name === "Cổng AI";
              return (
                <li key={s.name} className={down ? "down" : undefined}>
                  <i />
                  <b>{s.name}</b>
                  <span>{down ? "chờ mạng · 2 việc xếp hàng" : s.note}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, v, warn }: { label: string; v: string; warn?: boolean }) {
  return (
    <div className={warn ? "gl-stat warn" : "gl-stat"}>
      <span>{label}</span>
      <b className="num">{v}</b>
    </div>
  );
}
