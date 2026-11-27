// Ngân hàng câu hỏi đại học (grade 14 = năm 2, lớp KTPM K23, khoa CNTT) cho bản demo. Dữ liệu tĩnh, không gọi AI.
import type { DTopic } from "./types";

export const BANK_DH: DTopic[] = [
  // ---------- Lập trình (Cấu trúc dữ liệu và giải thuật – TS. Đặng Văn Khải) ----------
  {
    subject: "Lập trình", grade: 14, topic: "Danh sách liên kết", week: 3,
    yccd: "Cài đặt được danh sách liên kết đơn với các thao tác chèn, xoá, duyệt; so sánh được độ phức tạp với mảng.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Trong danh sách liên kết đơn, mỗi nút gồm", options: ["dữ liệu và chỉ số của phần tử trong mảng", "dữ liệu và con trỏ tới nút kế tiếp", "chỉ một con trỏ tới nút đầu danh sách", "dữ liệu và con trỏ tới nút cha"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Độ phức tạp thời gian để truy cập phần tử thứ k (k bất kì) trong danh sách liên kết đơn có n nút là", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 2, explanation: "Phải duyệt tuần tự từ head, không truy cập ngẫu nhiên như mảng." },
      { t: "mcq", lv: "NB", stem: "Chèn một nút mới vào đầu danh sách liên kết đơn (đã biết con trỏ head) có độ phức tạp", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], answer: 3, explanation: "Chỉ cần gán new.next = head rồi head = new." },
      { t: "short", lv: "TH", stem: "Cho danh sách liên kết đơn head → 3 → 7 → 1 → 9 → null. Thực hiện lần lượt: chèn 5 vào đầu danh sách, xoá nút có giá trị 1, chèn 4 vào cuối danh sách. Giá trị của nút thứ ba (tính từ head) là bao nhiêu?", answer: "7", explanation: "Danh sách cuối cùng: 5 → 3 → 7 → 9 → 4." },
      { t: "essay", lv: "VD", stem: "Viết hàm (Python hoặc C++) đảo ngược một danh sách liên kết đơn tại chỗ và trả về head mới. Nêu độ phức tạp thời gian và bộ nhớ phụ.", rubric: "Dùng ba con trỏ prev, cur, next đảo đúng liên kết từng nút (1đ); xử lí đúng danh sách rỗng hoặc một nút và trả về head mới (0,5đ); nêu đúng độ phức tạp O(n) thời gian, O(1) bộ nhớ phụ (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Lập trình", grade: 14, topic: "Cây nhị phân tìm kiếm", week: 6,
    yccd: "Trình bày được tính chất cây nhị phân tìm kiếm; thực hiện được các thao tác tìm kiếm, chèn, xoá, duyệt và đánh giá độ phức tạp.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Duyệt trung thứ tự (inorder) một cây nhị phân tìm kiếm cho dãy khoá", options: ["giảm dần", "theo từng mức", "tăng dần", "ngẫu nhiên"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Trong cây nhị phân tìm kiếm, khoá nhỏ nhất nằm ở", options: ["nút trái cùng (đi theo nhánh trái đến hết)", "nút gốc", "nút phải cùng", "một lá bất kì"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Chèn lần lượt các khoá 50, 30, 70, 20, 40, 60, 80 vào cây nhị phân tìm kiếm rỗng, rồi xoá nút gốc 50 bằng cách thay bằng nút kế tiếp theo thứ tự trung thứ tự (successor). Nút gốc mới là", options: ["40", "70", "80", "60"], answer: 3, explanation: "Successor của 50 là nút nhỏ nhất trong cây con phải: 60." },
      { t: "short", lv: "TH", stem: "Chèn lần lượt các khoá 8, 3, 10, 1, 6, 14, 4, 7, 13 vào cây nhị phân tìm kiếm rỗng. Chiều cao của cây (số cạnh trên đường đi dài nhất từ gốc đến lá) là bao nhiêu?", answer: "3", explanation: "Hai đường dài nhất 8 → 3 → 6 → 4 và 8 → 10 → 14 → 13 đều có 3 cạnh." },
      { t: "essay", lv: "VD", stem: "Viết hàm kiểm tra một cây nhị phân có phải cây nhị phân tìm kiếm hay không (các khoá đôi một khác nhau) và phân tích độ phức tạp. Giải thích vì sao chỉ so sánh mỗi nút với hai con trực tiếp là chưa đủ.", rubric: "Thuật toán đúng: truyền khoảng (min, max) khi đệ quy hoặc kiểm tra dãy duyệt trung thứ tự tăng dần (1đ); chỉ ra phản ví dụ cho cách chỉ so sánh với con trực tiếp (0,5đ); nêu đúng độ phức tạp O(n) thời gian, O(h) bộ nhớ ngăn xếp (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Lập trình", grade: 14, topic: "Đồ thị BFS/DFS", week: 10,
    yccd: "Biểu diễn được đồ thị bằng danh sách kề, ma trận kề; cài đặt được BFS, DFS và vận dụng tìm đường đi ít cạnh nhất trên đồ thị không trọng số.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Thuật toán BFS dùng cấu trúc dữ liệu phụ nào để quản lí các đỉnh chờ duyệt?", options: ["Ngăn xếp", "Hàng đợi", "Heap", "Bảng băm"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Độ phức tạp thời gian của BFS trên đồ thị V đỉnh, E cạnh biểu diễn bằng danh sách kề là", options: ["O(V²)", "O(E log V)", "O(V · E)", "O(V + E)"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Cho đồ thị vô hướng có các cạnh 1–2, 1–3, 2–4, 3–4, 4–5. Duyệt DFS từ đỉnh 1, ưu tiên đỉnh kề có số nhỏ hơn. Thứ tự thăm các đỉnh là", options: ["1, 2, 4, 3, 5", "1, 2, 3, 4, 5", "1, 3, 4, 2, 5", "1, 2, 4, 5, 3"], answer: 0, explanation: "1 → 2 → 4 → 3 (đỉnh kề nhỏ nhất chưa thăm của 4), quay lui về 4 → 5. Dãy 1, 2, 3, 4, 5 là thứ tự BFS." },
      { t: "short", lv: "TH", stem: "Cho đồ thị vô hướng có các cạnh A–B, A–C, B–D, C–D, D–E, C–F, F–E. Dùng BFS từ A, độ dài (số cạnh) đường đi ngắn nhất từ A đến E là bao nhiêu?", answer: "3", explanation: "Lớp 1: B, C; lớp 2: D, F; lớp 3: E." },
      { t: "essay", lv: "VD", stem: "Một mê cung kích thước m × n gồm ô trống (.) và tường (#). Trình bày ý tưởng và mã giả dùng BFS tìm số bước ít nhất để đi từ ô S đến ô T (mỗi bước sang một ô kề chung cạnh). Vì sao không dùng DFS cho bài toán này?", rubric: "Mô hình hoá mỗi ô trống là một đỉnh, nối các ô trống kề cạnh (0,5đ); mã giả BFS đúng: hàng đợi, mảng khoảng cách hoặc đánh dấu đã thăm, dừng khi lấy ra T (0,75đ); nêu độ phức tạp O(m · n) (0,25đ); giải thích BFS duyệt theo lớp nên lần đầu tới T là ngắn nhất, DFS không đảm bảo điều này (0,5đ).", points: 2 },
    ],
  },
  // ---------- Xác suất thống kê ----------
  {
    subject: "Xác suất thống kê", grade: 14, topic: "Biến cố và xác suất có điều kiện", week: 3,
    yccd: "Tính được xác suất theo định nghĩa cổ điển, công thức cộng, nhân; áp dụng được công thức xác suất có điều kiện, xác suất toàn phần và Bayes.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Với hai biến cố A, B và P(B) > 0, xác suất có điều kiện P(A | B) bằng", options: ["P(A) · P(B)", "P(AB)/P(A)", "P(AB)/P(B)", "P(A) + P(B)"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Hai biến cố A và B độc lập khi và chỉ khi", options: ["P(AB) = P(A) · P(B)", "P(A) + P(B) = 1", "P(AB) = 0", "P(A) = P(B)"], answer: 0, explanation: "P(AB) = 0 là điều kiện của hai biến cố xung khắc, không phải độc lập." },
      { t: "mcq", lv: "TH", stem: "Gieo hai con xúc xắc cân đối. Biết tổng số chấm bằng 8, xác suất để có ít nhất một con ra mặt 6 chấm là", options: ["1/3", "2/5", "1/6", "5/36"], answer: 1, explanation: "Tổng bằng 8 có 5 kết quả (2,6), (3,5), (4,4), (5,3), (6,2); trong đó 2 kết quả có mặt 6." },
      { t: "short", lv: "VD", stem: "Một nhà máy có hai dây chuyền: dây chuyền I làm ra 60% sản phẩm với tỉ lệ phế phẩm 2%, dây chuyền II làm ra 40% sản phẩm với tỉ lệ phế phẩm 5%. Lấy ngẫu nhiên một sản phẩm thì thấy là phế phẩm. Tính xác suất sản phẩm đó do dây chuyền II làm ra (viết dạng số thập phân).", answer: "0,625|5/8", explanation: "P = 0,4 · 0,05 : (0,6 · 0,02 + 0,4 · 0,05) = 0,02 : 0,032 = 0,625." },
      { t: "essay", lv: "VD", stem: "Một xét nghiệm nhanh có độ nhạy 95% (người mắc bệnh cho kết quả dương tính) và độ đặc hiệu 90% (người không mắc bệnh cho kết quả âm tính). Tỉ lệ mắc bệnh trong cộng đồng là 2%. a) Tính xác suất một người được xét nghiệm có kết quả dương tính. b) Tính xác suất một người có kết quả dương tính thật sự mắc bệnh và nhận xét.", rubric: "a) Đặt đúng các biến cố và áp dụng công thức xác suất toàn phần (0,5đ); tính đúng P(+) = 0,02 · 0,95 + 0,98 · 0,1 = 0,117 (0,5đ). b) Áp dụng đúng công thức Bayes (0,5đ); tính được 0,019 : 0,117 ≈ 0,162 và nhận xét xác suất thấp do bệnh hiếm, cần xét nghiệm khẳng định (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Xác suất thống kê", grade: 14, topic: "Biến ngẫu nhiên rời rạc", week: 6,
    yccd: "Lập được bảng phân phối xác suất của biến ngẫu nhiên rời rạc; tính được kỳ vọng, phương sai, độ lệch chuẩn và giải thích ý nghĩa.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Kỳ vọng của biến ngẫu nhiên rời rạc X nhận các giá trị xᵢ với xác suất pᵢ là", options: ["E(X) = Σ xᵢ", "E(X) = Σ pᵢ", "E(X) = Σ xᵢ² · pᵢ", "E(X) = Σ xᵢ · pᵢ"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Phương sai của X được tính theo công thức", options: ["V(X) = E(X²) − [E(X)]²", "V(X) = E(X) − E(X²)", "V(X) = [E(X)]²", "V(X) = E(X²) + [E(X)]²"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Biến ngẫu nhiên X nhận các giá trị 0, 1, 2 với xác suất lần lượt 0,2; 0,5; 0,3. Kỳ vọng E(X) bằng", options: ["1", "1,1", "1,5", "0,8"], answer: 1, explanation: "E(X) = 0 · 0,2 + 1 · 0,5 + 2 · 0,3 = 1,1." },
      { t: "short", lv: "TH", stem: "Biến ngẫu nhiên X nhận các giá trị 0, 1, 2 với xác suất lần lượt 0,2; 0,5; 0,3. Tính phương sai V(X).", answer: "0,49", explanation: "E(X²) = 0,5 + 4 · 0,3 = 1,7; V(X) = 1,7 − 1,1² = 0,49." },
      { t: "essay", lv: "VD", stem: "Một trò chơi ở hội chợ: người chơi trả 10 nghìn đồng để rút ngẫu nhiên một thẻ từ hộp có 10 thẻ, trong đó 1 thẻ thưởng 50 nghìn đồng, 2 thẻ thưởng 20 nghìn đồng, các thẻ còn lại không thưởng. Gọi X là số tiền lãi (nghìn đồng) của người chơi sau một lượt. a) Lập bảng phân phối của X. b) Tính E(X) và cho biết về lâu dài người chơi lãi hay lỗ.", rubric: "a) Xác định đúng các giá trị 40; 10; −10 (0,5đ) với xác suất tương ứng 0,1; 0,2; 0,7 (0,5đ). b) Tính đúng E(X) = 4 + 2 − 7 = −1 (0,5đ); kết luận về lâu dài người chơi lỗ trung bình 1 nghìn đồng mỗi lượt (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Xác suất thống kê", grade: 14, topic: "Phân phối nhị thức và phân phối chuẩn", week: 10,
    yccd: "Nhận biết được phân phối nhị thức, phân phối chuẩn; tính được xác suất, kỳ vọng, phương sai và sử dụng được bảng phân phối chuẩn tắc.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Nếu X ~ B(n, p) thì kỳ vọng và phương sai của X lần lượt là", options: ["np và np²", "p và p(1 − p)", "np và np(1 − p)", "n(1 − p) và np"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Với X ~ N(μ, σ²), biến chuẩn hoá Z bằng", options: ["(X − σ)/μ", "(X − μ)/σ", "(X − μ)/σ²", "(X + μ)/σ"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Một sinh viên chọn ngẫu nhiên đáp án cho 5 câu trắc nghiệm, mỗi câu có 4 phương án và chỉ 1 phương án đúng. Xác suất sinh viên đó trả lời đúng đúng 2 câu là", options: ["10 · (0,25)² · (0,75)³", "(0,25)² · (0,75)³", "5 · (0,25)² · (0,75)³", "10 · (0,25)³ · (0,75)²"], answer: 0, explanation: "P(X = 2) = C(5, 2) · p² · (1 − p)³ với p = 0,25 và C(5, 2) = 10." },
      { t: "short", lv: "TH", stem: "Chiều cao nam sinh viên của một trường có phân phối chuẩn với trung bình 168 cm, độ lệch chuẩn 6 cm. Giá trị chuẩn hoá z ứng với chiều cao 177 cm là bao nhiêu?", answer: "1,5", explanation: "z = (177 − 168) : 6 = 1,5." },
      { t: "essay", lv: "VD", stem: "Điểm thi cuối kỳ môn Xác suất thống kê của sinh viên K23 có phân phối xấp xỉ chuẩn N(6,5; 1,5²). a) Tính tỉ lệ sinh viên đạt từ 8 điểm trở lên. b) Khoa muốn khen thưởng 5% sinh viên có điểm cao nhất. Điểm tối thiểu để được khen thưởng là bao nhiêu? (Cho Φ(1) ≈ 0,8413; Φ(1,645) ≈ 0,95.)", rubric: "a) Chuẩn hoá đúng z = (8 − 6,5) : 1,5 = 1 (0,5đ); tính đúng P = 1 − 0,8413 = 0,1587, tức khoảng 15,9% (0,5đ). b) Lập được x = μ + 1,645σ (0,5đ); tính đúng x ≈ 8,97 điểm (0,5đ).", points: 2 },
    ],
  },
  // ---------- Cơ sở dữ liệu ----------
  {
    subject: "Cơ sở dữ liệu", grade: 14, topic: "Mô hình quan hệ và khoá", week: 2,
    yccd: "Trình bày được các khái niệm quan hệ, thuộc tính, bộ, lược đồ; xác định được siêu khoá, khoá ứng viên, khoá chính, khoá ngoại.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Trong mô hình quan hệ, mỗi dòng của một bảng (quan hệ) được gọi là", options: ["thuộc tính", "bộ (tuple)", "miền giá trị", "lược đồ"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Khoá ngoại (foreign key) của quan hệ R là tập thuộc tính", options: ["luôn có giá trị duy nhất trong R", "là khoá chính thứ hai của R", "không bao giờ được nhận giá trị NULL", "tham chiếu tới khoá chính của một quan hệ khác (hoặc của chính R)"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Cho lược đồ SinhVien(MaSV, CCCD, HoTen, NgaySinh, MaLop), trong đó MaSV và CCCD đều xác định duy nhất mỗi sinh viên. Phát biểu nào đúng?", options: ["{MaSV, HoTen} là khoá ứng viên", "Chỉ MaSV là khoá ứng viên", "MaSV và CCCD đều là khoá ứng viên; {MaSV, HoTen} là siêu khoá", "HoTen là khoá chính"], answer: 2, explanation: "{MaSV, HoTen} chứa MaSV nên là siêu khoá nhưng không tối tiểu nên không là khoá ứng viên." },
      { t: "short", lv: "TH", stem: "Quan hệ R(A, B, C) có khoá ứng viên duy nhất là {A}. R có bao nhiêu siêu khoá?", answer: "4", explanation: "Mọi tập thuộc tính chứa A: {A}, {A, B}, {A, C}, {A, B, C}." },
      { t: "essay", lv: "VD", stem: "Thiết kế lược đồ quan hệ cho hệ thống quản lí đăng kí học phần gồm: sinh viên, giảng viên, học phần, lớp học phần (mỗi lớp thuộc một học phần, một học kỳ, do một giảng viên dạy) và việc sinh viên đăng kí lớp học phần (có điểm). Xác định khoá chính và khoá ngoại của từng quan hệ.", rubric: "Xác định đủ các quan hệ SinhVien, GiangVien, HocPhan, LopHocPhan, DangKy với thuộc tính hợp lí (0,75đ); chỉ đúng khoá chính mỗi quan hệ, trong đó DangKy có khoá (MaSV, MaLHP) (0,75đ); chỉ đúng các khoá ngoại tham chiếu (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Cơ sở dữ liệu", grade: 14, topic: "Truy vấn SQL: SELECT, JOIN, GROUP BY", week: 6,
    yccd: "Viết được câu truy vấn SQL dùng SELECT, WHERE, JOIN, GROUP BY, HAVING, ORDER BY để khai thác dữ liệu.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Mệnh đề nào dùng để lọc các nhóm sau khi gom nhóm bằng GROUP BY?", options: ["HAVING", "WHERE", "ORDER BY", "DISTINCT"], answer: 0, explanation: "WHERE lọc từng dòng trước khi gom nhóm; HAVING lọc nhóm sau khi gom." },
      { t: "mcq", lv: "NB", stem: "Phép INNER JOIN giữa hai bảng trả về", options: ["mọi dòng của bảng bên trái", "tích Đề-các của hai bảng", "các cặp dòng thoả điều kiện nối ở cả hai bảng", "mọi dòng của cả hai bảng, kể cả dòng không khớp"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Cho bảng DiemThi(MaSV, MaHP, Diem). Câu lệnh nào cho biết điểm trung bình của từng sinh viên, chỉ lấy sinh viên có điểm trung bình từ 8 trở lên?", options: ["SELECT MaSV, AVG(Diem) FROM DiemThi WHERE AVG(Diem) >= 8 GROUP BY MaSV;", "SELECT MaSV, AVG(Diem) FROM DiemThi GROUP BY MaHP HAVING AVG(Diem) >= 8;", "SELECT MaSV, Diem FROM DiemThi WHERE Diem >= 8;", "SELECT MaSV, AVG(Diem) FROM DiemThi GROUP BY MaSV HAVING AVG(Diem) >= 8;"], answer: 3, explanation: "Không dùng hàm gộp trong WHERE; phải gom nhóm theo MaSV rồi lọc bằng HAVING." },
      { t: "short", lv: "TH", stem: "Bảng DiemThi có 6 dòng: (SV1, CSDL, 8), (SV1, XSTK, 6), (SV2, CSDL, 9), (SV2, XSTK, 7), (SV3, CSDL, 5), (SV3, XSTK, 8). Câu lệnh SELECT COUNT(*) FROM (SELECT MaSV FROM DiemThi GROUP BY MaSV HAVING AVG(Diem) >= 7) AS t; trả về giá trị bao nhiêu?", answer: "2", explanation: "Điểm trung bình: SV1 = 7, SV2 = 8, SV3 = 6,5; chỉ SV1 và SV2 thoả." },
      { t: "essay", lv: "VD", stem: "Cho các bảng SinhVien(MaSV, HoTen, MaLop), Lop(MaLop, TenLop) và DiemThi(MaSV, MaHP, Diem). Viết câu lệnh SQL liệt kê tên từng lớp cùng số sinh viên đạt điểm học phần 'CSDL' từ 5 trở lên, sắp xếp giảm dần theo số sinh viên.", rubric: "Nối đúng ba bảng bằng JOIN theo khoá MaLop, MaSV (0,75đ); lọc đúng bằng WHERE MaHP = 'CSDL' AND Diem >= 5 (0,5đ); GROUP BY theo lớp và dùng COUNT đúng (0,5đ); ORDER BY số sinh viên giảm dần (0,25đ).", points: 2 },
    ],
  },
  {
    subject: "Cơ sở dữ liệu", grade: 14, topic: "Chuẩn hoá cơ sở dữ liệu (1NF–3NF)", week: 11,
    yccd: "Xác định được phụ thuộc hàm, bao đóng, khoá của lược đồ; kiểm tra và chuẩn hoá được lược đồ quan hệ về dạng 1NF, 2NF, 3NF.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Một quan hệ ở dạng chuẩn 1NF khi", options: ["không có phụ thuộc bắc cầu", "mọi thuộc tính đều chỉ chứa giá trị nguyên tố (không đa trị, không lặp nhóm)", "mọi thuộc tính không khoá phụ thuộc đầy đủ vào khoá", "chỉ có một khoá ứng viên"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Một quan hệ ở dạng chuẩn 2NF nếu nó ở 1NF và", options: ["không có thuộc tính nào nhận giá trị NULL", "mọi phụ thuộc hàm đều có vế trái là siêu khoá", "không có phụ thuộc bắc cầu vào khoá", "mọi thuộc tính không khoá phụ thuộc đầy đủ vào mọi khoá ứng viên"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Cho R(MaSV, MaHP, TenSV, Diem) với các phụ thuộc hàm MaSV → TenSV và (MaSV, MaHP) → Diem. Dạng chuẩn cao nhất của R là", options: ["1NF", "2NF", "3NF", "BCNF"], answer: 0, explanation: "Khoá là (MaSV, MaHP); TenSV phụ thuộc bộ phận vào MaSV nên R chưa đạt 2NF." },
      { t: "short", lv: "TH", stem: "Cho R(A, B, C, D) với tập phụ thuộc hàm F = {A → B, B → C, C → D}. Bao đóng {B}⁺ gồm bao nhiêu thuộc tính?", answer: "3", explanation: "{B}⁺ = {B, C, D}." },
      { t: "essay", lv: "VD", stem: "Cho lược đồ NhanVien(MaNV, HoTen, MaPhong, TenPhong, DiaDiemPhong) với các phụ thuộc hàm MaNV → HoTen, MaPhong và MaPhong → TenPhong, DiaDiemPhong. a) Xác định khoá và dạng chuẩn cao nhất của lược đồ. b) Chuẩn hoá về 3NF, nêu rõ các lược đồ thu được và khoá của chúng.", rubric: "a) Xác định đúng khoá MaNV (0,25đ); lập luận đạt 2NF vì khoá chỉ gồm một thuộc tính, chưa đạt 3NF do phụ thuộc bắc cầu MaNV → MaPhong → TenPhong, DiaDiemPhong (0,75đ). b) Tách đúng thành NhanVien(MaNV, HoTen, MaPhong) và Phong(MaPhong, TenPhong, DiaDiemPhong) (0,5đ); chỉ đúng khoá chính, khoá ngoại MaPhong và nêu phép tách bảo toàn phụ thuộc, không mất thông tin (0,5đ).", points: 2 },
    ],
  },
];
