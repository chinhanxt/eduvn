"""Mẫu Manim thế hệ "studio" (Đợt Thẩm mỹ): đồ thị hàm số, vòng tròn lượng giác.
Mỗi mẫu là một cảnh kể chuyện có beat chia theo thời lượng; bố cục lưới 12 cột: hình bên trái, bảng giải thích bên phải, kết bằng công thức/ý chính.
Tham số giống hệt bản cũ (đã kiểm zod phía máy chủ); không nhận mã từ ngoài."""
from manim import *  # noqa: F401,F403
from common import SPEC, ev  # noqa: F401  (common đọc spec + bộ tính biểu thức an toàn)
from common import P as PARAMS
from studio import (COMBOS, ENTER, MOVE, GRID, SPLIT, TH, L, P, X, Y, StudioScene, balance_lines, card, math_tex, num, put_baseline, schedule, tex_num, text, vn)
import math
import numpy as np


# --------------------------------------------------------------- biểu thức → LaTeX
_PREC = {"add": 1, "sub": 1, "mul": 2, "div": 2, "neg": 3, "pow": 4}


def to_tex(n, parent=0, right=False):
    k = n[0]
    if k == "num":
        return tex_num(float(n[1]), 4)
    if k == "x":
        return "x"
    if k == "a":
        return "a"
    if k == "const":
        return "\\pi" if n[1] == "pi" else "e"
    if k == "fn":
        name = n[1]
        inner = to_tex(n[2])
        if name == "sqrt":
            return f"\\sqrt{{{inner}}}"
        if name == "abs":
            return f"\\left|{inner}\\right|"
        if name == "exp":
            return f"e^{{{inner}}}"
        return f"\\{name}\\left({inner}\\right)" if name in ("sin", "cos", "tan", "ln", "log") else f"{name}({inner})"
    if k == "neg":
        s = "-" + to_tex(n[1], 3)
        return f"\\left({s}\\right)" if parent > 1 else s
    p = _PREC[k]
    a, b = n[1], n[2]
    if k == "div":
        return f"\\dfrac{{{to_tex(a)}}}{{{to_tex(b)}}}"
    if k == "pow":
        base = to_tex(a, 5)
        return f"{base}^{{{to_tex(b)}}}"
    la = to_tex(a, p)
    lb = to_tex(b, p, True)
    if k == "add":
        s = f"{la} - {lb[1:]}" if lb.startswith("-") else f"{la} + {lb}"
    elif k == "sub":
        if b[0] in ("add", "sub"):
            lb = f"\\left({to_tex(b)}\\right)"
        s = f"{la} - {lb}"
    else:  # mul: số × biến viết liền (2x, 3x^2), còn lại dùng dấu chấm
        implicit = a[0] in ("num", "const") and b[0] in ("x", "a", "pow", "fn", "const")
        s = f"{la}{lb}" if implicit else f"{la} \\cdot {lb}"
    return f"\\left({s}\\right)" if p < parent else s


def fmt_pt(x, y):
    return f"({vn(x)}; {vn(y)})"


# --------------------------------------------------------------- Đồ thị hàm số
def card_title(s, x, y):
    t = text(s, 40, TH["ink"], weight="SEMIBOLD")
    return put_baseline(t, s, x, y)


