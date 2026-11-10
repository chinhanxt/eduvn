"""Mẫu Manim — nhóm 3: vật lí (dao động điều hòa, chuyển động thẳng, sóng cơ, tổng hợp lực)."""
from common import *  # noqa: F401,F403
from common import Base, P, SPEC, TOTAL, C_ACC, C_BLUE, C_GREEN, C_GREY, C_INK, C_ORANGE, C_RED, fmt


class DaoDongDieuHoa(Base):
    def construct(self):
        self.head()
        A = float(P.get("bienDo", 1.5))
        T = float(P.get("chuKy", 2))
        cycles = int(P.get("soChuKy", 2))
        vat = P.get("vat", "lo_xo")
        top = -0.2 if self.title_obj else 0.0
        t = ValueTracker(0.0)
        x_of = lambda tt: A * math.cos(2 * math.pi * tt / T)
        ax = Axes(x_range=[0, cycles * T, T / 2], y_range=[-A * 1.3, A * 1.3, A], x_length=5.6, y_length=3.4, axis_config={"color": C_GREY, "include_numbers": False}).move_to(RIGHT * 3.4 + DOWN * 0.2 + UP * (top * -1 if False else 0))
        ax.x_axis.add_labels({T: Text("T", font_size=22, color=C_GREY), cycles * T: Text(f"{cycles}T", font_size=22, color=C_GREY)})
        graph = always_redraw(lambda: ax.plot(x_of, x_range=[0, max(t.get_value(), 0.001), cycles * T / 200], color=C_ACC, stroke_width=4))
        xlab = MathTex("x(t)", font_size=32, color=C_ACC).next_to(ax.y_axis, UP, buff=0.05)
        dt = self.step(2)
        if vat == "lo_xo":
            wall = Rectangle(width=0.2, height=1.6, fill_color=C_GREY, fill_opacity=1, stroke_width=0).move_to(LEFT * 6 + DOWN * 0.2)
            floor = Line(LEFT * 6 + DOWN * 1.1, LEFT * 0.6 + DOWN * 1.1, color=C_GREY)
            sc = 1.1
            cx = lambda tt: -3.3 + x_of(tt) * sc
            def spring():
                x1 = cx(t.get_value()) - 0.45
                x0 = -5.9
                pts = [np.array([x0, -0.2, 0])]
                n = 12
                for i in range(1, n):
                    pts.append(np.array([x0 + (x1 - x0) * i / n, -0.2 + (0.28 if i % 2 else -0.28), 0]))
                pts.append(np.array([x1, -0.2, 0]))
                return VMobject(color=C_ORANGE, stroke_width=4).set_points_as_corners(pts)
            spr = always_redraw(spring)
            block = always_redraw(lambda: Square(side_length=0.9, fill_color=C_BLUE, fill_opacity=1, color=C_INK, stroke_width=3).move_to(np.array([cx(t.get_value()), -0.2, 0])))
            eq = Line(np.array([-3.3, -1.1, 0]), np.array([-3.3, 0.6, 0]), color=C_GREY, stroke_width=2)
            self.add(wall, floor, eq)
            self.add(spr, block)
        else:
            pivot = np.array([-3.3, 2.0 if not self.title_obj else 1.6, 0])
            L = 2.6
            ang = lambda tt: math.radians(min(A * 10, 25)) * math.cos(2 * math.pi * tt / T)
            bobp = lambda tt: pivot + np.array([L * math.sin(ang(tt)), -L * math.cos(ang(tt)), 0])
            self.add(Line(pivot + LEFT * 0.8, pivot + RIGHT * 0.8, color=C_GREY, stroke_width=6))
            self.add(DashedLine(pivot, pivot + DOWN * L, color=C_GREY, stroke_width=2))
            self.add(always_redraw(lambda: Line(pivot, bobp(t.get_value()), color=C_INK, stroke_width=3)))
            self.add(always_redraw(lambda: Dot(bobp(t.get_value()), radius=0.22, color=C_BLUE)))
        self.play(Create(ax), FadeIn(xlab), run_time=dt * 0.5)
        self.add(graph)
        self.play(t.animate.set_value(cycles * T), run_time=max(TOTAL * 0.82, 1), rate_func=linear)
        self.finish()


