import { useState } from "react";
import { Icon } from "../Icon";

export function Connect() {
  const url = `${window.location.origin}/mcp`;
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <>
      <h1>Kết nối</h1>
      <div className="connect">
        <div className="card">
          <h2 style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="ic violet" style={{ margin: 0, width: 38, height: 38 }}><Icon name="spark" /></span>Claude · ChatGPT
          </h2>
          <div className="field" onClick={copy} role="button">
            <span data-testid="mcp-url">{url}</span>
            <span className="copy"><Icon name={copied ? "check" : "copy"} /></span>
          </div>
        </div>
        <div className="card">
          <h2 style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="ic green" style={{ margin: 0, width: 38, height: 38 }}><Icon name="bot" /></span>Zalo
          </h2>
          <div className="hint" style={{ padding: "28px 0" }}><span className="tag amber">Sắp có</span></div>
        </div>
      </div>
    </>
  );
}
