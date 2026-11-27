// Nội dung phía tự học (tĩnh, không gọi AI) cho server demo: lời giải từng bước công khai, kho tri thức gia sư,
// phiên gia sư của Minh Anh, lộ trình thành thạo, giáo trình sống. Thế giới mẫu: docs/demo/the-gioi-mau.md.
// Kiểm: pnpm exec tsx scripts/demo-data/check.ts scripts/demo-data/content-hoc.ts
import type { DBook, DChat, DKb, DPath, DSolution, TeacherKey } from "./types";

/** Chuỗi giữ nguyên dấu "\" cho LaTeX. */
const r = String.raw;
/** Như r nhưng cho phép viết mã nội dòng: \` → ` (markdown). */
const md = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/\\`/g, "`");
const F = "```";
const sol = (owner: TeacherKey, daysAgo: number, views: number, solution: Record<string, unknown>): DSolution => ({ owner, daysAgo, views, solution });

// =====================================================================================
// 1. LỜI GIẢI TỪNG BƯỚC (thư viện /loi-giai)
// =====================================================================================

export const SOLUTIONS: DSolution[] = [
  // ---------------- Toán 10 ----------------
  sol("ha", 4, 874, {
    problem: r`Quầy nước chanh của lớp 10A1 bán $x$ chục cốc thì lãi $P(x) = -x^2 + 6x - 5$ (trăm nghìn đồng). Hỏi lớp cần bán bao nhiêu chục cốc để có lãi? Bán bao nhiêu chục cốc thì lãi nhiều nhất và lãi bao nhiêu?`,
    subject: "Toán",
    topic: "Bất phương trình bậc hai một ẩn",
    answer: r`Có lãi khi $1 < x < 5$ (bán hơn 1 chục và dưới 5 chục cốc); lãi nhiều nhất 400 nghìn đồng khi bán 3 chục cốc.`,
    figure: { kind: "graph", spec: { expr: "-x^2+6x-5", xRange: [-0.5, 6.5], points: [{ id: "A", x: 1, y: 0, label: "x = 1" }, { id: "B", x: 5, y: 0, label: "x = 5" }, { id: "I", x: 3, y: 4, label: "Đỉnh (3; 4)" }] } },
    steps: [
      { title: "Đọc đủ yêu cầu và dịch đề thành bất phương trình", body: r`Đề hỏi **hai ý**: (1) bán bao nhiêu để có lãi, (2) bán bao nhiêu để lãi nhiều nhất. Em gạch chân cả hai trước khi làm nhé.

"Có lãi" nghĩa là lãi dương: $P(x) > 0 \iff -x^2 + 6x - 5 > 0$.` },
      { title: "Tìm nghiệm của tam thức", body: r`Giải $-x^2 + 6x - 5 = 0 \iff x^2 - 6x + 5 = 0 \iff (x-1)(x-5) = 0$.

Vậy tam thức có hai nghiệm $x_1 = 1$, $x_2 = 5$.`, refs: ["A", "B"], check: { type: "equation", lhs: "-x^2+6x-5", rhs: "0", roots: ["1", "5"] } },
      { title: "Xét dấu tam thức", body: r`Hệ số $a = -1 < 0$. Theo định lí dấu tam thức: **trong khoảng hai nghiệm, $P(x)$ trái dấu với $a$**, tức là dương.

| $x$ | $-\infty$ | | $1$ | | $5$ | | $+\infty$ |
|---|---|---|---|---|---|---|---|
| $P(x)$ | | $-$ | $0$ | $+$ | $0$ | $-$ | |

Nên $P(x) > 0 \iff 1 < x < 5$. Trên đồ thị, đó là đoạn parabol nằm **trên** trục hoành.`, refs: ["f", "A", "B"], check: { type: "inequality", lhs: "-x^2+6x-5", op: ">", rhs: "0", solution: [["1", "5"]] } },
      { title: "Tìm mức bán cho lãi nhiều nhất", body: r`Parabol quay bề lõm xuống nên lãi lớn nhất tại đỉnh: $x = -\dfrac{b}{2a} = -\dfrac{6}{2\cdot(-1)} = 3$.

$P(3) = -9 + 18 - 5 = 4$ (trăm nghìn đồng), tức **400 nghìn đồng**.`, refs: ["I"], check: { type: "value", expr: "-x^2+6x-5", at: "3", expect: "4" } },
      { title: "Kết luận và một lưu ý nhỏ", body: r`Lớp có lãi khi bán từ hơn 1 chục đến dưới 5 chục cốc; bán đúng 3 chục cốc thì lãi nhiều nhất 400 nghìn đồng.

**Lưu ý:** nếu em nhân hai vế với $-1$ để được $x^2 - 6x + 5 < 0$ thì **phải đổi chiều** từ $>$ sang $<$. Thử lại bằng đời thực: bán 3 chục cốc lãi 400 nghìn, nên $x = 3$ chắc chắn phải nằm trong tập nghiệm.` },
    ],
  }),
  sol("ha", 9, 512, {
    problem: r`Giải bất phương trình $x^2 - 5x + 6 \le 0$.`,
    subject: "Toán",
    topic: "Bất phương trình bậc hai một ẩn",
    answer: r`$S = [2; 3]$`,
    figure: { kind: "graph", spec: { expr: "x^2-5x+6", xRange: [0, 5], points: [{ id: "A", x: 2, y: 0, label: "x = 2" }, { id: "B", x: 3, y: 0, label: "x = 3" }] } },
    steps: [
      { title: "Tìm nghiệm tam thức", body: r`$x^2 - 5x + 6 = 0$ có $\Delta = 25 - 24 = 1 > 0$, hai nghiệm $x = \dfrac{5 \pm 1}{2}$, tức $x_1 = 2$, $x_2 = 3$.`, refs: ["A", "B"], check: { type: "equation", lhs: "x^2-5x+6", roots: ["2", "3"] } },
      { title: "Xét dấu", body: r`$a = 1 > 0$ nên tam thức **âm trong khoảng hai nghiệm**, dương ở hai bên, bằng $0$ tại $x = 2$ và $x = 3$.`, refs: ["f"] },
      { title: "Viết tập nghiệm (chú ý dấu bằng)", body: r`Dấu $\le$ cho phép bằng $0$, nên **lấy cả hai đầu mút**: $S = [2; 3]$.

Lỗi hay gặp: viết $(2; 3)$ là bỏ sót hai nghiệm $x = 2$ và $x = 3$.`, check: { type: "inequality", lhs: "x^2-5x+6", op: "<=", rhs: "0", solution: [["2", "3"]] } },
    ],
  }),
  sol("ha", 6, 689, {
    problem: r`Giải bất phương trình $-2x^2 + 3x + 5 \ge 0$.`,
    subject: "Toán",
    topic: "Bất phương trình bậc hai một ẩn",
    answer: r`$S = \left[-1; \dfrac{5}{2}\right]$`,
    steps: [
      { title: "Đưa hệ số a về dương (nhớ đổi chiều)", body: r`Nhân hai vế với $-1$, một số **âm**, nên **đổi chiều** bất đẳng thức:
$$-2x^2 + 3x + 5 \ge 0 \iff 2x^2 - 3x - 5 \le 0.$$
Đây là chỗ dễ sai nhất của bài: giữ nguyên dấu $\ge$ sẽ ra tập nghiệm ngược hoàn toàn.` },
      { title: "Tìm nghiệm tam thức", body: r`$\Delta = (-3)^2 - 4\cdot 2\cdot(-5) = 9 + 40 = 49$, $\sqrt{\Delta} = 7$.
$$x_1 = \frac{3 - 7}{4} = -1, \qquad x_2 = \frac{3 + 7}{4} = \frac{5}{2}.$$`, check: { type: "equation", lhs: "2x^2-3x-5", roots: ["-1", "5/2"] } },
      { title: "Xét dấu và kết luận", body: r`$2x^2 - 3x - 5$ có $a = 2 > 0$ nên $\le 0$ khi $-1 \le x \le \dfrac{5}{2}$.

Vậy $S = \left[-1; \dfrac{5}{2}\right]$.`, check: { type: "inequality", lhs: "-2x^2+3x+5", op: ">=", rhs: "0", solution: [["-1", "5/2"]] } },
      { title: "Tự kiểm nhanh", body: r`Thử $x = 0$ (nằm trong tập nghiệm) vào đề gốc: $-2\cdot 0 + 0 + 5 = 5 \ge 0$, đúng. Thử $x = 3$ (nằm ngoài): $-18 + 9 + 5 = -4 < 0$, đúng là không thoả. Hai phép thử khớp, em yên tâm.` },
    ],
  }),
  sol("ha", 12, 403, {
    problem: r`Xét dấu tam thức $f(x) = -x^2 + 2x - 3$. Từ đó giải bất phương trình $f(x) \ge 0$.`,
    subject: "Toán",
    topic: "Dấu của tam thức bậc hai",
    answer: r`$f(x) < 0$ với mọi $x \in \mathbb{R}$; bất phương trình $f(x) \ge 0$ vô nghiệm, $S = \varnothing$.`,
    steps: [
      { title: "Tính biệt thức", body: r`$a = -1$, $b = 2$, $c = -3$, $b' = 1$. Ta có $\Delta' = b'^2 - ac = 1 - 3 = -2 < 0$.` },
      { title: "Áp dụng định lí dấu", body: r`Khi $\Delta < 0$, tam thức **luôn cùng dấu với $a$** với mọi $x$. Vì $a = -1 < 0$ nên $f(x) < 0$ với mọi $x \in \mathbb{R}$.

Cách nhìn khác: $f(x) = -(x-1)^2 - 2 \le -2 < 0$.`, check: { type: "inequality", lhs: "-x^2+2x-3", op: "<", rhs: "0", solution: [["-inf", "inf"]] } },
      { title: "Kết luận", body: r`Không có $x$ nào làm $f(x) \ge 0$, nên bất phương trình vô nghiệm: $S = \varnothing$.`, check: { type: "inequality", lhs: "-x^2+2x-3", op: ">=", rhs: "0", solution: [] } },
    ],
  }),
  sol("thu", 15, 356, {
    problem: r`Tìm $m$ để $x^2 - 2mx + m + 2 > 0$ với mọi $x \in \mathbb{R}$.`,
    subject: "Toán",
    topic: "Dấu của tam thức bậc hai",
    answer: r`$-1 < m < 2$`,
    steps: [
      { title: "Nhớ điều kiện tam thức luôn dương", body: r`Tam thức $ax^2 + bx + c$ (với $a \ne 0$) dương với mọi $x$ khi và chỉ khi $a > 0$ và $\Delta < 0$.

Ở đây $a = 1 > 0$ luôn đúng, chỉ cần $\Delta' < 0$.` },
      { title: "Lập điều kiện theo m", body: r`$\Delta' = m^2 - (m + 2) = m^2 - m - 2$.

$\Delta' < 0 \iff m^2 - m - 2 < 0 \iff (m+1)(m-2) < 0 \iff -1 < m < 2$.` },
      { title: "Thử lại với m = 0 (nằm trong khoảng)", body: r`Với $m = 0$: $x^2 + 2 > 0$ với mọi $x$, đúng như mong đợi.`, check: { type: "inequality", lhs: "x^2+2", op: ">", rhs: "0", solution: [["-inf", "inf"]] } },
      { title: "Thử biên m = 2 (bị loại)", body: r`Với $m = 2$: $x^2 - 4x + 4 = (x-2)^2$, bằng $0$ tại $x = 2$ nên **không** dương với mọi $x$. Vì vậy dấu của điều kiện là $<$ chứ không phải $\le$.

Kết luận: $-1 < m < 2$.`, check: { type: "equation", lhs: "x^2-4x+4", roots: ["2"] } },
    ],
  }),
  sol("ha", 21, 598, {
    problem: r`Lập bảng biến thiên và vẽ đồ thị hàm số $y = x^2 - 4x + 3$.`,
    subject: "Toán",
    topic: "Hàm số bậc hai",
    answer: r`Đỉnh $I(2; -1)$, trục đối xứng $x = 2$; hàm số nghịch biến trên $(-\infty; 2)$, đồng biến trên $(2; +\infty)$; đồ thị cắt $Oy$ tại $(0; 3)$, cắt $Ox$ tại $(1; 0)$ và $(3; 0)$.`,
    figure: { kind: "graph", spec: { expr: "x^2-4x+3", xRange: [-1, 5], points: [{ id: "I", x: 2, y: -1, label: "I(2; −1)" }, { id: "A", x: 1, y: 0, label: "(1; 0)" }, { id: "B", x: 3, y: 0, label: "(3; 0)" }, { id: "C", x: 0, y: 3, label: "(0; 3)" }] } },
    steps: [
      { title: "Tìm đỉnh và trục đối xứng", body: r`$a = 1$, $b = -4$, $c = 3$. Hoành độ đỉnh $x = -\dfrac{b}{2a} = 2$, tung độ $y(2) = 4 - 8 + 3 = -1$.

Đỉnh $I(2; -1)$, trục đối xứng là đường thẳng $x = 2$.`, refs: ["I"], check: { type: "value", expr: "x^2-4x+3", at: "2", expect: "-1" } },
      { title: "Bảng biến thiên", body: r`$a = 1 > 0$ nên parabol quay bề lõm lên, giá trị nhỏ nhất là $-1$ tại $x = 2$.

| $x$ | $-\infty$ | | $2$ | | $+\infty$ |
|---|---|---|---|---|---|
| $y$ | $+\infty$ | $\searrow$ | $-1$ | $\nearrow$ | $+\infty$ |

Hàm số nghịch biến trên $(-\infty; 2)$ và đồng biến trên $(2; +\infty)$.` },
      { title: "Tìm giao điểm với hai trục", body: r`Với $Oy$: $x = 0 \Rightarrow y = 3$, điểm $(0; 3)$.

Với $Ox$: $x^2 - 4x + 3 = 0 \iff x = 1$ hoặc $x = 3$, điểm $(1; 0)$ và $(3; 0)$.`, refs: ["A", "B", "C"], check: { type: "equation", lhs: "x^2-4x+3", roots: ["1", "3"] } },
      { title: "Vẽ đồ thị", body: r`Đánh dấu đỉnh, hai giao điểm với $Ox$, điểm $(0; 3)$ và điểm đối xứng của nó qua trục $x = 2$ là $(4; 3)$. Nối thành đường cong trơn, đối xứng qua $x = 2$.`, refs: ["f"] },
    ],
  }),
  sol("tam", 27, 241, {
    problem: r`Một quả bóng được ném thẳng lên, độ cao (mét) sau $t$ giây là $h(t) = -5t^2 + 20t + 1$. Sau bao lâu bóng đạt độ cao lớn nhất và độ cao đó là bao nhiêu?`,
    subject: "Toán",
    topic: "Hàm số bậc hai",
    answer: "Sau 2 giây, bóng đạt độ cao lớn nhất 21 m.",
    figure: { kind: "graph", spec: { expr: "-5x^2+20x+1", xRange: [0, 4.1], points: [{ id: "I", x: 2, y: 21, label: "Đỉnh (2; 21)" }] } },
    steps: [
      { title: "Nhận dạng hàm số bậc hai", body: r`$h(t)$ là hàm số bậc hai với $a = -5 < 0$: parabol quay bề lõm xuống, nên có **giá trị lớn nhất tại đỉnh**.`, refs: ["f"] },
      { title: "Tìm thời điểm đạt đỉnh", body: r`$t = -\dfrac{b}{2a} = -\dfrac{20}{2\cdot(-5)} = 2$ (giây).`, refs: ["I"] },
      { title: "Tính độ cao lớn nhất", body: r`$h(2) = -5\cdot 4 + 20\cdot 2 + 1 = -20 + 40 + 1 = 21$ (m).

Vậy sau 2 giây bóng lên cao nhất, cách mặt đất 21 m.`, refs: ["I"], check: { type: "value", expr: "-5x^2+20x+1", at: "2", expect: "21" } },
    ],
  }),
  sol("ha", 33, 327, {
    problem: r`Cho $A = [-2; 3)$ và $B = (1; 5]$. Tìm $A \cap B$, $A \cup B$, $A \setminus B$ và $C_{\mathbb{R}}A$.`,
    subject: "Toán",
    topic: "Tập hợp và các phép toán trên tập hợp",
    answer: r`$A \cap B = (1; 3)$, $A \cup B = [-2; 5]$, $A \setminus B = [-2; 1]$, $C_{\mathbb{R}}A = (-\infty; -2) \cup [3; +\infty)$.`,
    steps: [
      { title: "Biểu diễn trên trục số", body: r`Vẽ $A$ từ $-2$ (lấy, chấm tròn đặc) đến $3$ (không lấy, chấm rỗng); vẽ $B$ từ $1$ (không lấy) đến $5$ (lấy). Hai đoạn chồng lên nhau ở khoảng giữa $1$ và $3$.` },
      { title: "Giao và hợp", body: r`$A \cap B$ là phần chung: $(1; 3)$, cả hai đầu đều không lấy (vì $1 \notin B$, $3 \notin A$).

$A \cup B$ là phần phủ bởi ít nhất một tập: $[-2; 5]$.` },
      { title: "Hiệu", body: r`$A \setminus B$ gồm các phần tử thuộc $A$ nhưng không thuộc $B$: từ $-2$ đến $1$. Số $1$ thuộc $A$ và không thuộc $B$ nên **được lấy**: $A \setminus B = [-2; 1]$.` },
      { title: "Phần bù", body: r`$C_{\mathbb{R}}A = \mathbb{R} \setminus A = (-\infty; -2) \cup [3; +\infty)$. Đầu mút đổi trạng thái: $-2$ đang được lấy trong $A$ thì bị bỏ, $3$ đang bị bỏ thì được lấy.` },
    ],
  }),
  sol("ha", 38, 214, {
    problem: r`Xét tính đúng sai và lập mệnh đề phủ định của các mệnh đề: (a) $P$: "$\forall x \in \mathbb{R},\ x^2 - 2x + 2 > 0$"; (b) $Q$: "$\exists n \in \mathbb{N},\ n^2 = 2$".`,
    subject: "Toán",
    topic: "Mệnh đề toán học",
    answer: r`$P$ đúng, $\overline{P}$: "$\exists x \in \mathbb{R},\ x^2 - 2x + 2 \le 0$" sai. $Q$ sai, $\overline{Q}$: "$\forall n \in \mathbb{N},\ n^2 \ne 2$" đúng.`,
    steps: [
      { title: "Xét mệnh đề P", body: r`$x^2 - 2x + 2 = (x-1)^2 + 1 \ge 1 > 0$ với mọi $x$. Vậy $P$ **đúng**.`, check: { type: "inequality", lhs: "x^2-2x+2", op: ">", rhs: "0", solution: [["-inf", "inf"]] } },
      { title: "Phủ định P", body: r`Quy tắc: "$\forall$" đổi thành "$\exists$", và phủ định phần tính chất ("$>$" thành "$\le$").

$\overline{P}$: "$\exists x \in \mathbb{R},\ x^2 - 2x + 2 \le 0$". Vì $P$ đúng nên $\overline{P}$ sai.` },
      { title: "Xét mệnh đề Q", body: r`$n^2 = 2 \iff n = \pm\sqrt{2}$, không phải số tự nhiên. Vậy $Q$ **sai**.` },
      { title: "Phủ định Q", body: r`"$\exists$" đổi thành "$\forall$", "$=$" thành "$\ne$": $\overline{Q}$: "$\forall n \in \mathbb{N},\ n^2 \ne 2$", mệnh đề **đúng**.

Mẹo nhớ: mệnh đề và phủ định của nó luôn có đúng một cái đúng.` },
    ],
  }),
  sol("ha", 44, 286, {
    problem: r`Cho hội chợ Xuân, nhóm bạn làm thiệp và móc khoá. Mỗi chục thiệp cần 1 giờ cắt và 1 giờ trang trí, lãi 200 nghìn đồng; mỗi chục móc khoá cần 1 giờ cắt và 2 giờ trang trí, lãi 300 nghìn đồng. Nhóm có tối đa 4 giờ cắt và 6 giờ trang trí. Làm bao nhiêu chục mỗi loại để lãi nhiều nhất?`,
    subject: "Toán",
    topic: "Bất phương trình bậc nhất hai ẩn",
    answer: "Làm 2 chục thiệp và 2 chục móc khoá, lãi nhiều nhất 1 triệu đồng.",
    figure: { kind: "plane", spec: { points: [{ id: "O", x: 0, y: 0 }, { id: "A", x: 4, y: 0 }, { id: "B", x: 2, y: 2 }, { id: "C", x: 0, y: 3 }], segments: [["O", "A"], ["A", "B"], ["B", "C"], ["C", "O"]] } },
    steps: [
      { title: "Đặt ẩn và lập hệ", body: r`Gọi $x$, $y$ là số chục thiệp và móc khoá ($x \ge 0$, $y \ge 0$).

Giờ cắt: $x + y \le 4$. Giờ trang trí: $x + 2y \le 6$.

Lãi (trăm nghìn đồng): $F = 2x + 3y$, cần lớn nhất.` },
      { title: "Vẽ miền nghiệm", body: r`Miền nghiệm là tứ giác $OABC$ với $O(0; 0)$, $A(4; 0)$, $C(0; 3)$ và $B$ là giao của $x + y = 4$ với $x + 2y = 6$.

Trừ hai phương trình: $y = 2$, suy ra $x = 2$, nên $B(2; 2)$.`, refs: ["O", "A", "B", "C", "O-A", "A-B", "B-C", "C-O"] },
      { title: "Tính F tại các đỉnh", body: r`$F(O) = 0$, $F(A) = 8$, $F(C) = 9$, $F(B) = 2\cdot 2 + 3\cdot 2 = 10$.

Giá trị lớn nhất của biểu thức bậc nhất trên miền đa giác đạt tại một đỉnh, nên $\max F = 10$ tại $B(2; 2)$.`, refs: ["B"], check: { type: "value", expr: "2*2+3*2", expect: "10" } },
      { title: "Kết luận", body: "Làm 2 chục thiệp và 2 chục móc khoá, lãi $10$ trăm nghìn, tức **1 triệu đồng**." },
    ],
    checks: [{ type: "value", expr: "2*4+3*0", expect: "8" }, { type: "value", expr: "2*0+3*3", expect: "9" }],
  }),
  // ---------------- Toán 11 ----------------
  sol("thu", 18, 437, {
    problem: r`Cho $\sin a = \dfrac{3}{5}$ với $\dfrac{\pi}{2} < a < \pi$. Tính $\cos a$, $\sin 2a$ và $\cos 2a$.`,
    subject: "Toán",
    topic: "Công thức lượng giác",
    answer: r`$\cos a = -\dfrac{4}{5}$, $\sin 2a = -\dfrac{24}{25}$, $\cos 2a = \dfrac{7}{25}$.`,
    steps: [
      { title: "Tìm cos a, chú ý dấu", body: r`$\cos^2 a = 1 - \sin^2 a = 1 - \dfrac{9}{25} = \dfrac{16}{25}$.

Vì $a$ thuộc góc phần tư thứ II nên $\cos a < 0$: $\cos a = -\dfrac{4}{5}$.`, check: { type: "value", expr: "-sqrt(1-(3/5)^2)", expect: "-4/5" } },
      { title: "Tính sin 2a", body: r`$\sin 2a = 2\sin a\cos a = 2\cdot\dfrac{3}{5}\cdot\left(-\dfrac{4}{5}\right) = -\dfrac{24}{25}$.`, check: { type: "value", expr: "2*(3/5)*(-4/5)", expect: "-24/25" } },
      { title: "Tính cos 2a", body: r`Dùng dạng chỉ cần $\sin a$: $\cos 2a = 1 - 2\sin^2 a = 1 - 2\cdot\dfrac{9}{25} = \dfrac{7}{25}$.

Kiểm chéo: $\cos^2 a - \sin^2 a = \dfrac{16}{25} - \dfrac{9}{25} = \dfrac{7}{25}$, khớp.`, check: { type: "value", expr: "1-2*(3/5)^2", expect: "7/25" } },
    ],
  }),
  sol("tam", 24, 302, {
    problem: r`Cho cấp số cộng $(u_n)$ có $u_1 = 3$ và $u_5 = 19$. Tìm công sai $d$, số hạng $u_{20}$ và tổng $S_{20}$ của 20 số hạng đầu.`,
    subject: "Toán",
    topic: "Cấp số cộng",
    answer: r`$d = 4$, $u_{20} = 79$, $S_{20} = 820$.`,
    steps: [
      { title: "Tìm công sai", body: r`$u_5 = u_1 + 4d \iff 19 = 3 + 4d \iff d = 4$.`, check: { type: "equation", lhs: "3+4x", rhs: "19", roots: ["4"] } },
      { title: "Tính số hạng thứ 20", body: r`$u_{20} = u_1 + 19d = 3 + 19\cdot 4 = 79$.`, check: { type: "value", expr: "3+19*4", expect: "79" } },
      { title: "Tính tổng 20 số hạng đầu", body: r`$S_{20} = \dfrac{20\,(u_1 + u_{20})}{2} = 10\cdot(3 + 79) = 820$.`, check: { type: "value", expr: "20*(3+79)/2", expect: "820" } },
    ],
  }),
  // ---------------- Toán 12 ----------------
  sol("tam", 30, 388, {
    problem: r`Tìm các điểm cực trị của hàm số $y = x^3 - 3x^2 + 2$.`,
    subject: "Toán",
    topic: "Cực trị của hàm số",
    answer: r`Cực đại tại $x = 0$, $y_{CĐ} = 2$; cực tiểu tại $x = 2$, $y_{CT} = -2$.`,
    figure: { kind: "graph", spec: { expr: "x^3-3x^2+2", xRange: [-1.5, 3.5], points: [{ id: "M", x: 0, y: 2, label: "CĐ (0; 2)" }, { id: "N", x: 2, y: -2, label: "CT (2; −2)" }] } },
    steps: [
      { title: "Tính đạo hàm", body: r`Tập xác định $\mathbb{R}$. $y' = 3x^2 - 6x = 3x(x - 2)$.` },
      { title: "Giải y' = 0", body: r`$y' = 0 \iff x = 0$ hoặc $x = 2$.`, check: { type: "equation", lhs: "3x^2-6x", roots: ["0", "2"] } },
      { title: "Xét dấu y' và kết luận", body: r`$y' > 0$ trên $(-\infty; 0)$ và $(2; +\infty)$, $y' < 0$ trên $(0; 2)$.

$y'$ đổi dấu từ $+$ sang $-$ tại $x = 0$: cực đại, $y(0) = 2$. Đổi dấu từ $-$ sang $+$ tại $x = 2$: cực tiểu, $y(2) = 8 - 12 + 2 = -2$.`, refs: ["M", "N", "f"], check: { type: "value", expr: "x^3-3x^2+2", at: "2", expect: "-2" } },
    ],
    checks: [{ type: "value", expr: "x^3-3x^2+2", at: "0", expect: "2" }, { type: "derivative", f: "x^3-3x^2+2", at: "2", expect: "0" }],
  }),
  sol("tam", 52, 451, {
    problem: r`Từ một tấm bìa hình vuông cạnh 12 cm, người ta cắt bốn hình vuông nhỏ cạnh $x$ (cm) ở bốn góc rồi gấp thành chiếc hộp không nắp. Tìm $x$ để thể tích hộp lớn nhất.`,
    subject: "Toán",
    topic: "Giá trị lớn nhất, nhỏ nhất của hàm số",
    answer: r`$x = 2$ cm, thể tích lớn nhất $128\ \text{cm}^3$.`,
    figure: { kind: "graph", spec: { expr: "x*(12-2x)^2", xRange: [0, 6], points: [{ id: "M", x: 2, y: 128, label: "(2; 128)" }] } },
    steps: [
      { title: "Lập hàm thể tích", body: r`Đáy hộp là hình vuông cạnh $12 - 2x$, chiều cao $x$, với $0 < x < 6$.
$$V(x) = x\,(12 - 2x)^2.$$` },
      { title: "Tính đạo hàm", body: r`$V'(x) = (12 - 2x)^2 - 4x(12 - 2x) = (12 - 2x)(12 - 6x)$.

Trên $(0; 6)$: $V'(x) = 0 \iff x = 2$.`, check: { type: "derivative", f: "x*(12-2x)^2", at: "2", expect: "0" } },
      { title: "So sánh và kết luận", body: r`$V' > 0$ trên $(0; 2)$, $V' < 0$ trên $(2; 6)$ nên $V$ đạt lớn nhất tại $x = 2$:
$$V(2) = 2\cdot 8^2 = 128\ \text{cm}^3.$$`, refs: ["M"], check: { type: "value", expr: "x*(12-2x)^2", at: "2", expect: "128" } },
    ],
  }),
  // ---------------- Toán 8–9 ----------------
  sol("hung", 41, 167, {
    problem: r`Giải hệ phương trình $\begin{cases} 2x + y = 7 \\ x - y = -1 \end{cases}$`,
    subject: "Toán",
    topic: "Hệ hai phương trình bậc nhất hai ẩn",
    answer: r`$(x; y) = (2; 3)$`,
    steps: [
      { title: "Rút y từ phương trình thứ hai", body: r`$x - y = -1 \iff y = x + 1$.` },
      { title: "Thế vào phương trình thứ nhất", body: r`$2x + (x + 1) = 7 \iff 3x = 6 \iff x = 2$.`, check: { type: "equation", lhs: "2x+(x+1)", rhs: "7", roots: ["2"] } },
      { title: "Tìm y và thử lại", body: r`$y = 2 + 1 = 3$. Thử lại: $2\cdot 2 + 3 = 7$ và $2 - 3 = -1$, cả hai đều đúng.

Hệ có nghiệm duy nhất $(2; 3)$.`, check: { type: "value", expr: "2*2+3", expect: "7" } },
    ],
  }),
  sol("hung", 58, 133, {
    problem: r`Giải phương trình $\dfrac{x - 1}{2} + \dfrac{x}{3} = 3$.`,
    subject: "Toán",
    topic: "Phương trình bậc nhất một ẩn",
    answer: r`$x = \dfrac{21}{5}$`,
    steps: [
      { title: "Quy đồng, khử mẫu", body: r`Mẫu chung là $6$. Nhân hai vế với $6$: $3(x - 1) + 2x = 18$.` },
      { title: "Thu gọn và giải", body: r`$3x - 3 + 2x = 18 \iff 5x = 21 \iff x = \dfrac{21}{5}$.`, check: { type: "equation", lhs: "(x-1)/2+x/3", rhs: "3", roots: ["21/5"] } },
      { title: "Kết luận", body: r`Phương trình có nghiệm duy nhất $x = \dfrac{21}{5}$ (tức $4{,}2$). Lỗi hay gặp: nhân $6$ mà quên nhân vế phải, ra $5x - 3 = 3$.` },
    ],
  }),

  // ---------------- Vật lí ----------------
  sol("binh", 7, 655, {
    problem: r`Thả rơi tự do một hòn bi từ độ cao 45 m so với mặt đất, lấy $g = 10\ \text{m/s}^2$, bỏ qua sức cản không khí. Tính thời gian rơi, tốc độ khi chạm đất và quãng đường bi đi được trong giây cuối cùng.`,
    subject: "Vật lí",
    topic: "Rơi tự do",
    answer: "t = 3 s; v = 30 m/s; quãng đường trong giây cuối là 25 m.",
    steps: [
      { title: "Thời gian rơi", body: r`Từ $h = \dfrac{1}{2}gt^2$ suy ra $t = \sqrt{\dfrac{2h}{g}} = \sqrt{\dfrac{2\cdot 45}{10}} = 3$ (s).`, check: { type: "value", expr: "sqrt(2*45/10)", expect: "3" } },
      { title: "Tốc độ khi chạm đất", body: r`$v = gt = 10\cdot 3 = 30$ (m/s). Kiểm chéo: $v = \sqrt{2gh} = \sqrt{900} = 30$ m/s.`, check: { type: "value", expr: "sqrt(2*10*45)", expect: "30" } },
      { title: "Quãng đường trong giây cuối", body: r`Trong 2 s đầu bi rơi được $\dfrac{1}{2}\cdot 10\cdot 2^2 = 20$ (m). Giây cuối (từ $t = 2$ s đến $t = 3$ s): $\Delta s = 45 - 20 = 25$ (m).

Lỗi hay gặp: lấy $\dfrac{1}{2}g\cdot 1^2 = 5$ m, đó là quãng đường trong **giây đầu**, không phải giây cuối.`, check: { type: "value", expr: "45-0.5*10*2^2", expect: "25" } },
    ],
  }),
  sol("binh", 16, 392, {
    problem: r`Một ô tô đang chạy với tốc độ 54 km/h thì hãm phanh, chuyển động chậm dần đều và dừng lại sau 5 s. Tính gia tốc và quãng đường ô tô đi được từ lúc hãm phanh đến khi dừng.`,
    subject: "Vật lí",
    topic: "Chuyển động thẳng biến đổi đều",
    answer: r`$a = -3\ \text{m/s}^2$; quãng đường $37{,}5$ m.`,
    steps: [
      { title: "Đổi đơn vị", body: r`$v_0 = 54$ km/h $= \dfrac{54}{3{,}6} = 15$ m/s; $v = 0$; $t = 5$ s.`, check: { type: "value", expr: "54/3.6", expect: "15" } },
      { title: "Gia tốc", body: r`$a = \dfrac{v - v_0}{t} = \dfrac{0 - 15}{5} = -3\ \text{m/s}^2$. Dấu âm cho biết gia tốc ngược chiều chuyển động.`, check: { type: "value", expr: "(0-15)/5", expect: "-3" } },
      { title: "Quãng đường", body: r`$s = v_0t + \dfrac{1}{2}at^2 = 15\cdot 5 - \dfrac{1}{2}\cdot 3\cdot 25 = 75 - 37{,}5 = 37{,}5$ (m).

Kiểm chéo bằng $v^2 - v_0^2 = 2as$: $s = \dfrac{0 - 225}{2\cdot(-3)} = 37{,}5$ m.`, check: { type: "value", expr: "15*5-0.5*3*5^2", expect: "37,5" } },
    ],
  }),
  sol("binh", 25, 276, {
    problem: r`Một vật khối lượng 2 kg đặt trên sàn nằm ngang, chịu lực kéo 10 N theo phương ngang. Hệ số ma sát trượt giữa vật và sàn là $0{,}2$; lấy $g = 10\ \text{m/s}^2$. Tính gia tốc của vật và quãng đường vật đi được sau 4 s kể từ lúc bắt đầu chuyển động.`,
    subject: "Vật lí",
    topic: "Ba định luật Newton",
    answer: r`$a = 3\ \text{m/s}^2$; sau 4 s vật đi được 24 m.`,
    steps: [
      { title: "Phân tích lực", body: r`Vật chịu: trọng lực $\vec{P}$, phản lực $\vec{N}$, lực kéo $\vec{F}$, lực ma sát $\vec{F}_{ms}$ ngược chiều chuyển động. Theo phương thẳng đứng $N = P = mg = 20$ N.` },
      { title: "Lực ma sát", body: r`$F_{ms} = \mu N = 0{,}2\cdot 20 = 4$ (N).`, check: { type: "value", expr: "0.2*2*10", expect: "4" } },
      { title: "Gia tốc theo định luật II Newton", body: r`Chọn chiều dương theo chiều chuyển động: $F - F_{ms} = ma$, nên $a = \dfrac{10 - 4}{2} = 3\ \text{m/s}^2$.`, check: { type: "value", expr: "(10-0.2*2*10)/2", expect: "3" } },
      { title: "Quãng đường sau 4 s", body: r`Vật xuất phát từ nghỉ: $s = \dfrac{1}{2}at^2 = \dfrac{1}{2}\cdot 3\cdot 16 = 24$ (m).`, check: { type: "value", expr: "0.5*3*4^2", expect: "24" } },
    ],
  }),
  sol("binh", 36, 219, {
    problem: r`Từ độ cao 20 m, một vật được ném theo phương ngang với tốc độ 15 m/s. Lấy $g = 10\ \text{m/s}^2$, bỏ qua sức cản không khí. Tính thời gian bay, tầm bay xa và tốc độ của vật khi chạm đất.`,
    subject: "Vật lí",
    topic: "Chuyển động ném",
    answer: "t = 2 s; tầm xa L = 30 m; tốc độ chạm đất 25 m/s.",
    steps: [
      { title: "Tách hai chuyển động thành phần", body: r`Theo phương ngang: chuyển động đều với $v_x = v_0 = 15$ m/s. Theo phương thẳng đứng: rơi tự do, $v_y = gt$, $y = \dfrac{1}{2}gt^2$.` },
      { title: "Thời gian bay", body: r`$t = \sqrt{\dfrac{2h}{g}} = \sqrt{\dfrac{40}{10}} = 2$ (s). Thời gian bay chỉ phụ thuộc độ cao, không phụ thuộc $v_0$.`, check: { type: "value", expr: "sqrt(2*20/10)", expect: "2" } },
      { title: "Tầm bay xa", body: r`$L = v_0 t = 15\cdot 2 = 30$ (m).`, check: { type: "value", expr: "15*2", expect: "30" } },
      { title: "Tốc độ chạm đất", body: r`$v_y = gt = 20$ m/s, nên $v = \sqrt{v_x^2 + v_y^2} = \sqrt{15^2 + 20^2} = 25$ (m/s).`, check: { type: "value", expr: "sqrt(15^2+20^2)", expect: "25" } },
    ],
  }),
  sol("binh", 63, 154, {
    problem: r`Một con lắc lò xo gồm lò xo có độ cứng $k = 100$ N/m và vật nặng khối lượng $m = 250$ g dao động điều hoà. Tính tần số góc, chu kì và tần số dao động.`,
    subject: "Vật lí",
    topic: "Dao động điều hoà",
    answer: r`$\omega = 20$ rad/s; $T = \dfrac{\pi}{10} \approx 0{,}314$ s; $f \approx 3{,}18$ Hz.`,
    steps: [
      { title: "Đổi đơn vị", body: r`$m = 250$ g $= 0{,}25$ kg. Luôn đổi khối lượng sang kg trước khi thay vào công thức.` },
      { title: "Tần số góc", body: r`$\omega = \sqrt{\dfrac{k}{m}} = \sqrt{\dfrac{100}{0{,}25}} = \sqrt{400} = 20$ (rad/s).`, check: { type: "value", expr: "sqrt(100/0.25)", expect: "20" } },
      { title: "Chu kì và tần số", body: r`$T = \dfrac{2\pi}{\omega} = \dfrac{2\pi}{20} = \dfrac{\pi}{10} \approx 0{,}314$ (s); $f = \dfrac{1}{T} = \dfrac{10}{\pi} \approx 3{,}18$ (Hz).`, check: { type: "value", expr: "2*pi/sqrt(100/0.25)", expect: "≈ 0,314" } },
    ],
    checks: [{ type: "value", expr: "10/pi", expect: "≈ 3,18" }],
  }),

  // ---------------- Hoá học ----------------
  sol("long", 5, 721, {
    problem: r`Cân bằng phản ứng sau bằng phương pháp thăng bằng electron: $\text{Cu} + \text{HNO}_3\ (\text{loãng}) \to \text{Cu(NO}_3)_2 + \text{NO} + \text{H}_2\text{O}$.`,
    subject: "Hoá học",
    topic: "Phản ứng oxi hoá – khử",
    answer: r`$3\text{Cu} + 8\text{HNO}_3 \to 3\text{Cu(NO}_3)_2 + 2\text{NO} + 4\text{H}_2\text{O}$`,
    steps: [
      { title: "Xác định số oxi hoá thay đổi", body: r`$\overset{0}{\text{Cu}} \to \overset{+2}{\text{Cu}}$: Cu là **chất khử**. $\overset{+5}{\text{N}} \to \overset{+2}{\text{N}}$ (trong NO): $\text{HNO}_3$ là **chất oxi hoá**.` },
      { title: "Viết quá trình và tìm hệ số", body: r`Quá trình oxi hoá: $\text{Cu}^0 \to \text{Cu}^{+2} + 2e$ $\quad(\times 3)$

Quá trình khử: $\text{N}^{+5} + 3e \to \text{N}^{+2}$ $\quad(\times 2)$

Số electron cho bằng số electron nhận: $3\cdot 2 = 2\cdot 3 = 6$.`, check: { type: "value", expr: "3*2-2*3", expect: "0" } },
      { title: "Đặt hệ số và cân bằng nguyên tố còn lại", body: r`Đặt $3$ trước Cu và $\text{Cu(NO}_3)_2$, $2$ trước NO.

N: $3\cdot 2$ (trong muối) $+ 2$ (trong NO) $= 8$, nên cần $8\,\text{HNO}_3$. H: $8$ nguyên tử nên có $4\,\text{H}_2\text{O}$.` },
      { title: "Kiểm bảo toàn oxi", body: r`Vế trái: $8\cdot 3 = 24$ nguyên tử O. Vế phải: $3\cdot 6 + 2\cdot 1 + 4\cdot 1 = 24$. Khớp, phương trình đã cân bằng:
$$3\text{Cu} + 8\text{HNO}_3 \to 3\text{Cu(NO}_3)_2 + 2\text{NO} + 4\text{H}_2\text{O}.$$`, check: { type: "value", expr: "3*6+2*1+4*1", expect: "24" } },
    ],
  }),
  sol("long", 11, 463, {
    problem: r`Cân bằng phản ứng: $\text{Fe} + \text{H}_2\text{SO}_4\ (\text{đặc, nóng}) \to \text{Fe}_2(\text{SO}_4)_3 + \text{SO}_2 + \text{H}_2\text{O}$.`,
    subject: "Hoá học",
    topic: "Phản ứng oxi hoá – khử",
    answer: r`$2\text{Fe} + 6\text{H}_2\text{SO}_4 \to \text{Fe}_2(\text{SO}_4)_3 + 3\text{SO}_2 + 6\text{H}_2\text{O}$`,
    steps: [
      { title: "Số oxi hoá thay đổi", body: r`$\text{Fe}^0 \to \text{Fe}^{+3}$ (chất khử); $\text{S}^{+6} \to \text{S}^{+4}$ trong $\text{SO}_2$ (chất oxi hoá là $\text{H}_2\text{SO}_4$).` },
      { title: "Thăng bằng electron", body: r`Vì sản phẩm có $\text{Fe}_2$, viết theo cặp: $2\text{Fe}^0 \to 2\text{Fe}^{+3} + 6e$ $\quad(\times 1)$; $\text{S}^{+6} + 2e \to \text{S}^{+4}$ $\quad(\times 3)$.

Electron: $6 = 3\cdot 2$.`, check: { type: "value", expr: "2*3-3*2", expect: "0" } },
      { title: "Cân bằng S, H và kiểm O", body: r`S: $3$ (trong muối) $+ 3$ (trong $\text{SO}_2$) $= 6$ nên có $6\,\text{H}_2\text{SO}_4$; H: $12$ nguyên tử nên có $6\,\text{H}_2\text{O}$.

Kiểm O: trái $6\cdot 4 = 24$; phải $12 + 3\cdot 2 + 6 = 24$. Khớp.`, check: { type: "value", expr: "12+3*2+6", expect: "24" } },
    ],
  }),
  sol("long", 19, 348, {
    problem: r`Hoà tan hoàn toàn 5,6 g Fe trong dung dịch HCl dư. Tính thể tích khí $\text{H}_2$ thu được ở điều kiện chuẩn (25 °C, 1 bar; thể tích mol 24,79 L/mol) và khối lượng muối tạo thành. (Fe = 56; Cl = 35,5)`,
    subject: "Hoá học",
    topic: "Tính theo phương trình hoá học",
    answer: r`$V_{\text{H}_2} = 2{,}479$ L; khối lượng $\text{FeCl}_2$ là 12,7 g.`,
    steps: [
      { title: "Viết phương trình", body: r`$\text{Fe} + 2\text{HCl} \to \text{FeCl}_2 + \text{H}_2$. Với HCl, sắt chỉ lên số oxi hoá $+2$ (không tạo $\text{FeCl}_3$).` },
      { title: "Tính số mol", body: r`$n_{\text{Fe}} = \dfrac{5{,}6}{56} = 0{,}1$ mol. Theo phương trình, $n_{\text{H}_2} = n_{\text{FeCl}_2} = n_{\text{Fe}} = 0{,}1$ mol.`, check: { type: "value", expr: "5.6/56", expect: "0,1" } },
      { title: "Thể tích khí và khối lượng muối", body: r`$V_{\text{H}_2} = 0{,}1\cdot 24{,}79 = 2{,}479$ (L).

$M_{\text{FeCl}_2} = 56 + 2\cdot 35{,}5 = 127$ g/mol, nên $m = 0{,}1\cdot 127 = 12{,}7$ (g).`, check: { type: "value", expr: "0.1*24.79", expect: "2,479" } },
    ],
    checks: [{ type: "value", expr: "0.1*(56+2*35.5)", expect: "12,7" }],
  }),
  sol("long", 29, 297, {
    problem: r`Xác định số oxi hoá của S trong $\text{H}_2\text{SO}_4$, của Mn trong $\text{KMnO}_4$ và của N trong ion $\text{NH}_4^+$.`,
    subject: "Hoá học",
    topic: "Phản ứng oxi hoá – khử",
    answer: "S: +6; Mn: +7; N: −3.",
    steps: [
      { title: "Nhắc quy tắc", body: r`Trong hợp chất, H thường là $+1$, O thường là $-2$, kim loại kiềm (K) là $+1$. Tổng số oxi hoá trong phân tử bằng $0$, trong ion bằng điện tích ion.` },
      { title: "S trong H₂SO₄", body: r`Gọi số oxi hoá của S là $x$: $2(+1) + x + 4(-2) = 0 \iff x = +6$.`, check: { type: "equation", lhs: "2+x-8", rhs: "0", roots: ["6"] } },
      { title: "Mn trong KMnO₄", body: r`$(+1) + x + 4(-2) = 0 \iff x = +7$.`, check: { type: "equation", lhs: "1+x-8", rhs: "0", roots: ["7"] } },
      { title: "N trong NH₄⁺", body: r`Tổng bằng điện tích ion $+1$: $x + 4(+1) = +1 \iff x = -3$.`, check: { type: "equation", lhs: "x+4", rhs: "1", roots: ["-3"] } },
    ],
  }),
  sol("long", 47, 236, {
    problem: r`Nguyên tố chlorine có hai đồng vị bền: $^{35}\text{Cl}$ chiếm 75,77% và $^{37}\text{Cl}$ chiếm 24,23% số nguyên tử. Tính nguyên tử khối trung bình của chlorine.`,
    subject: "Hoá học",
    topic: "Cấu tạo nguyên tử",
    answer: r`$\overline{A}_{\text{Cl}} \approx 35{,}48$`,
    steps: [
      { title: "Công thức nguyên tử khối trung bình", body: r`$\overline{A} = \dfrac{A_1x_1 + A_2x_2}{100}$, với $x_1$, $x_2$ là phần trăm số nguyên tử của từng đồng vị.` },
      { title: "Thay số", body: r`$\overline{A} = \dfrac{35\cdot 75{,}77 + 37\cdot 24{,}23}{100} = \dfrac{2651{,}95 + 896{,}51}{100} = 35{,}4846$.`, check: { type: "value", expr: "(35*75.77+37*24.23)/100", expect: "35,4846" } },
      { title: "Làm tròn và nhận xét", body: r`$\overline{A} \approx 35{,}48$, thường dùng $35{,}5$ trong bài tập. Kết quả gần 35 hơn 37 vì đồng vị $^{35}\text{Cl}$ chiếm đa số, đúng với trực giác.` },
    ],
  }),

  // ---------------- Sinh học ----------------
  sol("lan", 13, 318, {
    problem: r`Một tế bào ruồi giấm ($2n = 8$) nguyên phân liên tiếp 3 lần. Tính số tế bào con tạo thành, tổng số NST trong các tế bào con và số NST môi trường nội bào cung cấp.`,
    subject: "Sinh học",
    topic: "Chu kì tế bào và nguyên phân",
    answer: "8 tế bào con; 64 NST trong các tế bào con; môi trường cung cấp 56 NST.",
    figure: { kind: "tree", spec: { nodes: [
      { id: "g0", label: "Tế bào mẹ (2n = 8)", parent: null },
      { id: "a1", label: "Lần 1", parent: "g0" }, { id: "a2", label: "Lần 1", parent: "g0" },
      { id: "b1", label: "Lần 2", parent: "a1" }, { id: "b2", label: "Lần 2", parent: "a1" }, { id: "b3", label: "Lần 2", parent: "a2" }, { id: "b4", label: "Lần 2", parent: "a2" },
      { id: "c1", label: "TB con 1", parent: "b1" }, { id: "c2", label: "TB con 2", parent: "b1" }, { id: "c3", label: "TB con 3", parent: "b2" }, { id: "c4", label: "TB con 4", parent: "b2" },
      { id: "c5", label: "TB con 5", parent: "b3" }, { id: "c6", label: "TB con 6", parent: "b3" }, { id: "c7", label: "TB con 7", parent: "b4" }, { id: "c8", label: "TB con 8", parent: "b4" },
    ] } },
    steps: [
      { title: "Số tế bào con", body: r`Mỗi lần nguyên phân, một tế bào tạo 2 tế bào con giống hệt nhau. Sau $k = 3$ lần: $2^3 = 8$ tế bào con.`, refs: ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] },
      { title: "Tổng số NST trong các tế bào con", body: r`Nguyên phân giữ nguyên bộ NST $2n$ ở mỗi tế bào con: $8 \cdot 8 = 64$ NST.` },
      { title: "NST môi trường cung cấp", body: r`Tế bào mẹ đã có sẵn $8$ NST, nên môi trường chỉ cung cấp phần còn thiếu: $2n\,(2^k - 1) = 8\cdot(8 - 1) = 56$ NST.

Lỗi hay gặp: trả lời 64, quên trừ số NST có sẵn của tế bào mẹ.`, refs: ["g0"] },
    ],
  }),
  sol("lan", 22, 265, {
    problem: r`Một gen có tổng số 3000 nucleotide, trong đó adenine (A) chiếm 20%. Tính số nucleotide mỗi loại, chiều dài của gen và số liên kết hydrogen.`,
    subject: "Sinh học",
    topic: "Thành phần hoá học của tế bào",
    answer: "A = T = 600, G = C = 900; L = 5100 Å; H = 3900 liên kết.",
    steps: [
      { title: "Số nucleotide mỗi loại", body: r`Theo nguyên tắc bổ sung: $A = T$, $G = C$ và $A + G = 50\%$.

$A = T = 20\% \cdot 3000 = 600$; $G = C = 30\% \cdot 3000 = 900$.` },
      { title: "Chiều dài gen", body: r`Gen có hai mạch, mỗi mạch $\dfrac{N}{2} = 1500$ nucleotide, mỗi nucleotide dài $3{,}4$ Å:
$$L = \frac{N}{2}\cdot 3{,}4 = 1500 \cdot 3{,}4 = 5100\ \text{Å}.$$` },
      { title: "Số liên kết hydrogen", body: r`Cặp A – T có 2 liên kết, cặp G – C có 3 liên kết: $H = 2A + 3G = 2\cdot 600 + 3\cdot 900 = 3900$.` },
    ],
  }),
  sol("lan", 49, 188, {
    problem: "Vì sao khi ngâm rau sống trong nước muối quá mặn một thời gian dài, rau bị héo? Giải thích theo cơ chế vận chuyển các chất qua màng tế bào.",
    subject: "Sinh học",
    topic: "Trao đổi chất qua màng tế bào",
    answer: "Nước muối đậm đặc là môi trường ưu trương; nước thẩm thấu từ tế bào rau ra ngoài, tế bào mất nước, co nguyên sinh nên rau héo.",
    figure: { kind: "diagram", spec: { nodes: [
      { id: "m", label: "Nước muối đậm đặc (ưu trương)", parent: null },
      { id: "t", label: "Tế bào rau (nhược trương hơn)", parent: null },
      { id: "n", label: "Nước đi ra ngoài qua màng (thẩm thấu)", parent: null },
      { id: "k", label: "Co nguyên sinh → rau héo", parent: null },
    ], links: [{ from: "t", to: "n", label: "mất nước" }, { from: "n", to: "m" }, { from: "n", to: "k" }] } },
    steps: [
      { title: "So sánh nồng độ hai bên màng", body: "Nồng độ chất tan trong nước muối mặn **cao hơn** trong dịch bào của tế bào rau: môi trường bên ngoài là **ưu trương**.", refs: ["m", "t"] },
      { title: "Chiều di chuyển của nước", body: "Thẩm thấu là sự khuếch tán của nước qua màng bán thấm, từ nơi có nồng độ chất tan thấp đến nơi có nồng độ chất tan cao. Vì vậy nước đi **từ tế bào ra ngoài**.", refs: ["n"] },
      { title: "Hậu quả và liên hệ", body: "Tế bào mất nước, khối chất nguyên sinh co lại tách khỏi thành tế bào (co nguyên sinh), rau mềm và héo. Vì thế chỉ nên ngâm rau trong nước muối loãng trong thời gian ngắn.", refs: ["k"] },
    ],
  }),

  // ---------------- Tiếng Anh ----------------
  sol("minh", 8, 542, {
    problem: "Choose the correct verb form: (1) I ___ (live) in Hanoi since 2015. (2) We ___ (visit) Hue last summer. (3) She ___ (never / try) sushi before.",
    subject: "Tiếng Anh",
    topic: "Thì hiện tại hoàn thành",
    answer: "(1) have lived; (2) visited; (3) has never tried",
    steps: [
      { title: "Tìm dấu hiệu thời gian", body: "(1) **since 2015**: hành động bắt đầu trong quá khứ, kéo dài đến hiện tại. (2) **last summer**: thời điểm đã kết thúc. (3) **never … before**: trải nghiệm tính đến bây giờ." },
      { title: "Nhớ hai công thức", body: "Hiện tại hoàn thành: **have/has + V3 (past participle)**, dùng khi thời gian chưa kết thúc hoặc không nêu rõ thời điểm.\n\nQuá khứ đơn: **V2 / V-ed**, dùng khi có thời điểm xác định trong quá khứ (yesterday, last…, ago, in 2010)." },
      { title: "Điền đáp án", body: "(1) I **have lived** in Hanoi since 2015.\n\n(2) We **visited** Hue last summer.\n\n(3) She **has never tried** sushi before. Chủ ngữ \"she\" đi với **has**, và \"never\" đứng giữa has và V3." },
    ],
  }),
  sol("minh", 20, 371, {
    problem: "Rewrite the sentences in the passive voice: (1) People grow rice in the Mekong Delta. (2) They built this school in 1998. (3) Someone has cleaned the classroom.",
    subject: "Tiếng Anh",
    topic: "Câu bị động",
    answer: "(1) Rice is grown in the Mekong Delta. (2) This school was built in 1998. (3) The classroom has been cleaned.",
    steps: [
      { title: "Xác định tân ngữ và thì", body: "Tân ngữ của câu chủ động sẽ thành chủ ngữ câu bị động: rice, this school, the classroom. Thì: (1) hiện tại đơn, (2) quá khứ đơn, (3) hiện tại hoàn thành." },
      { title: "Áp công thức be + V3 theo đúng thì", body: "Hiện tại đơn: **am/is/are + V3**. Quá khứ đơn: **was/were + V3**. Hiện tại hoàn thành: **have/has been + V3**." },
      { title: "Viết câu và lược tác nhân", body: "(1) Rice **is grown** in the Mekong Delta.\n\n(2) This school **was built** in 1998.\n\n(3) The classroom **has been cleaned**.\n\nTác nhân chung chung (people, they, someone) được lược bỏ, không viết \"by people\"." },
    ],
  }),
  sol("minh", 34, 244, {
    problem: "Give the correct form of the words in brackets: (1) Many students are interested in ___ protection. (ENVIRONMENT) (2) Her ___ in the school play was impressive. (PERFORM) (3) Online learning is very ___ for students in remote areas. (USE)",
    subject: "Tiếng Anh",
    topic: "Cấu tạo từ",
    answer: "(1) environmental; (2) performance; (3) useful",
    steps: [
      { title: "Xác định loại từ cần điền", body: "(1) Đứng trước danh từ \"protection\": cần **tính từ**. (2) Sau tính từ sở hữu \"her\" và làm chủ ngữ: cần **danh từ**. (3) Sau \"very\" và động từ \"is\": cần **tính từ**." },
      { title: "Chọn hậu tố phù hợp", body: "environment → environment**al** (tính từ); perform → perform**ance** (danh từ); use → use**ful** (tính từ, nghĩa tích cực, hợp ngữ cảnh \"hữu ích\")." },
      { title: "Kiểm nghĩa cả câu", body: "(3) Không chọn \"useless\" vì câu nói học trực tuyến **giúp ích** cho học sinh vùng xa. Luôn đọc lại cả câu để kiểm nghĩa trước khi chốt đáp án." },
    ],
  }),

  // ---------------- Tin học / Lập trình ----------------
  sol("ngoc", 10, 336, {
    problem: r`Đổi số $45$ ở hệ thập phân sang hệ nhị phân, rồi tính $1011_2 + 0110_2$ và đổi kết quả về hệ thập phân.`,
    subject: "Tin học",
    topic: "Hệ nhị phân và dữ liệu số nguyên",
    answer: r`$45 = 101101_2$; $1011_2 + 0110_2 = 10001_2 = 17$.`,
    steps: [
      { title: "Chia liên tiếp cho 2", body: r`$45 : 2 = 22$ dư $1$; $22 : 2 = 11$ dư $0$; $11 : 2 = 5$ dư $1$; $5 : 2 = 2$ dư $1$; $2 : 2 = 1$ dư $0$; $1 : 2 = 0$ dư $1$.

Đọc số dư **từ dưới lên**: $45 = 101101_2$.` },
      { title: "Kiểm ngược", body: r`$101101_2 = 32 + 8 + 4 + 1 = 45$. Đúng.` },
      { title: "Cộng nhị phân", body: r`Cộng từ phải sang trái, nhớ quy tắc $1 + 1 = 10_2$ (viết 0, nhớ 1):
$$1011_2 + 0110_2 = 10001_2.$$
Kiểm bằng hệ thập phân: $11 + 6 = 17 = 16 + 1 = 10001_2$.` },
    ],
  }),
  sol("ngoc", 26, 283, {
    problem: r`Viết chương trình Python nhập số nguyên dương $n$, in ra tổng các số chẵn từ $1$ đến $n$. Ví dụ $n = 10$ thì in $30$.`,
    subject: "Tin học",
    topic: "Lập trình Python: vòng lặp",
    answer: "Dùng vòng lặp `for i in range(2, n + 1, 2)` cộng dồn; với n = 10 kết quả là 30.",
    steps: [
      { title: "Phân tích bài toán", body: "Đầu vào: số nguyên dương n. Đầu ra: tổng 2 + 4 + 6 + … (không vượt quá n). Cần một biến tổng bắt đầu từ 0 và một vòng lặp đi qua các số chẵn." },
      { title: "Viết chương trình", body: `${F}python
n = int(input("Nhập n: "))
tong = 0
for i in range(2, n + 1, 2):
    tong += i
print(tong)
${F}

\`range(2, n + 1, 2)\` bắt đầu từ 2, bước nhảy 2, dừng **trước** n + 1 nên vẫn lấy được n nếu n chẵn.` },
      { title: "Chạy thử", body: "Với n = 10: 2 + 4 + 6 + 8 + 10 = 30. Với n = 7: 2 + 4 + 6 = 12. Lỗi hay gặp: viết `range(2, n, 2)` làm mất số n khi n chẵn." },
    ],
  }),
  sol("khai", 14, 467, {
    problem: `Viết hàm Python kiểm tra một chuỗi gồm các dấu ngoặc \`()[]{}\` có hợp lệ không (mỗi ngoặc mở được đóng đúng loại, đúng thứ tự). Ví dụ "({[]})" hợp lệ, "([)]" không hợp lệ.`,
    subject: "Lập trình",
    topic: "Ngăn xếp (stack)",
    answer: "Dùng ngăn xếp: gặp ngoặc mở thì đẩy vào, gặp ngoặc đóng thì so với đỉnh ngăn xếp; cuối cùng ngăn xếp phải rỗng. Độ phức tạp O(n).",
    steps: [
      { title: "Vì sao dùng ngăn xếp", body: "Ngoặc mở **sau cùng** phải được đóng **trước tiên**, đúng nguyên tắc vào sau ra trước (LIFO) của ngăn xếp." },
      { title: "Cài đặt", body: `${F}python
def hop_le(s: str) -> bool:
    cap = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in cap:
            if not stack or stack.pop() != cap[ch]:
                return False
    return not stack
${F}` },
      { title: "Chạy tay hai ví dụ", body: "\"({[]})\": đẩy ( { [ rồi lần lượt gặp ] } ) khớp với đỉnh, cuối cùng ngăn xếp rỗng nên **True**.\n\n\"([)]\": đẩy ( [ rồi gặp ), đỉnh là [ không khớp nên **False**." },
      { title: "Độ phức tạp và trường hợp biên", body: "Mỗi ký tự được đẩy/lấy tối đa một lần: thời gian O(n), bộ nhớ O(n). Chuỗi rỗng trả về True; chuỗi \"((\" trả về False vì ngăn xếp còn phần tử." },
    ],
  }),

  // ---------------- Lịch sử ----------------
  sol("phuong", 17, 309, {
    problem: "Trình bày những thành tựu tiêu biểu của văn minh Ai Cập cổ đại và ý nghĩa của chúng.",
    subject: "Lịch sử",
    topic: "Văn minh Ai Cập và Trung Hoa cổ – trung đại",
    answer: "Chữ tượng hình và giấy papyrus; lịch 365 ngày; toán học (hệ đếm thập phân, tính diện tích, thể tích); kiến trúc kim tự tháp; y học và kĩ thuật ướp xác. Các thành tựu đặt nền móng cho nhiều lĩnh vực của văn minh nhân loại.",
    figure: { kind: "diagram", spec: { nodes: [
      { id: "root", label: "Văn minh Ai Cập cổ đại", parent: null },
      { id: "chu", label: "Chữ tượng hình, giấy papyrus", parent: "root" },
      { id: "lich", label: "Lịch 365 ngày", parent: "root" },
      { id: "toan", label: "Toán học: hệ đếm thập phân, hình học", parent: "root" },
      { id: "kt", label: "Kiến trúc: kim tự tháp, đền thờ", parent: "root" },
      { id: "yh", label: "Y học, kĩ thuật ướp xác", parent: "root" },
    ], links: [] } },
    steps: [
      { title: "Chữ viết", body: "Người Ai Cập sáng tạo **chữ tượng hình**, viết trên giấy làm từ cây **papyrus** mọc ven sông Nile. Chữ viết giúp ghi chép, lưu giữ tri thức và quản lí nhà nước.", refs: ["chu"] },
      { title: "Lịch và toán học", body: "Quan sát chu kì nước sông Nile và thiên văn, họ làm ra **lịch một năm 365 ngày** chia 12 tháng. Nhu cầu đo lại ruộng đất sau mỗi mùa lũ thúc đẩy **toán học**: hệ đếm thập phân, cách tính diện tích, thể tích.", refs: ["lich", "toan"] },
      { title: "Kiến trúc và y học", body: "**Kim tự tháp** ở Giza (tiêu biểu là kim tự tháp Kheops) thể hiện trình độ toán học, tổ chức lao động rất cao. Kĩ thuật **ướp xác** cho thấy hiểu biết đáng kể về cơ thể người.", refs: ["kt", "yh"] },
      { title: "Ý nghĩa", body: "Các thành tựu phản ánh sức sáng tạo của cư dân Ai Cập, phục vụ trực tiếp đời sống sản xuất nông nghiệp ven sông, và để lại nền tảng cho chữ viết, lịch pháp, toán học của nhiều nền văn minh sau." },
    ],
  }),
  sol("phuong", 40, 198, {
    problem: "Nêu các thành tựu tiêu biểu của văn minh Hy Lạp – La Mã cổ đại về chữ viết, khoa học, kiến trúc và thể thao.",
    subject: "Lịch sử",
    topic: "Văn minh Ấn Độ và Hy Lạp – La Mã cổ đại",
    answer: "Hệ chữ cái Hy Lạp và chữ Latinh; các nhà khoa học Pythagoras, Euclid, Archimedes; đền Parthenon, đấu trường Colosseum; Thế vận hội Olympic (776 TCN).",
    figure: { kind: "tree", spec: { nodes: [
      { id: "r", label: "Hy Lạp – La Mã cổ đại", parent: null },
      { id: "c", label: "Chữ viết", parent: "r" }, { id: "c1", label: "Chữ cái Hy Lạp → chữ Latinh", parent: "c" },
      { id: "k", label: "Khoa học", parent: "r" }, { id: "k1", label: "Pythagoras, Euclid, Archimedes", parent: "k" },
      { id: "a", label: "Kiến trúc", parent: "r" }, { id: "a1", label: "Parthenon, Colosseum", parent: "a" },
      { id: "t", label: "Thể thao", parent: "r" }, { id: "t1", label: "Olympic 776 TCN", parent: "t" },
    ] } },
    steps: [
      { title: "Chữ viết", body: "Người Hy Lạp hoàn thiện hệ **chữ cái** trên cơ sở chữ của người Phoenicia; người La Mã phát triển thành **chữ Latinh**, nền tảng của chữ viết nhiều nước hiện nay, trong đó có chữ Quốc ngữ của Việt Nam.", refs: ["c", "c1"] },
      { title: "Khoa học", body: "Toán học có **Pythagoras** (định lí về tam giác vuông), **Euclid** (bộ Cơ sở hình học), **Archimedes** (lực đẩy, đòn bẩy). Tri thức được hệ thống hoá thành khoa học, không chỉ dừng ở kinh nghiệm.", refs: ["k", "k1"] },
      { title: "Kiến trúc và thể thao", body: "Đền **Parthenon** ở Athens và đấu trường **Colosseum** ở Rome là công trình tiêu biểu. **Thế vận hội Olympic** khởi nguồn năm 776 TCN tại Olympia, nay là đại hội thể thao lớn nhất thế giới.", refs: ["a1", "t1"] },
      { title: "Ghi nhớ khi làm bài", body: "Đề hỏi **bốn lĩnh vực** thì trả lời đủ bốn, mỗi lĩnh vực một thành tựu tiêu biểu kèm tên riêng. Thiếu một lĩnh vực là mất điểm dù viết dài." },
    ],
  }),

  // ---------------- Địa lí ----------------
  sol("phuong", 3, 426, {
    problem: "Khi ở Hà Nội (múi giờ số 7) là 9 giờ ngày 25/11/2026 thì ở London (múi giờ số 0), Tokyo (múi giờ số 9) và New York (múi giờ −5) là mấy giờ, ngày nào?",
    subject: "Địa lí",
    topic: "Hệ quả địa lí các chuyển động của Trái Đất",
    answer: "London: 2 giờ ngày 25/11/2026; Tokyo: 11 giờ ngày 25/11/2026; New York: 21 giờ ngày 24/11/2026.",
    steps: [
      { title: "Nguyên tắc tính giờ", body: "Trái Đất tự quay từ tây sang đông, mỗi múi giờ chênh nhau 1 giờ. Đi về phía đông thì **cộng**, về phía tây thì **trừ** số múi chênh lệch." },
      { title: "London và Tokyo", body: "London (múi 0) ở phía tây Hà Nội 7 múi: 9 − 7 = **2 giờ** ngày 25/11.\n\nTokyo (múi 9) ở phía đông 2 múi: 9 + 2 = **11 giờ** ngày 25/11." },
      { title: "New York: chú ý lùi ngày", body: "New York (múi −5) chênh Hà Nội 7 − (−5) = 12 múi về phía tây: 9 − 12 = −3, tức là 24 − 3 = **21 giờ** của **ngày hôm trước**, 24/11/2026.\n\nLỗi hay gặp: ra kết quả âm rồi giữ nguyên ngày 25/11." },
    ],
  }),
  sol("phuong", 31, 207, {
    problem: "Một ngọn núi có chân núi ở độ cao 200 m, nhiệt độ tại chân núi là 25 °C. Biết nhiệt độ không khí giảm trung bình 0,6 °C khi lên cao 100 m. Tính nhiệt độ trên đỉnh núi cao 2200 m.",
    subject: "Địa lí",
    topic: "Khí quyển",
    answer: "Nhiệt độ trên đỉnh núi khoảng 13 °C.",
    steps: [
      { title: "Tính độ chênh cao", body: "Từ chân núi lên đỉnh: 2200 − 200 = 2000 m. Đây là chỗ hay sai: lấy nhầm 2200 m làm độ chênh." },
      { title: "Tính mức giảm nhiệt", body: "Cứ 100 m giảm 0,6 °C, nên 2000 m giảm 2000 : 100 × 0,6 = 12 °C." },
      { title: "Kết luận", body: "Nhiệt độ trên đỉnh: 25 − 12 = **13 °C**. Vì vậy vùng núi cao như Sa Pa, Đà Lạt mát hơn hẳn đồng bằng dù cùng vĩ độ tương đối gần." },
    ],
  }),

  // ---------------- Ngữ văn ----------------
  sol("bao-gv", 2, 593, {
    problem: "Đọc đoạn mở đầu văn bản \"Hiền tài là nguyên khí của quốc gia\" (Thân Nhân Trung): \"Hiền tài là nguyên khí của quốc gia, nguyên khí thịnh thì thế nước mạnh, rồi lên cao, nguyên khí suy thì thế nước yếu, rồi xuống thấp…\". Xác định luận đề, các luận điểm, một lí lẽ và một dẫn chứng tiêu biểu của văn bản; nhận xét cách lập luận.",
    subject: "Ngữ văn",
    topic: "Đọc hiểu văn bản nghị luận",
    answer: "Luận đề: vai trò quyết định của hiền tài đối với vận mệnh đất nước. Ba luận điểm: hiền tài quyết định thịnh suy; các triều đại đã trọng đãi hiền tài; việc khắc bia tiến sĩ có ý nghĩa lâu dài. Lí lẽ: nguyên khí thịnh thì thế nước mạnh. Dẫn chứng: nêu tên ở tháp Nhạn, ban danh hiệu Long hổ, bày tiệc Văn hỉ. Lập luận chặt chẽ, đi từ khái quát đến cụ thể.",
    steps: [
      { title: "Đọc đủ yêu cầu đề", body: "Đề có **bốn yêu cầu**: luận đề, các luận điểm, một lí lẽ + một dẫn chứng, nhận xét lập luận. Em đánh số 1–4 lên đề trước khi viết để không bỏ sót ý nào." },
      { title: "Luận đề và luận điểm", body: "**Luận đề:** hiền tài có vai trò quyết định đối với sự thịnh suy của đất nước.\n\n**Luận điểm 1:** hiền tài là nguyên khí, quyết định thế nước mạnh hay yếu.\n\n**Luận điểm 2:** các bậc đế vương đã hết lòng trọng đãi hiền tài, nhưng như thế vẫn chưa đủ.\n\n**Luận điểm 3:** khắc bia tiến sĩ có ý nghĩa lâu dài: khuyến khích nhân tài, ngăn ngừa điều ác, làm cho mạch nước bền vững." },
      { title: "Phân biệt lí lẽ với dẫn chứng", body: "**Lí lẽ** là lời giải thích, lập luận của tác giả, ví dụ: \"nguyên khí thịnh thì thế nước mạnh, rồi lên cao, nguyên khí suy thì thế nước yếu, rồi xuống thấp\".\n\n**Dẫn chứng** là sự việc cụ thể, có thật: nhà nước đã nêu tên ở tháp Nhạn, ban danh hiệu Long hổ, bày tiệc Văn hỉ để tôn vinh người đỗ đạt." },
      { title: "Nhận xét cách lập luận", body: "Lập luận chặt chẽ, đi từ khẳng định khái quát (hiền tài là nguyên khí) đến việc làm cụ thể (khắc bia). Hình ảnh so sánh \"nguyên khí\" vừa ngắn gọn vừa giàu sức thuyết phục, nên câu mở đầu trở thành chân lí được nhắc đến đến ngày nay." },
    ],
  }),
];

