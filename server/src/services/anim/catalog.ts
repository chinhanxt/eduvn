/** Danh mục mẫu hoạt hình: mô tả cho AI + bộ lọc sơ bộ tất định (môn, lớp, từ khoá) để chỉ gửi ~6 mẫu hợp nhất cho AI. */
import type { TemplateName } from "./spec";
import { TEMPLATES } from "./spec";

export type CatalogEntry = {
  id: TemplateName;
  ten: string;
  engine: "manim" | "hyperframes";
  /** Khoá môn: toan, ly, hoa, sinh, van, su, dia, anh, tin, "*" = dùng chung. */
  monHoc: string[];
  /** Khoảng lớp (1–12 phổ thông, 13+ đại học). */
  lop: [number, number];
  dungKhi: string;
  khongDungKhi: string;
  /** Tóm tắt tham số cho AI (không gồm thoiLuong, tieuDe). */
  thamSo: string;
  /** Tham số ví dụ, phải qua được zod (có test). */
  viDu: Record<string, unknown>;
  /** Thời lượng điển hình (giây). */
  thoiLuong: [number, number];
  /** Từ khoá không dấu, chữ thường. */
  tuKhoa: string[];
};

const E = (id: TemplateName, o: Omit<CatalogEntry, "id" | "ten" | "engine">): CatalogEntry => ({ id, ten: TEMPLATES[id].ten, engine: TEMPLATES[id].engine, ...o });

