// server/src/subjects/dia/geoData.ts
// Trình nạp dữ liệu bản đồ TopoJSON & bộ địa danh từ services/anim-kit-data/geo/ + bảng số liệu mẫu chuẩn Địa lí THPT.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DiaDataTable } from "./verify";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../../..");
export const GEO_DATA_DIR = path.join(REPO_ROOT, "services/anim-kit-data/geo");

export const GEO_LAYERS = {
  vn34: "vn34.topo.json",
  vn63: "vn63.topo.json",
  ne_vnm_admin0: "ne_vnm_admin0.topo.json",
  "song-ho": "song-ho.topo.json",
  "dia-danh": "dia-danh.json",
} as const;
export type GeoLayerKey = keyof typeof GEO_LAYERS;

const cache = new Map<GeoLayerKey, unknown>();

export function loadGeoLayer(layer: GeoLayerKey): unknown {
  const hit = cache.get(layer);
  if (hit) return hit;
  const full = path.join(GEO_DATA_DIR, GEO_LAYERS[layer]);
  const parsed = JSON.parse(readFileSync(full, "utf-8"));
  cache.set(layer, parsed);
  return parsed;
}

export type DiaPresetTable = {
  id: string;
  ten: string;
  nhom: string;
  intent: "nhiet_am" | "chuyen_dich_co_cau" | "co_cau" | "toc_do_tang_truong" | "hai_dai_luong" | "quy_mo_so_sanh";
  bang: DiaDataTable;
};

/** Bảng số liệu mẫu chuẩn Atlat Địa lí Việt Nam & Niên giám Thống kê (dùng cho công cụ vẽ biểu đồ & bài giảng). */
export const DIA_PRESET_TABLES: DiaPresetTable[] = [
  {
    id: "nhiet-am-ha-noi",
    ten: "Nhiệt độ và lượng mưa trạm Hà Nội (Láng)",
    nhom: "Khí hậu · Atlat trang 9",
    intent: "nhiet_am",
    bang: {
      tieuDe: "Biểu đồ nhiệt – ẩm trạm khí tượng Hà Nội (Láng)",
      nhan: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
      chuoi: [
        { ten: "Lượng mưa", donVi: "mm", giaTri: [18.6, 26.2, 43.8, 90.1, 188.5, 239.9, 288.2, 318.0, 265.4, 130.7, 43.4, 23.4], kieu: "cot", truc: "trai" },
        { ten: "Nhiệt độ", donVi: "°C", giaTri: [16.4, 17.0, 20.2, 23.7, 27.3, 28.8, 28.9, 28.2, 27.2, 24.6, 21.4, 18.2], kieu: "duong", truc: "phai" },
      ],
      nguon: "Quy chuẩn kỹ thuật Quốc gia về số liệu điều kiện tự nhiên dùng trong xây dựng (QCVN 02:2022/BXD) & Atlat Địa lí Việt Nam",
    },
  },
  {
    id: "nhiet-am-tphcm",
    ten: "Nhiệt độ và lượng mưa trạm TP. Hồ Chí Minh (Tân Sơn Nhất)",
    nhom: "Khí hậu · Atlat trang 9",
    intent: "nhiet_am",
    bang: {
      tieuDe: "Biểu đồ nhiệt – ẩm trạm khí tượng TP. Hồ Chí Minh",
      nhan: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
      chuoi: [
        { ten: "Lượng mưa", donVi: "mm", giaTri: [13.8, 4.1, 10.5, 50.4, 218.4, 311.7, 293.7, 269.8, 327.1, 266.7, 116.5, 48.3], kieu: "cot", truc: "trai" },
        { ten: "Nhiệt độ", donVi: "°C", giaTri: [25.8, 26.7, 27.9, 28.9, 28.3, 27.5, 27.1, 27.1, 26.8, 26.7, 26.4, 25.7], kieu: "duong", truc: "phai" },
      ],
      nguon: "QCVN 02:2022/BXD & Atlat Địa lí Việt Nam",
    },
  },
  {
    id: "co-cau-gdp-vn",
    ten: "Chuyển dịch cơ cấu GDP Việt Nam (2010–2023)",
    nhom: "Kinh tế · Biểu đồ miền",
    intent: "chuyen_dich_co_cau",
    bang: {
      tieuDe: "Cơ cấu GDP phân theo khu vực kinh tế Việt Nam giai đoạn 2010–2023 (%)",
      nhan: ["2010", "2015", "2018", "2023"],
      nam: [2010, 2015, 2018, 2023],
      chuoi: [
        { ten: "Nông, lâm nghiệp và thủy sản", donVi: "%", giaTri: [15.4, 14.5, 13.9, 12.0] },
        { ten: "Công nghiệp và xây dựng", donVi: "%", giaTri: [33.0, 34.3, 35.4, 37.1] },
        { ten: "Dịch vụ và thuế sản phẩm", donVi: "%", giaTri: [51.6, 51.2, 50.7, 50.9] },
      ],
      nguon: "Niên giám Thống kê Việt Nam (Tổng cục Thống kê)",
    },
  },
  {
    id: "lua-dien-tich-san-luong",
    ten: "Diện tích và sản lượng lúa Việt Nam (2010–2023)",
    nhom: "Nông nghiệp · Kết hợp cột – đường",
    intent: "hai_dai_luong",
    bang: {
      tieuDe: "Diện tích gieo trồng và sản lượng lúa cả nước giai đoạn 2010–2023",
      nhan: ["2010", "2015", "2019", "2023"],
      nam: [2010, 2015, 2019, 2023],
      chuoi: [
        { ten: "Diện tích lúa", donVi: "nghìn ha", giaTri: [7489.4, 7828.0, 7469.5, 7119.3], kieu: "cot", truc: "trai" },
        { ten: "Sản lượng lúa", donVi: "triệu tấn", giaTri: [40.0, 45.1, 43.5, 43.5], kieu: "duong", truc: "phai" },
      ],
      nguon: "Niên giám Thống kê Việt Nam (Tổng cục Thống kê)",
    },
  },
  {
    id: "xnk-viet-nam",
    ten: "Xuất nhập khẩu hàng hóa Việt Nam (2015–2023)",
    nhom: "Thương mại · Cột ghép / Đường",
    intent: "quy_mo_so_sanh",
    bang: {
      tieuDe: "Trị giá xuất khẩu và nhập khẩu hàng hóa của Việt Nam (tỉ USD)",
      nhan: ["2015", "2018", "2020", "2023"],
      nam: [2015, 2018, 2020, 2023],
      chuoi: [
        { ten: "Xuất khẩu", donVi: "tỉ USD", giaTri: [162.0, 243.7, 282.6, 355.5] },
        { ten: "Nhập khẩu", donVi: "tỉ USD", giaTri: [165.8, 236.9, 262.7, 327.5] },
      ],
      nguon: "Tổng cục Hải quan & Tổng cục Thống kê Việt Nam",
    },
  },
];
