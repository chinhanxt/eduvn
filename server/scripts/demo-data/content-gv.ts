// Nội dung GV đã soạn (tĩnh, không gọi AI) cho server demo: giáo án CV 5512, slide, bài giảng AI, sơ đồ, bảng giảng, văn bản NĐ 30/2020, nhận xét TT22.
// Thế giới mẫu: docs/demo/the-gioi-mau.md. Kiểm: pnpm exec tsx scripts/demo-data/check.ts scripts/demo-data/content-gv.ts
import type { ActivityBody, LessonPlan } from "../../src/domain/lesson";
import type { DAiLesson, DBoard, DDeck, DDiagram, DLesson, DVanBan } from "./types";

const SCHOOL = "Trường Liên cấp Bình Minh";
type Steps = [assign: string, perform: string, report: string, conclude: string];
const body = (name: string, goal: string, content: string, product: string, s: Steps): ActivityBody => ({
  name,
  goal,
  content,
  product,
  steps: { assign: s[0], perform: s[1], report: s[2], conclude: s[3] },
});
const act = (name: string, goal: string, content: string, product: string, s: Steps): LessonPlan["activities"][number] => ({ ...body(name, goal, content, product, s), subs: [] });
/** Hoạt động 2 chia nhỏ 2.1, 2.2…: cấp hoạt động 2 để trống, mỗi hoạt động nhỏ đủ a–d. */
const split = (name: string, subs: ActivityBody[]): LessonPlan["activities"][number] => ({ ...body(name, "", "", "", ["", "", "", ""]), subs });

// =====================================================================================
// 1. GIÁO ÁN CV 5512
// =====================================================================================

const TOAN = { school: SCHOOL, department: "Tổ Toán – Tin", teacher: "Lê Thu Hà", subject: "Toán", grade: 10, date: "" };

const bptTiet1: LessonPlan = {
  header: { ...TOAN, title: "Bất phương trình bậc hai một ẩn", periods: 1 },
  objectives: {
    knowledge: [
      "Nhận biết bất phương trình bậc hai một ẩn dạng ax² + bx + c > 0 (≥ 0, < 0, ≤ 0) với a ≠ 0; hiểu thế nào là nghiệm và tập nghiệm.",
      "Giải được bất phương trình bậc hai một ẩn bằng cách xét dấu tam thức bậc hai f(x) = ax² + bx + c.",
      "Giải được bất phương trình bậc hai bằng đồ thị: chọn phần parabol nằm phía trên (hoặc phía dưới) trục hoành.",
      "Vận dụng bất phương trình bậc hai vào bài toán tính lãi quầy nước chanh của lớp.",
    ],
    competencies: {
      general: [
        "Tự chủ và tự học: tự kiểm tra lại chiều của bất phương trình sau mỗi phép biến đổi, tự chữa bài trên phiếu học tập.",
        "Giao tiếp và hợp tác: thảo luận nhóm 4 bạn, phân công lập bảng xét dấu và trình bày trước lớp.",
        "Giải quyết vấn đề và sáng tạo: chuyển câu hỏi “bán bao nhiêu thì có lãi” thành bất phương trình và giải.",
      ],
      specific: [
        "Tư duy và lập luận toán học: giải thích vì sao chọn khoảng nghiệm dựa vào định lí về dấu của tam thức bậc hai.",
        "Mô hình hoá toán học: lập bất phương trình P(x) > 0 từ tình huống quầy nước chanh và trả lời lại bằng ngôn ngữ thực tế.",
        "Giao tiếp toán học: đọc, viết đúng kí hiệu khoảng, đoạn, hợp các khoảng khi ghi tập nghiệm.",
        "Sử dụng công cụ, phương tiện học toán: dùng GeoGebra quan sát phần parabol nằm trên trục hoành.",
      ],
    },
    qualities: [
      "Chăm chỉ: hoàn thành đầy đủ phiếu học tập và bài tập về nhà.",
      "Trung thực: báo cáo đúng kết quả của nhóm, nhận ra và sửa lỗi sai của bản thân.",
      "Trách nhiệm: tính toán cẩn thận khi dự trù lãi cho quỹ lớp.",
    ],
  },
  materials: [
    "SGK Toán 10 (Cánh Diều) tập một, Chương III, Bài 4: Bất phương trình bậc hai một ẩn.",
    "Máy chiếu, phần mềm GeoGebra (đồ thị y = −x² + 6x − 5), bảng giảng điện tử trên EDUVN.",
    "Phiếu học tập số 1 (bảng xét dấu) và số 2 (luyện tập), bảng phụ cho 10 nhóm.",
    "Bộ câu hỏi nhanh 5 câu trên EDUVN để kiểm tra cuối giờ.",
  ],
  activities: [
    act(
      "Quầy nước chanh của lớp có lãi khi nào?",
      "Gợi nhu cầu giải bất phương trình bậc hai từ tình huống thật của lớp; HS nhận ra câu hỏi “có lãi” chính là P(x) > 0.",
      "Lớp 10A1 dự định mở quầy nước chanh ở Ngày hội Toán học. Ban cán sự ước tính: bán x chục cốc thì lãi P(x) = −x² + 6x − 5 (trăm nghìn đồng). Câu hỏi: (1) Bán 2 chục cốc lãi bao nhiêu? (2) Bán 6 chục cốc thì sao? (3) Dự đoán bán trong khoảng nào thì có lãi?",
      "Câu trả lời của các cặp đôi: P(2) = −4 + 12 − 5 = 3 (lãi 300 nghìn đồng); P(6) = −36 + 36 − 5 = −5 (lỗ 500 nghìn đồng); một số dự đoán về khoảng có lãi.",
      [
        "GV chiếu hình quầy nước chanh và công thức lãi P(x) = −x² + 6x − 5, giao cặp đôi trả lời 3 câu hỏi trên phiếu khởi động trong 3 phút.",
        "HS tính P(2), P(6), thử thêm vài giá trị x khác để dự đoán; GV gợi ý cặp còn lúng túng thử x = 1, 3, 5.",
        "Đại diện 2 cặp đôi báo cáo kết quả tính; các cặp khác nêu dự đoán, ví dụ “từ 2 đến 4 chục cốc”, “dưới 5 chục cốc”.",
        "GV ghi nhận các dự đoán và chốt: muốn biết chính xác phải giải −x² + 6x − 5 > 0, đó là một bất phương trình bậc hai một ẩn, nội dung bài học hôm nay.",
      ],
    ),
    split("Hình thành kiến thức về bất phương trình bậc hai một ẩn", [
      body(
        "Khái niệm bất phương trình bậc hai một ẩn",
        "HS phát biểu được định nghĩa, nhận dạng được bất phương trình bậc hai một ẩn và kiểm tra một số có là nghiệm hay không.",
        "Định nghĩa: bất phương trình bậc hai ẩn x là bất phương trình có một trong các dạng ax² + bx + c > 0, ≥ 0, < 0, ≤ 0 với a, b, c là các số thực, a ≠ 0. Ví dụ 1: trong các bất phương trình 2x² − 3x − 2 ≥ 0; −x² + 6x − 5 > 0; 3x − 1 < 0; x³ + x > 0, bất phương trình nào là bậc hai? Số x = 2 có là nghiệm của −x² + 6x − 5 > 0 không?",
        "HS chỉ ra hai bất phương trình bậc hai đầu tiên; x = 2 là nghiệm vì −4 + 12 − 5 = 3 > 0; phát biểu được định nghĩa nghiệm và tập nghiệm.",
        [
          "GV yêu cầu HS đọc SGK mục I, sau đó trả lời Ví dụ 1 cá nhân trong 2 phút.",
          "HS đọc định nghĩa, đối chiếu từng bất phương trình với dạng ax² + bx + c và điều kiện a ≠ 0.",
          "Hai HS trả lời nhanh; HS khác nhận xét, giải thích vì sao 3x − 1 < 0 không phải bậc hai (a = 0) và x³ + x > 0 là bậc ba.",
          "GV chốt định nghĩa, nhấn mạnh điều kiện a ≠ 0 và khái niệm tập nghiệm S là tập hợp mọi giá trị x thoả mãn.",
        ],
      ),
      body(
        "Giải bất phương trình bậc hai bằng xét dấu tam thức",
        "HS nắm được 3 bước giải và giải được bất phương trình bậc hai trong các trường hợp Δ > 0, Δ = 0, Δ < 0.",
        "Các bước: (1) Xác định hệ số a, tìm nghiệm của tam thức f(x) (nếu có); (2) Lập bảng xét dấu theo quy tắc “trong trái, ngoài cùng”; (3) Chọn các khoảng làm f(x) đúng dấu đề yêu cầu. Ví dụ 2: 2x² − 3x − 2 ≥ 0. Ví dụ 3: −3x² + 2x − 1 < 0. Ví dụ 4: x² + x + 1 ≤ 0. Lưu ý lỗi thường gặp: nhân hai vế với số âm mà quên đổi chiều bất phương trình.",
        "Phiếu học tập số 1 đã điền: Ví dụ 2 có nghiệm x = −1/2, x = 2, a = 2 > 0 nên S = (−∞; −1/2] ∪ [2; +∞); Ví dụ 3 có Δ' = 1 − 3 = −2 < 0, a < 0 nên f(x) < 0 với mọi x, S = ℝ; Ví dụ 4 có Δ = −3 < 0, a > 0 nên f(x) > 0 với mọi x, bất phương trình vô nghiệm.",
        [
          "GV chia lớp thành 10 nhóm, giao phiếu học tập số 1: nhóm lẻ làm Ví dụ 2 và 4, nhóm chẵn làm Ví dụ 3 và 4, thời gian 7 phút.",
          "HS tính Δ, tìm nghiệm, lập bảng xét dấu trên bảng phụ; GV đi kèm nhóm có em Đức Thịnh để nhắc tiếp tục sang bước lập bảng sau khi tìm xong nghiệm, nhóm có em Minh Anh để kiểm tra chiều bất phương trình.",
          "Nhóm 1 và nhóm 2 treo bảng phụ trình bày; các nhóm khác so sánh, chỉ ra chỗ ghi sai dấu ngoặc tại đầu mút khi bất phương trình có dấu “≥”.",
          "GV chốt 3 bước giải, lưu ý: dấu “≥, ≤” lấy cả nghiệm của tam thức (dùng ngoặc vuông); khi đưa về hệ số a dương bằng cách nhân với −1 phải đổi chiều bất phương trình.",
        ],
      ),
      body(
        "Giải bất phương trình bậc hai bằng đồ thị",
        "HS hiểu ý nghĩa hình học: tập nghiệm của f(x) > 0 là hoành độ các điểm của parabol nằm phía trên trục hoành; giải xong bài toán mở đầu.",
        "GV dùng GeoGebra vẽ parabol y = −x² + 6x − 5 (bề lõm hướng xuống, cắt trục hoành tại x = 1 và x = 5, đỉnh I(3; 4)). HS quan sát phần đồ thị phía trên trục hoành, suy ra tập nghiệm của −x² + 6x − 5 > 0 và trả lời câu hỏi mở đầu.",
        "Tập nghiệm S = (1; 5). Kết luận: lớp có lãi khi bán nhiều hơn 1 chục cốc và ít hơn 5 chục cốc; lãi lớn nhất khi bán 3 chục cốc, P(3) = 4 (400 nghìn đồng).",
        [
          "GV chiếu đồ thị, yêu cầu HS cá nhân tô màu phần parabol nằm trên trục hoành trong phiếu và ghi tập nghiệm.",
          "HS quan sát, đối chiếu với kết quả xét dấu: a = −1 < 0 nên f(x) dương trong khoảng hai nghiệm.",
          "Một HS lên bảng giảng chỉ phần đồ thị và đọc tập nghiệm; cả lớp so sánh với dự đoán ở hoạt động mở đầu.",
          "GV chốt cách đọc tập nghiệm từ đồ thị và trả lời bài toán mở đầu bằng lời: bán từ trên 10 cốc đến dưới 50 cốc thì quầy có lãi.",
        ],
      ),
    ]),
    act(
      "Luyện tập giải bất phương trình bậc hai",
      "Củng cố kĩ năng giải bất phương trình bậc hai một ẩn ở cả bốn dạng dấu, rèn tính cẩn thận khi ghi tập nghiệm.",
      "Phiếu học tập số 2: giải các bất phương trình a) x² − 4x + 3 < 0; b) −x² + 2x + 3 ≥ 0; c) x² − 4x + 4 > 0; d) 2x² + x + 5 ≤ 0.",
      "Đáp án: a) S = (1; 3); b) đưa về x² − 2x − 3 ≤ 0, S = [−1; 3]; c) (x − 2)² > 0, S = ℝ \\ {2}; d) Δ = 1 − 40 = −39 < 0, a > 0 nên vô nghiệm, S = ∅.",
      [
        "GV giao phiếu học tập số 2, HS làm cá nhân 8 phút rồi đổi phiếu với bạn cùng bàn để chấm chéo.",
        "HS giải, đặc biệt chú ý câu b phải đổi chiều khi nhân hai vế với −1; GV theo dõi, ghi lại lỗi phổ biến.",
        "4 HS lên bảng trình bày 4 câu; cả lớp nhận xét, chữa trên phiếu của bạn.",
        "GV chốt đáp án, tổng kết hai lỗi hay gặp: quên đổi chiều khi nhân số âm và ghi nhầm ngoặc tròn, ngoặc vuông.",
      ],
    ),
    act(
      "Vận dụng: quầy nước chanh lãi ít nhất 300 nghìn đồng",
      "HS vận dụng bất phương trình bậc hai để ra quyết định thực tế cho quầy nước chanh của lớp.",
      "Ban cán sự muốn lãi ít nhất 300 nghìn đồng. Lập và giải bất phương trình P(x) ≥ 3 để tìm số cốc cần bán. Về nhà: quay một video ngắn 60 giây giải thích cách giải cho bạn vắng học.",
      "Lời giải: −x² + 6x − 5 ≥ 3 ⇔ −x² + 6x − 8 ≥ 0 ⇔ x² − 6x + 8 ≤ 0 ⇔ 2 ≤ x ≤ 4. Kết luận: cần bán từ 20 đến 40 cốc. Video 60 giây của các nhóm nộp trên EDUVN.",
      [
        "GV nêu yêu cầu của ban cán sự, giao nhóm 4 bạn lập và giải bất phương trình trong 5 phút; giao nhiệm vụ quay video 60 giây về nhà (khuyến khích em Khánh Duy làm nhóm trưởng phần video).",
        "HS lập bất phương trình, chuyển vế, đổi chiều khi nhân với −1, giải và đổi đơn vị chục cốc sang số cốc.",
        "Hai nhóm báo cáo trên bảng giảng; các nhóm khác góp ý cách trả lời bằng ngôn ngữ thực tế.",
        "GV chốt lời giải, nhận xét tinh thần làm việc nhóm, giao bài tập 1, 2, 3 trang 51 SGK và câu hỏi nhanh trên EDUVN trước tiết sau.",
      ],
    ),
  ],
};

const bptTiet2: LessonPlan = {
  header: { ...TOAN, title: "Bất phương trình bậc hai một ẩn (tiết 2)", periods: 1 },
  objectives: {
    knowledge: [
      "Vận dụng giải bất phương trình bậc hai để tìm tập xác định của hàm số chứa căn bậc hai.",
      "Giải được hệ gồm hai bất phương trình bậc hai một ẩn bằng cách lấy giao các tập nghiệm.",
      "Biết điều kiện để tam thức bậc hai luôn dương hoặc luôn âm với mọi x và vận dụng vào bài toán chứa tham số.",
    ],
    competencies: {
      general: [
        "Tự chủ và tự học: tự rà soát các bước giải, tự đánh giá mức độ thành thạo qua câu hỏi nhanh.",
        "Giao tiếp và hợp tác: làm việc theo kĩ thuật khăn trải bàn, thống nhất lời giải chung của nhóm.",
      ],
      specific: [
        "Tư duy và lập luận toán học: lập luận điều kiện a > 0 và Δ < 0 để f(x) > 0 với mọi x.",
        "Giải quyết vấn đề toán học: lựa chọn cách biểu diễn tập nghiệm trên trục số để lấy giao, hợp chính xác.",
        "Mô hình hoá toán học: trả lời các câu hỏi mới của quầy nước chanh bằng bất phương trình bậc hai.",
      ],
    },
    qualities: ["Chăm chỉ: kiên trì làm hết các dạng bài, không bỏ dở giữa chừng.", "Trung thực: tự chấm và báo cáo đúng kết quả câu hỏi nhanh."],
  },
  materials: [
    "SGK Toán 10 (Cánh Diều) tập một, Bài 4 Chương III; bài tập 4–6 trang 51.",
    "Máy chiếu, bảng giảng EDUVN có trục số; phiếu khăn trải bàn khổ A3 cho 10 nhóm.",
    "Bộ câu hỏi nhanh 6 câu trên EDUVN (2 câu tập xác định, 2 câu hệ, 2 câu tham số).",
  ],
  activities: [
    act(
      "Khởi động: Đúng hay sai?",
      "Ôn lại cách giải bất phương trình bậc hai ở tiết 1, phát hiện lại lỗi quên đổi chiều.",
      "GV chiếu 4 khẳng định: (1) −x² + 6x − 5 > 0 có tập nghiệm (1; 5); (2) −x² + 2x + 3 ≥ 0 ⇔ x² − 2x − 3 ≥ 0; (3) x² + x + 1 ≤ 0 vô nghiệm; (4) x² − 4x + 4 > 0 đúng với mọi x.",
      "HS giơ thẻ Đúng/Sai: (1) Đúng; (2) Sai vì phải đổi chiều thành ≤; (3) Đúng; (4) Sai vì x = 2 không thoả.",
      [
        "GV lần lượt chiếu 4 khẳng định, mỗi khẳng định HS có 20 giây suy nghĩ rồi giơ thẻ.",
        "HS suy nghĩ cá nhân, giơ thẻ Đúng (xanh) hoặc Sai (đỏ).",
        "GV mời HS giơ thẻ khác số đông giải thích; cả lớp tranh luận ngắn.",
        "GV chốt đáp án, nhấn mạnh lại hai lỗi đã gặp ở tiết 1 và dẫn vào các dạng toán vận dụng hôm nay.",
      ],
    ),
    split("Các dạng toán vận dụng bất phương trình bậc hai", [
      body(
        "Tìm tập xác định của hàm số chứa căn",
        "HS biết đưa điều kiện xác định của căn bậc hai về bất phương trình bậc hai và giải.",
        "Ví dụ 1: tìm tập xác định của hàm số y = √(x² − 5x + 4). Điều kiện: x² − 5x + 4 ≥ 0.",
        "Tam thức có nghiệm x = 1, x = 4, a = 1 > 0 nên D = (−∞; 1] ∪ [4; +∞).",
        [
          "GV nêu Ví dụ 1, hỏi: biểu thức dưới căn cần điều kiện gì?",
          "HS nêu điều kiện, giải bất phương trình x² − 5x + 4 ≥ 0 vào vở.",
          "Một HS trình bày trên bảng, HS khác kiểm tra dấu ngoặc ở đầu mút.",
          "GV chốt: tập xác định lấy cả nghiệm của tam thức vì điều kiện là “≥ 0”.",
        ],
      ),
      body(
        "Giải hệ bất phương trình bậc hai",
        "HS giải được hệ hai bất phương trình bậc hai bằng cách giải từng bất phương trình rồi lấy giao trên trục số.",
        "Ví dụ 2: giải hệ gồm x² − 4x + 3 < 0 và x² − 6x + 8 > 0.",
        "Bất phương trình thứ nhất có S₁ = (1; 3); thứ hai có S₂ = (−∞; 2) ∪ (4; +∞). Tập nghiệm của hệ S = S₁ ∩ S₂ = (1; 2).",
        [
          "GV giao Ví dụ 2 cho nhóm theo kĩ thuật khăn trải bàn: mỗi bạn giải một phần, phần giữa ghi kết quả chung.",
          "HS giải từng bất phương trình, biểu diễn hai tập nghiệm trên cùng một trục số, gạch bỏ phần không thuộc.",
          "Đại diện nhóm 3 trình bày trục số trên bảng giảng; các nhóm đối chiếu.",
          "GV chốt cách lấy giao bằng trục số, nhắc HS ghi rõ S₁, S₂ trước khi kết luận.",
        ],
      ),
      body(
        "Bài toán chứa tham số",
        "HS vận dụng điều kiện tam thức luôn dương, luôn âm để tìm tham số m.",
        "Kiến thức: f(x) = ax² + bx + c > 0 với mọi x ⇔ a > 0 và Δ < 0; f(x) < 0 với mọi x ⇔ a < 0 và Δ < 0. Ví dụ 3: tìm m để x² − 2mx + 4 > 0 với mọi x. Ví dụ 4: tìm m để phương trình x² + (m − 2)x + 1 = 0 vô nghiệm.",
        "Ví dụ 3: a = 1 > 0, Δ' = m² − 4 < 0 ⇔ −2 < m < 2. Ví dụ 4: Δ = (m − 2)² − 4 = m² − 4m < 0 ⇔ 0 < m < 4.",
        [
          "GV gợi ý liên hệ với định lí về dấu: khi nào parabol nằm hoàn toàn phía trên trục hoành?",
          "HS rút ra điều kiện, làm Ví dụ 3 và 4 theo cặp; GV hỗ trợ các cặp còn nhầm Δ và Δ'.",
          "Hai cặp báo cáo; lớp nhận xét cách biến đổi m² − 4m < 0 thành bất phương trình bậc hai ẩn m.",
          "GV chốt hai điều kiện, lưu ý trường hợp hệ số a chứa tham số phải xét riêng a = 0.",
        ],
      ),
    ]),
    act(
      "Luyện tập tổng hợp",
      "Củng cố ba dạng toán vừa học qua bài tập tương tự.",
      "Bài 1: tìm tập xác định của y = √(−x² + x + 6). Bài 2: tìm m để x² + 2x + m > 0 với mọi x. Bài 3: giải hệ gồm x² − 9 < 0 và x² − x − 2 ≥ 0.",
      "Bài 1: x² − x − 6 ≤ 0 nên D = [−2; 3]. Bài 2: Δ' = 1 − m < 0 ⇔ m > 1. Bài 3: (−3; 3) ∩ ((−∞; −1] ∪ [2; +∞)) = (−3; −1] ∪ [2; 3).",
      [
        "GV giao 3 bài trên EDUVN, HS làm cá nhân 10 phút.",
        "HS làm bài, nộp ảnh lời giải; GV xem bảng tổng hợp đúng/sai theo thời gian thực.",
        "GV chọn 3 bài làm tiêu biểu (một đúng, hai có lỗi) chiếu lên để cả lớp nhận xét.",
        "GV chốt đáp án, khen các em làm đúng và nhanh, ghi chú lỗi để ôn tập chương.",
      ],
    ),
    act(
      "Vận dụng: quầy nước chanh có thể lãi 400 hay 500 nghìn đồng?",
      "HS dùng bất phương trình bậc hai để trả lời câu hỏi mới về quầy nước chanh, thấy được ý nghĩa của trường hợp Δ = 0 và Δ < 0.",
      "Với lãi P(x) = −x² + 6x − 5 (trăm nghìn đồng): (1) Bán bao nhiêu để lãi ít nhất 400 nghìn đồng? (2) Có thể lãi nhiều hơn 500 nghìn đồng không?",
      "(1) P(x) ≥ 4 ⇔ x² − 6x + 9 ≤ 0 ⇔ (x − 3)² ≤ 0 ⇔ x = 3: phải bán đúng 3 chục cốc. (2) P(x) > 5 ⇔ x² − 6x + 10 < 0, có Δ' = 9 − 10 = −1 < 0 và a > 0 nên vô nghiệm: không thể lãi quá 500 nghìn đồng.",
      [
        "GV nêu hai câu hỏi, giao nhóm giải và chuẩn bị câu trả lời bằng lời cho ban cán sự lớp.",
        "HS lập bất phương trình, đổi chiều khi nhân với −1, xét dấu tam thức trong trường hợp Δ = 0 và Δ < 0.",
        "Đại diện hai nhóm trình bày; lớp so sánh với đỉnh parabol I(3; 4) đã học.",
        "GV chốt: lãi lớn nhất 400 nghìn đồng khi bán 30 cốc; giao bài tập 4–6 trang 51 và chuẩn bị bài Phương trình quy về phương trình bậc hai.",
      ],
    ),
  ],
};