export const CATALOG: CatalogEntry[] = [
  E("do_thi_ham_so", { monHoc: ["toan"], lop: [7, 13], dungKhi: "Cảnh nói về đồ thị hàm số, parabol, đường thẳng, sự thay đổi khi đổi hệ số.", khongDungKhi: "Cảnh chỉ nói định nghĩa hoặc giải phương trình bằng đại số thuần.", thamSo: 'bieuThuc:"biểu thức theo x (và a)" (+ - * / ^ ( ) sin cos tan sqrt abs ln log exp pi e), thamSo?:{tu,den}, xMin,xMax,yMin,yMax, diemDacBiet?:[{x,nhan?}]≤5', viDu: { bieuThuc: "a*x^2", thamSo: { tu: 1, den: 3 }, xMin: -4, xMax: 4, yMin: -2, yMax: 8, diemDacBiet: [{ x: 0, nhan: "Đỉnh O" }] }, thoiLuong: [6, 12], tuKhoa: ["do thi", "ham so", "parabol", "y =", "he so", "dinh", "truc toa do", "bac hai", "bac nhat"] }),
  E("bien_doi_cong_thuc", { monHoc: ["toan", "ly", "hoa"], lop: [7, 13], dungKhi: "Cảnh biến đổi, khai triển, rút gọn công thức qua nhiều bước nối tiếp.", khongDungKhi: "Cảnh không có biểu thức cần biến đổi từng bước.", thamSo: 'cacBuoc:[{latex:"LaTeX ASCII, không tiếng Việt",ghiChu?:"giải thích ngắn tiếng Việt"}] 2–6, toMau?:["số hạng cần tô màu"]≤4', viDu: { cacBuoc: [{ latex: "(a+b)^2" }, { latex: "a^2+2ab+b^2", ghiChu: "Khai triển" }], toMau: ["2ab"] }, thoiLuong: [6, 12], tuKhoa: ["bien doi", "khai trien", "rut gon", "hang dang thuc", "phan tich", "cong thuc", "thu gon", "nhan"] }),
  E("hinh_hoc_dien_tich", { monHoc: ["toan"], lop: [6, 9], dungKhi: "Chỉ khi cảnh minh hoạ hằng đẳng thức (a+b)² bằng diện tích hình vuông chia ô.", khongDungKhi: "Mọi hằng đẳng thức khác, hoặc hình học không phải diện tích hình vuông.", thamSo: "a:0.5–5, b:0.5–5", viDu: { a: 2, b: 1 }, thoiLuong: [8, 12], tuKhoa: ["binh phuong cua mot tong", "(a+b)^2", "(a + b)^2", "hinh vuong", "dien tich", "hang dang thuc dang nho"] }),
  E("truc_so", { monHoc: ["toan"], lop: [1, 8], dungKhi: "Cảnh về số nguyên, cộng/trừ số, so sánh số, khoảng cách, giá trị tuyệt đối trên trục số.", khongDungKhi: "Cảnh không có phép tính hoặc so sánh trên đường thẳng số.", thamSo: "khoang:{min,max} nguyên, dài ≤24, cacDiem?:[{giaTri,nhan?}]≤6, cacBuocNhay?:[{tu,den,nhan?}]≤4", viDu: { khoang: { min: -5, max: 5 }, cacDiem: [{ giaTri: 2 }], cacBuocNhay: [{ tu: 2, den: -1, nhan: "-3" }] }, thoiLuong: [5, 10], tuKhoa: ["truc so", "so nguyen", "so am", "cong so", "tru so", "so sanh", "tri tuyet doi", "khoang cach"] }),
  E("vong_tron_luong_giac", { monHoc: ["toan"], lop: [9, 12], dungKhi: "Cảnh giới thiệu sin, cos, tan của một góc, góc đặc biệt, đơn vị radian.", khongDungKhi: "Cảnh về đồ thị hàm lượng giác hoặc phương trình lượng giác đại số.", thamSo: 'gocDo:0–360, hienThi:["sin","cos","tan"], gocDacBiet:true|false', viDu: { gocDo: 60, hienThi: ["sin", "cos"], gocDacBiet: true }, thoiLuong: [8, 14], tuKhoa: ["luong giac", "vong tron luong giac", "sin", "cos", "tan", "goc", "radian", "goc dac biet", "gia tri luong giac"] }),
  E("do_thi_luong_giac", { monHoc: ["toan", "ly"], lop: [10, 12], dungKhi: "Cảnh về đồ thị sin/cos/tan, biên độ, chu kỳ, pha ban đầu, hoặc trải đồ thị từ vòng tròn.", khongDungKhi: "Cảnh chỉ tính giá trị lượng giác của một góc.", thamSo: 'ham:"sin"|"cos"|"tan", bienDo:0.5–3, chuKy:0.5–3 (bội của chu kỳ chuẩn), phaDauDo:-180–180, tuVongTron?:true (chỉ sin)', viDu: { ham: "sin", bienDo: 2, chuKy: 1, phaDauDo: 0, tuVongTron: false }, thoiLuong: [8, 14], tuKhoa: ["do thi", "ham so luong giac", "bien do", "chu ky", "pha", "sin", "cos", "tan", "tuan hoan"] }),
  E("vecto", { monHoc: ["toan", "ly"], lop: [10, 12], dungKhi: "Cảnh về vectơ: tổng theo quy tắc tam giác/hình bình hành, nhân vectơ với số, toạ độ, tích vô hướng và hình chiếu.", khongDungKhi: "Cảnh không có vectơ.", thamSo: 'loai:"tong_tam_giac"|"tong_hbh"|"nhan_so"|"thanh_phan"|"hinh_chieu", a:[x,y] (|x|≤5,|y|≤3.5), b:[x,y], k:-3–3 (nhan_so); tổng phải nằm trong |x|≤6,|y|≤4', viDu: { loai: "tong_tam_giac", a: [3, 1], b: [1, 2] }, thoiLuong: [8, 14], tuKhoa: ["vecto", "vec to", "tong hai vecto", "quy tac", "hinh binh hanh", "tich vo huong", "hinh chieu", "toa do", "luc"] }),
  E("hinh_khong_gian_xoay", { monHoc: ["toan"], lop: [8, 12], dungKhi: "Cảnh giới thiệu hình khối: hình lập phương, hộp chữ nhật, chóp, lăng trụ, nón, trụ, cầu; đỉnh, chiều cao.", khongDungKhi: "Cảnh hình phẳng hoặc chứng minh hình học không cần xem khối.", thamSo: 'hinh:"cube"|"cuboid"|"pyramid"|"prism"|"cone"|"cylinder"|"sphere", kichThuoc?:{a,b,c} 0.5–4 (c = chiều cao), nhanDinh?:true, chieuCao?:true', viDu: { hinh: "pyramid", kichThuoc: { a: 2, b: 2, c: 2.4 }, nhanDinh: true, chieuCao: true }, thoiLuong: [8, 14], tuKhoa: ["hinh khong gian", "hinh chop", "lang tru", "hinh lap phuong", "hinh hop", "hinh non", "hinh tru", "hinh cau", "the tich", "chieu cao", "dinh"] }),
  E("dao_ham_tiep_tuyen", { monHoc: ["toan"], lop: [11, 13], dungKhi: "Cảnh định nghĩa đạo hàm bằng giới hạn của cát tuyến, ý nghĩa hình học (hệ số góc tiếp tuyến).", khongDungKhi: "Cảnh chỉ áp dụng bảng đạo hàm, quy tắc tính.", thamSo: 'bieuThuc:"biểu thức theo x", x0:số, xMin,xMax,yMin,yMax', viDu: { bieuThuc: "x^2/2", x0: 1, xMin: -3, xMax: 4, yMin: -1, yMax: 6 }, thoiLuong: [10, 15], tuKhoa: ["dao ham", "tiep tuyen", "cat tuyen", "gioi han", "he so goc", "toc do tuc thoi", "bien thien"] }),
  E("tich_phan_dien_tich", { monHoc: ["toan"], lop: [12, 13], dungKhi: "Cảnh về tích phân xác định như diện tích dưới đường cong, tổng Riemann.", khongDungKhi: "Cảnh chỉ tính nguyên hàm/tích phân bằng bảng.", thamSo: 'bieuThuc:"biểu thức theo x", a, b (a<b), soHinh:8–60, xMin,xMax,yMin,yMax', viDu: { bieuThuc: "x^2", a: 0, b: 3, soHinh: 24, xMin: -1, xMax: 4, yMin: -1, yMax: 10 }, thoiLuong: [10, 15], tuKhoa: ["tich phan", "dien tich", "duoi duong cong", "riemann", "hinh chu nhat", "nguyen ham", "gioi han tong"] }),
  E("giao_diem_he_pt", { monHoc: ["toan"], lop: [8, 12], dungKhi: "Cảnh giải hệ phương trình/phương trình bằng đồ thị: giao điểm hai đường là nghiệm.", khongDungKhi: "Cảnh giải bằng đại số không cần đồ thị.", thamSo: 'f:"biểu thức theo x", g:"biểu thức theo x", xMin,xMax,yMin,yMax', viDu: { f: "x^2", g: "x+2", xMin: -3, xMax: 4, yMin: -2, yMax: 9 }, thoiLuong: [8, 12], tuKhoa: ["giao diem", "he phuong trinh", "nghiem", "hai do thi", "duong thang cat", "parabol cat", "phuong trinh hoanh do"] }),
  E("phep_bien_hinh", { monHoc: ["toan"], lop: [6, 11], dungKhi: "Cảnh về phép tịnh tiến, quay, đối xứng trục, vị tự của một đa giác.", khongDungKhi: "Cảnh hình học không có phép biến hình.", thamSo: 'phep:"tinh_tien"|"quay"|"doi_xung_truc"|"vi_tu", dinh:[[x,y],…] 3–5 đỉnh (|x|≤5,|y|≤3.5), tinhTien?:[dx,dy], gocDo?, tam?:[x,y], truc?:"Ox"|"Oy"|"y=x", k?', viDu: { phep: "quay", dinh: [[1, 1], [3, 1], [2, 3]], gocDo: 90, tam: [0, 0] }, thoiLuong: [8, 12], tuKhoa: ["phep bien hinh", "tinh tien", "phep quay", "doi xung", "vi tu", "anh cua", "hinh bang nhau"] }),
  E("day_so", { monHoc: ["toan"], lop: [9, 12], dungKhi: "Cảnh về cấp số cộng/cấp số nhân: các số hạng, công sai/công bội, tổng.", khongDungKhi: "Cảnh dãy số khác (giới hạn, truy hồi phức tạp).", thamSo: 'loai:"cap_so_cong"|"cap_so_nhan", u1, d (cấp số cộng) hoặc q (cấp số nhân), n:3–8', viDu: { loai: "cap_so_cong", u1: 2, d: 3, n: 6 }, thoiLuong: [8, 14], tuKhoa: ["day so", "cap so cong", "cap so nhan", "cong sai", "cong boi", "so hang", "tong n so hang"] }),
  E("dao_dong_dieu_hoa", { monHoc: ["ly"], lop: [11, 12], dungKhi: "Cảnh về dao động điều hoà của con lắc lò xo hoặc con lắc đơn, đồ thị li độ theo thời gian.", khongDungKhi: "Cảnh về sóng hoặc chuyển động thẳng.", thamSo: 'vat:"lo_xo"|"con_lac", bienDo:0.5–3, chuKy:1–4 (giây), soChuKy:1–4', viDu: { vat: "lo_xo", bienDo: 1.5, chuKy: 2, soChuKy: 2 }, thoiLuong: [8, 14], tuKhoa: ["dao dong", "dieu hoa", "con lac", "lo xo", "li do", "chu ky", "bien do", "tan so"] }),
  E("chuyen_dong_thang", { monHoc: ["ly"], lop: [8, 12], dungKhi: "Cảnh về chuyển động thẳng đều/biến đổi đều, đồ thị x–t và v–t.", khongDungKhi: "Cảnh chuyển động tròn, ném xiên, dao động.", thamSo: "x0 (m), v0 (m/s), a (m/s²), tMax:2–15 (giây)", viDu: { x0: 0, v0: 2, a: 1, tMax: 6 }, thoiLuong: [8, 14], tuKhoa: ["chuyen dong", "van toc", "gia toc", "quang duong", "thang deu", "bien doi deu", "do thi x-t", "do thi v-t", "vat chuyen dong"] }),
  E("song_co", { monHoc: ["ly"], lop: [11, 12], dungKhi: "Cảnh về sóng cơ: bước sóng, biên độ, sự truyền sóng.", khongDungKhi: "Cảnh sóng ánh sáng/điện từ, giao thoa phức tạp.", thamSo: "buocSong:0.5–3, bienDo:0.3–1.5", viDu: { buocSong: 2, bienDo: 1 }, thoiLuong: [8, 12], tuKhoa: ["song co", "buoc song", "truyen song", "bien do", "tan so song", "song ngang", "pha dao dong", "vi tri can bang"] }),
  E("tong_hop_luc", { monHoc: ["ly"], lop: [8, 10], dungKhi: "Cảnh về nhiều lực cùng tác dụng lên một vật và hợp lực.", khongDungKhi: "Cảnh chỉ nói định luật mà không có lực cụ thể.", thamSo: 'cacLuc:[{doLon:0.5–10 (N), gocDo:0–360, nhan?}] 2–4 lực', viDu: { cacLuc: [{ doLon: 4, gocDo: 0, nhan: "F1" }, { doLon: 3, gocDo: 90, nhan: "F2" }] }, thoiLuong: [8, 12], tuKhoa: ["hop luc", "tong hop luc", "luc tac dung", "can bang luc", "luc keo", "newton", "luc ma sat", "trong luc"] }),
  E("dien_giai_tung_buoc", { monHoc: ["*"], lop: [1, 13], dungKhi: "Lời giải/lập luận gồm vài dòng hiện lần lượt, dòng đang nói được tô sáng (mọi môn).", khongDungKhi: "Khi có mẫu chuyên biệt (đồ thị, hình, bảng, dòng thời gian…) hợp hơn.", thamSo: 'cacDong:["dòng có thể chứa $công thức$"] 1–8, mỗi dòng ≤200 ký tự', viDu: { cacDong: ["Đề bài: $x^2 - 4 = 0$", "Phân tích: $(x-2)(x+2) = 0$", "Vậy $x = 2$ hoặc $x = -2$"] }, thoiLuong: [8, 15], tuKhoa: ["giai", "buoc", "loi giai", "ta co", "suy ra", "vay", "chung minh", "tinh"] }),
  E("so_do_quy_trinh", { monHoc: ["*"], lop: [1, 13], dungKhi: "Quy trình/chuỗi nguyên nhân–kết quả/các bước nối tiếp (chu trình, thuật toán, quá trình).", khongDungKhi: "Khi nội dung không có thứ tự các bước.", thamSo: 'cacBuoc:[{nhan:≤40 ký tự, moTa?:≤80}] 2–6', viDu: { cacBuoc: [{ nhan: "Đọc đề" }, { nhan: "Lập phương trình", moTa: "đặt ẩn" }, { nhan: "Giải & kết luận" }] }, thoiLuong: [8, 14], tuKhoa: ["quy trinh", "cac buoc", "qua trinh", "chu trinh", "giai doan", "thuat toan", "tiep theo", "sau do", "dau tien"] }),
  E("so_sanh_bang", { monHoc: ["*"], lop: [1, 13], dungKhi: "So sánh hai–bốn đối tượng theo tiêu chí (bảng hiện theo hàng).", khongDungKhi: "Khi chỉ có một đối tượng hoặc dữ liệu số cần biểu đồ.", thamSo: 'cotTieuDe:[2–4 tiêu đề], cacHang:[[ô,…],…] 1–6 hàng, mỗi hàng đúng bằng số cột, ô ≤60 ký tự', viDu: { cotTieuDe: ["Hàm số", "Đồ thị"], cacHang: [["$y = ax$", "Đường thẳng"], ["$y = ax^2$", "Parabol"]] }, thoiLuong: [8, 14], tuKhoa: ["so sanh", "khac nhau", "giong nhau", "phan biet", "uu diem", "nhuoc diem", "bang", "doi chieu"] }),
  E("dong_thoi_gian", { monHoc: ["su", "dia", "van", "sinh"], lop: [6, 13], dungKhi: "Cảnh kể các sự kiện theo thời gian: lịch sử, tiểu sử tác giả, tiến hoá.", khongDungKhi: "Cảnh không có mốc thời gian.", thamSo: 'cacMoc:[{moc:"năm/mốc ≤12 ký tự", nhan:≤40, moTa?:≤80}] 2–7', viDu: { cacMoc: [{ moc: "1858", nhan: "Pháp tấn công Đà Nẵng" }, { moc: "1945", nhan: "Cách mạng tháng Tám" }, { moc: "1975", nhan: "Thống nhất đất nước" }] }, thoiLuong: [8, 15], tuKhoa: ["nam", "the ky", "lich su", "su kien", "dong thoi gian", "giai doan", "chien tranh", "khoi nghia", "cach mang", "tieu su", "ra doi"] }),
  E("so_do_venn", { monHoc: ["toan", "sinh", "van", "anh", "*"], lop: [3, 13], dungKhi: "So sánh hai nhóm với phần chung/riêng (tập hợp, đặc điểm giống–khác).", khongDungKhi: "Cảnh có hơn hai nhóm hoặc không có phần chung.", thamSo: "tenA, tenB, tenGiao?, chuaA?:[≤4], chuaB?:[≤4], chuaGiao?:[≤4] (mỗi mục ≤24 ký tự)", viDu: { tenA: "Số chẵn", tenB: "Bội của 3", tenGiao: "Chia hết cho 6", chuaA: ["2", "4", "8"], chuaB: ["3", "9", "15"], chuaGiao: ["6", "12"] }, thoiLuong: [8, 12], tuKhoa: ["venn", "tap hop", "giao", "hop", "phan chung", "giong nhau", "khac nhau", "thuoc nhom"] }),
  E("bieu_do_so_lieu", { monHoc: ["dia", "su", "toan", "sinh", "hoa", "ly", "tin"], lop: [3, 13], dungKhi: "Cảnh có số liệu thống kê, so sánh số lượng hoặc xu hướng theo thời gian.", khongDungKhi: "Cảnh không có số liệu cụ thể.", thamSo: 'kieu:"cot"|"duong", nhan:[2–8 nhãn ≤16], cacChuoi:[{ten, giaTri:[số, đúng bằng số nhãn]}] 1–3, donVi?', viDu: { kieu: "cot", nhan: ["2019", "2020", "2021", "2022"], cacChuoi: [{ ten: "Dân số (triệu)", giaTri: [96, 97, 98, 99] }], donVi: "triệu người" }, thoiLuong: [8, 14], tuKhoa: ["bieu do", "thong ke", "so lieu", "bang so lieu", "ti le", "phan tram", "tang", "giam", "xu huong", "dan so", "san luong"] }),
  E("the_ghi_nho", { monHoc: ["*"], lop: [1, 13], dungKhi: "Kiến thức cần nhớ dạng hỏi–đáp / khái niệm–định nghĩa, tổng kết cuối bài.", khongDungKhi: "Cảnh giảng giải dài.", thamSo: "cacThe:[{matTruoc:≤80, matSau:≤140}] 1–4", viDu: { cacThe: [{ matTruoc: "Định luật Ôm là gì?", matSau: "I = U / R" }, { matTruoc: "Đơn vị của điện trở?", matSau: "Ôm (Ω)" }] }, thoiLuong: [8, 14], tuKhoa: ["ghi nho", "can nho", "dinh nghia", "khai niem", "tong ket", "luu y", "cong thuc can nho", "on tap"] }),
  E("trich_dan_van_ban", { monHoc: ["van"], lop: [6, 12], dungKhi: "Cảnh phân tích một câu/đoạn thơ, văn: làm nổi bật từ khoá, kèm ghi chú.", khongDungKhi: "Cảnh không có trích dẫn nguyên văn.", thamSo: "vanBan:≤400 ký tự, tuKhoa?:[≤5 cụm từ có trong vanBan], tacGia?, ghiChu?:≤160", viDu: { vanBan: "Nước non lận đận một mình, thân cò lặn lội thân cò khi quãng vắng.", tuKhoa: ["lận đận", "thân cò"], tacGia: "Ca dao", ghiChu: "Hình ảnh con cò gợi thân phận người lao động nhọc nhằn." }, thoiLuong: [8, 14], tuKhoa: ["tho", "van ban", "doan van", "cau tho", "phan tich", "bien phap tu tu", "hinh anh", "tac gia", "tac pham", "ngu van", "tu khoa", "trich"] }),
  E("tu_vung", { monHoc: ["anh"], lop: [1, 13], dungKhi: "Dạy một từ/cụm từ ngoại ngữ: phiên âm, loại từ, nghĩa, ví dụ.", khongDungKhi: "Cảnh ngữ pháp dài hoặc bài đọc.", thamSo: "tu, phienAm?, loaiTu?, nghia, viDu?, viDuDich?", viDu: { tu: "environment", phienAm: "/ɪnˈvaɪrənmənt/", loaiTu: "noun", nghia: "môi trường", viDu: "We must protect the environment.", viDuDich: "Chúng ta phải bảo vệ môi trường." }, thoiLuong: [8, 12], tuKhoa: ["tu vung", "vocabulary", "nghia la", "phat am", "phien am", "tieng anh", "noun", "verb", "adjective", "cum tu", "word"] }),
  E("can_bang_phuong_trinh_hoa_hoc", { monHoc: ["hoa"], lop: [8, 12], dungKhi: "Cảnh cân bằng phương trình hoá học bằng hệ số.", khongDungKhi: "Cảnh không có phương trình phản ứng.", thamSo: 'chatThamGia:["H2","O2"], sanPham:["H2O"], heSoCuoi:[số nguyên cho từng chất theo thứ tự chất tham gia rồi sản phẩm]', viDu: { chatThamGia: ["H2", "O2"], sanPham: ["H2O"], heSoCuoi: [2, 1, 2] }, thoiLuong: [8, 12], tuKhoa: ["can bang", "phuong trinh hoa hoc", "he so", "phan ung", "chat tham gia", "san pham", "bao toan khoi luong", "nguyen tu"] }),
  E("cay_xac_suat", { monHoc: ["toan"], lop: [9, 12], dungKhi: "Cảnh tính xác suất qua phép thử nhiều bước (cây xác suất).", khongDungKhi: "Cảnh xác suất một bước đơn giản.", thamSo: 'goc?, cacNhanh:[{ten:≤20, xs:0–1, con?:[{ten,xs}]≤3}] 2–3 nhánh', viDu: { goc: "Bốc bi", cacNhanh: [{ ten: "Đỏ", xs: 0.6, con: [{ ten: "Đỏ", xs: 0.5 }, { ten: "Xanh", xs: 0.5 }] }, { ten: "Xanh", xs: 0.4, con: [{ ten: "Đỏ", xs: 0.7 }, { ten: "Xanh", xs: 0.3 }] }] }, thoiLuong: [8, 14], tuKhoa: ["xac suat", "cay xac suat", "phep thu", "bien co", "bong bi", "tung dong xu", "xuc xac", "nhanh", "lan thu"] }),
];

