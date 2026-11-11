import type { Me } from "../../api";
import { request } from "../../ui/data/http";
import type { GvToday } from "../today";

export const ME_KEY = "me";
export const fetchMe = (signal: AbortSignal) => request<Me>("/api/me", { signal });
export const GV_TODAY_KEY = "gv/hom-nay";
export const fetchGvToday = (signal: AbortSignal) => request<GvToday>("/api/gv/hom-nay", { signal });
