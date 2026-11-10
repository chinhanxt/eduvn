"""Mẫu hoạt hình toán CỐ ĐỊNH của EDUVN (Manim Community, MIT) — nhóm 1: đồ thị, công thức, hình học diện tích, trục số.

AI chỉ chọn mẫu + tham số JSON (đã kiểm bằng zod phía máy chủ); các tệp mẫu KHÔNG bao giờ nhận mã Python từ ngoài.
Chạy:  EDUVN_SPEC=spec.json PYTHONPATH=services/manim manim render -r 1280,720 --fps 30 <tệp>.py <TênCảnh>
spec.json = {"template": ..., "thoiLuong": giây, "tieuDe": ..., "params": {...}}; phần dùng chung ở common.py.
"""
from common import *  # noqa: F401,F403
from common import Base, P, SPEC, TOTAL, ev, plot_runs  # noqa: F401


class DoThiHamSo(Base):
    def construct(self):
        self.head()
        xmin, xmax = P.get("xMin", -5), P.get("xMax", 5)
        ymin, ymax = P.get("yMin", -5), P.get("yMax", 5)
        ast = P["bieuThuc"]
        ts = P.get("thamSo")
        pts = P.get("diemDacBiet", [])
        n = 2 + (1 if ts else 0) + (1 if pts else 0)
        dt = self.step(n)
        axes = Axes(
            x_range=[xmin, xmax, max(1, round((xmax - xmin) / 10))],
            y_range=[ymin, ymax, max(1, round((ymax - ymin) / 8))],
            x_length=9.5, y_length=4.6 if self.title_obj else 5.4,
            axis_config={"include_numbers": True, "color": GREY_B, "font_size": 22},
        ).shift(DOWN * (0.35 if self.title_obj else 0))
        a = ValueTracker(ts["tu"] if ts else 0)

        def curve():
            """Chỉ vẽ phần nằm trong khung y; đoạn ra ngoài/không xác định bị cắt (không kẻ đường ngang giả)."""
            av = a.get_value()
            runs, cur = [], []
            for i in range(401):
                x = xmin + (xmax - xmin) * i / 400
                y = ev(ast, x, av)
                if y == y and ymin <= y <= ymax:
                    cur.append(axes.c2p(x, y))
                else:
                    if len(cur) > 1:
                        runs.append(cur)
                    cur = []
            if len(cur) > 1:
                runs.append(cur)
            g = VGroup()
            for r in runs:
                m = VMobject(color=YELLOW, stroke_width=4)
                m.set_points_as_corners(r)
                g.add(m)
            return g

        graph = always_redraw(curve)
        self.play(Create(axes), run_time=dt)
        self.add(graph)
        self.play(Write(Text("y = f(x)", font_size=26, color=YELLOW).next_to(axes, UP, buff=0.05).to_edge(RIGHT, buff=0.6)), run_time=dt)
        if ts:
            lab = VGroup(Text("a =", font_size=28, color=ORANGE), DecimalNumber(ts["tu"], num_decimal_places=1, font_size=34, color=ORANGE)).arrange(RIGHT).to_corner(LEFT + UP if not self.title_obj else LEFT + DOWN, buff=0.5)
            lab[1].add_updater(lambda m: m.set_value(a.get_value()))
            self.add(lab)
            self.play(a.animate.set_value(ts["den"]), run_time=dt, rate_func=smooth)
        if pts:
            av = a.get_value()
            marks = []
            for p in pts:
                y = ev(ast, p["x"], av)
                if y != y:
                    continue
                d = Dot(axes.c2p(p["x"], y), color=RED_C, radius=0.09)
                txt = p.get("nhan") or f"({p['x']:g}; {y:.3g})"
                t = Text(txt, font_size=22, color=RED_C).next_to(d, UR, buff=0.1)
                marks.append(VGroup(d, t))
            if marks:
                self.play(*[FadeIn(m) for m in marks], run_time=dt)
        self.finish()


class BienDoiCongThuc(Base):
    def construct(self):
        self.head()
        steps = P["cacBuoc"]
        iso = P.get("toMau", [])
        dt = self.step(len(steps))
        prev = None
        note = None
        for i, s in enumerate(steps):
            m = MathTex(s["latex"], substrings_to_isolate=iso, font_size=56)
            if m.width > 11.5:
                m.scale_to_fit_width(11.5)
            for sub in iso:
                m.set_color_by_tex(sub, YELLOW)
            m.move_to(UP * 0.4)
            nt = Text(s["ghiChu"], font_size=28, color=GREEN_C).to_edge(DOWN, buff=1.0) if s.get("ghiChu") else None
            anims = []
            if prev is None:
                anims.append(Write(m))
            else:
                anims.append(TransformMatchingTex(prev, m))
            if note is not None:
                anims.append(FadeOut(note))
            if nt is not None:
                anims.append(FadeIn(nt))
            self.play(*anims, run_time=dt * 0.7)
            self.wait(dt * 0.3)
            prev, note = m, nt
        self.finish()


