/**
 * Kho phân tử chuẩn SGK Hoá học THCS/THPT (CTGDPT 2018) kèm SMILES, danh pháp IUPAC tiếng Việt 2018,
 * nhóm chức cần nhấn mạnh và ghi chú an toàn ở mức phòng thí nghiệm phổ thông.
 * Không chứa chất nổ, chất độc cấm hay quy trình tổng hợp nguy hiểm.
 */
import { parseFormula } from "./formula";

export interface FunctionalGroupSpec {
  id: string;
  nameVi: string;
  notation: string;
  colorToken: "lam" | "lucLam" | "xanhLa" | "tim" | "doSon" | "vangDam" | "hong";
  /** Mô tả ngắn vai trò hoá học trong chương trình SGK 2018. */
  note: string;
}

export interface SafeMolecule {
  id: string;
  nameIupacVi: string;
  nameCommonVi?: string;
  formula: string;
  smiles: string;
  grade: number;
  chapter: string;
  category: "vo-co" | "hydrocarbon" | "alcohol-phenol" | "carbonyl-acid" | "ester-lipid" | "carbohydrate" | "amine-amino-acid";
  functionalGroups: FunctionalGroupSpec[];
  description: string;
  safetyNote: string;
  molarMassSgk: number;
  molarMassIupac: number;
}

type RawMolecule = Omit<SafeMolecule, "molarMassSgk" | "molarMassIupac">;

