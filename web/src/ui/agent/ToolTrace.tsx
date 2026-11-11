import { useState } from "react";
import { Icon } from "../Icon";
import { argsPreview, seconds, type ToolItem } from "./state";

/** Dấu vết công cụ: mỗi lần gọi một dòng (trạng thái, tên, tham số chính, kết quả, thời gian); bấm để xem tham số đầy đủ. */
export function ToolTrace({ items }: { items: ToolItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="ag-tools" aria-label="Công cụ đã dùng">
      {items.map((t) => (
        <ToolRow key={t.callId} t={t} />
      ))}
    </ul>
  );
}

function ToolRow({ t }: { t: ToolItem }) {
  const [open, setOpen] = useState(false);
  const preview = argsPreview(t.args);
  const icon = t.status === "running" ? "loader" : t.status === "ok" ? "checkc" : "alert";
  return (
    <li className={`ag-tool is-${t.status}`}>
      <button type="button" className="ag-tool-hd" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name={icon} size="sm" className={t.status === "running" ? "ag-spin" : undefined} />
        <b>{t.title}</b>
        {preview && <span className="ag-tool-arg">“{preview}”</span>}
        <span className="ag-tool-sum">{t.status === "running" ? (t.progress ?? "Đang chạy…") : t.summary}</span>
        {t.ms !== undefined && t.status !== "running" && <span className="ag-tool-ms num">{seconds(t.ms)}</span>}
      </button>
      {open && <pre className="ag-tool-args">{JSON.stringify(t.args, null, 2)}</pre>}
    </li>
  );
}
