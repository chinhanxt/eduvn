import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "../../auth";
import { LegacySprite } from "../LegacySprite";
import { HocApp } from "./HocApp";
import "../../ui/styles/fonts.css";
import "../../ui/styles/tokens.css";
import "../../ui/styles/ui.css";
import "../../ui/styles/skin-hoc.css";
import "../../ui/styles/legacy.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <LegacySprite />
    {/* useTransitions=false: điều hướng vẽ đồng bộ để View Transitions chụp đúng trang mới (ui/shell/motion.ts) */}
    <BrowserRouter useTransitions={false}>
      <AuthProvider>
        <HocApp />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
