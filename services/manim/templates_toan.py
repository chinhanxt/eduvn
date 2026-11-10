"""Mẫu Manim — nhóm 2: toán (lượng giác, vectơ, không gian, đạo hàm, tích phân, hệ phương trình, phép biến hình, dãy số)."""
from common import *  # noqa: F401,F403
from common import (Base, P, SPEC, TOTAL, C_ACC, C_BLUE, C_GREEN, C_GREY, C_INK, C_ORANGE, C_RED, ev, fmt, plot_runs)


class VongTronLuongGiac(Base):
    def construct(self):
        self.head()
        target = math.radians(P.get("gocDo", 60))
        show = P.get("hienThi", ["sin", "cos"])
        R = 1.85 if self.title_obj else 2.2
        ax = Axes(x_range=[-1.4, 1.4, 1], y_range=[-1.4, 1.4, 1], x_length=2.8 * R, y_length=2.8 * R, axis_config={"color": C_GREY, "include_ticks": False}).shift(LEFT * 3.2 + DOWN * (0.4 if self.title_obj else 0))
        c = lambda x, y: ax.c2p(x, y)
        circle = Circle(radius=R, color=C_BLUE).move_to(c(0, 0))
        dt = self.step(4)
        self.play(Create(ax), Create(circle), run_time=dt)
        specials = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]
        if P.get("gocDacBiet", True):
            labs = VGroup(*[Text(f"{d}°", font_size=15, color=C_GREY).move_to(c(1.2 * math.cos(math.radians(d)), 1.2 * math.sin(math.radians(d)))) for d in specials])
            self.play(FadeIn(labs), run_time=dt * 0.6)
        th = ValueTracker(0.0)
        origin = c(0, 0)
        ray = always_redraw(lambda: Line(origin, c(math.cos(th.get_value()), math.sin(th.get_value())), color=C_INK, stroke_width=4))
        dot = always_redraw(lambda: Dot(c(math.cos(th.get_value()), math.sin(th.get_value())), color=C_ACC, radius=0.09))
        arc = always_redraw(lambda: Arc(radius=0.45, start_angle=0, angle=max(th.get_value(), 0.001), color=C_ORANGE, arc_center=origin))
        parts = [ray, dot, arc]
        if "cos" in show:
            parts.append(always_redraw(lambda: Line(origin, c(math.cos(th.get_value()), 0), color=C_GREEN, stroke_width=6)))
        if "sin" in show:
            parts.append(always_redraw(lambda: Line(c(math.cos(th.get_value()), 0), c(math.cos(th.get_value()), math.sin(th.get_value())), color=C_RED, stroke_width=6)))
        if "tan" in show:
            def tan_line():
                t = th.get_value()
                if abs(math.cos(t)) < 0.35:
                    return VGroup()
                return Line(c(1, 0), c(1, math.tan(t)), color=C_ORANGE, stroke_width=6)
            parts.append(always_redraw(tan_line))
        self.add(*parts)
        rows = VGroup()
        vals = []
        for name, colr, fn in (("sin", C_RED, math.sin), ("cos", C_GREEN, math.cos), ("tan", C_ORANGE, math.tan)):
            if name in show:
                num = DecimalNumber(0, num_decimal_places=2, font_size=36, color=colr)
                num.add_updater(lambda m, fn=fn: m.set_value(fn(th.get_value()) if abs(math.cos(th.get_value())) > 1e-6 or fn is not math.tan else 0))
                rows.add(VGroup(Text(f"{name} α =", font_size=32, color=colr), num).arrange(RIGHT, buff=0.25))
        ang = VGroup(Text("α =", font_size=32, color=C_ACC), DecimalNumber(0, num_decimal_places=0, font_size=36, color=C_ACC, unit="^\\circ")).arrange(RIGHT, buff=0.25)
        ang[1].add_updater(lambda m: m.set_value(math.degrees(th.get_value())))
        panel = VGroup(ang, *rows).arrange(DOWN, aligned_edge=LEFT, buff=0.35).move_to(RIGHT * 3.6 + DOWN * 0.2)
        self.add(panel)
        self.play(th.animate.set_value(target), run_time=dt * 2.2, rate_func=smooth)
        self.finish()