class DoThiHamSo(StudioScene):
    def construct(self):
        p = PARAMS
        cCurve, cAlt, cPar, cPt = COMBOS["coDien"]  # đường cong = lam, điểm = đỏ son, tham số = tím
        self.head("Đồ thị hàm số", "Mặt phẳng toạ độ")
        xmin, xmax = float(p.get("xMin", -5)), float(p.get("xMax", 5))
        ymin, ymax = float(p.get("yMin", -5)), float(p.get("yMax", 5))
        ast = p["bieuThuc"]
        ts = p.get("thamSo")
        pts = list(p.get("diemDacBiet", []))
        # hình: cột 7–12
        fx, fw = SPLIT["figX"], SPLIT["figW"]
        top, bot = GRID["stageTop"] + 40, GRID["stageBottom"] - 50
        left, right = fx + 56, fx + fw - 30
        sx = (right - left) / (xmax - xmin)
        sy = (bot - top) / (ymax - ymin)
        px = lambda x: left + (x - xmin) * sx  # noqa: E731
        py = lambda y: bot - (y - ymin) * sy  # noqa: E731
        pt = lambda x, y: P(px(x), py(y))  # noqa: E731
        step_x = max(1, math.ceil(80 / sx))
        step_y = max(1, math.ceil(62 / sy))
        grid = VGroup()
        for gx in range(math.ceil(xmin), math.floor(xmax) + 1):
            if gx != 0:
                grid.add(Line(pt(gx, ymin), pt(gx, ymax), stroke_color=TH["grid"], stroke_width=1.6))
        for gy in range(math.ceil(ymin), math.floor(ymax) + 1):
            if gy != 0:
                grid.add(Line(pt(xmin, gy), pt(xmax, gy), stroke_color=TH["grid"], stroke_width=1.6))
        ax = VGroup(
            Arrow(pt(xmin, 0), pt(xmax, 0) + RIGHT * L(24), buff=0, stroke_width=3, stroke_color=TH["ink2"], tip_length=L(18), max_tip_length_to_length_ratio=1),
            Arrow(pt(0, ymin), pt(0, ymax) + UP * L(24), buff=0, stroke_width=3, stroke_color=TH["ink2"], tip_length=L(18), max_tip_length_to_length_ratio=1),
        )
        # điểm đặc biệt (để ẩn số trên trục trùng chỗ với chấm/nhãn của điểm)
        a0 = float(ts["den"]) if ts else 0.0
        special = []
        for q in pts:
            yq = ev(ast, float(q["x"]), a0)
            if yq == yq and ymin <= yq <= ymax:
                special.append(pt(float(q["x"]), yq))

        curve_px = []
        for i in range(601):
            xq = xmin + (xmax - xmin) * i / 600
            yq = ev(ast, xq, a0)
            if yq == yq and ymin <= yq <= ymax:
                curve_px.append(pt(xq, yq))

        def clear_of(mob):
            # số trên trục bị ẩn nếu trùng chỗ điểm đặc biệt hoặc bị đường cong cắt qua
            if any(np.linalg.norm(mob.get_center()[:2] - sp[:2]) < L(70) for sp in special):
                return False
            x1, x2 = mob.get_left()[0] - L(6), mob.get_right()[0] + L(6)
            y1, y2 = mob.get_bottom()[1] - L(6), mob.get_top()[1] + L(6)
            return not any(x1 <= v[0] <= x2 and y1 <= v[1] <= y2 for v in curve_px)

        labels = VGroup()
        for gx in range(math.ceil(xmin), math.floor(xmax) + 1):
            if gx != 0 and gx % step_x == 0:
                t_ = text(vn(gx), 32, TH["ink3"]).move_to(pt(gx, 0) + DOWN * L(30))
                if clear_of(t_):
                    labels.add(t_)
        for gy in range(math.ceil(ymin), math.floor(ymax) + 1):
            if gy != 0 and gy % step_y == 0:
                t_ = text(vn(gy), 32, TH["ink3"]).next_to(pt(0, gy), LEFT, buff=L(14))
                if clear_of(t_):
                    labels.add(t_)
        labels.add(text("O", 32, TH["ink3"]).move_to(pt(0, 0) + LEFT * L(22) + DOWN * L(28)))
        labels.add(math_tex("x", 40, TH["ink2"]).next_to(pt(xmax, 0) + RIGHT * L(24), DOWN, buff=L(10)))
        labels.add(math_tex("y", 40, TH["ink2"]).next_to(pt(0, ymax) + UP * L(24), RIGHT, buff=L(12)))

        def runs(av):
            out, cur = [], []
            for i in range(481):
                x = xmin + (xmax - xmin) * i / 480
                y = ev(ast, x, av)
                if y == y and ymin - 0.05 <= y <= ymax + 0.05:
                    cur.append(pt(x, max(ymin, min(ymax, y))))
                else:
                    if len(cur) > 1:
                        out.append(cur)
                    cur = []
            if len(cur) > 1:
                out.append(cur)
            g = VGroup()
            for r in out:
                m = VMobject(stroke_color=cCurve, stroke_width=7)
                m.set_points_smoothly(r) if len(r) > 3 else m.set_points_as_corners(r)
                g.add(m)
            return g

        a = ValueTracker(float(ts["tu"]) if ts else 0.0)
        # cột trái: thẻ hàm số, thẻ điểm đặc biệt (trượt vào sau), thẻ ý chính
        lx, lw = SPLIT["leftX"], SPLIT["leftW"]
        y1 = self.head_bottom + 30
        formula = math_tex("y = " + to_tex(ast), 60, cCurve)
        if formula.width > L(lw - 80):
            formula.scale_to_fit_width(L(lw - 80))
        h1 = 70 + formula.height / L(1) + 50
        c1 = card(lx, y1, lw, h1, bar=cCurve)
        t1 = card_title("Hàm số", lx + 34, y1 + 58)
        formula.move_to(P(lx + 34, y1 + 80) + DOWN * formula.height / 2, aligned_edge=LEFT)
        formula.align_to(P(lx + 34, 0), LEFT)
        k1 = VGroup(c1, t1, formula)
        n_pts = len(pts)
        y2 = y1 + h1 + 24
        h2 = 72 + max(1, n_pts) * 58 + 26
        c2 = card(lx, y2, lw, h2, bar=cPt)
        t2 = card_title("Điểm đặc biệt", lx + 34, y2 + 58)
        y3 = y2 + h2 + 24

        nb = [1.0, 1.4] + ([1.4] if ts else []) + [0.9] * n_pts + [1.3]
        B = schedule(self.T, nb)
        k = 0
        b = B[k]; k += 1
        self.goto(b.at(0, 2))
        self.play(Create(grid, lag_ratio=0.02), Create(ax), run_time=b.d(1.4, 2), rate_func=MOVE)
        self.goto(b.at(1, 2))
        self.play(FadeIn(labels, lag_ratio=0.05), run_time=b.d(0.8, 2))
        b = B[k]; k += 1
        self.goto(b.at(0, 2))
        graph = runs(a.get_value())
        main = max(graph.submobjects, key=lambda m: len(m.points)) if graph.submobjects else None
        dot = Dot(radius=L(11), color=cCurve)
        anims = [Create(m, rate_func=MOVE) for m in graph]
        if main is not None:
            dot.move_to(main.get_start())
            anims.append(MoveAlongPath(dot, main, rate_func=MOVE))
        self.play(*anims, FadeIn(k1, shift=RIGHT * L(30), rate_func=ENTER), run_time=b.d(2.4, 2))
        self.goto(b.at(1, 2))
        self.play(FadeOut(dot), run_time=0.4)
        live = None
        if ts:
            b = B[k]; k += 1
            self.remove(*graph)
            live = always_redraw(lambda: runs(a.get_value()))
            self.add(live)
            lab = math_tex("a =", 48, cPar)
            put_baseline(lab, "a", lx + 34, y2 + 60)
            val = num(vn(a.get_value(), 1), 48, cPar).next_to(lab, RIGHT, buff=L(16)).align_to(lab, DOWN)
            val.add_updater(lambda m: m.become(num(vn(a.get_value(), 1), 48, cPar).next_to(lab, RIGHT, buff=L(16)).align_to(lab, DOWN)))
            self.goto(b.at(0, 3))
            self.play(FadeIn(lab), FadeIn(val), run_time=0.5)
            self.play(a.animate.set_value(float(ts["den"])), run_time=b.slot * 0.6, rate_func=MOVE)
            val.clear_updaters()
            live.clear_updaters()
            self.play(FadeOut(lab), FadeOut(val), run_time=0.4)
        av = a.get_value()
        # nhãn số trên trục coi như đã chiếm chỗ → nhãn toạ độ không đè lên
        placed = [(m.get_left()[0], m.get_right()[0], m.get_bottom()[1], m.get_top()[1]) for m in labels]
        prev_row = None
        rows_g = VGroup()
        curve_pts = [(xmin + (xmax - xmin) * i / 240, ev(ast, xmin + (xmax - xmin) * i / 240, av)) for i in range(241)]
        shown_card = False
        for j, q in enumerate(pts):
            b = B[k]; k += 1
            x0 = float(q["x"])
            y0 = ev(ast, x0, av)
            if y0 != y0 or not (ymin <= y0 <= ymax) or not (xmin <= x0 <= xmax):
                continue
            c = pt(x0, y0)
            d = VGroup(Dot(c, radius=L(14), color=TH["bg"]), Dot(c, radius=L(10), color=cPt))
            lab = text(fmt_pt(x0, y0), 36, cPt, weight="SEMIBOLD")
            best, score = None, 1e9
            cands = [(1, 1), (-1, 1), (1, -1), (-1, -1), (0, 1.2), (0, -1.2), (1.3, 0), (-1.3, 0)]
            for dx, dy in cands + [(dx * 1.9, dy * 1.9) for dx, dy in cands]:
                cand = lab.copy().move_to(c + RIGHT * dx * (lab.width / 2 + L(20)) + UP * dy * (lab.height / 2 + L(18)))
                x1, x2 = cand.get_left()[0] - L(8), cand.get_right()[0] + L(8)
                ya, yb = cand.get_bottom()[1] - L(8), cand.get_top()[1] + L(8)
                sc = 0
                for (cx_, cy_) in curve_pts:
                    if cy_ == cy_ and ymin <= cy_ <= ymax:
                        v = pt(cx_, cy_)
                        if x1 <= v[0] <= x2 and ya <= v[1] <= yb:
                            sc += 3
                o = pt(0, 0)
                if ya <= o[1] <= yb:
                    sc += 20
                if x1 <= o[0] <= x2:
                    sc += 20
                sc += abs(dx) + abs(dy)  # ưu tiên gần điểm
                if x1 < X(fx) or x2 > X(fx + fw) or yb > Y(GRID["stageTop"]) or ya < Y(GRID["stageBottom"]):
                    sc += 50
                for pl in placed:
                    if not (x2 < pl[0] or x1 > pl[1] or yb < pl[2] or ya > pl[3]):
                        sc += 40
                if sc < score:
                    best, score = cand, sc
            lab = best
            placed.append((lab.get_left()[0], lab.get_right()[0], lab.get_bottom()[1], lab.get_top()[1]))
            nm = q.get("nhan") or "Điểm"
            ry = y2 + 72 + j * 58 + 40
            row = VGroup(Dot(radius=L(9), color=cPt).move_to(P(lx + 44, ry - 14)), text(nm, 38, TH["ink"], weight="SEMIBOLD"), text(fmt_pt(x0, y0), 38, TH["ink2"]))
            put_baseline(row[1], nm, lx + 70, ry)
            row[2].next_to(row[1], RIGHT, buff=L(18)).align_to(row[1], DOWN)
            self.goto(b.at(0, 2))
            anims = [FadeIn(d, scale=0.5), FadeIn(lab, shift=UP * L(8))]
            if not shown_card:
                anims.append(FadeIn(VGroup(c2, t2), shift=RIGHT * L(30)))
                shown_card = True
            if prev_row is not None:
                anims.append(prev_row.animate.set_opacity(0.5))
            self.play(*anims, run_time=b.d(0.7, 2), rate_func=ENTER)
            self.goto(b.at(1, 2))
            self.play(FadeIn(row, shift=UP * L(10)), run_time=b.d(0.6, 2), rate_func=ENTER)
            prev_row = row
            rows_g.add(row)
        # kết: thẻ ý chính (nghiệm, giá trị nhỏ nhất/lớn nhất)
        b = B[k]
        roots = [float(q["x"]) for q in pts if abs(ev(ast, float(q["x"]), av)) < 1e-9]
        ext = []
        for q in pts:
            x0 = float(q["x"])
            hh = 1e-4
            d1, d2, y0 = ev(ast, x0 - hh, av), ev(ast, x0 + hh, av), ev(ast, x0, av)
            if d1 == d1 and d2 == d2 and (d1 - y0) * (d2 - y0) > 0:
                ext.append((x0, y0, d1 > y0))
        lines = []
        if roots:
            lines.append("Cắt trục Ox tại " + " và ".join(f"x = {vn(r)}" for r in roots))
        for x0, y0, mn in ext[:1]:
            lines.append(f"{'Nhỏ nhất' if mn else 'Lớn nhất'} bằng {vn(y0)} khi x = {vn(x0)}")
        if not lines:
            lines.append("Mỗi điểm (x; y) trên đường cong thoả công thức")
        body = VGroup(*[text(ln, 38, TH["ink2"]) for ln in lines])
        h3 = 72 + len(lines) * 56 + 22
        replace = y3 + h3 > GRID["stageBottom"]
        if replace:
            y3 = y2  # thay chỗ thẻ điểm (các điểm đã ghi trên hình)
        c3 = card(lx, y3, lw, h3, bar=cAlt)
        t3 = card_title("Ý chính", lx + 34, y3 + 58)
        for i, (m, ln) in enumerate(zip(body, lines)):
            put_baseline(m, ln, lx + 34, y3 + 58 + 56 * (i + 1))
        self.goto(b.at(0, 2))
        anims = [formula.animate.set_color(cCurve)]
        if prev_row is not None:
            anims.append(prev_row.animate.set_opacity(0.5))
        if replace and shown_card:
            anims.append(FadeOut(VGroup(c2, t2, rows_g), shift=UP * L(16)))
        self.play(*anims, run_time=0.5)
        self.goto(b.at(1, 2) - 0.6)
        self.play(FadeIn(VGroup(c3, t3), shift=RIGHT * L(30)), run_time=0.7, rate_func=ENTER)
        self.play(LaggedStart(*[FadeIn(m, shift=UP * L(8)) for m in body], lag_ratio=0.3), run_time=0.9)
        self.finish()


