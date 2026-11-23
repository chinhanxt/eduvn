"""Ví dụ vàng skill trai-dat-chuyen-dong (Manim StudioScene, phong cách Giấy học thuật)."""
import math
import numpy as np
from manim import *
from studio import StudioScene, P, L, FS, TH, TOKENS, UI, READ


class TraiDatChuyenDongScene(StudioScene):
    def construct(self):
        c_lam = TOKENS["palette"]["lam"]
        c_vang = TOKENS["palette"]["vangDam"]
        c_do = TOKENS["palette"]["doSon"]
        c_xanh = TOKENS["palette"]["xanhLa"]
        c_ink = TH["ink"]
        c_ink2 = TH["ink2"]

        # Tiêu đề + meta (trên vùng an toàn)
        meta = Text("ĐỊA LÍ 10 · TRÁI ĐẤT TRONG HỆ MẶT TRỜI", font=UI, font_size=FS(30), color=TH["ink3"]).move_to(P(520, 64))
        title = Text("Chuyển động Trái Đất: Ngày – Đêm & 4 Mùa", font=READ, font_size=FS(56), color=c_ink).move_to(P(680, 130))

        # Tâm quỹ đạo (cột 1–8)
        cx, cy = 680, 520
        rx, ry = L(410), L(220)
        center = P(cx, cy)

        orbit = Ellipse(width=2 * rx, height=2 * ry, color=TH["line"], stroke_width=3).move_to(center)
        sun = VGroup(
            Circle(radius=L(56), color=c_vang, fill_color=c_vang, fill_opacity=0.22, stroke_width=4),
            Circle(radius=L(38), color=c_vang, fill_color=c_vang, fill_opacity=0.92, stroke_width=0),
            Text("Mặt Trời", font=UI, font_size=FS(36), color=c_vang).next_to(center, DOWN, buff=L(66)),
        )
        sun[0].move_to(center)
        sun[1].move_to(center)

        tilt_rad = math.radians(23.45)

        def make_earth(pos):
            r = L(34)
            disc = Circle(radius=r, color=c_lam, fill_color=c_lam, fill_opacity=0.88, stroke_width=3).move_to(pos)
            # Nửa tối quay lưng khỏi Mặt Trời
            vec = pos - center
            ang = math.atan2(vec[1], vec[0])
            night = AnnularSector(inner_radius=0, outer_radius=r, angle=PI, start_angle=ang - PI / 2, color=c_ink, fill_opacity=0.45, stroke_width=0).move_to(pos)
            # Trục nghiêng 23°27' luôn song song không đổi hướng!
            ax_dx = math.sin(tilt_rad) * L(56)
            ax_dy = math.cos(tilt_rad) * L(56)
            axis = Line(pos + np.array([-ax_dx, -ax_dy, 0]), pos + np.array([ax_dx, ax_dy, 0]), color=c_do, stroke_width=4)
            return VGroup(disc, night, axis)

        # 4 vị trí quỹ đạo (Xuân phân dưới, Hạ chí trái, Thu phân trên, Đông chí phải)
        pos_ha = center + np.array([-rx, 0, 0])
        pos_dong = center + np.array([rx, 0, 0])
        pos_xuan = center + np.array([0, -ry, 0])
        pos_thu = center + np.array([0, ry, 0])

        lbl_xuan = Text("Xuân phân (21/3)", font=UI, font_size=FS(36), color=c_xanh).next_to(pos_xuan, DOWN, buff=L(52))
        lbl_ha = Text("Hạ chí (22/6)", font=UI, font_size=FS(36), color=c_do).next_to(pos_ha, LEFT, buff=L(48))
        lbl_thu = Text("Thu phân (23/9)", font=UI, font_size=FS(36), color=c_vang).next_to(pos_thu, UP, buff=L(52))
        lbl_dong = Text("Đông chí (22/12)", font=UI, font_size=FS(36), color=c_lam).next_to(pos_dong, RIGHT, buff=L(48))

        def card(y_px, head_txt, body_txt, accent):
            box = RoundedRectangle(width=L(520), height=L(150), corner_radius=L(12), fill_color=TH["surface"], fill_opacity=1, stroke_color=TH["line"], stroke_width=2).move_to(P(1540, y_px))
            bar = Rectangle(width=L(8), height=L(150), fill_color=accent, fill_opacity=1, stroke_width=0).move_to(P(1284, y_px))
            h = Text(head_txt, font=UI, font_size=FS(38), weight=BOLD, color=accent).align_to(box, LEFT).shift(RIGHT * L(28) + UP * L(30))
            b = Text(body_txt, font=UI, font_size=FS(36), color=c_ink2).align_to(box, LEFT).shift(RIGHT * L(28) + DOWN * L(26))
            return VGroup(box, bar, h, b)

        c0 = card(300, "Tự quay: Ngày – Đêm", "Trục nghiêng 23°27'", c_lam)
        c1 = card(480, "Hạ chí 22/6", "BC Bắc ngả về Mặt Trời", c_do)
        c2 = card(660, "Đông chí 22/12", "BC Bắc chếch xa Mặt Trời", c_vang)
        c3 = card(830, "4 mùa luân phiên", "Trục không đổi hướng", c_xanh)

        earth = make_earth(pos_xuan)

        # Beat 0 (0 -> 4.2s)
        self.play(FadeIn(meta), FadeIn(title), Create(orbit), FadeIn(sun), FadeIn(earth), FadeIn(lbl_xuan), FadeIn(c0), run_time=1.8)
        self.wait(2.4)

        # Beat 1 (4.2 -> 8.4s): Xuân phân -> Hạ chí
        earth_ha = make_earth(pos_ha)
        self.play(Transform(earth, earth_ha), FadeIn(lbl_ha), FadeIn(c1), run_time=2.0)
        self.wait(2.2)

        # Beat 2 (8.4 -> 12.6s): Hạ chí -> Thu phân -> Đông chí
        earth_thu = make_earth(pos_thu)
        earth_dong = make_earth(pos_dong)
        self.play(Transform(earth, earth_thu), FadeIn(lbl_thu), run_time=1.4)
        self.play(Transform(earth, earth_dong), FadeIn(lbl_dong), FadeIn(c2), run_time=1.6)
        self.wait(1.2)

        # Beat 3 (12.6 -> 16.0s): Khép vòng về Xuân phân
        earth_end = make_earth(pos_xuan)
        self.play(Transform(earth, earth_end), FadeIn(c3), run_time=1.6)
        self.wait(1.8)