class DoThiLuongGiac(Base):
    def construct(self):
        self.head()
        fn = {"sin": math.sin, "cos": math.cos, "tan": math.tan}[P["ham"]]
        A = float(P.get("bienDo", 1))
        T = float(P.get("chuKy", 1))  # bội số của chu kỳ chuẩn 2π (tan: π)
        ph = math.radians(P.get("phaDauDo", 0))
        ytop = 4 if P["ham"] == "tan" else max(1.5, A + 0.5)
        ax = Axes(x_range=[-2 * math.pi, 2 * math.pi, math.pi], y_range=[-ytop, ytop, 1 if ytop <= 4 else 2], x_length=10.5, y_length=4.2 if self.title_obj else 5, axis_config={"color": C_GREY, "include_numbers": False}).shift(DOWN * (0.35 if self.title_obj else 0) + (RIGHT * 0.9 if P.get("tuVongTron") else 0))
        ax.x_axis.add_labels({-2 * math.pi: MathTex("-2\\pi", font_size=24), -math.pi: MathTex("-\\pi", font_size=24), math.pi: MathTex("\\pi", font_size=24), 2 * math.pi: MathTex("2\\pi", font_size=24)})
        dt = self.step(4)

        def run(f):
            runs, cur = [], []
            for i in range(601):
                x = -2 * math.pi + 4 * math.pi * i / 600
                y = f(x)
                if y == y and -ytop <= y <= ytop and abs(y) < 50:
                    cur.append(ax.c2p(x, y))
                else:
                    if len(cur) > 1:
                        runs.append(cur)
                    cur = []
            if len(cur) > 1:
                runs.append(cur)
            g = VGroup()
            for r in runs:
                m = VMobject(color=C_ACC, stroke_width=4)
                m.set_points_as_corners(r)
                g.add(m)
            return g

        self.play(Create(ax), run_time=dt)
        base = run(fn)
        name = {"sin": "\\sin", "cos": "\\cos", "tan": "\\tan"}[P["ham"]]
        tag0 = MathTex(f"y = {name} x", font_size=36, color=C_ACC).to_corner(UR, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))
        if P.get("tuVongTron"):
            circ = Circle(radius=0.9, color=C_BLUE).move_to(LEFT * 5.6 + DOWN * 0.3)
            th = ValueTracker(0.0)
            dotc = always_redraw(lambda: Dot(circ.get_center() + 0.9 * np.array([math.cos(th.get_value()), math.sin(th.get_value()), 0]), color=C_ACC, radius=0.07))
            link = always_redraw(lambda: Line(dotc.get_center(), ax.c2p(th.get_value(), math.sin(th.get_value())), color=C_GREY, stroke_width=1.5))
            part = always_redraw(lambda: ax.plot(math.sin, x_range=[0.0001, max(th.get_value(), 0.0002), 0.05], color=C_ACC, stroke_width=4))
            self.play(Create(circ), FadeIn(tag0), run_time=dt * 0.5)
            self.add(dotc, link, part)
            self.play(th.animate.set_value(2 * math.pi), run_time=dt * 1.6, rate_func=linear)
            self.remove(dotc, link, part)
            self.add(base)
        else:
            self.play(Create(base), FadeIn(tag0), run_time=dt)
        if A != 1 or T != 1 or ph != 0:
            B = 1.0 / T
            new = run(lambda x: A * fn(B * x + ph))
            new.set_color(C_GREEN)
            tag1 = MathTex(f"y = {fmt(A)}\\,{name}({fmt(B)}x{'+' if ph >= 0 else '-'}{fmt(abs(ph), 2)})", font_size=36, color=C_GREEN).move_to(tag0)
            self.play(ReplacementTransform(base, new), ReplacementTransform(tag0, tag1), run_time=dt * 1.4)
        self.finish()