// =====================================================================================
// 2. KHO TRI THỨC CHO GIA SƯ (mỗi trang 600–1200 ký tự, lời của GV)
// =====================================================================================

const DOC_TOAN_HS = "Ghi chú chương III – Hàm số và đồ thị";
const DOC_TOAN_BPT = "Phiếu học tập BPT bậc hai";
const DOC_TOAN_LG = "Ghi chú ôn lượng giác (lớp 9 – lớp 10)";
const DOC_HOA_OXH = "Chuyên đề phản ứng oxi hoá – khử";
const DOC_HOA_BT = "Phiếu bài tập cân bằng phản ứng oxi hoá – khử";
const DOC_ANH_GR = "Grammar notes: Present perfect vs Past simple";
const DOC_ANH_DC = "Đề cương ôn tập học kỳ I – Tiếng Anh 10";
const DOC_VAN_NL = "Cách đọc hiểu văn bản nghị luận";
const DOC_VAN_HT = "Phiếu đọc: Hiền tài là nguyên khí của quốc gia";
const DOC_LY_DH = "Tóm tắt chương Động học";
const DOC_LY_RTD = "Bài tập rơi tự do có lời giải";
const DOC_CTDL_1 = "Bài giảng CTDL tuần 1–4: mảng và danh sách liên kết";
const DOC_CTDL_2 = "Bài giảng CTDL tuần 5–8: ngăn xếp, hàng đợi, cây";

