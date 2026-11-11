import { ApiError, authHeaders, getOrgId } from "../../api";
import { loadSession } from "../../student/studentApi";
import { reportFetchFailure, reportFetchSuccess } from "./online";

/** "user": Keycloak (GV/HS) · "hs": phiên HS mã lớp/PIN (P9a) · "none": công khai. */
export type AuthMode = "user" | "hs" | "none";
export type RequestInit2 = { method?: string; body?: unknown; signal?: AbortSignal; idempotencyKey?: string; auth?: AuthMode; accept?: string };

export async function buildHeaders(init: RequestInit2 = {}): Promise<Record<string, string>> {
  const mode = init.auth ?? "user";
  let headers: Record<string, string> = {};
  if (mode === "user") headers = await authHeaders();
  else if (mode === "hs") {
    const s = loadSession();
    if (!s) throw new ApiError(401, { error: "Hết phiên làm bài" });
    headers.authorization = `Bearer ${s.token}`;
  }
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.idempotencyKey) headers["idempotency-key"] = init.idempotencyKey;
  if (init.accept) headers.accept = init.accept;
  return headers;
}

/** fetch có đăng nhập; lỗi mạng → báo mất mạng rồi ném lại; thành công → báo có mạng. */
export async function rawFetch(path: string, init: RequestInit2 = {}): Promise<Response> {
  const headers = await buildHeaders(init);
  let res: Response;
  try {
    res = await fetch(path, { method: init.method ?? (init.body === undefined ? "GET" : "POST"), headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), signal: init.signal });
  } catch (e) {
    if (!isAbort(e)) reportFetchFailure();
    throw e;
  }
  reportFetchSuccess();
  return res;
}

/** JSON request; HTTP lỗi → ApiError (403 với x-org-id cũ thì bỏ tổ chức đã lưu, như api()). */
export async function request<T>(path: string, init: RequestInit2 = {}): Promise<T> {
  const res = await rawFetch(path, init);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    if (res.status === 403 && (init.auth ?? "user") === "user" && getOrgId()) window.localStorage.removeItem("eduvn.org");
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export const isAbort = (e: unknown): boolean => (e as { name?: string } | null)?.name === "AbortError";
/** Lỗi mạng (fetch ném TypeError), khác lỗi HTTP. */
export const isNetworkError = (e: unknown): boolean => e instanceof TypeError;
