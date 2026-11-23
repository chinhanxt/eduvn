/**
 * Dữ liệu Bảng tuần hoàn 118 nguyên tố hoá học (có nguồn trích dẫn).
 * Nguồn:
 *  - Nguyên tử khối chuẩn: IUPAC CIAAW Standard Atomic Weights 2021 (Pure Appl. Chem. 2022, 94, 573–600).
 *  - Tên nguyên tố tiếng Việt theo danh pháp IUPAC: Chương trình GDPT 2018 & SGK Hoá học 10 (KNTT, CTST, Cánh diều).
 *  - Độ âm điện (Pauling), bán kính nguyên tử (covalent/empirical pm), năng lượng ion hoá thứ nhất (eV): PubChem Periodic Table / CRC Handbook.
 */
import { type OrbitalLetter, electronConfiguration } from "./electronConfig";

export type ElementCategory =
  | "kim-loai-kiem"
  | "kim-loai-kiem-tho"
  | "kim-loai-chuyen-tiep"
  | "kim-loai-sau-chuyen-tiep"
  | "a-kim"
  | "phi-kim"
  | "halogen"
  | "khi-hiem"
  | "lanthanide"
  | "actinide";

export type PhysicalState = "ran" | "long" | "khi";

export interface ChemicalElement {
  z: number;
  symbol: string;
  /** Tên gọi theo CTGDPT 2018 (danh pháp IUPAC). */
  nameVi: string;
  /** Tên cũ quen dùng trước CTGDPT 2018 (để tra cứu và đối chiếu). */
  nameLegacyVi?: string;
  /** Nguyên tử khối chuẩn IUPAC 2021 (amu). */
  atomicMass: number;
  /** Nguyên tử khối làm tròn theo SGK Hoá học Việt Nam (dùng trong bài tập phổ thông). */
  sgkMass: number;
  period: number;
  /** Nhóm 1..18 theo chuẩn IUPAC; 0 với dãy Lanthanide/Actinide tách riêng dưới bảng (về mặt nhóm thuộc cột 3). */
  group: number;
  groupLabel: string;
  block: OrbitalLetter;
  category: ElementCategory;
  /** Độ âm điện thang Pauling (null nếu chưa xác định/khí hiếm không có giá trị chuẩn). */
  electronegativity: number | null;
  /** Bán kính nguyên tử (pm). */
  atomicRadiusPm: number | null;
  /** Năng lượng ion hoá thứ nhất IE1 (eV). */
  ionizationEnergyEv: number | null;
  state25C: PhysicalState;
  commonOxidationStates: readonly number[];
}

export const PERIODIC_TABLE_SOURCE =
  "IUPAC CIAAW Standard Atomic Weights 2021 (Pure Appl. Chem. 94:573–600); PubChem Periodic Table (NIST/CRC); Danh pháp tiếng Việt theo CTGDPT 2018 (SGK Hoá học 10).";

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  "kim-loai-kiem": "Kim loại kiềm (IA)",
  "kim-loai-kiem-tho": "Kim loại kiềm thổ (IIA)",
  "kim-loai-chuyen-tiep": "Kim loại chuyển tiếp",
  "kim-loai-sau-chuyen-tiep": "Kim loại sau chuyển tiếp",
  "a-kim": "Á kim",
  "phi-kim": "Phi kim",
  halogen: "Halogen (VIIA)",
  "khi-hiem": "Khí hiếm (VIIIA)",
  lanthanide: "Họ Lanthanide",
  actinide: "Họ Actinide",
};

// [z, symbol, nameVi, nameLegacyVi|null, atomicMass, sgkMass, period, group, groupLabel, block, category, en|null, radiusPm|null, ie1Ev|null, state, oxStates]
type Row = readonly [
  number,
  string,
  string,
  string | null,
  number,
  number,
  number,
  number,
  string,
  OrbitalLetter,
  ElementCategory,
  number | null,
  number | null,
  number | null,
  PhysicalState,
  readonly number[],
];

