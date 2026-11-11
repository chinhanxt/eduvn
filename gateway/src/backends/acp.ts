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

  /** Model agy còn trong danh mục nhưng trả lời "no longer available": bỏ qua cho tới khi cổng khởi động lại. */
  private readonly retired = new Set<string>();

  constructor(private readonly pool: AgentPool) {}

  available(): boolean {
    return this.pool.stats().alive > 0;
  }

  forget(key: string): void {
    this.pool.forget(key);
  }

  complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
    const run = async (): Promise<BackendOutput> => {
      const all = input.models ?? [input.model];
      const usable = all.filter((m) => !this.retired.has(m));
      const models = usable.length ? usable : all;
      let emitted = false;
      const track = onDelta && ((t: string) => {
        emitted = true;
        onDelta(t);
      });
      const lease = await this.pool.lease(input.conversation, models, input.sig).catch((e: unknown) => {
        throw toGatewayError(e);
      });
      const onAbort = () => lease.agent.cancel(lease.sessionId);
      input.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        if (input.signal?.aborted) throw clientClosed();
        const r = await lease.agent.prompt(lease.sessionId, toBlocks(input, lease.fresh), track, input.timeoutMs);
        if (input.signal?.aborted) throw clientClosed();
        if (isRetiredReply(r.text) && !this.retired.has(lease.model)) {
          this.retired.add(lease.model);
          throw new RetiredModel(lease.model, emitted);
        }
        return { text: r.text, usage: r.usage, deniedTools: r.deniedTools, toolsRan: r.toolsRan, agyBlocked: r.agyBlocked, model: lease.model };
      } catch (e) {
        if (input.conversation) this.pool.forget(input.conversation);
        if (e instanceof RetiredModel) {
          if (!e.emitted && models.some((m) => !this.retired.has(m))) return { retry: true } as never;
          throw new GatewayError(502, "model_unavailable", `Model ${e.model} đã ngừng; thử lại`);
        }
        throw toGatewayError(e);
      } finally {
        input.signal?.removeEventListener("abort", onAbort);
        lease.release();
      }
    };
    const once = run;
    const runRetry = async (): Promise<BackendOutput> => {
      const out = await once();
      return (out as { retry?: boolean }).retry ? once() : out;
    };
    const key = input.conversation;
    if (!key) return runRetry();
    // Một phiên chỉ chạy một lượt mỗi lúc: xếp hàng theo khoá hội thoại.
    const next = (this.locks.get(key) ?? Promise.resolve()).catch(() => {}).then(runRetry);
    this.locks.set(key, next);
    void next
      .catch(() => {})
      .finally(() => {
        if (this.locks.get(key) === next) this.locks.delete(key);
      });
    return next;
  }
}

class RetiredModel extends Error {
  constructor(
    readonly model: string,
    readonly emitted: boolean,
  ) {
    super(`model ${model} retired`);
  }
}

/** Câu agy trả khi model trong danh mục đã ngừng (vd "Claude Opus 4.6 is no longer available…"). */
export function isRetiredReply(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length < 400 && /\b(model|opus|sonnet|haiku|gemini|claude)\b/i.test(t) && /(no longer (available|supported)|is not available|has been (deprecated|retired|discontinued))/i.test(t);
}