class Vecto(Base):
    def construct(self):
        self.head()
        loai = P["loai"]
        a = np.array([*P.get("a", [3, 1]), 0.0])
        b = np.array([*P.get("b", [1, 2]), 0.0])
        k = float(P.get("k", 2))
        plane = Axes(x_range=[-6, 6, 1], y_range=[-4, 4, 1], x_length=10.5, y_length=5.6 if not self.title_obj else 4.8, axis_config={"color": "#2a3170", "include_numbers": False, "include_ticks": False}).shift(DOWN * (0.3 if self.title_obj else 0))
        P3 = lambda v: plane.c2p(v[0], v[1])
        arrow = lambda u, v, col, **kw: Arrow(P3(u), P3(v), buff=0, color=col, stroke_width=6, max_tip_length_to_length_ratio=0.15, **kw)
        lab = lambda t, pos, col, d=UR: MathTex(t, font_size=40, color=col).next_to(pos, d, buff=0.1)
        O = np.zeros(3)
        dt = self.step(4)
        self.play(Create(plane), run_time=dt * 0.6)
        A1 = arrow(O, a, C_BLUE)
        self.play(GrowArrow(A1), Write(lab("\\vec{a}", P3(a), C_BLUE)), run_time=dt)
        if loai == "tong_tam_giac":
            B1 = arrow(a, a + b, C_ORANGE)
            S = arrow(O, a + b, C_GREEN)
            self.play(GrowArrow(B1), Write(lab("\\vec{b}", P3(a + b / 2), C_ORANGE)), run_time=dt)
            self.play(GrowArrow(S), Write(lab("\\vec{a}+\\vec{b}", P3(a + b), C_GREEN)), run_time=dt)
        elif loai == "tong_hbh":
            B1 = arrow(O, b, C_ORANGE)
            self.play(GrowArrow(B1), Write(lab("\\vec{b}", P3(b), C_ORANGE)), run_time=dt)
            d1 = DashedLine(P3(a), P3(a + b), color=C_GREY)
            d2 = DashedLine(P3(b), P3(a + b), color=C_GREY)
            S = arrow(O, a + b, C_GREEN)
            self.play(Create(d1), Create(d2), run_time=dt * 0.6)
            self.play(GrowArrow(S), Write(lab("\\vec{a}+\\vec{b}", P3(a + b), C_GREEN)), run_time=dt)
        elif loai == "nhan_so":
            S = arrow(O, k * a, C_GREEN)
            self.play(GrowArrow(S), Write(lab(f"{fmt(k)}\\vec{{a}}", P3(k * a), C_GREEN)), run_time=dt * 1.6)
        elif loai == "thanh_phan":
            hx = DashedLine(P3(np.array([a[0], 0, 0])), P3(a), color=C_GREY)
            hy = DashedLine(P3(np.array([0, a[1], 0])), P3(a), color=C_GREY)
            ax_ = arrow(O, np.array([a[0], 0, 0]), C_GREEN)
            ay_ = arrow(O, np.array([0, a[1], 0]), C_ORANGE)
            self.play(Create(hx), Create(hy), run_time=dt * 0.6)
            self.play(GrowArrow(ax_), GrowArrow(ay_), run_time=dt)
            self.play(Write(MathTex(f"\\vec{{a}} = ({fmt(a[0])};\\,{fmt(a[1])})", font_size=40, color=C_INK).to_corner(DR, buff=0.5)), run_time=dt)
        else:  # hinh_chieu
            B1 = arrow(O, b, C_ORANGE)
            self.play(GrowArrow(B1), Write(lab("\\vec{b}", P3(b), C_ORANGE)), run_time=dt)
            bn = b / max(np.linalg.norm(b), 1e-9)
            proj = bn * float(np.dot(a, bn))
            d = DashedLine(P3(a), P3(proj), color=C_GREY)
            S = arrow(O, proj, C_GREEN)
            self.play(Create(d), GrowArrow(S), run_time=dt)
            self.play(Write(MathTex(f"\\vec{{a}}\\cdot\\vec{{b}} = {fmt(float(np.dot(a, b)))}", font_size=40, color=C_GREEN).to_corner(DR, buff=0.5)), run_time=dt)
        self.finish()


