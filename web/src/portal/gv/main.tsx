import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "../../auth";
import { LegacySprite } from "../LegacySprite";
import { GvApp } from "./GvApp";
import "../../ui/styles/fonts.css";
import "../../ui/styles/tokens.css";
import "../../ui/styles/ui.css";
import "../../ui/styles/skin-gv.css";
import "../../ui/styles/legacy.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <LegacySprite />
    {/* useTransitions=false: điều hướng vẽ đồng bộ để View Transitions chụp đúng trang mới (ui/shell/motion.ts) */}
    <BrowserRouter basename="/gv" useTransitions={false}>
      <AuthProvider>
        <GvApp />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
