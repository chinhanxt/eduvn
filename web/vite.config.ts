import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Connect, type Plugin } from "vite";
import { entryFor } from "./src/portal/entries";

const here = fileURLToPath(new URL(".", import.meta.url));
const api = process.env.API_URL ?? "http://localhost:4310";

/** Deep link /gv/* → gv.html, /hoc/* → hoc.html (dev + preview); tệp có đuôi (asset) và module Vite đi tiếp. */
export function portalFallback(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const url = req.url ?? "/";
    const path = url.split("?")[0] ?? "/";
    const entry = entryFor(path);
    if (entry !== "index.html" && !/\.[a-z0-9]+$/i.test(path) && !path.includes("/@") && (req.headers.accept ?? "").includes("text/html")) {
      req.url = `/${entry}${url.slice(path.length)}`;
    }
    next();
  };
  return {
    name: "eduvn-portal-fallback",
    configureServer: (s) => void s.middlewares.use(rewrite),
    configurePreviewServer: (s) => void s.middlewares.use(rewrite),
  };
}

export default defineConfig({
  plugins: [react(), portalFallback()],
  build: {
    rollupOptions: {
      input: { index: resolve(here, "index.html"), gv: resolve(here, "gv.html"), hoc: resolve(here, "hoc.html") },
    },
  },
  server: { port: Number(process.env.WEB_PORT ?? 5173), strictPort: true, proxy: { "/api": api, "/dl": api, "/mcp": api, "/vendor": api, "/chia-se": api } },
  preview: { proxy: { "/api": api, "/dl": api, "/mcp": api, "/vendor": api, "/chia-se": api } },
});
