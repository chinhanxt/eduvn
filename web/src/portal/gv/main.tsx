import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "../../auth";
import { Sprite } from "../../Icon";
import { GvApp } from "./GvApp";
import "../../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Sprite />
    <BrowserRouter basename="/gv">
      <AuthProvider>
        <GvApp />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