class ChuyenDongThang(Base):
    def construct(self):
        self.head()
        x0, v0, a = float(P.get("x0", 0)), float(P.get("v0", 2)), float(P.get("a", 1))
        tm = float(P.get("tMax", 6))
        xs = lambda tt: x0 + v0 * tt + a * tt * tt / 2
        vs = lambda tt: v0 + a * tt
        samples = [xs(tm * i / 60) for i in range(61)]
        lo, hi = min(samples + [x0]), max(samples + [x0])
        span = max(hi - lo, 1.0)
        t = ValueTracker(0.0)
        px = lambda x: -6.0 + (x - lo) / span * 5.6
        track = Line(np.array([-6.0, -1.5, 0]), np.array([-0.4, -1.5, 0]), color=C_GREY)
        ticks = VGroup(*[VGroup(Line(np.array([px(lo + span * i / 4), -1.6, 0]), np.array([px(lo + span * i / 4), -1.4, 0]), color=C_GREY), Text(fmt(lo + span * i / 4, 1), font_size=18, color=C_GREY).move_to(np.array([px(lo + span * i / 4), -1.85, 0]))) for i in range(5)])
        car = always_redraw(lambda: Rectangle(width=0.7, height=0.45, fill_color=C_ORANGE, fill_opacity=1, color=C_INK, stroke_width=2).move_to(np.array([px(xs(t.get_value())), -1.2, 0])))
        vlab = always_redraw(lambda: Arrow(np.array([px(xs(t.get_value())), -0.6, 0]), np.array([px(xs(t.get_value())) + max(min(vs(t.get_value()) * 0.12, 1.4), -1.4), -0.6, 0]), buff=0, color=C_GREEN, stroke_width=5, max_tip_length_to_length_ratio=0.4) if abs(vs(t.get_value())) > 0.05 else VGroup())
        vmax = max(abs(vs(0)), abs(vs(tm)), 1.0)
        g1 = Axes(x_range=[0, tm, tm / 4], y_range=[lo - 0.1 * span, hi + 0.1 * span, span / 2], x_length=4.6, y_length=1.9, axis_config={"color": C_GREY, "include_numbers": False}).move_to(RIGHT * 3.7 + UP * 1.1)
        g2 = Axes(x_range=[0, tm, tm / 4], y_range=[-vmax * 1.1, vmax * 1.1, vmax], x_length=4.6, y_length=1.9, axis_config={"color": C_GREY, "include_numbers": False}).move_to(RIGHT * 3.7 + DOWN * 1.6)
        l1 = MathTex("x(t)", font_size=28, color=C_ACC).next_to(g1.y_axis, UP, buff=0.03)
        l2 = MathTex("v(t)", font_size=28, color=C_GREEN).next_to(g2.y_axis, UP, buff=0.03)
        c1 = always_redraw(lambda: g1.plot(xs, x_range=[0, max(t.get_value(), 0.001), tm / 150], color=C_ACC, stroke_width=4))
        c2 = always_redraw(lambda: g2.plot(vs, x_range=[0, max(t.get_value(), 0.001), tm / 150], color=C_GREEN, stroke_width=4))
        eq = MathTex(f"x = {fmt(x0)} + {fmt(v0)}t + \\tfrac{{{fmt(a)}}}{{2}}t^2", font_size=34, color=C_INK).to_corner(UL, buff=0.5).shift(DOWN * (0.9 if self.title_obj else 0))
        tl = always_redraw(lambda: VGroup(Text("t =", font_size=24, color=C_ACC), DecimalNumber(t.get_value(), num_decimal_places=1, font_size=28, color=C_ACC), Text("s", font_size=24, color=C_ACC)).arrange(RIGHT, buff=0.12).move_to(LEFT * 3.2 + UP * 0.9))
        self.play(Create(track), FadeIn(ticks), Create(g1), Create(g2), FadeIn(l1), FadeIn(l2), Write(eq), run_time=self.step(2))
        self.add(car, vlab, c1, c2, tl)
        self.play(t.animate.set_value(tm), run_time=max(TOTAL * 0.8, 1), rate_func=linear)
        self.finish()