export const KBS: DKb[] = [
  {
    key: "toan10",
    owner: "ha",
    name: "Toán 10 – Chương III và BPT bậc hai",
    subject: "Toán",
    grade: 10,
    className: "10A1",
    docs: [
      {
        name: DOC_TOAN_HS,
        source: "text",
        pages: [
          `Hàm số và cách cho hàm số

Cho tập D khác rỗng. Nếu với mỗi x thuộc D ta xác định được đúng một số y thì ta có một hàm số y = f(x); D là tập xác định, x là biến số. Điều quan trọng là "đúng một": một giá trị x không được ứng với hai giá trị y.

Hàm số có thể cho bằng công thức, bằng bảng hoặc bằng đồ thị. Khi cho bằng công thức mà đề không nói gì thêm, tập xác định là tập các x làm biểu thức có nghĩa: mẫu khác 0, biểu thức dưới căn bậc hai không âm.

Ví dụ: y = √(x − 2) có tập xác định D = [2; +∞). y = 1/(x − 3) có D = ℝ \ {3}.

Hàm số đồng biến trên khoảng K nếu x tăng thì y tăng; nghịch biến nếu x tăng thì y giảm. Nhìn đồ thị từ trái sang phải: đi lên là đồng biến, đi xuống là nghịch biến.

Lưu ý của cô: khi tìm tập xác định, em viết hết các điều kiện ra rồi mới giao lại, đừng làm nhẩm vì rất dễ sót điều kiện mẫu khác 0.`,
          `Hàm số bậc hai y = ax² + bx + c (a ≠ 0)

Đồ thị là một parabol có đỉnh I(−b/(2a); −Δ/(4a)), trục đối xứng là đường thẳng x = −b/(2a). Trong thực hành, em chỉ cần nhớ hoành độ đỉnh x = −b/(2a), rồi thay vào hàm số để lấy tung độ, không cần nhớ công thức −Δ/(4a).

Nếu a > 0: parabol quay bề lõm lên, hàm số nghịch biến trên (−∞; −b/(2a)), đồng biến trên (−b/(2a); +∞), giá trị nhỏ nhất đạt tại đỉnh.

Nếu a < 0: parabol quay bề lõm xuống, hàm số đồng biến trước đỉnh, nghịch biến sau đỉnh, giá trị lớn nhất đạt tại đỉnh.

Các bước vẽ đồ thị: (1) tìm đỉnh và trục đối xứng; (2) tìm giao điểm với Oy (x = 0) và với Ox (giải ax² + bx + c = 0 nếu có nghiệm); (3) lấy thêm điểm đối xứng qua trục; (4) nối thành đường cong trơn.

Ví dụ: y = x² − 4x + 3 có đỉnh I(2; −1), cắt Oy tại (0; 3), cắt Ox tại (1; 0) và (3; 0). Điểm (4; 3) đối xứng với (0; 3) qua trục x = 2.`,
          `Dấu của tam thức bậc hai f(x) = ax² + bx + c (a ≠ 0)

Tính Δ = b² − 4ac (hoặc Δ' = b'² − ac khi b chẵn). Có ba trường hợp:

• Δ < 0: f(x) luôn cùng dấu với a với mọi x.
• Δ = 0: f(x) cùng dấu với a với mọi x ≠ −b/(2a), và bằng 0 tại x = −b/(2a).
• Δ > 0: f(x) có hai nghiệm x₁ < x₂. Ngoài khoảng hai nghiệm, f(x) cùng dấu với a; trong khoảng (x₁; x₂), f(x) trái dấu với a.

Câu thần chú để nhớ trường hợp Δ > 0: "trong trái, ngoài cùng" (trong khoảng nghiệm thì trái dấu a, ngoài khoảng nghiệm thì cùng dấu a).

Ví dụ: f(x) = x² − 5x + 6 có a = 1 > 0, hai nghiệm 2 và 3. Vậy f(x) < 0 khi 2 < x < 3; f(x) > 0 khi x < 2 hoặc x > 3.

Nhìn bằng đồ thị: dấu của f(x) chính là vị trí của parabol so với trục hoành. Phần parabol nằm trên trục Ox là nơi f(x) > 0, nằm dưới là nơi f(x) < 0. Khi phân vân, em phác nhanh parabol là thấy ngay.`,
          `Ví dụ đời thực: quầy nước chanh của lớp

Quầy nước chanh của lớp mình bán x chục cốc thì lãi P(x) = −x² + 6x − 5 (trăm nghìn đồng). Đây là một tam thức bậc hai với a = −1 < 0.

Giải P(x) = 0 được x = 1 và x = 5. Vì a < 0 nên P(x) dương trong khoảng hai nghiệm: quầy có lãi khi 1 < x < 5. Bán ít quá (dưới 1 chục cốc) thì chưa đủ bù tiền chanh, đường, đá; bán nhiều quá 5 chục thì phải mua thêm nguyên liệu, thuê thêm bình, lại lỗ.

Đỉnh parabol ở x = −6/(2·(−1)) = 3, P(3) = 4. Bán 3 chục cốc thì lãi nhiều nhất 400 nghìn đồng.

Cô dùng ví dụ này như một "phép thử đời thực": giải xong bất kì bất phương trình nào về P(x), em thay thử x = 3. Nếu tập nghiệm của em lại nói bán 3 chục cốc không có lãi thì chắc chắn đã sai, thường là do quên đổi chiều khi nhân với số âm.`,
        ],
      },
      {
        name: DOC_TOAN_BPT,
        source: "upload",
        pages: [
          `Phiếu học tập: Các bước giải bất phương trình bậc hai

Bất phương trình bậc hai một ẩn có dạng ax² + bx + c > 0 (hoặc ≥ 0, < 0, ≤ 0) với a ≠ 0. Giải bất phương trình là tìm tất cả các giá trị x làm cho bất đẳng thức đúng.

Bước 1. Chuyển hết về một vế để vế còn lại bằng 0.
Bước 2. Tìm nghiệm của tam thức (tính Δ hoặc nhẩm nghiệm).
Bước 3. Lập bảng xét dấu hoặc dùng "trong trái, ngoài cùng".
Bước 4. Chọn các khoảng có dấu phù hợp với đề, viết tập nghiệm.

Ví dụ 1: Giải x² − 5x + 6 ≤ 0. Tam thức có nghiệm 2 và 3, a = 1 > 0 nên âm trong khoảng hai nghiệm. Có dấu bằng nên lấy cả hai đầu mút: S = [2; 3].

Ví dụ 2: Giải −2x² + 3x + 5 ≥ 0. Nhân hai vế với −1 và đổi chiều: 2x² − 3x − 5 ≤ 0. Nghiệm −1 và 5/2, a = 2 > 0 nên S = [−1; 5/2].

Em có thể giữ nguyên hệ số a âm và xét dấu trực tiếp, không bắt buộc phải nhân −1. Cách nào cũng được, miễn là nhất quán.`,
          `Lỗi hay gặp khi giải bất phương trình bậc hai

Lỗi 1: Quên đổi chiều khi nhân hoặc chia hai vế cho số âm. Nhân hai vế với −1 thì dấu > phải thành <, dấu ≥ phải thành ≤. Đây là lỗi phổ biến nhất của lớp mình. Cách tự kiểm: chọn một số cụ thể nằm trong tập nghiệm vừa tìm, thay vào bất phương trình GỐC xem có đúng không.

Lỗi 2: Nhầm khi lấy đầu mút. Dấu ≤, ≥ thì lấy nghiệm của tam thức (ngoặc vuông); dấu <, > thì không lấy (ngoặc tròn). Vô cực luôn dùng ngoặc tròn.

Lỗi 3: Đọc thiếu yêu cầu đề. Đề hỏi "tìm nghiệm nguyên" hay "tìm x dương" mà em chỉ ghi khoảng nghiệm là mất điểm. Trước khi làm, gạch chân mọi chữ chỉ yêu cầu.

Lỗi 4: Áp dụng "trong trái, ngoài cùng" khi Δ < 0. Khi Δ < 0 tam thức không có nghiệm, luôn cùng dấu với a, không có "trong" và "ngoài".

Lỗi 5: Chia hai vế cho biểu thức chứa x mà không biết dấu của nó. Tuyệt đối không làm vậy; hãy chuyển vế rồi xét dấu.`,
          `Bài tập vận dụng (có gợi ý)

Bài 1. Quầy nước chanh của lớp bán x chục cốc thì lãi P(x) = −x² + 6x − 5 (trăm nghìn đồng). Tìm x để quầy có lãi.
Gợi ý: có lãi nghĩa là P(x) > 0. Đáp số: 1 < x < 5.

Bài 2. Cũng quầy nước chanh trên, lớp muốn lãi ít nhất 300 nghìn đồng. Tìm số chục cốc cần bán.
Gợi ý: giải P(x) ≥ 3, tức −x² + 6x − 8 ≥ 0, hay x² − 6x + 8 ≤ 0. Đáp số: 2 ≤ x ≤ 4.

Bài 3. Giải bất phương trình x² + 2x + 5 > 0.
Gợi ý: Δ' = 1 − 5 = −4 < 0, a > 0. Đáp số: S = ℝ.

Bài 4. Tìm m để x² − 2mx + m + 2 > 0 với mọi x.
Gợi ý: cần a > 0 và Δ' < 0, tức m² − m − 2 < 0. Đáp số: −1 < m < 2.

Bài 5. Tìm các nghiệm nguyên của bất phương trình x² − 4x − 5 < 0.
Gợi ý: nghiệm tam thức −1 và 5, tập nghiệm (−1; 5). Đề hỏi nghiệm NGUYÊN nên đáp số là 0, 1, 2, 3, 4. Đừng dừng lại ở khoảng nghiệm.`,
        ],
      },
      {
        name: DOC_TOAN_LG,
        source: "text",
        pages: [
          `Tỉ số lượng giác của góc nhọn (ôn lại lớp 9)

Trong tam giác vuông, với góc nhọn α: sin α = đối/huyền, cos α = kề/huyền, tan α = đối/kề, cot α = kề/đối. Câu nhớ quen thuộc: "sin đi học, cos không hư, tan đoàn kết, cot kết đoàn".

Bảng giá trị đặc biệt cần thuộc lòng:
• sin 30° = 1/2, sin 45° = √2/2, sin 60° = √3/2.
• cos 30° = √3/2, cos 45° = √2/2, cos 60° = 1/2.
• tan 30° = √3/3, tan 45° = 1, tan 60° = √3.

Mẹo nhớ nhanh: viết dãy √1/2, √2/2, √3/2 cho sin 30°, 45°, 60°; cos thì đọc ngược lại. Như vậy sin 30° = cos 60°, sin 60° = cos 30°.

Hai góc phụ nhau (tổng 90°) thì sin góc này bằng cos góc kia, tan góc này bằng cot góc kia. Ví dụ sin 20° = cos 70°.

Lưu ý: tan α = sin α / cos α. Nếu quên tan 60°, em lấy (√3/2) : (1/2) = √3.`,
          `Giá trị lượng giác của góc từ 0° đến 180°

Ở lớp 10, ta mở rộng khái niệm cho góc α từ 0° đến 180° bằng nửa đường tròn đơn vị: điểm M trên nửa đường tròn có toạ độ (cos α; sin α). Vì M nằm ở nửa trên nên sin α ≥ 0, còn cos α âm khi α là góc tù.

Các hệ thức cơ bản:
• sin²α + cos²α = 1.
• tan α = sin α / cos α (α ≠ 90°); cot α = cos α / sin α (α ≠ 0°, 180°).
• 1 + tan²α = 1/cos²α.

Hai góc bù nhau (tổng 180°): sin(180° − α) = sin α, còn cos(180° − α) = −cos α, tan(180° − α) = −tan α. Câu nhớ: "bù nhau thì sin giữ nguyên, các hàm còn lại đổi dấu".

Ví dụ: sin 150° = sin 30° = 1/2; cos 120° = −cos 60° = −1/2; cos 135° = −√2/2.

Ví dụ: cho α tù và sin α = 3/5. Khi đó cos²α = 16/25, và vì α tù nên cos α = −4/5. Lỗi hay gặp là quên xét dấu, ghi cos α = 4/5.`,
          `Định lí côsin, định lí sin và mẹo ôn

Trong tam giác ABC với các cạnh a = BC, b = CA, c = AB:

Định lí côsin: a² = b² + c² − 2bc·cos A. Dùng khi biết hai cạnh và góc xen giữa để tính cạnh thứ ba, hoặc biết ba cạnh để tính góc: cos A = (b² + c² − a²)/(2bc).

Định lí sin: a/sin A = b/sin B = c/sin C = 2R, với R là bán kính đường tròn ngoại tiếp. Dùng khi biết một cạnh và hai góc.

Ví dụ: tam giác có b = 3, c = 5, góc A = 120°. Khi đó a² = 9 + 25 − 2·3·5·cos 120° = 34 + 15 = 49, nên a = 7. Chú ý cos 120° = −1/2 nên dấu trừ thành dấu cộng.

Mẹo ôn để không quên: mỗi tối dành 5 phút tự viết lại bảng giá trị đặc biệt và ba hệ thức cơ bản ra giấy nháp, không nhìn tài liệu. Sai chỗ nào thì đánh dấu, hôm sau ôn chỗ đó trước. Lên lớp 11 em sẽ học thêm công thức cộng và công thức nhân đôi, tất cả đều xây trên các hệ thức này.`,
        ],
      },
    ],
  },
  {
    key: "hoa10",
    owner: "long",
    name: "Hoá học 10 – Phản ứng oxi hoá – khử",
    subject: "Hoá học",
    grade: 10,
    className: "10A1",
    docs: [
      {
        name: DOC_HOA_OXH,
        source: "text",
        pages: [
          `Số oxi hoá

Số oxi hoá là điện tích quy ước của nguyên tử trong phân tử, khi giả định mọi liên kết đều là liên kết ion. Đây là công cụ "kế toán electron" giúp ta biết nguyên tử nào cho, nguyên tử nào nhận electron.

Quy tắc xác định:
1. Đơn chất: số oxi hoá bằng 0 (Cu, O₂, Cl₂…).
2. Trong hợp chất: H thường là +1 (trừ hydride kim loại như NaH, H là −1); O thường là −2 (trừ peroxide như H₂O₂, O là −1; trong OF₂, O là +2).
3. Kim loại kiềm luôn +1, kim loại kiềm thổ luôn +2, Al là +3.
4. Tổng số oxi hoá trong phân tử bằng 0; trong ion bằng điện tích của ion.

Ví dụ: trong H₂SO₄, gọi số oxi hoá của S là x: 2(+1) + x + 4(−2) = 0, nên x = +6. Trong KMnO₄, Mn là +7. Trong NH₄⁺, N là −3.

Thầy lưu ý cách ghi: số oxi hoá viết dấu trước số (+6), điện tích ion viết số trước dấu (2+).`,
          `Chất khử, chất oxi hoá và các quá trình

Phản ứng oxi hoá – khử là phản ứng có sự chuyển electron giữa các chất, thể hiện qua sự thay đổi số oxi hoá của một số nguyên tố.

• Chất khử (chất bị oxi hoá) là chất nhường electron, số oxi hoá tăng.
• Chất oxi hoá (chất bị khử) là chất nhận electron, số oxi hoá giảm.
• Quá trình oxi hoá là quá trình nhường electron; quá trình khử là quá trình nhận electron.

Câu nhớ của thầy: "khử cho, o nhận" (chất khử cho electron, chất oxi hoá nhận electron). Một câu khác: "tăng bị oxi hoá, giảm bị khử".

Ví dụ: trong phản ứng Fe + CuSO₄ → FeSO₄ + Cu, Fe từ 0 lên +2 nên Fe là chất khử; Cu từ +2 xuống 0 nên CuSO₄ là chất oxi hoá.

Lưu ý: tên gọi dễ gây rối. Chất khử thì "bị oxi hoá", chất oxi hoá thì "bị khử". Hai quá trình luôn xảy ra đồng thời, tổng số electron chất khử nhường luôn bằng tổng số electron chất oxi hoá nhận.`,
          `Cân bằng bằng phương pháp thăng bằng electron (4 bước)

Bước 1. Xác định số oxi hoá của các nguyên tố có thay đổi, tìm chất khử và chất oxi hoá.
Bước 2. Viết quá trình oxi hoá và quá trình khử.
Bước 3. Tìm hệ số sao cho tổng electron nhường bằng tổng electron nhận (bội chung nhỏ nhất).
Bước 4. Đặt hệ số vào phương trình, cân bằng các nguyên tố còn lại theo thứ tự: kim loại, gốc axit, H, cuối cùng kiểm O.

Ví dụ: Cu + HNO₃ (loãng) → Cu(NO₃)₂ + NO + H₂O.
Cu⁰ → Cu⁺² + 2e (nhân 3); N⁺⁵ + 3e → N⁺² (nhân 2).
Đặt 3Cu, 3Cu(NO₃)₂, 2NO. Tổng N bên phải là 3·2 + 2 = 8, nên có 8HNO₃, suy ra 4H₂O.
Kết quả: 3Cu + 8HNO₃ → 3Cu(NO₃)₂ + 2NO + 4H₂O. Kiểm O: 24 = 18 + 2 + 4.

Lỗi hay gặp: chỉ đặt hệ số 2 trước HNO₃ theo số N bị khử mà quên phần N nằm trong muối (đóng vai trò môi trường).`,
          `Nâng cao: phản ứng có nhiều nguyên tố thay đổi số oxi hoá

Một số chất có hai nguyên tố cùng thay đổi số oxi hoá, ví dụ FeS₂ (pyrite). Khi đó ta gộp cả phân tử làm một "khối" nhường electron.

Ví dụ: FeS₂ + O₂ → Fe₂O₃ + SO₂.
Trong FeS₂: Fe là +2, S là −1. Fe⁺² → Fe⁺³ + 1e; 2S⁻¹ → 2S⁺⁴ + 10e. Một phân tử FeS₂ nhường tổng cộng 11e.
O₂ + 4e → 2O⁻².
Bội chung nhỏ nhất của 11 và 4 là 44: nhân FeS₂ với 4, O₂ với 11.
Kết quả: 4FeS₂ + 11O₂ → 2Fe₂O₃ + 8SO₂.

Ví dụ khác: oxide sắt từ Fe₃O₄ có số oxi hoá trung bình của Fe là +8/3. Với HNO₃: mỗi Fe₃O₄ nhường 1e lên 3Fe⁺³. Phương trình: 3Fe₃O₄ + 28HNO₃ → 9Fe(NO₃)₃ + NO + 14H₂O.

Mẹo: với số oxi hoá trung bình là phân số, em cứ tính theo cả phân tử, tổng electron nhường luôn là số nguyên.`,
        ],
      },
      {
        name: DOC_HOA_BT,
        source: "upload",
        pages: [
          `Phiếu bài tập số 1: cân bằng cơ bản

Câu 1. Fe + H₂SO₄ (đặc, nóng) → Fe₂(SO₄)₃ + SO₂ + H₂O.
Đáp án: 2Fe + 6H₂SO₄ → Fe₂(SO₄)₃ + 3SO₂ + 6H₂O. Ghi chú: viết quá trình theo cặp 2Fe → 2Fe⁺³ + 6e vì sản phẩm có Fe₂.

Câu 2. Al + HNO₃ → Al(NO₃)₃ + N₂O + H₂O.
Đáp án: 8Al + 30HNO₃ → 8Al(NO₃)₃ + 3N₂O + 15H₂O. Al nhường 3e (nhân 8), 2N⁺⁵ nhận 8e thành N₂O (nhân 3).

Câu 3. MnO₂ + HCl → MnCl₂ + Cl₂ + H₂O.
Đáp án: MnO₂ + 4HCl → MnCl₂ + Cl₂ + 2H₂O. Ở đây HCl vừa là chất khử (2Cl⁻ tạo Cl₂) vừa là môi trường (2Cl⁻ vào muối).

Câu 4. Zn + HNO₃ → Zn(NO₃)₂ + NH₄NO₃ + H₂O.
Đáp án: 4Zn + 10HNO₃ → 4Zn(NO₃)₂ + NH₄NO₃ + 3H₂O. N⁺⁵ nhận 8e xuống N⁻³ trong NH₄⁺; đừng quên NH₄NO₃ có hai nguyên tử N.`,
          `Phiếu bài tập số 2: vận dụng tính toán

Câu 1. Cho 5,6 g Fe tác dụng hết với dung dịch HCl dư. Tính thể tích H₂ ở điều kiện chuẩn (24,79 L/mol).
Lời giải: n(Fe) = 0,1 mol; Fe + 2HCl → FeCl₂ + H₂; V(H₂) = 0,1 · 24,79 = 2,479 L.

Câu 2. Cho 6,4 g Cu tác dụng hết với HNO₃ loãng dư, sản phẩm khử duy nhất là NO. Tính thể tích NO (đkc).
Lời giải: n(Cu) = 0,1 mol. Bảo toàn electron: 2·n(Cu) = 3·n(NO), nên n(NO) = 0,2/3 mol, V ≈ 1,653 L.

Câu 3. Hoà tan m gam Al trong HNO₃ dư, thu được 0,3 mol NO (sản phẩm khử duy nhất). Tìm m.
Lời giải: 3·n(Al) = 3·n(NO) nên n(Al) = 0,3 mol, m = 8,1 g.

Ghi chú của thầy: với bài tập tính toán, bảo toàn electron nhanh hơn nhiều so với việc viết và cân bằng cả phương trình. Tổng số mol electron nhường bằng tổng số mol electron nhận, chỉ cần biết số oxi hoá đầu và cuối.`,
          `Phiếu bài tập số 3: thử thách cho nhóm khá giỏi

Câu 1. Cân bằng: FeS₂ + HNO₃ → Fe(NO₃)₃ + H₂SO₄ + NO + H₂O.
Gợi ý: một FeS₂ nhường 15e (Fe lên +3 nhường 1e, mỗi S từ −1 lên +6 nhường 7e). N⁺⁵ nhận 3e. Tỉ lệ FeS₂ : NO = 1 : 5.
Đáp án: FeS₂ + 8HNO₃ → Fe(NO₃)₃ + 2H₂SO₄ + 5NO + 2H₂O.

Câu 2. Cân bằng phản ứng tự oxi hoá – khử: Cl₂ + NaOH (nóng) → NaCl + NaClO₃ + H₂O.
Gợi ý: Cl⁰ vừa lên +5 vừa xuống −1. Đáp án: 3Cl₂ + 6NaOH → 5NaCl + NaClO₃ + 3H₂O.

Câu 3. Vì sao trong phản ứng của kim loại với HNO₃, sản phẩm khử có thể là NO₂, NO, N₂O, N₂ hoặc NH₄NO₃?
Gợi ý: phụ thuộc vào độ mạnh của kim loại và nồng độ axit. Axit càng loãng, kim loại càng mạnh thì N bị khử xuống số oxi hoá càng thấp.

Lời thầy: các em mạnh Hoá nên luyện thêm bài nhiều sản phẩm khử, đây là dạng hay gặp ở đề thi tổ hợp có Hoá.`,
        ],
      },
    ],
  },
  {
    key: "anh10",
    owner: "minh",
    name: "Tiếng Anh 10 – Ngữ pháp và ôn tập",
    subject: "Tiếng Anh",
    grade: 10,
    className: "10A1",
    docs: [
      {
        name: DOC_ANH_GR,
        source: "text",
        pages: [
          `Present perfect: form and use

Form: S + have/has + V3 (past participle). Negative: haven't/hasn't + V3. Question: Have/Has + S + V3?

Use:
1. An action that started in the past and continues to now: I have lived here since 2015. She has studied English for six years.
2. An experience in life, without a specific time: Have you ever been to Da Lat? He has never tried sushi.
3. A past action with a result now: I have lost my key, so I can't open the door.
4. Recent actions with just, already, yet: The bus has just left. Have you finished your homework yet?

Signal words: since + mốc thời gian (since 2015, since Monday), for + khoảng thời gian (for three years), ever, never, just, already, yet, so far, recently, up to now.

Thầy lưu ý: since đi với MỐC, for đi với KHOẢNG. Viết "since three years" là sai.`,
          `Past simple: form and use

Form: S + V2/V-ed. Negative: didn't + V (nguyên mẫu). Question: Did + S + V?

Use: an action that happened and finished at a specific time in the past. The time is stated or clear from context.
Examples: We visited Hue last summer. Columbus reached America in 1492. I saw her two days ago.

Signal words: yesterday, last week/month/year, ago, in + năm đã qua (in 2010), when I was a child.

Common mistakes:
• Dùng V2 sau did: "Did you went?" là sai, phải là "Did you go?".
• Quên động từ bất quy tắc: go – went – gone, see – saw – seen, buy – bought – bought.

Mẹo: hỏi "Thời điểm đó đã kết thúc chưa và có được nêu ra không?". Nếu có thời điểm đã kết thúc, chọn quá khứ đơn. Nếu không có thời điểm, hoặc thời gian còn kéo dài đến nay, chọn hiện tại hoàn thành.`,
          `Present perfect vs Past simple: so sánh và bài luyện

Compare:
• I have read this book. (trải nghiệm, không nói khi nào)
• I read this book last month. (thời điểm cụ thể, đã kết thúc)
• She has worked here for five years. (vẫn đang làm)
• She worked here for five years. (đã nghỉ, không còn làm)

Mấu chốt: cùng có "for five years" nhưng nghĩa khác nhau. Hiện tại hoàn thành nối quá khứ với hiện tại; quá khứ đơn cắt đứt với hiện tại.

Không dùng hiện tại hoàn thành với thời điểm đã kết thúc: "I have seen him yesterday" là sai, phải là "I saw him yesterday".

Practice:
1. I ___ (know) Lan since we were in grade 6. → have known
2. They ___ (move) to Da Nang in 2020. → moved
3. ___ you ever ___ (eat) phở cuốn? → Have … eaten
4. My father ___ (not smoke) since last year. → hasn't smoked

Lưu ý câu 1: mệnh đề sau since dùng quá khứ đơn (we were), mệnh đề chính dùng hiện tại hoàn thành.`,
        ],
      },
      {
        name: DOC_ANH_DC,
        source: "upload",
        pages: [
          `Đề cương học kỳ I: cấu trúc đề và từ vựng trọng tâm

Cấu trúc đề kiểm tra cuối học kỳ I (60 phút): phát âm và trọng âm (8%), ngữ pháp và từ vựng (32%), đọc hiểu hai đoạn văn (30%), viết lại câu và sắp xếp câu (20%), tình huống giao tiếp (10%).

Từ vựng theo chủ đề Unit 1–5:
• Family life: household chores, breadwinner, homemaker, share, responsibility.
• Humans and the environment: carbon footprint, eco-friendly, renewable, reduce, protect.
• Music: perform, performance, talent show, audience, musician.
• For a better community: volunteer, donate, charity, community, support.
• Inventions: invent, invention, device, useful, technology.

Mẹo học từ: học theo họ từ (word family). Ví dụ: environment (n) – environmental (adj) – environmentally (adv); perform (v) – performance (n) – performer (n). Đề hay hỏi điền đúng loại từ, nên học một từ phải học cả họ.`,
          `Câu bị động và cấu tạo từ

Câu bị động: S + be + V3 (+ by O). Động từ be chia theo thì của câu chủ động:
• Hiện tại đơn: am/is/are + V3. Rice is grown in the Mekong Delta.
• Quá khứ đơn: was/were + V3. This school was built in 1998.
• Hiện tại hoàn thành: have/has been + V3. The classroom has been cleaned.
• Động từ khuyết thiếu: can/must/should + be + V3. Plastic bags should be reduced.

Lược "by people, by them, by someone" vì tác nhân không quan trọng.

Cấu tạo từ: xác định vị trí trước khi chọn hậu tố.
• Trước danh từ, sau be/become/seem: tính từ (-al, -ful, -less, -ive, -ous).
• Sau mạo từ, tính từ sở hữu, giới từ: danh từ (-tion, -ment, -ance, -ness, -er).
• Bổ nghĩa cho động từ: trạng từ (-ly).

Lỗi hay gặp: chọn đúng loại từ nhưng sai nghĩa (useful/useless). Luôn đọc lại cả câu.`,
          `Chiến lược đọc hiểu cho học sinh tổ hợp D07

Phần đọc hiểu chiếm gần một phần ba số điểm, nên cần chiến lược rõ ràng.

1. Đọc câu hỏi trước, gạch chân từ khoá (tên riêng, số liệu, từ phủ định NOT, EXCEPT).
2. Câu hỏi ý chính (main idea, best title): đọc câu đầu mỗi đoạn và câu kết bài. Đáp án đúng bao quát toàn bài, không quá hẹp.
3. Câu hỏi chi tiết: quét (scan) tìm từ khoá hoặc từ đồng nghĩa trong bài. Đáp án thường diễn đạt lại (paraphrase), hiếm khi chép nguyên văn.
4. Câu hỏi từ vựng trong ngữ cảnh: thay từng đáp án vào câu xem có hợp nghĩa không.
5. Câu hỏi suy luận (infer, imply): đáp án phải có căn cứ trong bài, không dựa vào hiểu biết riêng.

Phân bổ thời gian: khoảng 8 phút mỗi đoạn văn. Câu nào khó thì đánh dấu, làm câu sau rồi quay lại.

Lời thầy: các em mạnh ngữ pháp thường mất điểm ở câu suy luận vì chọn đáp án "nghe đúng" theo kiến thức ngoài. Hãy hỏi lại: dòng nào trong bài chứng minh đáp án này?`,
        ],
      },
    ],
  },
  {
    key: "van10",
    owner: "bao-gv",
    name: "Ngữ văn 10 – Đọc hiểu văn bản nghị luận",
    subject: "Ngữ văn",
    grade: 10,
    className: "10A1",
    docs: [
      {
        name: DOC_VAN_NL,
        source: "text",
        pages: [
          `Văn bản nghị luận là gì?

Văn bản nghị luận viết ra để thuyết phục người đọc tin theo một quan điểm. Khác với truyện kể sự việc, thơ bộc lộ cảm xúc, văn nghị luận dùng lí lẽ và bằng chứng để chứng minh một ý kiến là đúng.

Các yếu tố cần nhận diện khi đọc:
• Luận đề: vấn đề chính bàn đến trong cả văn bản, thường thể hiện ở nhan đề hoặc phần mở đầu.
• Luận điểm: các ý lớn triển khai luận đề. Mỗi luận điểm thường ứng với một đoạn hoặc một phần.
• Lí lẽ: lời giải thích, phân tích, suy luận của người viết để làm sáng tỏ luận điểm.
• Bằng chứng (dẫn chứng): sự việc, số liệu, nhân vật, câu nói có thật được đưa ra để chứng minh.

Mối quan hệ: luận đề là gốc, luận điểm là các nhánh lớn, lí lẽ và bằng chứng là cành lá làm nhánh vững chắc. Thầy hay nói với các em: luận điểm trả lời câu hỏi "người viết khẳng định điều gì?", lí lẽ trả lời "vì sao?", bằng chứng trả lời "lấy gì làm chứng?".`,
          `Phân biệt lí lẽ và bằng chứng

Đây là chỗ các em hay nhầm nhất. Một mẹo đơn giản: bằng chứng là thứ có thể kiểm chứng ngoài văn bản (một sự kiện, một con số, một nhân vật lịch sử); lí lẽ là suy nghĩ của người viết, không kiểm chứng được bằng tra cứu mà phải bằng lập luận.

Ví dụ: "Đọc sách giúp con người mở rộng hiểu biết, vì mỗi cuốn sách là kinh nghiệm của một đời người" là lí lẽ. "Nhà bác học Lê Quý Đôn suốt đời ham đọc, để lại những bộ sách như Vân đài loại ngữ, Kiến văn tiểu lục" là bằng chứng.

Khi trả lời câu hỏi đọc hiểu, các em trích ngắn gọn và ghi rõ đó là lí lẽ hay bằng chứng, rồi nói nó phục vụ luận điểm nào.

Lỗi hay gặp:
• Chép cả đoạn văn mà không chỉ ra đâu là lí lẽ, đâu là bằng chứng.
• Đọc thiếu yêu cầu: đề hỏi "một lí lẽ VÀ một bằng chứng" mà chỉ nêu một thứ.
• Nhầm luận điểm với luận đề: luận đề là vấn đề chung của cả bài, luận điểm là từng ý lớn.`,
          `Nhận xét cách lập luận và trình bày câu trả lời

Câu hỏi "nhận xét cách lập luận" yêu cầu đánh giá chứ không kể lại. Gợi ý các tiêu chí:
• Trình tự lập luận: diễn dịch (nêu ý chung trước), quy nạp (nêu ví dụ trước, khái quát sau), hay song song.
• Sự chặt chẽ: các luận điểm có nối tiếp, bổ sung cho nhau không.
• Lí lẽ có sắc sảo, bằng chứng có xác thực, tiêu biểu không.
• Ngôn ngữ, hình ảnh: có dùng so sánh, ẩn dụ, câu khẳng định mạnh để tăng sức thuyết phục không.

Mẫu câu trả lời ngắn (4–5 dòng): "Cách lập luận của tác giả chặt chẽ, đi từ … đến …. Lí lẽ … kết hợp với bằng chứng … nên giàu sức thuyết phục. Đặc biệt, hình ảnh … giúp …".

Quy trình làm bài thầy khuyên: (1) đọc đề, đánh số các yêu cầu; (2) đọc văn bản, gạch chân câu chủ đề mỗi đoạn; (3) trả lời đủ số ý theo đúng thứ tự đã đánh số; (4) đọc lại đề lần cuối để chắc không bỏ sót yêu cầu nào.`,
        ],
      },
      {
        name: DOC_VAN_HT,
        source: "lesson",
        pages: [
          `Phiếu đọc: Hiền tài là nguyên khí của quốc gia (Thân Nhân Trung)

Hoàn cảnh: đây là bài văn khắc trên tấm bia đề danh tiến sĩ khoa Nhâm Tuất, niên hiệu Đại Bảo thứ ba (1442), tấm bia đầu tiên được dựng ở Văn Miếu – Quốc Tử Giám năm 1484, dưới thời vua Lê Thánh Tông. Thân Nhân Trung là đại thần, một cây bút xuất sắc của hội Tao Đàn.

Thể loại: văn bia, mang tính chất nghị luận. Mục đích: ghi danh người đỗ đạt và nêu ý nghĩa của việc khắc bia.

Luận đề: vai trò của hiền tài đối với vận mệnh đất nước.

Câu mở đầu là câu nổi tiếng nhất: "Hiền tài là nguyên khí của quốc gia, nguyên khí thịnh thì thế nước mạnh, rồi lên cao, nguyên khí suy thì thế nước yếu, rồi xuống thấp." "Nguyên khí" là khí chất ban đầu làm nên sự sống còn và phát triển. So sánh hiền tài với nguyên khí là cách khẳng định hiền tài quyết định sự thịnh suy của đất nước.`,
          `Ba luận điểm và hệ thống lí lẽ, bằng chứng

Luận điểm 1: Hiền tài có vai trò quyết định đối với thịnh suy của đất nước. Lí lẽ: nguyên khí thịnh thì thế nước mạnh, nguyên khí suy thì thế nước yếu. Từ đó, các bậc thánh đế minh vương đều coi việc bồi dưỡng nhân tài, kén chọn kẻ sĩ là việc cần làm trước tiên.

Luận điểm 2: Nhà nước đã trọng đãi hiền tài rất mực nhưng như thế vẫn chưa đủ. Bằng chứng: người đỗ đạt được đề cao bằng khoa danh, được nêu tên ở tháp Nhạn, ban danh hiệu Long hổ, bày tiệc Văn hỉ. Lí lẽ: vinh hiển một thời thì chưa đủ, cần có cách lưu truyền lâu dài.

Luận điểm 3: Việc khắc bia tiến sĩ có ý nghĩa lâu dài. Lí lẽ: khắc bia để kẻ sĩ trông vào mà phấn chấn, hâm mộ, rèn luyện danh tiết; để ngăn ngừa điều ác, khuyến khích điều thiện; để vun đắp mệnh mạch cho nhà nước.

Như vậy các luận điểm nối tiếp nhau chặt chẽ: từ vai trò của hiền tài, đến việc đã làm, rồi đến việc cần làm thêm.`,
          `Nghệ thuật lập luận và bài học hôm nay

Nghệ thuật: lập luận theo lối diễn dịch, mở đầu bằng một chân lí khái quát rồi triển khai thành các luận điểm cụ thể. Lí lẽ chặt chẽ, bằng chứng là những việc làm có thật của triều đình. Hình ảnh "nguyên khí" giàu sức gợi, câu văn cân đối theo lối biền ngẫu, giọng điệu trang trọng.

Ý nghĩa: văn bản khẳng định tư tưởng trọng dụng nhân tài, một truyền thống quý của dân tộc. Câu "Hiền tài là nguyên khí của quốc gia" đến nay vẫn được trích dẫn trong các chủ trương phát triển giáo dục và nhân lực.

Liên hệ: các em là thế hệ đang học tập để trở thành người có ích. Hiền tài hôm nay không chỉ là người đỗ đạt cao mà là người có đức, có tài, biết đem hiểu biết phục vụ cộng đồng.

Câu hỏi luyện tập:
1. Xác định luận đề và ba luận điểm của văn bản.
2. Chỉ ra một lí lẽ và một bằng chứng ở luận điểm 2.
3. Nhận xét cách lập luận của tác giả (khoảng 5 dòng).`,
        ],
      },
    ],
  },
  {
    key: "ly10",
    owner: "binh",
    name: "Vật lí 10 – Động học",
    subject: "Vật lí",
    grade: 10,
    className: "10A1",
    docs: [
      {
        name: DOC_LY_DH,
        source: "text",
        pages: [
          `Chuyển động thẳng biến đổi đều

Chuyển động thẳng biến đổi đều là chuyển động trên đường thẳng với gia tốc không đổi. Gia tốc a = Δv/Δt cho biết vận tốc thay đổi nhanh hay chậm, đơn vị m/s².

Các công thức (chọn chiều dương là chiều chuyển động, gốc thời gian lúc bắt đầu xét):
• v = v₀ + at
• s = v₀t + ½at²
• v² − v₀² = 2as

Nhanh dần đều: a cùng dấu với v. Chậm dần đều: a ngược dấu với v (với chiều dương theo chiều chuyển động thì a < 0).

Ví dụ: ô tô chạy 54 km/h = 15 m/s hãm phanh, dừng sau 5 s. Gia tốc a = (0 − 15)/5 = −3 m/s², quãng đường s = 15·5 − ½·3·25 = 37,5 m.

Lưu ý của cô: luôn đổi km/h sang m/s bằng cách chia cho 3,6 trước khi thay số. Đồ thị vận tốc – thời gian của chuyển động biến đổi đều là đường thẳng; diện tích dưới đồ thị bằng quãng đường đi được.`,
          `Rơi tự do

Rơi tự do là chuyển động của vật chỉ dưới tác dụng của trọng lực. Trong thực tế, khi sức cản không khí rất nhỏ so với trọng lực, ta coi vật rơi tự do.

Đặc điểm: phương thẳng đứng, chiều từ trên xuống, là chuyển động nhanh dần đều với gia tốc g. Ở gần mặt đất g ≈ 9,8 m/s², trong bài tập thường lấy g = 10 m/s².

Công thức (thả không vận tốc đầu): v = gt; h = ½gt²; v² = 2gh. Suy ra thời gian rơi t = √(2h/g).

Điều quan trọng nhất: mọi vật rơi tự do tại cùng một nơi đều có cùng gia tốc g, không phụ thuộc khối lượng. Galileo đã chỉ ra điều này, và thí nghiệm trong ống chân không cho thấy hòn bi và lông chim rơi nhanh như nhau. Ngoài không khí, lông chim rơi chậm vì sức cản không khí lớn so với trọng lượng của nó, chứ không phải vì nó nhẹ.

Lưu ý: "quãng đường trong giây thứ n" khác "quãng đường sau n giây". Quãng đường trong giây thứ n bằng h(n) − h(n − 1).`,
          `Chuyển động ném ngang

Vật được ném theo phương ngang từ độ cao h với vận tốc v₀, bỏ qua sức cản. Ta tách thành hai chuyển động thành phần độc lập:
• Theo phương ngang Ox: chuyển động thẳng đều, vₓ = v₀, x = v₀t.
• Theo phương thẳng đứng Oy: rơi tự do, v_y = gt, y = ½gt².

Thời gian bay: t = √(2h/g), chỉ phụ thuộc độ cao, không phụ thuộc v₀. Tầm xa: L = v₀·√(2h/g). Tốc độ chạm đất: v = √(v₀² + (gt)²).

Ví dụ: ném ngang từ 20 m với v₀ = 15 m/s, g = 10 m/s². Thời gian bay 2 s, tầm xa 30 m, tốc độ chạm đất √(225 + 400) = 25 m/s.

Quỹ đạo là một nhánh parabol. Đây cũng là điểm nối với Toán 10: phương trình quỹ đạo y = g·x²/(2v₀²) là một hàm số bậc hai.

Lỗi hay gặp: cộng thẳng hai tốc độ vₓ + v_y thay vì dùng định lí Pythagoras.`,
        ],
      },
      {
        name: DOC_LY_RTD,
        source: "upload",
        pages: [
          `Bài 1. Thả rơi tự do một hòn bi từ độ cao 45 m, lấy g = 10 m/s². Tính thời gian rơi và tốc độ khi chạm đất.

Lời giải. Thời gian rơi t = √(2h/g) = √(90/10) = 3 s. Tốc độ chạm đất v = gt = 30 m/s. Kiểm chéo bằng v = √(2gh) = √900 = 30 m/s.

Bài 2. Cũng hòn bi trên, tính quãng đường bi rơi được trong giây cuối cùng.

Lời giải. Sau 2 s đầu, bi rơi được h(2) = ½·10·2² = 20 m. Quãng đường trong giây cuối (giây thứ 3) là 45 − 20 = 25 m.

Nhận xét: quãng đường đi được trong các giây liên tiếp là 5 m, 15 m, 25 m, tỉ lệ 1 : 3 : 5. Đây là tính chất của mọi chuyển động nhanh dần đều không vận tốc đầu, rất tiện để kiểm tra nhanh kết quả.

Lỗi hay gặp: lấy ½·g·1² = 5 m làm đáp số. Đó là quãng đường trong giây đầu tiên, không phải giây cuối.`,
          `Bài 3. Một vật rơi tự do, trong giây cuối cùng rơi được 35 m. Tính độ cao thả vật, lấy g = 10 m/s².

Lời giải. Gọi t là thời gian rơi. Quãng đường giây cuối: ½g·t² − ½g·(t − 1)² = 35. Rút gọn: 5(2t − 1) = 35, nên t = 4 s. Độ cao h = ½·10·16 = 80 m.

Bài 4. Hai viên bi A và B được thả rơi từ cùng một độ cao, B thả sau A 1 s. Tính khoảng cách giữa hai bi sau khi A rơi được 3 s.

Lời giải. Khi A rơi 3 s, B mới rơi 2 s. Khoảng cách = ½·10·3² − ½·10·2² = 45 − 20 = 25 m.

Bài 5. Vì sao một tờ giấy phẳng rơi chậm hơn hòn đá, nhưng vo tròn tờ giấy lại thì rơi nhanh gần bằng hòn đá?

Lời giải. Vo tròn làm giảm diện tích tiếp xúc, sức cản không khí giảm mạnh, chuyển động gần với rơi tự do. Khối lượng tờ giấy không đổi, chứng tỏ khối lượng không phải nguyên nhân rơi nhanh hay chậm.`,
          `Bài 6 (vận dụng). Để đo độ sâu của một cái giếng, bạn Minh thả một hòn sỏi và nghe tiếng sỏi chạm nước sau 2 s. Bỏ qua thời gian âm truyền lên, g = 10 m/s². Tính độ sâu từ miệng giếng đến mặt nước.

Lời giải. h = ½gt² = ½·10·4 = 20 m. Nếu tính cả thời gian âm truyền (tốc độ âm khoảng 340 m/s) thì thời gian rơi thực tế ngắn hơn 2 s một chút, nên giếng nông hơn 20 m một chút.

Bài 7. Từ một khí cầu đang đứng yên ở độ cao 80 m, một vật nhỏ được thả rơi. Tính tốc độ trung bình của vật trong suốt quá trình rơi.

Lời giải. Thời gian rơi t = √(160/10) = 4 s. Tốc độ trung bình = h/t = 80/4 = 20 m/s, đúng bằng một nửa tốc độ chạm đất 40 m/s.

Ghi nhớ của cô:
• Chọn gốc và chiều dương ngay từ đầu bài.
• Đọc kĩ "trong giây thứ n" hay "sau n giây".
• Kết quả nên kiểm chéo bằng một công thức khác.`,
        ],
      },
    ],
  },
  {
    key: "ctdl",
    owner: "khai",
    name: "Lập trình – Cấu trúc dữ liệu cơ bản",
    subject: "Lập trình",
    grade: 14,
    className: "KTPM K23",
    docs: [
      {
        name: DOC_CTDL_1,
        source: "lesson",
        pages: [
          `Tuần 1: Độ phức tạp thuật toán

Để so sánh thuật toán, ta đếm số phép toán cơ bản theo kích thước đầu vào n và dùng kí hiệu O lớn để chỉ tốc độ tăng khi n lớn. O(1): hằng số; O(log n): logarit, như tìm kiếm nhị phân; O(n): tuyến tính, như duyệt mảng; O(n log n): như sắp xếp trộn; O(n²): như hai vòng lặp lồng nhau.

Quy tắc: bỏ hằng số và các số hạng bậc thấp. 3n² + 5n + 7 là O(n²).

Ví dụ: với n = 1 000 000, thuật toán O(n²) cần cỡ 10¹² phép toán, chạy hàng giờ; thuật toán O(n log n) chỉ cần cỡ 2·10⁷, chạy dưới một giây. Chọn đúng cấu trúc dữ liệu thường là cách nhanh nhất để giảm độ phức tạp.

Lưu ý: phân biệt trường hợp xấu nhất, trung bình và tốt nhất. Khi không nói gì, ta hiểu là trường hợp xấu nhất.`,
          `Tuần 2: Mảng và mảng động

Mảng lưu các phần tử liên tiếp trong bộ nhớ, nên truy cập phần tử thứ i mất O(1): địa chỉ = địa chỉ đầu + i × kích thước phần tử.

List trong Python là mảng động. Khi đầy, nó cấp phát vùng nhớ lớn hơn (thường gấp khoảng 1,125 đến 2 lần) và sao chép sang. Nhờ vậy append có chi phí trung bình (khấu hao) O(1), dù đôi khi một lần append mất O(n).

Chi phí các thao tác trên list:
• Truy cập a[i], gán a[i] = x: O(1).
• Thêm/xoá ở cuối (append, pop()): O(1) khấu hao.
• Chèn/xoá ở đầu hoặc giữa (insert(0, x), pop(0)): O(n) vì phải dịch các phần tử.
• Tìm kiếm x in a: O(n).

Lỗi hay gặp của sinh viên: dùng list.pop(0) để làm hàng đợi, khiến chương trình chậm hẳn khi dữ liệu lớn. Hàng đợi nên dùng collections.deque.`,
          `Tuần 3–4: Danh sách liên kết đơn

Danh sách liên kết gồm các nút, mỗi nút chứa dữ liệu và con trỏ next tới nút kế tiếp. Nút cuối có next = None. Ta chỉ giữ con trỏ head trỏ tới nút đầu.

Ưu điểm: chèn hoặc xoá ở đầu danh sách mất O(1), không phải dịch phần tử như mảng. Nhược điểm: truy cập phần tử thứ i mất O(n) vì phải đi từ head; tốn thêm bộ nhớ cho con trỏ.

Đảo ngược danh sách liên kết (bài kinh điển): dùng ba con trỏ prev, cur, nxt. Ở mỗi bước: lưu nxt = cur.next, đổi chiều cur.next = prev, rồi dịch prev = cur, cur = nxt. Khi cur là None thì prev chính là head mới. Thời gian O(n), bộ nhớ O(1).

Lỗi hay gặp: quên lưu cur.next trước khi đổi chiều, làm mất phần còn lại của danh sách; quên cập nhật head sau khi đảo.

Bài tập tuần: cài đặt thêm vào đầu, xoá nút có giá trị x, tìm nút giữa bằng hai con trỏ nhanh – chậm.`,
        ],
      },
      {
        name: DOC_CTDL_2,
        source: "lesson",
        pages: [
          `Tuần 5: Ngăn xếp (stack)

Ngăn xếp hoạt động theo nguyên tắc vào sau ra trước (LIFO). Hai thao tác chính: push (đẩy vào đỉnh) và pop (lấy ra từ đỉnh), cùng peek để xem đỉnh. Trong Python dùng list: append và pop() đều O(1).

Ứng dụng: kiểm tra dấu ngoặc hợp lệ, tính giá trị biểu thức hậu tố, quay lui (undo), lời gọi hàm đệ quy (call stack), duyệt theo chiều sâu (DFS).

Bài kiểm tra dấu ngoặc: duyệt từng kí tự; gặp ngoặc mở thì push; gặp ngoặc đóng thì ngăn xếp phải khác rỗng và đỉnh phải là ngoặc mở cùng loại, nếu đúng thì pop. Hết chuỗi, ngăn xếp phải rỗng. Ví dụ "({[]})" hợp lệ, "([)]" không hợp lệ.

Lỗi hay gặp: gọi pop() khi ngăn xếp rỗng gây IndexError; quên kiểm tra ngăn xếp rỗng ở cuối, khiến chuỗi "((" bị coi là hợp lệ.`,
          `Tuần 6: Hàng đợi (queue)

Hàng đợi theo nguyên tắc vào trước ra trước (FIFO): enqueue thêm vào cuối, dequeue lấy ra ở đầu. Ứng dụng: xếp hàng xử lí yêu cầu, bộ đệm in, duyệt theo chiều rộng (BFS) trên đồ thị và cây.

Trong Python dùng collections.deque: append thêm vào cuối, popleft lấy ở đầu, cả hai O(1). Không dùng list.pop(0) vì O(n).

BFS tìm đường đi ngắn nhất (số cạnh ít nhất) trên đồ thị không trọng số: đưa đỉnh nguồn vào hàng đợi, đánh dấu đã thăm; lặp lấy đỉnh ở đầu, đưa các đỉnh kề chưa thăm vào cuối. Mỗi đỉnh và mỗi cạnh được xét một lần nên độ phức tạp O(V + E).

So sánh nhanh: ngăn xếp cho DFS (đi sâu trước), hàng đợi cho BFS (đi rộng trước). Chỉ đổi cấu trúc dữ liệu, cùng một khung thuật toán mà hành vi khác hẳn.`,
          `Tuần 7–8: Cây nhị phân tìm kiếm (BST)

Cây nhị phân: mỗi nút có tối đa hai con, trái và phải. Cây nhị phân tìm kiếm thoả: mọi khoá ở cây con trái nhỏ hơn khoá của nút, mọi khoá ở cây con phải lớn hơn.

Tìm kiếm: bắt đầu từ gốc, nhỏ hơn thì sang trái, lớn hơn thì sang phải. Chèn: tìm như vậy đến chỗ trống rồi gắn nút mới. Độ phức tạp O(h) với h là chiều cao cây: cây cân bằng có h ≈ log₂n, nhưng chèn dãy đã sắp xếp sẽ tạo cây suy biến thành danh sách, h = n.

Duyệt trung thứ tự (trái – gốc – phải) cho dãy khoá tăng dần. Đây là cách kiểm tra nhanh một cây có phải BST không.

Ví dụ: chèn lần lượt 50, 30, 70, 20, 40, 60, 80 được cây cân bằng chiều cao 3; duyệt trung thứ tự cho 20, 30, 40, 50, 60, 70, 80.

Lưu ý: để luôn đảm bảo O(log n), người ta dùng cây tự cân bằng như AVL hoặc cây đỏ – đen; các em sẽ học ở học phần sau.`,
        ],
      },
    ],
  },
];