const ptQuyVe: LessonPlan = {
  header: { ...TOAN, title: "Phương trình quy về phương trình bậc hai", periods: 2 },
  objectives: {
    knowledge: [
      "Giải được phương trình dạng √(ax² + bx + c) = √(dx² + ex + f) bằng cách bình phương hai vế rồi thử lại.",
      "Giải được phương trình dạng √(ax² + bx + c) = dx + e bằng cách bình phương hai vế, kết hợp điều kiện dx + e ≥ 0 hoặc thử lại.",
      "Hiểu vì sao phép bình phương có thể làm xuất hiện nghiệm ngoại lai và bắt buộc phải thử lại.",
    ],
    competencies: {
      general: [
        "Tự chủ và tự học: tự kiểm tra nghiệm bằng cách thay vào phương trình ban đầu.",
        "Giao tiếp và hợp tác: phản biện lời giải của bạn, chỉ ra bước thiếu.",
        "Giải quyết vấn đề và sáng tạo: chuyển bài toán khoảng cách trên thực tế thành phương trình chứa căn.",
      ],
      specific: [
        "Tư duy và lập luận toán học: giải thích phép biến đổi hệ quả và lí do loại nghiệm.",
        "Giải quyết vấn đề toán học: thực hiện đúng quy trình bình phương – giải – thử lại.",
        "Mô hình hoá toán học: dùng định lí Pythagore lập phương trình chứa căn cho bài toán quãng đường.",
      ],
    },
    qualities: ["Trung thực: không bỏ qua bước thử lại để “cho nhanh”.", "Trách nhiệm: hoàn thành phần việc được giao trong nhóm."],
  },
  materials: [
    "SGK Toán 10 (Cánh Diều) tập một, Chương III, Bài 5: Hai dạng phương trình quy về phương trình bậc hai.",
    "Máy chiếu, bảng giảng EDUVN, máy tính cầm tay để thử lại nghiệm.",
    "Phiếu học tập “Bạn An giải đúng hay sai?” và phiếu luyện tập 3 bài.",
  ],
  activities: [
    act(
      "Bạn An giải đúng hay sai?",
      "Tạo tình huống có vấn đề: bình phương hai vế có thể sinh nghiệm không thoả mãn phương trình ban đầu.",
      "GV chiếu lời giải của bạn An cho phương trình √(x + 3) = x − 3: bình phương được x + 3 = x² − 6x + 9 ⇔ x² − 7x + 6 = 0 ⇔ x = 1 hoặc x = 6, kết luận S = {1; 6}. HS kiểm tra lời giải.",
      "HS thay lại: x = 6 thoả mãn (√9 = 3); x = 1 cho vế trái bằng 2, vế phải bằng −2 nên không thoả. Lời giải của An sai vì thiếu bước thử lại; S = {6}.",
      [
        "GV chiếu lời giải, yêu cầu cặp đôi thay từng nghiệm vào phương trình ban đầu trong 3 phút.",
        "HS thay số, phát hiện x = 1 làm vế phải âm.",
        "Hai cặp đôi trình bày phát hiện; lớp thảo luận vì sao bình phương lại “sinh thêm” nghiệm.",
        "GV chốt: bình phương hai vế là phép biến đổi hệ quả, phải thử lại hoặc đặt điều kiện; dẫn vào bài mới.",
      ],
    ),
    split("Hai dạng phương trình quy về phương trình bậc hai", [
      body(
        "Dạng √(ax² + bx + c) = √(dx² + ex + f)",
        "HS nắm được cách giải và thực hiện được trên ví dụ cụ thể.",
        "Cách giải: bình phương hai vế được ax² + bx + c = dx² + ex + f, giải phương trình bậc hai (hoặc bậc nhất) thu được; thay các giá trị tìm được vào phương trình ban đầu, giữ lại nghiệm làm biểu thức dưới căn không âm. Ví dụ 1: √(3x² − 4x − 1) = √(2x² − 4x + 3).",
        "Bình phương: 3x² − 4x − 1 = 2x² − 4x + 3 ⇔ x² = 4 ⇔ x = 2 hoặc x = −2. Thử lại: x = 2 cho hai vế bằng √3, x = −2 cho hai vế bằng √19. Vậy S = {−2; 2}.",
        [
          "GV hướng dẫn mẫu bước bình phương, giao HS hoàn thành phần giải và thử lại.",
          "HS giải x² = 4, thay từng nghiệm vào hai biểu thức dưới căn.",
          "Một HS trình bày bảng, các bạn kiểm tra bằng máy tính cầm tay.",
          "GV chốt quy trình 3 bước: bình phương – giải – thử lại; chỉ cần kiểm tra một biểu thức dưới căn không âm vì hai biểu thức bằng nhau.",
        ],
      ),
      body(
        "Dạng √(ax² + bx + c) = dx + e",
        "HS nắm được cách giải, biết dùng điều kiện dx + e ≥ 0 để loại nghiệm nhanh.",
        "Cách giải: bình phương hai vế được ax² + bx + c = (dx + e)², giải phương trình thu được rồi thử lại (hoặc chỉ giữ nghiệm có dx + e ≥ 0). Ví dụ 2: √(2x² − 5x − 9) = x − 1.",
        "Bình phương: 2x² − 5x − 9 = x² − 2x + 1 ⇔ x² − 3x − 10 = 0 ⇔ x = 5 hoặc x = −2. Với x = −2 vế phải bằng −3 < 0 nên loại; x = 5 cho hai vế bằng 4. Vậy S = {5}.",
        [
          "GV giao Ví dụ 2 cho nhóm 4 bạn, yêu cầu ghi rõ điều kiện vế phải không âm.",
          "HS khai triển (x − 1)², giải phương trình bậc hai, đối chiếu điều kiện x ≥ 1.",
          "Đại diện nhóm báo cáo; GV mời nhóm khác so sánh hai cách: đặt điều kiện trước và thử lại sau.",
          "GV chốt: với dạng 2 nên đặt điều kiện dx + e ≥ 0 trước, lời giải gọn và ít sai.",
        ],
      ),
    ]),
    act(
      "Luyện tập",
      "Rèn kĩ năng giải hai dạng phương trình và thói quen thử lại nghiệm.",
      "Giải các phương trình: a) √(x² + 2x + 4) = √(2 − x); b) √(3x + 1) = x − 1; c) √(x² − x − 4) = x + 2.",
      "a) x² + 3x + 2 = 0 ⇔ x = −1 hoặc x = −2, thử lại đều thoả: S = {−2; −1}. b) x² − 5x = 0 ⇔ x = 0 hoặc x = 5; loại x = 0 vì vế phải âm: S = {5}. c) x² − x − 4 = x² + 4x + 4 ⇔ x = −8/5, vế phải bằng 2/5 > 0, thử lại thoả: S = {−8/5}.",
      [
        "GV giao phiếu luyện tập, HS làm cá nhân 12 phút.",
        "HS giải và thử lại bằng máy tính cầm tay; GV hỗ trợ HS chưa khai triển đúng hằng đẳng thức.",
        "Ba HS chữa bài trên bảng; lớp nhận xét câu c vì sau khi bình phương chỉ còn phương trình bậc nhất.",
        "GV chốt đáp án, lưu ý: sau khi bình phương có thể ra phương trình bậc nhất, vẫn phải thử lại.",
      ],
    ),
    act(
      "Vận dụng: đi từ nhà ra quốc lộ",
      "HS vận dụng phương trình chứa căn vào bài toán quãng đường thực tế.",
      "Nhà bạn An ở điểm A cách quốc lộ (đường thẳng) 3 km, H là hình chiếu của A trên quốc lộ. An đi thẳng từ A đến điểm M trên quốc lộ, biết quãng đường AM ngắn hơn hai lần đoạn HM là 3 km. Tính HM.",
      "Đặt HM = x (km, x > 0): AM = √(x² + 9) = 2x − 3. Bình phương: x² + 9 = 4x² − 12x + 9 ⇔ 3x² − 12x = 0 ⇔ x = 0 hoặc x = 4. Loại x = 0 (vế phải âm). Vậy HM = 4 km, AM = 5 km.",
      [
        "GV vẽ hình minh hoạ trên bảng giảng, giao nhóm lập phương trình và giải; giao bài tập 1–4 trang 58 SGK về nhà.",
        "HS dùng định lí Pythagore lập AM theo x, giải phương trình dạng 2.",
        "Một nhóm trình bày; các nhóm khác kiểm tra lại bằng bộ ba số 3, 4, 5.",
        "GV chốt lời giải, nhận xét tiết học và dặn chuẩn bị ôn tập chương III.",
      ],
    ),
  ],
};

const dauTamThuc: LessonPlan = {
  header: { ...TOAN, title: "Dấu của tam thức bậc hai", periods: 2 },
  objectives: {
    knowledge: [
      "Nhận biết tam thức bậc hai f(x) = ax² + bx + c (a ≠ 0), biệt thức Δ và nghiệm của tam thức.",
      "Phát biểu được định lí về dấu của tam thức bậc hai trong ba trường hợp Δ < 0, Δ = 0, Δ > 0.",
      "Lập được bảng xét dấu tam thức bậc hai và vận dụng vào bài toán tìm tham số.",
    ],
    competencies: {
      general: [
        "Tự chủ và tự học: tự rút ra quy luật dấu từ quan sát đồ thị.",
        "Giao tiếp và hợp tác: thảo luận nhóm, trình bày bảng xét dấu rõ ràng.",
      ],
      specific: [
        "Tư duy và lập luận toán học: liên hệ vị trí parabol với trục hoành và dấu của tam thức.",
        "Giao tiếp toán học: diễn đạt quy tắc “trong trái, ngoài cùng” bằng lời và bằng bảng.",
        "Sử dụng công cụ, phương tiện học toán: dùng GeoGebra thay đổi hệ số để quan sát.",
      ],
    },
    qualities: ["Chăm chỉ: hoàn thành đầy đủ bảng xét dấu, không dừng giữa chừng.", "Trung thực: tự đánh giá đúng mức độ hiểu bài."],
  },
  materials: [
    "SGK Toán 10 (Cánh Diều) tập một, Chương III, Bài 3: Dấu của tam thức bậc hai.",
    "Máy chiếu, GeoGebra với ba đồ thị y = x² − 4x + 3, y = x² − 4x + 4, y = x² − 4x + 5.",
    "Phiếu học tập bảng xét dấu, bảng phụ nhóm.",
  ],
  activities: [
    act(
      "Quan sát ba parabol",
      "Huy động kiến thức về đồ thị hàm số bậc hai để dự đoán dấu của tam thức.",
      "GV chiếu ba đồ thị y = x² − 4x + 3 (cắt trục hoành tại 1 và 3), y = x² − 4x + 4 (tiếp xúc trục hoành tại 2), y = x² − 4x + 5 (không cắt trục hoành). HS cho biết với mỗi hàm, giá trị y dương, âm, bằng 0 khi nào.",
      "HS nêu: đồ thị thứ nhất âm trong (1; 3), dương ngoài đoạn [1; 3]; đồ thị thứ hai dương với mọi x ≠ 2; đồ thị thứ ba luôn dương.",
      [
        "GV chiếu ba đồ thị, giao cặp đôi trả lời trên phiếu trong 4 phút.",
        "HS quan sát phần đồ thị trên, dưới trục hoành và ghi nhận xét.",
        "Ba cặp đôi báo cáo cho ba đồ thị; các bạn bổ sung.",
        "GV ghi nhận, đặt vấn đề: không vẽ đồ thị có xét được dấu không? Dẫn vào bài.",
      ],
    ),
    split("Tam thức bậc hai và định lí về dấu", [
      body(
        "Tam thức bậc hai",
        "HS nhận biết tam thức bậc hai, tính được Δ và nghiệm.",
        "Định nghĩa: tam thức bậc hai đối với x là biểu thức f(x) = ax² + bx + c, a ≠ 0; Δ = b² − 4ac; nghiệm của f(x) = 0 là nghiệm của tam thức. Ví dụ: f(x) = x² − 3x + 2 có Δ = 1, hai nghiệm 1 và 2; g(x) = 2x² − x + 3 có Δ = −23 < 0, không có nghiệm.",
        "HS tính đúng Δ và nghiệm của hai tam thức ví dụ.",
        [
          "GV yêu cầu HS đọc định nghĩa SGK và làm ví dụ.",
          "HS tính Δ, tìm nghiệm.",
          "Hai HS trả lời; lớp nhận xét.",
          "GV chốt định nghĩa và cách dùng Δ' = b'² − ac khi b chẵn.",
        ],
      ),
      body(
        "Định lí về dấu của tam thức bậc hai",
        "HS phát biểu và vận dụng được định lí trong ba trường hợp.",
        "Định lí: nếu Δ < 0 thì f(x) cùng dấu với a với mọi x; nếu Δ = 0 thì f(x) cùng dấu với a với mọi x ≠ −b/(2a); nếu Δ > 0, f(x) có hai nghiệm x₁ < x₂ thì f(x) trái dấu với a trong khoảng (x₁; x₂) và cùng dấu với a khi x < x₁ hoặc x > x₂. Ví dụ: xét dấu f(x) = −2x² + 5x − 2 và h(x) = −4x² + 4x − 1.",
        "f(x) có nghiệm 1/2 và 2, a = −2 < 0: f(x) > 0 khi 1/2 < x < 2, f(x) < 0 khi x < 1/2 hoặc x > 2. h(x) có Δ = 0, a < 0: h(x) < 0 với mọi x ≠ 1/2, h(1/2) = 0.",
        [
          "GV chia nhóm, giao mỗi nhóm một trường hợp của định lí cùng ví dụ, yêu cầu lập bảng xét dấu.",
          "HS lập bảng xét dấu trên bảng phụ; GV nhắc em Đức Thịnh và các bạn tìm xong nghiệm phải điền tiếp dấu vào bảng.",
          "Các nhóm treo bảng phụ, trình bày; lớp so sánh với ba parabol ở hoạt động mở đầu.",
          "GV chốt định lí và cách nhớ “trong trái, ngoài cùng” cho trường hợp Δ > 0.",
        ],
      ),
    ]),
    act(
      "Luyện tập xét dấu",
      "Thành thạo lập bảng xét dấu cho các tam thức thường gặp.",
      "Xét dấu: a) x² + 2x − 3; b) −x² + 6x − 9; c) 3x² − 2x + 1; d) −x² + 6x − 5.",
      "a) Nghiệm −3 và 1: âm trong (−3; 1), dương ngoài. b) −(x − 3)² ≤ 0, bằng 0 tại x = 3. c) Δ' = 1 − 3 < 0, a > 0: luôn dương. d) Nghiệm 1 và 5, a < 0: dương trong (1; 5), âm khi x < 1 hoặc x > 5 (đây là lãi của quầy nước chanh sẽ học ở bài sau).",
      [
        "GV giao 4 câu, HS làm cá nhân 10 phút.",
        "HS làm vào vở, GV quan sát và hỗ trợ.",
        "4 HS trình bày trên bảng; lớp chấm chéo.",
        "GV chốt đáp án, nhắc dấu tại nghiệm luôn bằng 0.",
      ],
    ),
    act(
      "Vận dụng: tìm tham số",
      "Vận dụng định lí về dấu vào bài toán chứa tham số, chuẩn bị cho bài bất phương trình bậc hai.",
      "Tìm m để f(x) = x² − 2x + m > 0 với mọi x. Về nhà: bài tập 1–4 trang 47 SGK.",
      "a = 1 > 0 nên cần Δ' = 1 − m < 0 ⇔ m > 1.",
      [
        "GV nêu bài toán, gợi ý dùng trường hợp Δ < 0 của định lí.",
        "HS làm theo cặp, viết điều kiện và giải.",
        "Một cặp trình bày; lớp nhận xét.",
        "GV chốt điều kiện a > 0 và Δ < 0, giao bài về nhà.",
      ],
    ),
  ],
};

const hamBacHai: LessonPlan = {
  header: { ...TOAN, title: "Hàm số bậc hai", periods: 2 },
  objectives: {
    knowledge: [
      "Nhận biết hàm số bậc hai y = ax² + bx + c (a ≠ 0) và tập xác định ℝ.",
      "Vẽ được đồ thị hàm số bậc hai: parabol có đỉnh I(−b/(2a); −Δ/(4a)), trục đối xứng x = −b/(2a).",
      "Đọc được khoảng đồng biến, nghịch biến và giá trị lớn nhất, nhỏ nhất từ đồ thị hoặc bảng biến thiên.",
    ],
    competencies: {
      general: ["Tự chủ và tự học: tự vẽ đồ thị theo các bước đã học.", "Giao tiếp và hợp tác: thảo luận nhóm khi lập bảng giá trị."],
      specific: [
        "Tư duy và lập luận toán học: giải thích vì sao đỉnh là điểm cao nhất hoặc thấp nhất.",
        "Mô hình hoá toán học: dùng hàm bậc hai mô tả độ cao quả bóng theo thời gian.",
        "Sử dụng công cụ, phương tiện học toán: vẽ và kiểm tra đồ thị bằng GeoGebra.",
      ],
    },
    qualities: ["Chăm chỉ: vẽ đồ thị cẩn thận, chính xác.", "Trách nhiệm: hoàn thành nhiệm vụ nhóm đúng thời gian."],
  },
  materials: [
    "SGK Toán 10 (Cánh Diều) tập một, Chương III, Bài 2: Hàm số bậc hai. Đồ thị hàm số bậc hai và ứng dụng.",
    "Máy chiếu, GeoGebra, giấy kẻ ô vuông, thước kẻ.",
    "Video ngắn quả bóng được đá lên cao (15 giây).",
  ],
  activities: [
    act(
      "Quả bóng bay cao nhất khi nào?",
      "Tạo hứng thú, gợi nhu cầu tìm hiểu đồ thị và điểm cao nhất của hàm bậc hai.",
      "GV chiếu video quả bóng được đá lên. Độ cao (mét) sau t giây là h(t) = −5t² + 20t + 1. Câu hỏi: quỹ đạo có hình gì? Sau bao lâu bóng đạt độ cao lớn nhất?",
      "HS dự đoán quỹ đạo dạng parabol, ước lượng thời điểm cao nhất bằng cách thử một vài giá trị t.",
      [
        "GV chiếu video và nêu câu hỏi.",
        "HS tính h(1) = 16, h(2) = 21, h(3) = 16 để dự đoán.",
        "Một vài HS nêu dự đoán.",
        "GV ghi nhận và dẫn dắt: h(t) là một hàm số bậc hai, bài học giúp tìm chính xác điểm cao nhất.",
      ],
    ),
    split("Hàm số bậc hai và đồ thị", [
      body(
        "Định nghĩa hàm số bậc hai",
        "HS nhận biết hàm số bậc hai và các hệ số a, b, c.",
        "Hàm số bậc hai là hàm số cho bởi công thức y = ax² + bx + c với a ≠ 0, tập xác định ℝ. Ví dụ: y = x² − 4x + 3; y = −2x² + x; y = 3x + 1 không phải hàm bậc hai.",
        "HS xác định đúng các hệ số và nhận dạng hàm số bậc hai.",
        [
          "GV nêu định nghĩa và các ví dụ.",
          "HS xác định a, b, c của từng hàm.",
          "HS trả lời nhanh.",
          "GV chốt định nghĩa, nhấn mạnh a ≠ 0.",
        ],
      ),
      body(
        "Đồ thị hàm số bậc hai",
        "HS nắm được đặc điểm của parabol và các bước vẽ.",
        "Đồ thị là parabol có đỉnh I(−b/(2a); −Δ/(4a)), trục đối xứng x = −b/(2a), bề lõm hướng lên khi a > 0, hướng xuống khi a < 0. Các bước vẽ: xác định đỉnh; vẽ trục đối xứng; tìm giao điểm với Oy, Ox và điểm đối xứng; vẽ parabol. Ví dụ: vẽ y = x² − 4x + 3.",
        "Đồ thị y = x² − 4x + 3: đỉnh I(2; −1), trục x = 2, cắt Oy tại (0; 3), cắt Ox tại (1; 0) và (3; 0), điểm đối xứng (4; 3).",
        [
          "GV hướng dẫn các bước vẽ, giao nhóm vẽ ví dụ trên giấy kẻ ô.",
          "HS xác định đỉnh, các điểm đặc biệt và vẽ.",
          "Nhóm trình bày; GV dùng GeoGebra kiểm tra lại.",
          "GV chốt các bước vẽ đồ thị.",
        ],
      ),
      body(
        "Sự biến thiên",
        "HS đọc được khoảng đồng biến, nghịch biến và giá trị lớn nhất, nhỏ nhất.",
        "Khi a > 0: hàm số nghịch biến trên (−∞; −b/(2a)), đồng biến trên (−b/(2a); +∞), giá trị nhỏ nhất là −Δ/(4a). Khi a < 0: đồng biến trên (−∞; −b/(2a)), nghịch biến trên (−b/(2a); +∞), giá trị lớn nhất là −Δ/(4a).",
        "Bảng biến thiên của y = x² − 4x + 3: nghịch biến trên (−∞; 2), đồng biến trên (2; +∞), giá trị nhỏ nhất bằng −1 tại x = 2.",
        [
          "GV yêu cầu HS quan sát đồ thị vừa vẽ, mô tả khi x tăng thì y thay đổi thế nào.",
          "HS lập bảng biến thiên.",
          "Một HS trình bày bảng biến thiên.",
          "GV chốt kết luận về sự biến thiên trong hai trường hợp a > 0, a < 0.",
        ],
      ),
    ]),
    act(
      "Luyện tập",
      "Củng cố kĩ năng tìm đỉnh, vẽ đồ thị, xác định hàm số.",
      "Bài 1: lập bảng biến thiên và vẽ đồ thị y = −x² + 2x + 3. Bài 2: tìm parabol y = ax² + bx + 2 đi qua A(1; 0) và có trục đối xứng x = 3/2.",
      "Bài 1: đỉnh I(1; 4), đồng biến trên (−∞; 1), nghịch biến trên (1; +∞), cắt Ox tại −1 và 3, cắt Oy tại (0; 3). Bài 2: a + b + 2 = 0 và −b/(2a) = 3/2 nên b = −3a, a = 1, b = −3: y = x² − 3x + 2.",
      [
        "GV giao 2 bài, HS làm cá nhân.",
        "HS làm bài, GV hỗ trợ.",
        "Hai HS chữa bài; lớp nhận xét.",
        "GV chốt đáp án.",
      ],
    ),
    act(
      "Vận dụng: độ cao lớn nhất của quả bóng",
      "Giải bài toán mở đầu bằng kiến thức về đỉnh parabol.",
      "Với h(t) = −5t² + 20t + 1, tìm thời điểm và độ cao lớn nhất của quả bóng. Về nhà: bài tập 1–5 trang 43 SGK.",
      "Đỉnh tại t = −20/(2·(−5)) = 2 giây, độ cao lớn nhất h(2) = −20 + 40 + 1 = 21 mét.",
      [
        "GV yêu cầu HS giải lại bài toán mở đầu.",
        "HS tính tọa độ đỉnh.",
        "Một HS trình bày, so sánh với dự đoán ban đầu.",
        "GV chốt và giao bài tập về nhà.",
      ],
    ),
  ],
};

const onTapChuong3: LessonPlan = {
  header: { ...TOAN, title: "Ôn tập chương III: Hàm số và đồ thị", periods: 2 },
  objectives: {
    knowledge: [
      "Hệ thống hoá kiến thức chương III: hàm số, tập xác định, sự biến thiên; hàm số bậc hai và đồ thị; dấu của tam thức bậc hai; bất phương trình bậc hai một ẩn; hai dạng phương trình quy về phương trình bậc hai.",
      "Giải được các dạng bài tổng hợp của chương ở mức độ thông hiểu và vận dụng.",
    ],
    competencies: {
      general: [
        "Tự chủ và tự học: tự lập sơ đồ tư duy, tự nhận ra lỗ hổng kiến thức qua bài kiểm tra nhanh.",
        "Giao tiếp và hợp tác: trình bày sơ đồ tư duy của nhóm, phản biện nhóm bạn.",
      ],
      specific: [
        "Tư duy và lập luận toán học: liên kết đỉnh parabol, dấu tam thức và tập nghiệm bất phương trình.",
        "Giải quyết vấn đề toán học: chọn phương pháp phù hợp cho từng dạng bài.",
        "Mô hình hoá toán học: giải trọn vẹn bài toán quầy nước chanh bằng kiến thức cả chương.",
      ],
    },
    qualities: ["Chăm chỉ: ôn tập đầy đủ, chủ động hỏi phần chưa vững.", "Trung thực: làm bài kiểm tra nhanh nghiêm túc."],
  },
  materials: [
    "SGK Toán 10 (Cánh Diều) tập một, Bài tập cuối chương III trang 59–60.",
    "Bộ câu hỏi nhanh 10 câu trên EDUVN, sơ đồ tư duy mẫu chương III.",
    "Giấy A0, bút màu cho 10 nhóm.",
  ],
  activities: [
    act(
      "Ai nhanh hơn?",
      "Kiểm tra nhanh mức độ nắm kiến thức chương, xác định nội dung cần ôn kĩ.",
      "10 câu trắc nghiệm trên EDUVN: tập xác định, đỉnh parabol, xét dấu tam thức, tập nghiệm bất phương trình bậc hai, thử lại nghiệm phương trình chứa căn.",
      "Bảng kết quả theo từng câu trên EDUVN; GV xác định 2–3 câu nhiều HS sai nhất.",
      [
        "GV mở bộ câu hỏi nhanh, HS dùng điện thoại hoặc máy tính bảng trả lời trong 7 phút.",
        "HS làm bài cá nhân.",
        "GV chiếu thống kê, mời HS giải thích các câu sai nhiều.",
        "GV chốt nội dung cần ôn kĩ, dẫn vào hệ thống hoá kiến thức.",
      ],
    ),
    act(
      "Hệ thống hoá kiến thức chương III",
      "HS tự xây dựng sơ đồ tư duy thể hiện mối liên hệ giữa các bài trong chương.",
      "Các nhóm lập sơ đồ tư duy 5 nhánh: hàm số (tập xác định, đồng biến, nghịch biến); hàm số bậc hai (đỉnh, trục đối xứng, bảng biến thiên); dấu tam thức bậc hai (ba trường hợp của Δ); bất phương trình bậc hai (3 bước giải); phương trình quy về bậc hai (bình phương – giải – thử lại).",
      "Sơ đồ tư duy của các nhóm trên giấy A0; sơ đồ tư duy mẫu của GV trên EDUVN.",
      [
        "GV giao mỗi nhóm lập sơ đồ tư duy trong 12 phút, mỗi nhánh có ít nhất một ví dụ.",
        "HS thảo luận, vẽ sơ đồ.",
        "Hai nhóm trình bày; các nhóm khác bổ sung.",
        "GV chiếu sơ đồ mẫu, chốt mối liên hệ: đỉnh parabol cho giá trị lớn nhất, nhỏ nhất; dấu tam thức là công cụ giải bất phương trình.",
      ],
    ),
    act(
      "Luyện tập tổng hợp",
      "Rèn kĩ năng giải các dạng bài của chương.",
      "Bài 1: tìm tập xác định của y = √(x − 1) + 1/(x − 3). Bài 2: lập bảng biến thiên của y = 2x² − 8x + 1. Bài 3: giải bất phương trình x² − 2x − 3 ≤ 0. Bài 4: giải các phương trình √(x + 3) = x − 3 và √(2x² − x − 1) = √(x² + x + 2). Bài 5: tìm m để x² − 2(m + 1)x + 9 > 0 với mọi x.",
      "Bài 1: D = [1; +∞) \\ {3}. Bài 2: đỉnh I(2; −7), nghịch biến trên (−∞; 2), đồng biến trên (2; +∞), giá trị nhỏ nhất −7. Bài 3: S = [−1; 3]. Bài 4: S = {6}; x² − 2x − 3 = 0 cho x = −1, x = 3, thử lại đều thoả nên S = {−1; 3}. Bài 5: Δ' = (m + 1)² − 9 < 0 ⇔ −4 < m < 2.",
      [
        "GV giao 5 bài theo trạm, mỗi nhóm lần lượt qua các trạm, 5 phút mỗi trạm.",
        "HS giải tại từng trạm, ghi lời giải lên phiếu chung.",
        "GV chọn nhóm trình bày từng bài; các nhóm khác chấm chéo.",
        "GV chốt đáp án, tổng kết lỗi thường gặp: quên đổi chiều, quên thử lại nghiệm, nhầm Δ và Δ'.",
      ],
    ),
    act(
      "Vận dụng: quầy nước chanh lãi tối đa bao nhiêu?",
      "Vận dụng tổng hợp đỉnh parabol và bất phương trình bậc hai vào bài toán thực tế duy nhất của chương.",
      "Với lãi P(x) = −x² + 6x − 5 (trăm nghìn đồng) khi bán x chục cốc: (1) Lãi tối đa bao nhiêu, khi bán bao nhiêu cốc? (2) Bán bao nhiêu thì lãi ít nhất 300 nghìn đồng? Về nhà: làm bài tập cuối chương và đề ôn tập trên EDUVN.",
      "(1) Đỉnh I(3; 4): lãi tối đa 400 nghìn đồng khi bán 30 cốc. (2) P(x) ≥ 3 ⇔ x² − 6x + 8 ≤ 0 ⇔ 2 ≤ x ≤ 4: bán từ 20 đến 40 cốc.",
      [
        "GV nêu bài toán, giao nhóm giải và trình bày bằng lời cho ban cán sự lớp.",
        "HS tìm đỉnh parabol, lập và giải bất phương trình.",
        "Một nhóm trình bày; lớp nhận xét.",
        "GV chốt, nhận xét buổi ôn tập, giao đề ôn tập và nhắc lịch kiểm tra cuối kì I.",
      ],
    ),
  ],
};

