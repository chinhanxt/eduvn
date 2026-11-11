// Chỉ để xem thử gói ui/ khi dev: npx vite --config src/ui/preview/vite.preview.config.ts → /src/ui/preview/index.html
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("../../..", import.meta.url)),
  plugins: [react()],
  optimizeDeps: { entries: ["src/ui/preview/index.html"] },
  server: { port: Number(process.env.WEB_PORT ?? 5185), strictPort: true },
});