// =====================================================================================
// 3. PHIÊN GIA SƯ CỦA MINH ANH (10A1)
// =====================================================================================

export const CHATS: DChat[] = [
  {
    kbKey: "toan10",
    mode: "chat",
    title: "Lãi lớn nhất của quầy nước chanh",
    daysAgo: 22,
    hour: 20,
    messages: [
      { role: "user", content: "Cô Hà bảo tìm lãi lớn nhất của quầy nước chanh P(x) = −x² + 6x − 5. Em làm thế nào ạ?" },
      {
        role: "assistant",
        content: r`$P(x)$ là hàm số bậc hai với $a = -1 < 0$, nên parabol **quay bề lõm xuống** và đạt giá trị lớn nhất ngay tại đỉnh [1].

Em chỉ cần nhớ hoành độ đỉnh rồi thay vào hàm số [1]:
$$x = -\frac{b}{2a} = -\frac{6}{2\cdot(-1)} = 3.$$

Bây giờ em thử tính $P(3)$ xem được bao nhiêu nhé.`,
        cite: [{ n: 1, doc: DOC_TOAN_HS, page: 2, snippet: "em chỉ cần nhớ hoành độ đỉnh x = −b/(2a), rồi thay vào hàm số để lấy tung độ" }],
      },
      { role: "user", content: "P(3) = −9 + 18 − 5 = 4. Vậy lãi nhiều nhất là 4 ạ?" },
      {
        role: "assistant",
        content: r`Phép tính đúng rồi! Chỉ thiếu một chút: **đơn vị** của $P(x)$ là trăm nghìn đồng, nên $P(3) = 4$ nghĩa là lãi **400 nghìn đồng** khi bán 3 chục cốc [1].

Đây cũng là một kiểu "đọc thiếu đề": con số đúng nhưng câu trả lời chưa trọn vẹn. Khi đề có đơn vị đặc biệt, em ghi đơn vị vào kết luận nhé.`,
        cite: [{ n: 1, doc: DOC_TOAN_HS, page: 4, snippet: "Bán 3 chục cốc thì lãi nhiều nhất 400 nghìn đồng." }],
      },
      { role: "user", content: "Sao bán nhiều hơn 3 chục cốc lại lãi ít đi ạ? Em tưởng bán càng nhiều càng lãi." },
      {
        role: "assistant",
        content: r`Câu hỏi rất hay! Trong đời thực, bán vượt quá sức của quầy thì chi phí tăng nhanh hơn tiền thu: phải mua thêm chanh, đường, đá, thuê thêm bình; quá 5 chục cốc thì còn lỗ [1].

Nhìn trên đồ thị: parabol đối xứng qua đường $x = 3$, nên $P(2) = P(4) = 3$, tức bán 2 chục hay 4 chục cốc đều lãi 300 nghìn. Đi xa đỉnh về hai phía thì lãi giảm như nhau.

Ghi nhớ: với $a < 0$, đỉnh là điểm **cao nhất**; với $a > 0$, đỉnh là điểm **thấp nhất**.`,
        cite: [{ n: 1, doc: DOC_TOAN_HS, page: 4, snippet: "bán nhiều quá 5 chục thì phải mua thêm nguyên liệu, thuê thêm bình, lại lỗ" }],
      },
    ],
  },
  {
    kbKey: "ly10",
    mode: "chat",
    title: "Vì sao vật nặng và vật nhẹ rơi như nhau?",
    daysAgo: 18,
    hour: 19,
    messages: [
      { role: "user", content: "Cô Bình nói hòn đá và tờ giấy vo tròn rơi gần như nhau. Em vẫn thấy vô lí, vật nặng phải rơi nhanh hơn chứ ạ?" },
      {
        role: "assistant",
        content: r`Nhiều người từng nghĩ như em, kể cả các nhà triết học thời cổ đại! Nhưng thực nghiệm cho thấy **mọi vật rơi tự do tại cùng một nơi đều có cùng gia tốc $g$**, không phụ thuộc khối lượng [1].

Lí do theo định luật II Newton: vật nặng chịu trọng lực lớn hơn, nhưng cũng "khó tăng tốc" hơn đúng bằng ngần ấy lần:
$$a = \frac{P}{m} = \frac{mg}{m} = g.$$

Tờ giấy phẳng rơi chậm là do **sức cản không khí**, không phải do nhẹ. Vo tròn lại thì diện tích tiếp xúc nhỏ, sức cản giảm mạnh nên nó rơi gần như hòn đá [2].`,
        cite: [
          { n: 1, doc: DOC_LY_DH, page: 2, snippet: "mọi vật rơi tự do tại cùng một nơi đều có cùng gia tốc g, không phụ thuộc khối lượng" },
          { n: 2, doc: DOC_LY_RTD, page: 2, snippet: "Vo tròn làm giảm diện tích tiếp xúc, sức cản không khí giảm mạnh" },
        ],
      },
      { role: "user", content: "Vậy lên Mặt Trăng không có không khí thì búa và lông chim cũng rơi như nhau ạ?" },
      {
        role: "assistant",
        content: r`Đúng vậy! Năm 1971, phi hành gia David Scott của tàu Apollo 15 đã làm đúng thí nghiệm này trên Mặt Trăng: thả cùng lúc một chiếc búa và một chiếc lông chim, hai vật chạm đất cùng lúc.

Chỉ khác là gia tốc rơi trên Mặt Trăng nhỏ hơn, khoảng $1{,}6\ \text{m/s}^2$, nên cả hai rơi chậm hơn ở Trái Đất. Nhưng vẫn **bằng nhau** với mọi vật.`,
      },
    ],
  },
  {
    kbKey: "anh10",
    mode: "chat",
    title: "Hiện tại hoàn thành hay quá khứ đơn?",
    daysAgo: 15,
    hour: 21,
    messages: [
      { role: "user", content: "\"She has worked here for five years\" với \"She worked here for five years\" khác nhau chỗ nào ạ? Em thấy giống nhau." },
      {
        role: "assistant",
        content: r`Hai câu cùng có "for five years" nhưng nghĩa khác hẳn:

- **She has worked here for five years.** Cô ấy làm ở đây 5 năm rồi và **vẫn đang làm**.
- **She worked here for five years.** Cô ấy từng làm 5 năm, **giờ đã nghỉ**.

Thầy Minh tóm gọn: hiện tại hoàn thành nối quá khứ với hiện tại; quá khứ đơn cắt đứt với hiện tại [1].`,
        cite: [{ n: 1, doc: DOC_ANH_GR, page: 3, snippet: "Hiện tại hoàn thành nối quá khứ với hiện tại; quá khứ đơn cắt đứt với hiện tại." }],
      },
      { role: "user", content: "Câu \"I have seen him yesterday\" sai chỗ nào ạ?" },
      {
        role: "assistant",
        content: r`"Yesterday" là một **thời điểm đã kết thúc**, mà hiện tại hoàn thành không đi với thời điểm đã kết thúc [1]. Câu đúng: **I saw him yesterday.**

Mẹo tự hỏi trước khi chọn thì [2]: *thời điểm đó đã kết thúc chưa và có được nêu ra không?* Có thời điểm đã kết thúc (yesterday, last week, ago, in 2010) thì dùng quá khứ đơn.`,
        cite: [
          { n: 1, doc: DOC_ANH_GR, page: 3, snippet: "Không dùng hiện tại hoàn thành với thời điểm đã kết thúc" },
          { n: 2, doc: DOC_ANH_GR, page: 2, snippet: "Mẹo: hỏi \"Thời điểm đó đã kết thúc chưa và có được nêu ra không?\"" },
        ],
      },
      { role: "user", content: "Em làm thử: I ___ (know) Lan since we were in grade 6. Em điền \"knew\" được không ạ?" },
      {
        role: "assistant",
        content: r`Chưa đúng, em ơi. Có **since** và việc quen Lan vẫn kéo dài đến bây giờ, nên mệnh đề chính dùng hiện tại hoàn thành: **I have known Lan since we were in grade 6.**

Điểm hay bị bẫy: mệnh đề **sau** since lại dùng quá khứ đơn ("we were"), vì đó là mốc thời gian đã qua [1].

Em giỏi Tiếng Anh rồi, chỉ cần để ý cặp since/for là gần như không mất điểm phần này.`,
        cite: [{ n: 1, doc: DOC_ANH_GR, page: 3, snippet: "Lưu ý câu 1: mệnh đề sau since dùng quá khứ đơn (we were), mệnh đề chính dùng hiện tại hoàn thành." }],
      },
    ],
  },
  {
    kbKey: "toan10",
    mode: "chat",
    title: "Dấu tam thức: \"trong trái, ngoài cùng\"",
    daysAgo: 12,
    hour: 21,
    messages: [
      { role: "user", content: "Em chưa hiểu câu \"trong trái, ngoài cùng\" là gì ạ." },
      {
        role: "assistant",
        content: r`Đó là câu thần chú để nhớ dấu tam thức khi $\Delta > 0$ [1]. Tam thức có hai nghiệm $x_1 < x_2$:

- **Trong** khoảng $(x_1; x_2)$: $f(x)$ **trái** dấu với $a$.
- **Ngoài** khoảng đó: $f(x)$ **cùng** dấu với $a$.

Ví dụ $f(x) = x^2 - 5x + 6$ có nghiệm $2$ và $3$, $a = 1 > 0$. Vậy $f(x) < 0$ khi $2 < x < 3$ (trong, trái dấu $a$), và $f(x) > 0$ khi $x < 2$ hoặc $x > 3$ (ngoài, cùng dấu $a$).

Nếu phân vân, em phác nhanh parabol: phần nằm dưới trục hoành là chỗ $f(x)$ âm.`,
        cite: [{ n: 1, doc: DOC_TOAN_HS, page: 3, snippet: "Câu thần chú để nhớ trường hợp Δ > 0: \"trong trái, ngoài cùng\"" }],
      },
      { role: "user", content: "Vậy nếu Δ < 0 thì sao ạ, ví dụ x² + 2x + 5?" },
      {
        role: "assistant",
        content: r`Khi $\Delta < 0$, tam thức **không có nghiệm**, nên không có "trong" hay "ngoài" gì cả: $f(x)$ luôn cùng dấu với $a$ [1]. Áp "trong trái, ngoài cùng" lúc này là một lỗi hay gặp [2].

Với $x^2 + 2x + 5$: $\Delta' = 1 - 5 = -4 < 0$ và $a = 1 > 0$, nên $x^2 + 2x + 5 > 0$ với mọi $x$. Em kiểm bằng cách viết $(x+1)^2 + 4$, rõ ràng luôn dương.`,
        cite: [
          { n: 1, doc: DOC_TOAN_HS, page: 3, snippet: "Δ < 0: f(x) luôn cùng dấu với a với mọi x." },
          { n: 2, doc: DOC_TOAN_BPT, page: 2, snippet: "Lỗi 4: Áp dụng \"trong trái, ngoài cùng\" khi Δ < 0." },
        ],
      },
      { role: "user", content: "Còn Δ = 0 thì sao ạ?" },
      {
        role: "assistant",
        content: r`Khi $\Delta = 0$, tam thức có nghiệm kép $x_0 = -\dfrac{b}{2a}$: nó cùng dấu với $a$ ở mọi chỗ, **trừ** tại $x_0$ thì bằng $0$ [1].

Ví dụ $x^2 - 4x + 4 = (x-2)^2$:
- $(x-2)^2 > 0 \iff x \ne 2$.
- $(x-2)^2 \le 0 \iff x = 2$.

Tóm lại ba trường hợp chỉ cần nhìn parabol: không chạm trục ($\Delta < 0$), tiếp xúc trục ($\Delta = 0$), cắt trục hai điểm ($\Delta > 0$). Em làm thêm 2–3 bài trong phiếu học tập là sẽ nhớ.`,
        cite: [{ n: 1, doc: DOC_TOAN_HS, page: 3, snippet: "Δ = 0: f(x) cùng dấu với a với mọi x ≠ −b/(2a), và bằng 0 tại x = −b/(2a)." }],
      },
    ],
  },
  {
    kbKey: "toan10",
    mode: "chat",
    title: "Quên đổi chiều khi giải −x² + 6x − 5 > 0",
    daysAgo: 9,
    hour: 20,
    summary: "Minh Anh giải bất phương trình quầy nước chanh −x² + 6x − 5 > 0 nhưng quên đổi chiều khi nhân −1, ra x < 1 hoặc x > 5. Gia sư dùng phép thử x = 3 (bán 3 chục cốc lãi 400 nghìn) để chỉ ra mâu thuẫn; em sửa lại được 1 < x < 5, hiểu vì sao nhân số âm phải đổi chiều và nhận bài luyện \"lãi ít nhất 300 nghìn đồng\".",
    messages: [
      { role: "user", content: "Em giải bài quầy nước chanh: −x² + 6x − 5 > 0. Em nhân −1 được x² − 6x + 5 > 0, nghiệm 1 và 5, a > 0 nên x < 1 hoặc x > 5. Đúng không ạ?" },
      {
        role: "assistant",
        content: r`Em tìm nghiệm $1$ và $5$ đúng rồi! Nhưng mình cùng làm một **phép thử đời thực** nhé: thay $x = 3$ vào bài gốc [2].

$P(3) = -9 + 18 - 5 = 4 > 0$: bán 3 chục cốc thì lãi 400 nghìn. Vậy $x = 3$ **phải** nằm trong tập nghiệm, nhưng đáp án "$x < 1$ hoặc $x > 5$" lại loại nó ra. Chắc chắn có bước sai.

Chỗ sai nằm ở phép nhân $-1$: nhân hai vế với số âm thì **phải đổi chiều** bất đẳng thức [1]. Đúng ra là:
$$-x^2 + 6x - 5 > 0 \iff x^2 - 6x + 5 < 0.$$
Em thử làm tiếp từ đây xem sao?`,
        cite: [
          { n: 1, doc: DOC_TOAN_BPT, page: 2, snippet: "Lỗi 1: Quên đổi chiều khi nhân hoặc chia hai vế cho số âm." },
          { n: 2, doc: DOC_TOAN_HS, page: 4, snippet: "giải xong bất kì bất phương trình nào về P(x), em thay thử x = 3" },
        ],
      },
      { role: "user", content: "À em hiểu rồi. x² − 6x + 5 < 0, a > 0 nên âm trong khoảng hai nghiệm. Vậy 1 < x < 5 ạ?" },
      {
        role: "assistant",
        content: r`Chính xác! $S = (1; 5)$: quầy có lãi khi bán hơn 1 chục và dưới 5 chục cốc. Và $x = 3$ nằm gọn trong đó, khớp với phép thử.

Em cũng có thể **không nhân $-1$**, giữ nguyên $a = -1 < 0$ và dùng định lí dấu: trong khoảng hai nghiệm, tam thức trái dấu với $a$, tức là dương [1]. Cách này tránh được hẳn bước đổi chiều.`,
        cite: [{ n: 1, doc: DOC_TOAN_HS, page: 3, snippet: "trong khoảng (x₁; x₂), f(x) trái dấu với a." }],
      },
      { role: "user", content: "Sao nhân số âm lại phải đổi chiều ạ? Em hay quên lắm." },
      {
        role: "assistant",
        content: r`Em nghĩ thế này: nhân với $-1$ giống như **lật trục số qua điểm 0**. Số nào đang ở bên phải sẽ sang bên trái.

Ví dụ: $2 < 3$, nhưng nhân $-1$ thì $-2 > -3$ (vì $-2$ nằm bên phải $-3$).

Mẹo để không quên: mỗi khi viết "$\cdot(-1)$" hay "chia cho số âm", em **khoanh tròn dấu bất đẳng thức** và lật nó ngay lúc đó. Rồi trước khi chốt đáp án, thay thử một số cụ thể vào đề gốc, như $x = 3$ với quầy nước chanh.`,
      },
      { role: "user", content: "Cho em một bài tương tự để luyện với ạ." },
      {
        role: "assistant",
        content: r`Bài này cùng bối cảnh nhé [1]: **lớp muốn lãi ít nhất 300 nghìn đồng**, cần bán bao nhiêu chục cốc?

Gợi ý khởi đầu:
1. "Lãi ít nhất 300 nghìn" dịch thành $P(x) \ge 3$ (nhớ đơn vị là trăm nghìn).
2. Chuyển vế để vế phải bằng $0$.
3. Nếu nhân $-1$ thì... em biết phải làm gì rồi đấy!

Làm xong em gửi lên, mình cùng thử lại bằng $x = 3$.`,
        cite: [{ n: 1, doc: DOC_TOAN_BPT, page: 3, snippet: "Cũng quầy nước chanh trên, lớp muốn lãi ít nhất 300 nghìn đồng." }],
      },
    ],
  },
  {
    kbKey: "hoa10",
    mode: "chat",
    title: "Nâng cao: cân bằng FeS₂ và Fe₃O₄",
    daysAgo: 6,
    hour: 20,
    messages: [
      { role: "user", content: "Bài kiểm tra 15 phút oxi hoá – khử em được 9,5 rồi. Thầy Long bảo luyện nâng cao: FeS₂ + O₂ → Fe₂O₃ + SO₂ có hai nguyên tố cùng đổi số oxi hoá thì cân bằng sao ạ?" },
      {
        role: "assistant",
        content: r`Chúc mừng em điểm 9,5! Với FeS₂, mẹo là **gộp cả phân tử thành một khối nhường electron**:

- $\text{Fe}^{+2} \to \text{Fe}^{+3} + 1e$
- $2\text{S}^{-1} \to 2\text{S}^{+4} + 10e$

Một phân tử FeS₂ nhường tổng cộng $11e$ [1]. Bên nhận: $\text{O}_2 + 4e \to 2\text{O}^{-2}$.

Bội chung nhỏ nhất của 11 và 4 là 44, nên nhân FeS₂ với 4, O₂ với 11:
$$4\text{FeS}_2 + 11\text{O}_2 \to 2\text{Fe}_2\text{O}_3 + 8\text{SO}_2.$$
Kiểm O: trái $22$, phải $6 + 16 = 22$. Khớp.`,
        cite: [{ n: 1, doc: DOC_HOA_OXH, page: 4, snippet: "Một phân tử FeS₂ nhường tổng cộng 11e." }],
      },
      { role: "user", content: "Còn Fe₃O₄ với HNO₃ ra NO thì số oxi hoá của Fe là +8/3, lẻ quá em không biết đặt hệ số." },
      {
        role: "assistant",
        content: r`Em cứ tính theo **cả phân tử** thì electron luôn ra số nguyên [1]:

- $3\text{Fe}^{+8/3} \to 3\text{Fe}^{+3} + 1e$ (cả phân tử Fe₃O₄ nhường $3\cdot\tfrac{1}{3} = 1e$), nhân 3.
- $\text{N}^{+5} + 3e \to \text{N}^{+2}$, nhân 1.

$$3\text{Fe}_3\text{O}_4 + 28\text{HNO}_3 \to 9\text{Fe(NO}_3)_3 + \text{NO} + 14\text{H}_2\text{O}.$$

Kiểm N: $27 + 1 = 28$. Kiểm O: trái $12 + 84 = 96$, phải $81 + 1 + 14 = 96$. Đẹp!`,
        cite: [{ n: 1, doc: DOC_HOA_OXH, page: 4, snippet: "Mẹo: với số oxi hoá trung bình là phân số, em cứ tính theo cả phân tử, tổng electron nhường luôn là số nguyên." }],
      },
      { role: "user", content: "Hay quá ạ. Có bài nào khó hơn nữa không ạ?" },
      {
        role: "assistant",
        content: r`Có! Thử thách tiếp theo trong phiếu bài tập số 3: $\text{FeS}_2 + \text{HNO}_3 \to \text{Fe(NO}_3)_3 + \text{H}_2\text{SO}_4 + \text{NO} + \text{H}_2\text{O}$.

Lần này S lên tận $+6$, nên một FeS₂ nhường $15e$ [1]. Em tự tìm tỉ lệ FeS₂ : NO rồi cân bằng N, H, O nhé.

Dạng nhiều sản phẩm khử rất hay gặp trong đề thi có Hoá [2], mà em đang nhắm tổ hợp D07, nên luyện thêm vài bài mỗi tuần là rất đáng.`,
        cite: [
          { n: 1, doc: DOC_HOA_BT, page: 3, snippet: "một FeS₂ nhường 15e (Fe lên +3 nhường 1e, mỗi S từ −1 lên +6 nhường 7e)" },
          { n: 2, doc: DOC_HOA_BT, page: 3, snippet: "Lời thầy: các em mạnh Hoá nên luyện thêm bài nhiều sản phẩm khử" },
        ],
      },
    ],
  },
  {
    kbKey: "van10",
    mode: "chat",
    title: "Đọc hiểu: Hiền tài là nguyên khí của quốc gia",
    daysAgo: 5,
    hour: 20,
    summary: "Minh Anh nhầm câu \"Hiền tài là nguyên khí của quốc gia\" là bằng chứng và chỉ nêu một ý trong khi đề hỏi \"một lí lẽ và một bằng chứng\". Gia sư chỉ cách phân biệt lí lẽ (suy nghĩ của người viết) với bằng chứng (kiểm chứng được), xác định bằng chứng ở luận điểm 2 (tháp Nhạn, danh hiệu Long hổ, tiệc Văn hỉ), mạch ba luận điểm, và đưa khung viết nhận xét lập luận.",
    messages: [
      { role: "user", content: "Câu 2 phiếu đọc: chỉ ra một lí lẽ và một bằng chứng ở luận điểm 2. Em ghi \"Hiền tài là nguyên khí của quốc gia\" là bằng chứng ạ." },
      {
        role: "assistant",
        content: r`Mình xem cùng em nhé, câu trả lời đang có hai chỗ cần sửa:

1. **Đọc đủ yêu cầu:** đề hỏi "một lí lẽ **và** một bằng chứng", em mới nêu một thứ [1]. Em đánh số hai yêu cầu lên đề để không sót.
2. **Phân loại:** câu "Hiền tài là nguyên khí của quốc gia" là nhận định của tác giả, tức là **lí lẽ**, và nó thuộc **luận điểm 1**, chưa phải luận điểm 2.

Mẹo phân biệt: bằng chứng là thứ có thể kiểm chứng ngoài văn bản, như một sự kiện hay việc làm có thật [2]. Em thử tìm trong luận điểm 2 xem triều đình đã **làm gì** cho người đỗ đạt?`,
        cite: [
          { n: 1, doc: DOC_VAN_NL, page: 2, snippet: "Đọc thiếu yêu cầu: đề hỏi \"một lí lẽ VÀ một bằng chứng\" mà chỉ nêu một thứ." },
          { n: 2, doc: DOC_VAN_NL, page: 2, snippet: "bằng chứng là thứ có thể kiểm chứng ngoài văn bản" },
        ],
      },
      { role: "user", content: "Em thấy có đoạn nêu tên ở tháp Nhạn, ban danh hiệu Long hổ. Đó là bằng chứng ạ?" },
      {
        role: "assistant",
        content: r`Đúng rồi! Đó là những việc làm có thật của nhà nước để tôn vinh người đỗ đạt [1]:

- **Bằng chứng:** nêu tên ở tháp Nhạn, ban danh hiệu Long hổ, bày tiệc Văn hỉ.
- **Lí lẽ** đi kèm: vinh hiển một thời thì chưa đủ, cần có cách lưu truyền lâu dài [1].

Lí lẽ này chính là "cây cầu" dẫn sang luận điểm 3 về việc khắc bia.`,
        cite: [{ n: 1, doc: DOC_VAN_HT, page: 2, snippet: "Bằng chứng: người đỗ đạt được đề cao bằng khoa danh, được nêu tên ở tháp Nhạn, ban danh hiệu Long hổ, bày tiệc Văn hỉ." }],
      },
      { role: "user", content: "Ba luận điểm nối với nhau thế nào ạ?" },
      {
        role: "assistant",
        content: r`Em hình dung như ba bậc thang [1]:

1. **Vai trò:** hiền tài là nguyên khí, quyết định thịnh suy.
2. **Việc đã làm:** triều đình đã trọng đãi hiền tài, nhưng chưa đủ.
3. **Việc cần làm thêm:** khắc bia tiến sĩ để lưu danh lâu dài, khuyến khích người sau.

Mạch đi từ vai trò của hiền tài, đến việc đã làm, rồi đến việc cần làm thêm, nên rất chặt chẽ.`,
        cite: [{ n: 1, doc: DOC_VAN_HT, page: 2, snippet: "từ vai trò của hiền tài, đến việc đã làm, rồi đến việc cần làm thêm" }],
      },
      { role: "user", content: "Câu 3 nhận xét cách lập luận em viết thế nào cho đủ ý ạ?" },
      {
        role: "assistant",
        content: r`Câu này yêu cầu **đánh giá**, không kể lại. Em đi lần lượt các tiêu chí: trình tự lập luận (diễn dịch, quy nạp hay song song) [1], độ chặt chẽ, lí lẽ – bằng chứng, hình ảnh ngôn ngữ.

Áp vào văn bản này, tác giả lập luận theo lối diễn dịch, mở đầu bằng một chân lí khái quát rồi triển khai thành các luận điểm cụ thể [2]. Một đoạn mẫu khoảng 5 dòng:

> Cách lập luận của Thân Nhân Trung chặt chẽ, đi từ khẳng định khái quát "hiền tài là nguyên khí của quốc gia" đến việc làm cụ thể là khắc bia tiến sĩ. Lí lẽ sắc sảo kết hợp với bằng chứng có thật (tháp Nhạn, danh hiệu Long hổ, tiệc Văn hỉ) nên giàu sức thuyết phục. Đặc biệt, hình ảnh so sánh "nguyên khí" ngắn gọn mà sâu sắc, khiến câu văn trở thành chân lí còn được nhắc đến hôm nay.

Em viết bằng lời của mình nhé, đừng chép nguyên đoạn mẫu.`,
        cite: [
          { n: 1, doc: DOC_VAN_NL, page: 3, snippet: "Trình tự lập luận: diễn dịch (nêu ý chung trước), quy nạp (nêu ví dụ trước, khái quát sau), hay song song." },
          { n: 2, doc: DOC_VAN_HT, page: 3, snippet: "lập luận theo lối diễn dịch, mở đầu bằng một chân lí khái quát rồi triển khai thành các luận điểm cụ thể" },
        ],
      },
    ],
  },
  {
    kbKey: "toan10",
    mode: "hint",
    title: "Gợi ý: nghiệm nguyên của x² − 4x − 5 < 0",
    daysAgo: 3,
    hour: 20,
    summary: "Phiên gợi mở: Minh Anh tự tìm nghiệm −1 và 5, tự xét dấu ra khoảng (−1; 5), được nhắc đọc lại đề nên nhận ra đề hỏi nghiệm nguyên, tự loại hai đầu mút bằng cách thay số và chốt đáp án 0, 1, 2, 3, 4.",
    messages: [
      { role: "user", content: "Bài 5 phiếu học tập: tìm các nghiệm nguyên của x² − 4x − 5 < 0. Gợi ý em thôi, đừng giải hộ nhé." },
      { role: "assistant", content: r`Được, mình chỉ đặt câu hỏi thôi. Trước hết, em gạch chân những chữ chỉ **yêu cầu** của đề. Sau đó: với tam thức $x^2 - 4x - 5$, việc đầu tiên em sẽ làm là gì?` },
      { role: "user", content: "Tìm nghiệm ạ. Δ = 16 + 20 = 36, nghiệm là 5 và −1." },
      { role: "assistant", content: r`Chính xác. Hệ số $a$ của tam thức mang dấu gì? Theo "trong trái, ngoài cùng", tam thức **âm** ở phần nào của trục số?` },
      { role: "user", content: "a = 1 dương, nên âm trong khoảng hai nghiệm. Vậy S = (−1; 5) ạ." },
      {
        role: "assistant",
        content: r`Khoảng đó đúng. Giờ em đọc lại đề một lần nữa, thật chậm: đề hỏi **tập nghiệm**, hay hỏi điều gì khác? [1]`,
        cite: [{ n: 1, doc: DOC_TOAN_BPT, page: 2, snippet: "Lỗi 3: Đọc thiếu yêu cầu đề." }],
      },
      { role: "user", content: "À, đề hỏi nghiệm nguyên! Vậy là 0, 1, 2, 3, 4. Mà có lấy −1 với 5 không ạ?" },
      { role: "assistant", content: r`Em tự kiểm được đấy: thay $x = 5$ vào $x^2 - 4x - 5$ thì được bao nhiêu? Dấu của đề là $<$ hay $\le$?` },
      { role: "user", content: "Thay 5 vào được 0, mà đề cần nhỏ hơn 0 nên không lấy. −1 cũng vậy. Đáp án là 0, 1, 2, 3, 4." },
      {
        role: "assistant",
        content: r`Tuyệt vời, em tự làm ra trọn vẹn! Hai thói quen em vừa dùng rất đáng giữ:

1. **Đọc lại đề** trước khi chốt đáp án, để không dừng ở khoảng nghiệm khi đề hỏi nghiệm nguyên.
2. **Thay số kiểm đầu mút**: dấu $<$ thì không lấy, dấu $\le$ thì lấy.`,
      },
    ],
  },
  {
    kbKey: "toan10",
    mode: "chat",
    title: "Ôn lại công thức lượng giác sắp quên",
    daysAgo: 1,
    hour: 21,
    summary: "Minh Anh ôn lượng giác trước chương IV: nhắc bảng giá trị đặc biệt và mẹo √1/2, √2/2, √3/2; quy tắc góc bù để tính cos 120°; sửa lỗi quên xét dấu khi α tù (cos α = −4/5 chứ không phải 4/5); thống nhất thói quen tự viết lại bảng 5 phút mỗi tối.",
    messages: [
      { role: "user", content: "Tuần sau lớp em học chương IV mà em quên gần hết sin cos lớp 9 rồi. Nhắc em bảng giá trị đặc biệt với ạ." },
      {
        role: "assistant",
        content: r`Không sao, mình ôn nhanh nhé! Bảng cần thuộc [1]:

| | $30^\circ$ | $45^\circ$ | $60^\circ$ |
|---|---|---|---|
| $\sin$ | $\tfrac{1}{2}$ | $\tfrac{\sqrt2}{2}$ | $\tfrac{\sqrt3}{2}$ |
| $\cos$ | $\tfrac{\sqrt3}{2}$ | $\tfrac{\sqrt2}{2}$ | $\tfrac{1}{2}$ |
| $\tan$ | $\tfrac{\sqrt3}{3}$ | $1$ | $\sqrt3$ |

Mẹo nhớ: viết dãy $\tfrac{\sqrt1}{2}, \tfrac{\sqrt2}{2}, \tfrac{\sqrt3}{2}$ cho sin; cos thì đọc ngược lại [2]. Quên tan thì lấy $\sin : \cos$.`,
        cite: [
          { n: 1, doc: DOC_TOAN_LG, page: 1, snippet: "sin 30° = 1/2, sin 45° = √2/2, sin 60° = √3/2." },
          { n: 2, doc: DOC_TOAN_LG, page: 1, snippet: "Mẹo nhớ nhanh: viết dãy √1/2, √2/2, √3/2 cho sin 30°, 45°, 60°; cos thì đọc ngược lại." },
        ],
      },
      { role: "user", content: "Thế cos 120° là bao nhiêu ạ? Góc tù em không biết làm." },
      {
        role: "assistant",
        content: r`Dùng **góc bù**: $120^\circ = 180^\circ - 60^\circ$. Câu nhớ: "bù nhau thì sin giữ nguyên, các hàm còn lại đổi dấu" [1].

$$\cos 120^\circ = -\cos 60^\circ = -\frac{1}{2}, \qquad \sin 120^\circ = \sin 60^\circ = \frac{\sqrt3}{2}.$$

Em thử tự tính $\sin 150^\circ$ và $\cos 135^\circ$ xem?`,
        cite: [{ n: 1, doc: DOC_TOAN_LG, page: 2, snippet: "Câu nhớ: \"bù nhau thì sin giữ nguyên, các hàm còn lại đổi dấu\"" }],
      },
      { role: "user", content: "sin 150° = 1/2, cos 135° = −√2/2. Còn bài cho sin α = 3/5, α tù thì cos α = 4/5 đúng không ạ?" },
      {
        role: "assistant",
        content: r`Hai giá trị đầu em làm đúng hết! Câu sau thì gần đúng thôi: $\cos^2\alpha = 1 - \tfrac{9}{25} = \tfrac{16}{25}$ là chuẩn, nhưng **$\alpha$ tù thì $\cos\alpha < 0$**, nên $\cos\alpha = -\tfrac{4}{5}$.

Quên xét dấu đúng là lỗi hay gặp nhất ở dạng này [1]. Giống như đổi chiều bất đẳng thức bên bất phương trình: số tính đúng mà dấu sai thì vẫn mất điểm. Em tập thói quen: khai căn xong thì **dừng lại hỏi "góc nhọn hay tù?"**.`,
        cite: [{ n: 1, doc: DOC_TOAN_LG, page: 2, snippet: "Lỗi hay gặp là quên xét dấu, ghi cos α = 4/5." }],
      },
      { role: "user", content: "Làm sao em nhớ lâu được ạ? Học xong vài tuần là quên." },
      {
        role: "assistant",
        content: r`Bí quyết là **ôn ngắn mà đều**, trước khi kịp quên. Cô Hà gợi ý: mỗi tối dành 5 phút tự viết lại bảng giá trị đặc biệt và ba hệ thức cơ bản ra giấy nháp, không nhìn tài liệu [1].

Em học tốt nhất khoảng 20–22h, nên gắn 5 phút này vào đầu buổi học tối là hợp nhất. Mình đã xếp sẵn thẻ ôn lượng giác vào lộ trình "Ôn chắc công thức lượng giác", hệ thống sẽ nhắc đúng lúc em sắp quên.`,
        cite: [{ n: 1, doc: DOC_TOAN_LG, page: 3, snippet: "mỗi tối dành 5 phút tự viết lại bảng giá trị đặc biệt và ba hệ thức cơ bản ra giấy nháp" }],
      },
    ],
  },
  {
    kbKey: "ly10",
    mode: "hint",
    title: "Gợi ý: rơi tự do, quãng đường giây cuối",
    daysAgo: 0,
    hour: 20,
    messages: [
      { role: "user", content: "Bài 3: vật rơi tự do, trong giây cuối rơi được 35 m, tính độ cao thả vật (g = 10). Gợi ý em thôi ạ." },
      {
        role: "assistant",
        content: r`Mình gợi từng bước nhé. Gọi $t$ là tổng thời gian rơi. "Quãng đường trong giây cuối" bằng **hiệu** của hai quãng đường nào? [1]`,
        cite: [{ n: 1, doc: DOC_LY_DH, page: 2, snippet: "Quãng đường trong giây thứ n bằng h(n) − h(n − 1)." }],
      },
      { role: "user", content: "Là h(t) − h(t − 1) ạ? Tức là 5t² − 5(t − 1)² = 35." },
      { role: "assistant", content: r`Đúng hướng rồi. Em khai triển $(t-1)^2$ rồi rút gọn vế trái: số hạng $t^2$ có còn không?` },
      { role: "user", content: "5t² − 5t² + 10t − 5 = 35, nên 10t = 40, t = 4 s." },
      { role: "assistant", content: r`Tốt lắm. Giờ dừng một giây: đề hỏi **thời gian** hay hỏi đại lượng nào?` },
      { role: "user", content: "Đề hỏi độ cao ạ! h = ½·10·4² = 80 m." },
      {
        role: "assistant",
        content: r`Chính xác, $h = 80$ m. Em kiểm chéo bằng quy luật $1 : 3 : 5 : \dots$ của rơi tự do [1]: các giây liên tiếp rơi được $5, 15, 25, 35$ m. Giây thứ 4 đúng $35$ m, tổng $5 + 15 + 25 + 35 = 80$ m. Khớp hoàn toàn!`,
        cite: [{ n: 1, doc: DOC_LY_RTD, page: 1, snippet: "quãng đường đi được trong các giây liên tiếp là 5 m, 15 m, 25 m, tỉ lệ 1 : 3 : 5" }],
      },
    ],
  },
];

