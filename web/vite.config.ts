import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const api = "http://localhost:4310";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { "/api": api, "/dl": api, "/mcp": api } },
});