class HinhKhongGianXoay(ThreeDScene):
    def construct(self):
        T = SPEC["thoiLuong"]
        shape = P["hinh"]
        dims = P.get("kichThuoc", {"a": 2, "b": 2, "c": 2})
        a, b, c = dims.get("a", 2), dims.get("b", 2), dims.get("c", 2)
        labels, verts = [], None
        faces = []
        if shape in ("cube", "cuboid"):
            if shape == "cube":
                b = c = a
            x, y, z = a / 2, b / 2, c / 2
            verts = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]
            faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
            labels = ["A", "B", "C", "D", "A'", "B'", "C'", "D'"]
        elif shape == "pyramid":
            x, y = a / 2, b / 2
            verts = [[-x, -y, -c / 2], [x, -y, -c / 2], [x, y, -c / 2], [-x, y, -c / 2], [0, 0, c / 2]]
            faces = [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]
            labels = ["A", "B", "C", "D", "S"]
        elif shape == "prism":
            r = a / math.sqrt(3)
            tri = [[r * math.cos(t), r * math.sin(t)] for t in (math.pi / 2, math.pi / 2 + 2 * math.pi / 3, math.pi / 2 + 4 * math.pi / 3)]
            verts = [[p[0], p[1], -c / 2] for p in tri] + [[p[0], p[1], c / 2] for p in tri]
            faces = [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]]
            labels = ["A", "B", "C", "A'", "B'", "C'"]
        self.set_camera_orientation(phi=68 * DEGREES, theta=-50 * DEGREES)
        self.camera.background_color = C_BG
        title = SPEC.get("tieuDe")
        if title:
            t = Text(title, font_size=32, color=WHITE).to_edge(UP, buff=0.3)
            self.add_fixed_in_frame_mobjects(t)
        if verts is not None:
            solid = Polyhedron(verts, faces, faces_config={"fill_color": C_BLUE, "fill_opacity": 0.35, "stroke_width": 2, "stroke_color": C_INK}, graph_config={"vertex_type": Dot3D, "vertex_config": {"color": C_ACC, "radius": 0.05}})
        elif shape == "cone":
            solid = Cone(base_radius=a / 2, height=c, direction=OUT, show_base=True, resolution=(14, 40)).set_color(C_BLUE).set_opacity(0.55).shift(OUT * (-c / 2))
        elif shape == "cylinder":
            solid = Cylinder(radius=a / 2, height=c, direction=OUT, resolution=(14, 40)).set_color(C_BLUE).set_opacity(0.55)
        else:
            solid = Sphere(radius=a / 2, resolution=(24, 48)).set_color(C_BLUE).set_opacity(0.55)
        self.play(FadeIn(solid), run_time=T * 0.15)
        extras = []
        if P.get("nhanDinh", True) and verts is not None:
            for name, v in zip(labels, verts):
                tx = Text(name, font_size=28, color=C_ACC)
                tx.move_to(np.array(v) * 1.22 + np.array([0, 0, 0.12]))
                self.add_fixed_orientation_mobjects(tx)
                extras.append(tx)
        if P.get("chieuCao", True) and shape != "sphere":
            top = np.array([0, 0, c / 2]) if shape in ("pyramid", "cone") else np.array([verts[0][0], verts[0][1], c / 2]) if shape in ("cube", "cuboid", "prism") else np.array([a / 2, 0, c / 2])
            bot = np.array([top[0], top[1], -c / 2])
            if shape in ("pyramid", "cone"):
                bot = np.array([0, 0, -c / 2])
            h = DashedLine(bot, top, color=C_GREEN, stroke_width=6)
            ht = Text("h", font_size=30, color=C_GREEN)
            ht.move_to((top + bot) / 2 + np.array([0.28, 0, 0]))
            self.add_fixed_orientation_mobjects(ht)
            self.play(Create(h), run_time=T * 0.1)
        self.begin_ambient_camera_rotation(rate=2 * math.pi / max(T * 0.9, 1) * 0.75)
        self.wait(max(T * 0.72, 0.5))
        self.stop_ambient_camera_rotation()


def _fax(ymin, ymax, xmin, xmax, title):
    return Axes(
        x_range=[xmin, xmax, max(1, round((xmax - xmin) / 10))],
        y_range=[ymin, ymax, max(1, round((ymax - ymin) / 8))],
        x_length=9.5, y_length=4.6 if title else 5.4,
        axis_config={"include_numbers": True, "color": C_GREY, "font_size": 22},
    ).shift(DOWN * (0.35 if title else 0))