class HinhHocDienTich(Base):
    def construct(self):
        self.head()
        a, b = float(P.get("a", 2)), float(P.get("b", 1))
        s = (4.4 if self.title_obj else 5.0) / (a + b)
        A, B = a * s, b * s
        L = A + B
        origin = LEFT * 3.6 + UP * (L / 2 - (0.35 if self.title_obj else 0))  # góc trên-trái
        def pt(dx, dy):
            return origin + RIGHT * dx + DOWN * dy
        dt = self.step(5)
        outline = Rectangle(width=L, height=L, color=WHITE).move_to(pt(L / 2, L / 2))
        top_a = Brace(Line(pt(0, 0), pt(A, 0)), UP, color=BLUE_C)
        top_b = Brace(Line(pt(A, 0), pt(L, 0)), UP, color=GREEN_C)
        la = MathTex("a", color=BLUE_C).next_to(top_a, UP, buff=0.05)
        lb = MathTex("b", color=GREEN_C).next_to(top_b, UP, buff=0.05)
        lA = MathTex("a", color=BLUE_C).next_to(Brace(Line(pt(0, 0), pt(0, A)), LEFT, color=BLUE_C), LEFT, buff=0.05)
        lB = MathTex("b", color=GREEN_C).next_to(Brace(Line(pt(0, A), pt(0, L)), LEFT, color=GREEN_C), LEFT, buff=0.05)
        self.play(Create(outline), run_time=dt)
        self.play(FadeIn(top_a), FadeIn(top_b), Write(la), Write(lb), FadeIn(Brace(Line(pt(0, 0), pt(0, A)), LEFT, color=BLUE_C)), FadeIn(Brace(Line(pt(0, A), pt(0, L)), LEFT, color=GREEN_C)), Write(lA), Write(lB), run_time=dt)
        v = Line(pt(A, 0), pt(A, L), color=WHITE)
        h = Line(pt(0, A), pt(L, A), color=WHITE)
        self.play(Create(v), Create(h), run_time=dt)
        r1 = Rectangle(width=A, height=A, fill_color=BLUE_C, fill_opacity=0.55, stroke_width=0).move_to(pt(A / 2, A / 2))
        r2 = Rectangle(width=B, height=A, fill_color=ORANGE, fill_opacity=0.55, stroke_width=0).move_to(pt(A + B / 2, A / 2))
        r3 = Rectangle(width=A, height=B, fill_color=ORANGE, fill_opacity=0.55, stroke_width=0).move_to(pt(A / 2, A + B / 2))
        r4 = Rectangle(width=B, height=B, fill_color=GREEN_C, fill_opacity=0.55, stroke_width=0).move_to(pt(A + B / 2, A + B / 2))
        labs = [MathTex(t, font_size=40).move_to(r.get_center()) for t, r in (("a^2", r1), ("ab", r2), ("ab", r3), ("b^2", r4))]
        self.play(*[FadeIn(r) for r in (r1, r2, r3, r4)], *[Write(t) for t in labs], run_time=dt)
        eq = MathTex("(a+b)^2", "=", "a^2", "+", "2ab", "+", "b^2", font_size=52)
        eq[2].set_color(BLUE_C)
        eq[4].set_color(ORANGE)
        eq[6].set_color(GREEN_C)
        eq.to_edge(RIGHT, buff=0.5).shift(DOWN * 0.2)
        if eq.width > 6.2:
            eq.scale_to_fit_width(6.2)
            eq.to_edge(RIGHT, buff=0.4)
        self.play(Write(eq), run_time=dt)
        self.finish()


class TrucSo(Base):
    def construct(self):
        self.head()
        lo, hi = P["khoang"]["min"], P["khoang"]["max"]
        points = P.get("cacDiem", [])
        jumps = P.get("cacBuocNhay", [])
        dt = self.step(1 + len(points) + len(jumps))
        nl = NumberLine(x_range=[lo, hi, 1], length=11.5, include_numbers=True, include_tip=True, font_size=26).shift(DOWN * 0.3)
        self.play(Create(nl), run_time=dt)
        for p in points:
            d = Dot(nl.n2p(p["giaTri"]), color=YELLOW, radius=0.11)
            t = Text(p.get("nhan") or f"{p['giaTri']:g}", font_size=26, color=YELLOW).next_to(d, UP, buff=0.25)
            self.play(FadeIn(d), Write(t), run_time=dt)
        for j in jumps:
            s, e = nl.n2p(j["tu"]), nl.n2p(j["den"])
            arc = CurvedArrow(s + UP * 0.15, e + UP * 0.15, angle=-1.2 if j["den"] >= j["tu"] else 1.2, color=GREEN_C)
            t = Text(j.get("nhan") or f"{j['den'] - j['tu']:+g}", font_size=28, color=GREEN_C).next_to(arc, UP, buff=0.1)
            self.play(Create(arc), Write(t), run_time=dt)
        self.finish()