const RAW_MOLECULES: readonly RawMolecule[] = [
  {
    id: "nuoc",
    nameIupacVi: "Nước (Water)",
    formula: "H2O",
    smiles: "O",
    grade: 8,
    chapter: "Liên kết hoá học",
    category: "vo-co",
    functionalGroups: [{ id: "oh", nameVi: "Liên kết phân cực O–H", notation: "H–O–H", colorToken: "lam", note: "Góc liên kết ~104,5°, tạo liên kết hydrogen giữa các phân tử." }],
    description: "Phân tử phân cực, dung môi phổ biến nhất trong tự nhiên và phòng thí nghiệm.",
    safetyNote: "An toàn. Lưu ý không đổ nước vào H₂SO₄ đặc (luôn rót từ từ acid vào nước).",
  },
  {
    id: "ammonia",
    nameIupacVi: "Ammonia",
    nameCommonVi: "Amoniac",
    formula: "NH3",
    smiles: "N",
    grade: 11,
    chapter: "Nitrogen – Sulfur",
    category: "vo-co",
    functionalGroups: [{ id: "nh", nameVi: "Cặp electron tự do trên N", notation: ":NH₃", colorToken: "tim", note: "Nhận proton H⁺ → tính base yếu (Brønsted – Lowry)." }],
    description: "Phân tử dạng chóp tam giác, tan rất tốt trong nước tạo môi trường kiềm yếu.",
    safetyNote: "Khí mùi khai, gây kích ứng mắt và đường hô hấp. Quan sát trong tủ hút hoặc lượng nhỏ theo SGK.",
  },
  {
    id: "carbon-dioxide",
    nameIupacVi: "Carbon dioxide",
    nameCommonVi: "Khí cacbonic",
    formula: "CO2",
    smiles: "O=C=O",
    grade: 9,
    chapter: "Oxide – Acid – Base",
    category: "vo-co",
    functionalGroups: [{ id: "co-double", nameVi: "Liên kết đôi C=O", notation: "O=C=O", colorToken: "doSon", note: "Cấu trúc thẳng đối xứng nên phân tử không phân cực." }],
    description: "Oxide acid làm đục nước vôi trong Ca(OH)₂ tạo kết tủa CaCO₃.",
    safetyNote: "Không cháy, không duy trì sự hô hấp; tránh nồng độ cao trong không gian kín.",
  },
  {
    id: "methane",
    nameIupacVi: "Methane",
    nameCommonVi: "Metan",
    formula: "CH4",
    smiles: "C",
    grade: 11,
    chapter: "Alkane",
    category: "hydrocarbon",
    functionalGroups: [{ id: "ch", nameVi: "Liên kết đơn C–H (tứ diện)", notation: "C–H", colorToken: "lam", note: "4 liên kết σ bền vững, góc 109,5°; đặc trưng phản ứng thế halogen." }],
    description: "Alkane đơn giản nhất, thành phần chính của khí thiên nhiên.",
    safetyNote: "Khí dễ cháy; chỉ dùng làm mô hình cấu trúc, không thử lửa ngoài hướng dẫn GV.",
  },
  {
    id: "ethene",
    nameIupacVi: "Ethene",
    nameCommonVi: "Ethylene (Etilen)",
    formula: "C2H4",
    smiles: "C=C",
    grade: 11,
    chapter: "Hydrocarbon không no",
    category: "hydrocarbon",
    functionalGroups: [{ id: "alkene", nameVi: "Liên kết đôi C=C", notation: "C=C", colorToken: "xanhLa", note: "Gồm 1 liên kết σ và 1 liên kết π kém bền, làm mất màu nước bromine." }],
    description: "Alkene đơn giản nhất, nguyên liệu tổng hợp nhựa PE và kích thích quả chín.",
    safetyNote: "Khí dễ cháy; thí nghiệm làm mất màu dung dịch Br₂ loãng thực hiện ở quy mô ống nghiệm nhỏ.",
  },
  {
    id: "ethyne",
    nameIupacVi: "Ethyne",
    nameCommonVi: "Acetylene (Axetilen)",
    formula: "C2H2",
    smiles: "C#C",
    grade: 11,
    chapter: "Hydrocarbon không no",
    category: "hydrocarbon",
    functionalGroups: [{ id: "alkyne", nameVi: "Liên kết ba C≡C", notation: "C≡C", colorToken: "doSon", note: "1 liên kết σ + 2 liên kết π; H gắn C≡C linh động, tạo kết tủa vàng với AgNO₃/NH₃." }],
    description: "Alkyne đơn giản nhất có cấu trúc thẳng (góc 180°).",
    safetyNote: "Khí cháy mạnh; khi làm thí nghiệm với AgNO₃/NH₃ chỉ dùng lượng rất nhỏ và huỷ kết tủa bằng HCl loãng ngay sau khi quan sát.",
  },
  {
    id: "benzene",
    nameIupacVi: "Benzene",
    nameCommonVi: "Benzen",
    formula: "C6H6",
    smiles: "c1ccccc1",
    grade: 11,
    chapter: "Arene",
    category: "hydrocarbon",
    functionalGroups: [{ id: "arene", nameVi: "Vòng thơm liên hợp", notation: "C₆H₆", colorToken: "tim", note: "Hệ 6 electron π giải toả đều trên 6 nguyên tử C; dễ thế, khó cộng." }],
    description: "Arene điển hình có cấu trúc lục giác đều phẳng.",
    safetyNote: "Dung môi hữu cơ độc và dễ bay hơi; học sinh chỉ quan sát mô hình phân tử và video chuẩn SGK.",
  },
  {
    id: "toluene",
    nameIupacVi: "Methylbenzene",
    nameCommonVi: "Toluene",
    formula: "C7H8",
    smiles: "Cc1ccccc1",
    grade: 11,
    chapter: "Arene",
    category: "hydrocarbon",
    functionalGroups: [
      { id: "arene", nameVi: "Vòng benzene", notation: "–C₆H₅", colorToken: "tim", note: "Nhóm –CH₃ đẩy electron hoạt hoá vị trí ortho và para." },
      { id: "methyl", nameVi: "Nhóm methyl", notation: "–CH₃", colorToken: "lam", note: "Bị oxi hoá bởi KMnO₄ đun nóng thành muối benzoate." },
    ],
    description: "Đồng đẳng của benzene, làm mất màu dung dịch KMnO₄ khi đun nóng.",
    safetyNote: "Chất lỏng dễ cháy, mùi thơm hắc; tránh hít hơi, học qua mô hình 2D/3D.",
  },
  {
    id: "ethanol",
    nameIupacVi: "Ethanol",
    nameCommonVi: "Ancol etylic (Cồn)",
    formula: "C2H6O",
    smiles: "CCO",
    grade: 11,
    chapter: "Alcohol – Phenol",
    category: "alcohol-phenol",
    functionalGroups: [{ id: "hydroxyl", nameVi: "Nhóm hydroxyl (alcohol)", notation: "–OH", colorToken: "lam", note: "Tạo liên kết hydrogen (nhiệt độ sôi 78,3 °C), phản ứng với Na giải phóng H₂." }],
    description: "Alcohol no đơn chức phổ biến, dùng làm dung môi, sát khuẩn và nhiên liệu sinh học E5.",
    safetyNote: "Dễ cháy; tránh xa ngọn lửa trần, đeo kính bảo hộ khi làm thí nghiệm với Na (mẩu rất nhỏ cỡ hạt đậu xanh).",
  },
  {
    id: "glycerol",
    nameIupacVi: "Propane-1,2,3-triol",
    nameCommonVi: "Glycerol (Glixerol)",
    formula: "C3H8O3",
    smiles: "OCC(O)CO",
    grade: 11,
    chapter: "Alcohol – Phenol",
    category: "alcohol-phenol",
    functionalGroups: [{ id: "polyol", nameVi: "3 nhóm –OH liền kề", notation: "–OH (liền kề)", colorToken: "lucLam", note: "Hoà tan Cu(OH)₂ tạo phức đồng màu xanh lam đặc trưng." }],
    description: "Polyalcohol sánh, vị ngọt, dùng nhận biết bằng phản ứng với Cu(OH)₂.",
    safetyNote: "An toàn trong phòng thí nghiệm phổ thông; không nếm hoá chất.",
  },
  {
    id: "phenol",
    nameIupacVi: "Phenol",
    formula: "C6H6O",
    smiles: "Oc1ccccc1",
    grade: 11,
    chapter: "Alcohol – Phenol",
    category: "alcohol-phenol",
    functionalGroups: [
      { id: "oh-phenol", nameVi: "Nhóm –OH gắn trực tiếp vòng thơm", notation: "Ar–OH", colorToken: "hong", note: "Có tính acid rất yếu (phản ứng NaOH, không làm đổi màu quỳ)." },
      { id: "arene", nameVi: "Vòng benzene hoạt hoá", notation: "–C₆H₅", colorToken: "tim", note: "Tạo kết tủa trắng 2,4,6-tribromophenol với nước Br₂." },
    ],
    description: "Hợp chất minh hoạ rõ ảnh hưởng qua lại giữa nhóm –OH và vòng benzene.",
    safetyNote: "Gây bỏng da khi tiếp xúc trực tiếp; luôn đeo găng tay hoặc chỉ quan sát thí nghiệm mẫu.",
  },
  {
    id: "methanal",
    nameIupacVi: "Methanal",
    nameCommonVi: "Formaldehyde (Anđehit fomic)",
    formula: "CH2O",
    smiles: "C=O",
    grade: 11,
    chapter: "Hợp chất carbonyl",
    category: "carbonyl-acid",
    functionalGroups: [{ id: "aldehyde", nameVi: "Nhóm aldehyde", notation: "–CHO", colorToken: "vangDam", note: "Tham gia phản ứng tráng bạc với thuốc thử Tollens (tỉ lệ 1 : 4 Ag)." }],
    description: "Aldehyde đơn giản nhất; dung dịch 37–40% gọi là formalin.",
    safetyNote: "Hơi kích ứng mạnh và độc; học sinh không tự pha chế, chỉ học lý thuyết & mô hình.",
  },
  {
    id: "ethanal",
    nameIupacVi: "Ethanal",
    nameCommonVi: "Acetaldehyde (Anđehit axetic)",
    formula: "C2H4O",
    smiles: "CC=O",
    grade: 11,
    chapter: "Hợp chất carbonyl",
    category: "carbonyl-acid",
    functionalGroups: [{ id: "aldehyde", nameVi: "Nhóm aldehyde", notation: "–CHO", colorToken: "vangDam", note: "Bị oxi hoá bởi thuốc thử Tollens (AgNO₃/NH₃) tạo lớp bạc sáng." }],
    description: "Aldehyde điển hình cho phản ứng tráng bạc và phản ứng tạo iodoform.",
    safetyNote: "Chất lỏng dễ bay hơi, dễ cháy; thí nghiệm tráng bạc dùng lượng nhỏ trong ống nghiệm sạch.",
  },
  {
    id: "propanone",
    nameIupacVi: "Propanone",
    nameCommonVi: "Acetone (Axeton)",
    formula: "C3H6O",
    smiles: "CC(=O)C",
    grade: 11,
    chapter: "Hợp chất carbonyl",
    category: "carbonyl-acid",
    functionalGroups: [{ id: "ketone", nameVi: "Nhóm ketone", notation: "–CO–", colorToken: "tim", note: "Không tham gia phản ứng tráng bạc; tạo kết tủa vàng CHI₃ với I₂/NaOH." }],
    description: "Ketone đơn giản nhất, dung môi hữu cơ thông dụng.",
    safetyNote: "Dễ cháy, bay hơi nhanh; tránh nguồn lửa và làm việc nơi thoáng khí.",
  },
  {
    id: "ethanoic-acid",
    nameIupacVi: "Ethanoic acid",
    nameCommonVi: "Acetic acid (Axit axetic)",
    formula: "C2H4O2",
    smiles: "CC(=O)O",
    grade: 11,
    chapter: "Carboxylic acid",
    category: "carbonyl-acid",
    functionalGroups: [{ id: "carboxyl", nameVi: "Nhóm carboxyl", notation: "–COOH", colorToken: "doSon", note: "Làm quỳ tím hoá đỏ, tác dụng với base, muối carbonate và ester hoá với alcohol." }],
    description: "Thành phần tạo vị chua của giấm ăn (2–5%); acid hữu cơ yếu điển hình.",
    safetyNote: "Acid loãng (giấm) an toàn; acid đặc gây kích ứng da và mắt, cần đeo kính bảo hộ.",
  },
  {
    id: "methanoic-acid",
    nameIupacVi: "Methanoic acid",
    nameCommonVi: "Formic acid (Axit fomic)",
    formula: "CH2O2",
    smiles: "O=CO",
    grade: 11,
    chapter: "Carboxylic acid",
    category: "carbonyl-acid",
    functionalGroups: [
      { id: "carboxyl", nameVi: "Nhóm carboxyl", notation: "–COOH", colorToken: "doSon", note: "Thể hiện đầy đủ tính chất của carboxylic acid." },
      { id: "formyl", nameVi: "Cấu trúc dạng –CHO", notation: "H–CO–", colorToken: "vangDam", note: "Tham gia phản ứng tráng bạc như aldehyde." },
    ],
    description: "Carboxylic acid đơn giản nhất, có trong nọc kiến.",
    safetyNote: "Acid ăn mòn nhẹ; thao tác với dung dịch loãng theo đúng SGK.",
  },
  {
    id: "ethyl-ethanoate",
    nameIupacVi: "Ethyl ethanoate",
    nameCommonVi: "Ethyl acetate (Etyl axetat)",
    formula: "C4H8O2",
    smiles: "CCOC(=O)C",
    grade: 12,
    chapter: "Ester – Lipid",
    category: "ester-lipid",
    functionalGroups: [{ id: "ester", nameVi: "Nhóm chức ester", notation: "–COO–", colorToken: "lucLam", note: "Thuỷ phân trong môi trường acid (thuận nghịch) hoặc kiềm (xà phòng hoá, một chiều)." }],
    description: "Ester có mùi thơm dịu đặc trưng, ít tan trong nước và nổi thành lớp phía trên.",
    safetyNote: "Chất lỏng dễ cháy; phản ứng ester hoá dùng H₂SO₄ đặc xúc tác đun cách thuỷ cẩn thận.",
  },
  {
    id: "methyl-methacrylate",
    nameIupacVi: "Methyl methacrylate",
    formula: "C5H8O2",
    smiles: "COC(=O)C(=C)C",
    grade: 12,
    chapter: "Ester – Polymer",
    category: "ester-lipid",
    functionalGroups: [
      { id: "ester", nameVi: "Nhóm ester", notation: "–COO–", colorToken: "lucLam", note: "Chứa gốc methyl và gốc acid không no." },
      { id: "alkene", nameVi: "Liên kết đôi C=C", notation: "C=C", colorToken: "xanhLa", note: "Trùng hợp tạo thuỷ tinh hữu cơ Plexiglas (PMMA)." },
    ],
    description: "Monomer quan trọng sản xuất thuỷ tinh hữu cơ trong suốt.",
    safetyNote: "Chỉ nghiên cứu cấu trúc phân tử và phản ứng trùng hợp theo SGK.",
  },
  {
    id: "glucose",
    nameIupacVi: "D-Glucose (mạch hở)",
    nameCommonVi: "Glucozơ",
    formula: "C6H12O6",
    smiles: "O=CC(O)C(O)C(O)C(O)CO",
    grade: 12,
    chapter: "Carbohydrate",
    category: "carbohydrate",
    functionalGroups: [
      { id: "aldehyde", nameVi: "Nhóm aldehyde (C1)", notation: "–CHO", colorToken: "vangDam", note: "Cho phản ứng tráng bạc và làm mất màu nước bromine." },
      { id: "polyol", nameVi: "5 nhóm –OH liền kề", notation: "5 × –OH", colorToken: "lam", note: "Hoà tan Cu(OH)₂ ở nhiệt độ thường tạo dung dịch xanh lam." },
    ],
    description: "Monosaccharide thiết yếu cung cấp năng lượng cho tế bào.",
    safetyNote: "An toàn. Thí nghiệm nhận biết với Cu(OH)₂ và thuốc thử Tollens dùng lượng nhỏ trong ống nghiệm.",
  },
  {
    id: "fructose",
    nameIupacVi: "D-Fructose (mạch hở)",
    nameCommonVi: "Fructozơ",
    formula: "C6H12O6",
    smiles: "OCC(=O)C(O)C(O)C(O)CO",
    grade: 12,
    chapter: "Carbohydrate",
    category: "carbohydrate",
    functionalGroups: [
      { id: "ketone", nameVi: "Nhóm ketone (C2)", notation: "–CO–", colorToken: "tim", note: "Trong môi trường kiềm chuyển hoá một phần thành glucose nên vẫn tráng bạc; không làm mất màu nước Br₂." },
      { id: "polyol", nameVi: "5 nhóm –OH", notation: "5 × –OH", colorToken: "lam", note: "Tạo phức xanh lam với Cu(OH)₂." },
    ],
    description: "Đồng phân của glucose, có nhiều trong mật ong và trái cây chín.",
    safetyNote: "An toàn trong thực hành thí nghiệm phổ thông.",
  },
  {
    id: "methylamine",
    nameIupacVi: "Methanamine",
    nameCommonVi: "Methylamine (Metylamin)",
    formula: "CH5N",
    smiles: "CN",
    grade: 12,
    chapter: "Amine – Amino acid – Protein",
    category: "amine-amino-acid",
    functionalGroups: [{ id: "amine", nameVi: "Nhóm amine bậc I", notation: "–NH₂", colorToken: "tim", note: "Tính base mạnh hơn NH₃, làm quỳ tím ẩm hoá xanh." }],
    description: "Amine đơn giản nhất, khí mùi khai tương tự ammonia.",
    safetyNote: "Khí dễ cháy và mùi khó chịu; chỉ dùng dung dịch loãng trong ống nghiệm hoặc quan sát mô hình.",
  },
  {
    id: "aniline",
    nameIupacVi: "Phenylamine (Aniline)",
    nameCommonVi: "Anilin",
    formula: "C6H7N",
    smiles: "Nc1ccccc1",
    grade: 12,
    chapter: "Amine – Amino acid – Protein",
    category: "amine-amino-acid",
    functionalGroups: [
      { id: "amine", nameVi: "Nhóm –NH₂ gắn vòng thơm", notation: "Ar–NH₂", colorToken: "tim", note: "Tính base rất yếu, không làm đổi màu quỳ tím." },
      { id: "arene", nameVi: "Vòng thơm hoạt hoá", notation: "–C₆H₅", colorToken: "hong", note: "Tạo kết tủa trắng 2,4,6-tribromoaniline với nước bromine." },
    ],
    description: "Amine thơm điển hình, nguyên liệu phẩm nhuộm và dược phẩm.",
    safetyNote: "Độc khi hấp thu qua da; học sinh quan sát mô hình và thí nghiệm minh hoạ an toàn.",
  },
  {
    id: "glycine",
    nameIupacVi: "2-Aminoethanoic acid (Glycine)",
    nameCommonVi: "Glyxin (Gly)",
    formula: "C2H5NO2",
    smiles: "NCC(=O)O",
    grade: 12,
    chapter: "Amine – Amino acid – Protein",
    category: "amine-amino-acid",
    functionalGroups: [
      { id: "amine", nameVi: "Nhóm amino (tính base)", notation: "–NH₂", colorToken: "lam", note: "Tác dụng với acid mạnh như HCl." },
      { id: "carboxyl", nameVi: "Nhóm carboxyl (tính acid)", notation: "–COOH", colorToken: "doSon", note: "Tác dụng với base như NaOH → tính lưỡng tính, tạo ion lưỡng cực." },
    ],
    description: "α-amino acid đơn giản nhất, không làm đổi màu quỳ tím (số nhóm –NH₂ = số nhóm –COOH).",
    safetyNote: "Chất rắn kết tinh trắng, an toàn ở điều kiện phòng thí nghiệm trường học.",
  },
  {
    id: "alanine",
    nameIupacVi: "2-Aminopropanoic acid (Alanine)",
    nameCommonVi: "Alanin (Ala)",
    formula: "C3H7NO2",
    smiles: "CC(N)C(=O)O",
    grade: 12,
    chapter: "Amine – Amino acid – Protein",
    category: "amine-amino-acid",
    functionalGroups: [
      { id: "amine", nameVi: "Nhóm amino (vị trí α)", notation: "–NH₂", colorToken: "lam", note: "Thể hiện tính base." },
      { id: "carboxyl", nameVi: "Nhóm carboxyl", notation: "–COOH", colorToken: "doSon", note: "Thể hiện tính acid; tạo liên kết peptide –CO–NH– khi trùng ngưng." },
    ],
    description: "α-amino acid phổ biến cấu tạo nên protein tự nhiên.",
    safetyNote: "An toàn trong thực hành phổ thông.",
  },
  {
    id: "aspirin",
    nameIupacVi: "2-Acetoxybenzoic acid (Aspirin)",
    nameCommonVi: "Aspirin",
    formula: "C9H8O4",
    smiles: "CC(=O)Oc1ccccc1C(=O)O",
    grade: 12,
    chapter: "Ester – Dược phẩm (Chuyên đề)",
    category: "ester-lipid",
    functionalGroups: [
      { id: "ester", nameVi: "Nhóm ester của phenol", notation: "–O–CO–CH₃", colorToken: "lucLam", note: "Thuỷ phân trong kiềm cần tỉ lệ 1 : 3 NaOH (gồm cả nhóm –COOH và ester phenol)." },
      { id: "carboxyl", nameVi: "Nhóm carboxyl", notation: "–COOH", colorToken: "doSon", note: "Tạo tính acid yếu." },
    ],
    description: "Hợp chất đa chức nổi tiếng dùng minh hoạ bài tập ester của phenol trong chương trình THPT.",
    safetyNote: "Chỉ dùng làm mẫu nhận diện nhóm chức và tính toán hoá học, không tự bào chế để sử dụng.",
  },
  {
    id: "urea",
    nameIupacVi: "Carbonyldiamide (Urea)",
    nameCommonVi: "Phân đạm urê",
    formula: "CH4N2O",
    smiles: "NC(=O)N",
    grade: 11,
    chapter: "Nitrogen – Phân bón hoá học",
    category: "amine-amino-acid",
    functionalGroups: [{ id: "amide", nameVi: "Hai nhóm amide", notation: "–CONH₂", colorToken: "xanhLa", note: "Độ dinh dưỡng cao (~46,67% N theo khối lượng)." }],
    description: "Hợp chất hữu cơ đầu tiên được tổng hợp từ chất vô cơ (Wöhler, 1828), loại phân đạm phổ biến.",
    safetyNote: "An toàn ở quy mô thí nghiệm phổ thông; rửa tay sạch sau khi thực hành.",
  },
];

