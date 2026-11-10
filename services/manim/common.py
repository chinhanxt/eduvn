"""Phần chung của các mẫu: đọc spec, bảng màu EDUVN, bộ tính biểu thức an toàn, khung Base."""
import json
import math
import os

from manim import *  # noqa: F401,F403

SPEC = json.load(open(os.environ["EDUVN_SPEC"], encoding="utf-8"))
P = SPEC["params"]
TOTAL = float(SPEC["thoiLuong"])
config.background_color = "#10142b"
BIG = 1e4
_CONST = {"pi": math.pi, "e": math.e}
_FN = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan, "sqrt": math.sqrt, "abs": abs,
    "ln": math.log, "log": math.log10, "exp": math.exp,
}


def ev(n, x, a=0.0):
    """Tính cây biểu thức. Lỗi miền xác định → nan (đoạn đó không vẽ)."""
    k = n[0]
    try:
        if k == "num":
            return float(n[1])
        if k == "x":
            return x
        if k == "a":
            return a
        if k == "const":
            return _CONST[n[1]]
        if k == "neg":
            return -ev(n[1], x, a)
        if k == "fn":
            return _FN[n[1]](ev(n[2], x, a))
        l, r = ev(n[1], x, a), ev(n[2], x, a)
        if k == "add":
            return l + r
        if k == "sub":
            return l - r
        if k == "mul":
            return l * r
        if k == "div":
            return l / r
        if k == "pow":
            v = l ** r
            return float("nan") if isinstance(v, complex) else v
    except (ValueError, ZeroDivisionError, OverflowError):
        return float("nan")
    raise ValueError("phép toán không hợp lệ")


# Bảng màu EDUVN (nền tối, tương phản cao, an toàn cho người mù màu: vàng/xanh dương/cam/xanh lục)
C_BG = "#10142b"
C_INK = "#f3f5ff"
C_ACC = "#ffd166"
C_BLUE = "#7b93ff"
C_GREEN = "#06d6a0"
C_ORANGE = "#ff9f43"
C_RED = "#ef476f"
C_GREY = "#9aa3d0"


def plot_runs(ast, axes, xmin, xmax, ymin, ymax, av=0.0, color=None, n=400):
    """Đường cong chỉ vẽ phần nằm trong khung y; đoạn ngoài/không xác định bị cắt."""
    runs, cur = [], []
    for i in range(n + 1):
        x = xmin + (xmax - xmin) * i / n
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
        m = VMobject(color=color or C_ACC, stroke_width=4)
        m.set_points_as_corners(r)
        g.add(m)
    return g


def fmt(v, nd=2):
    s = f"{v:.{nd}f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Base(Scene):
    """Khung chung: tiêu đề, chia thời lượng, đệm cho đủ TOTAL giây."""

    def setup(self):
        self.title_obj = None
        self.top = 3.2

    def head(self):
        t = SPEC.get("tieuDe")
        if t:
            self.title_obj = Text(t, font_size=32, color=WHITE).to_edge(UP, buff=0.3)
            self.play(FadeIn(self.title_obj), run_time=0.01)
            self.top = 2.7

    def step(self, n):
        return max(0.3, TOTAL * 0.92 / max(n, 1))

    def finish(self):
        left = TOTAL - self.renderer.time
        if left > 0.02:
            self.wait(left)


