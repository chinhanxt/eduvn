import type { AgentPool } from "../acp/pool";
import { RpcError } from "../acp/rpc";
import { type Backend, type BackendInput, type BackendOutput, type ContentPart, GatewayError, clientClosed, textOf } from "../types";

/** Lỗi từ agent → mã HTTP có nghĩa. -32010 là quá giờ của riêng cổng (504); -32000 là lỗi của ACP (vd auth_required) → 502. */
export function toGatewayError(e: unknown): Error {
  if (e instanceof GatewayError) return e;
  if (!(e instanceof RpcError)) return new GatewayError(502, "upstream_error", (e as Error).message);
  if (e.code === -32010) return new GatewayError(504, "timeout", e.message);
  if (e.code === -32000) return new GatewayError(502, "upstream_error", e.message);
  if (e.code === -32001) return new GatewayError(503, "ai_unavailable", e.message);
  if (e.code === -32002) return new GatewayError(409, "busy", e.message);
  if (e.code === -32602) return new GatewayError(400, "bad_model", e.message);
  return new GatewayError(502, "upstream_error", e.message);
}

const neutralize = (t: string): string => t.replace(/<(\/?(?:he_thong|hoi_thoai_truoc))/gi, "‹$1");
const safeParts = (parts: ContentPart[]): ContentPart[] => parts.map((p) => (p.type === "text" ? { ...p, text: neutralize(p.text) } : p));

/** ACP không có vai "system": phiên mới nhận lời dặn + lịch sử ở khối đầu; phiên cũ chỉ cần tin mới nhất. */
export function toBlocks(input: BackendInput, fresh: boolean): ContentPart[] {
  const last = input.messages[input.messages.length - 1]!;
  const lastParts: ContentPart[] = safeParts(typeof last.content === "string" ? [{ type: "text", text: last.content }] : last.content);
  if (!fresh) return lastParts;
  const head = [`<he_thong>\n${input.system}\n</he_thong>`];
  const history = input.messages.slice(0, -1);
  if (history.length) {
    head.push(
      "<hoi_thoai_truoc>\n" +
        history.map((m) => `${m.role === "assistant" ? "Trợ lý" : "Người dùng"}: ${neutralize(textOf(m.content))}`).join("\n") +
        "\n</hoi_thoai_truoc>",
    );
  }
  return [{ type: "text", text: head.join("\n\n") }, ...lastParts];
}

export class AcpBackend implements Backend {
  readonly name = "acp";
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly pool: AgentPool) {}

  available(): boolean {
    return this.pool.stats().alive > 0;
  }

  forget(key: string): void {
    this.pool.forget(key);
  }

  complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
    const run = async (): Promise<BackendOutput> => {
      const lease = await this.pool.lease(input.conversation, input.model, input.sig).catch((e: unknown) => {
        throw toGatewayError(e);
      });
      const onAbort = () => lease.agent.cancel(lease.sessionId);
      input.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        if (input.signal?.aborted) throw clientClosed();
        const r = await lease.agent.prompt(lease.sessionId, toBlocks(input, lease.fresh), onDelta, input.timeoutMs);
        if (input.signal?.aborted) throw clientClosed();
        return { text: r.text, usage: r.usage, deniedTools: r.deniedTools, toolsRan: r.toolsRan, agyBlocked: r.agyBlocked };
      } catch (e) {
        if (input.conversation) this.pool.forget(input.conversation);
        throw toGatewayError(e);
      } finally {
        input.signal?.removeEventListener("abort", onAbort);
        lease.release();
      }
    };
    const key = input.conversation;
    if (!key) return run();
    // Một phiên chỉ chạy một lượt mỗi lúc: xếp hàng theo khoá hội thoại.
    const next = (this.locks.get(key) ?? Promise.resolve()).catch(() => {}).then(run);
    this.locks.set(key, next);
    void next
      .catch(() => {})
      .finally(() => {
        if (this.locks.get(key) === next) this.locks.delete(key);
      });
    return next;
  }
}