// =====================================================================================
// 4. LỘ TRÌNH THÀNH THẠO CỦA MINH ANH
// =====================================================================================

export const PATHS: DPath[] = [
  {
    kbKey: "toan10",
    name: "Vá lỗ hổng bất phương trình bậc hai",
    goal: "Giải chắc chắn bất phương trình bậc hai, không còn lỗi đổi chiều khi nhân số âm, trước bài kiểm tra cuối học kỳ I.",
    subject: "Toán",
    grade: 10,
    description: "Lộ trình ba chặng đi từ dấu tam thức đến bài toán thực tế quầy nước chanh. Ưu tiên luyện bước nhân hai vế với số âm và thói quen đọc đủ yêu cầu đề, hai lỗi Minh Anh hay mắc.",
    daysAgo: 16,
    modules: [
      {
        name: "Nền tảng tam thức bậc hai",
        objective: "Tìm nghiệm và xét dấu tam thức bậc hai trong cả ba trường hợp của Δ.",
        points: [
          { name: "Nhận dạng tam thức và hệ số a, b, c", type: "concept", mastery: 0.9, attempts: 4 },
          { name: "Tính Δ và tìm nghiệm tam thức", type: "procedure", mastery: 0.85, attempts: 6 },
          { name: "Định lí dấu tam thức bậc hai", type: "concept", mastery: 0.65, attempts: 5 },
        ],
      },
      {
        name: "Giải bất phương trình bậc hai",
        objective: "Giải đúng bất phương trình bậc hai và viết tập nghiệm chính xác đầu mút.",
        points: [
          { name: "Lập bảng xét dấu", type: "procedure", mastery: 0.6, attempts: 4 },
          { name: "Nhân hai vế với số âm và đổi chiều", type: "procedure", mastery: 0.4, attempts: 6 },
          { name: "Viết tập nghiệm đúng đầu mút", type: "memory", mastery: 0.55, attempts: 3 },
        ],
      },
      {
        name: "Vận dụng và bài toán thực tế",
        objective: "Dịch bài toán thực tế thành bất phương trình, giải bài có tham số và trả lời đủ yêu cầu đề.",
        points: [
          { name: "Dịch bài toán quầy nước chanh thành bất phương trình", type: "design", mastery: 0.5, attempts: 2 },
          { name: "Đọc đủ yêu cầu đề trước khi giải", type: "procedure", mastery: 0.45, attempts: 3 },
          { name: "Bất phương trình chứa tham số m", type: "concept", mastery: 0, attempts: 0 },
          { name: "Hệ bất phương trình bậc hai", type: "procedure", mastery: 0, attempts: 0 },
        ],
      },
    ],
    errors: [
      { point: "Nhân hai vế với số âm và đổi chiều", question: "Giải −x² + 6x − 5 > 0", errorType: "Nhân −1 nhưng giữ nguyên dấu >, ra x < 1 hoặc x > 5", remediation: "Khoanh dấu bất đẳng thức mỗi khi nhân số âm; thay thử x = 3 (bán 3 chục cốc lãi 400 nghìn) để kiểm tập nghiệm.", daysAgo: 9 },
      { point: "Viết tập nghiệm đúng đầu mút", question: "Giải x² − 5x + 6 ≤ 0", errorType: "Viết (2; 3) thay vì [2; 3], bỏ sót dấu bằng", remediation: "Dấu ≤, ≥ thì lấy nghiệm của tam thức (ngoặc vuông); luyện 5 câu chỉ khác nhau ở dấu.", daysAgo: 7 },
      { point: "Đọc đủ yêu cầu đề trước khi giải", question: "Tìm các nghiệm nguyên của x² − 4x − 5 < 0", errorType: "Dừng ở khoảng nghiệm (−1; 5), chưa liệt kê nghiệm nguyên", remediation: "Gạch chân và đánh số mọi yêu cầu của đề; đọc lại đề trước khi chốt đáp án.", daysAgo: 3 },
    ],
  },
  {
    kbKey: "toan10",
    name: "Ôn chắc công thức lượng giác",
    goal: "Nhớ lâu bảng giá trị đặc biệt và các hệ thức lượng giác để vào chương IV tự tin, chuẩn bị nền cho Toán 11.",
    subject: "Toán",
    grade: 10,
    description: "Ôn ngắn mỗi tối theo lịch lặp lại ngắt quãng: giá trị đặc biệt, hệ thức cơ bản, góc bù, rồi định lí côsin – sin. Chặng cuối xem trước công thức cộng và nhân đôi của lớp 11.",
    daysAgo: 1,
    modules: [
      {
        name: "Giá trị lượng giác của góc đặc biệt",
        objective: "Viết lại không cần nhìn bảng giá trị sin, cos, tan của 0°, 30°, 45°, 60°, 90°.",
        points: [
          { name: "Bảng sin, cos của 30°, 45°, 60°", type: "memory", mastery: 0.7, attempts: 3 },
          { name: "Giá trị tan của góc đặc biệt", type: "memory", mastery: 0.55, attempts: 2 },
          { name: "Tỉ số lượng giác của hai góc phụ nhau", type: "concept", mastery: 0.6, attempts: 2 },
        ],
      },
      {
        name: "Hệ thức cơ bản và góc từ 0° đến 180°",
        objective: "Dùng hệ thức cơ bản và quy tắc góc bù để tính giá trị lượng giác, xét đúng dấu với góc tù.",
        points: [
          { name: "Hệ thức sin²α + cos²α = 1", type: "memory", mastery: 0.8, attempts: 3 },
          { name: "Giá trị lượng giác của hai góc bù nhau", type: "concept", mastery: 0.5, attempts: 2 },
          { name: "Xét dấu cos α khi α tù", type: "procedure", mastery: 0.4, attempts: 2 },
        ],
      },
      {
        name: "Định lí côsin, sin và xem trước lớp 11",
        objective: "Áp dụng định lí côsin, sin trong tam giác; làm quen công thức cộng và nhân đôi.",
        points: [
          { name: "Định lí côsin", type: "procedure", mastery: 0, attempts: 0 },
          { name: "Định lí sin", type: "procedure", mastery: 0, attempts: 0 },
          { name: "Công thức nhân đôi (Toán 11)", type: "memory", mastery: 0, attempts: 0 },
        ],
      },
    ],
    errors: [
      { point: "Xét dấu cos α khi α tù", question: "Cho sin α = 3/5, α tù. Tính cos α.", errorType: "Quên xét dấu, ghi cos α = 4/5", remediation: "Khai căn xong luôn hỏi \"góc nhọn hay tù?\"; góc tù thì cos và tan âm.", daysAgo: 1 },
      { point: "Bảng sin, cos của 30°, 45°, 60°", question: "Tính cos 30°", errorType: "Nhầm sin 30° với cos 30°, ghi 1/2", remediation: "Mẹo dãy √1/2, √2/2, √3/2 cho sin, cos đọc ngược; tự viết lại bảng 5 phút mỗi tối.", daysAgo: 1 },
    ],
  },
  {
    kbKey: "anh10",
    name: "Tăng tốc Tiếng Anh tổ hợp D07",
    goal: "Giữ điểm Tiếng Anh từ 8,5 trở lên cho tổ hợp D07 (Toán · Hoá · Anh), hướng tới ĐH Bách khoa ngành CNTT.",
    subject: "Tiếng Anh",
    grade: 10,
    description: "Minh Anh đã mạnh ngữ pháp; lộ trình tập trung vào cấu tạo từ, các bẫy thì quen thuộc và chiến lược đọc hiểu, nhất là câu hỏi suy luận.",
    daysAgo: 20,
    modules: [
      {
        name: "Ngữ pháp trọng tâm",
        objective: "Không mất điểm ở các câu thì và câu bị động.",
        points: [
          { name: "Hiện tại hoàn thành và quá khứ đơn", type: "concept", mastery: 0.85, attempts: 5 },
          { name: "Câu bị động các thì", type: "procedure", mastery: 0.8, attempts: 4 },
          { name: "Mệnh đề quan hệ", type: "concept", mastery: 0, attempts: 0 },
        ],
      },
      {
        name: "Từ vựng và cấu tạo từ",
        objective: "Chọn đúng loại từ và nghĩa theo vị trí trong câu, học từ theo họ từ.",
        points: [
          { name: "Xác định loại từ theo vị trí", type: "procedure", mastery: 0.7, attempts: 4 },
          { name: "Họ từ chủ đề Unit 1–5", type: "memory", mastery: 0.55, attempts: 3 },
        ],
      },
      {
        name: "Đọc hiểu và chiến lược làm bài",
        objective: "Làm mỗi đoạn đọc trong khoảng 8 phút, đúng cả câu ý chính và câu suy luận.",
        points: [
          { name: "Tìm ý chính của đoạn văn", type: "procedure", mastery: 0.6, attempts: 3 },
          { name: "Quét tìm thông tin chi tiết", type: "procedure", mastery: 0.65, attempts: 3 },
          { name: "Câu hỏi suy luận", type: "design", mastery: 0, attempts: 0 },
        ],
      },
    ],
    errors: [
      { point: "Hiện tại hoàn thành và quá khứ đơn", question: "I ___ (know) Lan since we were in grade 6.", errorType: "Chọn quá khứ đơn \"knew\" dù có since", remediation: "Since + mốc, for + khoảng đi với hiện tại hoàn thành ở mệnh đề chính; mệnh đề sau since dùng quá khứ đơn.", daysAgo: 15 },
      { point: "Xác định loại từ theo vị trí", question: "Online learning is very ___ for students in remote areas. (USE)", errorType: "Chọn \"useless\": đúng loại từ nhưng sai nghĩa", remediation: "Sau khi chọn loại từ, đọc lại cả câu để kiểm nghĩa tích cực hay tiêu cực.", daysAgo: 11 },
    ],
  },
];