# --------------------------------------------------------------- Vòng tròn lượng giác
_EX = {0: ("0", "1", "0"), 30: ("\\dfrac{1}{2}", "\\dfrac{\\sqrt{3}}{2}", "\\dfrac{\\sqrt{3}}{3}"), 45: ("\\dfrac{\\sqrt{2}}{2}", "\\dfrac{\\sqrt{2}}{2}", "1"), 60: ("\\dfrac{\\sqrt{3}}{2}", "\\dfrac{1}{2}", "\\sqrt{3}"), 90: ("1", "0", None)}


def exact(fn, deg):
    """Giá trị đúng của sin/cos/tan tại góc đặc biệt (bội của 30°, 45°), có dấu theo góc phần tư; None nếu không đặc biệt/không xác định."""
    d = deg % 360
    if abs(d - round(d)) > 1e-9:
        return None
    d = int(round(d))
    ref = d % 180
    ref = ref if ref <= 90 else 180 - ref
    if ref not in _EX:
        return None
    s, c, t = _EX[ref]
    rad = math.radians(d)
    val = {"sin": math.sin(rad), "cos": math.cos(rad), "tan": math.tan(rad) if abs(math.cos(rad)) > 1e-9 else None}[fn]
    base = {"sin": s, "cos": c, "tan": t}[fn]
    if base is None or val is None:
        return None
    return ("-" if val < -1e-9 else "") + base


