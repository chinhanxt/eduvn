import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "../../auth";
import { Sprite } from "../../Icon";
import { HocApp } from "./HocApp";
import "../../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Sprite />
    <BrowserRouter>
      <AuthProvider>
        <HocApp />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
