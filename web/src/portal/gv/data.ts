import { request } from "../../ui/data/http";
import type { GvToday } from "../today";

export { fetchMe, ME_KEY } from "../meData";
export const GV_TODAY_KEY = "gv/hom-nay";
export const fetchGvToday = (signal: AbortSignal) => request<GvToday>("/api/gv/hom-nay", { signal });