const RAW: readonly Row[] = [
  [1, "H", "Hydrogen", "Hiđro", 1.008, 1, 1, 1, "IA", "s", "phi-kim", 2.2, 53, 13.598, "khi", [-1, 1]],
  [2, "He", "Helium", "Heli", 4.0026, 4, 1, 18, "VIIIA", "s", "khi-hiem", null, 31, 24.587, "khi", [0]],
  [3, "Li", "Lithium", "Liti", 6.94, 7, 2, 1, "IA", "s", "kim-loai-kiem", 0.98, 167, 5.392, "ran", [1]],
  [4, "Be", "Beryllium", "Beri", 9.0122, 9, 2, 2, "IIA", "s", "kim-loai-kiem-tho", 1.57, 112, 9.323, "ran", [2]],
  [5, "B", "Boron", "Bo", 10.81, 11, 2, 13, "IIIA", "p", "a-kim", 2.04, 87, 8.298, "ran", [3]],
  [6, "C", "Carbon", "Cacbon", 12.011, 12, 2, 14, "IVA", "p", "phi-kim", 2.55, 67, 11.26, "ran", [-4, 2, 4]],
  [7, "N", "Nitrogen", "Nitơ", 14.007, 14, 2, 15, "VA", "p", "phi-kim", 3.04, 56, 14.534, "khi", [-3, 1, 2, 3, 4, 5]],
  [8, "O", "Oxygen", "Oxi", 15.999, 16, 2, 16, "VIA", "p", "phi-kim", 3.44, 48, 13.618, "khi", [-2, -1]],
  [9, "F", "Fluorine", "Flo", 18.998, 19, 2, 17, "VIIA", "p", "halogen", 3.98, 42, 17.423, "khi", [-1]],
  [10, "Ne", "Neon", "Neon", 20.18, 20, 2, 18, "VIIIA", "p", "khi-hiem", null, 38, 21.565, "khi", [0]],
  [11, "Na", "Sodium", "Natri", 22.99, 23, 3, 1, "IA", "s", "kim-loai-kiem", 0.93, 190, 5.139, "ran", [1]],
  [12, "Mg", "Magnesium", "Magie", 24.305, 24, 3, 2, "IIA", "s", "kim-loai-kiem-tho", 1.31, 145, 7.646, "ran", [2]],
  [13, "Al", "Aluminium", "Nhôm", 26.982, 27, 3, 13, "IIIA", "p", "kim-loai-sau-chuyen-tiep", 1.61, 118, 5.986, "ran", [3]],
  [14, "Si", "Silicon", "Silic", 28.085, 28, 3, 14, "IVA", "p", "a-kim", 1.9, 111, 8.152, "ran", [-4, 4]],
  [15, "P", "Phosphorus", "Photpho", 30.974, 31, 3, 15, "VA", "p", "phi-kim", 2.19, 98, 10.487, "ran", [-3, 3, 5]],
  [16, "S", "Sulfur", "Lưu huỳnh", 32.06, 32, 3, 16, "VIA", "p", "phi-kim", 2.58, 88, 10.36, "ran", [-2, 4, 6]],
  [17, "Cl", "Chlorine", "Clo", 35.45, 35.5, 3, 17, "VIIA", "p", "halogen", 3.16, 79, 12.968, "khi", [-1, 1, 3, 5, 7]],
  [18, "Ar", "Argon", "Agon", 39.948, 40, 3, 18, "VIIIA", "p", "khi-hiem", null, 71, 15.76, "khi", [0]],
  [19, "K", "Potassium", "Kali", 39.098, 39, 4, 1, "IA", "s", "kim-loai-kiem", 0.82, 243, 4.341, "ran", [1]],
  [20, "Ca", "Calcium", "Canxi", 40.078, 40, 4, 2, "IIA", "s", "kim-loai-kiem-tho", 1.0, 194, 6.113, "ran", [2]],
  [21, "Sc", "Scandium", "Scandi", 44.956, 45, 4, 3, "IIIB", "d", "kim-loai-chuyen-tiep", 1.36, 184, 6.561, "ran", [3]],
  [22, "Ti", "Titanium", "Titan", 47.867, 48, 4, 4, "IVB", "d", "kim-loai-chuyen-tiep", 1.54, 176, 6.828, "ran", [2, 3, 4]],
  [23, "V", "Vanadium", "Vanađi", 50.942, 51, 4, 5, "VB", "d", "kim-loai-chuyen-tiep", 1.63, 171, 6.746, "ran", [2, 3, 4, 5]],
  [24, "Cr", "Chromium", "Crom", 51.996, 52, 4, 6, "VIB", "d", "kim-loai-chuyen-tiep", 1.66, 166, 6.767, "ran", [2, 3, 6]],
  [25, "Mn", "Manganese", "Mangan", 54.938, 55, 4, 7, "VIIB", "d", "kim-loai-chuyen-tiep", 1.55, 161, 7.434, "ran", [2, 4, 6, 7]],
  [26, "Fe", "Iron", "Sắt", 55.845, 56, 4, 8, "VIIIB", "d", "kim-loai-chuyen-tiep", 1.83, 156, 7.902, "ran", [2, 3]],
  [27, "Co", "Cobalt", "Coban", 58.933, 59, 4, 9, "VIIIB", "d", "kim-loai-chuyen-tiep", 1.88, 152, 7.881, "ran", [2, 3]],
  [28, "Ni", "Nickel", "Niken", 58.693, 59, 4, 10, "VIIIB", "d", "kim-loai-chuyen-tiep", 1.91, 149, 7.64, "ran", [2]],
  [29, "Cu", "Copper", "Đồng", 63.546, 64, 4, 11, "IB", "d", "kim-loai-chuyen-tiep", 1.9, 145, 7.726, "ran", [1, 2]],
  [30, "Zn", "Zinc", "Kẽm", 65.38, 65, 4, 12, "IIB", "d", "kim-loai-chuyen-tiep", 1.65, 142, 9.394, "ran", [2]],
  [31, "Ga", "Gallium", "Gali", 69.723, 70, 4, 13, "IIIA", "p", "kim-loai-sau-chuyen-tiep", 1.81, 136, 5.999, "ran", [3]],
  [32, "Ge", "Germanium", "Gecmani", 72.63, 73, 4, 14, "IVA", "p", "a-kim", 2.01, 125, 7.9, "ran", [2, 4]],
  [33, "As", "Arsenic", "Asen", 74.922, 75, 4, 15, "VA", "p", "a-kim", 2.18, 114, 9.789, "ran", [-3, 3, 5]],
  [34, "Se", "Selenium", "Selen", 78.971, 79, 4, 16, "VIA", "p", "phi-kim", 2.55, 103, 9.752, "ran", [-2, 4, 6]],
  [35, "Br", "Bromine", "Brom", 79.904, 80, 4, 17, "VIIA", "p", "halogen", 2.96, 94, 11.814, "long", [-1, 1, 5]],
  [36, "Kr", "Krypton", "Kripton", 83.798, 84, 4, 18, "VIIIA", "p", "khi-hiem", 3.0, 88, 14.0, "khi", [0, 2]],
  [37, "Rb", "Rubidium", "Rubiđi", 85.468, 85.5, 5, 1, "IA", "s", "kim-loai-kiem", 0.82, 265, 4.177, "ran", [1]],
  [38, "Sr", "Strontium", "Stronti", 87.62, 88, 5, 2, "IIA", "s", "kim-loai-kiem-tho", 0.95, 219, 5.695, "ran", [2]],
  [39, "Y", "Yttrium", "Ytri", 88.906, 89, 5, 3, "IIIB", "d", "kim-loai-chuyen-tiep", 1.22, 212, 6.217, "ran", [3]],
  [40, "Zr", "Zirconium", "Ziriconi", 91.224, 91, 5, 4, "IVB", "d", "kim-loai-chuyen-tiep", 1.33, 206, 6.634, "ran", [4]],
  [41, "Nb", "Niobium", "Niobi", 92.906, 93, 5, 5, "VB", "d", "kim-loai-chuyen-tiep", 1.6, 198, 6.759, "ran", [5]],
  [42, "Mo", "Molybdenum", "Molipđen", 95.95, 96, 5, 6, "VIB", "d", "kim-loai-chuyen-tiep", 2.16, 190, 7.092, "ran", [4, 6]],
  [43, "Tc", "Technetium", "Tecneti", 98, 98, 5, 7, "VIIB", "d", "kim-loai-chuyen-tiep", 1.9, 183, 7.28, "ran", [4, 7]],
  [44, "Ru", "Ruthenium", "Ruteni", 101.07, 101, 5, 8, "VIIIB", "d", "kim-loai-chuyen-tiep", 2.2, 178, 7.361, "ran", [3, 4]],
  [45, "Rh", "Rhodium", "Rođi", 102.91, 103, 5, 9, "VIIIB", "d", "kim-loai-chuyen-tiep", 2.28, 173, 7.459, "ran", [3]],
  [46, "Pd", "Palladium", "Palađi", 106.42, 106, 5, 10, "VIIIB", "d", "kim-loai-chuyen-tiep", 2.2, 169, 8.337, "ran", [2, 4]],
  [47, "Ag", "Silver", "Bạc", 107.87, 108, 5, 11, "IB", "d", "kim-loai-chuyen-tiep", 1.93, 165, 7.576, "ran", [1]],
  [48, "Cd", "Cadmium", "Cađimi", 112.41, 112, 5, 12, "IIB", "d", "kim-loai-chuyen-tiep", 1.69, 161, 8.994, "ran", [2]],
  [49, "In", "Indium", "Inđi", 114.82, 115, 5, 13, "IIIA", "p", "kim-loai-sau-chuyen-tiep", 1.78, 156, 5.786, "ran", [3]],
  [50, "Sn", "Tin", "Thiếc", 118.71, 119, 5, 14, "IVA", "p", "kim-loai-sau-chuyen-tiep", 1.96, 145, 7.344, "ran", [2, 4]],
  [51, "Sb", "Antimony", "Antimon", 121.76, 122, 5, 15, "VA", "p", "a-kim", 2.05, 133, 8.608, "ran", [-3, 3, 5]],
  [52, "Te", "Tellurium", "Telu", 127.6, 128, 5, 16, "VIA", "p", "a-kim", 2.1, 123, 9.01, "ran", [-2, 4, 6]],
  [53, "I", "Iodine", "Iot", 126.9, 127, 5, 17, "VIIA", "p", "halogen", 2.66, 115, 10.451, "ran", [-1, 1, 5, 7]],
  [54, "Xe", "Xenon", "Xenon", 131.29, 131, 5, 18, "VIIIA", "p", "khi-hiem", 2.6, 108, 12.13, "khi", [0, 2, 4, 6]],
  [55, "Cs", "Caesium", "Xesi", 132.91, 133, 6, 1, "IA", "s", "kim-loai-kiem", 0.79, 298, 3.894, "ran", [1]],
  [56, "Ba", "Barium", "Bari", 137.33, 137, 6, 2, "IIA", "s", "kim-loai-kiem-tho", 0.89, 253, 5.212, "ran", [2]],
  [57, "La", "Lanthanum", "Lantan", 138.91, 139, 6, 3, "IIIB", "f", "lanthanide", 1.1, 195, 5.577, "ran", [3]],
  [58, "Ce", "Cerium", "Xeri", 140.12, 140, 6, 3, "IIIB", "f", "lanthanide", 1.12, 185, 5.539, "ran", [3, 4]],
  [59, "Pr", "Praseodymium", "Prazeođim", 140.91, 141, 6, 3, "IIIB", "f", "lanthanide", 1.13, 247, 5.473, "ran", [3]],
  [60, "Nd", "Neodymium", "Neođim", 144.24, 144, 6, 3, "IIIB", "f", "lanthanide", 1.14, 206, 5.525, "ran", [3]],
  [61, "Pm", "Promethium", "Prometi", 145, 145, 6, 3, "IIIB", "f", "lanthanide", 1.13, 205, 5.582, "ran", [3]],
  [62, "Sm", "Samarium", "Samari", 150.36, 150, 6, 3, "IIIB", "f", "lanthanide", 1.17, 238, 5.644, "ran", [2, 3]],
  [63, "Eu", "Europium", "Europi", 151.96, 152, 6, 3, "IIIB", "f", "lanthanide", 1.2, 231, 5.67, "ran", [2, 3]],
  [64, "Gd", "Gadolinium", "Gađolini", 157.25, 157, 6, 3, "IIIB", "f", "lanthanide", 1.2, 233, 6.15, "ran", [3]],
  [65, "Tb", "Terbium", "Tebi", 158.93, 159, 6, 3, "IIIB", "f", "lanthanide", 1.2, 225, 5.864, "ran", [3]],
  [66, "Dy", "Dysprosium", "Điprozi", 162.5, 162.5, 6, 3, "IIIB", "f", "lanthanide", 1.22, 228, 5.939, "ran", [3]],
  [67, "Ho", "Holmium", "Honmi", 164.93, 165, 6, 3, "IIIB", "f", "lanthanide", 1.23, 226, 6.022, "ran", [3]],
  [68, "Er", "Erbium", "Ebi", 167.26, 167, 6, 3, "IIIB", "f", "lanthanide", 1.24, 226, 6.108, "ran", [3]],
  [69, "Tm", "Thulium", "Tuli", 168.93, 169, 6, 3, "IIIB", "f", "lanthanide", 1.25, 222, 6.184, "ran", [3]],
  [70, "Yb", "Ytterbium", "Ytecbi", 173.05, 173, 6, 3, "IIIB", "f", "lanthanide", 1.1, 222, 6.254, "ran", [2, 3]],
  [71, "Lu", "Lutetium", "Lutexi", 174.97, 175, 6, 3, "IIIB", "d", "lanthanide", 1.27, 217, 5.426, "ran", [3]],
  [72, "Hf", "Hafnium", "Hafini", 178.49, 178.5, 6, 4, "IVB", "d", "kim-loai-chuyen-tiep", 1.3, 208, 6.825, "ran", [4]],
  [73, "Ta", "Tantalum", "Tantan", 180.95, 181, 6, 5, "VB", "d", "kim-loai-chuyen-tiep", 1.5, 200, 7.55, "ran", [5]],
  [74, "W", "Tungsten", "Vonfam", 183.84, 184, 6, 6, "VIB", "d", "kim-loai-chuyen-tiep", 2.36, 193, 7.864, "ran", [4, 6]],
  [75, "Re", "Rhenium", "Reni", 186.21, 186, 6, 7, "VIIB", "d", "kim-loai-chuyen-tiep", 1.9, 188, 7.833, "ran", [4, 7]],
  [76, "Os", "Osmium", "Osimi", 190.23, 190, 6, 8, "VIIIB", "d", "kim-loai-chuyen-tiep", 2.2, 185, 8.438, "ran", [4, 8]],
  [77, "Ir", "Iridium", "Iriđi", 192.22, 192, 6, 9, "VIIIB", "d", "kim-loai-chuyen-tiep", 2.2, 180, 8.967, "ran", [3, 4]],
  [78, "Pt", "Platinum", "Platin (Bạch kim)", 195.08, 195, 6, 10, "VIIIB", "d", "kim-loai-chuyen-tiep", 2.28, 177, 8.959, "ran", [2, 4]],
  [79, "Au", "Gold", "Vàng", 196.97, 197, 6, 11, "IB", "d", "kim-loai-chuyen-tiep", 2.54, 174, 9.226, "ran", [1, 3]],
  [80, "Hg", "Mercury", "Thuỷ ngân", 200.59, 201, 6, 12, "IIB", "d", "kim-loai-chuyen-tiep", 2.0, 171, 10.438, "long", [1, 2]],
  [81, "Tl", "Thallium", "Tali", 204.38, 204, 6, 13, "IIIA", "p", "kim-loai-sau-chuyen-tiep", 1.62, 156, 6.108, "ran", [1, 3]],
  [82, "Pb", "Lead", "Chì", 207.2, 207, 6, 14, "IVA", "p", "kim-loai-sau-chuyen-tiep", 2.33, 154, 7.417, "ran", [2, 4]],
  [83, "Bi", "Bismuth", "Bitmut", 208.98, 209, 6, 15, "VA", "p", "kim-loai-sau-chuyen-tiep", 2.02, 143, 7.286, "ran", [3, 5]],
  [84, "Po", "Polonium", "Poloni", 209, 209, 6, 16, "VIA", "p", "a-kim", 2.0, 135, 8.417, "ran", [2, 4]],
  [85, "At", "Astatine", "Atatin", 210, 210, 6, 17, "VIIA", "p", "halogen", 2.2, 127, 9.318, "ran", [-1, 1]],
  [86, "Rn", "Radon", "Rađon", 222, 222, 6, 18, "VIIIA", "p", "khi-hiem", 2.2, 120, 10.748, "khi", [0]],
  [87, "Fr", "Francium", "Franxi", 223, 223, 7, 1, "IA", "s", "kim-loai-kiem", 0.7, 348, 4.073, "ran", [1]],
  [88, "Ra", "Radium", "Rađi", 226, 226, 7, 2, "IIA", "s", "kim-loai-kiem-tho", 0.9, 283, 5.278, "ran", [2]],
  [89, "Ac", "Actinium", "Actini", 227, 227, 7, 3, "IIIB", "f", "actinide", 1.1, 195, 5.17, "ran", [3]],
  [90, "Th", "Thorium", "Thori", 232.04, 232, 7, 3, "IIIB", "f", "actinide", 1.3, 180, 6.307, "ran", [4]],
  [91, "Pa", "Protactinium", "Protactini", 231.04, 231, 7, 3, "IIIB", "f", "actinide", 1.5, 180, 5.89, "ran", [5]],
  [92, "U", "Uranium", "Urani", 238.03, 238, 7, 3, "IIIB", "f", "actinide", 1.38, 175, 6.194, "ran", [4, 6]],
  [93, "Np", "Neptunium", "Neptuni", 237, 237, 7, 3, "IIIB", "f", "actinide", 1.36, 175, 6.266, "ran", [5]],
  [94, "Pu", "Plutonium", "Plutoni", 244, 244, 7, 3, "IIIB", "f", "actinide", 1.28, 175, 6.026, "ran", [4]],
  [95, "Am", "Americium", "Amerixi", 243, 243, 7, 3, "IIIB", "f", "actinide", 1.3, 175, 5.974, "ran", [3]],
  [96, "Cm", "Curium", "Curi", 247, 247, 7, 3, "IIIB", "f", "actinide", 1.3, 176, 5.992, "ran", [3]],
  [97, "Bk", "Berkelium", "Beckeli", 247, 247, 7, 3, "IIIB", "f", "actinide", 1.3, 176, 6.198, "ran", [3]],
  [98, "Cf", "Californium", "Califoni", 251, 251, 7, 3, "IIIB", "f", "actinide", 1.3, 176, 6.282, "ran", [3]],
  [99, "Es", "Einsteinium", "Ensteni", 252, 252, 7, 3, "IIIB", "f", "actinide", 1.3, 176, 6.42, "ran", [3]],
  [100, "Fm", "Fermium", "Fecmi", 257, 257, 7, 3, "IIIB", "f", "actinide", 1.3, 176, 6.5, "ran", [3]],
  [101, "Md", "Mendelevium", "Menđelevi", 258, 258, 7, 3, "IIIB", "f", "actinide", 1.3, 176, 6.58, "ran", [3]],
  [102, "No", "Nobelium", "Nobeli", 259, 259, 7, 3, "IIIB", "f", "actinide", 1.3, 176, 6.65, "ran", [2, 3]],
  [103, "Lr", "Lawrencium", "Lorenxi", 266, 266, 7, 3, "IIIB", "d", "actinide", 1.3, 171, 4.9, "ran", [3]],
  [104, "Rf", "Rutherfordium", null, 267, 267, 7, 4, "IVB", "d", "kim-loai-chuyen-tiep", null, null, 6.0, "ran", [4]],
  [105, "Db", "Dubnium", null, 268, 268, 7, 5, "VB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [5]],
  [106, "Sg", "Seaborgium", null, 269, 269, 7, 6, "VIB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [6]],
  [107, "Bh", "Bohrium", null, 270, 270, 7, 7, "VIIB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [7]],
  [108, "Hs", "Hassium", null, 277, 277, 7, 8, "VIIIB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [8]],
  [109, "Mt", "Meitnerium", null, 278, 278, 7, 9, "VIIIB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [3]],
  [110, "Ds", "Darmstadtium", null, 281, 281, 7, 10, "VIIIB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [2]],
  [111, "Rg", "Roentgenium", null, 282, 282, 7, 11, "IB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [3]],
  [112, "Cn", "Copernicium", null, 285, 285, 7, 12, "IIB", "d", "kim-loai-chuyen-tiep", null, null, null, "ran", [2]],
  [113, "Nh", "Nihonium", null, 286, 286, 7, 13, "IIIA", "p", "kim-loai-sau-chuyen-tiep", null, null, null, "ran", [1]],
  [114, "Fl", "Flerovium", null, 289, 289, 7, 14, "IVA", "p", "kim-loai-sau-chuyen-tiep", null, null, null, "ran", [2]],
  [115, "Mc", "Moscovium", null, 290, 290, 7, 15, "VA", "p", "kim-loai-sau-chuyen-tiep", null, null, null, "ran", [1, 3]],
  [116, "Lv", "Livermorium", null, 293, 293, 7, 16, "VIA", "p", "kim-loai-sau-chuyen-tiep", null, null, null, "ran", [2]],
  [117, "Ts", "Tennessine", null, 294, 294, 7, 17, "VIIA", "p", "halogen", null, null, null, "ran", [-1, 1]],
  [118, "Og", "Oganesson", null, 294, 294, 7, 18, "VIIIA", "p", "khi-hiem", null, null, null, "ran", [0]],
];

export const ELEMENTS: readonly ChemicalElement[] = RAW.map(
  ([z, symbol, nameVi, nameLegacyVi, atomicMass, sgkMass, period, group, groupLabel, block, category, electronegativity, atomicRadiusPm, ionizationEnergyEv, state25C, commonOxidationStates]) => ({
    z,
    symbol,
    nameVi,
    ...(nameLegacyVi ? { nameLegacyVi } : {}),
    atomicMass,
    sgkMass,
    period,
    group,
    groupLabel,
    block,
    category,
    electronegativity,
    atomicRadiusPm,
    ionizationEnergyEv,
    state25C,
    commonOxidationStates,
  }),
);

const BY_Z = new Map<number, ChemicalElement>(ELEMENTS.map((e) => [e.z, e]));
const BY_SYM = new Map<string, ChemicalElement>(ELEMENTS.map((e) => [e.symbol, e]));

export const elementByZ = (z: number): ChemicalElement | undefined => BY_Z.get(z);
export const elementBySymbol = (symbol: string): ChemicalElement | undefined => BY_SYM.get(symbol);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase().trim();

/** Tìm nguyên tố theo ký hiệu, số hiệu Z, tên IUPAC 2018 hoặc tên cũ tiếng Việt. */
export function searchElements(query: string): ChemicalElement[] {
  const q = fold(query);
  if (!q) return [...ELEMENTS];
  const asNum = Number(q);
  return ELEMENTS.filter(
    (e) =>
      (Number.isInteger(asNum) && e.z === asNum) ||
      e.symbol.toLowerCase() === q ||
      e.symbol.toLowerCase().startsWith(q) ||
      fold(e.nameVi).includes(q) ||
      (e.nameLegacyVi ? fold(e.nameLegacyVi).includes(q) : false),
  );
}

/** Chi tiết đầy đủ của 1 nguyên tố kèm cấu hình electron tính tất định. */
export function elementDetail(zOrSymbol: number | string) {
  const el = typeof zOrSymbol === "number" ? elementByZ(zOrSymbol) : elementBySymbol(zOrSymbol);
  if (!el) return null;
  return {
    ...el,
    categoryLabel: CATEGORY_LABELS[el.category],
    config: electronConfiguration(el.z),
    source: PERIODIC_TABLE_SOURCE,
  };
}
