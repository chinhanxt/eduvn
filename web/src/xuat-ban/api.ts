// Gọi API /api/xuat-ban (gói P14/GX "Xuất bản & Nhập").
import { ApiError, api, authHeaders } from "../api";

export type Nguon = { loai: "bai-giang-ai" | "bo-slide" | "giao-an"; id: string };
export type DinhDang = "pptx" | "html" | "zip" | "goi-tai-nguyen" | "kich-ban-md" | "kich-ban-docx" | "video";
export type TuyChon = {
  mauId?: string;
  giongDoc?: boolean;
  hieuUng?: boolean;
  chuyenTrang?: "fade" | "push" | "wipe" | "morph" | "none";
  maQr?: boolean;
  chiSlide?: boolean;
  loiGiang?: "kem" | "khong";
  doPhanGiai?: "720p" | "1080p" | "4k";
  fps?: 24 | 30 | 60;
  chatLuong?: "nhap" | "chuan" | "cao";
  phuDeCung?: boolean;
};
export type Job = { id: string; kind: DinhDang; status: "cho" | "dang-chay" | "xong" | "loi" | "da-huy"; stage: string; done: number; total: number; startedAt: number; etaSec?: number; error?: string; warnings: string[]; fileName?: string; size?: number; coPhuDe?: boolean };
export type Mau = { id: string; name: string; kind: "mau" | "phong_cach"; fileName: string; size: number; createdAt: string; mine: boolean; info: { width: number; height: number; colors: Record<string, string>; fonts: { major?: string; minor?: string }; layouts: string[]; background: string | null; hasPicture: boolean } };
export type NhapKetQua = { id: string; title: string; scenes: number; warnings: string[]; status: string };

const B = "/api/xuat-ban";

export const startJob = (nguon: Nguon, dinhDang: DinhDang, tuyChon: TuyChon) => api<Job>(`${B}/viec`, { method: "POST", body: { nguon, dinhDang, tuyChon } });
export const jobStatus = (id: string) => api<Job>(`${B}/viec/${id}`);
export const cancelJob = (id: string) => api<Job>(`${B}/viec/${id}`, { method: "DELETE" });
export const listMau = () => api<Mau[]>(`${B}/mau`);
export const deleteMau = (id: string) => api<null>(`${B}/mau/${id}`, { method: "DELETE" });

async function upload<T>(path: string, file: Blob): Promise<T> {
  const headers = await authHeaders();
  headers["content-type"] = "application/octet-stream";
  const res = await fetch(path, { method: "POST", headers, body: file });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

const qs = (o: Record<string, string | number | undefined>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

export const uploadMau = (file: File, ten: string, loai: "mau" | "phong_cach") => upload<Mau>(`${B}/mau?${qs({ ten, loai, tep: file.name })}`, file);
export const nhapTep = (file: File, o: { loiGiang: "ghi-chu" | "ai" | "khong"; giongDoc: boolean; tieuDe?: string }) => upload<NhapKetQua>(`${B}/nhap?${qs({ tep: file.name, loiGiang: o.loiGiang, giongDoc: o.giongDoc ? "1" : "0", tieuDe: o.tieuDe })}`, file);

/** Tải tệp của việc xuất (kèm token) → lưu về máy. */
export async function downloadJob(job: Job, srt = false): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${B}/viec/${job.id}/tep${srt ? "?phu-de=1" : ""}`, { headers });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = srt ? (job.fileName ?? "bai-giang.mp4").replace(/\.mp4$/, ".srt") : (job.fileName ?? "tep");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

export const errText = (e: unknown): string => {
  if (e instanceof ApiError) {
    const b = e.body as { error?: string; issues?: unknown[] } | null;
    const issue = Array.isArray(b?.issues) && typeof b.issues[0] === "string" ? b.issues[0] : undefined;
    return issue ?? b?.error ?? e.message;
  }
  return (e as Error)?.message ?? String(e);
};

export const sizeText = (n?: number) => (n === undefined ? "" : n > 1e6 ? `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
export const etaText = (s?: number) => (s === undefined ? "" : s < 60 ? `còn khoảng ${Math.max(1, s)} giây` : `còn khoảng ${Math.round(s / 60)} phút`);