const vanChieuCauHien: LessonPlan = {
  header: { school: SCHOOL, department: "Tổ Ngữ văn", teacher: "Nguyễn Quốc Bảo", subject: "Ngữ văn", grade: 11, title: "Chiếu cầu hiền (Ngô Thì Nhậm) – Cấu trúc của văn bản nghị luận", periods: 2, date: "" },
  objectives: {
    knowledge: [
      "Nhận biết và phân tích được cấu trúc của văn bản nghị luận: luận đề, hệ thống luận điểm, lí lẽ và bằng chứng trong “Chiếu cầu hiền”.",
      "Hiểu đặc điểm của thể chiếu: văn bản vua dùng để ban bố mệnh lệnh, lời lẽ trang trọng, lập luận chặt chẽ.",
      "Nhận ra mục đích, quan điểm của người viết và nghệ thuật thuyết phục: lời lẽ vừa mềm mỏng vừa khiêm nhường, chân thành.",
    ],
    competencies: {
      general: [
        "Tự chủ và tự học: tự đọc trước văn bản, hoàn thành phiếu chuẩn bị bài.",
        "Giao tiếp và hợp tác: thảo luận nhóm, trình bày sơ đồ lập luận trước lớp.",
        "Giải quyết vấn đề và sáng tạo: liên hệ chính sách trọng dụng nhân tài thời nay.",
      ],
      specific: [
        "Năng lực đọc: xác định luận đề, luận điểm, lí lẽ, bằng chứng và mối quan hệ giữa chúng.",
        "Năng lực viết: viết đoạn văn nghị luận khoảng 150 chữ về vai trò của người tài.",
        "Năng lực nói và nghe: trình bày ý kiến, phản hồi ý kiến của bạn một cách tôn trọng.",
      ],
    },
    qualities: [
      "Yêu nước: trân trọng tầm nhìn của vua Quang Trung trong việc xây dựng đất nước.",
      "Trách nhiệm: ý thức rèn luyện bản thân để đóng góp cho cộng đồng.",
    ],
  },
  materials: [
    "SGK Ngữ văn 11 (Kết nối tri thức) tập một, Bài 3: Cấu trúc của văn bản nghị luận.",
    "Máy chiếu, tranh chân dung Ngô Thì Nhậm, sơ đồ trống “cấu trúc văn bản nghị luận”.",
    "Phiếu học tập số 1 (bối cảnh, thể chiếu), số 2 (sơ đồ lập luận).",
  ],
  activities: [
    act(
      "Nhà lãnh đạo cần gì để xây dựng đất nước?",
      "Kích hoạt hiểu biết của HS về vai trò của người tài, tạo tâm thế đọc văn bản.",
      "GV chiếu câu “Hiền tài là nguyên khí của quốc gia” (Thân Nhân Trung) và hỏi: theo em, một nhà lãnh đạo mới lên nắm quyền cần làm gì để thu phục người tài?",
      "Ý kiến của HS: tôn trọng, đãi ngộ, tạo cơ hội, lắng nghe…",
      [
        "GV chiếu câu nói, nêu câu hỏi, HS suy nghĩ 2 phút.",
        "HS trao đổi cặp đôi, ghi ý kiến vào giấy nhớ.",
        "3–4 HS chia sẻ ý kiến; lớp bổ sung.",
        "GV dẫn dắt: năm 1788–1789, vua Quang Trung đã giao Ngô Thì Nhậm viết “Chiếu cầu hiền” để giải bài toán này.",
      ],
    ),
    split("Đọc hiểu văn bản “Chiếu cầu hiền”", [
      body(
        "Tìm hiểu chung",
        "HS nắm được thông tin về tác giả, hoàn cảnh ra đời và đặc điểm thể chiếu.",
        "Ngô Thì Nhậm (1746–1803), người làng Tả Thanh Oai (nay thuộc Hà Nội), danh sĩ thời Lê mạt, sau giúp nhà Tây Sơn. Chiếu được viết thay vua Quang Trung, nhằm kêu gọi sĩ phu Bắc Hà còn ẩn dật ra giúp triều đại mới. Thể chiếu: văn bản của vua ban bố mệnh lệnh, viết bằng văn biền ngẫu hoặc tản văn, lời lẽ trang trọng.",
        "Phiếu học tập số 1 hoàn chỉnh: tác giả, hoàn cảnh, mục đích, đối tượng hướng tới của bài chiếu.",
        [
          "GV giao phiếu học tập số 1 dựa trên phần chuẩn bị ở nhà.",
          "HS trao đổi theo bàn, hoàn thiện phiếu.",
          "Hai HS trình bày; lớp bổ sung.",
          "GV chốt: đối tượng thuyết phục là trí thức Bắc Hà còn e ngại, nên cách viết phải vừa uy nghiêm vừa chân thành.",
        ],
      ),
      body(
        "Phân tích cấu trúc lập luận",
        "HS xác định được luận đề, ba luận điểm và cách lí lẽ, bằng chứng phục vụ luận đề.",
        "Luận đề: cầu người hiền ra giúp nước. Luận điểm 1: mối quan hệ giữa người hiền và thiên tử, mượn hình ảnh “người hiền như ngôi sao sáng trên trời cao”, sao sáng chầu về ngôi Bắc Thần. Luận điểm 2: thực trạng người hiền ẩn dật (“gõ mõ canh cửa”, “ra biển vào sông”, “chết đuối trên cạn”) và tâm trạng mong mỏi của nhà vua; lí lẽ “một cái cột không thể đỡ nổi một căn nhà lớn”. Luận điểm 3: đường lối cầu hiền cụ thể, rộng mở: dâng thư bày tỏ, quan văn võ tiến cử, được tự tiến cử.",
        "Sơ đồ lập luận trên phiếu học tập số 2: luận đề – 3 luận điểm – lí lẽ, bằng chứng tương ứng.",
        [
          "GV chia 6 nhóm, mỗi 2 nhóm phụ trách một luận điểm, hoàn thành sơ đồ trong 10 phút.",
          "HS đọc kĩ đoạn văn được giao, gạch chân lí lẽ, bằng chứng, điền vào sơ đồ.",
          "Đại diện ba nhóm trình bày nối tiếp thành sơ đồ chung; nhóm cùng nhiệm vụ bổ sung.",
          "GV chốt cấu trúc chặt chẽ: từ quy luật chung đến thực trạng, rồi đến giải pháp; các luận điểm cùng phục vụ luận đề.",
        ],
      ),
      body(
        "Nghệ thuật thuyết phục và ý nghĩa",
        "HS đánh giá được giọng điệu, cách dùng hình ảnh, điển tích và ý nghĩa tư tưởng của văn bản.",
        "Giọng điệu vừa trang trọng vừa khiêm nhường (nhà vua tự nhận “đức chưa đủ”); hình ảnh so sánh, điển tích giàu sức gợi; lời lẽ mềm mỏng mà kiên quyết. Ý nghĩa: thể hiện tầm nhìn, tấm lòng trọng hiền tài của vua Quang Trung.",
        "Câu trả lời nhóm về tác dụng của giọng điệu và hình ảnh đối với người đọc là sĩ phu Bắc Hà.",
        [
          "GV nêu câu hỏi: nếu em là một sĩ phu Bắc Hà, câu văn nào khiến em xúc động nhất, vì sao?",
          "HS suy nghĩ cá nhân, chia sẻ trong nhóm.",
          "Một số HS trình bày; lớp phản hồi.",
          "GV chốt giá trị nội dung và nghệ thuật của văn bản.",
        ],
      ),
    ]),
    act(
      "Luyện tập: nhận diện cấu trúc nghị luận",
      "Củng cố kĩ năng xác định luận đề, luận điểm, lí lẽ, bằng chứng.",
      "Đọc đoạn trích ngắn về vai trò của tự học (GV cung cấp), xác định luận đề, các luận điểm, một lí lẽ và một bằng chứng.",
      "Bảng phân tích của HS; GV đối chiếu với đáp án gợi ý.",
      [
        "GV phát đoạn trích, giao nhiệm vụ cá nhân 7 phút.",
        "HS đọc và điền bảng phân tích.",
        "Hai HS trình bày; lớp nhận xét.",
        "GV chốt cách phân biệt lí lẽ (lập luận) và bằng chứng (sự thật, số liệu, dẫn chứng).",
      ],
    ),
    act(
      "Vận dụng: trọng dụng nhân tài thời nay",
      "HS liên hệ thực tiễn, viết đoạn văn nghị luận ngắn có cấu trúc rõ ràng.",
      "Viết đoạn văn khoảng 150 chữ trình bày suy nghĩ về ý nghĩa của việc trọng dụng người tài trong xã hội hiện nay, có ít nhất một lí lẽ và một bằng chứng.",
      "Đoạn văn của HS nộp trên EDUVN, được chấm theo bảng tiêu chí 4 mức.",
      [
        "GV giao đề, chiếu bảng tiêu chí chấm.",
        "HS viết bài tại nhà.",
        "Đầu tiết sau, 2 HS đọc đoạn văn; lớp nhận xét theo tiêu chí.",
        "GV nhận xét chung, chấm và phản hồi trên EDUVN.",
      ],
    ),
  ],
};

const hoaOxiHoaKhu: LessonPlan = {
  header: { school: SCHOOL, department: "Tổ Khoa học tự nhiên", teacher: "Phạm Đức Long", subject: "Hoá học", grade: 10, title: "Phản ứng oxi hoá – khử", periods: 2, date: "" },
  objectives: {
    knowledge: [
      "Nêu được khái niệm và xác định được số oxi hoá của nguyên tử các nguyên tố trong hợp chất.",
      "Nêu được khái niệm phản ứng oxi hoá – khử, chất oxi hoá, chất khử, quá trình oxi hoá, quá trình khử.",
      "Lập được phương trình hoá học của phản ứng oxi hoá – khử theo phương pháp thăng bằng electron.",
      "Nêu được ý nghĩa của phản ứng oxi hoá – khử trong đời sống và sản xuất.",
    ],
    competencies: {
      general: ["Tự chủ và tự học: tự luyện xác định số oxi hoá theo quy tắc.", "Giao tiếp và hợp tác: thảo luận nhóm khi cân bằng phương trình."],
      specific: [
        "Nhận thức hoá học: phân biệt chất oxi hoá và chất khử dựa trên sự thay đổi số oxi hoá.",
        "Tìm hiểu thế giới tự nhiên dưới góc độ hoá học: giải thích hiện tượng gỉ sắt, sự cháy.",
        "Vận dụng kiến thức, kĩ năng đã học: đề xuất cách chống gỉ cho đồ dùng bằng sắt.",
      ],
    },
    qualities: ["Chăm chỉ: luyện tập cân bằng nhiều phương trình.", "Trách nhiệm: sử dụng hoá chất, nhiên liệu an toàn và tiết kiệm."],
  },
  materials: [
    "SGK Hoá học 10 (Kết nối tri thức), Chương 4: Phản ứng oxi hoá – khử.",
    "Video thí nghiệm đinh sắt gỉ trong nước muối, đốt cháy dây magnesium.",
    "Phiếu học tập xác định số oxi hoá, phiếu cân bằng phương trình 4 bước.",
  ],
  activities: [
    act(
      "Vì sao đinh sắt bị gỉ?",
      "Gợi hứng thú, liên hệ hiện tượng quen thuộc với sự cho – nhận electron.",
      "GV chiếu ảnh đinh sắt để lâu ngoài trời bị gỉ và video đốt dây magnesium. Câu hỏi: hai hiện tượng có điểm gì chung? Nguyên tử sắt, magnesium đã thay đổi thế nào?",
      "HS nêu: đều có oxygen tham gia, kim loại biến thành hợp chất; một số HS dự đoán kim loại nhường electron.",
      [
        "GV chiếu ảnh, video và nêu câu hỏi.",
        "HS thảo luận cặp đôi 3 phút.",
        "Hai cặp trình bày dự đoán.",
        "GV ghi nhận, dẫn vào bài: đó là phản ứng oxi hoá – khử.",
      ],
    ),
    split("Số oxi hoá và phản ứng oxi hoá – khử", [
      body(
        "Số oxi hoá",
        "HS xác định được số oxi hoá theo các quy tắc.",
        "Quy tắc: đơn chất có số oxi hoá 0; trong hợp chất, H thường là +1, O thường là −2, kim loại nhóm IA là +1, IIA là +2, Al là +3; tổng số oxi hoá trong phân tử bằng 0, trong ion bằng điện tích ion. Ví dụ: S trong H₂SO₄ là +6, N trong NH₄⁺ là −3, Mn trong KMnO₄ là +7.",
        "Phiếu học tập: số oxi hoá của các nguyên tố trong 8 chất và ion được điền đúng.",
        [
          "GV giới thiệu quy tắc, làm mẫu với H₂SO₄: 2·(+1) + x + 4·(−2) = 0 nên x = +6.",
          "HS làm phiếu học tập theo cặp.",
          "HS báo cáo; lớp chấm chéo.",
          "GV chốt các quy tắc và lưu ý trường hợp đặc biệt (H trong NaH là −1, O trong H₂O₂ là −1).",
        ],
      ),
      body(
        "Phản ứng oxi hoá – khử",
        "HS nêu được khái niệm, xác định chất oxi hoá, chất khử trong phản ứng.",
        "Phản ứng oxi hoá – khử là phản ứng có sự thay đổi số oxi hoá của một số nguyên tử, do có sự chuyển electron. Chất khử nhường electron (số oxi hoá tăng), chất oxi hoá nhận electron (số oxi hoá giảm). Ví dụ: Fe₂O₃ + 3CO → 2Fe + 3CO₂ (t°).",
        "Trong ví dụ: Fe từ +3 xuống 0, Fe₂O₃ là chất oxi hoá; C từ +2 lên +4, CO là chất khử.",
        [
          "GV yêu cầu nhóm xác định số oxi hoá các nguyên tố trước và sau phản ứng.",
          "HS thảo luận, chỉ ra nguyên tố tăng, giảm số oxi hoá.",
          "Đại diện nhóm trình bày.",
          "GV chốt khái niệm và mẹo nhớ “khử cho, O nhận”: chất khử cho electron, chất oxi hoá nhận electron.",
        ],
      ),
      body(
        "Lập phương trình theo phương pháp thăng bằng electron",
        "HS cân bằng được phương trình oxi hoá – khử qua 4 bước.",
        "Bốn bước: (1) xác định số oxi hoá thay đổi; (2) viết quá trình oxi hoá, quá trình khử; (3) tìm hệ số để tổng số electron nhường bằng tổng số electron nhận; (4) đặt hệ số vào sơ đồ, cân bằng các nguyên tố còn lại. Ví dụ: Fe + HNO₃ → Fe(NO₃)₃ + NO + H₂O.",
        "Fe⁰ → Fe⁺³ + 3e; N⁺⁵ + 3e → N⁺². Phương trình: Fe + 4HNO₃ → Fe(NO₃)₃ + NO + 2H₂O.",
        [
          "GV làm mẫu từng bước trên bảng giảng.",
          "HS làm theo trên phiếu, kiểm tra số nguyên tử N, H, O hai vế.",
          "Một HS trình bày lại bước kiểm tra.",
          "GV chốt quy trình 4 bước.",
        ],
      ),
    ]),
    act(
      "Luyện tập cân bằng",
      "Thành thạo phương pháp thăng bằng electron.",
      "Cân bằng: a) NH₃ + O₂ → NO + H₂O; b) Al + Fe₂O₃ → Al₂O₃ + Fe; c) Cu + H₂SO₄ (đặc) → CuSO₄ + SO₂ + H₂O.",
      "a) 4NH₃ + 5O₂ → 4NO + 6H₂O; b) 2Al + Fe₂O₃ → Al₂O₃ + 2Fe; c) Cu + 2H₂SO₄ → CuSO₄ + SO₂ + 2H₂O.",
      [
        "GV giao 3 câu, HS làm cá nhân 10 phút.",
        "HS cân bằng, xác định chất oxi hoá, chất khử.",
        "Ba HS chữa bài trên bảng.",
        "GV chốt đáp án, nhấn mạnh trường hợp một phần H₂SO₄ đóng vai trò môi trường.",
      ],
    ),
    act(
      "Vận dụng: luyện gang và chống gỉ",
      "Liên hệ phản ứng oxi hoá – khử với sản xuất và đời sống.",
      "Bài toán: khử hoàn toàn 16 gam Fe₂O₃ bằng CO dư, tính khối lượng sắt thu được. Câu hỏi mở: đề xuất 3 cách chống gỉ cho xe đạp, cổng sắt ở nhà.",
      "n(Fe₂O₃) = 16 : 160 = 0,1 mol, n(Fe) = 0,2 mol, m(Fe) = 11,2 gam. Cách chống gỉ: sơn phủ, bôi dầu mỡ, mạ kẽm, để nơi khô ráo.",
      [
        "GV giao bài toán và câu hỏi mở cho nhóm.",
        "HS tính toán, thảo luận cách chống gỉ.",
        "Các nhóm trình bày.",
        "GV chốt, giao bài tập SGK và bài kiểm tra 15 phút tiết sau.",
      ],
    ),
  ],
};

const khtnTuanHoan: LessonPlan = {
  header: { school: SCHOOL, department: "Tổ Khoa học tự nhiên", teacher: "Võ Ngọc Lan", subject: "Khoa học tự nhiên", grade: 8, title: "Hệ tuần hoàn ở người", periods: 2, date: "" },
  objectives: {
    knowledge: [
      "Nêu được thành phần của máu (huyết tương, hồng cầu, bạch cầu, tiểu cầu) và chức năng chính của mỗi thành phần.",
      "Nêu được cấu tạo của hệ tuần hoàn gồm tim và hệ mạch (động mạch, tĩnh mạch, mao mạch); tim có 4 ngăn và các van tim.",
      "Mô tả được đường đi của máu trong vòng tuần hoàn lớn và vòng tuần hoàn nhỏ.",
      "Nêu được một số bệnh tim mạch thường gặp và biện pháp phòng tránh; thực hiện được thao tác sơ cứu cầm máu đơn giản.",
    ],
    competencies: {
      general: ["Tự chủ và tự học: tự đo nhịp tim của bản thân.", "Giao tiếp và hợp tác: làm việc nhóm khi vẽ sơ đồ hai vòng tuần hoàn."],
      specific: [
        "Nhận thức khoa học tự nhiên: mô tả đúng đường đi của máu qua tim và mạch.",
        "Tìm hiểu tự nhiên: đo và so sánh nhịp tim trước, sau khi vận động.",
        "Vận dụng kiến thức, kĩ năng: xây dựng thói quen sống tốt cho tim mạch, sơ cứu cầm máu khi bị thương.",
      ],
    },
    qualities: ["Trách nhiệm: chăm sóc sức khoẻ bản thân và người thân.", "Nhân ái: sẵn sàng giúp đỡ người bị thương."],
  },
  materials: [
    "SGK Khoa học tự nhiên 8 (Kết nối tri thức), Bài: Máu và hệ tuần hoàn của cơ thể người.",
    "Mô hình tim người, tranh hai vòng tuần hoàn, video chu kì tim.",
    "Đồng hồ bấm giây, băng gạc, dây garô (cho phần sơ cứu).",
  ],
  activities: [
    act(
      "Đếm nhịp tim của em",
      "Gây hứng thú, giúp HS cảm nhận hoạt động của tim.",
      "HS đặt hai ngón tay lên cổ tay hoặc cổ, đếm số nhịp đập trong 1 phút. Câu hỏi: vì sao ở cổ tay cũng cảm nhận được nhịp tim?",
      "Số đo nhịp tim của HS (khoảng 70–90 lần/phút) và dự đoán: máu được tim bơm đi theo mạch máu.",
      [
        "GV hướng dẫn cách bắt mạch, bấm giờ 1 phút.",
        "HS đếm nhịp, ghi kết quả vào phiếu.",
        "Một số HS báo cáo, GV ghi lên bảng.",
        "GV dẫn dắt: tim co bóp đẩy máu đi khắp cơ thể qua hệ mạch, bài học hôm nay tìm hiểu cụ thể.",
      ],
    ),
    split("Máu và hệ tuần hoàn", [
      body(
        "Thành phần và chức năng của máu",
        "HS nêu được thành phần và chức năng của máu.",
        "Máu gồm huyết tương (khoảng 55%) và các tế bào máu (khoảng 45%): hồng cầu vận chuyển khí oxygen và carbon dioxide; bạch cầu bảo vệ cơ thể; tiểu cầu tham gia đông máu. Huyết tương vận chuyển chất dinh dưỡng, chất thải, hormone.",
        "Bảng thành phần – chức năng của máu do HS hoàn thành.",
        [
          "GV chiếu ảnh ống máu đã lắng, giao HS đọc SGK hoàn thành bảng.",
          "HS làm việc cặp đôi.",
          "HS báo cáo, lớp bổ sung.",
          "GV chốt chức năng từng thành phần.",
        ],
      ),
      body(
        "Cấu tạo tim và mạch máu",
        "HS mô tả được cấu tạo tim 4 ngăn, van tim và ba loại mạch máu.",
        "Tim có 4 ngăn: tâm nhĩ phải, tâm nhĩ trái, tâm thất phải, tâm thất trái; van nhĩ – thất và van động mạch giúp máu chảy một chiều. Chu kì tim khoảng 0,8 giây: tâm nhĩ co 0,1 giây, tâm thất co 0,3 giây, dãn chung 0,4 giây. Động mạch dẫn máu từ tim đi, tĩnh mạch dẫn máu về tim, mao mạch là nơi trao đổi chất với tế bào.",
        "HS chỉ đúng các ngăn tim trên mô hình, phân biệt ba loại mạch.",
        [
          "GV giao nhóm quan sát mô hình tim và tranh, trả lời câu hỏi trong phiếu.",
          "HS quan sát, thảo luận.",
          "Đại diện nhóm chỉ trên mô hình.",
          "GV chốt cấu tạo và giải thích vì sao thành tâm thất trái dày nhất.",
        ],
      ),
      body(
        "Hai vòng tuần hoàn",
        "HS mô tả được đường đi của máu trong vòng tuần hoàn lớn và nhỏ.",
        "Vòng tuần hoàn nhỏ: tâm thất phải → động mạch phổi → mao mạch phổi (thải CO₂, nhận O₂) → tĩnh mạch phổi → tâm nhĩ trái. Vòng tuần hoàn lớn: tâm thất trái → động mạch chủ → mao mạch các cơ quan (trao đổi chất) → tĩnh mạch chủ → tâm nhĩ phải.",
        "Sơ đồ hai vòng tuần hoàn do nhóm vẽ, tô đỏ máu giàu O₂, tô xanh máu nghèo O₂.",
        [
          "GV chiếu video, giao nhóm vẽ sơ đồ.",
          "HS vẽ sơ đồ trên giấy A3.",
          "Hai nhóm trình bày; lớp nhận xét.",
          "GV chốt đường đi của máu và vai trò của mỗi vòng.",
        ],
      ),
    ]),
    act(
      "Luyện tập",
      "Củng cố kiến thức về máu và tuần hoàn.",
      "Trò chơi “Ai là người đưa thư”: sắp xếp thẻ tên các ngăn tim và mạch máu theo đúng đường đi của máu trong mỗi vòng; trả lời 5 câu hỏi nhanh.",
      "Các dãy thẻ được xếp đúng; kết quả câu hỏi nhanh trên EDUVN.",
      [
        "GV phát bộ thẻ cho nhóm, bấm giờ 3 phút.",
        "HS sắp xếp thẻ, làm câu hỏi nhanh.",
        "Nhóm nhanh nhất trình bày.",
        "GV chốt và khen nhóm làm tốt.",
      ],
    ),
    act(
      "Vận dụng: bảo vệ tim mạch và sơ cứu cầm máu",
      "Vận dụng kiến thức vào chăm sóc sức khoẻ và xử lí tình huống chảy máu.",
      "Đo nhịp tim trước và sau khi nhảy dây 1 phút, giải thích sự thay đổi. Thực hành băng bó vết thương ở lòng bàn tay (chảy máu mao mạch, tĩnh mạch) bằng băng gạc. Về nhà: lập thời gian biểu vận động 30 phút mỗi ngày.",
      "Số liệu nhịp tim tăng sau vận động (thường thêm 30–50 lần/phút); thao tác băng bó đúng; thời gian biểu của HS.",
      [
        "GV hướng dẫn và giao nhiệm vụ cho nhóm.",
        "HS đo nhịp, thực hành băng bó dưới sự giám sát của GV.",
        "Nhóm báo cáo số liệu và trình diễn thao tác.",
        "GV chốt: vận động làm tim đập nhanh để cung cấp nhiều O₂ hơn; tập luyện đều đặn, ăn ít muối, mỡ, không hút thuốc giúp phòng bệnh cao huyết áp, xơ vữa động mạch.",
      ],
    ),
  ],
};

const anhPresentPerfect: LessonPlan = {
  header: { school: SCHOOL, department: "Tổ Xã hội", teacher: "Hoàng Minh", subject: "Tiếng Anh", grade: 10, title: "Unit 5: Inventions – Language: Present perfect", periods: 1, date: "" },
  objectives: {
    knowledge: [
      "Nắm được cấu trúc thì hiện tại hoàn thành: S + have/has + V3/V-ed; câu phủ định, câu hỏi.",
      "Phân biệt ba cách dùng: kinh nghiệm (ever, never), hành động bắt đầu trong quá khứ kéo dài đến hiện tại (for, since), hành động vừa xảy ra có kết quả ở hiện tại (just, already, yet).",
      "Phân biệt thì hiện tại hoàn thành với quá khứ đơn khi nói về các phát minh.",
    ],
    competencies: {
      general: ["Tự chủ và tự học: tự lập bảng động từ bất quy tắc thường gặp.", "Giao tiếp và hợp tác: phỏng vấn bạn về trải nghiệm dùng các phát minh."],
      specific: [
        "Ngôn ngữ: sử dụng đúng thì hiện tại hoàn thành trong câu nói và câu viết.",
        "Nói: hỏi và trả lời với “Have you ever…?”.",
        "Viết: viết 5 câu về các phát minh đã thay đổi cuộc sống của em.",
      ],
    },
    qualities: ["Chăm chỉ: luyện tập động từ bất quy tắc mỗi ngày.", "Trách nhiệm: sử dụng thiết bị công nghệ hợp lí."],
  },
  materials: [
    "SGK Tiếng Anh 10 Global Success (Kết nối tri thức), Unit 5: Inventions, phần Language.",
    "Máy chiếu, tranh các phát minh (điện thoại, máy in 3D, robot hút bụi).",
    "Phiếu bài tập chia động từ, thẻ hỏi “Have you ever…?”.",
  ],
  activities: [
    act(
      "Have you ever…?",
      "Khởi động, gợi lại cấu trúc hiện tại hoàn thành qua câu hỏi kinh nghiệm.",
      "GV chiếu tranh máy in 3D, robot hút bụi, đồng hồ thông minh và hỏi: “Have you ever used a 3D printer?”, “Has your family bought a robot vacuum cleaner?”.",
      "HS trả lời “Yes, I have.” / “No, I haven't.”; nhận ra cấu trúc have/has + V3.",
      [
        "GV chiếu tranh, đặt câu hỏi cho 4–5 HS.",
        "HS trả lời, sau đó hỏi lại bạn bên cạnh.",
        "Một vài cặp hỏi – đáp trước lớp.",
        "GV ghi các câu trả lời lên bảng, gạch chân have/has + V3 và dẫn vào bài.",
      ],
    ),
    split("Thì hiện tại hoàn thành", [
      body(
        "Cấu trúc",
        "HS nắm được cấu trúc khẳng định, phủ định, nghi vấn.",
        "Khẳng định: S + have/has + V3/V-ed (Scientists have invented many useful devices.). Phủ định: S + haven't/hasn't + V3 (We haven't used this app yet.). Nghi vấn: Have/Has + S + V3? (Has she ever flown in a plane?).",
        "Bảng cấu trúc hoàn chỉnh trong vở của HS, có ví dụ cho mỗi dạng.",
        [
          "GV giới thiệu cấu trúc qua ví dụ trong bài hội thoại Getting Started.",
          "HS hoàn thành bảng cấu trúc, đặt thêm 1 ví dụ mỗi dạng.",
          "HS đọc ví dụ của mình; lớp sửa lỗi.",
          "GV chốt, lưu ý he/she/it dùng has.",
        ],
      ),
      body(
        "Cách dùng và phân biệt với quá khứ đơn",
        "HS phân biệt được ba cách dùng và nhận biết dấu hiệu thời gian.",
        "Kinh nghiệm: I have never seen a robot teacher. Kéo dài đến hiện tại: We have used smartphones for over fifteen years / since 2010. Vừa xảy ra: Scientists have just made a new battery. So sánh quá khứ đơn với thời điểm xác định: Alexander Graham Bell invented the telephone in 1876.",
        "HS xếp 10 câu ví dụ vào đúng nhóm cách dùng, chỉ ra dấu hiệu thời gian.",
        [
          "GV phát 10 thẻ câu, giao nhóm xếp vào bảng 4 cột (3 cách dùng và quá khứ đơn).",
          "HS thảo luận, xếp thẻ.",
          "Các nhóm đối chiếu kết quả.",
          "GV chốt: có thời điểm xác định trong quá khứ (in 1876, last year) thì dùng quá khứ đơn.",
        ],
      ),
    ]),
    act(
      "Practice",
      "Luyện chia động từ đúng thì.",
      "Chia động từ: 1) My father (buy) a robot vacuum cleaner last month. It (save) us a lot of time since then. 2) (you / ever / try) a translation app? 3) Thomas Edison (not invent) the telephone. 4) They (just / launch) a new electric car.",
      "1) bought / has saved; 2) Have you ever tried; 3) didn't invent; 4) have just launched.",
      [
        "GV giao phiếu bài tập, HS làm cá nhân 6 phút.",
        "HS làm bài, so sánh với bạn.",
        "HS đọc đáp án; lớp sửa.",
        "GV chốt đáp án, giải thích câu 1 dùng hai thì khác nhau.",
      ],
    ),
    act(
      "Production: inventions in my life",
      "HS dùng thì hiện tại hoàn thành để nói và viết về trải nghiệm cá nhân.",
      "Phỏng vấn 3 bạn với thẻ “Have you ever…?” rồi viết 5 câu về các phát minh đã thay đổi cuộc sống của em, nộp trên EDUVN.",
      "Bảng phỏng vấn và đoạn viết 5 câu của HS.",
      [
        "GV phát thẻ, hướng dẫn cách ghi chép khi phỏng vấn.",
        "HS di chuyển phỏng vấn bạn, ghi lại.",
        "Một số HS báo cáo: “Lan has used a smartwatch for two years.”",
        "GV nhận xét, giao viết 5 câu về nhà.",
      ],
    ),
  ],
};

