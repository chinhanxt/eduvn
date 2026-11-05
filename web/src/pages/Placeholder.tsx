import { Icon } from "../Icon";
import type { Tool } from "../tools";

export function Placeholder({ tool }: { tool: Tool }) {
  return (
    <div className="card soon-page">
      <div className={`ic ${tool.color}`}><Icon name={tool.icon} /></div>
      <h1 style={{ margin: "0 0 10px" }}>{tool.name}</h1>
      <span className="pill" style={{ position: "static", display: "inline-block", fontSize: 12, padding: "3px 12px", borderRadius: 999, background: "#f2f3f7", color: "var(--muted)" }}>{tool.pill}</span>
    </div>
  );
}