class VongTronLuongGiac(StudioScene):
    def construct(self):
        p = PARAMS
        cCos, cSin, cAng, cTan = COMBOS["coDien"]
        self.head("Lượng giác", "Đường tròn đơn vị")
        deg = float(p.get("gocDo", 60))
        target = math.radians(deg)
        show = [f for f in ("cos", "sin", "tan") if f in p.get("hienThi", ["sin", "cos"])]
        fx, fw = SPLIT["figX"], SPLIT["figW"]
        cxp = fx + fw / 2
        cyp = (GRID["stageTop"] + GRID["stageBottom"]) / 2 - 5
        Rp = 300
        O = P(cxp, cyp)
        R = L(Rp)
        c = lambda x, y: O + RIGHT * x * R + UP * y * R  # noqa: E731
        ext = 1.2
        axes = VGroup(
            Arrow(c(-ext, 0), c(ext, 0), buff=0, stroke_width=3, stroke_color=TH["ink2"], tip_length=L(18), max_tip_length_to_length_ratio=1),
            Arrow(c(0, -ext), c(0, ext), buff=0, stroke_width=3, stroke_color=TH["ink2"], tip_length=L(18), max_tip_length_to_length_ratio=1),
        )
        disk = Circle(radius=R, stroke_width=0, fill_color=TH["fill"], fill_opacity=1).move_to(O)
        circle = Circle(radius=R, stroke_color=TH["ink"], stroke_width=4).move_to(O)
        quad = VGroup(
            text("0°", 34, TH["ink3"]).move_to(c(1, 0) + RIGHT * L(38) + DOWN * L(26)),
            text("90°", 34, TH["ink3"]).move_to(c(0, 1) + RIGHT * L(46) + UP * L(24)),
            text("180°", 34, TH["ink3"]).move_to(c(-1, 0) + LEFT * L(50) + DOWN * L(26)),
            text("270°", 34, TH["ink3"]).move_to(c(0, -1) + RIGHT * L(52) + DOWN * L(24)),
            text("O", 34, TH["ink3"]).move_to(O + LEFT * L(22) + DOWN * L(26)),
        )
        ticks = VGroup()
        if p.get("gocDacBiet", True):
            for d in range(0, 360, 15):
                if d % 30 == 0 or d % 45 == 0:
                    a_ = math.radians(d)
                    ticks.add(Line(c(0.95 * math.cos(a_), 0.95 * math.sin(a_)), c(1.05 * math.cos(a_), 1.05 * math.sin(a_)), stroke_color=TH["ink3"], stroke_width=3))
        th = ValueTracker(0.0)
        M = lambda: c(math.cos(th.get_value()), math.sin(th.get_value()))  # noqa: E731
        ray = always_redraw(lambda: Line(O, M(), stroke_color=TH["ink"], stroke_width=5))
        arc = always_redraw(lambda: Arc(radius=0.24 * R, start_angle=0, angle=max(th.get_value(), 1e-3), arc_center=O, stroke_color=cAng, stroke_width=6))
        alpha = always_redraw(lambda: math_tex("\\alpha", 42, cAng).move_to(O + 0.38 * R * np.array([math.cos(th.get_value() / 2), math.sin(th.get_value() / 2), 0])).set_opacity(1 if th.get_value() > 0.3 else 0))
        dot = always_redraw(lambda: VGroup(Dot(M(), radius=L(15), color=TH["bg"]), Dot(M(), radius=L(10), color=TH["ink"])))
        mlab = always_redraw(lambda: math_tex("M", 44, TH["ink"]).move_to(M() + 0.26 * R * np.array([math.cos(th.get_value()), math.sin(th.get_value()), 0])))

        # cột trái: thẻ góc + giá trị (số đếm theo góc), thẻ hằng đẳng thức trượt vào cuối
        lx, lw = SPLIT["leftX"], SPLIT["leftW"]
        y1 = self.head_bottom + 30
        rows_n = 1 + len(show)
        h1 = 36 + 72 + len(show) * 104 + 14
        c1 = card(lx, y1, lw, h1, bar=cAng)
        base0 = y1 + 36 + 54
        ang_lab = math_tex("\\alpha =", 56, cAng)
        put_baseline(ang_lab, "a", lx + 40, base0)
        ang_val = num("0°", 56, cAng).next_to(ang_lab, RIGHT, buff=L(18)).align_to(ang_lab, DOWN)
        ang_val.add_updater(lambda m: m.become(num(f"{round(math.degrees(th.get_value()))}°", 56, cAng).next_to(ang_lab, RIGHT, buff=L(18)).align_to(ang_lab, DOWN)))
        fns = {"cos": (math.cos, cCos), "sin": (math.sin, cSin), "tan": (math.tan, cTan)}
        rows = {}
        yy = base0 + 96
        for f in show:
            fn, col = fns[f]
            lab = math_tex(f"\\{f}\\alpha", 52, col)
            put_baseline(lab, "a", lx + 40, yy)
            rows[f] = (lab, fn, col, yy)
            yy += 104

        cosseg = Line(O, c(math.cos(target), 0), stroke_color=cCos, stroke_width=10)
        sinseg = Line(O, c(0, math.sin(target)), stroke_color=cSin, stroke_width=10)
        guide_v = DashedLine(c(math.cos(target), math.sin(target)), c(math.cos(target), 0), dash_length=L(10), stroke_color=TH["ink3"], stroke_width=3)
        guide_h = DashedLine(c(math.cos(target), math.sin(target)), c(0, math.sin(target)), dash_length=L(10), stroke_color=TH["ink3"], stroke_width=3)
        side_c = DOWN if math.sin(target) >= 0 else UP
        cos_lab = math_tex("\\cos\\alpha", 40, cCos).move_to(c(math.cos(target) / 2, 0) + side_c * L(36))
        sl = math_tex("\\sin\\alpha", 40, cSin)
        side_s = LEFT if math.cos(target) >= 0 else RIGHT
        sin_lab = sl.move_to(c(0, math.sin(target) / 2) + side_s * (sl.width / 2 + L(20)))

        B = schedule(self.T, [1.0, 0.8, 1.6] + [1.0] * len(show) + [1.4])
        k = 0
        b = B[k]; k += 1
        self.goto(b.at(0, 2))
        self.play(FadeIn(disk), Create(axes), Create(circle), run_time=b.d(1.4, 2), rate_func=MOVE)
        self.goto(b.at(1, 2))
        self.play(FadeIn(quad, lag_ratio=0.1), run_time=b.d(0.8, 2))
        b = B[k]; k += 1
        self.goto(b.at(0, 2))
        self.play(FadeIn(ticks, lag_ratio=0.03), FadeIn(VGroup(c1, ang_lab, ang_val), shift=RIGHT * L(30), rate_func=ENTER), run_time=b.d(0.8, 2))
        self.add(ray, dot, mlab)
        b = B[k]; k += 1
        self.add(arc, alpha)
        self.goto(b.at(0, 1))
        # chuyển động chậm duy nhất của cảnh: tia quay tới α, số đo góc đếm theo
        self.play(th.animate.set_value(target), run_time=b.slot * 0.85, rate_func=MOVE)
        ang_val.clear_updaters()
        self.remove(ang_val)
        ang_val = num(f"{vn(deg, 1)}°", 56, cAng).next_to(ang_lab, RIGHT, buff=L(18)).align_to(ang_lab, DOWN)
        self.add(ang_val)
        for m in (ray, dot, mlab, arc, alpha):
            m.clear_updaters()
        prev = None
        for f in show:
            b = B[k]; k += 1
            lab, fn, col, yb = rows[f]
            t = th.get_value()
            v = None if (f == "tan" and abs(math.cos(t)) < 1e-6) else fn(t)
            ex = exact(f, deg)
            parts = [lab]
            if v is None:
                parts.append(text("không xác định", 44, TH["ink2"]))
            elif ex is not None:
                parts += [math_tex("= " + ex, 52, TH["ink"]), text(f"≈ {vn(v, 2)}", 40, TH["ink3"])]
            else:
                parts.append(math_tex("\\approx " + tex_num(v, 2), 52, TH["ink"]))
            for i in range(1, len(parts)):
                parts[i].next_to(parts[i - 1], RIGHT, buff=L(22))
                parts[i].move_to([parts[i].get_center()[0], lab.get_center()[1], 0])
            row = VGroup(*parts)
            self.goto(b.at(0, 2))
            anims = [FadeIn(lab, shift=UP * L(8))]
            if f == "cos":
                anims += [Create(guide_v), Create(cosseg), FadeIn(cos_lab)]
            elif f == "sin":
                anims += [Create(guide_h), Create(sinseg), FadeIn(sin_lab)]
            elif v is not None and abs(math.cos(t)) > 0.3 and abs(math.tan(t)) < 1.15:
                tl_ = Line(c(1, 0), c(1, math.tan(t)), stroke_color=cTan, stroke_width=10)
                ext_l = DashedLine(O, c(1, math.tan(t)), dash_length=L(10), stroke_color=TH["ink3"], stroke_width=3)
                anims += [Create(ext_l), Create(tl_), FadeIn(math_tex("\\tan\\alpha", 40, cTan).next_to(tl_, RIGHT, buff=L(14)))]
            if prev is not None:
                anims.append(prev.animate.set_opacity(0.5))
            self.play(*anims, run_time=b.d(0.9, 2), rate_func=ENTER)
            self.goto(b.at(1, 2))
            self.play(LaggedStart(*[FadeIn(m, shift=UP * L(8)) for m in parts[1:]], lag_ratio=0.35), run_time=b.d(0.9, 2))
            prev = row
        # kết: tam giác vuông + hằng đẳng thức cơ bản trong thẻ
        b = B[k]
        t = th.get_value()
        tri = Polygon(O, c(math.cos(t), 0), c(math.cos(t), math.sin(t)), stroke_width=0, fill_color=cAng, fill_opacity=0.14)
        ident = math_tex("\\sin^2\\alpha + \\cos^2\\alpha = 1", 60, TH["ink"])
        ident[0][0:5].set_color(cSin)
        ident[0][6:11].set_color(cCos)
        capt = text("vì M nằm trên đường tròn bán kính 1", 36, TH["ink2"])
        y2 = y1 + h1 + 24
        h2 = 36 + ident.height / L(1) + 24 + 50 + 22
        if y2 + h2 > GRID["stageBottom"]:
            y2 = GRID["stageBottom"] - h2
        c2 = card(lx, y2, lw, h2, bar=TH["accent"])
        ident.move_to(P(lx + 40, y2 + 36) + DOWN * ident.height / 2, aligned_edge=LEFT)
        ident.align_to(P(lx + 40, 0), LEFT)
        put_baseline(capt, "vì M nằm trên đường tròn bán kính 1", lx + 40, y2 + h2 - 30)
        self.goto(b.at(0, 2))
        anims = [FadeIn(tri)]
        if prev is not None:
            anims.append(prev.animate.set_opacity(0.5))
        self.play(*anims, run_time=0.8)
        self.goto(b.at(1, 2) - 0.6)
        self.play(FadeIn(c2, shift=RIGHT * L(30)), FadeIn(ident, shift=RIGHT * L(30)), run_time=0.8, rate_func=ENTER)
        self.play(FadeIn(capt, shift=UP * L(8)), run_time=0.5)
        self.finish()