const suCmt8: LessonPlan = {
  header: { school: SCHOOL, department: "Tổ Xã hội", teacher: "Trần Mai Phương", subject: "Lịch sử", grade: 12, title: "Cách mạng tháng Tám năm 1945", periods: 2, date: "" },
  objectives: {
    knowledge: [
      "Nêu được bối cảnh lịch sử và thời cơ của Cách mạng tháng Tám năm 1945.",
      "Trình bày được diễn biến chính của cuộc Tổng khởi nghĩa giành chính quyền trong cả nước.",
      "Phân tích được nguyên nhân thắng lợi, ý nghĩa lịch sử và bài học kinh nghiệm của Cách mạng tháng Tám.",
    ],
    competencies: {
      general: ["Tự chủ và tự học: khai thác tư liệu, lập đường thời gian.", "Giao tiếp và hợp tác: thảo luận, trình bày theo nhóm."],
      specific: [
        "Tìm hiểu lịch sử: khai thác tư liệu, bản đồ, hình ảnh về Tổng khởi nghĩa.",
        "Nhận thức và tư duy lịch sử: giải thích vì sao Đảng chớp đúng thời cơ.",
        "Vận dụng kiến thức, kĩ năng: rút ra ý nghĩa của bài học thời cơ đối với hiện nay.",
      ],
    },
    qualities: ["Yêu nước: tự hào về truyền thống đấu tranh của dân tộc.", "Trách nhiệm: ý thức giữ gìn độc lập, chủ quyền."],
  },
  materials: [
    "SGK Lịch sử 12 (Kết nối tri thức), Bài 6: Cách mạng tháng Tám năm 1945.",
    "Lược đồ Tổng khởi nghĩa tháng Tám năm 1945, ảnh mít tinh ngày 19/8/1945 tại Hà Nội.",
    "Video trích đoạn Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập ngày 2/9/1945.",
  ],
  activities: [
    act(
      "Mùa thu năm ấy",
      "Tạo tâm thế, kết nối cảm xúc với sự kiện lịch sử.",
      "GV chiếu ảnh quần chúng mít tinh tại Nhà hát Lớn Hà Nội ngày 19/8/1945 và đoạn nhạc “Mười chín tháng Tám”. Câu hỏi: bức ảnh nói về sự kiện gì? Em biết gì về sự kiện ấy?",
      "Câu trả lời của HS về Cách mạng tháng Tám, ngày 19/8, ngày 2/9.",
      [
        "GV chiếu ảnh, mở nhạc, nêu câu hỏi.",
        "HS quan sát, suy nghĩ.",
        "3–4 HS chia sẻ.",
        "GV dẫn vào bài: vì sao chỉ trong khoảng nửa tháng, nhân dân cả nước đã giành được chính quyền?",
      ],
    ),
    split("Tìm hiểu Cách mạng tháng Tám năm 1945", [
      body(
        "Bối cảnh và thời cơ",
        "HS nêu được bối cảnh thế giới, trong nước và giải thích được thời cơ “ngàn năm có một”.",
        "Thế giới: tháng 8/1945, Liên Xô tuyên chiến với Nhật (8/8), Mĩ ném bom nguyên tử xuống Hi-rô-si-ma (6/8) và Na-ga-xa-ki (9/8); ngày 15/8/1945, Nhật đầu hàng Đồng minh không điều kiện. Trong nước: quân Nhật ở Đông Dương hoang mang, chính phủ Trần Trọng Kim rệu rã; lực lượng cách mạng đã được chuẩn bị qua Mặt trận Việt Minh (thành lập 19/5/1941), Khu giải phóng Việt Bắc (6/1945). Thời cơ: từ khi Nhật đầu hàng đến trước khi quân Đồng minh vào Đông Dương.",
        "Phiếu học tập nêu đủ điều kiện khách quan, chủ quan và giới hạn của thời cơ.",
        [
          "GV giao nhóm đọc tư liệu, hoàn thành phiếu “Thời cơ”.",
          "HS khai thác tư liệu SGK.",
          "Đại diện nhóm trình bày; lớp bổ sung.",
          "GV chốt: thời cơ chỉ tồn tại trong thời gian ngắn, đòi hỏi hành động kịp thời.",
        ],
      ),
      body(
        "Diễn biến Tổng khởi nghĩa",
        "HS trình bày được các mốc chính trên đường thời gian và lược đồ.",
        "Đêm 13/8/1945, Ủy ban Khởi nghĩa toàn quốc ra Quân lệnh số 1. Ngày 14–15/8, Hội nghị toàn quốc của Đảng tại Tân Trào quyết định Tổng khởi nghĩa; ngày 16–17/8, Quốc dân Đại hội Tân Trào tán thành chủ trương, cử Ủy ban Dân tộc giải phóng Việt Nam do Hồ Chí Minh làm Chủ tịch. Khởi nghĩa thắng lợi ở Hà Nội (19/8), Huế (23/8), Sài Gòn (25/8); đến 28/8 cơ bản giành chính quyền trong cả nước. Ngày 30/8, vua Bảo Đại thoái vị. Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình.",
        "Đường thời gian 13/8 – 2/9/1945 và lược đồ được đánh dấu các địa phương.",
        [
          "GV giao nhóm lập đường thời gian, đánh dấu trên lược đồ.",
          "HS đọc SGK, vẽ đường thời gian.",
          "Hai nhóm trình bày trên lược đồ.",
          "GV chốt diễn biến, nhấn mạnh thắng lợi ở ba trung tâm lớn có ý nghĩa quyết định.",
        ],
      ),
      body(
        "Nguyên nhân thắng lợi, ý nghĩa và bài học",
        "HS phân tích được nguyên nhân, ý nghĩa và bài học kinh nghiệm.",
        "Nguyên nhân: truyền thống yêu nước; sự lãnh đạo đúng đắn của Đảng do Hồ Chí Minh đứng đầu; quá trình chuẩn bị 15 năm (1930–1945); khối đoàn kết toàn dân trong Mặt trận Việt Minh; thời cơ thuận lợi khi phát xít bị Đồng minh đánh bại. Ý nghĩa: lật đổ ách thống trị của Pháp và Nhật, chế độ quân chủ; khai sinh nước Việt Nam Dân chủ Cộng hoà; mở ra kỉ nguyên độc lập, tự do; cổ vũ phong trào giải phóng dân tộc. Bài học: chớp thời cơ, kết hợp lực lượng chính trị với lực lượng vũ trang, xây dựng khối đoàn kết toàn dân.",
        "Sơ đồ tư duy nguyên nhân – ý nghĩa – bài học của nhóm.",
        [
          "GV giao nhóm làm sơ đồ tư duy.",
          "HS thảo luận, vẽ sơ đồ.",
          "Nhóm trình bày, phản biện.",
          "GV chốt, phân biệt nguyên nhân khách quan và chủ quan, khẳng định nguyên nhân chủ quan là quyết định.",
        ],
      ),
    ]),
    act(
      "Luyện tập",
      "Củng cố kiến thức theo định dạng câu hỏi đúng sai và trắc nghiệm.",
      "8 câu trắc nghiệm và 2 câu đúng sai trên EDUVN về thời cơ, diễn biến, ý nghĩa.",
      "Kết quả làm bài trên EDUVN; GV thống kê câu sai nhiều.",
      [
        "GV giao bài, HS làm 10 phút.",
        "HS làm cá nhân.",
        "GV chiếu thống kê, chữa câu sai nhiều.",
        "GV chốt kiến thức trọng tâm.",
      ],
    ),
    act(
      "Vận dụng: bài học thời cơ hôm nay",
      "Liên hệ bài học lịch sử với thực tiễn.",
      "Viết đoạn văn khoảng 200 chữ: bài học “chớp thời cơ” của Cách mạng tháng Tám có ý nghĩa gì với việc học tập và phát triển của đất nước trong thời kì hội nhập?",
      "Đoạn văn của HS nộp trên EDUVN.",
      [
        "GV giao đề và tiêu chí.",
        "HS viết bài ở nhà.",
        "Đầu tiết sau, 2 HS trình bày.",
        "GV nhận xét, phản hồi trên EDUVN.",
      ],
    ),
  ],
};

const tinIf: LessonPlan = {
  header: { school: SCHOOL, department: "Tổ Toán – Tin", teacher: "Hồ Bích Ngọc", subject: "Tin học", grade: 10, title: "Câu lệnh rẽ nhánh if", periods: 2, date: "" },
  objectives: {
    knowledge: [
      "Biết biểu thức lôgic với các phép so sánh (==, !=, <, >, <=, >=) và phép toán and, or, not trong Python.",
      "Viết được câu lệnh rẽ nhánh dạng thiếu (if), dạng đủ (if … else) và nhiều nhánh (if … elif … else).",
      "Viết được chương trình đơn giản có sử dụng câu lệnh rẽ nhánh.",
    ],
    competencies: {
      general: ["Tự chủ và tự học: tự chạy thử và sửa lỗi chương trình.", "Giải quyết vấn đề và sáng tạo: phân tích bài toán thành các trường hợp."],
      specific: [
        "Giải quyết vấn đề với sự trợ giúp của máy tính: chuyển điều kiện bằng lời thành biểu thức lôgic.",
        "Ứng dụng công nghệ thông tin: sử dụng môi trường lập trình Python để viết, chạy, kiểm thử chương trình.",
      ],
    },
    qualities: ["Chăm chỉ: kiên trì tìm lỗi.", "Trung thực: tự viết chương trình, không sao chép."],
  },
  materials: [
    "SGK Tin học 10 (Kết nối tri thức), Chủ đề F: Câu lệnh rẽ nhánh if.",
    "Phòng máy có cài Python 3 và IDLE hoặc Thonny.",
    "Phiếu bài tập 4 chương trình, bộ test mẫu.",
  ],
  activities: [
    act(
      "Nếu… thì…",
      "Nhận ra cấu trúc rẽ nhánh trong đời sống, dẫn vào câu lệnh if.",
      "GV nêu tình huống: “Nếu trời mưa thì em mang áo mưa, ngược lại em đội mũ”. HS nêu thêm 2 tình huống “nếu… thì…” và chỉ ra điều kiện.",
      "Các câu “nếu… thì… ngược lại…” của HS và điều kiện tương ứng.",
      [
        "GV nêu tình huống và yêu cầu.",
        "HS suy nghĩ, ghi ra giấy.",
        "Một số HS chia sẻ.",
        "GV chốt: máy tính cũng cần chọn việc theo điều kiện, Python dùng câu lệnh if.",
      ],
    ),
    split("Biểu thức lôgic và câu lệnh if", [
      body(
        "Biểu thức lôgic",
        "HS viết được biểu thức lôgic cho các điều kiện thường gặp.",
        "Phép so sánh cho giá trị True hoặc False. Ví dụ: n % 2 == 0 (n chẵn); 0 <= diem <= 10; (x > 0) and (y > 0). Phép and đúng khi cả hai đúng, or đúng khi ít nhất một đúng, not đảo giá trị.",
        "HS viết đúng 6 biểu thức lôgic trên phiếu.",
        [
          "GV giới thiệu phép so sánh, phép lôgic qua ví dụ chạy trực tiếp trên Python Shell.",
          "HS thử nghiệm trên máy.",
          "HS báo cáo kết quả.",
          "GV chốt, lưu ý phân biệt = (gán) và == (so sánh).",
        ],
      ),
      body(
        "Câu lệnh if, if … else, if … elif … else",
        "HS viết được câu lệnh rẽ nhánh đúng cú pháp, thụt lề đúng.",
        "Cú pháp: if <điều kiện>: <khối lệnh> (thụt lề 4 dấu cách); else: <khối lệnh>; elif dùng khi có nhiều trường hợp. Ví dụ: nhập số nguyên n, in “chẵn” hoặc “lẻ”; nhập điểm, in mức Tốt (≥ 8), Khá (≥ 6,5), Đạt (≥ 5), Chưa đạt.",
        "Hai chương trình chạy đúng trên máy của HS với bộ test mẫu.",
        [
          "GV viết mẫu chương trình chẵn lẻ, giao HS viết chương trình xếp mức theo điểm.",
          "HS gõ, chạy thử với điểm 9; 7; 5,5; 3.",
          "Hai HS chiếu chương trình; lớp góp ý.",
          "GV chốt cú pháp, dấu hai chấm và thụt lề; thứ tự xét điều kiện từ cao xuống thấp.",
        ],
      ),
    ]),
    act(
      "Luyện tập",
      "Rèn kĩ năng viết chương trình có rẽ nhánh.",
      "Bài 1: nhập hai số a, b, in số lớn hơn. Bài 2: giải phương trình bậc nhất ax + b = 0 (xét a = 0).",
      "Bài 1 dùng if a > b. Bài 2: a ≠ 0 thì x = −b/a; a = 0 và b = 0 thì vô số nghiệm; a = 0, b ≠ 0 thì vô nghiệm.",
      [
        "GV giao 2 bài, HS làm trên máy 15 phút.",
        "HS viết, kiểm thử với bộ test.",
        "HS trình chiếu, giải thích các nhánh.",
        "GV chốt, nhắc kiểm thử đủ mọi trường hợp.",
      ],
    ),
    act(
      "Vận dụng: năm nhuận",
      "Vận dụng biểu thức lôgic phức hợp vào bài toán thực tế.",
      "Viết chương trình nhập năm y, kiểm tra năm nhuận: năm chia hết cho 4 nhưng không chia hết cho 100, hoặc chia hết cho 400.",
      "Điều kiện (y % 4 == 0 and y % 100 != 0) or y % 400 == 0; test: 2024 nhuận, 1900 không nhuận, 2000 nhuận, 2026 không nhuận.",
      [
        "GV giao bài, gợi ý tách điều kiện.",
        "HS viết, kiểm thử với 4 năm mẫu.",
        "Một HS trình bày.",
        "GV chốt, giao bài tập SGK về nhà.",
      ],
    ),
  ],
};

export const LESSONS: DLesson[] = [
  { owner: "ha", plan: bptTiet1, teachDay: 0, className: "10A1" },
  { owner: "ha", plan: bptTiet2, teachDay: 1, className: "10A3" },
  { owner: "ha", plan: ptQuyVe, teachDay: 2, className: "10A1" },
  { owner: "ha", plan: dauTamThuc, teachDay: -6, className: "10A1" },
  { owner: "ha", plan: hamBacHai, teachDay: -20, className: "10A1" },
  { owner: "ha", plan: onTapChuong3, teachDay: 4, className: "10A1" },
  { owner: "bao-gv", plan: vanChieuCauHien, teachDay: -3, className: "11A3" },
  { owner: "long", plan: hoaOxiHoaKhu, teachDay: -10, className: "10A1" },
  { owner: "lan", plan: khtnTuanHoan, teachDay: -1, className: "8A2" },
  { owner: "minh", plan: anhPresentPerfect, teachDay: 1, className: "10A1" },
  { owner: "phuong", plan: suCmt8, teachDay: -5, className: "12A1" },
  { owner: "ngoc", plan: tinIf, teachDay: 3, className: "10A1" },
];

// =====================================================================================
// 2. BỘ SLIDE
// =====================================================================================

type Slide = DDeck["deck"]["slides"][number];
const sT = (title: string, sub: string, notes: string): Slide => ({ layout: "title", title, bullets: [sub], notes });
const sS = (title: string, desc: string, notes: string): Slide => ({ layout: "section", title, bullets: [desc], notes });
const sB = (title: string, bullets: string[], notes: string): Slide => ({ layout: "bullets", title, bullets, notes });
const sC = (title: string, left: string[], right: string[], notes: string): Slide => ({ layout: "two_column", title, left, right, notes });
const sQ = (title: string, question: string, options: string[], answer: number, notes: string): Slide => ({ layout: "quiz", title, question, options, answer, notes });

