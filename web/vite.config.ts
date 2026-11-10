import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const api = process.env.API_URL ?? "http://localhost:4310";

export default defineConfig({
  plugins: [react()],
  server: { port: Number(process.env.WEB_PORT ?? 5173), strictPort: true, proxy: { "/api": api, "/dl": api, "/mcp": api, "/vendor": api } },
});