// =====================================================================================
// 5. GIÁO TRÌNH SỐNG
// =====================================================================================

const cite = (n: number, doc: string, page: number, snippet: string) => ({ n, docId: "", doc, page, snippet });

export const BOOKS: DBook[] = [
  {
    kbKey: "toan10",
    owner: "ha",
    title: "Hàm số bậc hai và ứng dụng",
    description: "Giáo trình đi từ khái niệm hàm số bậc hai, đồ thị parabol, dấu tam thức đến bất phương trình bậc hai, xuyên suốt bằng ví dụ quầy nước chanh của lớp 10A1.",
    scope: "Toán 10 (Cánh Diều), chương III: hàm số bậc hai, dấu của tam thức bậc hai, bất phương trình bậc hai một ẩn.",
    level: "intermediate",
    pages: [
      {
        title: "Hàm số bậc hai là gì?",
        summary: "Định nghĩa hàm số bậc hai, nhận diện hệ số và những tình huống đời thực sinh ra hàm số bậc hai.",
        objectives: ["Nhận biết hàm số bậc hai và xác định đúng các hệ số a, b, c", "Tính giá trị của hàm số tại một điểm", "Nêu được ví dụ đời thực dẫn tới hàm số bậc hai"],
        contentType: "theory",
        blocks: [
          {
            type: "section",
            markdown: r`## Từ quầy nước chanh đến công thức

Mỗi dịp hội trại, lớp 10A1 mở một quầy nước chanh. Sau vài lần bán, lớp ghi lại số liệu và nhận ra: nếu bán $x$ chục cốc thì tiền lãi (trăm nghìn đồng) xấp xỉ
$$P(x) = -x^2 + 6x - 5.$$
Đây là một **hàm số bậc hai**. Bán quá ít thì chưa đủ bù tiền chanh, đường, đá; bán quá nhiều thì phải mua thêm nguyên liệu, thuê thêm bình, chi phí tăng nhanh hơn tiền thu. Chính sự "lên rồi xuống" ấy được mô tả bởi số hạng $-x^2$.

## Định nghĩa

Hàm số bậc hai là hàm số cho bởi công thức
$$y = ax^2 + bx + c,$$
trong đó $x$ là biến số, $a$, $b$, $c$ là các hằng số và **$a \ne 0$**. Tập xác định là $\mathbb{R}$. Điều kiện $a \ne 0$ rất quan trọng: nếu $a = 0$ thì công thức chỉ còn $y = bx + c$, là hàm số bậc nhất.

Với $P(x) = -x^2 + 6x - 5$, ta có $a = -1$, $b = 6$, $c = -5$. Em chú ý **dấu đi kèm hệ số**: $b$ là $6$ chứ không phải $+6x$, còn $c$ là $-5$.

## Tính giá trị của hàm số

Thay $x$ vào công thức là biết lãi ứng với mỗi mức bán. Chẳng hạn $P(2) = -4 + 12 - 5 = 3$, tức bán 2 chục cốc lãi 300 nghìn đồng; $P(3) = 4$, lãi 400 nghìn đồng; còn $P(6) = -36 + 36 - 5 = -5$, tức lỗ 500 nghìn đồng. Chỉ với vài phép thay số, lớp đã thấy bán nhiều chưa chắc đã tốt.

## Hàm số bậc hai quanh ta

Ngoài chuyện buôn bán, hàm số bậc hai xuất hiện khi tính diện tích (hình chữ nhật có chu vi cố định), khi mô tả độ cao của quả bóng được ném lên, hay quỹ đạo của tia nước phun từ vòi. Ở các trang sau, em sẽ học cách vẽ đồ thị để "nhìn thấy" hàm số, rồi dùng nó để trả lời câu hỏi quan trọng nhất của quầy nước chanh: **bán bao nhiêu thì có lãi?**`,
          },
          { type: "callout", title: "key_idea", markdown: r`Hàm số bậc hai có dạng $y = ax^2 + bx + c$ với **$a \ne 0$**. Đọc hệ số luôn kèm theo dấu: với $-x^2 + 6x - 5$ thì $a = -1$, $b = 6$, $c = -5$.` },
          { type: "text", markdown: r`**Thử nhanh:** hàm số nào dưới đây là hàm số bậc hai? $y = 3 - 2x^2$; $y = (m-1)x^2 + x$ với $m = 1$; $y = x(x + 4)$. Đáp án: hàm thứ nhất ($a = -2$) và hàm thứ ba ($y = x^2 + 4x$). Hàm thứ hai có $a = 0$ nên chỉ là hàm số bậc nhất.` },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Dạng tổng quát của hàm số bậc hai?", back: "y = ax² + bx + c với a ≠ 0", hint: "Điều kiện của a" },
              { front: "Tập xác định của hàm số bậc hai?", back: "ℝ", hint: "Đa thức xác định ở mọi x" },
              { front: "Hệ số a, b, c của P(x) = −x² + 6x − 5?", back: "a = −1, b = 6, c = −5", hint: "Đọc kèm dấu" },
              { front: "P(3) của quầy nước chanh bằng bao nhiêu?", back: "P(3) = 4, tức lãi 400 nghìn đồng", hint: "−9 + 18 − 5" },
              { front: "Nếu a = 0 thì y = ax² + bx + c là hàm gì?", back: "Hàm số bậc nhất y = bx + c (khi b ≠ 0)", hint: "Mất số hạng x²" },
            ] },
          },
        ],
      },
      {
        title: "Đồ thị: đỉnh, trục đối xứng, bề lõm",
        summary: "Đồ thị hàm số bậc hai là parabol; cách tìm đỉnh, trục đối xứng, chiều biến thiên và các bước vẽ.",
        objectives: ["Tìm toạ độ đỉnh và trục đối xứng của parabol", "Lập bảng biến thiên theo dấu của a", "Vẽ được đồ thị hàm số bậc hai"],
        contentType: "theory",
        blocks: [
          {
            type: "section",
            markdown: r`## Parabol và đỉnh của nó

Đồ thị của hàm số $y = ax^2 + bx + c$ là một **parabol**. Điểm quan trọng nhất của parabol là **đỉnh** $I$, nơi đồ thị đổi chiều từ đi xuống sang đi lên (hoặc ngược lại). Hoành độ đỉnh là
$$x_I = -\frac{b}{2a},$$
còn tung độ đỉnh chỉ cần thay $x_I$ vào hàm số [1]. Parabol nhận đường thẳng $x = -\dfrac{b}{2a}$ làm **trục đối xứng**: hai điểm có hoành độ cách đều trục thì có cùng tung độ.

Với quầy nước chanh, $x_I = -\dfrac{6}{2\cdot(-1)} = 3$ và $P(3) = 4$, nên đỉnh là $I(3; 4)$. Nhờ tính đối xứng, $P(2) = P(4) = 3$ và $P(1) = P(5) = 0$.

## Bề lõm và chiều biến thiên

Dấu của $a$ quyết định hình dạng:

- **$a > 0$:** parabol quay bề lõm **lên**, đỉnh là điểm **thấp nhất**. Hàm số nghịch biến trên $\left(-\infty; -\tfrac{b}{2a}\right)$, đồng biến trên $\left(-\tfrac{b}{2a}; +\infty\right)$.
- **$a < 0$:** parabol quay bề lõm **xuống**, đỉnh là điểm **cao nhất**. Hàm số đồng biến trước đỉnh, nghịch biến sau đỉnh.

$P(x)$ có $a = -1 < 0$ nên lãi tăng dần khi bán tới 3 chục cốc, rồi giảm dần. Lãi lớn nhất là 400 nghìn đồng, đạt tại đỉnh.

## Vẽ đồ thị trong bốn bước

Em làm theo sơ đồ bên dưới: tìm đỉnh, vẽ trục đối xứng, tìm giao điểm với hai trục, lấy thêm điểm đối xứng rồi nối thành đường cong trơn. Ví dụ với $y = x^2 - 4x + 3$: đỉnh $I(2; -1)$, cắt $Oy$ tại $(0; 3)$, cắt $Ox$ tại $(1; 0)$ và $(3; 0)$; điểm $(4; 3)$ đối xứng với $(0; 3)$ qua trục $x = 2$. Năm điểm là đủ để vẽ một parabol đẹp. Lưu ý: parabol là đường **cong trơn**, ở đỉnh không được vẽ thành góc nhọn như chữ V.`,
            citations: [cite(1, DOC_TOAN_HS, 2, "em chỉ cần nhớ hoành độ đỉnh x = −b/(2a), rồi thay vào hàm số để lấy tung độ")],
          },
          { type: "figure", title: "Các bước vẽ parabol", markdown: "Quy trình vẽ đồ thị hàm số bậc hai, áp dụng cho mọi parabol.", data: { mermaid: "graph TD\nA[Xác định a, b, c] --> B[Tìm đỉnh: x = −b/2a, thay vào lấy y]\nB --> C[Vẽ trục đối xứng]\nC --> D[Tìm giao điểm với Oy và Ox]\nD --> E[Lấy điểm đối xứng qua trục]\nE --> F[Nối thành đường cong trơn]" } },
          { type: "callout", title: "tip", markdown: r`Không cần học thuộc tung độ đỉnh $-\dfrac{\Delta}{4a}$. Tính $x_I = -\dfrac{b}{2a}$ rồi **thay vào hàm số**, vừa nhanh vừa ít sai.` },
          {
            type: "timeline",
            title: "Parabol qua các thời kì",
            data: { events: [
              { date: "~200 TCN", title: "Apollonius đặt tên parabola", description: "Nhà toán học Hy Lạp Apollonius xứ Perga nghiên cứu các đường cônic và đặt tên cho parabol." },
              { date: "1637", title: "Descartes và hình học toạ độ", description: "Descartes biểu diễn đường cong bằng phương trình, mở đường cho cách viết y = ax² + bx + c." },
              { date: "1638", title: "Galileo và quỹ đạo vật ném", description: "Galileo chỉ ra quỹ đạo của vật ném (bỏ qua sức cản) là một parabol." },
              { date: "Ngày nay", title: "Chảo ăng-ten, đèn pha", description: "Mặt cong dạng parabol hội tụ sóng và ánh sáng, được dùng trong chảo thu sóng và đèn pha ô tô." },
            ] },
          },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Hoành độ đỉnh của y = ax² + bx + c?", back: "x = −b/(2a)", hint: "Trục đối xứng đi qua đỉnh" },
              { front: "a < 0 thì parabol quay bề lõm về đâu?", back: "Xuống dưới, đỉnh là điểm cao nhất", hint: "Quầy nước chanh" },
              { front: "Đỉnh của P(x) = −x² + 6x − 5?", back: "I(3; 4)", hint: "x = 3, P(3) = 4" },
              { front: "Đỉnh và giao điểm với Ox của y = x² − 4x + 3?", back: "Đỉnh I(2; −1), cắt Ox tại (1; 0) và (3; 0)", hint: "Nhẩm nghiệm a + b + c = 0" },
            ] },
          },
        ],
      },
      {
        title: "Dấu của tam thức bậc hai",
        summary: "Định lí về dấu của tam thức bậc hai trong ba trường hợp của Δ và cách đọc dấu từ đồ thị.",
        objectives: ["Phát biểu định lí dấu của tam thức bậc hai", "Xét dấu tam thức trong cả ba trường hợp Δ < 0, Δ = 0, Δ > 0", "Liên hệ dấu tam thức với vị trí parabol so với trục hoành"],
        contentType: "theory",
        blocks: [
          {
            type: "section",
            markdown: r`## Câu hỏi "khi nào dương, khi nào âm?"

Biểu thức $f(x) = ax^2 + bx + c$ với $a \ne 0$ gọi là **tam thức bậc hai**. Câu hỏi "quầy có lãi không?" thực chất là hỏi $P(x)$ **dương hay âm**. Để trả lời cho mọi $x$ cùng lúc, ta dùng định lí về dấu của tam thức bậc hai.

## Định lí dấu

Tính $\Delta = b^2 - 4ac$ (hoặc $\Delta' = b'^2 - ac$ khi $b$ chẵn). Có ba trường hợp [1]:

1. **$\Delta < 0$:** $f(x)$ luôn **cùng dấu với $a$** với mọi $x \in \mathbb{R}$. Parabol không cắt trục hoành.
2. **$\Delta = 0$:** $f(x)$ cùng dấu với $a$ với mọi $x \ne -\dfrac{b}{2a}$, và bằng $0$ tại $x = -\dfrac{b}{2a}$. Parabol tiếp xúc trục hoành tại đỉnh.
3. **$\Delta > 0$:** $f(x)$ có hai nghiệm $x_1 < x_2$. **Trong** khoảng $(x_1; x_2)$, $f(x)$ **trái dấu** với $a$; **ngoài** đoạn $[x_1; x_2]$, $f(x)$ **cùng dấu** với $a$. Câu nhớ: "trong trái, ngoài cùng".

## Ví dụ

- $f(x) = x^2 + 2x + 5$: $\Delta' = 1 - 5 = -4 < 0$, $a = 1 > 0$, nên $f(x) > 0$ với mọi $x$.
- $f(x) = x^2 - 4x + 4 = (x-2)^2$: $\Delta' = 0$, nên $f(x) > 0$ với mọi $x \ne 2$ và $f(2) = 0$.
- $P(x) = -x^2 + 6x - 5$: hai nghiệm $1$ và $5$, $a = -1 < 0$. Trong khoảng $(1; 5)$, $P(x)$ trái dấu với $a$, tức **dương**: quầy có lãi. Ngoài đoạn $[1; 5]$, $P(x)$ âm: quầy lỗ.

## Đọc dấu bằng mắt

Dấu của $f(x)$ chính là vị trí của parabol so với trục $Ox$: phần nằm **trên** trục là nơi $f(x) > 0$, phần nằm **dưới** là nơi $f(x) < 0$. Khi phân vân, em chỉ cần phác nhanh một parabol đúng chiều bề lõm và đúng số giao điểm với trục hoành là thấy ngay kết quả, không cần học thuộc máy móc.`,
            citations: [cite(1, DOC_TOAN_HS, 3, "Câu thần chú để nhớ trường hợp Δ > 0: \"trong trái, ngoài cùng\"")],
          },
          { type: "figure", title: "Ba trường hợp của Δ", markdown: "Chọn nhánh theo dấu của Δ rồi kết luận dấu của tam thức theo dấu của a.", data: { mermaid: "graph TD\nA[Tính Δ của f] -->|Δ < 0| B[f cùng dấu a với mọi x]\nA -->|Δ = 0| C[f cùng dấu a, bằng 0 tại nghiệm kép]\nA -->|Δ > 0| D[Trong trái, ngoài cùng]" } },
          { type: "callout", title: "common_pitfall", markdown: r`Đừng áp "trong trái, ngoài cùng" khi $\Delta < 0$: lúc đó tam thức **không có nghiệm**, nên không có "trong" và "ngoài", tam thức luôn cùng dấu với $a$.` },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Δ < 0 thì dấu của f(x) thế nào?", back: "Luôn cùng dấu với a với mọi x", hint: "Parabol không cắt Ox" },
              { front: "Câu nhớ khi Δ > 0?", back: "Trong trái, ngoài cùng (so với dấu của a)", hint: "Trong khoảng hai nghiệm" },
              { front: "Dấu của x² + 2x + 5?", back: "Luôn dương vì Δ' = −4 < 0 và a > 0", hint: "(x + 1)² + 4" },
              { front: "P(x) = −x² + 6x − 5 dương khi nào?", back: "Khi 1 < x < 5", hint: "a < 0, trong khoảng nghiệm trái dấu a" },
              { front: "Δ = 0 thì f(x) bằng 0 tại đâu?", back: "Tại nghiệm kép x = −b/(2a)", hint: "Parabol tiếp xúc Ox" },
            ] },
          },
        ],
      },
      {
        title: "Bất phương trình bậc hai qua quầy nước chanh",
        summary: "Giải bất phương trình bậc hai bằng xét dấu tam thức, chú ý đổi chiều khi nhân số âm và phép thử đời thực.",
        objectives: ["Giải bất phương trình bậc hai một ẩn theo bốn bước", "Đổi chiều đúng khi nhân hoặc chia hai vế cho số âm", "Tự kiểm tập nghiệm bằng phép thử số cụ thể"],
        contentType: "practice",
        blocks: [
          {
            type: "section",
            markdown: r`## Bài toán

Quầy nước chanh của lớp bán $x$ chục cốc thì lãi $P(x) = -x^2 + 6x - 5$ (trăm nghìn đồng). **Bán bao nhiêu thì có lãi?** "Có lãi" nghĩa là $P(x) > 0$, nên ta cần giải bất phương trình bậc hai
$$-x^2 + 6x - 5 > 0.$$

## Bốn bước giải

**Bước 1. Đưa về một vế bằng 0.** Bài đã có sẵn dạng $f(x) > 0$.

**Bước 2. Tìm nghiệm tam thức.** $-x^2 + 6x - 5 = 0 \iff x^2 - 6x + 5 = 0 \iff x = 1$ hoặc $x = 5$.

**Bước 3. Xét dấu.** $a = -1 < 0$, "trong trái, ngoài cùng": trong khoảng $(1; 5)$, tam thức trái dấu với $a$, tức là dương.

**Bước 4. Kết luận.** $S = (1; 5)$. Quầy có lãi khi bán hơn 1 chục và dưới 5 chục cốc [1].

## Cách thứ hai: nhân với −1

Nhiều bạn thích đưa hệ số $a$ về dương. Khi đó nhân hai vế với $-1$ và **bắt buộc đổi chiều**:
$$-x^2 + 6x - 5 > 0 \iff x^2 - 6x + 5 < 0.$$
Tam thức $x^2 - 6x + 5$ có $a = 1 > 0$, âm trong khoảng hai nghiệm, nên vẫn ra $1 < x < 5$. Nếu quên đổi chiều, em sẽ được $x < 1$ hoặc $x > 5$, tức là kết luận "bán 3 chục cốc thì lỗ". Điều này trái ngược hẳn với thực tế, vì bán 3 chục cốc lãi tới 400 nghìn đồng.

## Phép thử đời thực

Vì vậy, sau mỗi bài bất phương trình, em hãy chọn một số cụ thể và thay vào **đề gốc**. Với quầy nước chanh, số "chuẩn" là $x = 3$: tập nghiệm nào không chứa $3$ chắc chắn đã sai. Thói quen nhỏ này mất chưa đến nửa phút nhưng giúp em bắt được gần như mọi lỗi đổi chiều.

## Mở rộng: lãi ít nhất 300 nghìn đồng

Nếu lớp muốn lãi ít nhất 300 nghìn, ta giải $P(x) \ge 3 \iff x^2 - 6x + 8 \le 0 \iff 2 \le x \le 4$. Dấu $\ge$ nên lấy cả hai đầu mút: bán từ 2 đến 4 chục cốc.`,
            citations: [cite(1, DOC_TOAN_BPT, 3, "Gợi ý: có lãi nghĩa là P(x) > 0. Đáp số: 1 < x < 5.")],
          },
          { type: "callout", title: "warning", markdown: r`Nhân hoặc chia hai vế cho **số âm** thì phải **đổi chiều** bất đẳng thức: $>$ thành $<$, $\ge$ thành $\le$. Ví dụ $2 < 3$ nhưng $-2 > -3$.` },
          { type: "text", markdown: r`**Mẹo khoanh dấu:** mỗi khi viết "$\cdot(-1)$", em khoanh tròn dấu bất đẳng thức và lật nó ngay. Sau đó thay $x = 3$ vào đề gốc: $P(3) = 4 > 0$, nên $3$ phải nằm trong tập nghiệm.` },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "\"Có lãi\" dịch thành bất phương trình nào?", back: "P(x) > 0", hint: "Lãi dương" },
              { front: "Nhân hai vế với −1 thì sao?", back: "Đổi chiều bất đẳng thức", hint: "Lật trục số qua 0" },
              { front: "Tập nghiệm của −x² + 6x − 5 > 0?", back: "S = (1; 5)", hint: "a < 0, trong trái" },
              { front: "Dấu ≥ hay ≤ thì đầu mút thế nào?", back: "Lấy nghiệm của tam thức, dùng ngoặc vuông", hint: "Có dấu bằng" },
              { front: "Phép thử đời thực cho quầy nước chanh?", back: "Thay x = 3: lãi 400 nghìn, nên 3 phải thuộc tập nghiệm", hint: "Đỉnh parabol" },
            ] },
          },
          {
            type: "deep_dive",
            title: "Đào sâu thêm",
            data: { suggestions: [
              { topic: "Bất phương trình chứa tham số m", rationale: "Dạng hay gặp trong đề kiểm tra: tìm m để tam thức luôn dương, dùng điều kiện a > 0 và Δ < 0." },
              { topic: "Hệ bất phương trình bậc hai", rationale: "Giải từng bất phương trình rồi lấy giao tập nghiệm, rèn kĩ năng biểu diễn trên trục số." },
            ] },
          },
        ],
      },
      {
        title: "Ôn tập chương và luyện tập",
        summary: "Tổng hợp kiến thức chương, bảng bài luyện theo mức độ và liên hệ với các môn khác.",
        objectives: ["Hệ thống lại hàm số bậc hai, dấu tam thức và bất phương trình bậc hai", "Tự đánh giá qua bài luyện theo ba mức độ", "Nhận ra hàm số bậc hai trong Vật lí và đời sống"],
        contentType: "mixed",
        blocks: [
          {
            type: "section",
            markdown: r`## Ba ý lớn của chương

**1. Hàm số bậc hai** $y = ax^2 + bx + c$ ($a \ne 0$) có đồ thị là parabol, đỉnh tại $x = -\dfrac{b}{2a}$. Dấu của $a$ cho biết parabol quay bề lõm lên hay xuống, từ đó biết hàm số có giá trị nhỏ nhất hay lớn nhất.

**2. Dấu tam thức bậc hai** phụ thuộc vào $\Delta$ và dấu của $a$: $\Delta < 0$ thì luôn cùng dấu $a$; $\Delta = 0$ thì cùng dấu $a$ trừ tại nghiệm kép; $\Delta > 0$ thì "trong trái, ngoài cùng".

**3. Bất phương trình bậc hai** giải bằng xét dấu tam thức theo bốn bước. Hai lỗi cần tránh: quên đổi chiều khi nhân số âm và lấy sai đầu mút. Một thói quen cần giữ: đọc đủ yêu cầu đề, và thử lại bằng một số cụ thể.

Ba ý này nối với nhau rất chặt: đồ thị giúp nhìn dấu, dấu giúp giải bất phương trình, và bất phương trình trả lời câu hỏi thực tế như "bán bao nhiêu thì có lãi". Quầy nước chanh $P(x) = -x^2 + 6x - 5$ đi qua cả ba: đỉnh $(3; 4)$ cho lãi lớn nhất 400 nghìn đồng, hai nghiệm $1$ và $5$ là ngưỡng hoà vốn, và $1 < x < 5$ là vùng có lãi.

## Bài luyện theo mức độ

- **Nhận biết:** Xác định $a$, $b$, $c$ và toạ độ đỉnh của $y = 2x^2 - 8x + 1$. (Đáp số: đỉnh $(2; -7)$.)
- **Thông hiểu:** Xét dấu $f(x) = -x^2 + 2x - 3$. (Đáp số: $f(x) < 0$ với mọi $x$.)
- **Vận dụng:** Giải $-2x^2 + 3x + 5 \ge 0$. (Đáp số: $\left[-1; \tfrac{5}{2}\right]$.)
- **Vận dụng cao:** Tìm $m$ để $x^2 - 2mx + m + 2 > 0$ với mọi $x$. (Đáp số: $-1 < m < 2$.)

Em làm lần lượt từ trên xuống, tự chấm bằng đáp số trong ngoặc. Câu nào sai, em mở lại trang tương ứng của giáo trình, hoặc hỏi gia sư AI ở chế độ gợi ý để tự tìm ra chỗ vướng.`,
          },
          { type: "callout", title: "connection", markdown: r`Ở môn Vật lí, vật ném ngang có quỹ đạo $y = \dfrac{g}{2v_0^2}x^2$, cũng là một parabol. Độ cao quả bóng ném lên $h(t) = -5t^2 + 20t + 1$ đạt lớn nhất tại đỉnh $t = 2$ giây, giống hệt cách tìm lãi lớn nhất của quầy nước chanh.` },
          {
            type: "flash_cards",
            title: "Ôn nhanh cả chương",
            data: { cards: [
              { front: "Đỉnh của y = 2x² − 8x + 1?", back: "(2; −7)", hint: "x = 8/4" },
              { front: "Điều kiện để ax² + bx + c > 0 với mọi x?", back: "a > 0 và Δ < 0", hint: "Parabol nằm hẳn trên Ox" },
              { front: "Hai lỗi hay gặp khi giải bất phương trình bậc hai?", back: "Quên đổi chiều khi nhân số âm; lấy sai đầu mút", hint: "Dấu và ngoặc" },
              { front: "Ngưỡng hoà vốn của quầy nước chanh?", back: "x = 1 và x = 5 chục cốc", hint: "P(x) = 0" },
            ] },
          },
          {
            type: "deep_dive",
            title: "Đào sâu thêm",
            data: { suggestions: [
              { topic: "Phương trình quy về phương trình bậc hai", rationale: "Bài tiếp theo của chương: phương trình chứa căn đưa về bậc hai, cần thử lại nghiệm." },
              { topic: "Giá trị lớn nhất, nhỏ nhất trên một đoạn", rationale: "Khi x bị giới hạn (ví dụ quầy chỉ bán tối đa 2 chục cốc), giá trị lớn nhất có thể không nằm ở đỉnh." },
            ] },
          },
        ],
      },
    ],
  },
  {
    kbKey: "hoa10",
    owner: "long",
    title: "Phản ứng oxi hoá – khử",
    description: "Giáo trình về số oxi hoá, chất khử – chất oxi hoá và phương pháp thăng bằng electron, có phần nâng cao cho học sinh khá giỏi.",
    scope: "Hoá học 10 (Kết nối tri thức), chương Phản ứng oxi hoá – khử.",
    level: "intermediate",
    pages: [
      {
        title: "Số oxi hoá",
        summary: "Khái niệm số oxi hoá, các quy tắc xác định và cách tính trong phân tử, ion.",
        objectives: ["Nêu được khái niệm số oxi hoá", "Vận dụng bốn quy tắc để xác định số oxi hoá trong phân tử và ion"],
        contentType: "theory",
        blocks: [
          {
            type: "section",
            markdown: r`## "Kế toán electron"

Trong phản ứng hoá học, electron có thể chuyển từ nguyên tử này sang nguyên tử khác. Để theo dõi dòng chảy ấy, các nhà hoá học dùng một con số quy ước gọi là **số oxi hoá**: đó là điện tích của nguyên tử trong phân tử nếu ta **giả định mọi liên kết đều là liên kết ion**. Số oxi hoá không nhất thiết là điện tích thật, nhưng nó là công cụ "kế toán" rất tiện: số oxi hoá tăng nghĩa là nguyên tử đã nhường electron, giảm nghĩa là đã nhận electron.

## Bốn quy tắc

1. **Đơn chất:** số oxi hoá bằng $0$. Ví dụ $\text{Cu}$, $\text{O}_2$, $\text{Cl}_2$.
2. **Hợp chất:** H thường là $+1$ (trừ hydride kim loại như NaH, H là $-1$); O thường là $-2$ (trừ peroxide như $\text{H}_2\text{O}_2$, O là $-1$).
3. **Kim loại:** kim loại kiềm luôn $+1$, kim loại kiềm thổ luôn $+2$, Al là $+3$.
4. **Tổng:** trong phân tử, tổng số oxi hoá bằng $0$; trong ion, tổng bằng điện tích của ion.

## Ví dụ tính

**S trong $\text{H}_2\text{SO}_4$:** gọi số oxi hoá của S là $x$, ta có $2(+1) + x + 4(-2) = 0$, nên $x = +6$.

**Mn trong $\text{KMnO}_4$:** $(+1) + x + 4(-2) = 0$, nên $x = +7$. Đây là số oxi hoá cao nhất của Mn, nên $\text{KMnO}_4$ là chất oxi hoá mạnh.

**N trong $\text{NH}_4^+$:** tổng bằng điện tích $+1$: $x + 4(+1) = +1$, nên $x = -3$.

**Fe trong $\text{Fe}_3\text{O}_4$:** $3x + 4(-2) = 0$, nên $x = +\tfrac{8}{3}$. Số oxi hoá trung bình có thể là phân số; thực chất trong $\text{Fe}_3\text{O}_4$ có một nguyên tử Fe mang $+2$ và hai nguyên tử mang $+3$.

## Cách ghi

Số oxi hoá viết **dấu trước, số sau** và đặt phía trên kí hiệu nguyên tố: $\overset{+6}{\text{S}}$. Điện tích ion viết **số trước, dấu sau** ở góc trên bên phải: $\text{Fe}^{3+}$. Phân biệt hai cách ghi này giúp em tránh nhầm lẫn khi viết quá trình oxi hoá và quá trình khử ở các trang sau.`,
          },
          { type: "callout", title: "key_idea", markdown: "Tổng số oxi hoá trong phân tử bằng 0, trong ion bằng điện tích ion. Chỉ cần nhớ H là +1, O là −2 là tính được hầu hết các nguyên tố còn lại." },
          {
            type: "timeline",
            title: "Từ sự cháy đến sự chuyển electron",
            data: { events: [
              { date: "1777", title: "Lavoisier giải thích sự cháy", description: "Lavoisier chứng minh sự cháy là sự kết hợp với oxygen, đặt nền cho khái niệm \"oxi hoá\"." },
              { date: "1800", title: "Pin Volta", description: "Volta chế tạo nguồn điện đầu tiên từ phản ứng hoá học, sau này được hiểu là phản ứng oxi hoá – khử." },
              { date: "1834", title: "Định luật điện phân Faraday", description: "Faraday liên hệ lượng chất phản ứng với lượng điện đi qua dung dịch." },
              { date: "1897", title: "Phát hiện electron", description: "J. J. Thomson phát hiện electron, mở đường giải thích oxi hoá – khử bằng sự chuyển electron vào đầu thế kỉ XX." },
            ] },
          },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Số oxi hoá của S trong H₂SO₄?", back: "+6", hint: "2(+1) + x + 4(−2) = 0" },
              { front: "Số oxi hoá của Mn trong KMnO₄?", back: "+7", hint: "K là +1" },
              { front: "Số oxi hoá của N trong NH₄⁺?", back: "−3", hint: "Tổng bằng +1" },
              { front: "Số oxi hoá của O trong H₂O₂?", back: "−1", hint: "Peroxide là ngoại lệ" },
              { front: "Số oxi hoá của mọi đơn chất?", back: "0", hint: "Cu, O₂, Cl₂" },
            ] },
          },
        ],
      },
      {
        title: "Chất khử, chất oxi hoá và các quá trình",
        summary: "Nhận diện chất khử, chất oxi hoá, quá trình oxi hoá, quá trình khử trong một phản ứng.",
        objectives: ["Xác định chất khử, chất oxi hoá dựa vào sự thay đổi số oxi hoá", "Viết quá trình oxi hoá và quá trình khử"],
        contentType: "theory",
        blocks: [
          {
            type: "section",
            markdown: r`## Hai vai trong một phản ứng

Phản ứng oxi hoá – khử là phản ứng có **sự chuyển electron** giữa các chất, nhận ra qua sự thay đổi số oxi hoá của một số nguyên tố. Trong mỗi phản ứng luôn có hai vai:

- **Chất khử** là chất **nhường electron**, số oxi hoá **tăng**. Ta nói chất khử **bị oxi hoá**.
- **Chất oxi hoá** là chất **nhận electron**, số oxi hoá **giảm**. Ta nói chất oxi hoá **bị khử**.

Tương ứng có hai quá trình: **quá trình oxi hoá** là quá trình nhường electron, **quá trình khử** là quá trình nhận electron. Hai quá trình luôn diễn ra đồng thời: có chất nhường thì phải có chất nhận, và tổng số electron nhường **bằng** tổng số electron nhận. Đây là nguyên lí làm nền cho cả phương pháp cân bằng lẫn các bài toán bảo toàn electron.

## Câu nhớ

Thầy hay dùng câu "**khử cho, o nhận**": chất khử cho electron, chất oxi hoá nhận electron. Một câu khác: "**tăng bị oxi hoá, giảm bị khử**". Tên gọi dễ gây rối vì chất khử lại "bị oxi hoá", nên em học theo câu nhớ thay vì cố suy luận từ tên.

## Ví dụ phân tích

Xét phản ứng nhúng đinh sắt vào dung dịch đồng sunfat: $\text{Fe} + \text{CuSO}_4 \to \text{FeSO}_4 + \text{Cu}$.

- Fe: $0 \to +2$, số oxi hoá tăng, Fe là **chất khử**. Quá trình oxi hoá: $\text{Fe}^0 \to \text{Fe}^{+2} + 2e$.
- Cu: $+2 \to 0$, số oxi hoá giảm, $\text{CuSO}_4$ là **chất oxi hoá**. Quá trình khử: $\text{Cu}^{+2} + 2e \to \text{Cu}^0$.

Em có thể quan sát thật: sau vài phút, đinh sắt phủ một lớp đồng màu đỏ, dung dịch nhạt dần màu xanh.

## Một chất có thể đóng hai vai

Trong phản ứng $\text{MnO}_2 + 4\text{HCl} \to \text{MnCl}_2 + \text{Cl}_2 + 2\text{H}_2\text{O}$, chỉ một nửa số ion $\text{Cl}^-$ bị oxi hoá thành $\text{Cl}_2$; nửa còn lại đi vào muối, đóng vai **môi trường**. Nhận ra vai môi trường là chìa khoá để cân bằng đúng các phản ứng có axit.`,
          },
          { type: "figure", title: "Sơ đồ vai trò trong phản ứng", markdown: "Chất khử nhường electron cho chất oxi hoá; số oxi hoá thay đổi theo hai chiều ngược nhau.", data: { mermaid: "graph LR\nK[Chất khử] -->|nhường electron| O[Chất oxi hoá]\nK --> K2[Số oxi hoá tăng: bị oxi hoá]\nO --> O2[Số oxi hoá giảm: bị khử]" } },
          { type: "callout", title: "insight", markdown: "Số electron chất khử nhường luôn bằng số electron chất oxi hoá nhận. Mọi phương pháp cân bằng và mọi bài toán bảo toàn electron đều dựa trên một đẳng thức này." },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Chất khử là chất thế nào?", back: "Nhường electron, số oxi hoá tăng, bị oxi hoá", hint: "Khử cho" },
              { front: "Chất oxi hoá là chất thế nào?", back: "Nhận electron, số oxi hoá giảm, bị khử", hint: "O nhận" },
              { front: "Trong Fe + CuSO₄, chất nào là chất khử?", back: "Fe (0 → +2)", hint: "Số oxi hoá tăng" },
              { front: "HCl trong phản ứng với MnO₂ đóng vai gì?", back: "Vừa là chất khử, vừa là môi trường", hint: "Một nửa Cl⁻ vào muối" },
            ] },
          },
        ],
      },
      {
        title: "Cân bằng bằng phương pháp thăng bằng electron",
        summary: "Bốn bước cân bằng, ví dụ Cu + HNO₃ và dạng nâng cao FeS₂, Fe₃O₄.",
        objectives: ["Cân bằng phản ứng oxi hoá – khử theo bốn bước", "Xử lí phản ứng có chất môi trường và có nhiều nguyên tố đổi số oxi hoá"],
        contentType: "practice",
        blocks: [
          {
            type: "section",
            markdown: r`## Bốn bước

**Bước 1.** Xác định số oxi hoá của các nguyên tố có thay đổi, tìm chất khử và chất oxi hoá.
**Bước 2.** Viết quá trình oxi hoá và quá trình khử.
**Bước 3.** Nhân hệ số để số electron nhường bằng số electron nhận (dùng bội chung nhỏ nhất).
**Bước 4.** Đặt hệ số vào phương trình, cân bằng các nguyên tố còn lại theo thứ tự: kim loại, gốc axit, H, cuối cùng **kiểm O** [1].

## Ví dụ: đồng tác dụng với nitric acid loãng

$\text{Cu} + \text{HNO}_3 \to \text{Cu(NO}_3)_2 + \text{NO} + \text{H}_2\text{O}$

- Cu: $0 \to +2$; N: $+5 \to +2$.
- $\text{Cu}^0 \to \text{Cu}^{+2} + 2e$, nhân 3. $\text{N}^{+5} + 3e \to \text{N}^{+2}$, nhân 2.
- Đặt 3 trước Cu và $\text{Cu(NO}_3)_2$, 2 trước NO. Tổng N bên phải: $3 \cdot 2 + 2 = 8$, nên cần $8\,\text{HNO}_3$, suy ra $4\,\text{H}_2\text{O}$.

$$3\text{Cu} + 8\text{HNO}_3 \to 3\text{Cu(NO}_3)_2 + 2\text{NO} + 4\text{H}_2\text{O}$$

Kiểm O: trái $24$, phải $18 + 2 + 4 = 24$. Chỉ 2 trong 8 phân tử $\text{HNO}_3$ bị khử; 6 phân tử còn lại làm **môi trường**, đi vào muối.

## Nâng cao: nhiều nguyên tố cùng đổi số oxi hoá

Với $\text{FeS}_2 + \text{O}_2 \to \text{Fe}_2\text{O}_3 + \text{SO}_2$, cả Fe ($+2 \to +3$) và S ($-1 \to +4$) đều nhường electron. Ta gộp cả phân tử: một $\text{FeS}_2$ nhường $1 + 2 \cdot 5 = 11e$, còn $\text{O}_2$ nhận $4e$. Bội chung nhỏ nhất là 44:
$$4\text{FeS}_2 + 11\text{O}_2 \to 2\text{Fe}_2\text{O}_3 + 8\text{SO}_2.$$

Với $\text{Fe}_3\text{O}_4$ (số oxi hoá trung bình $+\tfrac{8}{3}$), tính theo cả phân tử: mỗi $\text{Fe}_3\text{O}_4$ nhường đúng $1e$ khi lên $\text{Fe}^{+3}$. Phản ứng với $\text{HNO}_3$ tạo NO:
$$3\text{Fe}_3\text{O}_4 + 28\text{HNO}_3 \to 9\text{Fe(NO}_3)_3 + \text{NO} + 14\text{H}_2\text{O}.$$

Dù số oxi hoá trung bình là phân số, tổng electron của cả phân tử luôn là số nguyên, nên em không cần sợ các con số lẻ.`,
            citations: [cite(1, DOC_HOA_OXH, 3, "cân bằng các nguyên tố còn lại theo thứ tự: kim loại, gốc axit, H, cuối cùng kiểm O")],
          },
          { type: "callout", title: "common_pitfall", markdown: r`Chỉ đặt hệ số $2$ trước $\text{HNO}_3$ theo số N bị khử là sai: phải cộng cả phần N nằm trong muối (vai môi trường). Luôn cân bằng N **sau khi** đã đặt hệ số cho muối.` },
          { type: "figure", title: "Bốn bước thăng bằng electron", markdown: "Làm đúng thứ tự, kiểm oxi ở bước cuối để chắc phương trình đã cân bằng.", data: { mermaid: "graph TD\nA[1. Xác định số oxi hoá thay đổi] --> B[2. Viết quá trình oxi hoá và quá trình khử]\nB --> C[3. Cân bằng số electron nhường và nhận]\nC --> D[4. Đặt hệ số, cân bằng nguyên tố còn lại, kiểm O]" } },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Hệ số của Cu + HNO₃ loãng → Cu(NO₃)₂ + NO + H₂O?", back: "3, 8, 3, 2, 4", hint: "Cu nhường 2e, N nhận 3e" },
              { front: "Một FeS₂ nhường bao nhiêu electron khi tạo Fe₂O₃ và SO₂?", back: "11e", hint: "1 + 2·5" },
              { front: "Hệ số của FeS₂ + O₂ → Fe₂O₃ + SO₂?", back: "4, 11, 2, 8", hint: "BCNN của 11 và 4" },
              { front: "Bước cuối khi cân bằng là gì?", back: "Kiểm số nguyên tử O hai vế", hint: "Phép thử cuối cùng" },
            ] },
          },
          {
            type: "deep_dive",
            title: "Đào sâu thêm",
            data: { suggestions: [
              { topic: "Phản ứng tự oxi hoá – khử", rationale: "Một nguyên tố vừa tăng vừa giảm số oxi hoá, như Cl₂ với NaOH nóng, là dạng bài nâng cao thú vị." },
              { topic: "Bảo toàn electron trong bài toán tính", rationale: "Giải nhanh bài kim loại tác dụng HNO₃ mà không cần viết phương trình, rất hợp đề thi tổ hợp có Hoá." },
            ] },
          },
        ],
      },
      {
        title: "Oxi hoá – khử quanh ta: pin, ăn mòn, quang hợp",
        summary: "Vai trò của phản ứng oxi hoá – khử trong pin, sự gỉ sắt và quá trình quang hợp.",
        objectives: ["Nhận ra phản ứng oxi hoá – khử trong đời sống và sản xuất", "Giải thích cách chống gỉ cho kim loại"],
        contentType: "mixed",
        blocks: [],
      },
    ],
  },
  {
    kbKey: "ctdl",
    owner: "khai",
    title: "Cấu trúc dữ liệu cơ bản",
    description: "Giáo trình nhập môn cấu trúc dữ liệu cho sinh viên năm hai: độ phức tạp, mảng, danh sách liên kết, ngăn xếp, hàng đợi và cây nhị phân tìm kiếm, minh hoạ bằng Python.",
    scope: "Học phần Cấu trúc dữ liệu và giải thuật, lớp KTPM K23, tuần 1–8.",
    level: "beginner",
    pages: [
      {
        title: "Độ phức tạp và mảng động",
        summary: "Kí hiệu O lớn, cách ước lượng chi phí thao tác và đặc điểm của list trong Python.",
        objectives: ["Ước lượng độ phức tạp thời gian bằng kí hiệu O lớn", "Nêu chi phí các thao tác cơ bản trên list Python", "Chọn đúng cấu trúc cho thao tác thêm/xoá ở đầu"],
        contentType: "theory",
        blocks: [
          {
            type: "section",
            markdown: md`## Vì sao phải đo độ phức tạp?

Hai chương trình cùng cho kết quả đúng có thể chênh nhau hàng nghìn lần về thời gian chạy khi dữ liệu lớn. Thay vì bấm đồng hồ trên một máy cụ thể, ta **đếm số phép toán cơ bản** theo kích thước đầu vào $n$ và chỉ quan tâm tốc độ tăng khi $n$ lớn. Kí hiệu **O lớn** diễn tả tốc độ tăng đó, bỏ qua hằng số và số hạng bậc thấp: $3n^2 + 5n + 7$ là $O(n^2)$.

Các bậc thường gặp, từ nhanh đến chậm: $O(1)$ (truy cập một phần tử), $O(\log n)$ (tìm kiếm nhị phân), $O(n)$ (duyệt một lượt), $O(n \log n)$ (sắp xếp trộn), $O(n^2)$ (hai vòng lặp lồng nhau). Với $n = 10^6$, thuật toán $O(n^2)$ cần cỡ $10^{12}$ phép toán, chạy hàng giờ; thuật toán $O(n \log n)$ chỉ cần cỡ $2 \cdot 10^7$, chạy dưới một giây [1].

## Mảng và list trong Python

Mảng lưu các phần tử **liên tiếp** trong bộ nhớ, nên địa chỉ phần tử thứ $i$ tính được ngay: truy cập $a[i]$ mất $O(1)$. List của Python là **mảng động**: khi đầy, nó xin vùng nhớ lớn hơn và sao chép sang. Vì thao tác sao chép hiếm khi xảy ra, chi phí trung bình (khấu hao) của \`append\` vẫn là $O(1)$.

Điểm yếu của mảng là thêm hoặc xoá ở **đầu** hay **giữa**: mọi phần tử phía sau phải dịch một ô, mất $O(n)$. Vì vậy \`a.insert(0, x)\` và \`a.pop(0)\` chậm khi list dài. Đây là lỗi kinh điển của sinh viên khi cài đặt hàng đợi bằng list: chương trình chạy tốt với dữ liệu thử nhỏ nhưng "treo" khi chấm với dữ liệu lớn.

## Chọn cấu trúc theo thao tác

Nguyên tắc chung của cả học phần: **liệt kê các thao tác chương trình cần làm nhiều nhất**, rồi chọn cấu trúc làm các thao tác đó rẻ nhất. Cần truy cập ngẫu nhiên theo chỉ số thì chọn mảng; cần thêm/xoá ở hai đầu thì chọn \`collections.deque\`; cần tìm kiếm theo khoá thì chọn bảng băm (\`dict\`) hoặc cây tìm kiếm. Đoạn mã bên dưới cho thấy chênh lệch thật khi xoá ở đầu.`,
            citations: [cite(1, DOC_CTDL_1, 1, "thuật toán O(n²) cần cỡ 10¹² phép toán, chạy hàng giờ")],
          },
          { type: "callout", title: "key_idea", markdown: "Độ phức tạp đo tốc độ tăng của chi phí theo n, không phải số giây. Bỏ hằng số, giữ số hạng bậc cao nhất." },
          {
            type: "code",
            title: "So sánh list.pop(0) và deque.popleft()",
            markdown: "Cùng xoá hết 100 000 phần tử ở đầu: list mất O(n) mỗi lần nên tổng O(n²), deque chỉ O(1) mỗi lần. Chạy thử trên máy, bản list chậm hơn rất nhiều lần.",
            data: { language: "python", code: `from collections import deque
import time

n = 100_000

a = list(range(n))
t = time.perf_counter()
while a:
    a.pop(0)          # dịch mọi phần tử phía sau: O(n)
print("list.pop(0):", round(time.perf_counter() - t, 3), "giây")

d = deque(range(n))
t = time.perf_counter()
while d:
    d.popleft()       # O(1)
print("deque.popleft():", round(time.perf_counter() - t, 3), "giây")` },
          },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "3n² + 5n + 7 thuộc bậc nào?", back: "O(n²)", hint: "Giữ số hạng bậc cao nhất" },
              { front: "Chi phí truy cập a[i] của list?", back: "O(1)", hint: "Bộ nhớ liên tiếp" },
              { front: "Chi phí khấu hao của list.append?", back: "O(1)", hint: "Mảng động" },
              { front: "Chi phí của list.pop(0)?", back: "O(n)", hint: "Phải dịch phần tử" },
              { front: "Hàng đợi trong Python nên dùng gì?", back: "collections.deque", hint: "popleft O(1)" },
            ] },
          },
        ],
      },
      {
        title: "Danh sách liên kết đơn",
        summary: "Cấu trúc nút – con trỏ, thao tác chèn đầu O(1) và bài kinh điển đảo ngược danh sách.",
        objectives: ["Mô tả cấu trúc danh sách liên kết đơn", "Cài đặt thêm vào đầu và đảo ngược danh sách", "So sánh danh sách liên kết với mảng"],
        contentType: "mixed",
        blocks: [
          {
            type: "section",
            markdown: md`## Nút và con trỏ

Danh sách liên kết đơn gồm các **nút**; mỗi nút chứa dữ liệu và một con trỏ \`next\` tới nút kế tiếp. Nút cuối có \`next = None\`. Chương trình chỉ cần giữ con trỏ \`head\` trỏ tới nút đầu tiên; từ đó lần theo các \`next\` là đi hết danh sách.

Khác với mảng, các nút **không nằm liên tiếp** trong bộ nhớ. Điều này mang lại một ưu điểm lớn: muốn chèn một nút vào đầu danh sách, ta chỉ tạo nút mới, cho \`next\` của nó trỏ vào \`head\` cũ rồi cập nhật \`head\`, mất $O(1)$, không phải dịch phần tử nào. Đổi lại, muốn tới phần tử thứ $i$ ta phải đi từ \`head\` qua $i$ bước, mất $O(n)$; mỗi nút còn tốn thêm bộ nhớ cho con trỏ.

## So sánh nhanh với mảng

| Thao tác | Mảng (list) | Danh sách liên kết |
|---|---|---|
| Truy cập phần tử thứ $i$ | $O(1)$ | $O(n)$ |
| Chèn/xoá ở đầu | $O(n)$ | $O(1)$ |
| Chèn/xoá sau một nút đã biết | $O(n)$ | $O(1)$ |
| Bộ nhớ phụ | ít | thêm một con trỏ mỗi nút |

## Bài kinh điển: đảo ngược danh sách

Ý tưởng: đi một lượt từ đầu tới cuối, **đổi chiều từng mũi tên**. Ta dùng ba con trỏ: \`prev\` (phần đã đảo), \`cur\` (nút đang xét), \`nxt\` (phần chưa xét). Ở mỗi bước: lưu \`nxt = cur.next\`, đổi chiều \`cur.next = prev\`, rồi dịch \`prev = cur\`, \`cur = nxt\`. Khi \`cur\` là \`None\`, \`prev\` chính là đầu mới [1]. Thuật toán chạy $O(n)$ thời gian và chỉ $O(1)$ bộ nhớ phụ.

Thứ tự ba lệnh trong vòng lặp là mấu chốt. Nếu đổi chiều \`cur.next\` **trước khi** lưu \`nxt\`, ta đánh mất đường đi tới phần còn lại của danh sách, và mọi nút phía sau trở thành "rác" không truy cập được. Em nên chạy tay với danh sách ba nút \`1 → 2 → 3\` trên giấy, vẽ mũi tên sau từng lệnh, trước khi nộp bài lên hệ thống chấm.`,
            citations: [cite(1, DOC_CTDL_1, 3, "Khi cur là None thì prev chính là head mới.")],
          },
          {
            type: "code",
            title: "Cài đặt danh sách liên kết đơn",
            markdown: "Thêm vào đầu trong O(1) và đảo ngược trong O(n), bộ nhớ phụ O(1).",
            data: { language: "python", code: `class Node:
    def __init__(self, data, next=None):
        self.data = data
        self.next = next


def push_front(head, x):
    return Node(x, head)          # nút mới trỏ vào head cũ


def reverse(head):
    prev, cur = None, head
    while cur is not None:
        nxt = cur.next            # 1. lưu phần còn lại
        cur.next = prev           # 2. đổi chiều mũi tên
        prev, cur = cur, nxt      # 3. tiến lên
    return prev                   # head mới


def to_list(head):
    out = []
    while head:
        out.append(head.data)
        head = head.next
    return out


head = None
for x in [3, 2, 1]:
    head = push_front(head, x)
print(to_list(head))            # [1, 2, 3]
print(to_list(reverse(head)))   # [3, 2, 1]` },
          },
          { type: "figure", title: "Danh sách 1 → 2 → 3", markdown: "Mỗi nút trỏ tới nút kế tiếp; nút cuối trỏ tới None.", data: { mermaid: "graph LR\nH[head] --> N1[1] --> N2[2] --> N3[3] --> X[None]" } },
          { type: "callout", title: "common_pitfall", markdown: "Quên lưu `cur.next` trước khi đổi chiều sẽ làm mất phần còn lại của danh sách; quên trả về `prev` thì head vẫn trỏ vào nút cũ (nay là nút cuối)." },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Chèn vào đầu danh sách liên kết mất bao lâu?", back: "O(1)", hint: "Chỉ đổi head" },
              { front: "Truy cập phần tử thứ i của danh sách liên kết?", back: "O(n)", hint: "Phải đi từ head" },
              { front: "Ba con trỏ dùng để đảo ngược danh sách?", back: "prev, cur, nxt", hint: "Đã đảo, đang xét, chưa xét" },
              { front: "Sau khi đảo xong, head mới là gì?", back: "prev", hint: "cur đã là None" },
            ] },
          },
        ],
      },
      {
        title: "Ngăn xếp và hàng đợi",
        summary: "Nguyên tắc LIFO, FIFO, các ứng dụng tiêu biểu và duyệt đồ thị theo chiều rộng.",
        objectives: ["Phân biệt ngăn xếp (LIFO) và hàng đợi (FIFO)", "Cài đặt BFS tìm khoảng cách ngắn nhất bằng deque", "Chọn cấu trúc phù hợp cho bài toán"],
        contentType: "mixed",
        blocks: [
          {
            type: "section",
            markdown: md`## Ngăn xếp: vào sau ra trước

**Ngăn xếp** (stack) giống chồng đĩa: đĩa đặt lên sau cùng được lấy ra trước tiên (LIFO). Hai thao tác chính là \`push\` (đẩy vào đỉnh) và \`pop\` (lấy ra từ đỉnh), kèm \`peek\` để xem đỉnh. Trong Python, list với \`append\` và \`pop()\` cho cả hai thao tác $O(1)$.

Ngăn xếp xuất hiện ở khắp nơi: nút **Hoàn tác** (undo) trong trình soạn thảo, lời gọi hàm đệ quy (call stack), tính giá trị biểu thức hậu tố, và bài kiểm tra dấu ngoặc hợp lệ [1]. Với bài dấu ngoặc, gặp ngoặc mở thì \`push\`; gặp ngoặc đóng thì ngăn xếp phải khác rỗng và đỉnh phải là ngoặc mở cùng loại; hết chuỗi thì ngăn xếp phải rỗng.

## Hàng đợi: vào trước ra trước

**Hàng đợi** (queue) giống hàng người chờ mua vé: ai đến trước được phục vụ trước (FIFO). Thêm vào cuối gọi là \`enqueue\`, lấy ra ở đầu gọi là \`dequeue\`. Trong Python, dùng \`collections.deque\` với \`append\` và \`popleft\`, cả hai $O(1)$. Hàng đợi dùng để xếp lịch xử lí yêu cầu trên máy chủ, bộ đệm máy in, và đặc biệt là **duyệt theo chiều rộng** (BFS).

## BFS: đi rộng trước

Trên đồ thị không trọng số, BFS tìm **đường đi ít cạnh nhất** từ một đỉnh nguồn. Ta đưa nguồn vào hàng đợi với khoảng cách $0$; lặp lấy đỉnh ở đầu hàng, đưa mọi đỉnh kề **chưa thăm** vào cuối hàng với khoảng cách tăng thêm $1$. Vì hàng đợi xử lí các đỉnh theo đúng thứ tự khoảng cách tăng dần, lần đầu tiên chạm tới một đỉnh cũng là lúc biết khoảng cách ngắn nhất tới nó. Mỗi đỉnh và mỗi cạnh được xét một lần, nên độ phức tạp là $O(V + E)$.

Điều thú vị: nếu thay hàng đợi bằng ngăn xếp trong cùng khung thuật toán, ta được **duyệt theo chiều sâu** (DFS) với hành vi khác hẳn. Chỉ một quyết định chọn cấu trúc dữ liệu đã thay đổi toàn bộ cách thuật toán khám phá đồ thị.`,
            citations: [cite(1, DOC_CTDL_2, 1, "Ứng dụng: kiểm tra dấu ngoặc hợp lệ, tính giá trị biểu thức hậu tố, quay lui (undo)")],
          },
          {
            type: "code",
            title: "BFS tìm khoảng cách ngắn nhất",
            markdown: "Khoảng cách (số cạnh) từ A tới mọi đỉnh; mỗi đỉnh vào hàng đợi đúng một lần.",
            data: { language: "python", code: `from collections import deque


def bfs(graph, start):
    dist = {start: 0}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in dist:       # chưa thăm
                dist[v] = dist[u] + 1
                q.append(v)
    return dist


g = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": ["F"], "E": ["F"], "F": []}
print(bfs(g, "A"))
# {'A': 0, 'B': 1, 'C': 1, 'D': 2, 'E': 2, 'F': 3}` },
          },
          { type: "callout", title: "connection", markdown: "Ngăn xếp cho DFS, hàng đợi cho BFS: cùng một khung thuật toán, chỉ đổi cấu trúc dữ liệu là đổi cả thứ tự khám phá." },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Ngăn xếp theo nguyên tắc nào?", back: "LIFO: vào sau ra trước", hint: "Chồng đĩa" },
              { front: "Hàng đợi theo nguyên tắc nào?", back: "FIFO: vào trước ra trước", hint: "Xếp hàng mua vé" },
              { front: "Độ phức tạp của BFS?", back: "O(V + E)", hint: "Mỗi đỉnh, mỗi cạnh một lần" },
              { front: "Chuỗi \"((\" có hợp lệ không?", back: "Không, ngăn xếp còn phần tử khi hết chuỗi", hint: "Kiểm tra rỗng ở cuối" },
              { front: "Cấu trúc nào dùng cho DFS?", back: "Ngăn xếp (hoặc đệ quy)", hint: "Đi sâu trước" },
            ] },
          },
        ],
      },
      {
        title: "Cây nhị phân tìm kiếm",
        summary: "Tính chất BST, tìm kiếm và chèn theo chiều cao cây, duyệt trung thứ tự cho dãy tăng dần.",
        objectives: ["Phát biểu tính chất của cây nhị phân tìm kiếm", "Cài đặt chèn và duyệt trung thứ tự", "Giải thích vì sao cây suy biến làm chậm thao tác"],
        contentType: "mixed",
        blocks: [
          {
            type: "section",
            markdown: md`## Tính chất

**Cây nhị phân** là cây mà mỗi nút có tối đa hai con, gọi là con trái và con phải. **Cây nhị phân tìm kiếm** (BST) thêm một điều kiện: với mọi nút, mọi khoá ở cây con trái **nhỏ hơn** khoá của nút, mọi khoá ở cây con phải **lớn hơn**. Điều kiện này phải đúng với toàn bộ cây con, không chỉ với hai con trực tiếp.

## Tìm kiếm và chèn

Muốn tìm khoá $k$, ta bắt đầu từ gốc: $k$ nhỏ hơn khoá của nút thì sang trái, lớn hơn thì sang phải, bằng thì đã tìm thấy; gặp \`None\` nghĩa là không có. Chèn cũng đi đúng đường đó cho tới chỗ trống rồi gắn nút mới. Mỗi bước đi xuống một tầng, nên chi phí là $O(h)$ với $h$ là **chiều cao** cây.

Chiều cao quyết định tất cả. Cây **cân bằng** có $h \approx \log_2 n$: với một triệu khoá chỉ cần khoảng 20 bước. Nhưng nếu chèn một dãy **đã sắp xếp** như 10, 20, 30, 40…, mỗi nút mới đều thành con phải của nút trước, cây suy biến thành một danh sách liên kết và $h = n$ [1]. Khi đó tìm kiếm chậm như duyệt tuần tự. Các cây tự cân bằng như AVL hay cây đỏ – đen ra đời để luôn giữ $h = O(\log n)$; các em sẽ học ở học phần sau.

## Duyệt trung thứ tự

Duyệt **trái – gốc – phải** (in-order) trên BST cho dãy khoá **tăng dần**. Đây vừa là cách in dữ liệu đã sắp xếp, vừa là phép kiểm nhanh: nếu kết quả duyệt không tăng dần thì cây không phải BST.

Ví dụ: chèn lần lượt 50, 30, 70, 20, 40, 60, 80 ta được cây cân bằng chiều cao 3 như hình bên dưới; duyệt trung thứ tự cho 20, 30, 40, 50, 60, 70, 80. Nếu đổi thứ tự chèn thành 20, 30, 40, 50, 60, 70, 80 thì vẫn cùng tập khoá nhưng cây cao tới 7 tầng. Bài học rút ra: **thứ tự dữ liệu đầu vào** ảnh hưởng trực tiếp tới hiệu năng, và khi không kiểm soát được thứ tự đó, ta cần cấu trúc tự cân bằng.`,
            citations: [cite(1, DOC_CTDL_2, 3, "chèn dãy đã sắp xếp sẽ tạo cây suy biến thành danh sách, h = n")],
          },
          {
            type: "code",
            title: "Chèn và duyệt trung thứ tự",
            markdown: "Chèn đệ quy theo tính chất BST; duyệt trái – gốc – phải cho dãy tăng dần.",
            data: { language: "python", code: `class TreeNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


def insert(root, key):
    if root is None:
        return TreeNode(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root                      # khoá trùng: bỏ qua


def inorder(root, out):
    if root:
        inorder(root.left, out)
        out.append(root.key)
        inorder(root.right, out)
    return out


root = None
for k in [50, 30, 70, 20, 40, 60, 80]:
    root = insert(root, k)
print(inorder(root, []))   # [20, 30, 40, 50, 60, 70, 80]` },
          },
          { type: "figure", title: "BST sau khi chèn 50, 30, 70, 20, 40, 60, 80", markdown: "Cây cân bằng chiều cao 3: mọi khoá bên trái nhỏ hơn, bên phải lớn hơn khoá của nút.", data: { mermaid: "graph TD\nA[50] --> B[30]\nA --> C[70]\nB --> D[20]\nB --> E[40]\nC --> F[60]\nC --> G[80]" } },
          {
            type: "flash_cards",
            title: "Thẻ ghi nhớ",
            data: { cards: [
              { front: "Tính chất của BST?", back: "Mọi khoá cây con trái nhỏ hơn, cây con phải lớn hơn khoá của nút", hint: "Đúng với toàn bộ cây con" },
              { front: "Chi phí tìm kiếm trên BST?", back: "O(h), h là chiều cao cây", hint: "Mỗi bước xuống một tầng" },
              { front: "Duyệt trung thứ tự BST cho kết quả gì?", back: "Dãy khoá tăng dần", hint: "Trái – gốc – phải" },
              { front: "Chèn dãy đã sắp xếp vào BST thì sao?", back: "Cây suy biến, h = n, thao tác chậm O(n)", hint: "Giống danh sách liên kết" },
            ] },
          },
          {
            type: "deep_dive",
            title: "Đào sâu thêm",
            data: { suggestions: [
              { topic: "Cây AVL và phép xoay", rationale: "Giữ chiều cao O(log n) bằng các phép xoay sau mỗi lần chèn/xoá, nội dung của học phần tiếp theo." },
              { topic: "Xoá nút trên BST", rationale: "Trường hợp nút có hai con cần thay bằng nút kế tiếp trung thứ tự, là bài tập hay rèn tư duy con trỏ." },
              { topic: "Bảng băm so với BST", rationale: "dict của Python tìm kiếm trung bình O(1) nhưng không giữ thứ tự; BST giữ được thứ tự khoá." },
            ] },
          },
        ],
      },
    ],
  },
];