export const DECKS: DDeck[] = [
  {
    owner: "ha",
    fromLesson: "Bất phương trình bậc hai một ẩn",
    deck: {
      title: "Bất phương trình bậc hai một ẩn",
      subtitle: "Toán 10 · Cánh Diều · Chương III, Bài 4",
      subject: "Toán",
      grade: 10,
      slides: [
        sT("Bất phương trình bậc hai một ẩn", "Toán 10 · Lớp 10A1 · GV: Lê Thu Hà", "Chào lớp, giới thiệu mục tiêu: giải được bất phương trình bậc hai và trả lời câu hỏi của quầy nước chanh."),
        sB("Quầy nước chanh của lớp", ["Bán x chục cốc thì lãi P(x) = −x² + 6x − 5 (trăm nghìn đồng)", "Bán 2 chục cốc lãi bao nhiêu? Bán 6 chục cốc thì sao?", "Bán trong khoảng nào thì quầy có lãi?"], "Cho cặp đôi tính 3 phút. Đáp số: P(2) = 3, tức lãi 300 nghìn; P(6) = −5, tức lỗ 500 nghìn. Ghi lại các dự đoán lên bảng."),
        sS("1. Khái niệm", "Nhận dạng bất phương trình bậc hai một ẩn", "Chuyển sang phần định nghĩa."),
        sB("Định nghĩa", ["Dạng ax² + bx + c > 0 (hoặc ≥ 0, < 0, ≤ 0), với a ≠ 0", "Nghiệm: giá trị x làm bất phương trình đúng", "Tập nghiệm S: tập hợp tất cả các nghiệm", "Ví dụ: −x² + 6x − 5 > 0 là bất phương trình bậc hai; 3x − 1 < 0 thì không"], "Hỏi nhanh: x = 2 có là nghiệm không? Thay vào được 3 > 0 nên có."),
        sS("2. Cách giải", "Xét dấu tam thức bậc hai", "Nhắc lại định lí về dấu đã học tuần trước."),
        sB("Ba bước giải", ["Bước 1: xác định a, tìm nghiệm của f(x) = ax² + bx + c (nếu có)", "Bước 2: lập bảng xét dấu theo quy tắc “trong trái, ngoài cùng”", "Bước 3: chọn các khoảng làm f(x) đúng dấu đề yêu cầu", "Chú ý: nhân hai vế với số âm phải đổi chiều bất phương trình"], "Nhấn mạnh dòng chú ý, đây là lỗi nhiều em hay mắc. Bước 1 xong phải sang Bước 2, không dừng ở tìm nghiệm."),
        sC("Ví dụ: 2x² − 3x − 2 ≥ 0", ["Δ = 9 + 16 = 25", "Nghiệm x = −1/2 và x = 2", "a = 2 > 0"], ["f(x) ≥ 0 ở ngoài hai nghiệm", "Lấy cả hai đầu mút (dấu ≥)", "S = (−∞; −1/2] ∪ [2; +∞)"], "Làm mẫu trên bảng giảng, vẽ bảng xét dấu. Hỏi HS vì sao dùng ngoặc vuông."),
        sC("Khi Δ < 0", ["−3x² + 2x − 1 < 0", "Δ' = 1 − 3 = −2 < 0, a < 0", "f(x) < 0 với mọi x, S = ℝ"], ["x² + x + 1 ≤ 0", "Δ = −3 < 0, a > 0", "f(x) > 0 với mọi x, vô nghiệm"], "So sánh hai ví dụ: cùng Δ < 0 nhưng kết luận khác nhau vì dấu của a và chiều bất phương trình."),
        sS("3. Đọc nghiệm từ đồ thị", "Phần parabol phía trên trục hoành", "Mở GeoGebra vẽ y = −x² + 6x − 5."),
        sB("Trở lại quầy nước chanh", ["Parabol y = −x² + 6x − 5 cắt trục hoành tại x = 1 và x = 5", "Phần đồ thị phía trên trục hoành ứng với 1 < x < 5", "Có lãi khi bán nhiều hơn 10 cốc và ít hơn 50 cốc", "Lãi lớn nhất tại đỉnh x = 3: P(3) = 4, tức 400 nghìn đồng"], "Đối chiếu với dự đoán ban đầu của các cặp đôi."),
        sQ("Câu hỏi nhanh", "Tập nghiệm của bất phương trình −x² + 2x + 3 ≥ 0 là", ["(−∞; −1] ∪ [3; +∞)", "[−1; 3]", "(−1; 3)", "ℝ"], 1, "Đáp án B. Nhân với −1 được x² − 2x − 3 ≤ 0, nhớ đổi chiều. Ai chọn A là quên đổi chiều."),
        sQ("Vận dụng", "Quầy muốn lãi ít nhất 300 nghìn đồng, tức P(x) ≥ 3. Lớp cần bán bao nhiêu cốc?", ["Từ 10 đến 50 cốc", "Từ 20 đến 40 cốc", "Đúng 30 cốc", "Từ 30 đến 50 cốc"], 1, "Đáp án B: x² − 6x + 8 ≤ 0 nên 2 ≤ x ≤ 4 (chục cốc)."),
        sB("Dặn dò", ["Làm bài tập 1, 2, 3 trang 51 SGK", "Làm câu hỏi nhanh trên EDUVN trước tiết sau", "Nhóm quay video 60 giây giải thích cách giải cho bạn vắng"], "Nhắc nhóm của Khánh Duy phụ trách video, hạn nộp tối Chủ nhật."),
      ],
    },
  },
  {
    owner: "ha",
    fromLesson: "Dấu của tam thức bậc hai",
    deck: {
      title: "Dấu của tam thức bậc hai",
      subtitle: "Toán 10 · Cánh Diều · Chương III, Bài 3",
      subject: "Toán",
      grade: 10,
      slides: [
        sT("Dấu của tam thức bậc hai", "Toán 10 · GV: Lê Thu Hà", "Mở đầu bằng ba parabol trên GeoGebra."),
        sC("Ba parabol cùng a = 1", ["y = x² − 4x + 3: cắt trục hoành tại 1 và 3", "y = x² − 4x + 4: tiếp xúc tại x = 2", "y = x² − 4x + 5: không cắt trục hoành"], ["Âm trong (1; 3), dương ngoài", "Dương với mọi x ≠ 2", "Luôn dương"], "Cho HS nhận xét dấu của y trước khi hiện cột phải."),
        sS("1. Tam thức bậc hai", "Biểu thức f(x) = ax² + bx + c, a ≠ 0", "Chuyển sang định nghĩa."),
        sB("Định nghĩa", ["Tam thức bậc hai: f(x) = ax² + bx + c với a ≠ 0", "Biệt thức Δ = b² − 4ac (hoặc Δ' = b'² − ac khi b = 2b')", "Nghiệm của tam thức là nghiệm của phương trình f(x) = 0"], "Ví dụ nhanh: f(x) = x² − 3x + 2 có nghiệm 1 và 2."),
        sS("2. Định lí về dấu", "Ba trường hợp theo Δ", "Đây là phần trọng tâm."),
        sB("Định lí", ["Δ < 0: f(x) cùng dấu với a với mọi x", "Δ = 0: f(x) cùng dấu với a với mọi x ≠ −b/(2a)", "Δ > 0: trong khoảng hai nghiệm f(x) trái dấu a, ngoài khoảng cùng dấu a", "Cách nhớ: “trong trái, ngoài cùng”"], "Cho HS đọc to cách nhớ."),
        sC("Ví dụ: f(x) = −2x² + 5x − 2", ["Δ = 25 − 16 = 9 > 0", "Nghiệm x = 1/2 và x = 2", "a = −2 < 0"], ["f(x) > 0 khi 1/2 < x < 2", "f(x) < 0 khi x < 1/2 hoặc x > 2", "f(1/2) = f(2) = 0"], "Vẽ bảng xét dấu đầy đủ. Nhắc em nào tìm xong nghiệm phải điền tiếp dấu."),
        sQ("Kiểm tra nhanh", "Tam thức 3x² − 2x + 1 có dấu như thế nào?", ["Luôn dương", "Luôn âm", "Âm trong khoảng hai nghiệm", "Đổi dấu tại x = 1/3"], 0, "Đáp án A: Δ' = 1 − 3 < 0 và a > 0."),
        sQ("Kiểm tra nhanh", "Tam thức −x² + 6x − 9 nhận giá trị dương khi", ["x = 3", "x ≠ 3", "Không có giá trị nào", "Mọi x"], 2, "Đáp án C: −(x − 3)² ≤ 0 với mọi x."),
        sB("Dặn dò", ["Bài tập 1–4 trang 47 SGK", "Chuẩn bị bài: Bất phương trình bậc hai một ẩn", "Đọc trước tình huống quầy nước chanh của lớp"], "Tuần sau học bất phương trình, dùng tam thức −x² + 6x − 5."),
      ],
    },
  },
  {
    owner: "ha",
    fromLesson: "Phương trình quy về phương trình bậc hai",
    deck: {
      title: "Phương trình quy về phương trình bậc hai",
      subtitle: "Toán 10 · Cánh Diều · Chương III, Bài 5",
      subject: "Toán",
      grade: 10,
      slides: [
        sT("Phương trình quy về phương trình bậc hai", "Toán 10 · GV: Lê Thu Hà", "Giới thiệu hai dạng phương trình chứa căn."),
        sB("Bạn An giải đúng hay sai?", ["Phương trình √(x + 3) = x − 3", "Bình phương: x² − 7x + 6 = 0, được x = 1 hoặc x = 6", "An kết luận S = {1; 6}", "Hãy thay lại từng nghiệm vào phương trình ban đầu"], "Với x = 1: vế trái 2, vế phải −2, không thoả. Đáp số đúng S = {6}."),
        sS("Dạng 1", "√(ax² + bx + c) = √(dx² + ex + f)", "Giới thiệu dạng 1."),
        sB("Cách giải dạng 1", ["Bình phương hai vế: ax² + bx + c = dx² + ex + f", "Giải phương trình nhận được", "Thử lại: giữ nghiệm làm biểu thức dưới căn không âm"], "Nhấn mạnh: bình phương là phép biến đổi hệ quả."),
        sC("Ví dụ 1", ["√(3x² − 4x − 1) = √(2x² − 4x + 3)", "Bình phương: x² = 4", "x = 2 hoặc x = −2"], ["x = 2: hai vế bằng √3", "x = −2: hai vế bằng √19", "S = {−2; 2}"], "Cho HS dùng máy tính cầm tay thử lại."),
        sS("Dạng 2", "√(ax² + bx + c) = dx + e", "Giới thiệu dạng 2."),
        sB("Cách giải dạng 2", ["Điều kiện: dx + e ≥ 0", "Bình phương: ax² + bx + c = (dx + e)²", "Giải, chỉ giữ nghiệm thoả điều kiện"], "So sánh cách đặt điều kiện trước và thử lại sau."),
        sC("Ví dụ 2", ["√(2x² − 5x − 9) = x − 1", "Điều kiện x ≥ 1", "x² − 3x − 10 = 0"], ["x = 5 (nhận), x = −2 (loại)", "Thử lại: √16 = 4 = 5 − 1", "S = {5}"], "Hỏi HS vì sao loại x = −2."),
        sQ("Câu hỏi nhanh", "Tập nghiệm của phương trình √(3x + 1) = x − 1 là", ["{0; 5}", "{0}", "{5}", "∅"], 2, "Đáp án C: x² − 5x = 0, loại x = 0 vì vế phải âm."),
        sB("Vận dụng: đi ra quốc lộ", ["Nhà An cách quốc lộ 3 km, H là hình chiếu của nhà trên quốc lộ", "AM ngắn hơn hai lần HM là 3 km; đặt HM = x", "√(x² + 9) = 2x − 3, giải được x = 4", "Vậy HM = 4 km, AM = 5 km"], "Kiểm tra bằng bộ ba Pythagore 3, 4, 5."),
      ],
    },
  },
  {
    owner: "ha",
    fromLesson: "Hàm số bậc hai",
    deck: {
      title: "Hàm số bậc hai",
      subtitle: "Toán 10 · Cánh Diều · Chương III, Bài 2",
      subject: "Toán",
      grade: 10,
      slides: [
        sT("Hàm số bậc hai", "Toán 10 · GV: Lê Thu Hà", "Mở video quả bóng được đá lên."),
        sB("Quả bóng bay cao nhất khi nào?", ["Độ cao sau t giây: h(t) = −5t² + 20t + 1 (mét)", "h(1) = 16, h(2) = 21, h(3) = 16", "Quỹ đạo có hình gì? Đỉnh ở đâu?"], "Cho HS dự đoán trước khi học."),
        sS("1. Định nghĩa", "y = ax² + bx + c, a ≠ 0", "Chuyển sang định nghĩa."),
        sB("Hàm số bậc hai", ["Cho bởi công thức y = ax² + bx + c với a ≠ 0", "Tập xác định D = ℝ", "Ví dụ: y = x² − 4x + 3; y = −2x² + x", "y = 3x + 1 không phải hàm số bậc hai"], "Hỏi HS các hệ số a, b, c."),
        sS("2. Đồ thị", "Parabol", "Chuyển sang đồ thị."),
        sC("Đặc điểm parabol", ["Đỉnh I(−b/(2a); −Δ/(4a))", "Trục đối xứng x = −b/(2a)"], ["a > 0: bề lõm hướng lên", "a < 0: bề lõm hướng xuống"], "Minh hoạ trên GeoGebra bằng thanh trượt a."),
        sB("Vẽ y = x² − 4x + 3", ["Đỉnh I(2; −1), trục đối xứng x = 2", "Cắt Oy tại (0; 3), cắt Ox tại (1; 0) và (3; 0)", "Điểm đối xứng với (0; 3) qua trục là (4; 3)", "Nối các điểm thành parabol bề lõm hướng lên"], "HS vẽ trên giấy kẻ ô cùng lúc."),
        sC("Sự biến thiên", ["a > 0", "Nghịch biến trên (−∞; −b/(2a))", "Đồng biến trên (−b/(2a); +∞)"], ["a < 0", "Đồng biến trên (−∞; −b/(2a))", "Nghịch biến trên (−b/(2a); +∞)"], "Liên hệ đồ thị: đi xuống rồi đi lên khi a > 0."),
        sQ("Câu hỏi nhanh", "Đỉnh của parabol y = −x² + 2x + 3 là", ["I(1; 4)", "I(−1; 0)", "I(1; 3)", "I(2; 3)"], 0, "Đáp án A: x = −2/(−2) = 1, y = −1 + 2 + 3 = 4."),
        sB("Trở lại quả bóng", ["Đỉnh t = −20/(2·(−5)) = 2 giây", "Độ cao lớn nhất h(2) = 21 mét", "Về nhà: bài tập 1–5 trang 43 SGK"], "Đối chiếu với dự đoán đầu giờ."),
      ],
    },
  },
  {
    owner: "bao-gv",
    deck: {
      title: "Chiếu cầu hiền – Ngô Thì Nhậm",
      subtitle: "Ngữ văn 11 · Bài 3: Cấu trúc của văn bản nghị luận",
      subject: "Ngữ văn",
      grade: 11,
      slides: [
        sT("Chiếu cầu hiền", "Ngô Thì Nhậm · Ngữ văn 11 · GV: Nguyễn Quốc Bảo", "Mở đầu bằng câu “Hiền tài là nguyên khí của quốc gia”."),
        sB("Khởi động", ["“Hiền tài là nguyên khí của quốc gia” (Thân Nhân Trung)", "Một nhà lãnh đạo mới cần làm gì để thu phục người tài?"], "Cho HS trao đổi cặp đôi 2 phút."),
        sS("I. Tìm hiểu chung", "Tác giả, hoàn cảnh, thể chiếu", "Kiểm tra phiếu chuẩn bị bài."),
        sC("Tác giả và tác phẩm", ["Ngô Thì Nhậm (1746–1803)", "Người làng Tả Thanh Oai, nay thuộc Hà Nội", "Danh sĩ thời Lê mạt, sau giúp nhà Tây Sơn"], ["Viết thay vua Quang Trung", "Kêu gọi sĩ phu Bắc Hà ra giúp nước", "Thể chiếu: lời ban bố của nhà vua"], "Nhấn mạnh đối tượng thuyết phục: trí thức Bắc Hà còn e ngại."),
        sS("II. Cấu trúc lập luận", "Luận đề – luận điểm – lí lẽ, bằng chứng", "Chia 6 nhóm theo 3 luận điểm."),
        sB("Luận đề và ba luận điểm", ["Luận đề: cầu người hiền ra giúp nước", "Luận điểm 1: người hiền như sao sáng, phải phục vụ thiên tử", "Luận điểm 2: thực trạng người hiền ẩn dật và mong mỏi của nhà vua", "Luận điểm 3: đường lối cầu hiền cụ thể, rộng mở"], "Vẽ sơ đồ cây từ luận đề xuống luận điểm."),
        sC("Lí lẽ và bằng chứng", ["“gõ mõ canh cửa”, “ra biển vào sông”", "“chết đuối trên cạn”", "“một cái cột không thể đỡ nổi một căn nhà lớn”"], ["Dâng thư bày tỏ công việc", "Quan văn võ được tiến cử", "Người tài được tự tiến cử"], "Cột trái là luận điểm 2, cột phải là luận điểm 3."),
        sB("Nghệ thuật thuyết phục", ["Giọng điệu trang trọng mà khiêm nhường", "Hình ảnh so sánh, điển tích giàu sức gợi", "Lập luận đi từ quy luật chung đến thực trạng rồi giải pháp"], "Hỏi: câu nào khiến sĩ phu Bắc Hà xúc động nhất?"),
        sQ("Câu hỏi nhanh", "Luận điểm “thực trạng người hiền ẩn dật” chủ yếu dùng bằng chứng nào?", ["Số liệu thống kê", "Hình ảnh “gõ mõ canh cửa”, “ra biển vào sông”", "Lời dẫn của Khổng Tử", "Câu chuyện về vua Quang Trung"], 1, "Đáp án B."),
        sB("Vận dụng", ["Viết đoạn văn 150 chữ về ý nghĩa của việc trọng dụng người tài hôm nay", "Có ít nhất một lí lẽ và một bằng chứng", "Nộp trên EDUVN trước tiết sau"], "Chiếu bảng tiêu chí 4 mức."),
      ],
    },
  },
  {
    owner: "long",
    deck: {
      title: "Phản ứng oxi hoá – khử",
      subtitle: "Hoá học 10 · Kết nối tri thức",
      subject: "Hoá học",
      grade: 10,
      slides: [
        sT("Phản ứng oxi hoá – khử", "Hoá học 10 · GV: Phạm Đức Long", "Mở đầu bằng ảnh đinh sắt gỉ."),
        sB("Vì sao đinh sắt bị gỉ?", ["Đinh sắt để ngoài trời lâu ngày bị phủ lớp gỉ màu nâu đỏ", "Dây magnesium cháy sáng chói trong không khí", "Điểm chung: nguyên tử kim loại đã nhường electron"], "Cho HS dự đoán trước khi hiện dòng 3."),
        sS("1. Số oxi hoá", "Quy tắc xác định", "Chuyển sang số oxi hoá."),
        sB("Quy tắc xác định số oxi hoá", ["Đơn chất: số oxi hoá bằng 0", "H thường là +1, O thường là −2", "Kim loại nhóm IA là +1, IIA là +2, Al là +3", "Tổng số oxi hoá trong phân tử bằng 0, trong ion bằng điện tích ion"], "Ngoại lệ: H trong NaH là −1, O trong H₂O₂ là −1."),
        sC("Ví dụ", ["H₂SO₄: 2(+1) + x + 4(−2) = 0", "NH₄⁺: x + 4(+1) = +1", "KMnO₄: (+1) + x + 4(−2) = 0"], ["S có số oxi hoá +6", "N có số oxi hoá −3", "Mn có số oxi hoá +7"], "Cho HS làm trước rồi đối chiếu."),
        sS("2. Phản ứng oxi hoá – khử", "Có sự chuyển electron", "Chuyển sang khái niệm."),
        sC("Chất khử và chất oxi hoá", ["Chất khử: nhường electron", "Số oxi hoá tăng", "Bị oxi hoá (quá trình oxi hoá)"], ["Chất oxi hoá: nhận electron", "Số oxi hoá giảm", "Bị khử (quá trình khử)"], "Mẹo nhớ: “khử cho, O nhận”."),
        sB("Lập phương trình: thăng bằng electron", ["Bước 1: xác định nguyên tử thay đổi số oxi hoá", "Bước 2: viết quá trình oxi hoá và quá trình khử", "Bước 3: tổng electron nhường = tổng electron nhận", "Bước 4: đặt hệ số, cân bằng nguyên tố còn lại", "Ví dụ: Fe + 4HNO₃ → Fe(NO₃)₃ + NO + 2H₂O"], "Làm mẫu trên bảng giảng."),
        sQ("Câu hỏi nhanh", "Trong phản ứng Fe₂O₃ + 3CO → 2Fe + 3CO₂, chất khử là", ["Fe₂O₃", "CO", "Fe", "CO₂"], 1, "Đáp án B: C tăng từ +2 lên +4."),
        sQ("Câu hỏi nhanh", "Hệ số của O₂ trong phương trình NH₃ + O₂ → NO + H₂O (hệ số nguyên tối giản) là", ["3", "4", "5", "6"], 2, "Đáp án C: 4NH₃ + 5O₂ → 4NO + 6H₂O."),
        sB("Ý nghĩa trong đời sống", ["Luyện kim: khử oxide kim loại bằng CO, H₂, Al", "Pin, acquy hoạt động nhờ phản ứng oxi hoá – khử", "Gỉ sắt gây thiệt hại: chống bằng sơn, mạ kẽm, bôi dầu mỡ"], "Giao bài tập SGK và báo trước kiểm tra 15 phút."),
      ],
    },
  },
  {
    owner: "lan",
    deck: {
      title: "Hệ tuần hoàn ở người",
      subtitle: "Khoa học tự nhiên 8 · Kết nối tri thức",
      subject: "Khoa học tự nhiên",
      grade: 8,
      slides: [
        sT("Hệ tuần hoàn ở người", "KHTN 8 · Lớp 8A2 · GV: Võ Ngọc Lan", "Cho HS bắt mạch đếm nhịp tim trong 1 phút."),
        sS("1. Máu", "Thành phần và chức năng", "Chiếu ảnh ống máu đã lắng."),
        sC("Thành phần của máu", ["Huyết tương (khoảng 55%)", "Hồng cầu", "Bạch cầu", "Tiểu cầu"], ["Vận chuyển chất dinh dưỡng, chất thải, hormone", "Vận chuyển O₂ và CO₂", "Bảo vệ cơ thể", "Tham gia đông máu"], "Hai cột tương ứng theo từng dòng."),
        sS("2. Tim và mạch máu", "Cấu tạo hệ tuần hoàn", "Dùng mô hình tim."),
        sB("Cấu tạo tim", ["Tim có 4 ngăn: hai tâm nhĩ ở trên, hai tâm thất ở dưới", "Van nhĩ – thất và van động mạch giúp máu chảy một chiều", "Thành tâm thất trái dày nhất vì đẩy máu đi khắp cơ thể", "Chu kì tim 0,8 giây: nhĩ co 0,1 s, thất co 0,3 s, dãn chung 0,4 s"], "Chỉ trên mô hình từng ngăn."),
        sB("Ba loại mạch máu", ["Động mạch: dẫn máu từ tim đi, thành dày, đàn hồi", "Tĩnh mạch: dẫn máu về tim, có van ở tĩnh mạch chân tay", "Mao mạch: rất nhỏ, là nơi trao đổi chất với tế bào"], "Hỏi: vì sao bắt được mạch ở cổ tay?"),
        sC("Hai vòng tuần hoàn", ["Vòng nhỏ: tâm thất phải", "→ động mạch phổi → mao mạch phổi", "→ tĩnh mạch phổi → tâm nhĩ trái"], ["Vòng lớn: tâm thất trái", "→ động mạch chủ → mao mạch các cơ quan", "→ tĩnh mạch chủ → tâm nhĩ phải"], "Nhóm vẽ sơ đồ, tô đỏ máu giàu O₂, tô xanh máu nghèo O₂."),
        sQ("Câu hỏi nhanh", "Máu từ tâm thất trái được đưa vào", ["Động mạch phổi", "Động mạch chủ", "Tĩnh mạch chủ", "Tĩnh mạch phổi"], 1, "Đáp án B: bắt đầu vòng tuần hoàn lớn."),
        sB("Bảo vệ tim mạch", ["Tập thể dục đều đặn, ít nhất 30 phút mỗi ngày", "Ăn ít muối, ít mỡ động vật; không hút thuốc lá", "Bệnh thường gặp: cao huyết áp, xơ vữa động mạch", "Sơ cứu chảy máu nhỏ: rửa sạch, ấn băng gạc, băng chặt"], "Chuyển sang thực hành đo nhịp tim sau nhảy dây."),
      ],
    },
  },
  {
    owner: "minh",
    deck: {
      title: "Unit 5: Inventions – Present perfect",
      subtitle: "Tiếng Anh 10 · Global Success",
      subject: "Tiếng Anh",
      grade: 10,
      slides: [
        sT("Unit 5: Inventions", "Language: Present perfect · GV: Hoàng Minh", "Warm-up: Have you ever used a 3D printer?"),
        sB("Warm-up: Have you ever…?", ["Have you ever used a 3D printer?", "Has your family bought a robot vacuum cleaner?", "Have you ever tried a translation app?"], "Gọi 4–5 HS trả lời: Yes, I have / No, I haven't."),
        sS("Form", "S + have/has + V3/V-ed", "Chuyển sang cấu trúc."),
        sC("Cấu trúc", ["(+) S + have/has + V3", "(−) S + haven't/hasn't + V3", "(?) Have/Has + S + V3?"], ["Scientists have invented many devices.", "We haven't used this app yet.", "Has she ever flown in a plane?"], "Lưu ý he/she/it dùng has."),
        sS("Use", "Ba cách dùng", "Chuyển sang cách dùng."),
        sB("Cách dùng", ["Kinh nghiệm (ever, never): I have never seen a robot teacher.", "Kéo dài đến hiện tại (for, since): We have used smartphones since 2010.", "Vừa xảy ra (just, already, yet): They have just launched a new car."], "Gạch chân dấu hiệu thời gian."),
        sC("Present perfect hay past simple?", ["Không nêu thời điểm cụ thể", "My father has bought a robot vacuum cleaner."], ["Có thời điểm xác định trong quá khứ", "Bell invented the telephone in 1876."], "Nhấn mạnh: in 1876, last year, ago đi với quá khứ đơn."),
        sQ("Quick check", "We ___ this washing machine since 2020.", ["use", "used", "have used", "are using"], 2, "Đáp án C: since chỉ hành động kéo dài đến hiện tại."),
        sQ("Quick check", "Thomas Edison ___ the first practical light bulb in 1879.", ["has invented", "invented", "have invented", "invents"], 1, "Đáp án B: có mốc thời gian 1879."),
        sB("Production", ["Phỏng vấn 3 bạn bằng câu hỏi “Have you ever…?”", "Viết 5 câu về các phát minh đã thay đổi cuộc sống của em", "Nộp bài viết trên EDUVN"], "Hướng dẫn cách ghi chép khi phỏng vấn."),
      ],
    },
  },
  {
    owner: "phuong",
    deck: {
      title: "Cách mạng tháng Tám năm 1945",
      subtitle: "Lịch sử 12 · Kết nối tri thức · Bài 6",
      subject: "Lịch sử",
      grade: 12,
      slides: [
        sT("Cách mạng tháng Tám năm 1945", "Lịch sử 12 · Lớp 12A1 · GV: Trần Mai Phương", "Chiếu ảnh mít tinh ngày 19/8/1945."),
        sS("1. Bối cảnh và thời cơ", "Tháng 8/1945", "Chuyển sang bối cảnh."),
        sC("Bối cảnh", ["Thế giới", "6/8 và 9/8: Mĩ ném bom nguyên tử xuống Nhật", "8/8: Liên Xô tuyên chiến với Nhật", "15/8: Nhật đầu hàng Đồng minh"], ["Trong nước", "Quân Nhật hoang mang, mất tinh thần", "Chính phủ Trần Trọng Kim rệu rã", "Lực lượng cách mạng đã sẵn sàng"], "Hỏi: điều kiện nào là khách quan, điều kiện nào là chủ quan?"),
        sB("Thời cơ “ngàn năm có một”", ["Bắt đầu: khi Nhật đầu hàng Đồng minh", "Kết thúc: trước khi quân Đồng minh vào Đông Dương", "Đòi hỏi hành động nhanh, kịp thời"], "Nhấn mạnh tính ngắn ngủi của thời cơ."),
        sS("2. Diễn biến", "13/8 – 2/9/1945", "Dùng lược đồ Tổng khởi nghĩa."),
        sB("Các mốc chính", ["13/8: Ủy ban Khởi nghĩa toàn quốc ra Quân lệnh số 1", "14–15/8: Hội nghị toàn quốc của Đảng tại Tân Trào quyết định Tổng khởi nghĩa", "16–17/8: Quốc dân Đại hội Tân Trào", "19/8 Hà Nội, 23/8 Huế, 25/8 Sài Gòn giành chính quyền", "30/8: vua Bảo Đại thoái vị", "2/9: Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập"], "HS đánh dấu trên lược đồ."),
        sS("3. Nguyên nhân, ý nghĩa, bài học", "Vì sao thắng lợi nhanh chóng?", "Thảo luận nhóm."),
        sC("Nguyên nhân và ý nghĩa", ["Truyền thống yêu nước", "Đảng lãnh đạo đúng đắn", "Chuẩn bị 15 năm (1930–1945)", "Thời cơ thuận lợi"], ["Lật đổ ách thống trị Pháp, Nhật", "Khai sinh nước Việt Nam Dân chủ Cộng hoà", "Mở ra kỉ nguyên độc lập, tự do", "Cổ vũ phong trào giải phóng dân tộc"], "Phân biệt nguyên nhân khách quan và chủ quan."),
        sQ("Câu hỏi nhanh", "Ba địa phương nào giành chính quyền có ý nghĩa quyết định trong Tổng khởi nghĩa?", ["Hà Nội, Huế, Sài Gòn", "Hà Nội, Hải Phòng, Đà Nẵng", "Bắc Giang, Hải Dương, Hà Tĩnh", "Tân Trào, Thái Nguyên, Hà Nội"], 0, "Đáp án A."),
        sB("Vận dụng", ["Bài học “chớp thời cơ” có ý nghĩa gì với thế hệ trẻ hôm nay?", "Viết đoạn văn khoảng 200 chữ, nộp trên EDUVN"], "Gợi ý liên hệ hội nhập, chuyển đổi số."),
      ],
    },
  },
  {
    owner: "phuong",
    deck: {
      title: "Thiên nhiên nhiệt đới ẩm gió mùa",
      subtitle: "Địa lí 12 · Kết nối tri thức",
      subject: "Địa lí",
      grade: 12,
      slides: [
        sT("Thiên nhiên nhiệt đới ẩm gió mùa", "Địa lí 12 · GV: Trần Mai Phương", "Mở đầu bằng biểu đồ nhiệt độ, lượng mưa Hà Nội và TP. Hồ Chí Minh."),
        sS("1. Khí hậu", "Nhiệt đới ẩm gió mùa", "Chuyển sang khí hậu."),
        sB("Tính nhiệt đới và ẩm", ["Nhiệt độ trung bình năm trên 20 °C (trừ vùng núi cao)", "Tổng bức xạ lớn, cân bằng bức xạ luôn dương", "Số giờ nắng 1 400 – 3 000 giờ/năm", "Lượng mưa trung bình 1 500 – 2 000 mm/năm, độ ẩm trên 80%"], "Giải thích: nằm trong vùng nội chí tuyến, giáp Biển Đông."),
        sC("Hai mùa gió", ["Gió mùa mùa đông (tháng 11 – 4)", "Hướng đông bắc, lạnh khô đầu mùa", "Tạo mùa đông lạnh ở miền Bắc"], ["Gió mùa mùa hạ (tháng 5 – 10)", "Hướng tây nam (Bắc Bộ: đông nam)", "Gây mưa lớn cho cả nước"], "Liên hệ thời tiết TP. Hồ Chí Minh: mùa mưa và mùa khô."),
        sS("2. Các thành phần tự nhiên khác", "Địa hình, sông ngòi, đất, sinh vật", "Chuyển sang biểu hiện."),
        sB("Biểu hiện", ["Địa hình: xâm thực mạnh ở miền núi, bồi tụ nhanh ở đồng bằng", "Sông ngòi: dày đặc, nhiều nước, giàu phù sa, chế độ nước theo mùa", "Đất: quá trình feralit là chủ yếu ở vùng đồi núi", "Sinh vật: hệ sinh thái rừng nhiệt đới ẩm gió mùa"], "Cho HS tìm ví dụ ở địa phương."),
        sQ("Câu hỏi nhanh", "Gió mùa mùa đông hoạt động ở nước ta chủ yếu trong thời gian nào?", ["Tháng 5 – tháng 10", "Tháng 11 – tháng 4", "Tháng 1 – tháng 6", "Quanh năm"], 1, "Đáp án B."),
        sB("Ảnh hưởng đến sản xuất và đời sống", ["Thuận lợi: nông nghiệp nhiệt đới, đa canh, tăng vụ", "Khó khăn: bão, lũ lụt, hạn hán, rét đậm rét hại", "Cần chủ động phòng tránh thiên tai, sử dụng tài nguyên hợp lí"], "Giao bài tập vẽ biểu đồ khí hậu về nhà."),
      ],
    },
  },
  {
    owner: "khai",
    deck: {
      title: "Tìm kiếm theo chiều rộng (BFS)",
      subtitle: "Lập trình – Cấu trúc dữ liệu và giải thuật · KTPM K23",
      subject: "Lập trình",
      grade: 14,
      slides: [
        sT("Tìm kiếm theo chiều rộng (BFS)", "KTPM K23 · Giảng viên: TS. Đặng Văn Khải", "Giới thiệu bài toán đường đi ngắn nhất trên đồ thị không trọng số."),
        sB("Bài toán", ["Cho đồ thị G = (V, E) không trọng số và đỉnh nguồn s", "Tìm số cạnh ít nhất từ s đến mọi đỉnh", "Ví dụ: số lần chuyển tuyến xe buýt ít nhất giữa hai bến"], "Hỏi sinh viên: duyệt sâu (DFS) có cho đường ngắn nhất không?"),
        sS("1. Ý tưởng", "Duyệt theo từng lớp", "Chuyển sang ý tưởng."),
        sB("Ý tưởng BFS", ["Thăm s, rồi thăm mọi đỉnh kề s (khoảng cách 1)", "Tiếp tục thăm các đỉnh kề của lớp vừa thăm (khoảng cách 2)…", "Dùng hàng đợi FIFO để giữ thứ tự lớp", "Đánh dấu đỉnh đã thăm để không thêm vào hàng đợi lần hai"], "Vẽ đồ thị 6 đỉnh và mô phỏng bằng tay."),
        sC("Mã giả", ["dist[s] = 0; queue.push(s)", "while queue không rỗng:", "  u = queue.pop()", "  với mỗi v kề u chưa thăm:"], ["    dist[v] = dist[u] + 1", "    parent[v] = u", "    queue.push(v)", "Truy vết đường đi bằng parent[]"], "Giải thích vì sao đánh dấu khi đưa vào hàng đợi, không phải khi lấy ra."),
        sS("2. Phân tích", "Độ phức tạp và tính đúng", "Chuyển sang phân tích."),
        sB("Độ phức tạp", ["Mỗi đỉnh vào hàng đợi đúng một lần: O(V)", "Mỗi cạnh được xét tối đa hai lần với đồ thị vô hướng: O(E)", "Tổng thời gian O(V + E) với danh sách kề", "Bộ nhớ O(V) cho hàng đợi, dist và parent"], "So sánh với ma trận kề: O(V²)."),
        sQ("Câu hỏi nhanh", "Cấu trúc dữ liệu nào đảm bảo BFS duyệt đúng theo từng lớp?", ["Ngăn xếp (stack)", "Hàng đợi (queue)", "Hàng đợi ưu tiên", "Bảng băm"], 1, "Đáp án B. Thay bằng stack sẽ thành duyệt kiểu DFS."),
        sQ("Câu hỏi nhanh", "BFS cho đường đi ngắn nhất đúng khi đồ thị", ["Có trọng số âm", "Có trọng số dương bất kì", "Không trọng số hoặc mọi cạnh cùng trọng số", "Chỉ khi là cây"], 2, "Đáp án C. Trọng số khác nhau thì dùng Dijkstra."),
        sB("Bài tập lab", ["Cài đặt BFS bằng Python với collections.deque", "Bài toán mê cung lưới: tìm số bước ít nhất từ S đến E", "Nộp mã nguồn và test trên EDUVN trước 21:00"], "Nhắc sinh viên kiểm thử với mê cung không có đường đi."),
      ],
    },
  },
];

// =====================================================================================
// 3. BÀI GIẢNG AI (cảnh slide + lời giảng soạn sẵn)
// =====================================================================================

