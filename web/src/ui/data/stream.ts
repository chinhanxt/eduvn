import { ApiError } from "../../apiCore";
import { isAbort, rawFetch, type AuthMode } from "./http";

export type SseEvent = { event: string; data: unknown; id?: string };

/** Bộ tách SSE theo dòng (CRLF/LF), gộp nhiều dòng `data:`, bỏ comment `:`; data JSON thì parse, không thì để chuỗi. */
export function createSseParser(onEvent: (e: SseEvent) => void): { push: (chunk: string) => void; end: () => void } {
  let buf = "";
  let data: string[] = [];
  let event = "message";
  let id: string | undefined;
  const dispatch = () => {
    if (data.length) {
      const raw = data.join("\n");
      let parsed: unknown = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // dữ liệu chữ thường
      }
      onEvent({ event, data: parsed, id });
    }
    data = [];
    event = "message";
  };
  const line = (l: string) => {
    if (l === "") return dispatch();
    if (l.startsWith(":")) return;
    const i = l.indexOf(":");
    const field = i < 0 ? l : l.slice(0, i);
    let value = i < 0 ? "" : l.slice(i + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") data.push(value);
    else if (field === "event") event = value || "message";
    else if (field === "id") id = value;
  };
  return {
    push(chunk) {
      buf += chunk;
      // "\r" ở cuối có thể là nửa đầu của "\r\n" → giữ lại chờ mẩu sau.
      const tail = buf.endsWith("\r") ? "\r" : "";
      const parts = (tail ? buf.slice(0, -1) : buf).split(/\r\n|\r|\n/);
      buf = (parts.pop() ?? "") + tail;
      for (const l of parts) line(l);
    },
    end() {
      if (buf) line(buf.replace(/\r$/, ""));
      buf = "";
      dispatch();
    },
  };
}

export type StreamResult = "done" | "stopped";

/**
 * POST url với body (JSON) và đọc SSE: gọi onChunk cho từng sự kiện `data:`; `data: [DONE]` kết thúc.
 * Dừng = signal.abort() → trả "stopped" (phần đã nhận giữ nguyên). HTTP lỗi → ApiError.
 */
export async function stream(url: string, body: unknown, onChunk: (data: unknown, e: SseEvent) => void, signal?: AbortSignal, opts: { auth?: AuthMode } = {}): Promise<StreamResult> {
  let res: Response;
  try {
    res = await rawFetch(url, { method: "POST", body, signal, auth: opts.auth, accept: "text/event-stream" });
  } catch (e) {
    if (isAbort(e)) return "stopped";
    throw e;
  }
  if (!res.ok || !res.body) throw new ApiError(res.status, await res.json().catch(() => null));
  let finished = false;
  const parser = createSseParser((e) => {
    if (finished) return;
    if (e.data === "[DONE]") {
      finished = true;
      return;
    }
    onChunk(e.data, e);
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(value);
    }
    if (!finished) parser.end();
    if (finished) await reader.cancel().catch(() => undefined);
    return "done";
  } catch (e) {
    if (isAbort(e) || signal?.aborted) return "stopped";
    throw e;
  }
}