class SongCo(Base):
    def construct(self):
        self.head()
        lam = float(P.get("buocSong", 2))
        A = float(P.get("bienDo", 1))
        T = 2.0
        ax = Axes(x_range=[0, 4 * lam, lam / 2], y_range=[-A * 1.6, A * 1.6, A], x_length=10.5, y_length=3.8, axis_config={"color": C_GREY, "include_numbers": False}).shift(DOWN * (0.45 if self.title_obj else 0.2))
        t = ValueTracker(0.0)
        y = lambda x, tt: A * math.sin(2 * math.pi * (x / lam - tt / T))
        wave = always_redraw(lambda: ax.plot(lambda x: y(x, t.get_value()), x_range=[0, 4 * lam, lam / 60], color=C_ACC, stroke_width=5))
        dt = self.step(3)
        self.play(Create(ax), run_time=dt * 0.6)
        self.add(wave)
        c1, c2 = ax.c2p(lam / 4, A), ax.c2p(5 * lam / 4, A)
        dl = DoubleArrow(c1 + UP * 0.35, c2 + UP * 0.35, buff=0, color=C_GREEN, stroke_width=4, tip_length=0.18)
        tl = MathTex("\\lambda", font_size=38, color=C_GREEN).next_to(dl, UP, buff=0.05)
        da = DoubleArrow(ax.c2p(1.6 * lam, 0), ax.c2p(1.6 * lam, A), buff=0, color=C_ORANGE, stroke_width=4, tip_length=0.18)
        ta = MathTex("A", font_size=38, color=C_ORANGE).next_to(da, RIGHT, buff=0.1)
        self.play(Create(dl), Write(tl), Create(da), Write(ta), run_time=dt)
        self.wait(dt * 0.4)
        self.play(FadeOut(dl), FadeOut(tl), FadeOut(da), FadeOut(ta), run_time=0.4)
        arrow = Arrow(ax.c2p(0.2 * lam, -A * 1.45), ax.c2p(1.0 * lam, -A * 1.45), buff=0, color=C_BLUE, stroke_width=5)
        self.play(GrowArrow(arrow), Write(Text("sóng truyền đi", font_size=24, color=C_BLUE).next_to(arrow, RIGHT, buff=0.15)), run_time=dt * 0.5)
        self.play(t.animate.set_value(2 * T), run_time=max(TOTAL * 0.45, 1), rate_func=linear)
        self.finish()


class TongHopLuc(Base):
    def construct(self):
        self.head()
        forces = P["cacLuc"]
        sc = 0.42
        ctr = LEFT * 3.0 + DOWN * (0.3 if self.title_obj else 0)
        body = Square(side_length=0.8, fill_color=C_BLUE, fill_opacity=1, color=C_INK, stroke_width=3).move_to(ctr)
        cols = [C_ACC, C_ORANGE, C_RED, C_GREEN]
        dt = self.step(len(forces) + 2)
        self.play(FadeIn(body), run_time=dt * 0.5)
        vecs = []
        tot = np.zeros(2)
        for i, fo in enumerate(forces):
            r = math.radians(fo["gocDo"])
            v = np.array([math.cos(r), math.sin(r)]) * fo["doLon"]
            vecs.append(v)
            tot += v
            ar = Arrow(ctr, ctr + np.array([v[0] * sc, v[1] * sc, 0]), buff=0.4, color=cols[i % 4], stroke_width=6, max_tip_length_to_length_ratio=0.2)
            lb = Text(f"{fo.get('nhan', 'F' + str(i + 1))} = {fmt(fo['doLon'])} N", font_size=22, color=cols[i % 4]).next_to(ar.get_end(), UR if v[0] >= 0 else UL, buff=0.08)
            self.play(GrowArrow(ar), FadeIn(lb), run_time=dt)
        end = ctr.copy()
        chain = []
        for i, v in enumerate(vecs):
            nxt = end + np.array([v[0] * sc, v[1] * sc, 0])
            chain.append(DashedLine(end + np.array([4.5, 0, 0]) * 0, nxt, color=cols[i % 4], stroke_width=3))
            end = nxt
        # cộng nối đuôi: vẽ sang bên phải
        off = RIGHT * 5.6 + (ctr[1] - 0) * UP
        st = off.copy()
        arrows = []
        for i, v in enumerate(vecs):
            nxt = st + np.array([v[0] * sc, v[1] * sc, 0])
            arrows.append(Arrow(st, nxt, buff=0, color=cols[i % 4], stroke_width=5, max_tip_length_to_length_ratio=0.2))
            st = nxt
        self.play(*[GrowArrow(a) for a in arrows], run_time=dt)
        mag = float(np.linalg.norm(tot))
        res = Arrow(off, off + np.array([tot[0] * sc, tot[1] * sc, 0]), buff=0, color=C_GREEN, stroke_width=8, max_tip_length_to_length_ratio=0.2)
        txt = MathTex(f"F = {fmt(mag)}\\ \\text{{N}}", font_size=40, color=C_GREEN).to_corner(DR, buff=0.6)
        self.play(GrowArrow(res), Write(txt), run_time=dt)
        self.finish()