export const AI_LESSONS: DAiLesson[] = [
  {
    owner: "ha",
    title: "Bất phương trình bậc hai một ẩn qua quầy nước chanh",
    subject: "Toán",
    grade: 10,
    requirement: "Soạn bài giảng 7 cảnh cho lớp 10A1 về bất phương trình bậc hai một ẩn, dùng ví dụ quầy nước chanh của lớp (lãi P(x) = −x² + 6x − 5), nhắc kĩ lỗi quên đổi chiều khi nhân với số âm, có 2 phần câu hỏi nhanh.",
    scenes: [
      {
        type: "slide",
        title: "Quầy nước chanh của lớp",
        description: "Đặt vấn đề bằng tình huống thật của lớp 10A1.",
        keyPoints: ["Lãi phụ thuộc số cốc bán được", "Câu hỏi: bán bao nhiêu thì có lãi?"],
        heading: "Quầy nước chanh 10A1 có lãi khi nào?",
        bullets: ["Bán $x$ chục cốc nước chanh ở Ngày hội Toán học", "Lãi $P(x) = -x^2 + 6x - 5$ (trăm nghìn đồng)", "Bán 2 chục cốc: $P(2) = 3$, lãi 300 nghìn đồng", "Bán 6 chục cốc: $P(6) = -5$, lỗ 500 nghìn đồng"],
        formula: "P(x) = -x^2 + 6x - 5",
        speech: [
          "Chào cả lớp, hôm nay mình cùng giúp ban cán sự tính chuyện quầy nước chanh ở Ngày hội Toán học nhé.",
          "Nếu bán x chục cốc thì lãi bằng trừ x bình phương cộng sáu x trừ năm, tính bằng trăm nghìn đồng.",
          "Bán hai chục cốc thì lãi ba trăm nghìn, nhưng bán sáu chục cốc lại lỗ năm trăm nghìn. Vậy bán trong khoảng nào mới có lãi?",
        ],
      },
      {
        type: "slide",
        title: "Bất phương trình bậc hai là gì?",
        description: "Định nghĩa và chuyển câu hỏi “có lãi” thành bất phương trình.",
        keyPoints: ["Dạng ax² + bx + c > 0 với a ≠ 0", "Có lãi nghĩa là P(x) > 0"],
        heading: "Bất phương trình bậc hai một ẩn",
        bullets: ["Dạng $ax^2 + bx + c > 0$ (hoặc $\\ge 0$, $< 0$, $\\le 0$) với $a \\ne 0$", "Nghiệm: giá trị $x$ làm bất phương trình đúng", "Có lãi nghĩa là $P(x) > 0$", "Cần giải: $-x^2 + 6x - 5 > 0$"],
        formula: "ax^2 + bx + c > 0,\\quad a \\ne 0",
        speech: [
          "Bất phương trình bậc hai một ẩn có dạng a x bình phương cộng b x cộng c lớn hơn không, hoặc lớn hơn hoặc bằng, nhỏ hơn, nhỏ hơn hoặc bằng không, với a khác không.",
          "Câu hỏi có lãi chính là lãi lớn hơn không, tức là trừ x bình phương cộng sáu x trừ năm lớn hơn không.",
          "Đây đúng là một bất phương trình bậc hai, mình sẽ giải nó theo hai bước.",
        ],
      },
      {
        type: "slide",
        title: "Bước 1: tìm nghiệm của tam thức",
        description: "Nhẩm nghiệm tam thức −x² + 6x − 5.",
        keyPoints: ["a + b + c = 0 nên có nghiệm x = 1", "Nghiệm còn lại x = c/a = 5"],
        heading: "Bước 1: nghiệm của $-x^2 + 6x - 5$",
        bullets: ["Giải $-x^2 + 6x - 5 = 0$", "Nhẩm: $a + b + c = -1 + 6 - 5 = 0$ nên $x_1 = 1$", "Nghiệm thứ hai $x_2 = \\dfrac{c}{a} = 5$", "Tìm xong nghiệm, đừng dừng lại: còn bước xét dấu!"],
        formula: "x_1 = 1,\\quad x_2 = 5",
        speech: [
          "Bước một, mình tìm nghiệm của tam thức trừ x bình phương cộng sáu x trừ năm.",
          "Tổng các hệ số trừ một cộng sáu trừ năm bằng không, nên một nghiệm là một, nghiệm còn lại bằng c chia a, tức là năm.",
          "Nhiều bạn tìm xong hai nghiệm là dừng bút, nhưng đây mới là nửa đường thôi nhé.",
        ],
      },
      {
        type: "slide",
        title: "Bước 2: xét dấu và kết luận",
        description: "Áp dụng quy tắc trong trái, ngoài cùng.",
        keyPoints: ["a = −1 < 0", "Dương trong khoảng hai nghiệm", "Có lãi khi 1 < x < 5"],
        heading: "Bước 2: trong trái, ngoài cùng",
        bullets: ["Hệ số $a = -1 < 0$", "Trong khoảng $(1; 5)$: $P(x)$ trái dấu $a$, tức là dương", "Ngoài đoạn $[1; 5]$: $P(x)$ âm, quầy bị lỗ", "Kết luận: có lãi khi bán hơn 10 cốc và dưới 50 cốc"],
        formula: "P(x) > 0 \\iff 1 < x < 5",
        speech: [
          "Hệ số a bằng trừ một, là số âm. Theo quy tắc trong trái ngoài cùng, ở giữa hai nghiệm thì tam thức trái dấu với a, tức là dương.",
          "Vậy lãi dương khi x lớn hơn một và nhỏ hơn năm.",
          "Nói bằng lời: lớp có lãi khi bán nhiều hơn mười cốc và ít hơn năm mươi cốc, và lãi nhiều nhất là bốn trăm nghìn khi bán ba mươi cốc.",
        ],
      },
      {
        type: "quiz",
        title: "Câu hỏi nhanh 1",
        description: "Kiểm tra hai bước giải.",
        keyPoints: ["Nhẩm nghiệm", "Đọc tập nghiệm"],
        questions: [
          {
            question: "Nghiệm của tam thức −x² + 6x − 5 là",
            options: ["x = −1 và x = −5", "x = 1 và x = 5", "x = 2 và x = 3", "x = −1 và x = 5"],
            answer: 1,
            analysis: "Tổng hệ số −1 + 6 − 5 = 0 nên x = 1, nghiệm còn lại c/a = (−5)/(−1) = 5.",
          },
          {
            question: "Tập nghiệm của bất phương trình −x² + 6x − 5 > 0 là",
            options: ["(−∞; 1) ∪ (5; +∞)", "[1; 5]", "(1; 5)", "ℝ"],
            answer: 2,
            analysis: "a = −1 < 0 nên tam thức dương trong khoảng hai nghiệm; dấu “>” không lấy đầu mút.",
          },
        ],
        speech: [
          "Giờ mình kiểm tra nhanh hai bước vừa học nhé, mỗi câu các em có ba mươi giây.",
          "Nhớ để ý dấu lớn hơn hay lớn hơn hoặc bằng để chọn ngoặc tròn hay ngoặc vuông.",
        ],
      },
      {
        type: "slide",
        title: "Cẩn thận khi nhân với số âm",
        description: "Lỗi thường gặp: quên đổi chiều bất phương trình.",
        keyPoints: ["Nhân hai vế với −1 phải đổi chiều", "Tập nghiệm không đổi"],
        heading: "Nhân với $-1$ thì phải đổi chiều",
        bullets: ["Bắt đầu: $-x^2 + 6x - 5 > 0$", "Nhân hai vế với $-1$: $x^2 - 6x + 5 < 0$", "Dấu $>$ phải đổi thành $<$", "Giải lại vẫn được tập nghiệm $(1; 5)$"],
        formula: "-x^2 + 6x - 5 > 0 \\iff x^2 - 6x + 5 < 0",
        speech: [
          "Nhiều bạn thích đổi hệ số a thành số dương bằng cách nhân hai vế với trừ một, cách này hoàn toàn được.",
          "Nhưng nhân với một số âm thì dấu lớn hơn phải đổi thành dấu nhỏ hơn. Quên bước này là ra ngay tập nghiệm sai.",
          "Sau khi đổi chiều, x bình phương trừ sáu x cộng năm nhỏ hơn không cũng cho đúng khoảng từ một đến năm.",
        ],
      },
      {
        type: "quiz",
        title: "Câu hỏi nhanh 2",
        description: "Vận dụng vào quầy nước chanh và lỗi đổi chiều.",
        keyPoints: ["Đổi chiều khi nhân số âm", "Lãi ít nhất 300 nghìn đồng"],
        questions: [
          {
            question: "Nhân hai vế của −x² + 2x + 3 ≥ 0 với −1, ta được",
            options: ["x² − 2x − 3 ≥ 0", "x² + 2x + 3 ≤ 0", "−x² − 2x − 3 ≤ 0", "x² − 2x − 3 ≤ 0"],
            answer: 3,
            analysis: "Đổi dấu mọi hệ số và đổi chiều “≥” thành “≤”.",
          },
          {
            question: "Quầy muốn lãi ít nhất 300 nghìn đồng, tức P(x) ≥ 3. Số chục cốc cần bán là",
            options: ["2 ≤ x ≤ 4", "1 < x < 5", "x = 3", "x ≥ 2"],
            answer: 0,
            analysis: "−x² + 6x − 5 ≥ 3 ⇔ x² − 6x + 8 ≤ 0 ⇔ 2 ≤ x ≤ 4, tức là bán từ 20 đến 40 cốc.",
          },
          {
            question: "Quầy có thể lãi nhiều hơn 500 nghìn đồng không?",
            options: ["Có, khi bán 30 cốc", "Có, khi bán 50 cốc", "Không, vì x² − 6x + 10 < 0 vô nghiệm", "Không, vì quầy luôn lỗ"],
            answer: 2,
            analysis: "P(x) > 5 ⇔ x² − 6x + 10 < 0, có Δ' = −1 < 0 và a > 0 nên vô nghiệm; lãi lớn nhất chỉ là 400 nghìn đồng.",
          },
        ],
        speech: [
          "Câu hỏi cuối là bài toán thật của lớp mình: muốn lãi ít nhất ba trăm nghìn thì phải bán bao nhiêu cốc.",
          "Các em nhớ chuyển vế, nhân với trừ một thì đổi chiều, rồi mới xét dấu nhé.",
          "Làm xong, nhóm nào muốn có thể quay video sáu mươi giây giải thích lại cho bạn vắng học.",
        ],
      },
    ],
  },
  {
    owner: "binh",
    title: "Sự rơi tự do",
    subject: "Vật lí",
    grade: 10,
    requirement: "Soạn bài giảng 5 cảnh về sự rơi tự do cho Vật lí 10: khái niệm, đặc điểm, công thức, một ví dụ tính và câu hỏi củng cố.",
    scenes: [
      {
        type: "slide",
        title: "Thế nào là rơi tự do?",
        description: "Khái niệm và thí nghiệm ống Newton.",
        keyPoints: ["Chỉ chịu tác dụng của trọng lực", "Trong chân không mọi vật rơi nhanh như nhau"],
        heading: "Sự rơi tự do",
        bullets: ["Rơi tự do: vật rơi chỉ dưới tác dụng của trọng lực", "Trong không khí, sức cản làm tờ giấy rơi chậm hơn hòn bi", "Ống Newton hút hết không khí: lông chim và hòn bi rơi như nhau", "Galilei: mọi vật rơi tự do nhanh như nhau, không phụ thuộc khối lượng"],
        speech: [
          "Các em thử thả cùng lúc một tờ giấy và một viên phấn, viên phấn chạm đất trước đúng không?",
          "Nguyên nhân là sức cản của không khí chứ không phải vì viên phấn nặng hơn.",
          "Khi bỏ hết không khí, mọi vật chỉ chịu trọng lực và rơi nhanh như nhau, đó gọi là sự rơi tự do.",
        ],
      },
      {
        type: "slide",
        title: "Đặc điểm của chuyển động rơi tự do",
        description: "Phương, chiều, tính chất chuyển động và gia tốc g.",
        keyPoints: ["Phương thẳng đứng, chiều từ trên xuống", "Nhanh dần đều với gia tốc g"],
        heading: "Đặc điểm",
        bullets: ["Phương thẳng đứng, chiều từ trên xuống dưới", "Là chuyển động thẳng nhanh dần đều", "Gia tốc rơi tự do $g \\approx 9{,}8\\ \\text{m/s}^2$", "$g$ thay đổi theo vĩ độ và độ cao, thường lấy gần đúng $10\\ \\text{m/s}^2$"],
        formula: "g \\approx 9{,}8\\ \\text{m/s}^2",
        speech: [
          "Rơi tự do luôn theo phương thẳng đứng, chiều từ trên xuống, và là chuyển động nhanh dần đều.",
          "Gia tốc của nó gọi là gia tốc rơi tự do, kí hiệu g, gần bằng chín phẩy tám mét trên giây bình phương.",
          "Trong bài tập, nếu đề cho phép, các em có thể lấy tròn g bằng mười mét trên giây bình phương.",
        ],
      },
      {
        type: "slide",
        title: "Công thức rơi tự do",
        description: "Vận tốc, quãng đường, hệ thức độc lập thời gian.",
        keyPoints: ["v = gt", "s = gt²/2", "v² = 2gs"],
        heading: "Các công thức (vật thả không vận tốc đầu)",
        bullets: ["Vận tốc: $v = gt$", "Quãng đường: $s = \\dfrac{1}{2}gt^2$", "Liên hệ: $v^2 = 2gs$", "Thời gian rơi từ độ cao $h$: $t = \\sqrt{2h/g}$"],
        formula: "s = \\frac{1}{2}gt^2",
        speech: [
          "Với vật thả không vận tốc đầu, vận tốc bằng g nhân t, còn quãng đường bằng một nửa g nhân t bình phương.",
          "Nếu không biết thời gian, ta dùng hệ thức v bình phương bằng hai g nhân s.",
          "Từ đó, thời gian rơi từ độ cao h bằng căn bậc hai của hai h chia cho g.",
        ],
      },
      {
        type: "slide",
        title: "Ví dụ: thả vật từ độ cao 20 m",
        description: "Tính thời gian rơi và vận tốc chạm đất.",
        keyPoints: ["t = 2 s", "v = 20 m/s"],
        heading: "Ví dụ: $h = 20$ m, $g = 10\\ \\text{m/s}^2$",
        bullets: ["Thời gian rơi: $t = \\sqrt{2h/g} = \\sqrt{4} = 2$ s", "Vận tốc chạm đất: $v = gt = 10 \\cdot 2 = 20$ m/s", "Kiểm tra: $v^2 = 2gh = 400$ nên $v = 20$ m/s", "Quãng đường rơi trong giây cuối: $20 - 5 = 15$ m"],
        formula: "t = \\sqrt{\\frac{2h}{g}} = 2\\ \\text{s}",
        speech: [
          "Thả một vật từ độ cao hai mươi mét, lấy g bằng mười. Thời gian rơi là căn của bốn mươi chia mười, tức là hai giây.",
          "Vận tốc khi chạm đất bằng mười nhân hai, là hai mươi mét trên giây.",
          "Trong giây đầu vật chỉ rơi năm mét, nên giây cuối vật rơi được mười lăm mét. Các em thấy vật rơi càng lúc càng nhanh chưa?",
        ],
      },
      {
        type: "quiz",
        title: "Củng cố",
        description: "Hai câu hỏi về đặc điểm và công thức.",
        keyPoints: ["Khối lượng không ảnh hưởng", "Áp dụng s = gt²/2"],
        questions: [
          {
            question: "Trong chân không, thả cùng lúc một hòn bi sắt và một lông chim từ cùng độ cao. Kết quả là",
            options: ["Hòn bi chạm đất trước", "Lông chim chạm đất trước", "Hai vật chạm đất cùng lúc", "Lông chim lơ lửng"],
            answer: 2,
            analysis: "Trong chân không chỉ có trọng lực, mọi vật rơi tự do với cùng gia tốc g.",
          },
          {
            question: "Một vật rơi tự do không vận tốc đầu trong 3 s (g = 10 m/s²). Quãng đường vật rơi được là",
            options: ["30 m", "45 m", "90 m", "15 m"],
            answer: 1,
            analysis: "s = gt²/2 = 10 · 9 : 2 = 45 m.",
          },
        ],
        speech: ["Cô có hai câu hỏi nhỏ để các em tự kiểm tra.", "Câu thứ hai nhớ bình phương thời gian trước khi nhân với g nhé."],
      },
    ],
  },
  {
    owner: "long",
    title: "Phản ứng oxi hoá – khử",
    subject: "Hoá học",
    grade: 10,
    requirement: "Soạn bài giảng 5 cảnh về phản ứng oxi hoá – khử cho Hoá 10: số oxi hoá, chất khử – chất oxi hoá, cân bằng bằng thăng bằng electron, câu hỏi củng cố.",
    scenes: [
      {
        type: "slide",
        title: "Số oxi hoá",
        description: "Quy tắc xác định số oxi hoá.",
        keyPoints: ["Đơn chất bằng 0", "H +1, O −2", "Tổng trong phân tử bằng 0"],
        heading: "Quy tắc xác định số oxi hoá",
        bullets: ["Đơn chất: số oxi hoá bằng 0", "Hợp chất: H thường $+1$, O thường $-2$", "Tổng số oxi hoá trong phân tử bằng 0, trong ion bằng điện tích", "Ví dụ: S trong $\\mathrm{H_2SO_4}$ có số oxi hoá $+6$"],
        formula: "2(+1) + x + 4(-2) = 0 \\Rightarrow x = +6",
        speech: [
          "Muốn nhận ra phản ứng oxi hoá khử, trước hết các em phải xác định được số oxi hoá.",
          "Đơn chất có số oxi hoá bằng không, hydrogen thường là cộng một, oxygen thường là trừ hai.",
          "Trong H hai S O bốn, hai lần cộng một, cộng số oxi hoá của lưu huỳnh, cộng bốn lần trừ hai phải bằng không, nên lưu huỳnh là cộng sáu.",
        ],
      },
      {
        type: "slide",
        title: "Chất khử và chất oxi hoá",
        description: "Khái niệm qua phản ứng luyện gang.",
        keyPoints: ["Chất khử nhường electron", "Chất oxi hoá nhận electron"],
        heading: "Khử cho, O nhận",
        bullets: ["Chất khử: nhường electron, số oxi hoá tăng", "Chất oxi hoá: nhận electron, số oxi hoá giảm", "$\\mathrm{Fe_2O_3 + 3CO \\rightarrow 2Fe + 3CO_2}$", "Fe: $+3 \\to 0$ (bị khử); C: $+2 \\to +4$ (bị oxi hoá)"],
        formula: "\\mathrm{Fe_2O_3 + 3CO \\xrightarrow{t^\\circ} 2Fe + 3CO_2}",
        speech: [
          "Thầy có câu dễ nhớ: khử cho, O nhận. Chất khử cho electron, chất oxi hoá nhận electron.",
          "Trong lò luyện gang, sắt trong sắt ba oxide giảm từ cộng ba xuống không, nên sắt ba oxide là chất oxi hoá.",
          "Carbon trong carbon monoxide tăng từ cộng hai lên cộng bốn, nên CO là chất khử.",
        ],
      },
      {
        type: "slide",
        title: "Cân bằng bằng thăng bằng electron",
        description: "Bốn bước cân bằng phương trình.",
        keyPoints: ["Electron nhường bằng electron nhận", "Kiểm tra nguyên tố còn lại"],
        heading: "Ví dụ: $\\mathrm{Fe + HNO_3 \\rightarrow Fe(NO_3)_3 + NO + H_2O}$",
        bullets: ["Quá trình oxi hoá: $\\mathrm{Fe^0 \\rightarrow Fe^{+3} + 3e}$", "Quá trình khử: $\\mathrm{N^{+5} + 3e \\rightarrow N^{+2}}$", "Electron nhường bằng electron nhận: hệ số 1 và 1", "Kết quả: $\\mathrm{Fe + 4HNO_3 \\rightarrow Fe(NO_3)_3 + NO + 2H_2O}$"],
        formula: "\\mathrm{Fe + 4HNO_3 \\rightarrow Fe(NO_3)_3 + NO + 2H_2O}",
        speech: [
          "Sắt nhường ba electron để lên cộng ba, còn nitrogen cộng năm nhận ba electron để xuống cộng hai.",
          "Số electron nhường và nhận đã bằng nhau, nên hệ số của sắt và NO đều là một.",
          "Cuối cùng đếm nitrogen ở vế phải được bốn, nên cần bốn phân tử nitric acid và hai phân tử nước.",
        ],
      },
      {
        type: "slide",
        title: "Ý nghĩa trong đời sống",
        description: "Ứng dụng và tác hại của phản ứng oxi hoá – khử.",
        keyPoints: ["Luyện kim, pin", "Gỉ sắt và cách chống"],
        heading: "Phản ứng oxi hoá – khử quanh ta",
        bullets: ["Luyện kim: khử oxide kim loại bằng CO, $\\mathrm{H_2}$, Al", "Pin, acquy: năng lượng hoá học chuyển thành điện năng", "Quang hợp, hô hấp, sự cháy đều là phản ứng oxi hoá – khử", "Gỉ sắt: chống bằng sơn phủ, mạ kẽm, bôi dầu mỡ"],
        speech: [
          "Phản ứng oxi hoá khử có mặt ở khắp nơi, từ lò luyện gang, viên pin trong điện thoại đến hơi thở của chúng ta.",
          "Mặt trái là sắt bị gỉ, mỗi năm làm hỏng rất nhiều công trình.",
          "Vì vậy người ta sơn phủ, mạ kẽm hoặc bôi dầu mỡ để ngăn sắt tiếp xúc với oxygen và hơi nước.",
        ],
      },
      {
        type: "quiz",
        title: "Củng cố",
        description: "Ba câu hỏi về số oxi hoá và cân bằng.",
        keyPoints: ["Số oxi hoá", "Chất khử", "Hệ số cân bằng"],
        questions: [
          {
            question: "Số oxi hoá của Mn trong KMnO₄ là",
            options: ["+2", "+4", "+6", "+7"],
            answer: 3,
            analysis: "(+1) + x + 4·(−2) = 0 nên x = +7.",
          },
          {
            question: "Trong phản ứng 2Al + Fe₂O₃ → Al₂O₃ + 2Fe, chất khử là",
            options: ["Al", "Fe₂O₃", "Al₂O₃", "Fe"],
            answer: 0,
            analysis: "Al tăng số oxi hoá từ 0 lên +3, nhường electron nên là chất khử.",
          },
          {
            question: "Tổng hệ số (nguyên, tối giản) của phương trình NH₃ + O₂ → NO + H₂O là",
            options: ["15", "17", "19", "21"],
            answer: 2,
            analysis: "4NH₃ + 5O₂ → 4NO + 6H₂O, tổng hệ số 4 + 5 + 4 + 6 = 19.",
          },
        ],
        speech: ["Các em làm ba câu củng cố, mỗi câu khoảng một phút.", "Câu cuối nhớ cân bằng xong rồi mới cộng các hệ số."],
      },
    ],
  },
  {
    owner: "bao-gv",
    title: "Chiếu cầu hiền và cấu trúc văn bản nghị luận",
    subject: "Ngữ văn",
    grade: 11,
    requirement: "Soạn bài giảng 5 cảnh giúp HS lớp 11A3 đọc hiểu “Chiếu cầu hiền” theo cấu trúc văn bản nghị luận: luận đề, luận điểm, lí lẽ, bằng chứng, nghệ thuật thuyết phục.",
    scenes: [
      {
        type: "slide",
        title: "Hoàn cảnh ra đời",
        description: "Tác giả, mục đích, đối tượng của bài chiếu.",
        keyPoints: ["Viết thay vua Quang Trung", "Đối tượng: sĩ phu Bắc Hà"],
        heading: "“Chiếu cầu hiền” ra đời để làm gì?",
        bullets: ["Ngô Thì Nhậm (1746–1803) viết thay vua Quang Trung", "Mục đích: kêu gọi người tài ra giúp triều đại mới", "Đối tượng: sĩ phu Bắc Hà còn ẩn dật, e ngại", "Thể chiếu: văn bản nhà vua ban bố mệnh lệnh"],
        speech: [
          "Các em hình dung, một triều đại vừa ra đời nhưng nhiều trí thức Bắc Hà vẫn đứng ngoài, còn nghi ngại.",
          "Vua Quang Trung giao cho Ngô Thì Nhậm viết bài chiếu này để thuyết phục họ.",
          "Vì người đọc là những người tài, kiêu hãnh, nên lời lẽ phải vừa uy nghiêm vừa thật chân thành.",
        ],
      },
      {
        type: "slide",
        title: "Luận đề và luận điểm",
        description: "Cấu trúc ba luận điểm.",
        keyPoints: ["Luận đề: cầu người hiền", "Ba luận điểm theo trình tự chặt chẽ"],
        heading: "Cấu trúc lập luận",
        bullets: ["Luận đề: cầu người hiền ra giúp nước", "Luận điểm 1: người hiền như sao sáng, phải phục vụ thiên tử", "Luận điểm 2: thực trạng người hiền ẩn dật, nhà vua mong mỏi", "Luận điểm 3: đường lối cầu hiền cụ thể, rộng mở"],
        speech: [
          "Toàn bộ bài chiếu xoay quanh một luận đề duy nhất: cầu người hiền ra giúp nước.",
          "Tác giả đi từ một quy luật chung, đến thực trạng trước mắt, rồi mới đưa ra cách làm cụ thể.",
          "Trình tự ấy khiến người đọc khó lòng từ chối, vì mọi lí lẽ đều dẫn về một kết luận.",
        ],
      },
      {
        type: "slide",
        title: "Lí lẽ và bằng chứng",
        description: "Hình ảnh và lí lẽ tiêu biểu.",
        keyPoints: ["Hình ảnh ẩn dật", "Lí lẽ “một cái cột”"],
        heading: "Những câu văn có sức thuyết phục",
        bullets: ["Người hiền “như ngôi sao sáng trên trời cao”", "Kẻ sĩ ẩn mình: “gõ mõ canh cửa”, “ra biển vào sông”", "“Một cái cột không thể đỡ nổi một căn nhà lớn”", "Cho phép dâng thư, tiến cử, kể cả tự tiến cử"],
        speech: [
          "Hình ảnh ngôi sao sáng nâng người hiền lên rất cao, khiến sĩ phu thấy mình được tôn trọng.",
          "Những hình ảnh gõ mõ canh cửa, ra biển vào sông nói khéo rằng tài năng đang bị lãng phí.",
          "Còn câu một cái cột không đỡ nổi căn nhà lớn cho thấy nhà vua thật lòng cần đến họ.",
        ],
      },
      {
        type: "slide",
        title: "Nghệ thuật thuyết phục",
        description: "Giọng điệu và ý nghĩa.",
        keyPoints: ["Trang trọng mà khiêm nhường", "Tầm nhìn trọng hiền tài"],
        heading: "Vì sao bài chiếu thuyết phục được người đọc?",
        bullets: ["Giọng điệu trang trọng nhưng khiêm nhường, chân thành", "Dùng điển tích, hình ảnh so sánh giàu sức gợi", "Lập luận chặt chẽ: quy luật – thực trạng – giải pháp", "Thể hiện tầm nhìn trọng dụng hiền tài của vua Quang Trung"],
        speech: [
          "Một ông vua lại tự nhận mình còn thiếu sót, đó là cách hạ mình rất khéo để chạm vào lòng tự trọng của kẻ sĩ.",
          "Kết hợp với lập luận chặt chẽ, bài chiếu vừa có lí vừa có tình.",
          "Bài học cho các em khi viết nghị luận là: hiểu người đọc trước khi chọn lời.",
        ],
      },
      {
        type: "quiz",
        title: "Củng cố",
        description: "Hai câu hỏi nhận diện cấu trúc nghị luận.",
        keyPoints: ["Luận đề", "Bằng chứng"],
        questions: [
          {
            question: "Luận đề của “Chiếu cầu hiền” là",
            options: ["Ca ngợi chiến thắng của nhà Tây Sơn", "Cầu người hiền ra giúp nước", "Phê phán sĩ phu Bắc Hà", "Ban bố luật lệ mới"],
            answer: 1,
            analysis: "Mọi luận điểm đều hướng về mục đích kêu gọi người hiền tài ra giúp triều đại mới.",
          },
          {
            question: "Câu “Một cái cột không thể đỡ nổi một căn nhà lớn” được dùng để",
            options: ["Miêu tả cung điện", "Kể lại một sự việc", "Làm lí lẽ cho nhu cầu cần nhiều người tài", "Phê phán quan lại"],
            answer: 2,
            analysis: "Đây là lí lẽ khẳng định một người không thể gánh vác việc nước, cần nhiều người hiền cùng giúp.",
          },
        ],
        speech: ["Thầy mời các em trả lời hai câu hỏi nhanh.", "Gợi ý: luận đề là điều mà mọi luận điểm cùng hướng tới."],
      },
    ],
  },
  {
    owner: "lan",
    title: "Cấu trúc tế bào",
    subject: "Sinh học",
    grade: 10,
    requirement: "Soạn bài giảng 6 cảnh về cấu trúc tế bào cho Sinh học 10: tế bào nhân sơ, tế bào nhân thực, các bào quan chính, so sánh tế bào động vật và thực vật, câu hỏi củng cố.",
    scenes: [
      {
        type: "slide",
        title: "Tế bào – đơn vị của sự sống",
        description: "Hai nhóm tế bào.",
        keyPoints: ["Nhân sơ và nhân thực", "Ba thành phần cơ bản"],
        heading: "Mọi tế bào đều có",
        bullets: ["Màng sinh chất bao bọc tế bào", "Tế bào chất chứa các bào quan", "Vùng nhân hoặc nhân chứa vật chất di truyền", "Hai nhóm: tế bào nhân sơ và tế bào nhân thực"],
        speech: [
          "Dù là vi khuẩn bé xíu hay tế bào cơ của các em, tế bào nào cũng có màng sinh chất, tế bào chất và vật chất di truyền.",
          "Dựa vào việc có nhân hoàn chỉnh hay không, người ta chia thành tế bào nhân sơ và tế bào nhân thực.",
        ],
      },
      {
        type: "slide",
        title: "Tế bào nhân sơ",
        description: "Đặc điểm của tế bào vi khuẩn.",
        keyPoints: ["Kích thước nhỏ", "Chưa có nhân hoàn chỉnh"],
        heading: "Tế bào nhân sơ (vi khuẩn)",
        bullets: ["Kích thước nhỏ, khoảng 1–5 μm", "Chưa có màng nhân: DNA nằm ở vùng nhân", "Không có hệ thống nội màng, ribosome loại 70S", "Thành tế bào peptidoglycan; có thể có lông, roi, vỏ nhầy"],
        speech: [
          "Tế bào nhân sơ rất nhỏ, chỉ khoảng một đến năm micromet.",
          "Nó chưa có màng nhân, vật chất di truyền nằm ở vùng nhân, và không có các bào quan có màng.",
          "Kích thước nhỏ giúp vi khuẩn trao đổi chất nhanh và sinh sản rất nhanh.",
        ],
      },
      {
        type: "slide",
        title: "Tế bào nhân thực",
        description: "Nhân và hệ thống nội màng.",
        keyPoints: ["Nhân có màng kép", "Có hệ thống nội màng"],
        heading: "Tế bào nhân thực",
        bullets: ["Kích thước lớn hơn, khoảng 10–100 μm", "Nhân có màng kép bao bọc, chứa DNA", "Hệ thống nội màng: lưới nội chất, bộ máy Golgi, lysosome", "Bào quan có màng chia tế bào thành các xoang riêng"],
        speech: [
          "Tế bào nhân thực lớn hơn nhiều và có nhân thật sự với lớp màng kép.",
          "Bên trong có hệ thống nội màng chia tế bào thành nhiều khoang, mỗi khoang làm một việc riêng, giống các phòng ban trong một nhà máy.",
        ],
      },
      {
        type: "slide",
        title: "Các bào quan chính",
        description: "Chức năng của một số bào quan.",
        keyPoints: ["Ti thể tạo ATP", "Lục lạp quang hợp"],
        heading: "Bào quan và chức năng",
        bullets: ["Ti thể: hô hấp tế bào, tạo năng lượng ATP", "Lục lạp (tế bào thực vật): quang hợp", "Ribosome: tổng hợp protein", "Bộ máy Golgi: chế biến, đóng gói, vận chuyển sản phẩm"],
        speech: [
          "Ti thể được ví như nhà máy điện, tạo năng lượng ATP cho tế bào.",
          "Lục lạp chỉ có ở tế bào thực vật, là nơi diễn ra quang hợp.",
          "Ribosome tổng hợp protein, còn bộ máy Golgi giống bưu điện, đóng gói và gửi sản phẩm đi đúng nơi.",
        ],
      },
      {
        type: "slide",
        title: "Tế bào động vật và tế bào thực vật",
        description: "So sánh hai loại tế bào nhân thực.",
        keyPoints: ["Thực vật có thành cellulose, lục lạp", "Động vật có trung thể, lysosome"],
        heading: "Khác nhau ở đâu?",
        bullets: ["Thực vật: có thành cellulose, lục lạp, không bào lớn", "Động vật: không có thành tế bào, không có lục lạp", "Động vật: có trung thể và lysosome", "Cả hai đều có nhân, ti thể, ribosome, lưới nội chất"],
        speech: [
          "Tế bào thực vật có thêm thành cellulose cứng, lục lạp và một không bào lớn ở giữa.",
          "Tế bào động vật không có thành tế bào nên hình dạng linh hoạt hơn, và có trung thể giúp phân chia tế bào.",
        ],
      },
      {
        type: "quiz",
        title: "Củng cố",
        description: "Ba câu hỏi về cấu trúc tế bào.",
        keyPoints: ["Nhân sơ", "Bào quan", "So sánh"],
        questions: [
          {
            question: "Đặc điểm nào chỉ có ở tế bào nhân sơ?",
            options: ["Có màng sinh chất", "Có ribosome", "Chưa có màng nhân", "Có tế bào chất"],
            answer: 2,
            analysis: "Màng sinh chất, tế bào chất và ribosome có ở cả hai nhóm; tế bào nhân sơ chưa có màng nhân.",
          },
          {
            question: "Bào quan tạo ra phần lớn ATP cho tế bào là",
            options: ["Ti thể", "Lục lạp", "Bộ máy Golgi", "Lysosome"],
            answer: 0,
            analysis: "Ti thể là nơi diễn ra hô hấp tế bào, tạo ATP.",
          },
          {
            question: "Cấu trúc nào có ở tế bào thực vật nhưng không có ở tế bào động vật?",
            options: ["Ti thể", "Nhân", "Ribosome", "Thành cellulose"],
            answer: 3,
            analysis: "Thành tế bào bằng cellulose là đặc trưng của tế bào thực vật.",
          },
        ],
        speech: ["Cô mời các em làm ba câu hỏi củng cố.", "Câu cuối, các em hình dung lại tế bào lá cây và tế bào má mà mình đã quan sát dưới kính hiển vi."],
      },
    ],
  },
  {
    owner: "phuong",
    title: "Cách mạng tháng Tám năm 1945",
    subject: "Lịch sử",
    grade: 12,
    requirement: "Soạn bài giảng 5 cảnh cho lớp 12A1 về Cách mạng tháng Tám năm 1945: thời cơ, diễn biến, nguyên nhân thắng lợi, ý nghĩa, câu hỏi củng cố.",
    scenes: [
      {
        type: "slide",
        title: "Thời cơ “ngàn năm có một”",
        description: "Bối cảnh tháng 8/1945.",
        keyPoints: ["Nhật đầu hàng 15/8/1945", "Thời cơ ngắn ngủi"],
        heading: "Tháng 8 năm 1945",
        bullets: ["Liên Xô tuyên chiến với Nhật (8/8), Mĩ ném bom nguyên tử (6/8, 9/8)", "Ngày 15/8/1945, Nhật đầu hàng Đồng minh không điều kiện", "Quân Nhật ở Đông Dương hoang mang, chính phủ thân Nhật rệu rã", "Thời cơ: trước khi quân Đồng minh vào Đông Dương"],
        speech: [
          "Giữa tháng tám năm một nghìn chín trăm bốn mươi lăm, phát xít Nhật đầu hàng Đồng minh.",
          "Quân Nhật ở Đông Dương mất tinh thần, còn quân Đồng minh thì chưa kịp vào. Đó là khoảng trống quyền lực ngắn ngủi.",
          "Đảng và Bác Hồ gọi đây là thời cơ ngàn năm có một.",
        ],
      },
      {
        type: "slide",
        title: "Diễn biến Tổng khởi nghĩa",
        description: "Các mốc chính từ 13/8 đến 2/9/1945.",
        keyPoints: ["Hội nghị Tân Trào", "Hà Nội 19/8, Huế 23/8, Sài Gòn 25/8"],
        heading: "Mười lăm ngày làm nên lịch sử",
        bullets: ["13/8: Quân lệnh số 1; 14–15/8: Hội nghị toàn quốc của Đảng tại Tân Trào", "16–17/8: Quốc dân Đại hội Tân Trào", "Giành chính quyền: Hà Nội 19/8, Huế 23/8, Sài Gòn 25/8", "30/8 Bảo Đại thoái vị; 2/9 Tuyên ngôn Độc lập tại Ba Đình"],
        speech: [
          "Ngay khi có tin Nhật sắp đầu hàng, Ủy ban Khởi nghĩa toàn quốc ra Quân lệnh số một, Hội nghị toàn quốc của Đảng họp ở Tân Trào quyết định Tổng khởi nghĩa.",
          "Hà Nội giành chính quyền ngày mười chín tháng tám, Huế ngày hai mươi ba, Sài Gòn ngày hai mươi lăm.",
          "Ngày hai tháng chín, tại Quảng trường Ba Đình, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập.",
        ],
      },
      {
        type: "slide",
        title: "Nguyên nhân thắng lợi",
        description: "Nguyên nhân chủ quan và khách quan.",
        keyPoints: ["Chủ quan là quyết định", "Khách quan là thời cơ"],
        heading: "Vì sao thắng lợi nhanh chóng, ít đổ máu?",
        bullets: ["Truyền thống yêu nước, đoàn kết của dân tộc", "Sự lãnh đạo đúng đắn, kịp thời của Đảng do Hồ Chí Minh đứng đầu", "Quá trình chuẩn bị lực lượng suốt 15 năm (1930–1945)", "Khách quan: Đồng minh đánh bại phát xít, tạo thời cơ"],
        speech: [
          "Thời cơ đến với nhiều nước, nhưng không phải nước nào cũng nắm được.",
          "Ta thắng nhanh vì đã chuẩn bị lực lượng suốt mười lăm năm, có Mặt trận Việt Minh đoàn kết toàn dân và có sự lãnh đạo đúng đắn của Đảng.",
          "Vì vậy nguyên nhân chủ quan mới là nguyên nhân quyết định.",
        ],
      },
      {
        type: "slide",
        title: "Ý nghĩa lịch sử",
        description: "Ý nghĩa dân tộc và quốc tế.",
        keyPoints: ["Kỉ nguyên độc lập, tự do", "Cổ vũ phong trào giải phóng dân tộc"],
        heading: "Ý nghĩa của Cách mạng tháng Tám",
        bullets: ["Lật đổ ách thống trị của thực dân Pháp, phát xít Nhật và chế độ quân chủ", "Khai sinh nước Việt Nam Dân chủ Cộng hoà", "Mở ra kỉ nguyên độc lập, tự do cho dân tộc", "Cổ vũ phong trào giải phóng dân tộc trên thế giới"],
        speech: [
          "Cách mạng tháng Tám đã đưa nhân dân ta từ thân phận nô lệ trở thành người làm chủ đất nước.",
          "Nước Việt Nam Dân chủ Cộng hoà ra đời, mở ra kỉ nguyên độc lập, tự do.",
          "Thắng lợi này còn cổ vũ mạnh mẽ các dân tộc thuộc địa khác đứng lên đấu tranh.",
        ],
      },
      {
        type: "quiz",
        title: "Củng cố",
        description: "Hai câu hỏi về thời cơ và diễn biến.",
        keyPoints: ["Thời cơ", "Mốc thời gian"],
        questions: [
          {
            question: "Thời cơ của Tổng khởi nghĩa tháng Tám năm 1945 tồn tại trong khoảng thời gian nào?",
            options: ["Từ khi Nhật đảo chính Pháp đến khi Nhật đầu hàng", "Từ khi Nhật đầu hàng Đồng minh đến trước khi quân Đồng minh vào Đông Dương", "Từ ngày 19/8 đến ngày 2/9/1945", "Từ khi Mặt trận Việt Minh thành lập đến năm 1945"],
            answer: 1,
            analysis: "Khi Nhật đầu hàng, kẻ thù cũ đã gục ngã mà quân Đồng minh chưa vào, đó là thời cơ ngắn ngủi.",
          },
          {
            question: "Khởi nghĩa giành chính quyền ở Hà Nội thắng lợi vào ngày",
            options: ["15/8/1945", "23/8/1945", "19/8/1945", "25/8/1945"],
            answer: 2,
            analysis: "Hà Nội 19/8, Huế 23/8, Sài Gòn 25/8.",
          },
        ],
        speech: ["Cô mời cả lớp trả lời hai câu hỏi.", "Các em nhớ phân biệt thời cơ với diễn biến nhé."],
      },
    ],
  },
];

