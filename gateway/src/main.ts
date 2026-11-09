import { loadConfig } from "./config";
import { buildGateway } from "./gateway";

const cfg = loadConfig();
const gw = await buildGateway(cfg);
try {
  await gw.app.listen({ host: cfg.HOST, port: cfg.PORT });
} catch (e) {
  await gw.close(); // cổng bận: tắt tiến trình agy rồi mới thoát
  throw e;
}
console.log(`Cổng AI EDUVN: http://${cfg.HOST}:${cfg.PORT} · ${cfg.AGY_PROCESSES} tiến trình agy · proxy ${cfg.AGY_PROXY_PORT}`);
const shutdown = async () => {
  await gw.close();
  process.exit(0);
};
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
