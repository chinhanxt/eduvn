import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProviderService } from "../../providers/service";
import type { Actor } from "../../service";

export type ProviderRouteCtx = { providers: ProviderService; authenticate: (req: FastifyRequest) => Promise<Actor> };

const BIG = { bodyLimit: 36 * 1024 * 1024 };

/** /api/nha-cung-cap/* (năng lực, cấu hình, kiểm tra, thử, thư viện giọng) + /api/tieng-noi/* (đọc, nhận dạng giọng nói). */
export function registerProviderRoutes(app: FastifyInstance, { providers, authenticate }: ProviderRouteCtx): void {
  app.get("/api/nha-cung-cap/kha-nang", async (req) => providers.capabilities(await authenticate(req)));
  app.get("/api/nha-cung-cap/cau-hinh", async (req) => providers.config(await authenticate(req)));
  app.put("/api/nha-cung-cap/cau-hinh", async (req) => providers.saveConfig(await authenticate(req), req.body));
  app.post("/api/nha-cung-cap/kiem-tra", async (req) => providers.check(await authenticate(req), req.body));
  app.post("/api/nha-cung-cap/thu", BIG, async (req) => providers.tryProvider(await authenticate(req), req.body));

  app.get("/api/nha-cung-cap/giong", async (req) => providers.listVoices(await authenticate(req)));
  app.post("/api/nha-cung-cap/giong", BIG, async (req, reply) => reply.code(201).send(await providers.addVoice(await authenticate(req), req.body)));
  app.delete<{ Params: { id: string } }>("/api/nha-cung-cap/giong/:id", async (req, reply) => {
    await providers.removeVoice(await authenticate(req), req.params.id);
    return reply.code(204).send();
  });
  app.get<{ Params: { id: string } }>("/api/nha-cung-cap/giong/:id/mau", async (req, reply) => {
    const wav = await providers.voiceSample(await authenticate(req), req.params.id);
    return reply.header("content-type", "audio/wav").header("cache-control", "private, max-age=3600").send(wav);
  });

  app.post("/api/tieng-noi/doc", async (req, reply) => {
    const r = await providers.speak(await authenticate(req), req.body);
    return reply.header("content-type", "audio/mpeg").header("cache-control", "private, max-age=86400").header("x-tts-provider", r.provider).header("x-tts-cache", r.cached ? "hit" : "miss").send(r.mp3);
  });
  app.post("/api/tieng-noi/nhan-dang", BIG, async (req) => providers.transcribe(await authenticate(req), req.body));
}