export const catalogOf = (id: string): CatalogEntry | undefined => CATALOG.find((c) => c.id === id);

const strip = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();

/** "Vật lí", "Vật lý", "Lý" → "ly"; không nhận ra → "". */
export function subjectKey(subject: string | null | undefined): string {
  const s = strip(subject ?? "");
  if (/toan/.test(s)) return "toan";
  if (/vat ?l[iy]|^l[iy]$/.test(s)) return "ly";
  if (/hoa/.test(s)) return "hoa";
  if (/sinh/.test(s)) return "sinh";
  if (/van|ngu van/.test(s)) return "van";
  if (/lich ?su|^su$/.test(s)) return "su";
  if (/dia/.test(s)) return "dia";
  if (/anh|english|ngoai ngu/.test(s)) return "anh";
  if (/tin/.test(s)) return "tin";
  return "";
}

export type SceneInfo = { subject?: string | null; grade?: number | null; title: string; slideText: string; speech: string };

/** Điểm hợp: môn (+4; mẫu dùng chung +1; lệch môn −3), lớp (+1 / −2), từ khoá (+2 mỗi từ, tối đa +8). */
export function scoreTemplate(e: CatalogEntry, s: SceneInfo, text: string): { score: number; hits: number } {
  const sub = subjectKey(s.subject);
  let sc = 0;
  if (sub) sc += e.monHoc.includes(sub) ? 4 : e.monHoc.includes("*") ? 1 : -3;
  else sc += e.monHoc.includes("*") ? 1 : 0;
  if (s.grade) sc += s.grade >= e.lop[0] && s.grade <= e.lop[1] ? 1 : -2;
  let hits = 0;
  for (const k of e.tuKhoa) if (text.includes(k)) hits++;
  return { score: sc + Math.min(hits * 2, 8), hits };
}

/** Bước 1 (tất định, rẻ): giữ tối đa `top` mẫu điểm cao nhất, mỗi mẫu phải trúng ≥1 từ khoá và điểm ≥ 3. Không mẫu nào đạt → rỗng (khỏi hỏi AI, cảnh không cần hoạt hình). */
export function prefilter(s: SceneInfo, top = 6): { entry: CatalogEntry; score: number }[] {
  const text = strip(`${s.title} ${s.slideText} ${s.speech}`);
  return CATALOG.map((entry) => ({ entry, ...scoreTemplate(entry, s, text) }))
    .filter((x) => x.hits >= 1 && x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, top)
    .map(({ entry, score }) => ({ entry, score }));
}