export const SAFE_MOLECULES: readonly SafeMolecule[] = RAW_MOLECULES.map((m) => {
  const p = parseFormula(m.formula);
  return { ...m, molarMassSgk: p.molarMassSgk, molarMassIupac: p.molarMassIupac };
});

export const moleculeById = (id: string): SafeMolecule | undefined => SAFE_MOLECULES.find((m) => m.id === id);

/** Danh sách từ khoá/chất nguy hiểm (chất nổ, chất độc cấm, vũ khí hoá học, ma tuý) bị chặn tuyệt đối trong sinh nội dung và kiểm duyệt. */
const UNSAFE_PATTERNS: readonly { re: RegExp; reason: string }[] = [
  { re: /\b(tnt|trinitrotoluen|trinitrotoluene|nitroglycerin|nitroglixerin|rdx|hmx|petn|tatp|hmtd|picric\s*acid|axit\s*picric|c4\s*explosive|thuốc\s*nổ\s*dẻo|bom\s*xăng|molotov)\b/iu, reason: "Chất nổ / vật liệu gây nổ ngoài phạm vi SGK" },
  { re: /\b(sarin|tabun|soman|vx\s*nerve|novichok|phosgene|photgen|mustard\s*gas|khí\s*mù\s*tạt|ricin|botulinum|batrachotoxin|zyklon)\b/iu, reason: "Chất độc hoá học cực độc / vũ khí hoá học" },
  { re: /\b(tổng\s*hợp|điều\s*chế|chế\s*tạo|cách\s*làm)\b.{0,50}\b(cyanide|xianua|hcn|kcn|nacn|thuốc\s*nổ|chất\s*nổ|bom|methamphetamine|ma\s*tuý|heroin|fentanyl|chlorine\s*gas)\b/iu, reason: "Quy trình điều chế chất độc hoặc chất nguy hiểm bị cấm" },
];

export interface SafetyCheckResult {
  safe: boolean;
  violations: string[];
}

/** Kiểm tra tất định nội dung hoá học có vi phạm nguyên tắc an toàn SGK hay không. */
export function checkChemistrySafety(text: string): SafetyCheckResult {
  const norm = text.normalize("NFC");
  const violations: string[] = [];
  for (const p of UNSAFE_PATTERNS) {
    if (p.re.test(norm)) violations.push(p.reason);
  }
  return { safe: violations.length === 0, violations };
}