def _bounds():
    return P.get("xMin", -5), P.get("xMax", 5), P.get("yMin", -5), P.get("yMax", 5)


class DaoHamTiepTuyen(Base):
    def construct(self):
        self.head()
        xmin, xmax, ymin, ymax = _bounds()
        f = P["bieuThuc"]
        x0 = float(P.get("x0", 1))
        ax = _fax(ymin, ymax, xmin, xmax, self.title_obj)
        dt = self.step(4)
        graph = plot_runs(f, ax, xmin, xmax, ymin, ymax, color=C_ACC)
        self.play(Create(ax), run_time=dt * 0.7)
        self.play(Create(graph), run_time=dt)
        F = lambda x: ev(f, x)
        d = lambda x: (F(x + 1e-4) - F(x - 1e-4)) / 2e-4

        def line_through(xa, slope, ya):
            ex = (xmax - xmin) * 0.35
            return Line(ax.c2p(xa - ex, ya - slope * ex), ax.c2p(xa + ex, ya + slope * ex), color=C_ORANGE, stroke_width=4)

        h = ValueTracker(min(2.0, (xmax - x0) * 0.8 or 1.0))
        p = Dot(ax.c2p(x0, F(x0)), color=C_RED, radius=0.09)
        q = always_redraw(lambda: Dot(ax.c2p(x0 + h.get_value(), F(x0 + h.get_value())), color=C_GREEN, radius=0.08))
        sec = always_redraw(lambda: line_through(x0, (F(x0 + h.get_value()) - F(x0)) / h.get_value(), F(x0)))
        info = VGroup(Text("hệ số góc =", font_size=26, color=C_ORANGE), DecimalNumber(0, num_decimal_places=2, font_size=32, color=C_ORANGE)).arrange(RIGHT, buff=0.2).to_corner(UL, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))
        info[1].add_updater(lambda m: m.set_value((F(x0 + h.get_value()) - F(x0)) / h.get_value()))
        self.play(FadeIn(p), FadeIn(info), run_time=dt * 0.4)
        self.add(q, sec)
        self.play(h.animate.set_value(0.02), run_time=dt * 1.6, rate_func=smooth)
        self.remove(q, sec)
        # tiếp tuyến trượt dọc đồ thị
        t = ValueTracker(x0)
        tx0 = min(xmax - 0.5, x0 + 1.5)
        tan = always_redraw(lambda: line_through(t.get_value(), d(t.get_value()), F(t.get_value())))
        pt = always_redraw(lambda: Dot(ax.c2p(t.get_value(), F(t.get_value())), color=C_RED, radius=0.09))
        info[1].clear_updaters()
        info[1].add_updater(lambda m: m.set_value(d(t.get_value())))
        self.remove(p)
        self.add(tan, pt)
        self.play(t.animate.set_value(tx0), run_time=dt * 1.4, rate_func=smooth)
        self.finish()


class TichPhanDienTich(Base):
    def construct(self):
        self.head()
        xmin, xmax, ymin, ymax = _bounds()
        f = P["bieuThuc"]
        a, b = float(P["a"]), float(P["b"])
        n_end = int(P.get("soHinh", 24))
        ax = _fax(ymin, ymax, xmin, xmax, self.title_obj)
        safe = lambda x: (lambda v: v if v == v and abs(v) < 1e3 else 0.0)(ev(f, x))
        graph = ax.plot(safe, x_range=[xmin, xmax, (xmax - xmin) / 300], color=C_ACC, use_smoothing=False)
        dt = self.step(5)
        self.play(Create(ax), Create(graph), run_time=dt)
        total = sum(safe(a + (b - a) * (i + 0.5) / 2000) for i in range(2000)) * (b - a) / 2000
        counts = [4, max(8, n_end // 2), n_end]
        rects = ax.get_riemann_rectangles(graph, x_range=[a, b], dx=(b - a) / counts[0], input_sample_type="left", color=(C_BLUE, C_GREEN), fill_opacity=0.6, stroke_width=0.6, stroke_color=C_INK)
        lab = Text(f"{counts[0]} hình chữ nhật", font_size=26, color=C_INK).to_corner(UL, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))
        self.play(Create(rects), FadeIn(lab), run_time=dt)
        for nn in counts[1:]:
            nr = ax.get_riemann_rectangles(graph, x_range=[a, b], dx=(b - a) / nn, input_sample_type="left", color=(C_BLUE, C_GREEN), fill_opacity=0.6, stroke_width=0.6, stroke_color=C_INK)
            nl = Text(f"{nn} hình chữ nhật", font_size=26, color=C_INK).move_to(lab, aligned_edge=LEFT)
            self.play(Transform(rects, nr), Transform(lab, nl), run_time=dt)
        res = MathTex(f"S = \\int_{{{fmt(a)}}}^{{{fmt(b)}}} f(x)\\,dx \\approx {fmt(total)}", font_size=40, color=C_GREEN).to_corner(UR, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))
        self.play(Write(res), run_time=dt)
        self.finish()