// =====================================================================================
// 4. SƠ ĐỒ TƯ DUY VÀ LƯU ĐỒ
// =====================================================================================

const n = (label: string, ...children: string[]) => ({ label, children: children.map((c) => ({ label: c })) });

export const DIAGRAMS: DDiagram[] = [
  {
    owner: "ha",
    title: "Bất phương trình bậc hai một ẩn",
    subject: "Toán",
    grade: 10,
    topic: "Bất phương trình bậc hai một ẩn",
    kind: "mind",
    root: {
      label: "Bất phương trình bậc hai",
      children: [
        n("Định nghĩa", "ax² + bx + c > 0 (≥, <, ≤)", "Điều kiện a ≠ 0", "Nghiệm và tập nghiệm S"),
        n("Dấu tam thức", "Δ < 0: cùng dấu a", "Δ = 0: cùng dấu a, trừ −b/2a", "Δ > 0: trong trái, ngoài cùng"),
        n("Cách giải", "Tìm nghiệm của f(x)", "Lập bảng xét dấu", "Chọn khoảng theo dấu đề bài"),
        n("Lỗi hay gặp", "Nhân số âm quên đổi chiều", "Dừng ở bước tìm nghiệm", "Nhầm ngoặc tròn, ngoặc vuông"),
        n("Ứng dụng", "Tập xác định hàm chứa căn", "Hệ bất phương trình", "Tìm m để f(x) > 0 với mọi x"),
        n("Quầy nước chanh", "P(x) = −x² + 6x − 5", "Có lãi khi 1 < x < 5", "Lãi lớn nhất 400 nghìn tại x = 3"),
      ],
    },
  },
  {
    owner: "bao-gv",
    title: "Cấu trúc văn bản nghị luận – Chiếu cầu hiền",
    subject: "Ngữ văn",
    grade: 11,
    topic: "Cấu trúc của văn bản nghị luận",
    kind: "mind",
    root: {
      label: "Chiếu cầu hiền",
      children: [
        n("Tác giả, hoàn cảnh", "Ngô Thì Nhậm (1746–1803)", "Viết thay vua Quang Trung", "Đối tượng: sĩ phu Bắc Hà"),
        n("Luận đề", "Cầu người hiền ra giúp nước", "Mục đích: thu phục sĩ phu Bắc Hà"),
        n("Luận điểm", "Người hiền như sao sáng", "Thực trạng hiền tài ẩn dật", "Đường lối cầu hiền rộng mở"),
        n("Lí lẽ, bằng chứng", "“gõ mõ canh cửa”", "“ra biển vào sông”", "“Một cái cột không đỡ nổi nhà”"),
        n("Nghệ thuật", "Trang trọng mà khiêm nhường", "Điển tích, so sánh", "Lập luận chặt chẽ"),
      ],
    },
  },
  {
    owner: "lan",
    title: "Hệ tuần hoàn ở người",
    subject: "Khoa học tự nhiên",
    grade: 8,
    topic: "Máu và hệ tuần hoàn của cơ thể người",
    kind: "mind",
    root: {
      label: "Hệ tuần hoàn",
      children: [
        n("Máu", "Huyết tương ~55%", "Hồng cầu: vận chuyển khí", "Bạch cầu: bảo vệ", "Tiểu cầu: đông máu"),
        n("Tim", "4 ngăn: 2 nhĩ, 2 thất", "Van tim: máu chảy một chiều", "Chu kì 0,8 giây"),
        n("Mạch máu", "Động mạch: từ tim đi", "Tĩnh mạch: về tim", "Mao mạch: trao đổi chất"),
        n("Vòng tuần hoàn", "Nhỏ: thất phải → phổi → nhĩ trái", "Lớn: thất trái → cơ quan → nhĩ phải"),
        n("Bảo vệ tim mạch", "Tập thể dục đều đặn", "Ăn ít muối, ít mỡ", "Không hút thuốc lá"),
      ],
    },
  },
  {
    owner: "phuong",
    title: "Cách mạng tháng Tám năm 1945",
    subject: "Lịch sử",
    grade: 12,
    topic: "Cách mạng tháng Tám năm 1945",
    kind: "mind",
    root: {
      label: "Cách mạng tháng Tám 1945",
      children: [
        n("Thời cơ", "Nhật đầu hàng 15/8/1945", "Đồng minh chưa vào Đông Dương"),
        n("Diễn biến", "14–15/8: Hội nghị Tân Trào", "19/8: Hà Nội", "23/8 Huế, 25/8 Sài Gòn", "2/9: Tuyên ngôn Độc lập"),
        n("Nguyên nhân", "Truyền thống yêu nước", "Đảng lãnh đạo đúng đắn", "Chuẩn bị 15 năm", "Thời cơ thuận lợi"),
        n("Ý nghĩa", "Lật đổ Pháp, Nhật, phong kiến", "Nước VNDCCH ra đời", "Kỉ nguyên độc lập, tự do"),
        n("Bài học", "Chớp đúng thời cơ", "Đoàn kết toàn dân", "Kết hợp chính trị và vũ trang"),
      ],
    },
  },
  {
    owner: "phuong",
    title: "Thiên nhiên nhiệt đới ẩm gió mùa",
    subject: "Địa lí",
    grade: 12,
    topic: "Thiên nhiên nhiệt đới ẩm gió mùa",
    kind: "mind",
    root: {
      label: "Nhiệt đới ẩm gió mùa",
      children: [
        n("Tính nhiệt đới", "Nhiệt độ TB năm trên 20 °C", "Cân bằng bức xạ dương", "1 400 – 3 000 giờ nắng/năm"),
        n("Tính ẩm", "Mưa 1 500 – 2 000 mm/năm", "Độ ẩm trên 80%"),
        n("Gió mùa", "Mùa đông: gió đông bắc (11 – 4)", "Mùa hạ: gió tây nam (5 – 10)"),
        n("Địa hình, sông ngòi", "Xâm thực mạnh ở miền núi", "Bồi tụ nhanh ở đồng bằng", "Sông dày đặc, giàu phù sa"),
        n("Đất, sinh vật", "Đất feralit ở đồi núi", "Rừng nhiệt đới ẩm gió mùa"),
        n("Ảnh hưởng", "Nông nghiệp nhiệt đới", "Thiên tai: bão, lũ, hạn hán"),
      ],
    },
  },
  {
    owner: "long",
    title: "Phản ứng oxi hoá – khử",
    subject: "Hoá học",
    grade: 10,
    topic: "Phản ứng oxi hoá – khử",
    kind: "mind",
    root: {
      label: "Phản ứng oxi hoá – khử",
      children: [
        n("Số oxi hoá", "Đơn chất: 0", "H: +1, O: −2", "Tổng trong phân tử bằng 0"),
        n("Chất khử", "Nhường electron", "Số oxi hoá tăng", "Bị oxi hoá"),
        n("Chất oxi hoá", "Nhận electron", "Số oxi hoá giảm", "Bị khử"),
        n("Cân bằng", "Xác định số oxi hoá thay đổi", "Viết quá trình oxi hoá, khử", "e nhường = e nhận", "Đặt hệ số, kiểm tra"),
        n("Ứng dụng", "Luyện kim", "Pin, acquy", "Chống gỉ sắt"),
      ],
    },
  },
  {
    owner: "ha",
    title: "Các bước giải bất phương trình bậc hai",
    subject: "Toán",
    grade: 10,
    topic: "Bất phương trình bậc hai một ẩn",
    kind: "flow",
    nodes: [
      { id: "s", label: "Bất phương trình bậc hai", shape: "pill" },
      { id: "n1", label: "Chuyển vế: f(x) = ax² + bx + c so với 0", shape: "rect" },
      { id: "d1", label: "a < 0?", shape: "diamond" },
      { id: "n2", label: "Nhân hai vế với −1, đổi chiều bất phương trình", shape: "rect" },
      { id: "n3", label: "Tính Δ, tìm nghiệm của f(x)", shape: "rect" },
      { id: "d2", label: "Δ > 0?", shape: "diamond" },
      { id: "n4", label: "Xét dấu: trong khoảng hai nghiệm trái dấu a", shape: "rect" },
      { id: "n5", label: "f(x) cùng dấu a (Δ = 0: trừ x = −b/2a)", shape: "rect" },
      { id: "e", label: "Kết luận tập nghiệm S", shape: "pill" },
    ],
    edges: [
      { from: "s", to: "n1" },
      { from: "n1", to: "d1" },
      { from: "d1", to: "n2", label: "Đúng" },
      { from: "d1", to: "n3", label: "Sai" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "d2" },
      { from: "d2", to: "n4", label: "Đúng" },
      { from: "d2", to: "n5", label: "Sai" },
      { from: "n4", to: "e" },
      { from: "n5", to: "e" },
    ],
  },
  {
    owner: "ngoc",
    title: "Thuật toán tìm kiếm tuần tự",
    subject: "Tin học",
    grade: 10,
    topic: "Câu lệnh lặp và rẽ nhánh",
    kind: "flow",
    nodes: [
      { id: "s", label: "Bắt đầu", shape: "pill" },
      { id: "in", label: "Nhập danh sách A gồm n phần tử và giá trị k", shape: "parallelogram" },
      { id: "i0", label: "i = 0", shape: "rect" },
      { id: "c1", label: "i < n?", shape: "diamond" },
      { id: "c2", label: "A[i] == k?", shape: "diamond" },
      { id: "inc", label: "i = i + 1", shape: "rect" },
      { id: "yes", label: "In “Tìm thấy tại vị trí i”", shape: "parallelogram" },
      { id: "no", label: "In “Không tìm thấy”", shape: "parallelogram" },
      { id: "e", label: "Kết thúc", shape: "pill" },
    ],
    edges: [
      { from: "s", to: "in" },
      { from: "in", to: "i0" },
      { from: "i0", to: "c1" },
      { from: "c1", to: "c2", label: "Đúng" },
      { from: "c1", to: "no", label: "Sai" },
      { from: "c2", to: "yes", label: "Đúng" },
      { from: "c2", to: "inc", label: "Sai" },
      { from: "inc", to: "c1" },
      { from: "yes", to: "e" },
      { from: "no", to: "e" },
    ],
  },
];

// =====================================================================================
// 5. BẢNG GIẢNG
// =====================================================================================

export const BOARDS: DBoard[] = [
  {
    owner: "ha",
    title: "Bất phương trình bậc hai một ẩn",
    subject: "Toán",
    grade: 10,
    topic: "Bất phương trình bậc hai một ẩn",
    pages: [
      {
        lines: [
          "Quầy nước chanh 10A1: bán $x$ chục cốc thì lãi $P(x) = -x^2 + 6x - 5$ (trăm nghìn đồng)",
          "$P(2) = -4 + 12 - 5 = 3$: lãi 300 nghìn đồng",
          "$P(6) = -36 + 36 - 5 = -5$: lỗ 500 nghìn đồng",
          "Có lãi $\\iff P(x) > 0 \\iff -x^2 + 6x - 5 > 0$",
        ],
      },
      {
        lines: [
          "Bước 1: $-x^2 + 6x - 5 = 0 \\iff x = 1$ hoặc $x = 5$ (vì $a + b + c = 0$)",
          "Bước 2: $a = -1 < 0$, quy tắc “trong trái, ngoài cùng”",
          "$P(x) > 0 \\iff 1 < x < 5$, tập nghiệm $S = (1; 5)$",
          "Chú ý: nhân hai vế với $-1$ được $x^2 - 6x + 5 < 0$ (đổi chiều!)",
        ],
      },
      {
        lines: [
          "Đồ thị $y = -x^2 + 6x - 5$: bề lõm hướng xuống, đỉnh $I(3; 4)$",
          "Cắt trục hoành tại $x = 1$ và $x = 5$",
          "Phần parabol phía trên trục hoành ứng với $1 < x < 5$",
          "Lãi lớn nhất $P(3) = 4$: 400 nghìn đồng khi bán 30 cốc",
        ],
        graph: { exprs: ["-x^2+6x-5"], view: { xMin: -1, xMax: 7, yMin: -6, yMax: 5 } },
      },
      {
        lines: [
          "Vận dụng: muốn lãi ít nhất 300 nghìn đồng, giải $P(x) \\ge 3$",
          "$-x^2 + 6x - 5 \\ge 3 \\iff -x^2 + 6x - 8 \\ge 0$",
          "$\\iff x^2 - 6x + 8 \\le 0 \\iff 2 \\le x \\le 4$",
          "Kết luận: bán từ 20 đến 40 cốc",
        ],
      },
    ],
  },
  {
    owner: "ha",
    title: "Phương trình quy về phương trình bậc hai",
    subject: "Toán",
    grade: 10,
    topic: "Phương trình quy về phương trình bậc hai",
    pages: [
      {
        lines: [
          "Dạng 1: $\\sqrt{f(x)} = \\sqrt{g(x)}$",
          "Bình phương: $f(x) = g(x)$, giải rồi thử lại",
          "Ví dụ: $\\sqrt{3x^2 - 4x - 1} = \\sqrt{2x^2 - 4x + 3}$",
          "$\\Rightarrow x^2 = 4 \\Rightarrow x = \\pm 2$; thử lại đều thoả",
          "$S = \\{-2; 2\\}$",
        ],
      },
      {
        lines: [
          "Dạng 2: $\\sqrt{f(x)} = ax + b$, điều kiện $ax + b \\ge 0$",
          "Ví dụ: $\\sqrt{2x^2 - 5x - 9} = x - 1$, điều kiện $x \\ge 1$",
          "$2x^2 - 5x - 9 = x^2 - 2x + 1 \\iff x^2 - 3x - 10 = 0$",
          "$x = 5$ (nhận) hoặc $x = -2$ (loại)",
          "$S = \\{5\\}$",
        ],
      },
      {
        lines: [
          "Vận dụng: nhà An cách quốc lộ 3 km, $HM = x$ km",
          "$AM = \\sqrt{x^2 + 9} = 2x - 3$, điều kiện $x \\ge \\dfrac{3}{2}$",
          "$x^2 + 9 = 4x^2 - 12x + 9 \\iff 3x^2 - 12x = 0$",
          "$x = 0$ (loại) hoặc $x = 4$ (nhận): $HM = 4$ km, $AM = 5$ km",
        ],
      },
    ],
  },
  {
    owner: "ha",
    title: "Hàm số bậc hai",
    subject: "Toán",
    grade: 10,
    topic: "Hàm số bậc hai",
    pages: [
      {
        lines: [
          "Hàm số bậc hai: $y = ax^2 + bx + c$, $a \\ne 0$, $D = \\mathbb{R}$",
          "Đỉnh $I\\left(-\\dfrac{b}{2a}; -\\dfrac{\\Delta}{4a}\\right)$, trục đối xứng $x = -\\dfrac{b}{2a}$",
          "$a > 0$: bề lõm hướng lên; $a < 0$: bề lõm hướng xuống",
        ],
      },
      {
        lines: [
          "Vẽ $y = x^2 - 4x + 3$",
          "Đỉnh $I(2; -1)$, trục đối xứng $x = 2$",
          "Cắt $Oy$ tại $(0; 3)$, cắt $Ox$ tại $(1; 0)$ và $(3; 0)$",
          "Nghịch biến trên $(-\\infty; 2)$, đồng biến trên $(2; +\\infty)$",
        ],
        graph: { exprs: ["x^2-4x+3"], view: { xMin: -1, xMax: 5, yMin: -2, yMax: 6 } },
      },
      {
        lines: [
          "Luyện tập: $y = -x^2 + 2x + 3$",
          "Đỉnh $I(1; 4)$, cắt $Ox$ tại $x = -1$ và $x = 3$",
          "Đồng biến trên $(-\\infty; 1)$, nghịch biến trên $(1; +\\infty)$",
          "Giá trị lớn nhất bằng 4 tại $x = 1$",
        ],
        graph: { exprs: ["-x^2+2x+3"], view: { xMin: -2, xMax: 4, yMin: -2, yMax: 5 } },
      },
    ],
  },
  {
    owner: "binh",
    title: "Sự rơi tự do",
    subject: "Vật lí",
    grade: 10,
    topic: "Sự rơi tự do",
    pages: [
      {
        lines: [
          "Rơi tự do: chỉ chịu tác dụng của trọng lực",
          "Phương thẳng đứng, chiều từ trên xuống, nhanh dần đều",
          "Gia tốc $g \\approx 9{,}8\\ \\text{m/s}^2$ (lấy gần đúng $10\\ \\text{m/s}^2$)",
        ],
      },
      {
        lines: [
          "$v = gt$",
          "$s = \\dfrac{1}{2}gt^2$",
          "$v^2 = 2gs$",
          "Đồ thị $s = 5t^2$ với $g = 10\\ \\text{m/s}^2$ (trục hoành là $t$ tính bằng giây)",
        ],
        graph: { exprs: ["5x^2"], view: { xMin: 0, xMax: 3, yMin: 0, yMax: 45 } },
      },
      {
        lines: [
          "Ví dụ: thả vật từ $h = 20$ m, $g = 10\\ \\text{m/s}^2$",
          "$t = \\sqrt{\\dfrac{2h}{g}} = \\sqrt{4} = 2$ s",
          "$v = gt = 20$ m/s",
          "Giây cuối rơi được $20 - 5 = 15$ m",
        ],
      },
    ],
  },
  {
    owner: "long",
    title: "Phản ứng oxi hoá – khử",
    subject: "Hoá học",
    grade: 10,
    topic: "Phản ứng oxi hoá – khử",
    pages: [
      {
        lines: [
          "Số oxi hoá: đơn chất bằng 0; H là $+1$; O là $-2$",
          "$\\mathrm{H_2SO_4}$: $2(+1) + x + 4(-2) = 0 \\Rightarrow x = +6$",
          "$\\mathrm{NH_4^+}$: $x + 4(+1) = +1 \\Rightarrow x = -3$",
          "$\\mathrm{KMnO_4}$: Mn có số oxi hoá $+7$",
        ],
      },
      {
        lines: [
          "$\\mathrm{Fe_2O_3 + 3CO \\xrightarrow{t^\\circ} 2Fe + 3CO_2}$",
          "$\\mathrm{Fe^{+3} \\to Fe^0}$: $\\mathrm{Fe_2O_3}$ là chất oxi hoá (bị khử)",
          "$\\mathrm{C^{+2} \\to C^{+4}}$: CO là chất khử (bị oxi hoá)",
          "Khử cho, O nhận",
        ],
      },
      {
        lines: [
          "Cân bằng $\\mathrm{Fe + HNO_3 \\to Fe(NO_3)_3 + NO + H_2O}$",
          "$1 \\times\\ \\mathrm{Fe^0 \\to Fe^{+3} + 3e}$",
          "$1 \\times\\ \\mathrm{N^{+5} + 3e \\to N^{+2}}$",
          "$\\mathrm{Fe + 4HNO_3 \\to Fe(NO_3)_3 + NO + 2H_2O}$",
        ],
      },
    ],
  },
  {
    owner: "khai",
    title: "Tìm kiếm theo chiều rộng (BFS)",
    subject: "Lập trình",
    grade: 14,
    topic: "Duyệt đồ thị",
    pages: [
      {
        lines: [
          "Đồ thị $G = (V, E)$ không trọng số, đỉnh nguồn $s$",
          "Mục tiêu: $dist[v]$ = số cạnh ít nhất từ $s$ đến $v$",
          "Duyệt theo lớp: khoảng cách 0, 1, 2, …",
          "Dùng hàng đợi FIFO",
        ],
      },
      {
        lines: [
          "dist[s] = 0; đánh dấu s; queue = [s]",
          "Lặp khi queue khác rỗng: u = queue.popleft()",
          "Với mỗi v kề u, nếu v chưa đánh dấu:",
          "dist[v] = dist[u] + 1; parent[v] = u; đánh dấu v; queue.append(v)",
          "Truy vết đường đi ngược từ đích bằng parent[]",
        ],
      },
      {
        lines: [
          "Độ phức tạp thời gian: $O(|V| + |E|)$ với danh sách kề",
          "Bộ nhớ: $O(|V|)$",
          "Đúng cho đường đi ngắn nhất khi mọi cạnh cùng trọng số",
          "Cạnh có trọng số khác nhau: dùng Dijkstra",
        ],
      },
    ],
  },
];

// =====================================================================================
// 6. VĂN BẢN HÀNH CHÍNH (NĐ 30/2020) — daysAgo tính so với 27/11/2026
// =====================================================================================

const VB = {
  co_quan_chu_quan: "SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. HỒ CHÍ MINH",
  co_quan_ban_hanh: "TRƯỜNG LIÊN CẤP BÌNH MINH",
  ky_hieu_co_quan: "LCBM",
  dia_danh: "TP. Hồ Chí Minh",
};
const HT = { chuc_vu_ky: "HIỆU TRƯỞNG", nguoi_ky: "Lý Thành Công" };

