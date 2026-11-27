// Ngân hàng câu hỏi THCS (lớp 6–9) cho bản demo: chủ đề học kỳ I theo SGK Kết nối tri thức với cuộc sống (Tiếng Anh: Global Success).
// Mỗi chủ đề đúng 5 câu; yccd theo CV 7991. Dữ liệu tĩnh, không gọi AI.
import type { DTopic } from "./types";

export const BANK_THCS: DTopic[] = [
  // ======================= LỚP 6 =======================
  // ---------- Toán 6 ----------
  {
    subject: "Toán", grade: 6, topic: "Luỹ thừa với số mũ tự nhiên", week: 3,
    yccd: "Thực hiện được phép tính luỹ thừa với số mũ tự nhiên; nhân, chia hai luỹ thừa cùng cơ số.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Viết gọn tích 5 · 5 · 5 · 5 dưới dạng một luỹ thừa.", options: ["4⁵", "5 · 4", "5⁴", "5⁵"], answer: 2, explanation: "Tích của 4 thừa số 5 được viết là 5⁴." },
      { t: "mcq", lv: "NB", stem: "Giá trị của 2⁵ là", options: ["10", "32", "25", "64"], answer: 1, explanation: "2⁵ = 2 · 2 · 2 · 2 · 2 = 32." },
      { t: "mcq", lv: "TH", stem: "Kết quả của phép tính 3⁷ : 3⁴ viết dưới dạng một luỹ thừa là", options: ["3¹¹", "1³", "3²⁸", "3³"], answer: 3, explanation: "aᵐ : aⁿ = aᵐ⁻ⁿ (m ≥ n, a ≠ 0) nên 3⁷ : 3⁴ = 3³." },
      { t: "short", lv: "TH", stem: "Tìm số tự nhiên n, biết 2ⁿ = 64.", answer: "6", explanation: "64 = 2 · 2 · 2 · 2 · 2 · 2 = 2⁶ nên n = 6." },
      { t: "essay", lv: "VD", stem: "Một tế bào vi khuẩn cứ 20 phút lại phân đôi một lần. Ban đầu có 1 tế bào. a) Viết số tế bào có được sau 1 giờ dưới dạng luỹ thừa của 2 rồi tính. b) Sau 2 giờ có bao nhiêu tế bào?", rubric: "a) Xác định 1 giờ có 3 lần phân đôi (0,5đ); viết và tính đúng 2³ = 8 tế bào (0,5đ). b) Xác định 2 giờ có 6 lần phân đôi (0,5đ); tính đúng 2⁶ = 64 tế bào (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 6, topic: "Ước chung và ước chung lớn nhất", week: 7,
    yccd: "Xác định được ước chung, ước chung lớn nhất của hai hoặc ba số tự nhiên; vận dụng giải bài toán thực tiễn.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Tập hợp các ước của 12 là", options: ["{1; 2; 3; 4; 6}", "{1; 2; 3; 4; 6; 12}", "{2; 3; 4; 6}", "{0; 12; 24; 36}"], answer: 1, explanation: "Ư(12) gồm mọi số tự nhiên mà 12 chia hết, kể cả 1 và 12." },
      { t: "mcq", lv: "NB", stem: "ƯCLN(18, 30) bằng", options: ["3", "90", "6", "2"], answer: 2, explanation: "18 = 2 · 3², 30 = 2 · 3 · 5 nên ƯCLN = 2 · 3 = 6." },
      { t: "mcq", lv: "TH", stem: "Cho a = 2³ · 3 và b = 2² · 3² · 5. ƯCLN(a, b) là", options: ["2³ · 3² · 5", "2 · 3", "2² · 3 · 5", "2² · 3"], answer: 3, explanation: "Lấy các thừa số nguyên tố chung với số mũ nhỏ nhất: 2² · 3 = 12." },
      { t: "short", lv: "TH", stem: "Tìm ƯCLN(24, 36, 60).", answer: "12", explanation: "24 = 2³ · 3; 36 = 2² · 3²; 60 = 2² · 3 · 5 nên ƯCLN = 2² · 3 = 12." },
      { t: "essay", lv: "VD", stem: "Hội phụ huynh lớp 6A1 có 48 quyển vở và 72 chiếc bút bi, muốn chia đều thành các phần quà tặng học sinh vùng lũ sao cho số vở ở các phần như nhau, số bút ở các phần như nhau. Hỏi chia được nhiều nhất bao nhiêu phần quà? Khi đó mỗi phần có bao nhiêu quyển vở, bao nhiêu chiếc bút?", rubric: "Lập luận số phần quà nhiều nhất là ƯCLN(48, 72) (0,5đ); tính đúng ƯCLN(48, 72) = 24 (0,5đ); kết luận 24 phần quà (0,25đ); mỗi phần có 2 quyển vở và 3 chiếc bút (0,75đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 6, topic: "Phép cộng và phép trừ số nguyên", week: 11,
    yccd: "Thực hiện được phép cộng, phép trừ số nguyên; vận dụng tính chất và quy tắc dấu ngoặc để tính hợp lí.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Kết quả của phép tính (−15) + (−7) là", options: ["−8", "8", "22", "−22"], answer: 3, explanation: "Cộng hai số nguyên âm: cộng hai số đối của chúng rồi đặt dấu “−” trước kết quả." },
      { t: "mcq", lv: "NB", stem: "Kết quả của phép tính 12 − 20 là", options: ["−8", "8", "−32", "32"], answer: 0, explanation: "12 − 20 = 12 + (−20) = −8." },
      { t: "mcq", lv: "TH", stem: "Nhiệt độ buổi sáng ở Sa Pa là −2 °C, đến trưa tăng thêm 9 °C. Nhiệt độ buổi trưa là", options: ["−11 °C", "11 °C", "7 °C", "−7 °C"], answer: 2, explanation: "(−2) + 9 = 7." },
      { t: "short", lv: "TH", stem: "Tính hợp lí: (−37) + 54 + (−63) + 46.", answer: "0", explanation: "[(−37) + (−63)] + (54 + 46) = (−100) + 100 = 0." },
      { t: "essay", lv: "VD", stem: "Một tàu ngầm đang ở độ cao −45 m so với mực nước biển. Tàu nổi lên 18 m, sau đó lặn xuống thêm 30 m. a) Viết biểu thức tính độ cao mới của tàu so với mực nước biển. b) Tính và cho biết khi đó tàu ở độ sâu bao nhiêu mét dưới mực nước biển.", rubric: "a) Viết đúng biểu thức (−45) + 18 − 30 (1đ). b) Tính đúng kết quả −57 (0,5đ); kết luận tàu ở độ sâu 57 m dưới mực nước biển (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 6, topic: "Phép nhân số nguyên", week: 14,
    yccd: "Thực hiện được phép nhân số nguyên; vận dụng quy tắc dấu và tính chất của phép nhân để tính nhanh.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Kết quả của phép tính (−6) · 7 là", options: ["42", "−42", "−13", "13"], answer: 1, explanation: "Tích hai số nguyên khác dấu là số nguyên âm: (−6) · 7 = −42." },
      { t: "mcq", lv: "NB", stem: "Khẳng định nào sau đây đúng?", options: ["Tích hai số nguyên âm là số nguyên âm.", "Tích của một số nguyên với 0 bằng chính số đó.", "Tích hai số nguyên khác dấu là số nguyên dương.", "Tích hai số nguyên âm là số nguyên dương."], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Giá trị của (−2)³ là", options: ["−8", "8", "−6", "6"], answer: 0, explanation: "(−2)³ = (−2) · (−2) · (−2) = 4 · (−2) = −8." },
      { t: "short", lv: "VD", stem: "Tính nhanh: (−25) · 37 · 4.", answer: "−3700|-3700", explanation: "(−25) · 4 · 37 = (−100) · 37 = −3700." },
      { t: "essay", lv: "VD", stem: "Trong một cuộc thi trắc nghiệm, mỗi câu trả lời đúng được +5 điểm, mỗi câu trả lời sai bị −2 điểm, câu bỏ trống được 0 điểm. Bạn Minh trả lời đúng 12 câu, sai 5 câu và bỏ trống 3 câu. Tính tổng điểm của Minh.", rubric: "Viết đúng biểu thức 12 · 5 + 5 · (−2) + 3 · 0 (1đ); tính đúng từng tích 60; −10; 0 (0,5đ); kết luận Minh được 50 điểm (0,5đ).", points: 2 },
    ],
  },
  // ---------- Ngữ văn 6 ----------
  {
    subject: "Ngữ văn", grade: 6, topic: "Truyện đồng thoại: Bài học đường đời đầu tiên (Tô Hoài)", week: 2,
    yccd: "Nhận biết được đặc điểm truyện đồng thoại, người kể chuyện ngôi thứ nhất; nêu được bài học rút ra từ văn bản.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Văn bản “Bài học đường đời đầu tiên” được trích từ tác phẩm nào của nhà văn Tô Hoài?", options: ["Vợ chồng A Phủ", "Dế Mèn phiêu lưu kí", "Đất rừng phương Nam", "Cô Tô"], answer: 1, explanation: "Văn bản trích chương I truyện “Dế Mèn phiêu lưu kí”." },
      { t: "mcq", lv: "NB", stem: "Đọc câu văn: “Bởi tôi ăn uống điều độ và làm việc có chừng mực nên tôi chóng lớn lắm.” Câu chuyện được kể theo ngôi thứ mấy, người kể là ai?", options: ["Ngôi thứ ba, người kể giấu mặt", "Ngôi thứ nhất, Dế Choắt kể", "Ngôi thứ ba, chị Cốc kể", "Ngôi thứ nhất, Dế Mèn kể"], answer: 3, explanation: "Người kể xưng “tôi” – chính là Dế Mèn." },
      { t: "mcq", lv: "TH", stem: "Vì sao “Bài học đường đời đầu tiên” được xếp vào thể loại truyện đồng thoại?", options: ["Vì nhân vật là loài vật được nhân hoá, vừa mang đặc điểm loài vật vừa mang đặc điểm con người", "Vì truyện kể về các nhân vật lịch sử có thật", "Vì truyện có yếu tố hoang đường giải thích nguồn gốc sự vật", "Vì truyện được viết bằng thơ lục bát"], answer: 0 },
      { t: "tf", lv: "TH", stem: "Đọc lời Dế Choắt nói với Dế Mèn trước khi chết: “…ở đời mà có thói hung hăng bậy bạ, có óc mà không biết nghĩ, sớm muộn rồi cũng mang vạ vào mình đấy.” Xét tính đúng/sai của các nhận định sau.", statements: ["Đây là lời khuyên Dế Choắt dành cho Dế Mèn.", "Lời nói cho thấy Dế Choắt căm ghét, không tha thứ cho Dế Mèn.", "Câu nói nêu lên bài học về thói kiêu căng, hống hách, thiếu suy nghĩ.", "Sau cái chết của Dế Choắt, Dế Mèn vẫn không hề hối hận."], answer: [true, false, true, false], explanation: "Dế Choắt khuyên bằng tấm lòng độ lượng; Dế Mèn đứng lặng giờ lâu, hối hận về bài học đường đời đầu tiên." },
      { t: "essay", lv: "VD", stem: "Viết đoạn văn (khoảng 150–200 chữ) trình bày bài học em rút ra từ lỗi lầm của Dế Mèn và liên hệ với cách cư xử của bản thân với bạn bè.", rubric: "Đúng hình thức đoạn văn, dung lượng phù hợp (0,5đ); nêu đúng bài học: không kiêu căng, hống hách, phải suy nghĩ trước khi hành động (1đ); có dẫn chứng từ văn bản (0,5đ); liên hệ bản thân chân thành, cụ thể (0,75đ); diễn đạt mạch lạc, ít lỗi chính tả (0,25đ).", points: 3 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 6, topic: "Truyện: Cô bé bán diêm, Gió lạnh đầu mùa", week: 7,
    yccd: "Nhận biết được chi tiết tiêu biểu, nhân vật, người kể chuyện ngôi thứ ba; hiểu được tình yêu thương, sự sẻ chia thể hiện trong truyện.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Truyện “Cô bé bán diêm” là sáng tác của nhà văn nào?", options: ["Lép Tôn-xtôi (Nga)", "Ta-go (Ấn Độ)", "An-đéc-xen (Đan Mạch)", "Xanh-tơ Ê-xu-pe-ri (Pháp)"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Khi em bé quẹt que diêm thứ tư, hình ảnh nào hiện lên?", options: ["Lò sưởi bằng sắt", "Bàn ăn có ngỗng quay", "Cây thông Nô-en", "Người bà đã mất"], answer: 3, explanation: "Lần lượt: lò sưởi, bàn ăn có ngỗng quay, cây thông Nô-en, rồi người bà hiện về." },
      { t: "mcq", lv: "TH", stem: "Chi tiết em bé chết rét trong đêm giao thừa nhưng đôi má vẫn hồng, đôi môi đang mỉm cười thể hiện điều gì?", options: ["Em bé đã được người qua đường cứu sống", "Em ra đi trong niềm hạnh phúc được về với bà, thể hiện niềm thương cảm sâu sắc của nhà văn", "Nhà văn chế giễu sự ngây thơ của em bé", "Mọi người trong phố đều yêu thương, quan tâm em bé"], answer: 1 },
      { t: "tf", lv: "TH", stem: "Về truyện ngắn “Gió lạnh đầu mùa” của Thạch Lam, xét tính đúng/sai của các nhận định sau.", statements: ["Sơn và chị Lan đã đem chiếc áo bông cũ của em Duyên cho Hiên.", "Mẹ Sơn mắng chị em Sơn rất nặng nề vì tự ý cho áo.", "Truyện ca ngợi tấm lòng nhân hậu, biết sẻ chia của trẻ em.", "Truyện được kể theo ngôi thứ nhất, người kể là Hiên."], answer: [true, false, true, false], explanation: "Mẹ Sơn không mắng mà còn cho mẹ Hiên vay tiền; truyện kể theo ngôi thứ ba." },
      { t: "essay", lv: "VD", stem: "Viết đoạn văn (khoảng 150–200 chữ) kể lại một việc làm thể hiện sự yêu thương, sẻ chia mà em đã làm hoặc chứng kiến (ví dụ: góp sách vở, áo ấm cho các bạn vùng cao) và nêu suy nghĩ của em.", rubric: "Đúng hình thức đoạn văn, dung lượng phù hợp (0,5đ); kể rõ việc làm: thời gian, nhân vật, diễn biến (1đ); bày tỏ cảm xúc, suy nghĩ về ý nghĩa của sự sẻ chia (1đ); diễn đạt mạch lạc, đúng chính tả (0,5đ).", points: 3 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 6, topic: "Thơ lục bát về quê hương", week: 11,
    yccd: "Nhận biết được số tiếng, số dòng, vần, nhịp của thơ lục bát; hiểu được tình cảm với quê hương thể hiện qua ca dao, thơ.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Trong thơ lục bát, mỗi cặp câu có số tiếng như thế nào?", options: ["Câu trên 7 tiếng, câu dưới 7 tiếng", "Câu trên 6 tiếng, câu dưới 8 tiếng", "Mỗi câu đều có 5 tiếng", "Câu trên 8 tiếng, câu dưới 6 tiếng"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Trong câu ca dao “Đường vô xứ Nghệ quanh quanh / Non xanh nước biếc như tranh hoạ đồ”, tiếng thứ sáu của câu bát gieo vần với tiếng “quanh” là", options: ["non", "biếc", "đồ", "tranh"], answer: 3, explanation: "Tiếng thứ sáu câu lục (quanh) vần với tiếng thứ sáu câu bát (tranh)." },
      { t: "mcq", lv: "TH", stem: "Câu ca dao “Đường vô xứ Nghệ quanh quanh / Non xanh nước biếc như tranh hoạ đồ” thể hiện tình cảm gì?", options: ["Nỗi buồn của người phải rời xa quê", "Lời than thở về đường đi vất vả", "Niềm tự hào về vẻ đẹp thơ mộng của xứ Nghệ", "Sự sợ hãi trước núi rừng hiểm trở"], answer: 2 },
      { t: "tf", lv: "TH", stem: "Đọc đoạn thơ: “Tôi yêu truyện cổ nước tôi / Vừa nhân hậu lại tuyệt vời sâu xa / Thương người rồi mới thương ta / Yêu nhau dù mấy cách xa cũng tìm” (Lâm Thị Mỹ Dạ). Xét tính đúng/sai của các nhận định sau.", statements: ["Đoạn thơ được viết theo thể lục bát.", "Tiếng “tôi” cuối dòng sáu vần với tiếng “xa” cuối dòng tám.", "Tác giả yêu truyện cổ vì truyện cổ chứa đựng lòng nhân hậu và những bài học sâu xa.", "Câu “Thương người rồi mới thương ta” đề cao lối sống vị tha."], answer: [true, false, true, true], explanation: "Tiếng “tôi” (tiếng thứ sáu dòng lục) vần với tiếng thứ sáu dòng bát là “vời”." },
      { t: "essay", lv: "VD", stem: "Viết đoạn văn (khoảng 150–200 chữ) ghi lại cảm xúc của em về một bài ca dao hoặc bài thơ lục bát viết về quê hương mà em yêu thích.", rubric: "Đúng hình thức đoạn văn, giới thiệu được bài ca dao/bài thơ (0,5đ); nêu cảm xúc về nội dung, hình ảnh tiêu biểu (1đ); nhận xét được nét đặc sắc nghệ thuật: vần, nhịp, biện pháp tu từ (1đ); diễn đạt mạch lạc, đúng chính tả (0,5đ).", points: 3 },
    ],
  },
  // ---------- Tiếng Anh 6 ----------
  {
    subject: "Tiếng Anh", grade: 6, topic: "Unit 1: My New School", week: 2,
    yccd: "Sử dụng được thì hiện tại đơn, trạng từ chỉ tần suất và từ vựng về trường học, đồ dùng học tập.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: We ___ English on Monday and Thursday.", options: ["has", "have", "is have", "having"], answer: 1, explanation: "Chủ ngữ “We” đi với động từ nguyên mẫu “have” ở thì hiện tại đơn." },
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: I usually ___ my homework after dinner.", options: ["play", "study", "have", "do"], answer: 3, explanation: "Cụm từ cố định: do homework." },
      { t: "mcq", lv: "TH", stem: "Choose the correct sentence.", options: ["Mai is always late for school.", "Mai always is late for school.", "Mai is late always for school.", "Mai late is always for school."], answer: 0, explanation: "Trạng từ chỉ tần suất đứng sau động từ “be”." },
      { t: "tf", lv: "TH", stem: "Read the passage: “My name is Phong. I am a new student at Kim Đồng Lower Secondary School. My school has a big library and a computer room. I go to school from Monday to Friday. I often ride my bike to school with my friend Duy. At break time, we usually play football in the schoolyard.” Decide whether each statement is true or false.", statements: ["Phong is a new student at his school.", "Phong's school does not have a library.", "Phong goes to school six days a week.", "Phong and Duy usually play football at break time."], answer: [true, false, false, true] },
      { t: "essay", lv: "VD", stem: "Write 5–6 sentences about your new school: its name, its rooms, your favourite subject and what you usually do at break time.", rubric: "Đủ nội dung: tên trường, các phòng, môn yêu thích, hoạt động giờ ra chơi (1đ); dùng đúng thì hiện tại đơn và trạng từ tần suất (0,5đ); từ vựng phù hợp, ít lỗi chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 6, topic: "Unit 3: My Friends", week: 7,
    yccd: "Dùng được tính từ chỉ ngoại hình, tính cách và thì hiện tại tiếp diễn để nói về kế hoạch sắp tới.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: Lan has long black ___.", options: ["hairs", "eye", "hair", "nose"], answer: 2, explanation: "“hair” (tóc) là danh từ không đếm được khi nói về mái tóc." },
      { t: "mcq", lv: "NB", stem: "Minh always helps his friends with their homework. He is very ___.", options: ["kind", "lazy", "boring", "shy"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "What ___ you ___ this weekend? – We're visiting our grandparents in Hưng Yên.", options: ["do / do", "did / do", "will / doing", "are / doing"], answer: 3, explanation: "Hiện tại tiếp diễn diễn tả kế hoạch đã sắp xếp trong tương lai gần." },
      { t: "tf", lv: "TH", stem: "Read the passage: “My best friend is Hà. She has a round face and short curly hair. She is clever and creative – she draws beautiful pictures. She is also a bit shy when she meets new people. This Sunday, we are going to the zoo together.” Decide whether each statement is true or false.", statements: ["Hà has long straight hair.", "Hà is good at drawing.", "Hà is a bit shy with new people.", "They went to the zoo last Sunday."], answer: [false, true, true, false] },
      { t: "essay", lv: "VD", stem: "Write 5–6 sentences describing your best friend (appearance and personality) and a plan the two of you have for this weekend.", rubric: "Miêu tả được ngoại hình (0,5đ) và tính cách bằng tính từ phù hợp (0,5đ); dùng đúng thì hiện tại tiếp diễn cho kế hoạch (0,5đ); câu đúng ngữ pháp, ít lỗi chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 6, topic: "Unit 4: My Neighbourhood", week: 11,
    yccd: "So sánh được hai người, vật, nơi chốn bằng tính từ so sánh hơn; nói về các địa điểm trong khu phố.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: Hà Nội is ___ than Huế.", options: ["big", "biggest", "more big", "bigger"], answer: 3, explanation: "Tính từ ngắn kết thúc bằng phụ âm – nguyên âm – phụ âm: gấp đôi phụ âm cuối rồi thêm -er." },
      { t: "mcq", lv: "NB", stem: "You can buy fresh fish, vegetables and fruit at the ___.", options: ["cathedral", "market", "museum", "railway station"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Choose the correct answer: Life in the city is ___ than life in the countryside.", options: ["more noisy", "noisiest", "noisier", "more noisier"], answer: 2, explanation: "Tính từ hai âm tiết tận cùng bằng -y: đổi y thành i rồi thêm -er." },
      { t: "tf", lv: "TH", stem: "Read the passage: “I live in a small neighbourhood near the Hồng River. There is a post office, a temple and a small market. The streets are narrow but quiet. My neighbourhood is more peaceful than the city centre, but the city centre is more convenient because it has big supermarkets.” Decide whether each statement is true or false.", statements: ["The writer lives near the Hồng River.", "There is a cinema in the neighbourhood.", "The streets in the neighbourhood are wide and noisy.", "The city centre is more convenient than the neighbourhood."], answer: [true, false, false, true] },
      { t: "essay", lv: "VD", stem: "Write 5–6 sentences comparing your neighbourhood with a nearby town or city. Use at least three comparative adjectives.", rubric: "Giới thiệu được khu phố và nơi đem so sánh (0,5đ); dùng đúng ít nhất 3 tính từ so sánh hơn (0,75đ); nội dung hợp lí, câu đúng ngữ pháp (0,5đ); ít lỗi chính tả (0,25đ).", points: 2 },
    ],
  },
  // ---------- KHTN 6 ----------
  {
    subject: "Khoa học tự nhiên", grade: 6, topic: "Đo chiều dài, khối lượng và thời gian", week: 3,
    yccd: "Dùng được thước, cân, đồng hồ để đo chiều dài, khối lượng, thời gian; ước lượng được đại lượng cần đo để chọn dụng cụ phù hợp.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Đơn vị đo chiều dài trong hệ đơn vị đo lường chính thức ở nước ta là", options: ["kilôgam (kg)", "giây (s)", "mét (m)", "lít (l)"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Dụng cụ nào thích hợp nhất để đo khối lượng một bao gạo khoảng 25 kg ở chợ?", options: ["Cân đồng hồ", "Cân tiểu li", "Thước dây", "Đồng hồ bấm giây"], answer: 0, explanation: "Cân tiểu li chỉ đo được khối lượng rất nhỏ; cân đồng hồ có giới hạn đo phù hợp." },
      { t: "mcq", lv: "TH", stem: "Trên một thước kẻ, khoảng giữa vạch số 0 và vạch số 1 cm được chia thành 10 khoảng đều nhau. Độ chia nhỏ nhất của thước là", options: ["1 cm", "10 mm", "0,1 mm", "1 mm"], answer: 3, explanation: "1 cm : 10 = 0,1 cm = 1 mm." },
      { t: "short", lv: "TH", stem: "Một xe tải chở hàng có khối lượng 3,5 tấn. Khối lượng hàng đó là bao nhiêu kilôgam?", answer: "3500", explanation: "1 tấn = 1000 kg nên 3,5 tấn = 3500 kg." },
      { t: "essay", lv: "VD", stem: "Em hãy trình bày các bước dùng đồng hồ bấm giây để đo thời gian bạn Nam chạy hết 60 m trên sân trường và nêu một nguyên nhân có thể gây sai số.", rubric: "Ước lượng thời gian, chọn đồng hồ có giới hạn đo và độ chia nhỏ nhất phù hợp (0,5đ); nhấn nút Reset đưa đồng hồ về số 0 (0,25đ); bấm Start khi Nam xuất phát, bấm Stop khi Nam về đích (0,5đ); đọc và ghi kết quả (0,25đ); nêu đúng một nguyên nhân sai số, ví dụ bấm nút chậm so với hiệu lệnh (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 6, topic: "Các thể của chất và sự chuyển thể", week: 6,
    yccd: "Nêu được đặc điểm cơ bản ba thể rắn, lỏng, khí của chất; trình bày được quá trình nóng chảy, đông đặc, bay hơi, ngưng tụ, sôi.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Quá trình chất chuyển từ thể rắn sang thể lỏng gọi là", options: ["sự đông đặc", "sự nóng chảy", "sự ngưng tụ", "sự bay hơi"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Chất ở thể nào có hình dạng và thể tích xác định?", options: ["Thể lỏng", "Thể khí", "Cả thể lỏng và thể khí", "Thể rắn"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Sáng sớm, trên lá cây ngoài vườn thường có những giọt sương. Hiện tượng này là do", options: ["nước trong lá cây thoát ra rồi đông đặc", "nước mưa đọng lại từ đêm hôm trước", "hơi nước trong không khí ngưng tụ khi gặp lạnh", "sương mù bay hơi lên rồi rơi xuống"], answer: 2, explanation: "Ban đêm nhiệt độ hạ thấp, hơi nước trong không khí ngưng tụ thành giọt nước." },
      { t: "tf", lv: "TH", stem: "Bạn Hoa đun nước trong ấm ở áp suất thường và quan sát. Xét tính đúng/sai của các nhận định sau.", statements: ["Nước sôi ở 100 °C.", "Sự bay hơi chỉ xảy ra khi nước đã sôi.", "Trong khi sôi, nhiệt độ của nước vẫn tiếp tục tăng.", "Khi sôi, nước bay hơi cả trong lòng chất lỏng và trên mặt thoáng."], answer: [true, false, false, true], explanation: "Bay hơi xảy ra ở mọi nhiệt độ; trong suốt thời gian sôi nhiệt độ của nước không đổi." },
      { t: "essay", lv: "VD", stem: "Ở các vùng ven biển như Bạc Liêu, Ninh Thuận, người dân làm muối bằng cách dẫn nước biển vào ruộng muối rồi phơi nắng. Hãy giải thích quá trình hình thành muối dựa trên sự chuyển thể và cho biết vì sao nghề làm muối cần những ngày nắng to, có gió.", rubric: "Nêu đúng: nước biển bay hơi, muối còn lại kết tinh thành hạt (1đ); giải thích nắng to làm nhiệt độ cao nên nước bay hơi nhanh (0,5đ); gió đưa hơi nước trên mặt thoáng đi nơi khác, làm tăng tốc độ bay hơi (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 6, topic: "Tế bào – đơn vị cơ bản của sự sống", week: 11,
    yccd: "Nêu được tế bào là đơn vị cấu trúc và chức năng của cơ thể; phân biệt được tế bào nhân sơ với nhân thực, tế bào động vật với tế bào thực vật.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Ba thành phần chính của mọi tế bào là", options: ["thành tế bào, lục lạp, không bào", "màng tế bào, chất tế bào, nhân hoặc vùng nhân", "màng tế bào, lục lạp, nhân", "thành tế bào, ti thể, nhân"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Tế bào vi khuẩn được gọi là tế bào nhân sơ vì", options: ["tế bào có kích thước rất lớn", "tế bào có thành cellulose", "tế bào chưa có nhân hoàn chỉnh, chất di truyền nằm ở vùng nhân", "tế bào có nhiều nhân"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Bào quan nào có ở tế bào lá cây nhưng không có ở tế bào động vật?", options: ["Màng tế bào", "Ti thể", "Nhân", "Lục lạp"], answer: 3, explanation: "Lục lạp chứa diệp lục, giúp tế bào thực vật quang hợp." },
      { t: "short", lv: "TH", stem: "Một tế bào ở đầu rễ cây lúa phân chia liên tiếp 4 lần. Hỏi tạo ra bao nhiêu tế bào con?", answer: "16", explanation: "Mỗi lần phân chia số tế bào tăng gấp đôi: 2⁴ = 16." },
      { t: "essay", lv: "VD", stem: "Vì sao muốn quan sát tế bào biểu bì vảy hành, người ta phải dùng kính hiển vi? Sự lớn lên và sinh sản của tế bào có ý nghĩa gì đối với cây lúa đang phát triển ngoài đồng?", rubric: "Nêu đúng tế bào có kích thước rất nhỏ, mắt thường không quan sát được nên cần kính hiển vi (0,5đ); nêu sự lớn lên và phân chia làm tăng kích thước, số lượng tế bào (0,5đ); liên hệ giúp cây lúa lớn lên, đẻ nhánh, phát triển (0,5đ); thay thế các tế bào già, bị tổn thương (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 6, topic: "Từ tế bào đến cơ thể", week: 14,
    yccd: "Nhận biết được cơ thể đơn bào, đa bào; mô tả được các cấp độ tổ chức từ tế bào đến cơ thể.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Sinh vật nào sau đây là cơ thể đơn bào?", options: ["Cây lúa", "Con giun đất", "Trùng roi", "Cây rêu"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Thứ tự đúng các cấp độ tổ chức của cơ thể đa bào là", options: ["Tế bào → mô → cơ quan → hệ cơ quan → cơ thể", "Mô → tế bào → cơ quan → hệ cơ quan → cơ thể", "Tế bào → cơ quan → mô → hệ cơ quan → cơ thể", "Cơ thể → hệ cơ quan → mô → cơ quan → tế bào"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Ở thực vật có hoa, hệ chồi gồm những cơ quan nào?", options: ["Rễ, thân, lá", "Thân, lá, hoa, quả", "Rễ, hoa, quả", "Chỉ có hoa và quả"], answer: 1, explanation: "Cây có hoa có hai hệ cơ quan: hệ rễ và hệ chồi (thân, lá, hoa, quả)." },
      { t: "tf", lv: "TH", stem: "Bạn Nam nói: “Con người là cơ thể đa bào; hệ tiêu hoá gồm nhiều cơ quan như dạ dày, ruột; dạ dày được cấu tạo từ nhiều loại mô.” Xét tính đúng/sai của các nhận định sau.", statements: ["Mô là tập hợp các tế bào giống nhau cùng thực hiện một chức năng nhất định.", "Dạ dày là một mô.", "Hệ tiêu hoá là một hệ cơ quan.", "Cơ thể đơn bào được cấu tạo từ nhiều tế bào."], answer: [true, false, true, false], explanation: "Dạ dày là một cơ quan; cơ thể đơn bào chỉ gồm một tế bào." },
      { t: "essay", lv: "VD", stem: "Lấy một ví dụ về hệ cơ quan ở người, kể tên các cơ quan của hệ đó. Giải thích vì sao khi em chạy bộ, các hệ cơ quan phải phối hợp với nhau.", rubric: "Nêu đúng một hệ cơ quan và các cơ quan của hệ, ví dụ hệ hô hấp gồm mũi, khí quản, phổi (0,5đ); giải thích khi chạy hệ vận động hoạt động mạnh (0,5đ); hệ hô hấp tăng nhịp thở để lấy O₂, thải CO₂ (0,5đ); hệ tuần hoàn tăng nhịp tim để vận chuyển O₂ và chất dinh dưỡng đến cơ (0,5đ).", points: 2 },
    ],
  },
  // ---------- Lịch sử và Địa lí 6 ----------
  {
    subject: "Lịch sử và Địa lí", grade: 6, topic: "Thời gian trong lịch sử", week: 3,
    yccd: "Nêu được một số khái niệm thời gian (thập kỉ, thế kỉ, thiên niên kỉ, trước Công nguyên, Công nguyên); tính được thời gian trong lịch sử theo âm lịch, dương lịch.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Một thế kỉ là bao nhiêu năm?", options: ["10 năm", "100 năm", "1000 năm", "50 năm"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Âm lịch là cách tính thời gian dựa theo", options: ["sự di chuyển của Trái Đất quanh Mặt Trời", "sự thay đổi của các mùa trong năm", "số lần thuỷ triều lên xuống", "sự di chuyển của Mặt Trăng quanh Trái Đất"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Năm 2026 thuộc thế kỉ nào và thiên niên kỉ nào?", options: ["Thế kỉ XX, thiên niên kỉ II", "Thế kỉ XXI, thiên niên kỉ II", "Thế kỉ XXI, thiên niên kỉ III", "Thế kỉ XX, thiên niên kỉ III"], answer: 2, explanation: "Thế kỉ XXI tính từ năm 2001 đến 2100; thiên niên kỉ III từ năm 2001 đến 3000." },
      { t: "tf", lv: "VD", stem: "Năm 40, Hai Bà Trưng phất cờ khởi nghĩa; năm 179 TCN, Triệu Đà xâm lược nước Âu Lạc. Xét tính đúng/sai của các nhận định sau.", statements: ["Năm 40 thuộc thế kỉ I.", "Năm 179 TCN diễn ra sau năm 40.", "Tính đến năm 2026, khởi nghĩa Hai Bà Trưng đã cách đây 1986 năm.", "Năm 179 TCN thuộc thế kỉ II TCN."], answer: [true, false, true, true], explanation: "2026 − 40 = 1986; các năm trước Công nguyên diễn ra trước các năm Công nguyên." },
      { t: "essay", lv: "VD", stem: "Tết Nguyên đán của người Việt được tính theo âm lịch, còn ngày Quốc khánh 2/9 được tính theo dương lịch. Em hãy giải thích vì sao ngày Tết Nguyên đán mỗi năm rơi vào những ngày dương lịch khác nhau và nêu ý nghĩa của việc dùng song song hai loại lịch ở Việt Nam.", rubric: "Nêu đúng cơ sở của âm lịch (Mặt Trăng quay quanh Trái Đất) và dương lịch (Trái Đất quay quanh Mặt Trời) (0,5đ); giải thích năm âm lịch ngắn hơn năm dương lịch, có năm nhuận nên ngày Tết lệch nhau (0,75đ); nêu ý nghĩa: âm lịch gắn với mùa vụ, lễ hội truyền thống, dương lịch thống nhất với thế giới (0,75đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 6, topic: "Hệ thống kinh, vĩ tuyến và toạ độ địa lí", week: 6,
    yccd: "Xác định được kinh tuyến gốc, Xích đạo, các bán cầu trên bản đồ, quả Địa Cầu; ghi được toạ độ địa lí của một địa điểm.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Kinh tuyến gốc (0°) là kinh tuyến đi qua", options: ["thủ đô Pa-ri (Pháp)", "thủ đô Hà Nội (Việt Nam)", "đài thiên văn Grin-uých ở Luân Đôn (Anh)", "thành phố Niu Oóc (Hoa Kỳ)"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Vĩ tuyến gốc (0°) còn được gọi là", options: ["chí tuyến Bắc", "vòng cực Bắc", "kinh tuyến gốc", "đường Xích đạo"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Những vĩ tuyến nằm từ Xích đạo đến cực Bắc là", options: ["vĩ tuyến Bắc", "vĩ tuyến Nam", "kinh tuyến Đông", "kinh tuyến Tây"], answer: 0 },
      { t: "tf", lv: "TH", stem: "Điểm A trên bản đồ có toạ độ địa lí (21°B, 105°Đ), gần vị trí thủ đô Hà Nội. Xét tính đúng/sai của các nhận định sau.", statements: ["Điểm A nằm ở nửa cầu Bắc.", "Điểm A nằm ở nửa cầu Tây.", "Vĩ độ của điểm A là 21°B.", "Kinh độ của một điểm là khoảng cách tính bằng độ từ điểm đó đến Xích đạo."], answer: [true, false, true, false], explanation: "105°Đ thuộc nửa cầu Đông; kinh độ tính từ kinh tuyến đi qua điểm đó đến kinh tuyến gốc." },
      { t: "essay", lv: "VD", stem: "Trên quả Địa Cầu, nếu cứ cách 10° vẽ một kinh tuyến thì có tất cả bao nhiêu kinh tuyến? Nếu cứ cách 10° vẽ một vĩ tuyến thì có bao nhiêu vĩ tuyến (kể cả Xích đạo, không tính hai điểm cực)? Trình bày cách tính.", rubric: "Tính đúng số kinh tuyến: 360° : 10° = 36 kinh tuyến (1đ); tính đúng số vĩ tuyến: mỗi nửa cầu có 8 vĩ tuyến (10° đến 80°), cộng Xích đạo được 17 vĩ tuyến (1đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 6, topic: "Ai Cập và Lưỡng Hà cổ đại", week: 11,
    yccd: "Trình bày được tác động của điều kiện tự nhiên (sông Nin, sông Ti-grơ và Ơ-phrát) đến sự hình thành văn minh; nêu được những thành tựu văn hoá chủ yếu.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Văn minh Ai Cập cổ đại hình thành ở lưu vực dòng sông nào?", options: ["Sông Nin", "Sông Hằng", "Sông Hoàng Hà", "Sông Ti-grơ"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Người Lưỡng Hà cổ đại viết chữ hình nêm trên", options: ["giấy pa-pi-rút", "thẻ tre", "các tấm đất sét", "mai rùa, xương thú"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Vì sao cư dân Ai Cập và Lưỡng Hà cổ đại sớm phát triển nghề nông?", options: ["Vì vùng này có nhiều mỏ kim loại", "Vì khí hậu lạnh giá quanh năm", "Vì có nhiều đồng cỏ rộng để chăn nuôi", "Vì đất phù sa màu mỡ, mềm, dễ canh tác và có nguồn nước tưới"], answer: 3 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về thành tựu văn hoá của Ai Cập và Lưỡng Hà cổ đại.", statements: ["Người Ai Cập xây dựng kim tự tháp làm lăng mộ cho các pha-ra-ông.", "Người Lưỡng Hà dùng hệ đếm lấy số 60 làm cơ sở.", "Chữ tượng hình là thành tựu của người Lưỡng Hà, chữ hình nêm là của người Ai Cập.", "Vườn treo Ba-bi-lon là công trình kiến trúc của người Ai Cập."], answer: [true, true, false, false], explanation: "Chữ tượng hình thuộc Ai Cập, chữ hình nêm thuộc Lưỡng Hà; vườn treo Ba-bi-lon ở Lưỡng Hà." },
      { t: "essay", lv: "VD", stem: "Ngày nay, chúng ta vẫn chia một giờ thành 60 phút, một phút thành 60 giây và dùng nhiều kiến thức hình học. Em hãy cho biết những thành tựu nào của Ai Cập và Lưỡng Hà cổ đại vẫn còn được sử dụng đến ngày nay và nêu ý nghĩa của chúng.", rubric: "Nêu được hệ đếm 60 của người Lưỡng Hà dùng để chia thời gian, đo góc (0,5đ); nêu được hệ đếm thập phân, kiến thức hình học của người Ai Cập (0,5đ); nêu thêm ít nhất một thành tựu khác như lịch, chữ viết (0,5đ); rút ra ý nghĩa: đặt nền móng cho khoa học, văn hoá nhân loại (0,5đ).", points: 2 },
    ],
  },

  // ======================= LỚP 7 =======================
  // ---------- Toán 7 ----------
  {
    subject: "Toán", grade: 7, topic: "Luỹ thừa với số mũ tự nhiên của một số hữu tỉ", week: 3,
    yccd: "Thực hiện được phép tính luỹ thừa của số hữu tỉ; vận dụng quy tắc tích, thương hai luỹ thừa cùng cơ số và luỹ thừa của luỹ thừa.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Giá trị của (−1/2)³ là", options: ["−1/8", "1/8", "−3/2", "−1/6"], answer: 0, explanation: "(−1/2)³ = (−1)³/2³ = −1/8." },
      { t: "mcq", lv: "NB", stem: "Với x là số hữu tỉ khác 0, (x³)⁴ bằng", options: ["x⁷", "x⁶⁴", "x¹²", "x⁸¹"], answer: 2, explanation: "(xᵐ)ⁿ = xᵐ·ⁿ nên (x³)⁴ = x¹²." },
      { t: "mcq", lv: "TH", stem: "Kết quả của phép tính (0,5)⁵ · 2⁵ là", options: ["1", "10", "2,5", "10⁵"], answer: 0, explanation: "(0,5)⁵ · 2⁵ = (0,5 · 2)⁵ = 1⁵ = 1." },
      { t: "short", lv: "TH", stem: "Tìm x, biết x : (−3)² = (−3)³.", answer: "−243|-243", explanation: "x = (−3)³ · (−3)² = (−3)⁵ = −243." },
      { t: "essay", lv: "VD", stem: "Khối lượng Trái Đất khoảng 5,97 · 10²⁴ kg, khối lượng Mặt Trăng khoảng 7,35 · 10²² kg. Hỏi khối lượng Trái Đất gấp khoảng bao nhiêu lần khối lượng Mặt Trăng (làm tròn đến hàng đơn vị)?", rubric: "Lập đúng phép chia 5,97 · 10²⁴ : (7,35 · 10²²) (0,5đ); dùng quy tắc chia hai luỹ thừa cùng cơ số 10²⁴ : 10²² = 10² (0,5đ); tính 597 : 7,35 ≈ 81,2 (0,5đ); kết luận khoảng 81 lần (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 7, topic: "Số vô tỉ. Căn bậc hai số học", week: 6,
    yccd: "Nhận biết được số vô tỉ, căn bậc hai số học của một số không âm; tính được căn bậc hai số học bằng máy tính cầm tay.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Căn bậc hai số học của 49 là", options: ["−7", "7 và −7", "24,5", "7"], answer: 3, explanation: "Căn bậc hai số học là số không âm x sao cho x² = 49, tức x = 7." },
      { t: "mcq", lv: "NB", stem: "Số nào sau đây là số vô tỉ?", options: ["√2", "√9", "0,(3)", "−1/4"], answer: 0, explanation: "√9 = 3; 0,(3) = 1/3; −1/4 đều là số hữu tỉ." },
      { t: "mcq", lv: "TH", stem: "Khẳng định nào sau đây đúng?", options: ["√(−16) = −4", "√16 = ±4", "√0,25 = 0,5", "√(1/9) = 1/81"], answer: 2, explanation: "0,5 ≥ 0 và 0,5² = 0,25." },
      { t: "short", lv: "TH", stem: "Tính √81 − 5 · √0,64.", answer: "5", explanation: "√81 = 9; √0,64 = 0,8 nên 9 − 5 · 0,8 = 9 − 4 = 5." },
      { t: "essay", lv: "VD", stem: "Bác Tư có một mảnh vườn hình vuông diện tích 196 m² để trồng rau. a) Tính độ dài cạnh mảnh vườn. b) Bác muốn rào xung quanh vườn, chừa một lối ra vào rộng 2 m. Tính chiều dài hàng rào cần dùng.", rubric: "a) Lập luận cạnh bằng √196 (0,5đ); tính đúng cạnh 14 m (0,5đ). b) Tính đúng chu vi 4 · 14 = 56 m (0,5đ); trừ lối ra vào, hàng rào dài 54 m (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 7, topic: "Hai đường thẳng song song. Tiên đề Euclid", week: 11,
    yccd: "Nhận biết được các cặp góc tạo bởi một đường thẳng cắt hai đường thẳng; dùng dấu hiệu nhận biết, tính chất hai đường thẳng song song để tính góc.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Đường thẳng c cắt hai đường thẳng phân biệt a và b. Nếu có một cặp góc so le trong bằng nhau thì", options: ["a song song với b", "a cắt b", "a vuông góc với b", "c song song với a"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Theo tiên đề Euclid, qua một điểm M nằm ngoài đường thẳng a", options: ["có vô số đường thẳng song song với a", "có hai đường thẳng song song với a", "không có đường thẳng nào song song với a", "chỉ có một đường thẳng song song với a"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Cho a // b, đường thẳng c cắt a tại A và cắt b tại B. Một góc tại A bằng 65°. Góc tại B ở vị trí trong cùng phía với góc đó có số đo là", options: ["65°", "115°", "25°", "130°"], answer: 1, explanation: "Hai góc trong cùng phía bù nhau: 180° − 65° = 115°." },
      { t: "short", lv: "VD", stem: "Cho a // b, đường thẳng c cắt a tại A và cắt b tại B. Hai góc trong cùng phía tại A và B có góc tại A gấp 3 lần góc tại B. Tính số đo góc tại A (đơn vị độ).", answer: "135", explanation: "Góc A + góc B = 180° và góc A = 3 · góc B nên góc B = 45°, góc A = 135°." },
      { t: "essay", lv: "VD", stem: "Cho hai đường thẳng a và b cùng vuông góc với đường thẳng d. a) Chứng minh a // b. b) Đường thẳng c cắt a tại M và cắt b tại N, tạo với a một góc nhọn tại M bằng 40°. Tính số đo các góc tạo bởi c và b tại N. Giải thích.", rubric: "a) Chỉ ra cặp góc đồng vị (hoặc so le trong) cùng bằng 90° (0,5đ); kết luận a // b theo dấu hiệu nhận biết (0,5đ). b) Dùng tính chất hai đường thẳng song song suy ra tại N có góc nhọn bằng 40° (0,5đ); tính đúng các góc còn lại là 140°, 40°, 140° nhờ góc kề bù, đối đỉnh (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 7, topic: "Tổng các góc trong một tam giác", week: 14,
    yccd: "Giải thích được định lí tổng ba góc trong một tam giác bằng 180°; tính được số đo góc của tam giác.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Tổng ba góc trong một tam giác bằng", options: ["90°", "180°", "360°", "270°"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Trong một tam giác vuông, hai góc nhọn", options: ["bằng nhau", "kề bù", "phụ nhau", "bù nhau"], answer: 2, explanation: "Tổng hai góc nhọn của tam giác vuông bằng 180° − 90° = 90°." },
      { t: "mcq", lv: "TH", stem: "Tam giác ABC có Â = 70°, B̂ = 45°. Số đo góc C là", options: ["65°", "115°", "75°", "245°"], answer: 0, explanation: "Ĉ = 180° − (70° + 45°) = 65°." },
      { t: "short", lv: "TH", stem: "Tam giác MNP có M̂ = 2N̂ và N̂ = P̂. Tính số đo góc M (đơn vị độ).", answer: "90", explanation: "2N̂ + N̂ + N̂ = 180° nên N̂ = 45°, M̂ = 90°." },
      { t: "essay", lv: "VD", stem: "Mặt cắt một mái nhà là tam giác ABC có hai góc ở đáy B̂ = Ĉ và góc ở đỉnh Â = 110°. a) Tính số đo mỗi góc ở đáy. b) Chú Hải muốn mái dốc hơn nên giảm góc ở đỉnh xuống còn 100° (hai góc ở đáy vẫn bằng nhau). Khi đó mỗi góc ở đáy tăng thêm bao nhiêu độ?", rubric: "a) Áp dụng tổng ba góc: B̂ + Ĉ = 180° − 110° = 70° (0,5đ); suy ra B̂ = Ĉ = 35° (0,5đ). b) Tính được mỗi góc ở đáy mới bằng (180° − 100°) : 2 = 40° (0,5đ); kết luận tăng thêm 5° (0,5đ).", points: 2 },
    ],
  },
  // ---------- Ngữ văn 7 ----------
  {
    subject: "Ngữ văn", grade: 7, topic: "Truyện: Bầy chim chìa vôi (Nguyễn Quang Thiều)", week: 2,
    yccd: "Nhận biết được ngôi kể, đặc điểm nhân vật qua lời nói, hành động, suy nghĩ; hiểu được tình yêu thiên nhiên, loài vật của trẻ em.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Truyện “Bầy chim chìa vôi” được kể theo ngôi thứ mấy?", options: ["Ngôi thứ ba", "Ngôi thứ nhất, người kể là Mon", "Ngôi thứ nhất, người kể là Mên", "Ngôi thứ hai"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Hai nhân vật chính trong truyện “Bầy chim chìa vôi” là", options: ["Dế Mèn và Dế Choắt", "Sơn và chị Lan", "Hai anh em Mon và Mên", "An và Cò"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Việc hai anh em thao thức lo cho bầy chim chìa vôi trong đêm mưa nước lên cho thấy điều gì ở các em?", options: ["Các em sợ bị bố mẹ mắng", "Các em muốn bắt chim non về nuôi", "Các em thích được đi chơi đêm", "Các em có tâm hồn trong sáng, giàu lòng yêu thương loài vật"], answer: 3 },
      { t: "tf", lv: "TH", stem: "Đọc đoạn văn (tự soạn, mô phỏng tình huống trong truyện): “Mưa vẫn rơi lộp độp trên mái lá. Mon trở mình, thì thầm: – Anh ơi, nước lên thế này thì tổ chim ngoài bãi có ngập không? Mên im lặng một lúc rồi bảo: – Mình phải ra xem thôi.” Xét tính đúng/sai của các nhận định sau.", statements: ["Lời thoại giúp bộc lộ suy nghĩ, tâm trạng của nhân vật.", "Câu hỏi của Mon thể hiện sự thờ ơ với bầy chim.", "Câu “Mình phải ra xem thôi.” cho thấy Mên quyết đoán, dám hành động.", "Đoạn văn được kể theo ngôi thứ nhất."], answer: [true, false, true, false] },
      { t: "essay", lv: "VD", stem: "Viết đoạn văn (khoảng 150–200 chữ) phân tích đặc điểm nhân vật Mon hoặc Mên trong truyện “Bầy chim chìa vôi”, chú ý lời nói, hành động và suy nghĩ của nhân vật.", rubric: "Đúng hình thức đoạn văn, có câu chủ đề (0,5đ); chỉ ra đặc điểm nhân vật qua lời nói, hành động, suy nghĩ, có dẫn chứng (1,5đ); nhận xét nghệ thuật xây dựng nhân vật (0,5đ); diễn đạt mạch lạc, đúng chính tả (0,5đ).", points: 3 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 7, topic: "Thơ bốn chữ, năm chữ", week: 6,
    yccd: "Nhận biết được số chữ, vần, nhịp, hình ảnh của thơ bốn chữ, năm chữ; hiểu được tình cảm, cảm xúc của người viết.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Đọc đoạn thơ (tự soạn): “Sáng nay em dậy / Nghe chim hót vang / Đồng xa lúa chín / Rực một màu vàng.” Đoạn thơ được viết theo thể thơ nào?", options: ["Thơ năm chữ", "Thơ bốn chữ", "Thơ lục bát", "Thơ tự do"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Trong đoạn thơ “Sáng nay em dậy / Nghe chim hót vang / Đồng xa lúa chín / Rực một màu vàng.”, hai tiếng nào gieo vần với nhau?", options: ["dậy – chín", "chim – xa", "vang – vàng", "em – đồng"], answer: 2, explanation: "“vang” và “vàng” cùng vần “ang”, gieo ở cuối dòng 2 và dòng 4 (vần chân, vần cách)." },
      { t: "mcq", lv: "TH", stem: "Đọc đoạn thơ năm chữ (tự soạn): “Mẹ ra đồng từ sớm / Sương đẫm ướt đôi vai / Con nhìn theo bóng mẹ / Thương mẹ những ngày dài.” Cảm xúc chủ đạo của đoạn thơ là gì?", options: ["Niềm vui khi được đi chơi", "Nỗi sợ hãi trước cánh đồng", "Sự trách móc vì mẹ đi làm sớm", "Tình yêu thương, biết ơn sự vất vả của mẹ"], answer: 3 },
      { t: "tf", lv: "TH", stem: "Với đoạn thơ “Mẹ ra đồng từ sớm / Sương đẫm ướt đôi vai / Con nhìn theo bóng mẹ / Thương mẹ những ngày dài”, xét tính đúng/sai của các nhận định sau.", statements: ["Mỗi dòng thơ có năm chữ.", "Tiếng “vai” và tiếng “dài” gieo vần với nhau.", "Đoạn thơ chủ yếu ngắt nhịp 1/4.", "Hình ảnh “sương đẫm ướt đôi vai” gợi sự vất vả của mẹ."], answer: [true, true, false, true], explanation: "Thơ năm chữ thường ngắt nhịp 3/2 hoặc 2/3, ví dụ “Mẹ ra đồng / từ sớm”." },
      { t: "essay", lv: "VD", stem: "Viết đoạn văn (khoảng 150–200 chữ) ghi lại cảm xúc của em về một bài thơ bốn chữ hoặc năm chữ đã học hoặc đã đọc.", rubric: "Đúng hình thức đoạn văn, nêu tên bài thơ, tác giả (0,5đ); thể hiện cảm xúc về nội dung, hình ảnh tiêu biểu (1đ); nhận xét được nét nghệ thuật: vần, nhịp, biện pháp tu từ (1đ); diễn đạt mạch lạc, đúng chính tả (0,5đ).", points: 3 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 7, topic: "Thơ: Mùa xuân nho nhỏ (Thanh Hải)", week: 11,
    yccd: "Nhận biết và phân tích được tác dụng của biện pháp tu từ, hình ảnh trong bài thơ; hiểu được khát vọng cống hiến của nhà thơ.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Bài thơ “Mùa xuân nho nhỏ” được viết theo thể thơ nào?", options: ["Thơ năm chữ", "Thơ bốn chữ", "Thơ lục bát", "Thơ bảy chữ"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Thanh Hải sáng tác bài thơ “Mùa xuân nho nhỏ” trong hoàn cảnh nào?", options: ["Khi đang chiến đấu ở chiến trường miền Nam năm 1965", "Năm 1980, không bao lâu trước khi nhà thơ qua đời", "Khi nhà thơ đi công tác ở nước ngoài", "Ngay sau Cách mạng tháng Tám năm 1945"], answer: 1, explanation: "Bài thơ viết tháng 11/1980, khi nhà thơ đang nằm trên giường bệnh." },
      { t: "mcq", lv: "TH", stem: "Đọc khổ thơ: “Ta làm con chim hót / Ta làm một cành hoa / Ta nhập vào hoà ca / Một nốt trầm xao xuyến.” Điệp ngữ “ta làm” góp phần thể hiện điều gì?", options: ["Ước muốn hoá thân thành chim và hoa để rời xa cuộc đời", "Nỗi buồn vì cuộc đời quá ngắn ngủi", "Ước nguyện chân thành, khiêm nhường được cống hiến một phần nhỏ bé cho cuộc đời", "Niềm tự hào vì mình là người quan trọng nhất"], answer: 2 },
      { t: "tf", lv: "TH", stem: "Đọc khổ thơ đầu: “Mọc giữa dòng sông xanh / Một bông hoa tím biếc / Ơi con chim chiền chiện / Hót chi mà vang trời”. Xét tính đúng/sai của các nhận định sau.", statements: ["Khổ thơ vẽ nên bức tranh thiên nhiên mùa xuân xứ Huế.", "Câu “Mọc giữa dòng sông xanh” sử dụng biện pháp đảo ngữ.", "Từ “ơi” và câu hỏi tu từ thể hiện cảm xúc say sưa, trìu mến của tác giả.", "Khổ thơ diễn tả nỗi buồn chán của tác giả trước cảnh vật."], answer: [true, true, true, false], explanation: "Động từ “mọc” được đặt lên đầu câu (đảo ngữ), nhấn mạnh sức sống của mùa xuân." },
      { t: "essay", lv: "VD", stem: "Từ khổ thơ “Ta làm con chim hót…”, em hãy viết đoạn văn (khoảng 150–200 chữ) bày tỏ suy nghĩ về việc mỗi người, dù nhỏ bé, cũng có thể góp một “mùa xuân nho nhỏ” cho quê hương, đất nước.", rubric: "Đúng hình thức đoạn văn, dung lượng phù hợp (0,5đ); giải thích được ý nghĩa hình ảnh “mùa xuân nho nhỏ” (0,75đ); nêu được việc làm cụ thể của học sinh để cống hiến (1đ); liên hệ bản thân chân thành (0,5đ); diễn đạt trong sáng, đúng chính tả (0,25đ).", points: 3 },
    ],
  },
  // ---------- Tiếng Anh 7 ----------
  {
    subject: "Tiếng Anh", grade: 7, topic: "Unit 1: Hobbies", week: 2,
    yccd: "Dùng được thì hiện tại đơn và động từ chỉ sự yêu thích + V-ing để nói về sở thích.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: My brother loves ___ models of cars.", options: ["making", "make", "makes", "made"], answer: 0, explanation: "love + V-ing." },
      { t: "mcq", lv: "NB", stem: "My sister enjoys ___ because she likes taking care of plants.", options: ["horse riding", "collecting stamps", "gardening", "doing judo"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "___ your father ___ fishing at weekends? – Yes, he does.", options: ["Do / go", "Is / going", "Does / goes", "Does / go"], answer: 3, explanation: "Câu hỏi thì hiện tại đơn với chủ ngữ số ít: Does + S + V (nguyên mẫu)?" },
      { t: "tf", lv: "TH", stem: "Read the passage: “My name is Nga. My hobby is building dollhouses. I started it two years ago when my aunt gave me a small dollhouse kit. It takes me about a month to finish one house. My hobby is not expensive because I use old paper boxes and pieces of cloth. It makes me patient and creative.” Decide whether each statement is true or false.", statements: ["Nga's hobby is building dollhouses.", "Nga's uncle gave her the first dollhouse kit.", "Her hobby is very expensive.", "Building dollhouses makes Nga more patient."], answer: [true, false, false, true] },
      { t: "essay", lv: "VD", stem: "Write 5–6 sentences about your hobby: what it is, when you started it, how often you do it and why you like it.", rubric: "Đủ ý: tên sở thích, thời điểm bắt đầu, mức độ thường xuyên, lí do yêu thích (1đ); dùng đúng thì hiện tại đơn và cấu trúc like/love/enjoy + V-ing (0,5đ); câu đúng ngữ pháp, ít lỗi chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 7, topic: "Unit 3: Community Service", week: 7,
    yccd: "Dùng được thì quá khứ đơn để kể về các hoạt động tình nguyện, phục vụ cộng đồng.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: Last summer, we ___ trees in our neighbourhood.", options: ["plant", "planted", "planting", "plants"], answer: 1, explanation: "“Last summer” là dấu hiệu của thì quá khứ đơn." },
      { t: "mcq", lv: "NB", stem: "Every year, our class ___ books to children in mountainous areas.", options: ["donates", "destroys", "borrows", "throws"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "___ you ___ the elderly people at the nursing home last weekend?", options: ["Do / visit", "Did / visited", "Did / visit", "Were / visit"], answer: 2, explanation: "Câu hỏi quá khứ đơn: Did + S + V (nguyên mẫu)?" },
      { t: "tf", lv: "TH", stem: "Read the passage: “Last month, the students of class 7A3 joined a project called Clean Beach. They collected rubbish on Cửa Lò Beach and put it into bags. They also put up signs to remind tourists not to litter. After that, they recycled the plastic bottles they collected into flower pots.” Decide whether each statement is true or false.", statements: ["The students joined the project last month.", "They collected rubbish in a park.", "They put up signs for tourists.", "They threw away all the plastic bottles."], answer: [true, false, true, false] },
      { t: "essay", lv: "VD", stem: "Write 5–6 sentences about a community activity you or your class did (what, when, where, who joined and how you felt). Use the past simple.", rubric: "Kể đủ: hoạt động, thời gian, địa điểm, người tham gia, cảm nghĩ (1đ); dùng đúng thì quá khứ đơn (0,5đ); câu đúng ngữ pháp, ít lỗi chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 7, topic: "Unit 4: Music and Arts", week: 11,
    yccd: "So sánh được sự vật bằng (not) as … as, the same as, different from; nói về âm nhạc và nghệ thuật.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Water puppetry is a traditional ___ of Viet Nam.", options: ["instrument", "musician", "painter", "art form"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "My drawing is ___ yours. We both drew Hạ Long Bay with the same colours.", options: ["different", "the same as", "as same as", "same"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Choose the correct answer: In my class, the đàn bầu is not ___ the guitar.", options: ["as popular as", "popular than", "more popular as", "the same popular"], answer: 0, explanation: "Cấu trúc so sánh không bằng: not as + tính từ + as." },
      { t: "tf", lv: "TH", stem: "Read the passage: “Quan họ is a kind of folk singing from Bắc Ninh. People often sing it at festivals in spring. Quan họ songs are different from pop songs: the singers do not use modern instruments and they often sing in pairs. My grandparents love quan họ, but my brother thinks pop music is more exciting.” Decide whether each statement is true or false.", statements: ["Quan họ comes from Bắc Ninh.", "People usually sing quan họ at festivals in autumn.", "Quan họ singers often sing in pairs.", "The writer's brother finds quan họ more exciting than pop music."], answer: [true, false, true, false] },
      { t: "essay", lv: "VD", stem: "Write 5–6 sentences comparing two kinds of music or art you know (for example, quan họ and pop music). Use (not) as … as, the same as or different from.", rubric: "Giới thiệu được hai loại hình (0,5đ); dùng đúng ít nhất hai cấu trúc so sánh đã học (0,75đ); nội dung hợp lí, có ý kiến cá nhân (0,5đ); ít lỗi ngữ pháp, chính tả (0,25đ).", points: 2 },
    ],
  },
  // ---------- KHTN 7 ----------
  {
    subject: "Khoa học tự nhiên", grade: 7, topic: "Nguyên tử", week: 3,
    yccd: "Mô tả được cấu tạo nguyên tử gồm hạt nhân (proton, neutron) và vỏ nguyên tử (electron); tính được khối lượng nguyên tử theo đơn vị amu.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Hạt nào sau đây mang điện tích âm?", options: ["Proton", "Electron", "Neutron", "Hạt nhân"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Hạt nhân nguyên tử được tạo bởi", options: ["proton và electron", "neutron và electron", "proton và neutron", "chỉ có electron"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Nguyên tử sodium có 11 proton. Số electron ở lớp ngoài cùng của nguyên tử sodium là", options: ["1", "2", "8", "11"], answer: 0, explanation: "11 electron xếp thành các lớp 2, 8, 1." },
      { t: "short", lv: "TH", stem: "Nguyên tử aluminium có 13 proton và 14 neutron. Khối lượng nguyên tử aluminium xấp xỉ bao nhiêu amu?", answer: "27", explanation: "Khối lượng nguyên tử tập trung ở hạt nhân: 13 + 14 = 27 amu." },
      { t: "essay", lv: "VD", stem: "Nguyên tử X có tổng số hạt proton, neutron, electron là 18, trong đó số hạt không mang điện bằng số hạt mang điện dương. a) Tìm số proton, neutron, electron của X. b) Mô tả sự sắp xếp electron vào các lớp và cho biết X có bao nhiêu electron ở lớp ngoài cùng.", rubric: "a) Lập được p = e và n = p (0,5đ); giải được p = e = n = 6 (0,5đ). b) Mô tả đúng lớp thứ nhất có 2 electron, lớp thứ hai có 4 electron (0,5đ); kết luận có 4 electron ở lớp ngoài cùng (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 7, topic: "Tốc độ chuyển động", week: 7,
    yccd: "Nêu được ý nghĩa vật lí của tốc độ; vận dụng công thức v = s/t để tính tốc độ, quãng đường, thời gian.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Công thức tính tốc độ là", options: ["v = s · t", "v = t/s", "v = s + t", "v = s/t"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Đơn vị nào sau đây là đơn vị của tốc độ?", options: ["km/h", "km · h", "m²", "N"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Một ô tô chạy trên quốc lộ với tốc độ 54 km/h. Đổi ra đơn vị m/s, tốc độ của ô tô là", options: ["5,4 m/s", "15 m/s", "194,4 m/s", "20 m/s"], answer: 1, explanation: "1 m/s = 3,6 km/h nên 54 : 3,6 = 15 m/s." },
      { t: "short", lv: "VD", stem: "Bạn An đạp xe từ nhà đến trường, quãng đường dài 3,6 km, hết 15 phút. Tốc độ của An là bao nhiêu km/h?", answer: "14,4", explanation: "15 phút = 0,25 h; v = 3,6 : 0,25 = 14,4 km/h." },
      { t: "essay", lv: "VD", stem: "Lúc 6 giờ 30 phút, chú Tuấn chở hàng bằng xe tải từ Hà Nội đi Hải Phòng (quãng đường khoảng 120 km) với tốc độ trung bình 60 km/h. Giữa đường chú nghỉ 15 phút. a) Tính thời gian xe chạy trên đường. b) Chú Tuấn đến Hải Phòng lúc mấy giờ?", rubric: "a) Viết đúng công thức t = s/v (0,5đ); tính được t = 120 : 60 = 2 giờ (0,5đ). b) Cộng thêm thời gian nghỉ, tổng 2 giờ 15 phút (0,5đ); kết luận đến nơi lúc 8 giờ 45 phút (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 7, topic: "Quang hợp ở thực vật", week: 11,
    yccd: "Mô tả được quá trình quang hợp (nguyên liệu, sản phẩm, điều kiện); nêu được vai trò của lá và ý nghĩa của quang hợp.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Nguyên liệu của quá trình quang hợp là", options: ["oxygen và glucose", "nước và carbon dioxide", "nước và oxygen", "glucose và carbon dioxide"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Bào quan thực hiện quá trình quang hợp trong tế bào lá là", options: ["ti thể", "nhân", "lục lạp", "không bào"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Trong quá trình quang hợp, năng lượng được chuyển hoá như thế nào?", options: ["Quang năng → hoá năng", "Hoá năng → quang năng", "Nhiệt năng → quang năng", "Hoá năng → nhiệt năng"], answer: 0, explanation: "Năng lượng ánh sáng được chuyển thành năng lượng hoá học tích luỹ trong chất hữu cơ." },
      { t: "tf", lv: "TH", stem: "Bác Ba trồng rau cải trong vườn. Xét tính đúng/sai của các nhận định về quang hợp ở cây rau.", statements: ["Cây rau cần ánh sáng để quang hợp.", "Lá cây hấp thụ khí oxygen để làm nguyên liệu quang hợp.", "Diệp lục giúp lá hấp thụ năng lượng ánh sáng.", "Sản phẩm của quang hợp là glucose và oxygen."], answer: [true, false, true, true], explanation: "Lá hấp thụ khí carbon dioxide (không phải oxygen) để quang hợp." },
      { t: "essay", lv: "VD", stem: "Vì sao trồng nhiều cây xanh ở sân trường, khu dân cư giúp không khí trong lành hơn? Nêu hai việc học sinh có thể làm để bảo vệ cây xanh.", rubric: "Giải thích cây quang hợp hấp thụ khí carbon dioxide (0,5đ) và thải ra khí oxygen (0,5đ); nêu thêm vai trò khác như tạo bóng mát, giảm bụi (0,25đ); nêu đúng hai việc làm cụ thể (0,75đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 7, topic: "Sóng âm. Độ to và độ cao của âm", week: 14,
    yccd: "Mô tả được sự truyền sóng âm; liên hệ được độ to của âm với biên độ, độ cao của âm với tần số dao động.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Âm thanh không truyền được trong môi trường nào?", options: ["Chất rắn", "Chất lỏng", "Chất khí", "Chân không"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Đơn vị đo tần số là", options: ["hertz (Hz)", "decibel (dB)", "mét (m)", "giây (s)"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Khi gảy mạnh dây đàn ghi-ta, âm phát ra to hơn vì", options: ["tần số dao động của dây tăng", "biên độ dao động của dây lớn hơn", "dây đàn dao động chậm hơn", "dây đàn ngừng dao động"], answer: 1 },
      { t: "short", lv: "VD", stem: "Cánh của một con muỗi thực hiện 3000 dao động trong 5 giây. Tần số dao động của cánh muỗi là bao nhiêu Hz?", answer: "600", explanation: "f = 3000 : 5 = 600 Hz." },
      { t: "essay", lv: "VD", stem: "Nhà bạn Khoa ở gần quốc lộ, ban đêm có nhiều xe tải chạy qua gây ồn. Em hãy đề xuất ít nhất ba biện pháp giảm ô nhiễm tiếng ồn cho gia đình bạn Khoa và giải thích ngắn gọn.", rubric: "Nêu đúng mỗi biện pháp kèm giải thích (0,5đ × 3 = 1,5đ), ví dụ: trồng cây xanh trước nhà để cản và hấp thụ bớt âm; xây tường, lắp cửa kính cách âm để ngăn đường truyền âm; dùng rèm dày, thảm, vật liệu tiêu âm; trình bày rõ ràng, hợp lí (0,5đ).", points: 2 },
    ],
  },
  // ---------- Lịch sử và Địa lí 7 ----------
  {
    subject: "Lịch sử và Địa lí", grade: 7, topic: "Các cuộc phát kiến địa lí", week: 3,
    yccd: "Mô tả được sơ lược các cuộc phát kiến địa lí; nêu được tác động của phát kiến địa lí đối với tiến trình lịch sử.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Năm 1492, nhà hàng hải C. Cô-lôm-bô đã", options: ["vòng qua mũi Hảo Vọng", "đến Ấn Độ bằng đường biển", "phát hiện ra châu Mỹ", "thực hiện chuyến đi vòng quanh thế giới"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Ai chỉ huy đoàn thám hiểm thực hiện chuyến đi vòng quanh thế giới đầu tiên bằng đường biển (1519–1522)?", options: ["Ph. Ma-gien-lăng", "Va-xcô đơ Ga-ma", "B. Đi-a-xơ", "C. Cô-lôm-bô"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Một trong những nguyên nhân dẫn đến các cuộc phát kiến địa lí là", options: ["người châu Âu muốn tránh xa biển cả", "nhu cầu tìm nguồn nguyên liệu, vàng bạc và thị trường mới", "các nước phương Đông mời người châu Âu sang buôn bán", "châu Âu bị thiên tai tàn phá nặng nề"], answer: 1 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về hệ quả của các cuộc phát kiến địa lí.", statements: ["Phát kiến địa lí đem lại hiểu biết mới về Trái Đất, những con đường mới và vùng đất mới.", "Phát kiến địa lí làm thương mại thế giới bị thu hẹp.", "Phát kiến địa lí thúc đẩy sự hình thành quan hệ sản xuất tư bản chủ nghĩa ở châu Âu.", "Phát kiến địa lí làm nảy sinh quá trình xâm chiếm, cướp bóc thuộc địa."], answer: [true, false, true, true] },
      { t: "essay", lv: "VD", stem: "Em hãy nêu hai tác động tích cực và một tác động tiêu cực của các cuộc phát kiến địa lí. Theo em, hệ quả nào còn ảnh hưởng đến thế giới ngày nay?", rubric: "Nêu đúng hai tác động tích cực, như mở rộng hiểu biết về Trái Đất, thúc đẩy giao lưu kinh tế, văn hoá (1đ); nêu đúng một tác động tiêu cực như nạn buôn bán nô lệ, xâm chiếm thuộc địa (0,5đ); liên hệ được ảnh hưởng ngày nay, có lí lẽ hợp lí (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 7, topic: "Vị trí địa lí và đặc điểm tự nhiên châu Âu", week: 7,
    yccd: "Trình bày được vị trí địa lí, hình dạng, kích thước châu Âu; xác định được các khu vực địa hình, đới khí hậu và sông lớn của châu Âu.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Ở phía đông, châu Âu ngăn cách với châu Á chủ yếu bởi dãy núi nào?", options: ["Dãy U-ran", "Dãy An-pơ", "Dãy Hi-ma-lay-a", "Dãy Py-rê-nê"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Dạng địa hình chiếm phần lớn diện tích châu Âu là", options: ["núi già", "núi trẻ", "cao nguyên", "đồng bằng"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Phần lớn lãnh thổ châu Âu có khí hậu", options: ["nhiệt đới", "xích đạo", "ôn đới", "cận nhiệt đới gió mùa"], answer: 2 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về tự nhiên châu Âu.", statements: ["Châu Âu tiếp giáp Bắc Băng Dương, Đại Tây Dương và biển Địa Trung Hải.", "Sông Von-ga là con sông dài nhất châu Âu.", "Đường bờ biển châu Âu ít bị cắt xẻ, rất ít bán đảo.", "Càng về phía đông, khí hậu châu Âu càng ẩm và mưa nhiều hơn."], answer: [true, true, false, false], explanation: "Bờ biển châu Âu bị cắt xẻ mạnh, nhiều bán đảo; càng vào sâu phía đông khí hậu càng khô, tính lục địa tăng." },
      { t: "essay", lv: "VD", stem: "Vì sao ở cùng vĩ độ, vùng ven biển Tây Âu có mùa đông ấm và mưa nhiều hơn vùng nằm sâu trong lục địa ở phía đông?", rubric: "Nêu được ảnh hưởng của dòng biển nóng Bắc Đại Tây Dương (0,75đ); gió Tây ôn đới thổi từ biển vào mang hơi ấm, ẩm (0,75đ); càng vào sâu nội địa ảnh hưởng của biển càng giảm nên khí hậu lạnh, khô hơn (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 7, topic: "Trung Quốc từ thế kỉ VII đến giữa thế kỉ XIX", week: 11,
    yccd: "Lập được sơ đồ tiến trình các triều đại; nêu được những thành tựu chủ yếu về văn hoá, khoa học – kĩ thuật của Trung Quốc thời kì này.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Triều đại nào được coi là thời kì thịnh vượng nhất của chế độ phong kiến Trung Quốc?", options: ["Nhà Tần", "Nhà Thanh", "Nhà Đường", "Nhà Nguyên"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Tác phẩm nào sau đây KHÔNG thuộc bốn tiểu thuyết lớn (tứ đại danh tác) của văn học Trung Quốc?", options: ["Tam quốc diễn nghĩa", "Thuỷ hử", "Hồng lâu mộng", "Truyền kì mạn lục"], answer: 3, explanation: "“Truyền kì mạn lục” là tác phẩm của Nguyễn Dữ (Việt Nam)." },
      { t: "mcq", lv: "TH", stem: "Thứ tự đúng của các triều đại phong kiến Trung Quốc từ thế kỉ VII đến giữa thế kỉ XIX là", options: ["Đường – Tống – Nguyên – Minh – Thanh", "Tống – Đường – Minh – Nguyên – Thanh", "Đường – Nguyên – Tống – Thanh – Minh", "Minh – Thanh – Đường – Tống – Nguyên"], answer: 0 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về Trung Quốc thời phong kiến.", statements: ["Thời Đường thực hiện chế độ quân điền, chia ruộng đất cho nông dân.", "Giấy, kĩ thuật in, la bàn, thuốc súng là những phát minh quan trọng của người Trung Quốc.", "Nhà Thanh là triều đại do người Mông Cổ lập ra.", "Chế độ khoa cử được tổ chức để tuyển chọn quan lại."], answer: [true, true, false, true], explanation: "Nhà Thanh do người Mãn lập ra; nhà Nguyên mới do người Mông Cổ lập ra." },
      { t: "essay", lv: "VD", stem: "Nêu hai thành tựu văn hoá, khoa học – kĩ thuật của Trung Quốc thời phong kiến có ảnh hưởng đến Việt Nam và giải thích vì sao có ảnh hưởng đó.", rubric: "Nêu đúng hai thành tựu có ảnh hưởng, như chữ Hán, Nho giáo, chế độ khoa cử, kĩ thuật in (1đ); giải thích do vị trí gần gũi, quá trình giao lưu lâu dài và thời kì Bắc thuộc (0,5đ); nhận xét được sự tiếp thu có chọn lọc của người Việt (0,5đ).", points: 2 },
    ],
  },

  // ======================= LỚP 8 =======================
  // ---------- Toán 8 ----------
  {
    subject: "Toán", grade: 8, topic: "Phép nhân đa thức", week: 3,
    yccd: "Thực hiện được phép nhân đơn thức với đa thức, nhân đa thức với đa thức và rút gọn biểu thức.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Kết quả của phép nhân 3x · (2x² − 5) là", options: ["6x³ − 5", "6x² − 15x", "6x³ − 15x", "5x³ − 15x"], answer: 2, explanation: "Nhân 3x với từng hạng tử: 3x · 2x² − 3x · 5 = 6x³ − 15x." },
      { t: "mcq", lv: "NB", stem: "Tích (x + 2)(x − 3) bằng", options: ["x² − x − 6", "x² + x − 6", "x² − 5x − 6", "x² − 6"], answer: 0, explanation: "x² − 3x + 2x − 6 = x² − x − 6." },
      { t: "mcq", lv: "TH", stem: "Rút gọn biểu thức A = x(x − 4) − (x − 2)(x + 2) được", options: ["−4x − 4", "2x² − 4x − 4", "4", "−4x + 4"], answer: 3, explanation: "x² − 4x − (x² − 4) = −4x + 4." },
      { t: "short", lv: "TH", stem: "Tính giá trị của biểu thức B = (2x − 1)(x + 3) − 2x² tại x = 2.", answer: "7", explanation: "B = 2x² + 5x − 3 − 2x² = 5x − 3; tại x = 2, B = 7." },
      { t: "essay", lv: "VD", stem: "Một mảnh vườn hình chữ nhật có chiều dài (2x + 5) m và chiều rộng (x + 3) m (x > 0). Người ta làm một lối đi rộng 1 m chạy dọc theo chiều dài vườn. a) Viết đa thức biểu thị diện tích mảnh vườn. b) Viết đa thức biểu thị diện tích phần còn lại để trồng rau.", rubric: "a) Lập đúng tích (2x + 5)(x + 3) (0,5đ); thu gọn được 2x² + 11x + 15 (m²) (0,5đ). b) Lập đúng biểu thức (2x + 5)(x + 3) − (2x + 5) · 1 hoặc (2x + 5)(x + 2) (0,5đ); thu gọn được 2x² + 9x + 10 (m²) (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 8, topic: "Hằng đẳng thức đáng nhớ", week: 7,
    yccd: "Nhận biết và vận dụng được các hằng đẳng thức: bình phương của tổng, hiệu; hiệu hai bình phương; lập phương của tổng, hiệu; tổng và hiệu hai lập phương.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Khai triển (a + b)² được", options: ["a² + b²", "a² + 2ab + b²", "a² + ab + b²", "a² − 2ab + b²"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Biểu thức x² − 9 bằng", options: ["(x − 3)²", "(x − 9)(x + 9)", "(x − 3)(x + 3)", "(x + 3)²"], answer: 2, explanation: "Hiệu hai bình phương: a² − b² = (a − b)(a + b)." },
      { t: "mcq", lv: "TH", stem: "Khai triển (2x − 1)³ được", options: ["8x³ − 12x² + 6x − 1", "8x³ − 1", "2x³ − 6x² + 6x − 1", "8x³ − 6x² + 12x − 1"], answer: 0, explanation: "(a − b)³ = a³ − 3a²b + 3ab² − b³ với a = 2x, b = 1." },
      { t: "short", lv: "TH", stem: "Tính nhanh: 101² − 99².", answer: "400", explanation: "(101 − 99)(101 + 99) = 2 · 200 = 400." },
      { t: "essay", lv: "VD", stem: "a) Chứng minh rằng (n + 1)² − (n − 1)² chia hết cho 4 với mọi số nguyên n. b) Tính nhanh 47 · 53 bằng cách dùng hằng đẳng thức.", rubric: "a) Áp dụng đúng hằng đẳng thức, rút gọn được 4n (0,75đ); kết luận chia hết cho 4 (0,25đ). b) Viết được 47 · 53 = (50 − 3)(50 + 3) (0,5đ); tính đúng 2500 − 9 = 2491 (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 8, topic: "Phân tích đa thức thành nhân tử", week: 11,
    yccd: "Phân tích được đa thức thành nhân tử bằng phương pháp đặt nhân tử chung, dùng hằng đẳng thức, nhóm hạng tử.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Phân tích 5x² − 10x thành nhân tử được", options: ["5(x² − 10x)", "x(5x − 2)", "5x(x − 10)", "5x(x − 2)"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Đa thức x² + 6x + 9 được phân tích thành", options: ["(x + 3)²", "(x + 9)²", "(x − 3)²", "(x + 3)(x − 3)"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Phân tích x² − xy + 3x − 3y thành nhân tử được", options: ["(x + y)(x − 3)", "(x − y)(x − 3)", "(x − y)(x + 3)", "(x + y)(x + 3)"], answer: 2, explanation: "x(x − y) + 3(x − y) = (x − y)(x + 3)." },
      { t: "short", lv: "TH", stem: "Tìm x > 0, biết x³ − 16x = 0.", answer: "4", explanation: "x(x − 4)(x + 4) = 0 nên x ∈ {0; 4; −4}; với x > 0 thì x = 4." },
      { t: "essay", lv: "VD", stem: "Cho biểu thức P = x² − 4x + 4 − y². a) Phân tích P thành nhân tử. b) Tính giá trị của P tại x = 52, y = 50.", rubric: "a) Nhóm được (x − 2)² − y² (0,5đ); phân tích đúng thành (x − y − 2)(x + y − 2) (0,5đ). b) Thay số đúng (52 − 50 − 2)(52 + 50 − 2) (0,5đ); tính được P = 0 (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 8, topic: "Hình bình hành", week: 14,
    yccd: "Giải thích được tính chất về cạnh, góc, đường chéo của hình bình hành; nhận biết được tứ giác là hình bình hành.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Trong hình bình hành, hai đường chéo", options: ["bằng nhau", "cắt nhau tại trung điểm của mỗi đường", "vuông góc với nhau", "là các đường phân giác của các góc"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Tứ giác nào sau đây là hình bình hành?", options: ["Tứ giác có hai cạnh đối song song", "Tứ giác có hai cạnh kề bằng nhau", "Tứ giác có hai góc kề một đáy bằng nhau", "Tứ giác có các cạnh đối song song"], answer: 3, explanation: "Tứ giác chỉ có một cặp cạnh đối song song là hình thang." },
      { t: "mcq", lv: "TH", stem: "Hình bình hành ABCD có Â = 70°. Số đo góc B là", options: ["110°", "70°", "140°", "20°"], answer: 0, explanation: "Hai góc kề một cạnh của hình bình hành bù nhau: 180° − 70° = 110°." },
      { t: "short", lv: "VD", stem: "Hình bình hành ABCD có chu vi 40 cm và AB − BC = 4 cm. Tính độ dài cạnh AB (đơn vị cm).", answer: "12", explanation: "AB + BC = 20 và AB − BC = 4 nên AB = 12 cm." },
      { t: "essay", lv: "VD", stem: "Cho hình bình hành ABCD, O là giao điểm của hai đường chéo. Một đường thẳng qua O cắt AB tại E và cắt CD tại F. Chứng minh OE = OF và tứ giác AECF là hình bình hành.", rubric: "Chỉ ra OA = OC theo tính chất đường chéo (0,25đ); chứng minh △OAE = △OCF (g.c.g) với góc OAE = góc OCF (so le trong, AB // CD) và góc AOE = góc COF (đối đỉnh) (0,75đ); suy ra OE = OF (0,25đ); tứ giác AECF có hai đường chéo AC và EF cắt nhau tại trung điểm O của mỗi đường nên là hình bình hành (0,75đ).", points: 2 },
    ],
  },
  // ---------- Ngữ văn 8 ----------
  {
    subject: "Ngữ văn", grade: 8, topic: "Truyện lịch sử: Lá cờ thêu sáu chữ vàng (Nguyễn Huy Tưởng)", week: 2,
    yccd: "Nhận biết được đặc điểm truyện lịch sử: cốt truyện, nhân vật, bối cảnh, ngôn ngữ; phân tích được nhân vật Trần Quốc Toản.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Sáu chữ vàng thêu trên lá cờ của Trần Quốc Toản là", options: ["Sát Thát", "Phá cường địch, báo hoàng ân", "Nam quốc sơn hà Nam đế cư", "Quyết tử cho Tổ quốc quyết sinh"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Truyện “Lá cờ thêu sáu chữ vàng” lấy bối cảnh cuộc kháng chiến nào?", options: ["Kháng chiến chống quân Tống thời Lý", "Kháng chiến chống quân Minh", "Kháng chiến chống quân Mông – Nguyên thời Trần", "Kháng chiến chống quân Thanh"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Chi tiết Trần Quốc Toản uất ức vì không được dự bàn việc nước, vô tình bóp nát quả cam vua ban thể hiện điều gì?", options: ["Lòng yêu nước, căm thù giặc sục sôi của người thiếu niên", "Tính nóng nảy, thiếu tôn trọng nhà vua", "Sự ghen tị với các vương hầu", "Nỗi sợ hãi trước quân giặc"], answer: 0 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về đặc điểm truyện lịch sử qua văn bản “Lá cờ thêu sáu chữ vàng”.", statements: ["Truyện lịch sử tái hiện sự kiện, nhân vật lịch sử có kết hợp hư cấu nghệ thuật.", "Mọi chi tiết trong truyện lịch sử đều phải trùng khớp hoàn toàn với sử sách.", "Nhân vật Trần Quốc Toản được khắc hoạ qua hành động, lời nói, tâm trạng.", "Ngôn ngữ truyện dùng nhiều từ ngữ gợi không khí thời đại như vương hầu, quan gia, gia nô."], answer: [true, false, true, true] },
      { t: "essay", lv: "VD", stem: "Viết bài văn ngắn (khoảng 400 chữ) phân tích nhân vật Trần Quốc Toản trong văn bản “Lá cờ thêu sáu chữ vàng”.", rubric: "Bố cục đủ mở bài, thân bài, kết bài (0,5đ); giới thiệu tác giả, tác phẩm, nhân vật (0,5đ); phân tích lòng yêu nước, khát khao đánh giặc qua hành động, lời nói, tâm trạng, có dẫn chứng (1,5đ); nhận xét nghệ thuật xây dựng nhân vật của truyện lịch sử (0,75đ); đánh giá ý nghĩa nhân vật, liên hệ bản thân (0,5đ); chính tả, diễn đạt (0,25đ).", points: 4 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 8, topic: "Thơ Đường luật: Thu điếu (Nguyễn Khuyến)", week: 6,
    yccd: "Nhận biết được bố cục, niêm, luật, vần, đối của thơ thất ngôn bát cú Đường luật; phân tích được bức tranh thu và tâm trạng nhà thơ.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Bài thơ “Thu điếu” được viết theo thể thơ nào?", options: ["Thất ngôn tứ tuyệt Đường luật", "Song thất lục bát", "Ngũ ngôn bát cú", "Thất ngôn bát cú Đường luật"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Các tiếng “veo, teo, vèo, teo, bèo” ở cuối các câu 1, 2, 4, 6, 8 cho thấy bài “Thu điếu”", options: ["gieo vần chân, vần bằng “eo”", "gieo vần lưng, vần trắc", "không gieo vần", "gieo vần ở tiếng thứ hai mỗi câu"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Hai câu thực “Sóng biếc theo làn hơi gợn tí / Lá vàng trước gió khẽ đưa vèo” sử dụng nổi bật biện pháp nghệ thuật nào?", options: ["Hoán dụ", "Phép đối", "Nói quá", "Liệt kê"], answer: 1, explanation: "“Sóng biếc” đối với “lá vàng”, “hơi gợn tí” đối với “khẽ đưa vèo”." },
      { t: "tf", lv: "TH", stem: "Đọc hai câu kết: “Tựa gối, buông cần lâu chẳng được, / Cá đâu đớp động dưới chân bèo.” Xét tính đúng/sai của các nhận định sau.", statements: ["Hai câu thơ cho thấy nhà thơ đang hào hứng vì câu được nhiều cá.", "Tiếng cá đớp động gợi sự tĩnh lặng của cảnh thu (lấy động tả tĩnh).", "Tư thế “tựa gối, buông cần” gợi tâm trạng trầm ngâm, nhiều suy tư.", "Câu thơ cuối gieo vần “eo” với các câu trước."], answer: [false, true, true, true] },
      { t: "essay", lv: "VD", stem: "Viết bài văn ngắn (khoảng 400 chữ) phân tích bức tranh mùa thu làng quê Bắc Bộ và tâm trạng của nhà thơ trong bài “Thu điếu”.", rubric: "Bố cục rõ ràng, giới thiệu tác giả, tác phẩm (0,5đ); phân tích bức tranh thu: ao thu, thuyền câu, sóng, lá, trời, ngõ trúc với không gian trong, tĩnh, nhỏ (1,25đ); phân tích tâm trạng cô đơn, uẩn khúc, nỗi niềm thời thế của nhà thơ (1đ); nhận xét nghệ thuật: lấy động tả tĩnh, vần “eo”, phép đối (0,75đ); diễn đạt, chính tả (0,5đ).", points: 4 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 8, topic: "Văn nghị luận: Hịch tướng sĩ (Trần Quốc Tuấn)", week: 10,
    yccd: "Nhận biết được luận đề, luận điểm, lí lẽ, bằng chứng trong văn bản nghị luận; hiểu được lòng yêu nước và nghệ thuật lập luận của tác giả.",
    qs: [
      { t: "mcq", lv: "NB", stem: "“Hịch tướng sĩ” được Trần Quốc Tuấn viết trong hoàn cảnh nào?", options: ["Sau khi đánh tan quân Nguyên lần thứ ba", "Trước cuộc kháng chiến chống quân Mông – Nguyên lần thứ hai (1285)", "Khi dời đô từ Hoa Lư ra Đại La", "Khi quân Minh xâm lược nước ta"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Hịch là thể văn", options: ["dùng để kể lại sự tích các anh hùng", "do nhà vua dùng để ban bố mệnh lệnh cho thần dân", "dùng để kêu gọi, cổ vũ, thuyết phục mọi người chống thù trong, giặc ngoài", "dùng để báo cáo kết quả của một cuộc chiến"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Đoạn văn “Ta thường tới bữa quên ăn, nửa đêm vỗ gối; ruột đau như cắt, nước mắt đầm đìa; chỉ căm tức chưa xả thịt lột da, nuốt gan uống máu quân thù…” thể hiện điều gì?", options: ["Lòng căm thù giặc sâu sắc và nỗi đau xót trước vận nước của chủ tướng", "Sự mệt mỏi vì việc triều chính", "Lời trách mắng các tướng sĩ lười biếng", "Niềm vui chiến thắng quân giặc"], answer: 0 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về nghệ thuật lập luận trong “Hịch tướng sĩ”.", statements: ["Tác giả nêu gương các trung thần nghĩa sĩ trong sử sách để khích lệ tướng sĩ.", "Tác giả chỉ dùng lời lẽ ra lệnh, không phân tích đúng sai.", "Tác giả phê phán thái độ ham chơi, hưởng lạc, thờ ơ trước vận nước của tướng sĩ.", "Bài hịch được viết bằng chữ Nôm."], answer: [true, false, true, false], explanation: "Bài hịch viết bằng chữ Hán, lập luận chặt chẽ, kết hợp lí lẽ và tình cảm." },
      { t: "essay", lv: "VD", stem: "Từ tinh thần yêu nước trong “Hịch tướng sĩ”, hãy viết đoạn văn nghị luận (khoảng 200 chữ) trình bày suy nghĩ về trách nhiệm của học sinh hôm nay đối với đất nước.", rubric: "Đúng hình thức đoạn văn nghị luận, nêu rõ luận đề (0,5đ); có lí lẽ thuyết phục về trách nhiệm học tập, rèn luyện, giữ gìn bản sắc (1đ); có bằng chứng cụ thể (0,75đ); liên hệ với văn bản “Hịch tướng sĩ” (0,5đ); diễn đạt mạch lạc, đúng chính tả (0,25đ).", points: 3 },
    ],
  },
  // ---------- Tiếng Anh 8 ----------
  {
    subject: "Tiếng Anh", grade: 8, topic: "Unit 1: Leisure Time", week: 2,
    yccd: "Dùng được động từ chỉ sự yêu thích (like, love, enjoy, prefer, hate…) + V-ing / to V để nói về hoạt động thời gian rảnh.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: My grandfather enjoys ___ the newspaper in the morning.", options: ["to read", "read", "reads", "reading"], answer: 3, explanation: "enjoy chỉ đi với V-ing." },
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: I hate ___ up early on Sundays.", options: ["get", "getting", "got", "gets"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Which sentence is NOT correct?", options: ["She loves doing DIY.", "They prefer playing badminton to watching TV.", "He enjoys to surf the Internet.", "We like going to the park."], answer: 2, explanation: "Phải viết “He enjoys surfing the Internet.”" },
      { t: "tf", lv: "TH", stem: "Read the passage: “In my free time, I love doing DIY. Last month, I made a bookshelf from old wood. My sister prefers hanging out with her friends at the mall. My parents enjoy gardening; they grow vegetables in the small garden behind our house. On Sunday evenings, our family often plays board games together.” Decide whether each statement is true or false.", statements: ["The writer made a bookshelf last month.", "The writer's sister likes doing DIY more than hanging out.", "The parents grow vegetables in a garden.", "The family never plays games together."], answer: [true, false, true, false] },
      { t: "essay", lv: "VD", stem: "Write a paragraph (60–80 words) about how you and your family spend your leisure time. Use at least three verbs of liking.", rubric: "Đủ nội dung: hoạt động của bản thân và các thành viên gia đình (0,75đ); dùng đúng ít nhất 3 động từ chỉ sự yêu thích + V-ing / to V (0,75đ); đoạn văn mạch lạc, ít lỗi ngữ pháp, chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 8, topic: "Unit 3: Teenagers", week: 7,
    yccd: "Dùng được câu đơn, câu ghép với liên từ and, but, or, so; nói về áp lực, sở thích và mạng xã hội của tuổi teen.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: I wanted to join the art club, ___ I didn't have enough time.", options: ["but", "so", "or", "and"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Many teens feel stressed because of ___ from parents and teachers.", options: ["forum", "pressure", "account", "notification"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Which of the following is a compound sentence?", options: ["My brother and I use social media every day.", "Lan studied hard for the exam.", "Nam was tired, so he went to bed early.", "After school, we play football in the park."], answer: 2, explanation: "Câu ghép gồm hai mệnh đề độc lập nối bằng liên từ “so”." },
      { t: "tf", lv: "TH", stem: "Read the passage: “Teenagers today spend a lot of time online. Mai, a Grade 8 student in Đà Nẵng, uses social media to connect with her friends, but she limits her screen time to one hour a day. She also joins the school book club, so she reads a new book every month. Mai says that talking to her parents helps her deal with exam stress.” Decide whether each statement is true or false.", statements: ["Mai lives in Hà Nội.", "Mai spends three hours a day online.", "Mai reads a new book every month.", "Mai never talks to her parents about stress."], answer: [false, false, true, false] },
      { t: "essay", lv: "VD", stem: "Write 5–6 sentences giving advice to a friend who feels stressed about exams. Use at least two compound sentences with and, but, or, so.", rubric: "Đưa ra được ít nhất ba lời khuyên hợp lí (0,75đ); dùng đúng ít nhất hai câu ghép với liên từ (0,75đ); ít lỗi ngữ pháp, chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 8, topic: "Unit 4: Ethnic Groups of Viet Nam", week: 11,
    yccd: "Đặt và trả lời được câu hỏi Yes/No, Wh-; phân biệt danh từ đếm được và không đếm được khi nói về các dân tộc Việt Nam.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Viet Nam has 54 ___ groups.", options: ["culture", "tradition", "custom", "ethnic"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "The Bahnar people often gather in the ___ house for village meetings and festivals.", options: ["stilt", "communal", "terraced", "five-room"], answer: 1, explanation: "Nhà rông của người Ba Na là nhà sinh hoạt cộng đồng (communal house)." },
      { t: "mcq", lv: "TH", stem: "Which noun is uncountable?", options: ["costume", "festival", "rice", "village"], answer: 2 },
      { t: "tf", lv: "TH", stem: "Read the passage: “The Thái live mainly in the northwest of Viet Nam. They live in stilt houses near streams and grow rice in the valleys. Thái women are famous for their weaving, and they wear long skirts and short blouses. The Thái have their own language and writing system.” Decide whether each statement is true or false.", statements: ["The Thái live mainly in the northwest of Viet Nam.", "The Thái live in communal houses near the sea.", "Thái women are good at weaving.", "The Thái do not have their own writing system."], answer: [true, false, true, false] },
      { t: "essay", lv: "VD", stem: "Write 5–6 questions (both Yes/No and Wh-questions) you would ask a person from an ethnic group to learn about their houses, food, costumes and festivals.", rubric: "Viết đủ 5–6 câu hỏi đúng chủ đề (0,75đ); có cả câu hỏi Yes/No và câu hỏi Wh- đúng cấu trúc (0,75đ); dùng đúng danh từ đếm được/không đếm được, ít lỗi chính tả (0,5đ).", points: 2 },
    ],
  },
  // ---------- KHTN 8 ----------
  {
    subject: "Khoa học tự nhiên", grade: 8, topic: "Mol và tỉ khối của chất khí", week: 3,
    yccd: "Nêu được khái niệm mol, khối lượng mol, thể tích mol khí; tính được số mol, khối lượng, thể tích khí ở điều kiện chuẩn và tỉ khối của chất khí.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Một mol chất chứa bao nhiêu nguyên tử hoặc phân tử chất đó?", options: ["22,4", "6,022 · 10²³", "24,79", "6,022 · 10²²"], answer: 1, explanation: "Số Avogadro N_A = 6,022 · 10²³." },
      { t: "mcq", lv: "NB", stem: "Ở điều kiện chuẩn (25 °C, 1 bar), một mol chất khí bất kì chiếm thể tích là", options: ["22,4 L", "1 L", "24,79 L", "6,022 L"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Khí nào sau đây nặng hơn không khí? (H = 1, C = 12, N = 14, O = 16)", options: ["H₂", "CH₄", "NH₃", "CO₂"], answer: 3, explanation: "M(CO₂) = 44 g/mol > 29 g/mol của không khí." },
      { t: "short", lv: "TH", stem: "Tính số mol có trong 11 g khí CO₂ (C = 12, O = 16).", answer: "0,25", explanation: "n = m : M = 11 : 44 = 0,25 mol." },
      { t: "essay", lv: "VD", stem: "Bình gas nhà bác Tư chứa khí butane (C₄H₁₀). a) Tính tỉ khối của butane so với không khí (C = 12, H = 1, M không khí = 29 g/mol). b) Giải thích vì sao khi gas bị rò rỉ, khí gas thường tích tụ sát mặt sàn và cần mở cửa thông thoáng, không bật lửa hay công tắc điện.", rubric: "a) Tính đúng M(C₄H₁₀) = 58 g/mol (0,5đ); tính đúng d = 58 : 29 = 2 (0,5đ). b) Giải thích butane nặng hơn không khí nên tích tụ sát sàn (0,5đ); nêu khí gas dễ cháy nổ nên cần thông thoáng, tránh tia lửa (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 8, topic: "Áp suất trên một bề mặt", week: 7,
    yccd: "Nêu được khái niệm áp suất, đơn vị đo áp suất; vận dụng công thức p = F/S giải thích các cách làm tăng, giảm áp suất trong thực tế.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Công thức tính áp suất là", options: ["p = F/S", "p = F · S", "p = S/F", "p = F + S"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Đơn vị đo áp suất trong hệ SI là", options: ["niutơn (N)", "pascal (Pa)", "jun (J)", "oát (W)"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Vì sao lưỡi dao, lưỡi kéo thường được mài sắc?", options: ["Để tăng diện tích bị ép, giảm áp suất", "Để giảm lực tác dụng", "Để giảm diện tích bị ép, tăng áp suất", "Để dao nhẹ hơn"], answer: 2 },
      { t: "short", lv: "VD", stem: "Một thùng hàng có trọng lượng 600 N đặt trên sàn, diện tích mặt tiếp xúc là 0,5 m². Áp suất thùng hàng tác dụng lên sàn là bao nhiêu Pa?", answer: "1200", explanation: "p = 600 : 0,5 = 1200 Pa." },
      { t: "essay", lv: "VD", stem: "Máy cày làm việc trên ruộng lầy thường có bánh xích to bản. Một máy cày nặng 30 000 N, tổng diện tích tiếp xúc của bánh xích với mặt đất là 1,5 m². a) Tính áp suất máy cày tác dụng lên mặt đất. b) Giải thích vì sao bánh xích to bản giúp máy cày không bị lún.", rubric: "a) Viết đúng công thức p = F/S (0,5đ); tính đúng p = 30 000 : 1,5 = 20 000 Pa (0,5đ). b) Giải thích bánh xích to bản làm tăng diện tích bị ép (0,5đ) nên giảm áp suất lên mặt đất, máy không bị lún (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 8, topic: "Hệ tuần hoàn ở người", week: 11,
    yccd: "Nêu được thành phần của máu, cấu tạo và chức năng của tim, hệ mạch; mô tả được đường đi của máu trong vòng tuần hoàn lớn và vòng tuần hoàn nhỏ.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Hệ tuần hoàn ở người gồm", options: ["tim và phổi", "máu và phổi", "tim và hệ mạch", "động mạch và tĩnh mạch"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Tế bào máu nào chứa hemoglobin, có chức năng chủ yếu vận chuyển O₂?", options: ["Hồng cầu", "Bạch cầu", "Tiểu cầu", "Tế bào biểu bì"], answer: 0, explanation: "Bạch cầu bảo vệ cơ thể; tiểu cầu tham gia đông máu." },
      { t: "mcq", lv: "TH", stem: "Trong vòng tuần hoàn nhỏ, máu đi theo con đường nào?", options: ["Tâm thất trái → động mạch chủ → các cơ quan → tĩnh mạch chủ → tâm nhĩ phải", "Tâm nhĩ phải → tâm thất trái → phổi → tâm nhĩ trái", "Tâm thất phải → tĩnh mạch phổi → phổi → động mạch phổi → tâm nhĩ trái", "Tâm thất phải → động mạch phổi → mao mạch phổi → tĩnh mạch phổi → tâm nhĩ trái"], answer: 3 },
      { t: "short", lv: "TH", stem: "Một người có nhịp tim 75 lần/phút. Thời gian của một chu kì tim là bao nhiêu giây?", answer: "0,8", explanation: "60 : 75 = 0,8 giây." },
      { t: "essay", lv: "VD", stem: "Bạn Quân (lớp 8A2) thường xuyên thức khuya chơi điện tử, ít vận động và hay ăn đồ chiên rán. a) Những thói quen này có thể ảnh hưởng thế nào đến hệ tuần hoàn? b) Đề xuất ba biện pháp giúp Quân bảo vệ tim mạch.", rubric: "a) Nêu được ít vận động làm tim, mạch kém dẻo dai (0,25đ); ăn nhiều dầu mỡ dễ gây xơ vữa động mạch, tăng huyết áp (0,5đ); thức khuya gây căng thẳng, ảnh hưởng nhịp tim (0,25đ). b) Nêu đúng ba biện pháp phù hợp như tập thể dục đều đặn, ăn nhiều rau xanh, hạn chế dầu mỡ, ngủ đủ giấc (1đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 8, topic: "Base. Thang pH", week: 14,
    yccd: "Nêu được khái niệm base, kiềm và tính chất hoá học của base; dùng thang pH để đánh giá độ acid, base của dung dịch.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Dung dịch base làm quỳ tím chuyển sang màu", options: ["đỏ", "xanh", "vàng", "không đổi màu"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Dung dịch có pH = 7 là dung dịch", options: ["acid", "base", "trung tính", "kiềm mạnh"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Dãy chất nào sau đây gồm toàn base tan (kiềm)?", options: ["NaOH, KOH, Ba(OH)₂", "NaOH, Cu(OH)₂, Fe(OH)₃", "Mg(OH)₂, KOH, Al(OH)₃", "Fe(OH)₂, Cu(OH)₂, Mg(OH)₂"], answer: 0 },
      { t: "short", lv: "VD", stem: "Để trung hoà hết 200 mL dung dịch NaOH 1 M cần bao nhiêu gam HCl? (H = 1, Cl = 35,5)", answer: "7,3", explanation: "n(NaOH) = 0,2 mol; NaOH + HCl → NaCl + H₂O nên n(HCl) = 0,2 mol, m = 0,2 · 36,5 = 7,3 g." },
      { t: "essay", lv: "VD", stem: "Ở một số vùng đồng bằng sông Cửu Long, đất trồng lúa bị chua. a) Đất chua có pH lớn hơn hay nhỏ hơn 7? b) Vì sao bà con nông dân thường bón vôi bột (CaO) cho ruộng chua? Giải thích ngắn gọn.", rubric: "a) Nêu đúng đất chua có pH < 7 (0,5đ). b) Nêu vôi tác dụng với nước tạo base Ca(OH)₂ (0,5đ); base trung hoà acid trong đất (0,5đ); làm pH tăng, đất bớt chua, cây lúa phát triển tốt hơn (0,5đ).", points: 2 },
    ],
  },
  // ---------- Lịch sử và Địa lí 8 ----------
  {
    subject: "Lịch sử và Địa lí", grade: 8, topic: "Cách mạng công nghiệp", week: 3,
    yccd: "Nêu được những thành tựu tiêu biểu của cách mạng công nghiệp; phân tích được tác động của cách mạng công nghiệp đối với sản xuất và đời sống xã hội.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Cách mạng công nghiệp diễn ra đầu tiên ở nước nào?", options: ["Pháp", "Đức", "Mỹ", "Anh"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Ai là người chế tạo thành công máy hơi nước (năm 1784), tạo bước ngoặt cho cách mạng công nghiệp?", options: ["Giêm Oát", "Giêm Ha-gri-vơ", "Xti-phen-xơn", "Ác-crai-tơ"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Hệ quả xã hội quan trọng của cách mạng công nghiệp là", options: ["xoá bỏ hoàn toàn giai cấp nông dân", "hình thành hai giai cấp cơ bản: tư sản công nghiệp và vô sản công nghiệp", "chấm dứt sự bóc lột trong xã hội", "dân cư chuyển từ thành thị về nông thôn"], answer: 1 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về cách mạng công nghiệp (nửa sau thế kỉ XVIII – nửa đầu thế kỉ XIX).", statements: ["Cách mạng công nghiệp bắt đầu từ ngành dệt.", "Xti-phen-xơn chế tạo thành công đầu máy xe lửa chạy bằng hơi nước.", "Cách mạng công nghiệp chuyển nền sản xuất từ máy móc sang lao động thủ công.", "Cách mạng công nghiệp thúc đẩy quá trình đô thị hoá."], answer: [true, true, false, true], explanation: "Cách mạng công nghiệp chuyển từ lao động thủ công sang sản xuất bằng máy móc." },
      { t: "essay", lv: "VD", stem: "Hãy nêu một số thành tựu của cách mạng công nghiệp thế kỉ XVIII – XIX vẫn còn ảnh hưởng đến cuộc sống hiện nay và rút ra bài học cho Việt Nam trong công cuộc công nghiệp hoá.", rubric: "Nêu đúng ít nhất hai thành tựu và ảnh hưởng hiện nay, như đường sắt, tàu thuỷ, sản xuất bằng máy móc (1đ); rút ra bài học: đổi mới khoa học – kĩ thuật, đào tạo nguồn nhân lực, chú trọng bảo vệ môi trường (1đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 8, topic: "Địa hình Việt Nam", week: 7,
    yccd: "Trình bày được đặc điểm chung của địa hình Việt Nam; nêu được đặc điểm các khu vực địa hình đồi núi, đồng bằng.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Đồi núi chiếm khoảng bao nhiêu diện tích phần đất liền Việt Nam?", options: ["1/4", "1/2", "2/3", "3/4"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Đỉnh núi cao nhất Việt Nam là", options: ["Phan-xi-păng", "Ngọc Linh", "Bạch Mã", "Tây Côn Lĩnh"], answer: 0, explanation: "Phan-xi-păng (3 143 m) thuộc dãy Hoàng Liên Sơn." },
      { t: "mcq", lv: "TH", stem: "Đặc điểm nào sau đây đúng với địa hình khu vực Đông Bắc?", options: ["Có các dãy núi cao hướng tây bắc – đông nam, địa hình cao nhất cả nước", "Gồm các cao nguyên badan xếp tầng", "Chủ yếu là đồi núi thấp, các dãy núi có hướng vòng cung", "Là đồng bằng rộng lớn nhất cả nước"], answer: 2 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về địa hình Việt Nam.", statements: ["Địa hình đồi núi thấp chiếm ưu thế.", "Hướng chính của địa hình là tây bắc – đông nam và vòng cung.", "Đồng bằng sông Cửu Long có hệ thống đê ven sông lớn nhất cả nước.", "Địa hình nước ta chịu tác động mạnh mẽ của con người."], answer: [true, true, false, true], explanation: "Hệ thống đê ven sông lớn là đặc điểm của đồng bằng sông Hồng." },
      { t: "essay", lv: "VD", stem: "Vì sao ở vùng đồi núi nước ta cần trồng rừng và canh tác theo kiểu ruộng bậc thang (như ở Mù Cang Chải)? Nêu hai biện pháp sử dụng hợp lí địa hình đồi núi.", rubric: "Giải thích địa hình dốc, mưa lớn tập trung dễ gây xói mòn, sạt lở (0,5đ); ruộng bậc thang giữ nước, giữ đất, mở rộng diện tích canh tác (0,5đ); nêu đúng hai biện pháp như trồng và bảo vệ rừng, canh tác nông – lâm kết hợp (1đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 8, topic: "Phong trào Tây Sơn", week: 11,
    yccd: "Trình bày được những thắng lợi tiêu biểu của phong trào Tây Sơn; đánh giá được vai trò của Nguyễn Huệ – Quang Trung.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Cuộc khởi nghĩa Tây Sơn bùng nổ năm 1771 do ai lãnh đạo?", options: ["Lê Lợi và Nguyễn Trãi", "Nguyễn Hữu Cầu và Hoàng Công Chất", "Trịnh Sâm và Trịnh Khải", "Ba anh em Nguyễn Nhạc, Nguyễn Huệ, Nguyễn Lữ"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Trận Rạch Gầm – Xoài Mút (1785) đánh tan quân xâm lược nào?", options: ["Quân Xiêm", "Quân Thanh", "Quân Minh", "Quân Pháp"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Vì sao Nguyễn Huệ lên ngôi Hoàng đế (1788) trước khi tiến quân ra Bắc đánh quân Thanh?", options: ["Để kế thừa ngôi vua của nhà Lê", "Để chính danh, khẳng định chủ quyền và quy tụ lòng dân chống giặc", "Để được nhà Thanh công nhận", "Để chia đất nước cho các anh em"], answer: 1 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về phong trào Tây Sơn.", statements: ["Năm 1786, nghĩa quân Tây Sơn tiến ra Bắc, lật đổ chính quyền chúa Trịnh.", "Năm 1788, Nguyễn Huệ lên ngôi Hoàng đế, lấy niên hiệu Quang Trung.", "Chiến thắng Ngọc Hồi – Đống Đa diễn ra vào mùa thu năm 1789.", "Quân Tây Sơn đánh bại quân Thanh chủ yếu nhờ sự giúp đỡ của nước ngoài."], answer: [true, true, false, false], explanation: "Chiến thắng Ngọc Hồi – Đống Đa diễn ra dịp Tết Kỷ Dậu (đầu xuân 1789), nhờ sức mạnh đoàn kết và tài chỉ huy của Quang Trung." },
      { t: "essay", lv: "VD", stem: "Đánh giá vai trò của Nguyễn Huệ – Quang Trung trong phong trào Tây Sơn và trong các cuộc kháng chiến chống quân Xiêm, quân Thanh.", rubric: "Nêu được vai trò lãnh đạo, chỉ huy các trận Rạch Gầm – Xoài Mút, Ngọc Hồi – Đống Đa (0,75đ); nêu được tài thao lược: hành quân thần tốc, đánh bất ngờ (0,5đ); nêu công lao lật đổ các tập đoàn phong kiến, bước đầu thống nhất đất nước (0,5đ); có nhận xét, đánh giá của bản thân (0,25đ).", points: 2 },
    ],
  },

  // ======================= LỚP 9 =======================
  // ---------- Toán 9 ----------
  {
    subject: "Toán", grade: 9, topic: "Giải hệ hai phương trình bậc nhất hai ẩn", week: 3,
    yccd: "Giải được hệ hai phương trình bậc nhất hai ẩn bằng phương pháp thế, phương pháp cộng đại số và bằng máy tính cầm tay.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Cặp số nào sau đây là nghiệm của phương trình 2x + y = 5?", options: ["(1; 3)", "(2; 2)", "(0; 3)", "(3; 1)"], answer: 0, explanation: "2 · 1 + 3 = 5." },
      { t: "mcq", lv: "NB", stem: "Hệ phương trình nào sau đây là hệ hai phương trình bậc nhất hai ẩn?", options: ["x² + y = 1 và x − y = 2", "2x + y = 3 và x − 3y = 1", "xy = 2 và x + y = 3", "1/x + y = 1 và x − y = 0"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Nghiệm của hệ phương trình x + y = 7 và x − y = 1 là", options: ["(3; 4)", "(5; 2)", "(4; 3)", "(6; 1)"], answer: 2, explanation: "Cộng vế hai phương trình: 2x = 8 nên x = 4, y = 3." },
      { t: "short", lv: "TH", stem: "Giải hệ phương trình 3x + 2y = 12 và x − y = −1. Tính giá trị x + y.", answer: "5", explanation: "x = y − 1 thay vào được 5y − 3 = 12 nên y = 3, x = 2; x + y = 5." },
      { t: "essay", lv: "VD", stem: "Mẹ bạn Vy đi chợ, lần đầu mua 2 kg cam và 3 kg quýt hết 190 000 đồng; lần sau mua 3 kg cam và 1 kg quýt hết 180 000 đồng. Tính giá tiền 1 kg cam và 1 kg quýt (giá không đổi giữa hai lần).", rubric: "Gọi ẩn và đặt điều kiện (0,25đ); lập đúng hệ 2x + 3y = 190 000 và 3x + y = 180 000 (0,75đ); giải đúng x = 50 000, y = 30 000 (0,75đ); kết luận 1 kg cam giá 50 000 đồng, 1 kg quýt giá 30 000 đồng (0,25đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 9, topic: "Bất phương trình bậc nhất một ẩn", week: 7,
    yccd: "Nhận biết được bất phương trình bậc nhất một ẩn và nghiệm của nó; giải được bất phương trình bậc nhất một ẩn.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Bất phương trình nào sau đây là bất phương trình bậc nhất một ẩn?", options: ["x² − 1 > 0", "0x + 3 < 0", "1/x + 2 ≥ 0", "2x − 5 > 0"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Số nào sau đây là nghiệm của bất phương trình 3x − 6 > 0?", options: ["3", "2", "0", "−1"], answer: 0, explanation: "3x − 6 > 0 ⇔ x > 2." },
      { t: "mcq", lv: "TH", stem: "Nghiệm của bất phương trình −2x + 8 ≥ 0 là", options: ["x ≥ 4", "x ≤ −4", "x ≤ 4", "x ≥ −4"], answer: 2, explanation: "−2x ≥ −8; chia hai vế cho −2 phải đổi chiều: x ≤ 4." },
      { t: "short", lv: "TH", stem: "Tìm số nguyên x lớn nhất thoả mãn 5x − 3 < 2x + 21.", answer: "7", explanation: "3x < 24 nên x < 8; số nguyên lớn nhất là 7." },
      { t: "essay", lv: "VD", stem: "Bạn Khánh có 200 000 đồng, muốn mua một hộp bút giá 35 000 đồng và một số quyển vở, mỗi quyển giá 12 000 đồng. Hỏi Khánh mua được nhiều nhất bao nhiêu quyển vở?", rubric: "Gọi x là số quyển vở, x là số nguyên dương (0,25đ); lập đúng bất phương trình 35 000 + 12 000x ≤ 200 000 (0,75đ); giải được x ≤ 13,75 (0,5đ); kết luận mua được nhiều nhất 13 quyển vở (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 9, topic: "Căn bậc hai và căn thức bậc hai", week: 11,
    yccd: "Nhận biết được căn bậc hai, căn thức bậc hai; tìm được điều kiện xác định và vận dụng hằng đẳng thức √(A²) = |A|.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Các căn bậc hai của 25 là", options: ["5", "5 và −5", "−5", "625"], answer: 1, explanation: "Số dương a có hai căn bậc hai là √a và −√a." },
      { t: "mcq", lv: "NB", stem: "Điều kiện xác định của √(x − 3) là", options: ["x > 3", "x ≤ 3", "x ≥ 3", "x ≠ 3"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Với x < 2, biểu thức √((x − 2)²) bằng", options: ["x − 2", "(x − 2)²", "−x − 2", "2 − x"], answer: 3, explanation: "√(A²) = |A|; với x < 2 thì |x − 2| = 2 − x." },
      { t: "short", lv: "TH", stem: "Tính giá trị của biểu thức √((3 − √5)²) + √5.", answer: "3", explanation: "Vì 3 > √5 nên √((3 − √5)²) = 3 − √5; cộng √5 được 3." },
      { t: "essay", lv: "VD", stem: "Tốc độ v (m/s) khi chạm đất của một vật rơi tự do từ độ cao h (m) được tính bởi công thức v = √(2gh), với g ≈ 9,8 m/s². a) Tính tốc độ khi chạm đất của một quả xoài rơi từ cành cao 5 m (làm tròn đến hàng phần mười). b) Muốn tốc độ chạm đất gấp đôi thì độ cao phải tăng lên bao nhiêu lần?", rubric: "a) Thay số đúng v = √(2 · 9,8 · 5) = √98 (0,5đ); tính đúng v ≈ 9,9 m/s (0,5đ). b) Lập luận v tỉ lệ với √h nên v gấp 2 khi h gấp 4 (0,75đ); kết luận độ cao tăng 4 lần (0,25đ).", points: 2 },
    ],
  },
  {
    subject: "Toán", grade: 9, topic: "Tỉ số lượng giác của góc nhọn", week: 14,
    yccd: "Nhận biết được các tỉ số lượng giác sin, cos, tan, cot của góc nhọn; tính được tỉ số lượng giác và vận dụng giải bài toán thực tế.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Cho tam giác ABC vuông tại A. Khi đó sin B bằng", options: ["AC/BC", "AB/BC", "AC/AB", "AB/AC"], answer: 0, explanation: "sin B = cạnh đối / cạnh huyền = AC/BC." },
      { t: "mcq", lv: "NB", stem: "Giá trị của tan 45° là", options: ["0", "√3", "1", "1/2"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Tam giác MNP vuông tại M có MN = 3 cm, MP = 4 cm. Giá trị của cos N là", options: ["4/5", "3/4", "4/3", "3/5"], answer: 3, explanation: "NP = 5 cm; cos N = MN/NP = 3/5." },
      { t: "short", lv: "VD", stem: "Một chiếc thang dài 4 m dựa vào tường, chân thang cách chân tường 2 m. Góc tạo bởi thang và mặt đất bằng bao nhiêu độ?", answer: "60", explanation: "cos α = 2/4 = 1/2 nên α = 60°." },
      { t: "essay", lv: "VD", stem: "Từ đỉnh một ngọn hải đăng cao 30 m so với mực nước biển, người canh gác nhìn thấy một chiếc thuyền đánh cá với góc hạ (góc giữa tia nhìn và phương nằm ngang) bằng 20°. Tính khoảng cách từ chân hải đăng đến chiếc thuyền (làm tròn đến mét).", rubric: "Mô tả được tam giác vuông, chỉ ra góc tại thuyền bằng 20° (0,5đ); lập đúng hệ thức tan 20° = 30/d (0,75đ); tính đúng d = 30 : tan 20° ≈ 82 m (0,5đ); kết luận (0,25đ).", points: 2 },
    ],
  },
  // ---------- Ngữ văn 9 ----------
  {
    subject: "Ngữ văn", grade: 9, topic: "Truyện truyền kì: Chuyện người con gái Nam Xương (Nguyễn Dữ)", week: 2,
    yccd: "Nhận biết được đặc điểm truyện truyền kì: yếu tố kì ảo, cốt truyện, nhân vật; phân tích được bi kịch và vẻ đẹp của nhân vật Vũ Nương.",
    qs: [
      { t: "mcq", lv: "NB", stem: "“Chuyện người con gái Nam Xương” được trích từ tác phẩm nào?", options: ["Truyền kì mạn lục", "Hoàng Lê nhất thống chí", "Thánh Tông di thảo", "Lĩnh Nam chích quái"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Nguyên nhân trực tiếp khiến Trương Sinh nghi oan cho vợ là", options: ["lời đồn đại của hàng xóm", "lời nói ngây thơ của bé Đản về người cha đêm nào cũng đến", "bức thư Vũ Nương gửi Phan Lang", "lời trăng trối của mẹ Trương Sinh"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Chi tiết nào sau đây là yếu tố kì ảo trong truyện?", options: ["Trương Sinh phải đi lính đánh giặc Chiêm", "Vũ Nương chăm sóc mẹ chồng lúc ốm đau", "Vũ Nương sống dưới thuỷ cung của Linh Phi rồi hiện về trên sông Hoàng Giang", "Bé Đản chỉ cái bóng trên vách và gọi là cha"], answer: 2 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về nhân vật Vũ Nương và tác phẩm.", statements: ["Vũ Nương là người phụ nữ thuỳ mị, nết na, hiếu thảo với mẹ chồng.", "Vũ Nương gieo mình xuống sông vì muốn được làm tiên dưới thuỷ cung.", "Bi kịch của Vũ Nương phản ánh thân phận người phụ nữ dưới chế độ phong kiến.", "Truyện được viết bằng chữ Nôm vào thế kỉ XVIII."], answer: [true, false, true, false], explanation: "Vũ Nương tự vẫn để giữ trọn tiết hạnh, chứng minh mình trong sạch; tác phẩm viết bằng chữ Hán vào thế kỉ XVI." },
      { t: "essay", lv: "VD", stem: "Viết bài văn (khoảng 400–500 chữ) phân tích ý nghĩa của chi tiết “cái bóng” trong “Chuyện người con gái Nam Xương”.", rubric: "Bố cục rõ ràng, giới thiệu tác giả, tác phẩm, chi tiết (0,5đ); phân tích cái bóng là nguyên nhân trực tiếp dẫn đến bi kịch, thắt nút câu chuyện (1đ); phân tích cái bóng thể hiện tình thương con, nỗi nhớ chồng của Vũ Nương (0,75đ); phân tích vai trò mở nút, tố cáo thói ghen tuông, gia trưởng và xã hội phong kiến (1đ); nhận xét nghệ thuật xây dựng chi tiết (0,5đ); diễn đạt, chính tả (0,25đ).", points: 4 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 9, topic: "Thơ song thất lục bát", week: 6,
    yccd: "Nhận biết được đặc điểm thể thơ song thất lục bát (số tiếng, vần, nhịp, khổ thơ); hiểu được tâm trạng nhân vật trữ tình.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Một khổ thơ song thất lục bát gồm", options: ["hai câu sáu chữ và hai câu tám chữ", "hai câu bảy chữ, một câu sáu chữ và một câu tám chữ", "bốn câu bảy chữ", "một câu sáu chữ và một câu tám chữ"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Hai câu thơ “Thuở trời đất nổi cơn gió bụi, / Khách má hồng nhiều nỗi truân chuyên.” mở đầu tác phẩm nào viết theo thể song thất lục bát?", options: ["Truyện Kiều", "Lục Vân Tiên", "Bánh trôi nước", "Chinh phụ ngâm"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Đọc khổ thơ (tự soạn): “Hoàng hôn xuống bên sông lặng lẽ, / Tiếng chuông chùa nhè nhẹ ngân vang. / Mẹ ngồi vá áo chiều tàn, / Mong con xa xứ bình an trở về.” Tâm trạng chủ đạo của người mẹ là", options: ["vui mừng vì con đã trở về", "giận dỗi vì con không viết thư", "nhớ thương, mong ngóng người con đi xa", "thanh thản, không vướng bận điều gì"], answer: 2 },
      { t: "tf", lv: "TH", stem: "Với khổ thơ (tự soạn) “Hoàng hôn xuống bên sông lặng lẽ, / Tiếng chuông chùa nhè nhẹ ngân vang. / Mẹ ngồi vá áo chiều tàn, / Mong con xa xứ bình an trở về.”, xét tính đúng/sai của các nhận định sau.", statements: ["Khổ thơ có đủ hai câu bảy chữ, một câu sáu chữ và một câu tám chữ.", "Tiếng “lẽ” cuối câu thất thứ nhất vần với tiếng “nhẹ” ở câu thất thứ hai.", "Tiếng “tàn” cuối câu lục vần với tiếng “an” ở câu bát.", "Hai câu thất thường ngắt nhịp 2/2/2."], answer: [true, true, true, false], explanation: "Câu thất trong song thất lục bát thường ngắt nhịp 3/4." },
      { t: "essay", lv: "VD", stem: "Viết đoạn văn (khoảng 200 chữ) phân tích tâm trạng nhân vật trữ tình trong một đoạn thơ song thất lục bát em đã học (hoặc khổ thơ tự soạn ở trên), chỉ rõ tác dụng của vần và nhịp thơ.", rubric: "Đúng hình thức đoạn văn, nêu rõ đoạn thơ được phân tích (0,5đ); phân tích được tâm trạng nhân vật qua từ ngữ, hình ảnh (1đ); chỉ ra tác dụng của vần, nhịp 3/4 ở câu thất và cặp lục bát (1đ); diễn đạt mạch lạc, đúng chính tả (0,5đ).", points: 3 },
    ],
  },
  {
    subject: "Ngữ văn", grade: 9, topic: "Truyện thơ Nôm: Kiều ở lầu Ngưng Bích (Nguyễn Du)", week: 11,
    yccd: "Nhận biết được đặc điểm truyện thơ Nôm; phân tích được nghệ thuật tả cảnh ngụ tình và tâm trạng Thuý Kiều.",
    qs: [
      { t: "mcq", lv: "NB", stem: "“Truyện Kiều” của Nguyễn Du được viết theo thể thơ nào?", options: ["Song thất lục bát", "Lục bát", "Thất ngôn bát cú", "Thơ tự do"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Trong đoạn trích “Kiều ở lầu Ngưng Bích”, Thuý Kiều nhớ tới ai trước tiên?", options: ["Cha mẹ", "Thuý Vân", "Kim Trọng", "Vương Quan"], answer: 2, explanation: "Kiều nhớ Kim Trọng trước (“Tưởng người dưới nguyệt chén đồng”), sau đó mới nhớ cha mẹ." },
      { t: "mcq", lv: "TH", stem: "Tám câu thơ cuối mở đầu bằng điệp ngữ “Buồn trông” (“Buồn trông cửa bể chiều hôm, / Thuyền ai thấp thoáng cánh buồm xa xa?…”) sử dụng chủ yếu bút pháp nghệ thuật nào?", options: ["Tả cảnh ngụ tình", "Ước lệ tượng trưng để tả chân dung", "Kể chuyện theo trình tự thời gian", "Liệt kê sự việc"], answer: 0 },
      { t: "tf", lv: "TH", stem: "Đọc đoạn thơ: “Buồn trông cửa bể chiều hôm, / Thuyền ai thấp thoáng cánh buồm xa xa? / Buồn trông ngọn nước mới sa, / Hoa trôi man mác biết là về đâu?” (Nguyễn Du, Truyện Kiều). Xét tính đúng/sai của các nhận định sau.", statements: ["Điệp ngữ “Buồn trông” tạo âm hưởng trầm buồn, diễn tả nỗi buồn triền miên.", "Hình ảnh cánh buồm xa xa gợi niềm vui sắp được trở về quê nhà.", "Hình ảnh “hoa trôi man mác” gợi thân phận trôi nổi, vô định của Kiều.", "Các câu hỏi tu từ thể hiện tâm trạng bơ vơ, lo âu về tương lai."], answer: [true, false, true, true] },
      { t: "essay", lv: "VD", stem: "Viết bài văn (khoảng 400–500 chữ) phân tích tám câu thơ cuối đoạn trích “Kiều ở lầu Ngưng Bích” để làm rõ nghệ thuật tả cảnh ngụ tình của Nguyễn Du.", rubric: "Bố cục rõ ràng, giới thiệu tác giả, đoạn trích (0,5đ); phân tích bốn cảnh: cửa bể chiều hôm, ngọn nước mới sa, nội cỏ rầu rầu, gió cuốn mặt duềnh cùng tâm trạng tương ứng (1,5đ); chỉ ra cảnh được miêu tả từ xa đến gần, màu sắc từ nhạt đến đậm, âm thanh từ tĩnh đến động, nỗi buồn tăng dần (0,75đ); phân tích tác dụng của điệp ngữ “Buồn trông”, từ láy, câu hỏi tu từ (0,75đ); diễn đạt, chính tả (0,5đ).", points: 4 },
    ],
  },
  // ---------- Tiếng Anh 9 ----------
  {
    subject: "Tiếng Anh", grade: 9, topic: "Unit 1: Local Community", week: 2,
    yccd: "Dùng được từ để hỏi + to V và cụm động từ để nói về cộng đồng địa phương, nghề thủ công và dịch vụ.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Bát Tràng is a famous ___ village where people make pottery.", options: ["craft", "crafty", "crafted", "crafting"], answer: 0 },
      { t: "mcq", lv: "NB", stem: "Choose the correct answer: I don't know ___ to get to the community centre. Can you show me?", options: ["what", "how", "which", "who"], answer: 1, explanation: "Từ để hỏi + to V: how to get to… (đi đến … bằng cách nào)." },
      { t: "mcq", lv: "TH", stem: "Our neighbours are very friendly. We always ___ well with them.", options: ["turn down", "look after", "set off", "get on"], answer: 3, explanation: "get on (well) with somebody: hoà hợp với ai." },
      { t: "tf", lv: "TH", stem: "Read the passage: “My hometown is famous for making conical hats. Many families in my village have done this job for generations. Artisans use palm leaves and bamboo to make the hats. Nowadays, tourists come to watch the artisans work and buy hats as souvenirs. Young people are learning the craft from older artisans so that it will not die out.” Decide whether each statement is true or false.", statements: ["The writer's village is famous for making conical hats.", "Artisans make the hats from plastic.", "Tourists buy the hats as souvenirs.", "Young people are not interested in learning the craft."], answer: [true, false, true, false] },
      { t: "essay", lv: "VD", stem: "Write a paragraph (80–100 words) about a craft village or a local service you know: where it is, what people do there and why it is important to your community.", rubric: "Đủ nội dung: vị trí, hoạt động, vai trò với cộng đồng (1đ); dùng đúng từ vựng chủ đề và ít nhất một cụm động từ hoặc cấu trúc từ để hỏi + to V (0,5đ); đoạn văn mạch lạc, ít lỗi ngữ pháp, chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 9, topic: "Unit 3: Healthy Living for Teens", week: 7,
    yccd: "Nói được về cách cân bằng học tập và sức khoẻ của tuổi teen; dùng được từ vựng về căng thẳng, quản lí thời gian và đưa ra lời khuyên.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Good time ___ helps students balance schoolwork and hobbies.", options: ["manage", "manager", "management", "managed"], answer: 2, explanation: "Cụm danh từ: time management (quản lí thời gian)." },
      { t: "mcq", lv: "NB", stem: "You look tired. You ___ go to bed so late.", options: ["should", "shouldn't", "must", "can"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Many teens feel ___ before exams, so they should take short breaks and get enough sleep.", options: ["stressed", "stressful", "stress", "stressing"], answer: 0, explanation: "“stressed” mô tả cảm giác của người; “stressful” mô tả sự việc gây căng thẳng." },
      { t: "tf", lv: "TH", stem: "Read the passage: “Linh is in Grade 9 and she is preparing for the entrance exam to upper secondary school. Last month, she often studied until midnight and felt exhausted. Now she follows a study plan, sleeps eight hours a night and jogs along the riverbank three times a week. She also spends less time on her phone. She feels more energetic and focuses better in class.” Decide whether each statement is true or false.", statements: ["Linh is preparing for an important exam.", "Linh still studies until midnight every day.", "Linh does exercise three times a week.", "Linh now feels more tired than before."], answer: [true, false, true, false] },
      { t: "essay", lv: "VD", stem: "Write a paragraph (80–100 words) giving advice to Grade 9 students on how to stay healthy while preparing for exams.", rubric: "Nêu được ít nhất ba lời khuyên hợp lí về giấc ngủ, ăn uống, vận động, quản lí thời gian (1đ); dùng đúng should/shouldn't hoặc cấu trúc đưa lời khuyên (0,5đ); đoạn văn mạch lạc, ít lỗi ngữ pháp, chính tả (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Tiếng Anh", grade: 9, topic: "Unit 5: Our Experiences", week: 11,
    yccd: "Dùng được thì hiện tại hoàn thành để kể về trải nghiệm; phân biệt với thì quá khứ đơn.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Have you ever ___ to Phú Quốc Island?", options: ["go", "went", "going", "been"], answer: 3, explanation: "Have you ever been to…? hỏi về trải nghiệm đã từng đến đâu." },
      { t: "mcq", lv: "NB", stem: "I have never ___ such a beautiful sunset.", options: ["see", "seen", "saw", "seeing"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "We ___ Hội An last summer and it was amazing.", options: ["visited", "have visited", "visit", "have been visiting"], answer: 0, explanation: "“last summer” là thời điểm xác định trong quá khứ nên dùng quá khứ đơn." },
      { t: "tf", lv: "TH", stem: "Read the passage: “Tuấn has had many interesting experiences. He has climbed Fansipan twice. Last year, he joined a volunteer trip to a mountain village in the north and taught English to the children there. He has never travelled abroad, but he hopes to visit Japan one day.” Decide whether each statement is true or false.", statements: ["Tuấn has climbed Fansipan two times.", "Tuấn taught English to children on a volunteer trip.", "Tuấn has travelled to Japan.", "Tuấn joined the volunteer trip last year."], answer: [true, true, false, true] },
      { t: "essay", lv: "VD", stem: "Write a paragraph (80–100 words) about an unforgettable experience you have had. Use both the present perfect and the past simple.", rubric: "Kể rõ trải nghiệm: khi nào, ở đâu, điều gì đã xảy ra, cảm nghĩ (1đ); dùng đúng thì hiện tại hoàn thành và quá khứ đơn (0,5đ); đoạn văn mạch lạc, ít lỗi ngữ pháp, chính tả (0,5đ).", points: 2 },
    ],
  },
  // ---------- KHTN 9 ----------
  {
    subject: "Khoa học tự nhiên", grade: 9, topic: "Động năng. Thế năng. Cơ năng", week: 3,
    yccd: "Viết được biểu thức tính động năng, thế năng trọng trường; vận dụng được sự bảo toàn cơ năng trong trường hợp đơn giản.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Biểu thức tính động năng của vật khối lượng m chuyển động với tốc độ v là", options: ["Wđ = m · v", "Wđ = ½ · m · v²", "Wđ = m · v²", "Wđ = ½ · m² · v"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Thế năng trọng trường của một vật phụ thuộc vào", options: ["tốc độ của vật", "nhiệt độ của vật", "trọng lượng của vật và độ cao của vật so với mốc thế năng", "hình dạng của vật"], answer: 2 },
      { t: "mcq", lv: "TH", stem: "Một quả bóng được ném thẳng đứng lên cao (bỏ qua sức cản không khí). Trong khi bóng đi lên thì", options: ["động năng giảm, thế năng tăng, cơ năng không đổi", "động năng tăng, thế năng giảm", "cả động năng và thế năng đều tăng", "cơ năng giảm dần"], answer: 0 },
      { t: "short", lv: "VD", stem: "Một quả dừa khối lượng 2 kg ở trên cây, cách mặt đất 8 m. Chọn mốc thế năng tại mặt đất, lấy trọng lượng P = 10m. Thế năng trọng trường của quả dừa là bao nhiêu jun?", answer: "160", explanation: "Wt = P · h = 10 · 2 · 8 = 160 J." },
      { t: "essay", lv: "VD", stem: "Một vật khối lượng 0,5 kg được thả rơi từ độ cao 20 m so với mặt đất (bỏ qua sức cản không khí, lấy P = 10m, mốc thế năng tại mặt đất). a) Tính cơ năng của vật. b) Tính tốc độ của vật khi chạm đất.", rubric: "a) Tính đúng Wt ban đầu = 10 · 0,5 · 20 = 100 J, Wđ ban đầu = 0 nên cơ năng W = 100 J (0,75đ). b) Áp dụng bảo toàn cơ năng: khi chạm đất Wđ = 100 J (0,5đ); từ ½ · 0,5 · v² = 100 tính được v = 20 m/s (0,75đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 9, topic: "Tính chất chung của kim loại. Dãy hoạt động hoá học", week: 7,
    yccd: "Trình bày được tính chất vật lí, hoá học chung của kim loại; dùng dãy hoạt động hoá học dự đoán được phản ứng của kim loại với acid, dung dịch muối.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Kim loại nào sau đây dẫn điện tốt nhất?", options: ["Fe", "Al", "Cu", "Ag"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Kim loại nào sau đây KHÔNG tác dụng với dung dịch HCl?", options: ["Zn", "Cu", "Mg", "Fe"], answer: 1, explanation: "Cu đứng sau H trong dãy hoạt động hoá học." },
      { t: "mcq", lv: "TH", stem: "Ngâm một đinh sắt sạch trong dung dịch CuSO₄, hiện tượng quan sát được là", options: ["không có hiện tượng gì", "có khí không màu thoát ra", "có lớp kim loại màu đỏ bám trên đinh sắt, màu xanh của dung dịch nhạt dần", "đinh sắt chuyển sang màu trắng bạc"], answer: 2, explanation: "Fe + CuSO₄ → FeSO₄ + Cu." },
      { t: "short", lv: "VD", stem: "Cho 5,6 g Fe tác dụng hết với dung dịch HCl dư. Thể tích khí H₂ thu được ở điều kiện chuẩn (25 °C, 1 bar) là bao nhiêu lít? (Fe = 56)", answer: "2,479", explanation: "n(Fe) = 0,1 mol; Fe + 2HCl → FeCl₂ + H₂ nên n(H₂) = 0,1 mol, V = 0,1 · 24,79 = 2,479 L." },
      { t: "essay", lv: "VD", stem: "Hãy giải thích: a) Vì sao dây điện trong nhà thường làm bằng đồng, còn đường dây tải điện cao thế thường dùng nhôm? b) Vì sao không nên dùng nồi, chậu nhôm để đựng giấm hoặc muối dưa chua lâu ngày?", rubric: "a) Nêu đồng dẫn điện rất tốt, dễ kéo sợi (0,5đ); nhôm nhẹ, dẫn điện khá tốt, giá rẻ nên phù hợp làm dây dẫn đường dài trên cao (0,5đ). b) Nêu nhôm đứng trước H trong dãy hoạt động hoá học nên tác dụng với acid trong giấm, dưa chua (0,5đ); làm đồ dùng bị ăn mòn, thức ăn nhiễm kim loại, không an toàn (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 9, topic: "Các quy luật di truyền của Mendel", week: 11,
    yccd: "Nêu được các khái niệm di truyền cơ bản; giải thích được kết quả thí nghiệm lai một cặp và hai cặp tính trạng của Mendel.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Mendel chọn đối tượng nào để tiến hành các thí nghiệm lai?", options: ["Ruồi giấm", "Đậu Hà Lan", "Cây lúa", "Chuột bạch"], answer: 1 },
      { t: "mcq", lv: "NB", stem: "Kiểu gene nào sau đây là kiểu gene đồng hợp?", options: ["Aa", "AaBb", "AABb", "aa"], answer: 3 },
      { t: "mcq", lv: "TH", stem: "Ở đậu Hà Lan, hoa tím (A) trội hoàn toàn so với hoa trắng (a). Cho cây Aa tự thụ phấn, tỉ lệ kiểu hình ở đời con là", options: ["3 hoa tím : 1 hoa trắng", "1 hoa tím : 1 hoa trắng", "100% hoa tím", "1 hoa tím : 2 hoa trắng"], answer: 0, explanation: "Aa × Aa → 1AA : 2Aa : 1aa, tức 3 tím : 1 trắng." },
      { t: "short", lv: "TH", stem: "Cơ thể có kiểu gene AaBb (hai cặp gene phân li độc lập) giảm phân bình thường tạo ra bao nhiêu loại giao tử?", answer: "4", explanation: "AB, Ab, aB, ab: 2 · 2 = 4 loại." },
      { t: "essay", lv: "VD", stem: "Ở đậu Hà Lan, hạt vàng (A) trội hoàn toàn so với hạt xanh (a). Một bạn học sinh muốn biết một cây đậu hạt vàng có thuần chủng hay không. Em hãy đề xuất phép lai để kiểm tra, viết sơ đồ lai và nêu cách kết luận.", rubric: "Đề xuất đúng phép lai phân tích: lai với cây hạt xanh aa (0,5đ); viết đúng sơ đồ AA × aa → 100% Aa (hạt vàng) (0,5đ); viết đúng sơ đồ Aa × aa → 1Aa : 1aa (1 vàng : 1 xanh) (0,5đ); nêu đúng cách kết luận: đời con đồng tính thì cây đem lai thuần chủng, phân tính thì không thuần chủng (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Khoa học tự nhiên", grade: 9, topic: "Khúc xạ ánh sáng", week: 14,
    yccd: "Mô tả được hiện tượng khúc xạ ánh sáng; nêu được khái niệm chiết suất và giải thích được một số hiện tượng khúc xạ trong thực tế.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Hiện tượng khúc xạ ánh sáng là hiện tượng tia sáng", options: ["bị hắt trở lại môi trường cũ khi gặp mặt phân cách", "truyền thẳng trong một môi trường trong suốt và đồng tính", "bị gãy khúc khi truyền xiên góc qua mặt phân cách giữa hai môi trường trong suốt", "bị hấp thụ hoàn toàn khi gặp vật màu đen"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Gọi c là tốc độ ánh sáng trong chân không, v là tốc độ ánh sáng trong môi trường. Chiết suất của môi trường đó là", options: ["n = v/c", "n = c/v", "n = c · v", "n = c − v"], answer: 1 },
      { t: "mcq", lv: "TH", stem: "Khi tia sáng truyền xiên góc từ không khí vào nước thì", options: ["góc khúc xạ nhỏ hơn góc tới", "góc khúc xạ lớn hơn góc tới", "góc khúc xạ bằng góc tới", "tia sáng không đi vào nước"], answer: 0, explanation: "Nước chiết quang hơn không khí nên tia khúc xạ lệch lại gần pháp tuyến." },
      { t: "short", lv: "VD", stem: "Thuỷ tinh có chiết suất 1,5; tốc độ ánh sáng trong chân không là 3 · 10⁸ m/s. Tốc độ ánh sáng trong thuỷ tinh bằng a · 10⁸ m/s. Tìm a.", answer: "2", explanation: "v = c/n = 3 · 10⁸ : 1,5 = 2 · 10⁸ m/s." },
      { t: "essay", lv: "VD", stem: "Đứng trên bờ ao nhìn xuống, bạn Tùng thấy con cá dường như ở gần mặt nước hơn vị trí thật. Em hãy giải thích hiện tượng này và cho biết nếu dùng xiên để bắt cá thì phải phóng xiên như thế nào.", rubric: "Nêu ánh sáng từ cá truyền từ nước ra không khí bị khúc xạ tại mặt nước (0,5đ); tia khúc xạ lệch xa pháp tuyến, mắt nhìn theo đường kéo dài của tia khúc xạ nên thấy ảnh của cá cao hơn vị trí thật (0,75đ); kết luận phải phóng xiên thấp hơn (sâu hơn) chỗ nhìn thấy cá (0,75đ).", points: 2 },
    ],
  },
  // ---------- Lịch sử và Địa lí 9 ----------
  {
    subject: "Lịch sử và Địa lí", grade: 9, topic: "Dân tộc và dân số Việt Nam", week: 3,
    yccd: "Trình bày được đặc điểm thành phần dân tộc, quy mô và gia tăng dân số Việt Nam; nhận xét được sự thay đổi cơ cấu dân số theo tuổi.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Việt Nam có bao nhiêu dân tộc cùng chung sống?", options: ["45", "50", "54", "64"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Dân tộc có số dân đông nhất ở nước ta là", options: ["Kinh", "Tày", "Thái", "Mường"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Cơ cấu dân số theo tuổi của nước ta đang thay đổi theo hướng", options: ["tỉ lệ trẻ em tăng nhanh, tỉ lệ người cao tuổi giảm", "tỉ lệ trẻ em giảm, tỉ lệ người trong độ tuổi lao động và người cao tuổi tăng", "tỉ lệ các nhóm tuổi không thay đổi", "tỉ lệ người trong độ tuổi lao động giảm mạnh"], answer: 1 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về dân tộc và dân số Việt Nam.", statements: ["Năm 2023, dân số nước ta vào khoảng 100 triệu người.", "Các dân tộc thiểu số phân bố chủ yếu ở vùng đồng bằng ven biển.", "Nước ta đang trong thời kì cơ cấu dân số vàng.", "Tỉ lệ gia tăng dân số tự nhiên của nước ta ngày càng tăng nhanh."], answer: [true, false, true, false], explanation: "Các dân tộc thiểu số sống chủ yếu ở trung du, miền núi; tỉ lệ gia tăng dân số tự nhiên có xu hướng giảm." },
      { t: "essay", lv: "VD", stem: "Cơ cấu dân số vàng mang lại những cơ hội và thách thức gì cho sự phát triển kinh tế – xã hội của nước ta? Nêu một việc học sinh có thể làm để chuẩn bị cho tương lai.", rubric: "Nêu đúng cơ hội: nguồn lao động dồi dào, thị trường tiêu thụ lớn (0,75đ); nêu đúng thách thức: giải quyết việc làm, nâng cao chất lượng lao động, chuẩn bị cho già hoá dân số (0,75đ); nêu được việc làm phù hợp của học sinh (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 9, topic: "Chiến tranh thế giới thứ hai (1939–1945)", week: 7,
    yccd: "Trình bày được nguyên nhân, diễn biến chính của Chiến tranh thế giới thứ hai; phân tích được hậu quả và vai trò của Liên Xô, các nước Đồng minh.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Chiến tranh thế giới thứ hai bùng nổ khi phát xít Đức tấn công nước nào (ngày 1/9/1939)?", options: ["Pháp", "Liên Xô", "Anh", "Ba Lan"], answer: 3 },
      { t: "mcq", lv: "NB", stem: "Ngày 7/12/1941, Nhật Bản bất ngờ tấn công căn cứ hải quân nào của Mỹ?", options: ["Trân Châu Cảng", "Mi-đuê", "Ô-ki-na-oa", "Xin-ga-po"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Chiến thắng nào của Hồng quân Liên Xô (1942–1943) đã tạo bước ngoặt của chiến tranh, chuyển Liên Xô và phe Đồng minh sang thế tấn công?", options: ["Trận Mát-xcơ-va", "Trận Xta-lin-grát", "Trận Béc-lin", "Trận Lê-nin-grát"], answer: 1 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về giai đoạn kết thúc Chiến tranh thế giới thứ hai.", statements: ["Ngày 9/5/1945, phát xít Đức kí văn kiện đầu hàng không điều kiện.", "Tháng 8/1945, Mỹ ném hai quả bom nguyên tử xuống Hi-rô-si-ma và Na-ga-xa-ki.", "Ngày 15/8/1945, Nhật Bản tuyên bố đầu hàng không điều kiện.", "Liên Xô không tham gia đánh bại quân Nhật ở châu Á."], answer: [true, true, true, false], explanation: "Tháng 8/1945, Liên Xô tiêu diệt đạo quân Quan Đông của Nhật ở Đông Bắc Trung Quốc." },
      { t: "essay", lv: "VD", stem: "Từ hậu quả nặng nề của Chiến tranh thế giới thứ hai, em hãy rút ra bài học về việc bảo vệ hoà bình thế giới hiện nay và trách nhiệm của học sinh.", rubric: "Nêu đúng hậu quả: hơn 60 triệu người chết, thiệt hại vật chất to lớn (0,5đ); rút ra bài học: ngăn chặn chủ nghĩa phát xít, chiến tranh, giải quyết tranh chấp bằng biện pháp hoà bình, tăng cường hợp tác quốc tế (1đ); nêu được trách nhiệm của học sinh (0,5đ).", points: 2 },
    ],
  },
  {
    subject: "Lịch sử và Địa lí", grade: 9, topic: "Nguyễn Ái Quốc và sự thành lập Đảng Cộng sản Việt Nam", week: 11,
    yccd: "Nêu được những hoạt động chủ yếu của Nguyễn Ái Quốc giai đoạn 1918–1930; trình bày được sự thành lập và ý nghĩa của Đảng Cộng sản Việt Nam.",
    qs: [
      { t: "mcq", lv: "NB", stem: "Năm 1919, Nguyễn Ái Quốc gửi tới Hội nghị Véc-xai văn kiện nào?", options: ["Đường Kách mệnh", "Bản án chế độ thực dân Pháp", "Bản yêu sách của nhân dân An Nam", "Chính cương vắn tắt"], answer: 2 },
      { t: "mcq", lv: "NB", stem: "Hội nghị thành lập Đảng Cộng sản Việt Nam diễn ra đầu năm 1930 tại", options: ["Cửu Long (Hương Cảng, Trung Quốc)", "Quảng Châu (Trung Quốc)", "Pa-ri (Pháp)", "Pác Bó (Cao Bằng)"], answer: 0 },
      { t: "mcq", lv: "TH", stem: "Sự kiện nào đánh dấu Nguyễn Ái Quốc tìm thấy con đường cứu nước đúng đắn cho dân tộc?", options: ["Ra đi tìm đường cứu nước năm 1911", "Đọc bản Sơ thảo lần thứ nhất những luận cương về vấn đề dân tộc và vấn đề thuộc địa của Lê-nin (7/1920)", "Gửi Bản yêu sách tới Hội nghị Véc-xai (1919)", "Thành lập Hội Việt Nam Cách mạng Thanh niên (1925)"], answer: 1 },
      { t: "tf", lv: "TH", stem: "Xét tính đúng/sai của các nhận định về hoạt động của Nguyễn Ái Quốc (1919–1930).", statements: ["Tháng 12/1920, Nguyễn Ái Quốc tham gia sáng lập Đảng Cộng sản Pháp.", "Năm 1925, Nguyễn Ái Quốc thành lập Hội Việt Nam Cách mạng Thanh niên tại Quảng Châu.", "Tác phẩm “Đường Kách mệnh” được xuất bản ở Pa-ri năm 1919.", "Sự ra đời của Đảng Cộng sản Việt Nam là bước ngoặt vĩ đại của cách mạng Việt Nam."], answer: [true, true, false, true], explanation: "“Đường Kách mệnh” xuất bản năm 1927 tại Quảng Châu." },
      { t: "essay", lv: "VD", stem: "Vì sao nói sự ra đời của Đảng Cộng sản Việt Nam (đầu năm 1930) là bước ngoặt vĩ đại của cách mạng Việt Nam? Em học tập được điều gì từ hành trình tìm đường cứu nước của Nguyễn Ái Quốc?", rubric: "Nêu được Đảng ra đời chấm dứt cuộc khủng hoảng về đường lối và giai cấp lãnh đạo (0,75đ); cách mạng Việt Nam trở thành một bộ phận của cách mạng thế giới, chuẩn bị cho những thắng lợi về sau (0,75đ); nêu được bài học cho bản thân: lòng yêu nước, ý chí, tinh thần học hỏi (0,5đ).", points: 2 },
    ],
  },
];