class GiaoDiemHePt(Base):
    def construct(self):
        self.head()
        xmin, xmax, ymin, ymax = _bounds()
        f, g = P["f"], P["g"]
        ax = _fax(ymin, ymax, xmin, xmax, self.title_obj)
        dt = self.step(4)
        self.play(Create(ax), run_time=dt * 0.6)
        gf = plot_runs(f, ax, xmin, xmax, ymin, ymax, color=C_ACC)
        gg = plot_runs(g, ax, xmin, xmax, ymin, ymax, color=C_BLUE)
        self.play(Create(gf), run_time=dt)
        self.play(Create(gg), run_time=dt)
        h = lambda x: ev(f, x) - ev(g, x)
        pts = []
        N = 800
        for i in range(N):
            x1, x2 = xmin + (xmax - xmin) * i / N, xmin + (xmax - xmin) * (i + 1) / N
            y1, y2 = h(x1), h(x2)
            if y1 == y1 and y2 == y2 and y1 * y2 <= 0 and (y1 != 0 or y2 != 0) and abs(y1 - y2) < 50:
                lo, hi = x1, x2
                for _ in range(40):
                    m = (lo + hi) / 2
                    if h(lo) * h(m) <= 0:
                        hi = m
                    else:
                        lo = m
                x = (lo + hi) / 2
                y = ev(f, x)
                if ymin <= y <= ymax and not any(abs(x - p[0]) < 1e-3 for p in pts):
                    pts.append((x, y))
        marks = []
        for x, y in pts[:4]:
            d = Dot(ax.c2p(x, y), color=C_RED, radius=0.1)
            t = Text(f"({fmt(x)}; {fmt(y)})", font_size=22, color=C_RED).next_to(d, UR, buff=0.1)
            marks.append(VGroup(d, t))
        if marks:
            self.play(*[FadeIn(m, scale=1.8) for m in marks], run_time=dt)
            self.play(Write(Text("Giao điểm = nghiệm của hệ", font_size=28, color=C_RED).to_corner(UL, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))), run_time=dt * 0.8)
        self.finish()