export const VANBAN: DVanBan[] = [
  {
    owner: "ha",
    daysAgo: 9,
    input: {
      ...VB,
      loai: "bien_ban",
      so: 12,
      ngay: "2026-11-18",
      trich_yeu: "Họp tổ chuyên môn Toán – Tin tháng 11 năm 2026",
      thoi_gian: "14 giờ 00 phút, thứ Tư, ngày 18 tháng 11 năm 2026",
      dia_diem: "Phòng họp tổ Toán – Tin, Trường Liên cấp Bình Minh",
      thanh_phan: [
        "Cô Đinh Hoài Thu, tổ trưởng tổ Toán – Tin, chủ trì",
        "Cô Lê Thu Hà, giáo viên Toán, thư ký",
        "Thầy Lương Văn Tâm, giáo viên Toán",
        "Cô Hồ Bích Ngọc, giáo viên Tin học",
        "TS. Đặng Văn Khải, giảng viên Lập trình lớp liên kết KTPM K23",
        "Có mặt 5/5 thành viên, vắng: không",
      ],
      chu_tri: "Đinh Hoài Thu",
      thu_ky: "Lê Thu Hà",
      noi_dung: [
        { cap: 1, tieu_de: "Đánh giá hoạt động chuyên môn tháng 11" },
        "Tổ đã thực hiện đúng phân phối chương trình đến tuần 11; 100% giáo viên có kế hoạch bài dạy theo Công văn 5512/BGDĐT-GDTrH. Kiểm tra giữa kì I đã tổ chức đúng lịch, điểm trung bình môn Toán khối 10 đạt 6,7; lớp 10A2 thấp nhất khối (6,4).",
        "Chuyên đề “Dạy học bất phương trình bậc hai gắn với tình huống thực tế” do cô Lê Thu Hà thực hiện ở lớp 10A1 được đánh giá tốt; ví dụ quầy nước chanh của lớp giúp học sinh hiểu ý nghĩa tập nghiệm.",
        { cap: 1, tieu_de: "Nội dung thảo luận" },
        { cap: 2, tieu_de: "Ra đề kiểm tra cuối kì I" },
        "Thống nhất đề Toán theo cấu trúc ba phần (trắc nghiệm nhiều lựa chọn, đúng sai, trả lời ngắn) kèm phần tự luận; thời gian làm bài 90 phút. Phân công: khối 10 cô Thu và cô Hà; khối 11, 12 thầy Tâm; môn Tin học cô Ngọc.",
        { cap: 2, tieu_de: "Hội giảng cấp trường" },
        "Cô Lê Thu Hà đăng kí tiết hội giảng bài “Bất phương trình bậc hai một ẩn” tại lớp 10A1 ngày 27/11/2026; tổ góp ý kế hoạch bài dạy và cử thầy Tâm, cô Ngọc dự giờ.",
        { cap: 2, tieu_de: "Hỗ trợ học sinh" },
        "Lớp 10A1 có 3 học sinh cần hỗ trợ thêm về bất phương trình bậc hai; giáo viên bộ môn giao bài phân hoá trên EDUVN và theo dõi tiến bộ hằng tuần.",
        { cap: 1, tieu_de: "Kết luận và phân công" },
        {
          danh_sach: [
            "Nộp ma trận, bản đặc tả và đề kiểm tra cuối kì I về tổ trưởng trước ngày 04/12/2026",
            "Chuẩn bị Ngày hội Toán học sáng thứ Bảy 12/12/2026 theo kế hoạch của nhà trường",
            "Cô Hà hoàn thiện kế hoạch bài dạy hội giảng trước ngày 25/11/2026",
          ],
        },
        "Cuộc họp kết thúc lúc 16 giờ 15 phút cùng ngày; biên bản đã được đọc lại và thông qua trước các thành viên dự họp.",
      ],
      noi_nhan: ["Ban Giám hiệu (để báo cáo)", "Thành viên tổ Toán – Tin", "Lưu: Hồ sơ tổ"],
    },
  },
  {
    owner: "ha",
    daysAgo: 7,
    input: {
      ...VB,
      ...HT,
      loai: "ke_hoach",
      so: 87,
      ngay: "2026-11-20",
      trich_yeu: "Tổ chức kiểm tra cuối kì I năm học 2026–2027",
      can_cu: [
        "Căn cứ Thông tư số 22/2021/TT-BGDĐT ngày 20/7/2021 của Bộ Giáo dục và Đào tạo quy định về đánh giá học sinh trung học cơ sở và học sinh trung học phổ thông",
        "Căn cứ Công văn số 7991/BGDĐT-GDTrH ngày 17/12/2024 của Bộ Giáo dục và Đào tạo về việc thực hiện kiểm tra, đánh giá đối với cấp trung học cơ sở, trung học phổ thông",
        "Căn cứ Kế hoạch giáo dục năm học 2026–2027 của Trường Liên cấp Bình Minh",
      ],
      noi_dung: [
        "Trường Liên cấp Bình Minh xây dựng kế hoạch tổ chức kiểm tra cuối kì I năm học 2026–2027 như sau:",
        { cap: 1, tieu_de: "Mục đích, yêu cầu" },
        {
          danh_sach: [
            "Đánh giá đúng kết quả học tập của học sinh theo yêu cầu cần đạt của Chương trình giáo dục phổ thông 2018",
            "Đề kiểm tra bám sát ma trận, bản đặc tả đã thống nhất trong tổ chuyên môn",
            "Tổ chức nghiêm túc, khách quan, an toàn, đúng quy chế",
          ],
        },
        { cap: 1, tieu_de: "Thời gian và hình thức" },
        { cap: 2, tieu_de: "Lịch thực hiện" },
        {
          danh_sach: [
            "Từ 30/11 đến 19/12/2026: giáo viên tổ chức ôn tập trên lớp và trên EDUVN",
            "Trước 04/12/2026: tổ chuyên môn nộp ma trận, bản đặc tả, đề và hướng dẫn chấm về Phó Hiệu trưởng chuyên môn",
            "Từ 21/12 đến 26/12/2026: tổ chức kiểm tra tập trung theo khối",
            "Trước 31/12/2026: hoàn thành chấm bài, nhập điểm vào sổ điểm điện tử",
          ],
        },
        { cap: 2, tieu_de: "Thời gian làm bài" },
        "Ngữ văn và Toán: 90 phút; các môn còn lại: 45 phút. Đề Toán gồm ba phần trắc nghiệm (nhiều lựa chọn, đúng sai, trả lời ngắn) và phần tự luận; các môn đánh giá bằng nhận xét thực hiện theo hướng dẫn của tổ chuyên môn.",
        { cap: 1, tieu_de: "Tổ chức thực hiện" },
        "Các tổ chuyên môn phân công giáo viên ra đề, phản biện đề và bảo mật đề theo quy định. Giáo viên chủ nhiệm thông báo lịch kiểm tra đến học sinh và cha mẹ học sinh. Bộ phận văn phòng chuẩn bị phòng thi, in sao đề và hồ sơ coi kiểm tra.",
      ],
      noi_nhan: ["Phó Hiệu trưởng", "Các tổ chuyên môn", "Giáo viên chủ nhiệm", "Lưu: VT, CM"],
    },
  },
  {
    owner: "ha",
    daysAgo: 2,
    input: {
      ...VB,
      loai: "thong_bao",
      so: 45,
      ngay: "2026-11-25",
      trich_yeu: "Về việc tổ chức họp cha mẹ học sinh lớp 10A1 học kỳ I năm học 2026–2027",
      noi_dung: [
        "Nhằm thông tin kết quả học tập giữa kì I và phối hợp chuẩn bị cho kiểm tra cuối kì I, giáo viên chủ nhiệm lớp 10A1 trân trọng thông báo đến quý cha mẹ học sinh như sau:",
        { cap: 1, tieu_de: "Thời gian và địa điểm" },
        "Thời gian: 08 giờ 00 phút, Chủ nhật, ngày 06/12/2026. Địa điểm: phòng học lớp 10A1, tầng 2, dãy B, Trường Liên cấp Bình Minh.",
        { cap: 1, tieu_de: "Nội dung" },
        {
          danh_sach: [
            "Thông báo kết quả học tập, rèn luyện giữa kì I của lớp (điểm trung bình các môn 7,2)",
            "Kế hoạch ôn tập và lịch kiểm tra cuối kì I (từ 21/12 đến 26/12/2026)",
            "Hướng dẫn cha mẹ theo dõi việc học của con trên ứng dụng EDUVN",
            "Trao đổi về thời gian tự học buổi tối và sử dụng điện thoại hợp lí",
          ],
        },
        "Kính mong quý cha mẹ học sinh sắp xếp thời gian tham dự đầy đủ, đúng giờ. Trường hợp không thể tham dự, xin vui lòng báo trước cho giáo viên chủ nhiệm qua nhóm Zalo của lớp.",
      ],
      noi_nhan: ["Cha mẹ học sinh lớp 10A1", "Ban Giám hiệu (để báo cáo)"],
      chuc_vu_ky: "GIÁO VIÊN CHỦ NHIỆM",
      nguoi_ky: "Lê Thu Hà",
    },
  },
  {
    owner: "ha",
    daysAgo: 10,
    input: {
      ...VB,
      loai: "bao_cao",
      so: 38,
      ngay: "2026-11-17",
      trich_yeu: "Kết quả kiểm tra giữa kì I lớp 10A1 năm học 2026–2027",
      kinh_gui: ["Ban Giám hiệu Trường Liên cấp Bình Minh"],
      noi_dung: [
        { cap: 1, tieu_de: "Tình hình chung" },
        "Lớp 10A1 có 42 học sinh; 42/42 học sinh dự kiểm tra giữa kì I đầy đủ các môn. Nề nếp học tập ổn định, tỉ lệ chuyên cần đạt 98,8%.",
        { cap: 1, tieu_de: "Kết quả kiểm tra giữa kì I" },
        { cap: 2, tieu_de: "Điểm trung bình theo môn" },
        {
          danh_sach: [
            "Toán: 6,9; Ngữ văn: 6,8; Tiếng Anh: 7,6; Vật lí: 7,3",
            "Hoá học: 7,5; Sinh học: 6,9; Lịch sử: 7,4; Tin học: 7,2",
            "Điểm trung bình chung các môn: 7,2",
          ],
        },
        { cap: 2, tieu_de: "Phân bố điểm môn Toán" },
        "Từ 8,0 trở lên: 12 học sinh; từ 6,5 đến dưới 8,0: 17 học sinh; từ 5,0 đến dưới 6,5: 10 học sinh; dưới 5,0: 3 học sinh. Nội dung học sinh còn yếu nhất là bất phương trình bậc hai và bài toán chứa tham số.",
        { cap: 1, tieu_de: "Đánh giá và giải pháp" },
        "Ưu điểm: đa số học sinh có ý thức học tập, môn Tiếng Anh và Hoá học đạt kết quả tốt. Hạn chế: môn Toán và Ngữ văn chưa đồng đều; một số em thức khuya, giảm tập trung.",
        {
          danh_sach: [
            "Giao bài luyện tập phân hoá trên EDUVN cho 3 học sinh cần hỗ trợ về bất phương trình (em Nguyễn Minh Anh, Trần Khánh Duy, Đỗ Đức Thịnh)",
            "Phối hợp giáo viên Ngữ văn tăng cường luyện đọc hiểu văn bản nghị luận",
            "Trao đổi với cha mẹ học sinh trong buổi họp ngày 06/12/2026",
          ],
        },
      ],
      noi_nhan: ["Như trên", "Tổ Toán – Tin"],
      chuc_vu_ky: "GIÁO VIÊN CHỦ NHIỆM",
      nguoi_ky: "Lê Thu Hà",
    },
  },
  {
    owner: "thu",
    daysAgo: 17,
    input: {
      ...VB,
      ...HT,
      loai: "ke_hoach",
      so: 79,
      ngay: "2026-11-10",
      trich_yeu: "Tổ chức hoạt động ngoại khoá “Ngày hội Toán học” năm học 2026–2027",
      can_cu: ["Căn cứ Kế hoạch giáo dục năm học 2026–2027 của Trường Liên cấp Bình Minh", "Căn cứ đề xuất của tổ Toán – Tin tại cuộc họp tổ tháng 10 năm 2026"],
      noi_dung: [
        { cap: 1, tieu_de: "Mục đích, yêu cầu" },
        "Tạo sân chơi bổ ích giúp học sinh thấy được ứng dụng của Toán học trong đời sống, phát triển năng lực mô hình hoá, hợp tác và giao tiếp. Hoạt động an toàn, tiết kiệm, thu hút đông đảo học sinh tham gia.",
        { cap: 1, tieu_de: "Thời gian, địa điểm, đối tượng" },
        "Từ 07 giờ 30 phút đến 11 giờ 00 phút, thứ Bảy, ngày 12/12/2026, tại sân trường và nhà đa năng. Đối tượng: học sinh khối 6 đến khối 12.",
        { cap: 1, tieu_de: "Nội dung hoạt động" },
        {
          danh_sach: [
            "Rung chuông vàng Toán học: mỗi khối chọn 20 học sinh",
            "Gian hàng “Toán học quanh ta”: mỗi lớp một gian; lớp 10A1 mở quầy nước chanh và tính lãi bằng bất phương trình bậc hai",
            "Giải mật thư và trò chơi trí tuệ theo trạm",
            "Triển lãm sản phẩm vẽ hình bằng GeoGebra và mô hình hình học",
          ],
        },
        { cap: 1, tieu_de: "Kinh phí" },
        "Dự trù 8.500.000 đồng (tám triệu năm trăm nghìn đồng) từ nguồn kinh phí hoạt động ngoại khoá của nhà trường, dùng cho phần thưởng, trang trí và vật tư.",
        { cap: 1, tieu_de: "Tổ chức thực hiện" },
        "Tổ Toán – Tin chủ trì xây dựng nội dung, câu hỏi và điều hành các hoạt động; Đoàn Thanh niên, Liên đội phối hợp tổ chức; giáo viên chủ nhiệm hướng dẫn lớp chuẩn bị gian hàng; bộ phận cơ sở vật chất chuẩn bị âm thanh, sân khấu.",
      ],
      noi_nhan: ["Phó Hiệu trưởng", "Tổ Toán – Tin", "Đoàn Thanh niên, Liên đội", "Giáo viên chủ nhiệm"],
    },
  },
  {
    owner: "ha",
    daysAgo: 4,
    input: {
      ...VB,
      ...HT,
      loai: "giay_moi",
      so: 52,
      ngay: "2026-11-23",
      trich_yeu: "Dự tiết hội giảng cấp trường môn Toán học kỳ I năm học 2026–2027",
      thoi_gian: "07 giờ 00 phút, thứ Sáu, ngày 27 tháng 11 năm 2026 (tiết 1)",
      dia_diem: "Phòng học lớp 10A1, tầng 2, dãy B, Trường Liên cấp Bình Minh",
      noi_dung: [
        "Trường Liên cấp Bình Minh trân trọng kính mời quý thầy cô thuộc Ban Giám hiệu, tổ Toán – Tin và giáo viên các tổ chuyên môn quan tâm đến dự tiết hội giảng cấp trường.",
        {
          danh_sach: [
            "Giáo viên thực hiện: cô Lê Thu Hà, tổ Toán – Tin",
            "Bài dạy: Bất phương trình bậc hai một ẩn (Toán 10, Cánh Diều)",
            "Lớp: 10A1",
          ],
        },
        "Sau tiết dạy, tổ chức góp ý, rút kinh nghiệm tại phòng họp tổ Toán – Tin. Rất mong quý thầy cô đến dự đầy đủ, đúng giờ.",
      ],
      noi_nhan: ["Ban Giám hiệu", "Tổ Toán – Tin", "Các tổ trưởng chuyên môn"],
    },
  },
  {
    owner: "ngoc",
    daysAgo: 30,
    input: {
      ...VB,
      loai: "to_trinh",
      so: 6,
      ngay: "2026-10-28",
      trich_yeu: "Về việc đề nghị mua sắm bổ sung thiết bị phòng Tin học số 2",
      kinh_gui: ["Hiệu trưởng Trường Liên cấp Bình Minh"],
      noi_dung: [
        { cap: 1, tieu_de: "Thực trạng" },
        "Phòng Tin học số 2 hiện có 40 máy tính, trong đó 10 máy đã sử dụng trên 8 năm, cấu hình thấp, thường xuyên hỏng, không đáp ứng việc dạy lập trình Python theo Chương trình Tin học 2018 và các buổi thực hành của lớp liên kết KTPM K23.",
        { cap: 1, tieu_de: "Danh mục đề nghị mua sắm" },
        {
          danh_sach: [
            "10 máy tính để bàn (CPU Core i5, RAM 16 GB, SSD 512 GB), đơn giá 14.500.000 đồng, thành tiền 145.000.000 đồng",
            "01 bộ chuyển mạch mạng 24 cổng: 4.200.000 đồng",
            "01 bộ lưu điện UPS 3 kVA: 12.800.000 đồng",
            "20 tai nghe có micro, đơn giá 350.000 đồng, thành tiền 7.000.000 đồng",
          ],
        },
        "Tổng kinh phí dự kiến: 169.000.000 đồng (một trăm sáu mươi chín triệu đồng).",
        { cap: 1, tieu_de: "Đề xuất" },
        "Tổ Toán – Tin kính đề nghị Hiệu trưởng xem xét, phê duyệt mua sắm từ nguồn kinh phí chi thường xuyên năm 2026 để kịp đưa vào sử dụng trước kiểm tra cuối kì I. Tổ cam kết phân công giáo viên quản lí, sử dụng và bảo quản thiết bị đúng quy định.",
      ],
      noi_nhan: ["Như trên", "Bộ phận Kế toán"],
      chuc_vu_ky: "TỔ TRƯỞNG TỔ TOÁN – TIN",
      nguoi_ky: "Đinh Hoài Thu",
    },
  },
  {
    owner: "ha",
    daysAgo: 1,
    input: {
      ...VB,
      ...HT,
      loai: "cong_van",
      so: 131,
      ky_hieu_don_vi: "CM",
      ngay: "2026-11-26",
      trich_yeu: "Phối hợp hướng dẫn học sinh ôn tập kiểm tra cuối kì I",
      kinh_gui: ["Quý cha mẹ học sinh Trường Liên cấp Bình Minh"],
      noi_dung: [
        "Thực hiện Kế hoạch số 87/KH-LCBM ngày 20/11/2026 về tổ chức kiểm tra cuối kì I năm học 2026–2027, nhà trường thông tin và đề nghị quý cha mẹ học sinh phối hợp một số nội dung sau:",
        {
          danh_sach: [
            "Kiểm tra cuối kì I diễn ra từ ngày 21/12 đến 26/12/2026; lịch chi tiết từng khối được đăng trên ứng dụng EDUVN và bảng tin nhà trường",
            "Từ ngày 30/11/2026, giáo viên giao đề cương và bài ôn tập theo từng môn trên EDUVN; cha mẹ có thể theo dõi tiến độ làm bài của con tại mục Phụ huynh",
            "Đề nghị gia đình nhắc con dành 90–120 phút tự học mỗi tối, ngủ trước 23 giờ, hạn chế sử dụng điện thoại vào mục đích giải trí",
            "Khi con gặp khó khăn ở môn học nào, cha mẹ liên hệ giáo viên chủ nhiệm để nhà trường bố trí phụ đạo kịp thời",
          ],
        },
        "Nhà trường trân trọng cảm ơn sự quan tâm, phối hợp của quý cha mẹ học sinh.",
      ],
      noi_nhan: ["Như trên", "Giáo viên chủ nhiệm (để phối hợp)", "Lưu: VT, CM"],
    },
  },
];

// =====================================================================================
// 7. NHẬN XÉT HỌC KỲ I THEO THÔNG TƯ 22/2021
// =====================================================================================

export const COMMENTS: Record<"Tốt" | "Khá" | "Đạt" | "Chưa đạt", string[]> = {
  Tốt: [
    "Nắm vững kiến thức trọng tâm, vận dụng linh hoạt vào bài tập nâng cao. Trình bày lời giải mạch lạc, chặt chẽ. Tiếp tục thử sức với các bài toán thực tế để phát huy năng lực.",
    "Tiếp thu nhanh, chủ động phát biểu và đặt câu hỏi hay trong giờ học. Hoàn thành tốt mọi nhiệm vụ học tập. Nên giúp đỡ thêm các bạn trong nhóm để cùng tiến bộ.",
    "Có tinh thần tự học cao, làm bài đầy đủ và đúng hạn. Kết quả kiểm tra ổn định ở mức tốt. Cần rèn thêm tốc độ làm bài để đạt điểm tối đa trong bài kiểm tra cuối kì.",
    "Hiểu bản chất vấn đề, biết liên hệ kiến thức giữa các bài. Sản phẩm nhóm do em điều phối chất lượng tốt. Tiếp tục giữ vững phong độ trong học kỳ II.",
    "Tư duy logic tốt, biết lựa chọn cách giải ngắn gọn. Cẩn thận trong tính toán, ít mắc lỗi. Nên mở rộng đọc thêm tài liệu tham khảo để nâng cao hiểu biết.",
    "Chăm chỉ, nghiêm túc, luôn hoàn thành bài trên lớp và bài về nhà. Diễn đạt rõ ràng khi trình bày trước lớp. Hãy mạnh dạn tham gia các cuộc thi học thuật của trường.",
    "Học tập tiến bộ vượt bậc so với đầu năm, đạt kết quả tốt ở các bài kiểm tra. Biết tự đánh giá và sửa lỗi của mình. Tiếp tục duy trì thói quen ôn bài đều đặn.",
    "Vận dụng tốt kiến thức để giải quyết tình huống thực tiễn. Tích cực đóng góp ý tưởng sáng tạo trong hoạt động nhóm. Cần chú ý trình bày gọn gàng hơn ở phần tự luận.",
    "Nắm chắc kiến thức, kĩ năng theo yêu cầu cần đạt. Có ý thức trách nhiệm, hỗ trợ bạn bè trong học tập. Chúc em tiếp tục phát huy và đạt kết quả cao hơn.",
    "Chủ động, tự tin, có khả năng tự học và tự nghiên cứu tốt. Bài kiểm tra cuối kì đạt điểm cao. Nên dành thời gian luyện các dạng bài vận dụng cao để phát triển hơn nữa.",
  ],
  Khá: [
    "Nắm được kiến thức cơ bản, làm tốt các bài ở mức thông hiểu. Đôi khi còn sai sót do tính toán vội. Cần kiểm tra lại bài trước khi nộp để đạt kết quả tốt hơn.",
    "Có ý thức học tập, tham gia xây dựng bài khá tích cực. Kĩ năng vận dụng còn chưa thật vững. Nên luyện thêm các bài tập vận dụng sau mỗi chủ đề.",
    "Hoàn thành đầy đủ nhiệm vụ học tập, kết quả kiểm tra khá ổn định. Cần mạnh dạn hơn khi trình bày ý kiến trước lớp. Cô tin em sẽ tiến bộ ở học kỳ II.",
    "Tiếp thu bài tương đối nhanh, biết hợp tác tốt với bạn trong nhóm. Phần trình bày lời giải còn thiếu bước. Hãy chú ý viết đầy đủ lập luận để không bị mất điểm.",
    "Chăm chỉ, đi học đều, làm bài về nhà đầy đủ. Kết quả có tiến bộ so với giữa kì. Cần ôn tập thường xuyên hơn để ghi nhớ kiến thức lâu dài.",
    "Hiểu bài và làm tốt các bài tập cơ bản. Còn lúng túng với dạng bài tổng hợp. Nên trao đổi với thầy cô và bạn bè khi gặp khó khăn để kịp thời khắc phục.",
    "Có cố gắng trong học tập, tích cực tham gia hoạt động nhóm. Đôi khi chưa tập trung trong giờ học. Cần duy trì sự chú ý để tiếp thu bài trọn vẹn hơn.",
    "Nắm kiến thức khá chắc, kĩ năng thực hành tốt. Tốc độ làm bài còn chậm ở bài kiểm tra định kì. Nên luyện đề có tính giờ để cải thiện.",
    "Ý thức học tập tốt, biết tự giác ôn bài. Một số nội dung khó chưa vận dụng được. Hãy dành thêm thời gian làm lại các bài đã sai để rút kinh nghiệm.",
    "Tham gia học tập nghiêm túc, kết quả đạt mức khá. Cần chủ động đặt câu hỏi khi chưa hiểu bài. Với sự cố gắng hơn nữa, em hoàn toàn có thể đạt mức tốt.",
  ],
  Đạt: [
    "Nắm được kiến thức cơ bản theo yêu cầu cần đạt nhưng còn chưa chắc. Cần ôn lại bài sau mỗi buổi học và làm thêm bài tập cơ bản để củng cố.",
    "Có cố gắng trong học tập, hoàn thành phần lớn nhiệm vụ được giao. Kĩ năng vận dụng còn hạn chế. Nên tham gia buổi phụ đạo và hỏi thầy cô khi chưa hiểu.",
    "Đi học đầy đủ, có ý thức chấp hành nề nếp. Kết quả kiểm tra chưa ổn định. Cần lập thời gian biểu tự học hợp lí và kiên trì thực hiện.",
    "Hiểu được nội dung chính của bài nhưng còn nhầm lẫn ở một số bước. Hãy ghi chép cẩn thận và xem lại lỗi sai trong các bài đã chấm để tránh lặp lại.",
    "Bước đầu biết vận dụng kiến thức vào bài tập đơn giản. Đôi khi chưa hoàn thành bài về nhà. Cần chủ động hơn trong học tập để theo kịp các bạn.",
    "Có tiến bộ so với đầu năm, đã mạnh dạn hơn khi phát biểu. Kiến thức nền còn một số lỗ hổng. Nên luyện tập theo lộ trình được giao trên hệ thống học tập.",
    "Tham gia hoạt động nhóm tích cực nhưng chưa tự lực khi làm bài cá nhân. Cần tự giải lại các bài mẫu để rèn kĩ năng và sự tự tin.",
    "Nắm được kiến thức ở mức nhận biết, còn khó khăn ở mức thông hiểu. Hãy học chắc các khái niệm, công thức trước khi chuyển sang bài tập khó hơn.",
    "Có ý thức học tập nhưng thời gian tự học còn ít. Kết quả đạt yêu cầu tối thiểu. Cần dành thêm thời gian ôn bài đều đặn mỗi ngày.",
    "Chăm chỉ nhưng còn chậm khi làm bài, dễ bỏ dở giữa chừng. Nên chia nhỏ bài tập, hoàn thành từng bước và hỏi ngay khi vướng mắc.",
  ],
  "Chưa đạt": [
    "Chưa nắm vững kiến thức cơ bản của học kỳ, kết quả kiểm tra còn thấp. Cần tham gia đầy đủ các buổi phụ đạo và ôn lại kiến thức nền với sự hướng dẫn của giáo viên.",
    "Còn thiếu tập trung trong giờ học, chưa hoàn thành nhiều bài tập được giao. Cần thay đổi thái độ học tập, ghi chép bài đầy đủ và làm bài về nhà đều đặn.",
    "Kiến thức nền còn nhiều lỗ hổng nên khó tiếp thu bài mới. Thầy cô sẽ giao bài luyện tập từ mức cơ bản; em cần kiên trì làm hằng ngày để tiến bộ dần.",
    "Chưa có thói quen tự học, thường xuyên quên làm bài. Gia đình và nhà trường cần phối hợp nhắc nhở. Em hãy đặt mục tiêu nhỏ cho từng tuần và cố gắng hoàn thành.",
    "Đi học chưa đều nên bị hổng kiến thức. Cần chép lại bài đã nghỉ, hỏi bạn và thầy cô những phần chưa hiểu để kịp tiến độ của lớp.",
    "Còn rụt rè, chưa mạnh dạn hỏi khi không hiểu bài. Hãy chủ động trao đổi với giáo viên; thầy cô luôn sẵn sàng hỗ trợ em trong học kỳ II.",
    "Kết quả chưa đạt yêu cầu nhưng đã có cố gắng ở cuối học kỳ. Cần duy trì sự cố gắng đó, tham gia học phụ đạo và làm đủ bài ôn tập được giao.",
    "Thường mắc lỗi ở những nội dung cơ bản. Cần học lại khái niệm, làm lại các bài mẫu và nhờ bạn kèm cặp trong nhóm học tập.",
    "Chưa hoàn thành các nhiệm vụ học tập tối thiểu. Em cần nghiêm túc hơn, sắp xếp thời gian học hợp lí và thực hiện theo kế hoạch hỗ trợ của giáo viên.",
    "Thời gian sử dụng điện thoại nhiều làm ảnh hưởng đến việc học. Cần điều chỉnh sinh hoạt, ngủ đúng giờ và dành ít nhất một giờ tự học mỗi tối.",
  ],
};
