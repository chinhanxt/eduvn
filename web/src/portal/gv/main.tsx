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
    <BrowserRouter basename="/gv">
      <AuthProvider>
        <GvApp />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