class PhepBienHinh(Base):
    def construct(self):
        self.head()
        loai = P["phep"]
        V = [np.array([x, y, 0.0]) for x, y in P["dinh"]]
        tam = np.array([*P.get("tam", [0, 0]), 0.0])
        ax = Axes(x_range=[-6, 6, 1], y_range=[-4, 4, 1], x_length=10.5, y_length=5.6 if not self.title_obj else 4.8, axis_config={"color": "#2a3170", "include_numbers": False, "include_ticks": False}).shift(DOWN * (0.3 if self.title_obj else 0))
        pt = lambda v: ax.c2p(v[0], v[1])
        poly = lambda vs, col, op: Polygon(*[pt(v) for v in vs], color=col, fill_color=col, fill_opacity=op, stroke_width=4)
        if loai == "tinh_tien":
            d = np.array([*P.get("tinhTien", [3, 1]), 0.0])
            W = [v + d for v in V]
        elif loai == "quay":
            th = math.radians(P.get("gocDo", 90))
            R = np.array([[math.cos(th), -math.sin(th), 0], [math.sin(th), math.cos(th), 0], [0, 0, 1]])
            W = [tam + R @ (v - tam) for v in V]
        elif loai == "doi_xung_truc":
            truc = P.get("truc", "Oy")
            W = [np.array([v[0], -v[1], 0.0]) if truc == "Ox" else np.array([-v[0], v[1], 0.0]) if truc == "Oy" else np.array([v[1], v[0], 0.0]) for v in V]
        else:
            k = float(P.get("k", 2))
            W = [tam + k * (v - tam) for v in V]
        dt = self.step(4)
        self.play(Create(ax), run_time=dt * 0.6)
        src = poly(V, C_BLUE, 0.35)
        names = "ABCDE"
        l1 = VGroup(*[Text(names[i], font_size=26, color=C_BLUE).next_to(pt(v), UR, buff=0.08) for i, v in enumerate(V)])
        self.play(Create(src), FadeIn(l1), run_time=dt)
        extra = []
        if loai == "doi_xung_truc":
            truc = P.get("truc", "Oy")
            line = DashedLine(ax.c2p(0, -4), ax.c2p(0, 4), color=C_ACC) if truc == "Oy" else DashedLine(ax.c2p(-6, 0), ax.c2p(6, 0), color=C_ACC) if truc == "Ox" else DashedLine(ax.c2p(-4, -4), ax.c2p(4, 4), color=C_ACC)
            extra.append(Create(line))
        if loai in ("quay", "vi_tu"):
            extra.append(FadeIn(Dot(pt(tam), color=C_ACC, radius=0.1)))
        if extra:
            self.play(*extra, run_time=dt * 0.6)
        dst = poly(V, C_GREEN, 0.35)
        self.add(dst)
        l2 = VGroup(*[Text(names[i] + "'", font_size=26, color=C_GREEN).next_to(pt(v), UR, buff=0.08) for i, v in enumerate(V)])
        l2t = VGroup(*[Text(names[i] + "'", font_size=26, color=C_GREEN).next_to(pt(v), UR, buff=0.08) for i, v in enumerate(W)])
        self.play(Transform(dst, poly(W, C_GREEN, 0.35)), Transform(l2, l2t), run_time=dt * 1.6, rate_func=smooth)
        self.finish()


class DaySo(Base):
    def construct(self):
        self.head()
        n = int(P["n"])
        u1 = float(P["u1"])
        k = float(P["d"] if P["loai"] == "cap_so_cong" else P["q"])
        us = [u1 + i * k if P["loai"] == "cap_so_cong" else u1 * (k ** i) for i in range(n)]
        mx = max(abs(u) for u in us) or 1.0
        W = 10.0 / n
        base_y = -0.3 if self.title_obj else -0.1
        dt = self.step(n + 2)
        axis = Line(LEFT * 5.6 + UP * base_y, RIGHT * 5.6 + UP * base_y, color=C_GREY)
        self.play(Create(axis), run_time=dt * 0.6)
        bars = []
        s = 0.0
        for i, u in enumerate(us):
            hgt = max(abs(u) / mx * 2.4, 0.05) * (1 if u >= 0 else -1)
            r = Rectangle(width=W * 0.7, height=abs(hgt), fill_color=C_BLUE if u >= 0 else C_RED, fill_opacity=0.8, stroke_width=0)
            r.move_to(LEFT * 5 + RIGHT * (W * (i + 0.5)) + UP * (base_y + hgt / 2))
            lbl = MathTex(f"u_{{{i + 1}}}={fmt(u)}", font_size=24, color=C_INK).next_to(r, DOWN if u >= 0 else UP, buff=0.08)
            if u >= 0:
                lbl.next_to(axis, DOWN, buff=0.1).set_x(r.get_x())
            self.play(GrowFromEdge(r, DOWN if u >= 0 else UP), FadeIn(lbl), run_time=dt)
            bars.append(r)
        s = sum(us)
        rule = MathTex("u_{n+1} = u_n + " + fmt(k) if P["loai"] == "cap_so_cong" else "u_{n+1} = u_n \\cdot " + fmt(k), font_size=38, color=C_ACC).to_corner(UL, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))
        tot = MathTex(f"S_{{{n}}} = {fmt(s)}", font_size=40, color=C_GREEN).to_corner(UR, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))
        self.play(Write(rule), run_time=dt)
        self.play(Write(tot), *[b.animate.set_color(C_GREEN) for b in bars], run_time=dt)
        self.finish()
