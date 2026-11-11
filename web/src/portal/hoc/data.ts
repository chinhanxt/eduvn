import { request } from "../../ui/data/http";
import type { HocToday } from "../today";

export const HOC_TODAY_KEY = "hoc/hom-nay";
/** Tài khoản Keycloak (auth "user") hoặc phiên mã lớp/PIN P9a (auth "hs"). */
export const fetchHocToday = (auth: "user" | "hs") => (signal: AbortSignal) => request<HocToday>("/api/hoc/hom-nay", { signal, auth });
